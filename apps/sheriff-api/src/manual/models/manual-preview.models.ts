import { z } from 'zod';
import type { DirNode } from '../../core';
import type { ManualConfigOptions } from './manual-config.models';

// ---- Tag Types ----

export type TagsByPathRel = Record<string, string[]>;

export const TagsByPathRelSchema = z.record(z.string(), z.array(z.string()));

// ---- Serializable Dep Rules ----

export const SerializableDepRuleSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('static'), tags: z.array(z.string()) }),
  z.object({ kind: z.literal('function'), source: z.string() }),
  z.object({ kind: z.literal('mixed'), tags: z.array(z.string()), functions: z.array(z.string()) }),
  z.object({ kind: z.literal('unknown'), type: z.string() }),
]);

export type SerializableDepRule = z.infer<typeof SerializableDepRuleSchema>;

export const SerializableDepRulesSchema = z.record(z.string(), SerializableDepRuleSchema);

export type SerializableDepRules = z.infer<typeof SerializableDepRulesSchema>;

// ---- Preview Context ----

/**
 * PreviewContext is the response from preview operations.
 * Note: `cwd` is included for backward compatibility but should be retrieved from init response.
 */
export type PreviewContext = {
  cwd: string;
  tree: DirNode;
  analysis: unknown;
  fileIdByPathRel: Record<string, string>;
  configValid: boolean;
  errors?: string[];
  depRulesRaw?: SerializableDepRules;
  options?: ManualConfigOptions;
  inferredModulesByPathRel: TagsByPathRel;
  /** Module patterns with <placeholders> from config (e.g., 'src/app/<domain>') */
  originalModulesConfig: TagsByPathRel;
  /** Explicit module entries from config (without placeholders) */
  explicitModulesConfig: TagsByPathRel;
};

