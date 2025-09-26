/**
 * Sheriff API Controller
 * HTTP request handlers for Sheriff API endpoints
 *
 * Provides RESTful endpoints for:
 * - File system operations (list directories, check config, build tree)
 * - Configuration management (read, write, preview, initialize)
 * - Project analysis (analyze dependencies, compute allowed modules)
 * - Environment information
 */
import type { Express, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigValidator } from './core/config-validator';
import {
  resolveCwd,
  ensureUnderWorkspace,
  hasConfig,
  readConfig,
  writeConfig,
  applyConfigPreview,
  getProjectDataForAnalysis,
  getRootFromEnv,
  buildFolderTree,
  analyzeAndMerge,
  computeAllowedMatrix,
  type DirNode,
  type FileNode,
} from './core';
import { evaluateSheriffConfig, toSerializableDepRules } from './core/config-evaluator';

/**
 * Request body for config write operations
 */
type ConfigBody = {
  /** Config file content as string */
  content: string;
  /** Optional working directory (defaults to workspace root) */
  cwd?: string;
};

/**
 * Request body for config initialization
 */
type InitConfigBody = {
  /** Optional entry file path (relative to cwd) */
  entry?: string;
  /** Optional working directory (defaults to workspace root) */
  cwd?: string;
};

/**
 * Request body for analyze operations
 */
type AnalyzeBody = {
  /** Entry file path (relative to cwd) */
  entry: string;
  /** Optional working directory (defaults to workspace root) */
  cwd?: string;
};

/**
 * Request body for apply-preview operations (evaluate config content without persisting it)
 */
type ApplyPreviewBody = {
  /** Config file content as string */
  content: string;
  /** Entry file path (relative to cwd) */
  entry: string;
  /** Optional working directory (defaults to workspace root) */
  cwd?: string;
};

/**
 * Request body for allowed modules computation
 */
type AllowedModulesBody = {
  /** Entry file path (relative to cwd) */
  entry: string;
  /** Optional working directory (defaults to workspace root) */
  cwd?: string;
  /** Selected module paths (relative to cwd) */
  selectedModules?: string[];
  /** Selected module IDs (alternative to selectedModules) */
  selectedModuleIds?: string[];
};

export class SheriffApiController {
  /**
   * Registers all API routes with the Express application
   *
   * @param app - Express application instance
   *
   * @example
   * ```typescript
   * const controller = new SheriffApiController();
   * controller.register(app);
   * ```
   */
  public register(app: Express): void {
    app.get('/', (_req, res) => {
      res.send({ message: 'Sheriff API' });
    });

    app.get('/api/fs/list', (req, res) => this.handleList(req, res));
    app.get('/api/fs/has-config', (req, res) => this.handleHasConfig(req, res));
    app.get('/api/config', (req, res) => this.handleGetConfig(req, res));
    app.post('/api/config', (req, res) => this.handleWriteConfig(req, res));
    app.post('/api/config/preview', (req, res) => this.handlePreviewConfig(req, res));
    app.post('/api/config/init', (req, res) => this.handleInitConfig(req, res));
    app.post('/api/config/apply-preview', (req, res) =>
      this.handleApplyConfigPreview(req, res),
    );
    app.get('/api/data', (req, res) => this.handleGetData(req, res));
    app.get('/api/env', (_req, res) => this.handleGetEnv(_req, res));
    app.get('/api/fs/tree', (req, res) => this.handleTree(req, res));
    app.post('/api/analyze/merge', (req, res) => this.handleAnalyzeMerge(req, res));
    app.post('/api/allowed-modules', (req, res) => this.handleAllowedModules(req, res));
  }

  // ---------- Handlers ----------

  /**
   * Handles GET /api/fs/list
   * Lists all directories in the specified path
   *
   * @param req - Express request object
   * @param res - Express response object
   *
   * Query parameters:
   * - `cwd` (optional): Working directory path
   *
   * Response:
   * - `cwd`: Current working directory
   * - `hasConfig`: Whether a sheriff.config.ts exists
   * - `entries`: Array of directory entries
   *
   * @throws {Error} 400 if path is outside workspace
   * @throws {Error} 500 for other errors
   */
  protected handleList(req: Request, res: Response): void {
    this.withErrorHandling(res, () => {
      const targetCwd = resolveCwd(req.query.cwd);
      ensureUnderWorkspace(targetCwd);

      const entries = fs
        .readdirSync(targetCwd, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => ({
          name: d.name,
          path: path.join(targetCwd, d.name),
          type: 'dir' as const,
        }));

      res.json({
        cwd: targetCwd,
        hasConfig: hasConfig(targetCwd),
        entries,
      });
    }, (error, res) => {
      if (error.message === 'Path outside workspace') {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    });
  }

  /**
   * Handles GET /api/fs/has-config
   * Checks if a sheriff.config.ts file exists in the specified directory
   *
   * @param req - Express request object
   * @param res - Express response object
   *
   * Query parameters:
   * - `cwd` (optional): Working directory path
   *
   * Response:
   * - `cwd`: Current working directory
   * - `hasConfig`: Whether a sheriff.config.ts exists
   *
   * @throws {Error} 400 if path is outside workspace
   * @throws {Error} 500 for other errors
   */
  protected handleHasConfig(req: Request, res: Response): void {
    this.withErrorHandling(res, () => {
      const targetCwd = resolveCwd(req.query.cwd);
      ensureUnderWorkspace(targetCwd);

      res.json({
        cwd: targetCwd,
        hasConfig: hasConfig(targetCwd),
      });
    }, (error, res) => {
      if (error.message === 'Path outside workspace') {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    });
  }

  /**
   * Handles GET /api/config
   * Reads the sheriff.config.ts file content
   *
   * @param req - Express request object
   * @param res - Express response object
   *
   * Query parameters:
   * - `cwd` (optional): Working directory path
   *
   * Response:
   * - `content`: Config file content as string
   *
   * @throws {Error} 404 if config file not found
   * @throws {Error} 500 for other errors
   */
  protected handleGetConfig(req: Request, res: Response): void {
    this.withErrorHandling(res, () => {
      const targetCwd = resolveCwd(req.query.cwd);
      const { content } = readConfig(targetCwd);
      res.json({ content });
    }, (error, res) => {
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    });
  }

  /**
   * Handles POST /api/config
   * Writes the sheriff.config.ts file with the provided content
   *
   * @param req - Express request object
   * @param res - Express response object
   *
   * Request body:
   * - `content` (required): Config file content as string
   * - `cwd` (optional): Working directory path
   *
   * Response:
   * - `ok`: true on success
   *
   * @throws {Error} 500 for validation or write errors
   */
  protected handleWriteConfig(req: Request, res: Response): void {
    this.withErrorHandling(res, () => {
      const { content } = this.validateConfigBody(req.body);
      const targetCwd = resolveCwd(req.body.cwd);
      writeConfig(targetCwd, content);
      res.json({ ok: true });
    });
  }

  /**
   * Handles POST /api/config/init
   * Initializes a new sheriff.config.ts file with default template
   *
   * @param req - Express request object
   * @param res - Express response object
   *
   * Request body:
   * - `entry` (optional): Entry file path (relative to cwd)
   * - `cwd` (optional): Working directory path
   *
   * Response:
   * - `ok`: true on success
   *
   * @throws {Error} 500 for write errors
   */
  protected handleInitConfig(req: Request, res: Response): void {
    this.withErrorHandling(res, () => {
      const body = this.validateBody<InitConfigBody>(req.body);
      const entry = body.entry?.trim() || undefined;

      const defaultConfig = this.buildDefaultConfig(entry);
      const targetCwd = resolveCwd(body.cwd);
      writeConfig(targetCwd, defaultConfig);
      res.json({ ok: true });
    });
  }

  /**
   * Handles POST /api/config/preview
   * Validates config content without writing to disk
   *
   * @param req - Express request object
   * @param res - Express response object
   *
   * Request body:
   * - `content` (required): Config file content to validate
   *
   * Response:
   * - `valid`: Whether the config is valid
   * - `errors`: Array of error messages (if invalid)
   *
   * @throws {Error} 500 for validation errors
   */
  protected handlePreviewConfig(req: Request, res: Response): void {
    this.withErrorHandling(res, () => {
      const { content } = this.validateConfigBody(req.body);
      const errors = [
        ...ConfigValidator.validateSemantic(content),
        ...ConfigValidator.validateRuntime(content),
      ];

      res.json({
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
      });
    });
  }

  /**
   * Handles POST /api/config/apply-preview
   * Applies a config temporarily (without persisting it) and runs analysis.
   * Additionally returns a best-effort serialization of depRules for UI editing.
   */
  protected handleApplyConfigPreview(req: Request, res: Response): void {
    this.withErrorHandling(res, () => {
      const body = this.validateBody<ApplyPreviewBody>(req.body);
      const content = this.validateRequired(
        body.content,
        'Body.content is required',
      );
      const entry = this.validateRequired(body.entry, 'Body.entry is required');
      const cwd = resolveCwd(body.cwd);

      const preview = applyConfigPreview(content, entry, cwd);

      let depRules: ReturnType<typeof toSerializableDepRules> | undefined =
        undefined;
      try {
        const evaluated = evaluateSheriffConfig(content);
        depRules = toSerializableDepRules(evaluated);
      } catch {
        depRules = undefined;
      }

      res.json({
        ...preview,
        depRules,
      });
    });
  }

  /**
   * Handles GET /api/data
   * Gets project data for analysis (module information, dependencies)
   *
   * @param req - Express request object
   * @param res - Express response object
   *
   * Query parameters:
   * - `entry` (required): Entry file path (relative to cwd)
   * - `cwd` (optional): Working directory path
   *
   * Response:
   * - `data`: Project data object mapping file paths to analysis data
   *
   * @throws {Error} 500 for analysis errors
   */
  protected handleGetData(req: Request, res: Response): void {
    this.withErrorHandling(res, () => {
      const entry = this.validateQueryParam(req.query.entry, 'entry');
      const cwd = resolveCwd(req.query.cwd);
      const data = getProjectDataForAnalysis(entry, cwd);
      res.json({ data });
    });
  }

  /**
   * Handles GET /api/env
   * Gets environment information (workspace root)
   *
   * @param _req - Express request object (unused)
   * @param res - Express response object
   *
   * Response:
   * - `root`: Workspace root path from environment
   */
  protected handleGetEnv(_req: Request, res: Response): void {
    this.withErrorHandling(res, () => {
      res.json({ root: getRootFromEnv() });
    });
  }

  /**
   * Handles GET /api/fs/tree
   * Builds a directory tree structure for the specified path
   *
   * @param req - Express request object
   * @param res - Express response object
   *
   * Query parameters:
   * - `cwd` (optional): Working directory path
   *
   * Response:
   * - `root`: Root directory path
   * - `tree`: Directory tree structure (DirNode)
   *
   * @throws {Error} 500 for tree building errors
   */
  protected handleTree(req: Request, res: Response): void {
    this.withErrorHandling(res, () => {
      const root = resolveCwd(req.query.cwd);
      const tree = buildFolderTree(root);
      res.json({ root, tree });
    });
  }

  /**
   * Handles POST /api/analyze/merge
   * Analyzes project structure and merges with directory tree
   *
   * Combines project analysis (modules, tags, dependencies) with
   * directory tree structure, annotating directories with module
   * and tag information.
   *
   * @param req - Express request object
   * @param res - Express response object
   *
   * Request body:
   * - `entry` (required): Entry file path (relative to cwd)
   * - `cwd` (optional): Working directory path
   *
   * Response:
   * - `cwd`: Current working directory
   * - `tree`: Annotated directory tree
   * - `analysis`: Project analysis data with file IDs
   * - `fileIdByPathRel`: Mapping of relative paths to file IDs
   *
   * @throws {Error} 500 for analysis errors
   */
  protected handleAnalyzeMerge(req: Request, res: Response): void {
    this.withErrorHandling(res, () => {
      const body = this.validateBody<AnalyzeBody>(req.body);
      const entry = this.validateRequired(body.entry, 'Body.entry (relative to cwd) is required');

      const cwd = resolveCwd(body.cwd);
      const { tree, analysis, fileIdByPathRel } = analyzeAndMerge(entry, cwd);

      res.json({ cwd, tree, analysis, fileIdByPathRel });
    });
  }

  /**
   * Handles POST /api/allowed-modules
   * Computes allowed dependency matrix for selected modules
   *
   * Determines which modules can depend on which other modules
   * based on Sheriff configuration rules.
   *
   * @param req - Express request object
   * @param res - Express response object
   *
   * Request body:
   * - `entry` (required): Entry file path (relative to cwd)
   * - `cwd` (optional): Working directory path
   * - `selectedModules` (optional): Array of module paths (relative to cwd)
   * - `selectedModuleIds` (optional): Array of module IDs (alternative to selectedModules)
   *
   * Response:
   * - `allowedMatrixById`: Matrix mapping module IDs to allowed dependencies
   *   Format: `{ [fromModuleId]: { [toModuleId]: boolean } }`
   *
   * @throws {Error} 500 for analysis or computation errors
   */
  protected handleAllowedModules(req: Request, res: Response): void {
    this.withErrorHandling(res, () => {
      const body = this.validateBody<AllowedModulesBody>(req.body);
      const entry = this.validateRequired(body.entry, 'Body.entry (relative to cwd) is required');

      const cwd = resolveCwd(body.cwd);
      const tree = buildFolderTree(cwd);
      const dirIdByRel = this.buildDirIdMapping(tree);
      const selectedRel = this.resolveSelectedModules(body, dirIdByRel);

      if (selectedRel.length === 0) {
        res.json({ allowedMatrixById: {} });
        return;
      }

      const analysis = getProjectDataForAnalysis(entry, cwd);
      const allModuleRels = Array.from(new Set(Object.values(analysis).map((a) => a.module)));
      const allRels = Array.from(new Set([...selectedRel, ...allModuleRels]));
      const byPath = computeAllowedMatrix(cwd, entry, allRels);
      const allowedMatrixById = this.buildAllowedMatrixById(selectedRel, dirIdByRel, byPath);

      res.json({ allowedMatrixById });
    });
  }

  // ---------- Helper Methods ----------

  /**
   * Wraps handler logic with consistent error handling
   *
   * Executes the handler function and catches any errors, applying
   * the provided error handler or defaulting to a 500 response.
   *
   * @param res - Express response object
   * @param handler - Handler function to execute
   * @param errorHandler - Optional custom error handler
   */
  private withErrorHandling(
    res: Response,
    handler: () => void,
    errorHandler?: (error: Error, res: Response) => void,
  ): void {
    try {
      handler();
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      if (errorHandler) {
        errorHandler(error, res);
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  /**
   * Validates request body has required structure
   *
   * Ensures the body is a non-null object before type casting.
   *
   * @param body - Request body to validate
   * @returns Validated body as type T
   * @throws {Error} If body is not an object
   */
  private validateBody<T>(body: unknown): T {
    if (!body || typeof body !== 'object') {
      throw new Error('Body must be an object');
    }
    return body as T;
  }

  /**
   * Validates config body with content field
   *
   * Ensures the body contains a valid content string.
   *
   * @param body - Request body to validate
   * @returns Validated config body
   * @throws {Error} If body is invalid or missing content field
   */
  private validateConfigBody(body: unknown): ConfigBody {
    const validated = this.validateBody<ConfigBody>(body);
    if (!('content' in validated) || typeof validated.content !== 'string') {
      throw new Error('Body must be an object with a content string');
    }
    return validated;
  }

  /**
   * Validates required query parameter
   *
   * Ensures the query parameter exists and is a non-empty string.
   *
   * @param param - Query parameter value to validate
   * @param paramName - Name of the parameter (for error messages)
   * @returns Trimmed parameter value
   * @throws {Error} If parameter is missing or invalid
   */
  private validateQueryParam(param: unknown, paramName: string): string {
    if (typeof param !== 'string' || !param.trim()) {
      throw new Error(`Missing query parameter "${paramName}" (e.g. ${paramName}=src/main.ts)`);
    }
    return param.trim();
  }

  /**
   * Validates required field
   *
   * Ensures a required value is present (truthy).
   *
   * @param value - Value to validate
   * @param errorMessage - Error message to throw if value is missing
   * @returns Validated value
   * @throws {Error} If value is falsy
   */
  private validateRequired<T>(value: T | undefined, errorMessage: string): T {
    if (!value) {
      throw new Error(errorMessage);
    }
    return value;
  }

  /**
   * Builds default config template
   *
   * Generates a default Sheriff configuration template with optional
   * entry file specification.
   *
   * @param entry - Optional entry file path (relative to cwd)
   * @returns Default config file content as string
   */
  private buildDefaultConfig(entry?: string): string {
    return `import { SheriffConfig } from '@softarc/sheriff-core';

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
  }

  /**
   * Builds directory ID to path mapping from tree
   *
   * Traverses the directory tree and creates a mapping from
   * relative paths to directory IDs.
   *
   * @param tree - Root directory node
   * @returns Mapping of relative paths to directory IDs
   */
  private buildDirIdMapping(tree: DirNode): Record<string, string> {
    const dirIdByRel: Record<string, string> = {};
    const stack: Array<DirNode | FileNode> = [tree];

    while (stack.length) {
      const node = stack.pop()!;
      if (node.type === 'dir') {
        dirIdByRel[node.pathRel] = node.id;
        stack.push(...node.children);
      }
    }

    return dirIdByRel;
  }

  /**
   * Resolves selected modules from IDs or paths
   *
   * Converts module IDs to relative paths if provided, otherwise
   * uses the provided module paths directly.
   *
   * @param body - Request body containing selected modules
   * @param dirIdByRel - Mapping of relative paths to directory IDs
   * @returns Array of relative module paths
   */
  private resolveSelectedModules(
    body: AllowedModulesBody,
    dirIdByRel: Record<string, string>,
  ): string[] {
    if (Array.isArray(body.selectedModuleIds) && body.selectedModuleIds.length > 0) {
      const pathRelById = Object.fromEntries(
        Object.entries(dirIdByRel).map(([rel, id]) => [id, rel]),
      );
      return body.selectedModuleIds
        .map((id) => pathRelById[id])
        .filter((rel): rel is string => typeof rel === 'string');
    }

    if (Array.isArray(body.selectedModules) && body.selectedModules.length > 0) {
      return body.selectedModules;
    }

    return [];
  }

  /**
   * Builds allowed matrix indexed by directory IDs
   *
   * Converts the path-based allowed matrix to an ID-based matrix
   * for easier client-side consumption.
   *
   * @param selectedRel - Array of selected module relative paths
   * @param dirIdByRel - Mapping of relative paths to directory IDs
   * @param byPath - Allowed matrix indexed by paths
   * @returns Allowed matrix indexed by directory IDs
   */
  private buildAllowedMatrixById(
    selectedRel: string[],
    dirIdByRel: Record<string, string>,
    byPath: Record<string, Record<string, boolean>>,
  ): Record<string, Record<string, boolean>> {
    const allowedMatrixById: Record<string, Record<string, boolean>> = {};

    for (const fromRel of selectedRel) {
      const fromId = dirIdByRel[fromRel];
      if (!fromId) continue;

      const row = byPath[fromRel] ?? {};
      const idRow: Record<string, boolean> = {};

      for (const [toRel, allowed] of Object.entries(row)) {
        const toId = dirIdByRel[toRel];
        if (toId) {
          idRow[toId] = allowed;
        }
      }

      allowedMatrixById[fromId] = idRow;
    }

    return allowedMatrixById;
  }
}
