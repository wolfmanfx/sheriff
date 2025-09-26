import type { Express, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  getProjectData,
  ProjectData,
  init as initProject,
  toFsPath,
  calcTagsForModule,
  isDependencyAllowed,
} from '@softarc/sheriff-core';

export type DirNode = {
  id: string;
  name: string;
  pathRel: string;
  pathAbs: string;
  type: 'dir';
  children: Array<DirNode | FileNode>;
  isSheriffModule: boolean;
  tags?: string[];
};

export type FileNode = {
  id: string;
  name: string;
  pathRel: string;
  pathAbs: string;
  type: 'file';
};

export class SheriffApiController {
  protected readonly ignoredDirectories = new Set<string>([
    'node_modules',
    'dist',
  ]);

  public register(app: Express): void {
    app.get('/', (_req, res) => {
      res.send({ message: 'Sheriff API' });
    });

    app.get('/api/fs/list', (req, res) => this.handleList(req, res));
    app.get('/api/fs/has-config', (req, res) => this.handleHasConfig(req, res));
    app.get('/api/config', (req, res) => this.handleGetConfig(req, res));
    app.post('/api/config', (req, res) => this.handleWriteConfig(req, res));
    app.post('/api/config/init', (req, res) => this.handleInitConfig(req, res));
    app.get('/api/data', (req, res) => this.handleGetData(req, res));
    app.get('/api/env', (_req, res) => this.handleGetEnv(res));
    app.get('/api/fs/tree', (req, res) => this.handleTree(req, res));
    app.post('/api/analyze/merge', (req, res) =>
      this.handleAnalyzeMerge(req, res),
    );
    app.post('/api/allowed-modules', (req, res) =>
      this.handleAllowedModules(req, res),
    );
  }

  // ---------- Handlers ----------

  protected handleList(req: Request, res: Response): void {
    try {
      const targetCwd = this.resolveCwd(req.query.cwd);
      if (!this.isUnderWorkspace(targetCwd)) {
        res.status(400).json({ error: 'Path outside workspace' });
        return;
      }
      const entries = fs
        .readdirSync(targetCwd, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => ({
          name: d.name,
          path: path.join(targetCwd, d.name),
          type: 'dir' as const,
        }));
      const hasConfig = fs.existsSync(
        path.join(targetCwd, 'sheriff.config.ts'),
      );
      res.json({ cwd: targetCwd, hasConfig, entries });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      res.status(500).json({ error: message });
    }
  }

  protected handleHasConfig(req: Request, res: Response): void {
    try {
      const targetCwd = this.resolveCwd(req.query.cwd);
      if (!this.isUnderWorkspace(targetCwd)) {
        res.status(400).json({ error: 'Path outside workspace' });
        return;
      }
      res.json({
        cwd: targetCwd,
        hasConfig: fs.existsSync(path.join(targetCwd, 'sheriff.config.ts')),
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      res.status(500).json({ error: message });
    }
  }

  protected handleGetConfig(req: Request, res: Response): void {
    try {
      const targetCwd = this.resolveCwd(req.query.cwd);
      const configPath = path.join(targetCwd, 'sheriff.config.ts');
      if (!fs.existsSync(configPath)) {
        res.status(404).json({ error: 'sheriff.config.ts not found' });
        return;
      }
      const content = fs.readFileSync(configPath, { encoding: 'utf-8' });
      res.json({ content });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      res.status(500).json({ error: message });
    }
  }

  protected handleWriteConfig(req: Request, res: Response): void {
    try {
      const body: unknown = req.body;
      if (!body || typeof body !== 'object' || !('content' in body)) {
        res
          .status(400)
          .json({ error: 'Body must be an object with a content string' });
        return;
      }
      const { content, cwd } = body as { content: string; cwd?: string };
      if (typeof content !== 'string') {
        res.status(400).json({ error: 'content must be a string' });
        return;
      }
      const targetCwd = this.resolveCwd(cwd);
      const configPath = path.join(targetCwd, 'sheriff.config.ts');
      fs.writeFileSync(configPath, content, { encoding: 'utf-8' });
      res.json({ ok: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      res.status(500).json({ error: message });
    }
  }

  protected handleInitConfig(req: Request, res: Response): void {
    try {
      const body = (req.body ?? {}) as { entry?: string; cwd?: string };
      const entry =
        typeof body.entry === 'string' && body.entry.trim().length
          ? body.entry.trim()
          : undefined;

      const defaultConfig = `import { SheriffConfig } from '@softarc/sheriff-core';

export const config: SheriffConfig = {
  enableBarrelLess: true,
  modules: {},
  depRules: {
    'root': 'noTag',
    'noTag': 'noTag',
  },
  ${entry ? `entryFile: '${entry}',` : ''}
};
`;

      const targetCwd = this.resolveCwd(body.cwd);
      const configPath = path.join(targetCwd, 'sheriff.config.ts');
      fs.writeFileSync(configPath, defaultConfig, { encoding: 'utf-8' });
      res.json({ ok: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      res.status(500).json({ error: message });
    }
  }

  protected handleGetData(req: Request, res: Response): void {
    try {
      const entry = req.query.entry;
      if (typeof entry !== 'string' || !entry.trim()) {
        res
          .status(400)
          .json({
            error: 'Missing query parameter "entry" (e.g. entry=src/main.ts)',
          });
        return;
      }

      const cwd = this.resolveCwd(req.query.cwd);
      const data: ProjectData = getProjectData(entry, cwd, {
        includeExternalLibraries: true,
        projectName: 'default',
      });
      res.json({ data });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      res.status(500).json({ error: message });
    }
  }

  protected handleGetEnv(res: Response): void {
    try {
      res.json({ root: this.getRootFromEnv() });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      res.status(500).json({ error: message });
    }
  }

  protected handleTree(req: Request, res: Response): void {
    try {
      const root = this.resolveCwd(req.query.cwd);
      const tree = this.buildFolderTree(root);
      res.json({ root, tree });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      res.status(500).json({ error: message });
    }
  }

  protected handleAnalyzeMerge(req: Request, res: Response): void {
    try {
      const body = (req.body ?? {}) as { entry: string; cwd?: string };
      if (!body.entry || typeof body.entry !== 'string') {
        res
          .status(400)
          .json({ error: 'Body.entry (relative to cwd) is required' });
        return;
      }
      const cwd = this.resolveCwd(body.cwd);
      const tree = this.buildFolderTree(cwd);
      const analysis = getProjectData(body.entry, cwd, {
        includeExternalLibraries: true,
        projectName: 'default',
      });

      const fileIdByRel: Record<string, string> = {};
      const stack: Array<DirNode | FileNode> = [tree];
      while (stack.length) {
        const n = stack.pop()!;
        if (n.type === 'dir') {
          for (const c of n.children) stack.push(c);
        } else {
          fileIdByRel[n.pathRel] = n.id;
        }
      }

      const analysisWithIds: Record<
        string,
        ProjectData[string] & { fileId?: string }
      > = {};
      for (const [relPath, entry] of Object.entries(analysis)) {
        analysisWithIds[relPath] = { ...entry, fileId: fileIdByRel[relPath] };
      }

      const moduleDirs = new Set<string>();
      for (const value of Object.values(analysis)) {
        moduleDirs.add(value.module);
      }

      const annotateDirModules = (dir: DirNode): void => {
        dir.isSheriffModule = moduleDirs.has(dir.pathRel);
        for (const child of dir.children) {
          if (child.type === 'dir') annotateDirModules(child);
        }
      };
      annotateDirModules(tree);

      const annotateDirTags = (dir: DirNode): void => {
        for (const child of dir.children) {
          if (child.type === 'dir') annotateDirTags(child);
        }
        const agg = new Set<string>();
        for (const child of dir.children) {
          if (child.type === 'file') {
            const a = analysisWithIds[child.pathRel];
            if (a && Array.isArray(a.tags)) for (const t of a.tags) agg.add(t);
          }
        }
        if (agg.size) dir.tags = Array.from(agg).sort();
        else delete dir.tags;
      };
      annotateDirTags(tree);

      res.json({
        cwd,
        tree,
        analysis: analysisWithIds,
        fileIdByPathRel: fileIdByRel,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      res.status(500).json({ error: message });
    }
  }

  protected handleAllowedModules(req: Request, res: Response): void {
    try {
      const body = (req.body ?? {}) as {
        entry: string;
        cwd?: string;
        selectedModules?: string[];
        selectedModuleIds?: string[];
      };
      if (!body.entry || typeof body.entry !== 'string') {
        res
          .status(400)
          .json({ error: 'Body.entry (relative to cwd) is required' });
        return;
      }
      const cwd = this.resolveCwd(body.cwd);
      const tree = this.buildFolderTree(cwd);
      const dirIdByRel: Record<string, string> = {};
      const stack: Array<DirNode | FileNode> = [tree];
      while (stack.length) {
        const n = stack.pop()!;
        if (n.type === 'dir') {
          dirIdByRel[n.pathRel] = n.id;
          for (const c of n.children) stack.push(c);
        }
      }
      const selectedRel: string[] = (() => {
        if (
          Array.isArray(body.selectedModuleIds) &&
          body.selectedModuleIds.length
        ) {
          const pathRelById = Object.entries(dirIdByRel).reduce<
            Record<string, string>
          >((acc, [rel, id]) => {
            acc[id] = rel;
            return acc;
          }, {});
          return body.selectedModuleIds
            .map((id) => pathRelById[id])
            .filter((rel): rel is string => typeof rel === 'string');
        }
        if (
          Array.isArray(body.selectedModules) &&
          body.selectedModules.length
        ) {
          return body.selectedModules;
        }
        return [];
      })();
      if (!selectedRel.length) {
        res.json({ allowedMatrixById: {} });
        return;
      }
      const analysis = getProjectData(body.entry, cwd, {
        includeExternalLibraries: true,
        projectName: 'default',
      });
      const allModuleRels = Array.from(
        new Set<string>(Object.values(analysis).map((a) => a.module)),
      );
      const allRels = Array.from(new Set<string>([...selectedRel, ...allModuleRels]));
      const byPath = this.computeAllowedMatrix(cwd, body.entry, allRels);
      const allowedMatrixById: Record<string, Record<string, boolean>> = {};
      for (const fromRel of selectedRel) {
        const row = byPath[fromRel] ?? {};
        const fromId = dirIdByRel[fromRel];
        if (!fromId) continue;
        const idRow: Record<string, boolean> = {};
        for (const [toRel, allowed] of Object.entries(row)) {
          const toId = dirIdByRel[toRel];
          if (toId) idRow[toId] = allowed;
        }
        allowedMatrixById[fromId] = idRow;
      }
      res.json({ allowedMatrixById });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      res.status(500).json({ error: message });
    }
  }

  // ---------- Helpers ----------

  protected resolveCwd(cwdParam: unknown): string {
    const param = typeof cwdParam === 'string' ? cwdParam.trim() : '';
    if (!param) return this.getRootFromEnv();
    return path.isAbsolute(param) ? param : path.join(process.cwd(), param);
  }

  protected isUnderWorkspace(absPath: string): boolean {
    const ws = process.cwd();
    const normalized = path.normalize(absPath);
    return normalized === ws || normalized.startsWith(ws + path.sep);
  }

  protected getRootFromEnv(): string {
    const fromProcess = process.env.SHERIFF_ROOT || process.env.WORKSPACE_ROOT;
    if (fromProcess && path.isAbsolute(fromProcess)) return fromProcess;
    const envPath = path.join(process.cwd(), '.env');
    try {
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, { encoding: 'utf-8' });
        const env = this.parseDotEnv(content);
        const val = env['SHERIFF_ROOT'] || env['WORKSPACE_ROOT'];
        if (val) {
          return path.isAbsolute(val) ? val : path.join(process.cwd(), val);
        }
      }
    } catch {
      // ignore
    }
    return process.cwd();
  }

  protected parseDotEnv(contents: string): Record<string, string> {
    const result: Record<string, string> = {};
    const lines = contents.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (value.startsWith('"') && value.endsWith('"'))
        value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'"))
        value = value.slice(1, -1);
      result[key] = value;
    }
    return result;
  }

  protected hashId(input: string): string {
    return crypto.createHash('md5').update(input).digest('hex');
  }

  protected buildFolderTree(
    rootAbs: string,
    currentAbs: string = rootAbs,
  ): DirNode {
    const name =
      currentAbs === rootAbs
        ? path.basename(rootAbs) || '.'
        : path.basename(currentAbs);
    const pathRel = path.relative(rootAbs, currentAbs) || '.';
    const node: DirNode = {
      id: this.hashId(currentAbs),
      name,
      pathRel,
      pathAbs: currentAbs,
      type: 'dir',
      children: [],
      isSheriffModule: false,
    };
    const entries = fs.readdirSync(currentAbs, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory()) {
        if (this.ignoredDirectories.has(e.name)) continue;
        const childAbs = path.join(currentAbs, e.name);
        node.children.push(this.buildFolderTree(rootAbs, childAbs));
      } else if (e.isFile()) {
        const childAbs = path.join(currentAbs, e.name);
        const fileRel = path.relative(rootAbs, childAbs);
        node.children.push({
          id: this.hashId(childAbs),
          name: e.name,
          pathRel: fileRel,
          pathAbs: childAbs,
          type: 'file',
        });
      }
    }
    return node;
  }

  // ---------- Allowedness computation (pairwise) ----------

  protected computeAllowedMatrix(
    cwd: string,
    entryRel: string,
    selectedModulesRel: string[],
  ): Record<string, Record<string, boolean>> {
    const entryAbs = path.isAbsolute(entryRel)
      ? entryRel
      : path.join(cwd, entryRel);
    const projectInfo = initProject(toFsPath(entryAbs));

    const rootDirFs = projectInfo.rootDir;
    const moduleConfig = projectInfo.config.modules;
    const autoTagging = projectInfo.config.autoTagging;
    const depRules = projectInfo.config.depRules;

    const moduleTagsByRel: Record<string, string[]> = {};
    const moduleFsPathByRel: Record<string, ReturnType<typeof toFsPath>> = {};
    for (const rel of selectedModulesRel) {
      const moduleAbs = rel === '.' ? projectInfo.rootDir : path.join(cwd, rel);
      const moduleFs = toFsPath(moduleAbs);
      moduleFsPathByRel[rel] = moduleFs;
      const tags = calcTagsForModule(
        moduleFs,
        rootDirFs,
        moduleConfig,
        autoTagging,
      );
      moduleTagsByRel[rel] = tags;
    }

    const matrix: Record<string, Record<string, boolean>> = {};
    for (const fromRel of selectedModulesRel) {
      const fromTags = moduleTagsByRel[fromRel] ?? [];
      const fromModulePath = moduleFsPathByRel[fromRel];
      const row: Record<string, boolean> = {};
      for (const toRel of selectedModulesRel) {
        const toTags = moduleTagsByRel[toRel] ?? [];
        const toModulePath = moduleFsPathByRel[toRel];
        let allowed = false;
        try {
          for (const fromTag of fromTags) {
            if (
              isDependencyAllowed(fromTag, toTags, depRules, {
                fromModulePath,
                toModulePath,
                fromFilePath: fromModulePath,
                toFilePath: toModulePath,
              })
            ) {
              allowed = true;
              break;
            }
          }
        } catch {
          allowed = false;
        }
        row[toRel] = allowed;
      }
      matrix[fromRel] = row;
    }
    return matrix;
  }
}
