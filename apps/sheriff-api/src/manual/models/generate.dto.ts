import { z } from 'zod';
import { ManualConfigOptionsSchema } from './manual-config.models';
import { SerializableDepRulesSchema, TagsByPathRelSchema } from './manual-preview.models';

export const GenerateRequestSchema = z.object({
  baseDraft: z.string().min(1, 'baseDraft is required'),
  options: ManualConfigOptionsSchema.optional(),
  originalModulesConfig: TagsByPathRelSchema.optional(),
  desiredModulesByPathRel: TagsByPathRelSchema,
  inferredModulesByPathRel: TagsByPathRelSchema,
  // depRules is optional - will be derived from depRulesRaw if not provided
  depRules: z.record(z.string(), z.array(z.string())).optional(),
  depRulesRaw: SerializableDepRulesSchema.nullable().optional(),
});

export type GenerateRequestDto = z.infer<typeof GenerateRequestSchema>;

export type GenerateResponseDto = {
  draft: string;
};

