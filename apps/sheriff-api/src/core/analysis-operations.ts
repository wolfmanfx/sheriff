/**
 * Analysis Operations
 * Functions for analyzing project structure and dependencies
 */
import { getProjectData, ProjectData } from '@softarc/sheriff-core';
import type { DirNode } from './types';
import { buildFolderTree } from './tree-operations';
import {
  buildFileIdMapping,
  mergeAnalysisWithIds,
  annotateModules,
  annotateTags,
} from './tree-annotator';

/**
 * Analyzes project structure and extracts dependency information.
 * Uses Sheriff core to parse TypeScript project and build dependency graph.
 *
 * @param entry - Entry file path (relative to cwd)
 * @param cwd - Working directory of the project
 * @returns Project data with modules, dependencies, and tags
 */
export function getProjectDataForAnalysis(
  entry: string,
  cwd: string,
): ProjectData {
  return getProjectData(entry, cwd, {
    includeExternalLibraries: true,
    projectName: 'default',
  });
}

/**
 * Analyzes project and merges results with folder tree structure.
 * Annotates tree nodes with module information and tags.
 *
 * @param entry - Entry file path (relative to cwd)
 * @param cwd - Working directory of the project
 * @returns Tree structure with analysis data, file ID mappings, and annotations
 */
export function analyzeAndMerge(
  entry: string,
  cwd: string,
): {
  tree: DirNode;
  analysis: Record<string, ProjectData[string] & { fileId?: string }>;
  fileIdByPathRel: Record<string, string>;
} {
  const tree = buildFolderTree(cwd, cwd, false);
  const analysis = getProjectDataForAnalysis(entry, cwd);

  // Build file ID mapping and merge with analysis
  const fileIdByRel = buildFileIdMapping(tree);
  const analysisWithIds = mergeAnalysisWithIds(analysis, fileIdByRel);

  // Extract module directories and annotate tree
  const moduleDirs = new Set<string>();
  for (const value of Object.values(analysis)) {
    moduleDirs.add(value.module);
  }

  annotateModules(tree, moduleDirs);
  annotateTags(tree, analysisWithIds);

  return {
    tree,
    analysis: analysisWithIds,
    fileIdByPathRel: fileIdByRel,
  };
}

