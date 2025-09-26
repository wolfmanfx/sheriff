import type { SerializableDepRules, SerializableDepRule } from '../models/dep-rules';
import type { FolderNode } from '../../../module-renderer/+state/models/folder-node';

/**
 * Gets static tags from a serializable dep rule.
 * Returns empty array for function-only rules.
 */
export function getStaticTags(rule: SerializableDepRule): string[] {
  if (rule.kind === 'static') return rule.tags;
  if (rule.kind === 'mixed') return rule.tags;
  return [];
}

/**
 * Collects all unique tags from a folder tree and dependency rules.
 * Works directly with SerializableDepRules to include all tags (including from function rules).
 */
export function collectTags(root: FolderNode | null, depRulesRaw: SerializableDepRules | null): string[] {
  const tags = new Set<string>();

  // Collect tags from tree
  const walk = (n: FolderNode) => {
    for (const t of n.tags ?? []) tags.add(t);
    for (const c of n.children) walk(c);
  };
  if (root) walk(root);

  // Collect tags from dep rules (both keys and values)
  if (depRulesRaw) {
    for (const [from, rule] of Object.entries(depRulesRaw)) {
      tags.add(from);
      // Add static tags from the rule
      for (const t of getStaticTags(rule)) {
        tags.add(t);
      }
    }
  }

  return [...tags].sort((a, b) => a.localeCompare(b));
}
