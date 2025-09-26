import type { DirNode } from '../../core';
import type { TagsByPathRel } from '../models';

/**
 * Materialize a `{ pathRel -> tags[] }` map from the annotated directory tree.
 * Only includes nodes that are sheriff modules and have at least one tag.
 */
export function materializeModulesByPathRel(root: DirNode): TagsByPathRel {
  const out: TagsByPathRel = {};

  const walk = (node: DirNode): void => {
    if (node.isSheriffModule && (node.tags?.length ?? 0) > 0) {
      out[node.pathRel] = [...(node.tags ?? [])];
    }
    for (const child of node.children) {
      if (child.type === 'dir') walk(child);
    }
  };

  walk(root);
  return out;
}

/**
 * Applies explicit module tags to the directory tree.
 * Merges explicit modules config into the tree, updating tags and isSheriffModule flags.
 * Modifies the tree in place for efficiency.
 */
export function applyModulesToTree(root: DirNode, modulesByPathRel: TagsByPathRel): void {
  const walk = (node: DirNode): void => {
    const explicitTags = modulesByPathRel[node.pathRel];
    if (explicitTags !== undefined) {
      node.tags = explicitTags;
      node.isSheriffModule = node.isSheriffModule || explicitTags.length > 0;
    }
    for (const child of node.children) {
      if (child.type === 'dir') walk(child);
    }
  };

  walk(root);
}
