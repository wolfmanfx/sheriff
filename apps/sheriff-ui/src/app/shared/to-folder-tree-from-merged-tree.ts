import { FolderNode } from '../module-renderer/+state/models/folder-node';
import type { DirNode } from '../api/model/dir-node';

/**
 * Convert merged analyze response to a directory-only hierarchical Konva tree.
 * Returns null if no tree is present.
 */
export function toFolderTreeFromMergedTree(merged: { tree?: DirNode } | undefined): FolderNode | null {
  if (!merged || !merged.tree) return null;
  const toTree = (node: DirNode): FolderNode => ({
    id: node.id,
    name: node.name,
    isSheriffModule: !!node.isSheriffModule,
    tags: node.tags,
    children: node.children.filter((c): c is DirNode => c.type === 'dir').map((d) => toTree(d)),
  });
  return toTree(merged.tree);
}


