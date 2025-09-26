/**
 * Sheriff Operations
 * Sheriff-specific analysis and dependency operations
 */
import * as path from 'path';
import {
  init as initProject,
  toFsPath,
  calcTagsForModule,
  isDependencyAllowed,
} from '@softarc/sheriff-core';
import type {
  AnalyzeResult,
  AllowedMatrixResult,
  FullImportMatrixResult,
  SummarizeTagsResult,
  ModuleAccessListResult,
  ModuleStructureResult,
  DirNode,
} from './types';
import type { FileNode } from './types/file-node';
import { buildFolderTree } from './tree-operations';
import { getProjectDataForAnalysis, analyzeAndMerge } from './analysis-operations';

/**
 * Computes dependency matrix showing which modules can depend on which.
 * Evaluates Sheriff dependency rules for all module pairs.
 *
 * @param cwd - Working directory of the project
 * @param entryRel - Entry file path (relative to cwd)
 * @param selectedModulesRel - Array of module paths to analyze (relative to cwd)
 * @returns Matrix mapping [fromModule][toModule] -> boolean (allowed or not)
 */
export function computeAllowedMatrix(
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

/**
 * Analyzes project structure returning only directory tree with tags
 * Returns simplified structure without file-level analysis
 *
 * @param entry - Entry file path (relative to cwd)
 * @param cwd - Working directory of the project
 * @returns Directory tree with module and tag annotations, empty analysis
 */
export function analyzeDirectoryOnly(
  entry: string,
  cwd: string,
): AnalyzeResult {
  const tree = buildFolderTree(cwd, cwd, true);
  const analysis = getProjectDataForAnalysis(entry, cwd);

  const moduleDirs = new Set<string>();
  for (const value of Object.values(analysis)) {
    moduleDirs.add(value.module);
  }

  const dirTagsMap = new Map<string, Set<string>>();
  for (const [filePath, entry] of Object.entries(analysis)) {
    const dirPath = path.dirname(filePath);
    if (!dirTagsMap.has(dirPath)) {
      dirTagsMap.set(dirPath, new Set());
    }
    if (Array.isArray(entry.tags)) {
      for (const tag of entry.tags) {
        dirTagsMap.get(dirPath)!.add(tag);
      }
    }
  }

  /**
   * Annotate tree with module and tag information
   * Since directoriesOnly=true, all children are guaranteed to be DirNode
   */
  const annotateTree = (node: DirNode): DirNode => {
    const annotatedNode: DirNode = {
      ...node,
      isSheriffModule: moduleDirs.has(node.pathRel),
      children: node.children
        .filter((child): child is DirNode => child.type === 'dir')
        .map((child) => annotateTree(child)),
    };

    const tags = dirTagsMap.get(node.pathRel);
    if (tags && tags.size > 0) {
      annotatedNode.tags = Array.from(tags).sort();
    } else {
      delete annotatedNode.tags;
    }

    return annotatedNode;
  };

  const annotatedTree = annotateTree(tree);

  return {
    cwd,
    tree: annotatedTree,
    analysis: {},
    fileIdByPathRel: {},
  };
}

/**
 * Analyzes project structure including all files with full analysis data
 * Returns complete structure with file-level analysis, dependencies, and tags
 *
 * @param entry - Entry file path (relative to cwd)
 * @param cwd - Working directory of the project
 * @returns Full tree structure with files, analysis data, and file ID mappings
 */
export function analyzeFull(
  entry: string,
  cwd: string,
): AnalyzeResult {
  const result = analyzeAndMerge(entry, cwd);
  return {
    cwd,
    tree: result.tree,
    analysis: result.analysis,
    fileIdByPathRel: result.fileIdByPathRel,
  };
}

/**
 * Returns all files in the project as a tree-structured text format
 * Similar to `tree` command output, showing directories and files hierarchically
 *
 * @param cwd - Working directory of the project
 * @param rootPath - Optional root path to build tree from (defaults to cwd)
 * @returns Tree-structured text representation of all files and directories
 */
export function getAllFilesAsTreeText(
  cwd: string,
  rootPath?: string,
): string {
  const rootAbs = rootPath ? path.resolve(cwd, rootPath) : cwd;
  // Build tree with files included (directoriesOnly = false)
  const tree = buildFolderTree(rootAbs, rootAbs, false);

  /**
   * Formats a tree node as text with proper indentation and tree characters
   */
  const formatTree = (
    node: DirNode | FileNode,
    prefix: string = '',
    isLast: boolean = true,
  ): string => {
    const lines: string[] = [];
    const connector = isLast ? '└── ' : '├── ';
    lines.push(`${prefix}${connector}${node.name}`);

    if (node.type === 'dir') {
      const dirNode = node as DirNode;
      const children = dirNode.children;
      if (children.length > 0) {
        const sortedChildren = [...children].sort((a, b) => {
          if (a.type === 'dir' && b.type === 'file') return -1;
          if (a.type === 'file' && b.type === 'dir') return 1;
          return a.name.localeCompare(b.name);
        });

        for (let i = 0; i < sortedChildren.length; i++) {
          const child = sortedChildren[i];
          const isLastChild = i === sortedChildren.length - 1;
          const extension = isLast ? '    ' : (isLastChild ? '    ' : '│   ');
          lines.push(formatTree(child, prefix + extension, isLastChild));
        }
      }
    }

    return lines.join('\n');
  };

  const rootName = path.basename(rootAbs) || path.basename(cwd);
  const rootNode: DirNode = {
    ...tree,
    name: rootName,
  };

  const lines: string[] = [rootName];
  const children = rootNode.children;
  if (children.length > 0) {
    const sortedChildren = [...children].sort((a, b) => {
      if (a.type === 'dir' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'dir') return 1;
      return a.name.localeCompare(b.name);
    });

    for (let i = 0; i < sortedChildren.length; i++) {
      const child = sortedChildren[i];
      const isLastChild = i === sortedChildren.length - 1;
      lines.push(formatTree(child, '', isLastChild));
    }
  }

  return lines.join('\n');
}

/**
 * Computes allowed dependency matrix and converts from path-based to ID-based
 *
 * @param cwd - Working directory of the project
 * @param entryRel - Entry file path (relative to cwd)
 * @param selectedModulesRel - Array of module paths to analyze (relative to cwd)
 * @returns Matrix mapping [fromModuleId][toModuleId] -> boolean (allowed or not)
 */
export function computeAllowedMatrixById(
  cwd: string,
  entryRel: string,
  selectedModulesRel: string[],
): AllowedMatrixResult {
  const byPath = computeAllowedMatrix(cwd, entryRel, selectedModulesRel);

  // Build tree with directories only (no files needed for matrix)
  const tree = buildFolderTree(cwd, cwd, true);
  const dirIdByRel: Record<string, string> = {};
  const stack: DirNode[] = [tree];
  while (stack.length) {
    const n = stack.pop()!;
    dirIdByRel[n.pathRel] = n.id;
    for (const c of n.children) {
      if (c.type === 'dir') {
        stack.push(c);
      }
    }
  }

  const allowedMatrixById: Record<string, Record<string, boolean>> = {};
  for (const fromRel of selectedModulesRel) {
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

  return { allowedMatrixById };
}

/**
 * Calculates tags for a specific module path
 *
 * @param modulePathRel - Module path (relative to cwd)
 * @param entryRel - Entry file path (relative to cwd)
 * @param cwd - Working directory of the project
 * @returns Tags for the module and the module path
 */
export function summarizeTagsForModule(
  modulePathRel: string,
  entryRel: string,
  cwd: string,
): SummarizeTagsResult {
  const entryAbs = path.isAbsolute(entryRel)
    ? entryRel
    : path.join(cwd, entryRel);
  const projectInfo = initProject(toFsPath(entryAbs));

  const moduleAbs = path.isAbsolute(modulePathRel)
    ? modulePathRel
    : path.join(cwd, modulePathRel);
  const moduleFs = toFsPath(moduleAbs);

  const tags = calcTagsForModule(
    moduleFs,
    projectInfo.rootDir,
    projectInfo.config.modules,
    projectInfo.config.autoTagging,
  );

  return { tags, modulePath: modulePathRel };
}

/**
 * Gets module structure with tags and generates mermaid diagram
 * Only includes modules that have tags (ignores untagged modules)
 *
 * @param entryRel - Entry file path (relative to cwd)
 * @param cwd - Working directory of the project
 * @returns Module structure with tags and mermaid diagram
 */
export function getModuleStructureWithMermaid(
  entryRel: string,
  cwd: string,
): ModuleStructureResult {
  const analysis = getProjectDataForAnalysis(entryRel, cwd);

  const moduleMap = new Map<string, Set<string>>();
  for (const entry of Object.values(analysis)) {
    if (entry.tags && entry.tags.length > 0) {
      const modulePath = entry.module;
      if (!moduleMap.has(modulePath)) {
        moduleMap.set(modulePath, new Set());
      }
      for (const tag of entry.tags) {
        moduleMap.get(modulePath)!.add(tag);
      }
    }
  }

  const modules = Array.from(moduleMap.entries())
    .filter(([, tags]) => tags.size > 0)
    .map(([modulePath, tags]) => ({
      path: modulePath,
      tags: Array.from(tags).sort(),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

  let mermaid = 'graph TD\n';

  for (const module of modules) {
    const nodeId = module.path.replace(/[^a-zA-Z0-9]/g, '_').replace(/^_+|_+$/g, '') || 'root';
    const tagsLabel = module.tags.join(', ');
    const displayPath = module.path === '.' ? 'root' : module.path;
    mermaid += `  ${nodeId}["${displayPath}<br/>${tagsLabel}"]\n`;
  }

  const importMap = new Map<string, Set<string>>();
  for (const [, entry] of Object.entries(analysis)) {
    if (entry.tags && entry.tags.length > 0) {
      const fromModule = entry.module;
      if (!importMap.has(fromModule)) {
        importMap.set(fromModule, new Set());
      }
      for (const importPath of entry.imports) {
        const importedEntry = analysis[importPath];
        if (importedEntry && importedEntry.tags && importedEntry.tags.length > 0) {
          const toModule = importedEntry.module;
          if (toModule !== fromModule) {
            importMap.get(fromModule)!.add(toModule);
          }
        }
      }
    }
  }

  for (const [fromModule, toModules] of importMap.entries()) {
    const fromId = fromModule.replace(/[^a-zA-Z0-9]/g, '_').replace(/^_+|_+$/g, '') || 'root';
    for (const toModule of toModules) {
      const toId = toModule.replace(/[^a-zA-Z0-9]/g, '_').replace(/^_+|_+$/g, '') || 'root';
      mermaid += `  ${fromId} --> ${toId}\n`;
    }
  }

  return {
    modules,
    mermaid,
  };
}

/**
 * Gets the list of modules that a specific module can access
 * Based on Sheriff dependency rules
 *
 * @param modulePathRel - Module path to query (relative to cwd)
 * @param entryRel - Entry file path (relative to cwd)
 * @param cwd - Working directory of the project
 * @returns List of module paths that the given module can access
 */
export function getModuleAllowedModules(
  modulePathRel: string,
  entryRel: string,
  cwd: string,
): ModuleAccessListResult {
  const analysis = getProjectDataForAnalysis(entryRel, cwd);
  const allModuleRels = Array.from(
    new Set(Object.values(analysis).map((a) => a.module)),
  );

  const allModules = Array.from(
    new Set([modulePathRel, ...allModuleRels]),
  );
  const matrix = computeAllowedMatrix(cwd, entryRel, allModules);

  const moduleRow = matrix[modulePathRel] ?? {};

  const allowedModules = Object.entries(moduleRow)
    .filter(([, allowed]) => allowed === true)
    .map(([modulePath]) => modulePath)
    .sort();

  return {
    modulePath: modulePathRel,
    allowedModules,
  };
}

/**
 * Computes full file-to-file import matrix showing which files import which files
 * Based on actual import relationships from ProjectData
 *
 * @param cwd - Working directory of the project
 * @param entryRel - Entry file path (relative to cwd)
 * @returns Matrix mapping [fromFilePath][toFilePath] -> boolean (imports or not)
 */
export function computeFullImportMatrix(
  cwd: string,
  entryRel: string,
): FullImportMatrixResult {
  const analysis = getProjectDataForAnalysis(entryRel, cwd);

  const importMatrix: Record<string, Record<string, boolean>> = {};

  for (const [filePath, entry] of Object.entries(analysis)) {
    if (!importMatrix[filePath]) {
      importMatrix[filePath] = {};
    }

    for (const importPath of entry.imports) {
      if (analysis[importPath]) {
        importMatrix[filePath][importPath] = true;
      }
    }
  }

  return { importMatrix };
}

