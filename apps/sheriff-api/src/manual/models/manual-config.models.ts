import { z } from 'zod';

// ---- Serializable Config Options ----

export const SerializableRegExpSchema = z.object({
  kind: z.literal('regex'),
  pattern: z.string(),
  flags: z.string(),
});

export type SerializableRegExp = z.infer<typeof SerializableRegExpSchema>;

export const EncapsulationPatternSchema = z.union([z.string(), SerializableRegExpSchema]);

export type EncapsulationPattern = z.infer<typeof EncapsulationPatternSchema>;

export const SerializableIgnoreFileExtensionsSchema = z.union([
  z.array(z.string()),
  z.object({ kind: z.literal('function'), source: z.string() }),
]);

export type SerializableIgnoreFileExtensions = z.infer<typeof SerializableIgnoreFileExtensionsSchema>;

export const ManualConfigOptionsSchema = z.object({
  version: z.number().optional(),
  autoTagging: z.boolean().optional(),
  excludeRoot: z.boolean().optional(),
  barrelFileName: z.string().optional(),
  enableBarrelLess: z.boolean().optional(),
  encapsulationPattern: EncapsulationPatternSchema.optional(),
  log: z.boolean().optional(),
  entryFile: z.string().optional(),
  entryPoints: z.record(z.string(), z.string()).optional(),
  ignoreFileExtensions: SerializableIgnoreFileExtensionsSchema.optional(),
});

export type ManualConfigOptions = z.infer<typeof ManualConfigOptionsSchema>;

