import type { FolderNode } from '../module-renderer/+state/models/folder-node';
import type { DirNode } from '../api/model/dir-node';

/**
 * Convert merged analyze tree (directories only) to KonvaNode[] for rendering.
 * Pure transformation; safe to use inside computed signals.
 */
export function toFolderNodesFromMergedTree(merged: { tree?: DirNode } | undefined): FolderNode[] {
  if (!merged || !merged.tree) return [];
  const out: FolderNode[] = [];
  function walk(node: DirNode, parentId?: string) {
    if (node.type !== 'dir') return;
    out.push({ id: node.id, parentId, name: node.name, tags: node.tags, isSheriffModule: !!node.isSheriffModule,  children: [] });
    for (const c of node.children) if (c.type === 'dir') walk(c, node.id);
  }
  walk(merged.tree);
  return out;
}


