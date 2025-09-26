/**
 * Tree Annotator
 * Annotates directory tree with module and tag information
 */
import type { DirNode, FileNode } from './types';
import type { ProjectData } from '@softarc/sheriff-core';

type ProjectDataEntry = ProjectData[string];

/**
 * Builds file ID mapping from tree
 */
export function buildFileIdMapping(tree: DirNode): Record<string, string> {
  const fileIdByRel: Record<string, string> = {};
  const stack: Array<DirNode | FileNode> = [tree];

  while (stack.length) {
    const node = stack.pop()!;
    if (node.type === 'dir') {
      for (const child of node.children) stack.push(child);
    } else {
      fileIdByRel[node.pathRel] = node.id;
    }
  }

  return fileIdByRel;
}

/**
 * Merges analysis data with file IDs
 */
export function mergeAnalysisWithIds(
  analysis: Record<string, ProjectDataEntry>,
  fileIdByRel: Record<string, string>,
): Record<string, ProjectDataEntry & { fileId?: string }> {
  const analysisWithIds: Record<string, ProjectDataEntry & { fileId?: string }> = {};
  for (const [relPath, entry] of Object.entries(analysis)) {
    analysisWithIds[relPath] = {
      ...entry,
      fileId: fileIdByRel[relPath],
    };
  }
  return analysisWithIds;
}

/**
 * Annotates tree with module information
 */
export function annotateModules(tree: DirNode, moduleDirs: Set<string>): void {
  const annotateDir = (dir: DirNode): void => {
    dir.isSheriffModule = moduleDirs.has(dir.pathRel);
    for (const child of dir.children) {
      if (child.type === 'dir') annotateDir(child);
    }
  };
  annotateDir(tree);
}

/**
 * Annotates tree with tag information
 */
export function annotateTags(
  tree: DirNode,
  analysisWithIds: Record<string, ProjectDataEntry & { fileId?: string }>,
): void {
  const annotateDir = (dir: DirNode): void => {
    // First annotate children recursively
    for (const child of dir.children) {
      if (child.type === 'dir') annotateDir(child);
    }

    // Then aggregate tags from files in this directory
    const tagSet = new Set<string>();
    for (const child of dir.children) {
      if (child.type === 'file') {
        const analysis = analysisWithIds[child.pathRel];
        if (analysis?.tags && Array.isArray(analysis.tags)) {
          for (const tag of analysis.tags) tagSet.add(tag);
        }
      }
    }

    if (tagSet.size > 0) {
      dir.tags = Array.from(tagSet).sort();
    } else {
      delete dir.tags;
    }
  };
  annotateDir(tree);
}

