import { z } from 'zod';
import type { PreviewContext } from './manual-preview.models';

/**
 * Base schema for all mutation requests.
 * All mutations operate on the current draft and return updated draft + preview.
 */
const MutationBaseSchema = z.object({
  draft: z.string().min(1, 'draft is required'),
  entry: z.string().min(1, 'entry is required'),
  cwd: z.string().optional(),
});

export const AddTagRequestSchema = MutationBaseSchema.extend({
  pathRel: z.string().min(1, 'pathRel is required'),
  tag: z.string().min(1, 'tag is required'),
});

export type AddTagRequestDto = z.infer<typeof AddTagRequestSchema>;

export const RemoveTagRequestSchema = MutationBaseSchema.extend({
  pathRel: z.string().min(1, 'pathRel is required'),
  tag: z.string().min(1, 'tag is required'),
});

export type RemoveTagRequestDto = z.infer<typeof RemoveTagRequestSchema>;

export const DeleteTagRequestSchema = MutationBaseSchema.extend({
  tag: z.string().min(1, 'tag is required'),
});

export type DeleteTagRequestDto = z.infer<typeof DeleteTagRequestSchema>;

export const ToggleDepRuleRequestSchema = MutationBaseSchema.extend({
  from: z.string().min(1, 'from tag is required'),
  to: z.string().min(1, 'to tag is required'),
});

export type ToggleDepRuleRequestDto = z.infer<typeof ToggleDepRuleRequestSchema>;

/**
 * Response for all mutation operations.
 * Contains the new draft and full preview context.
 */
export type MutationResponseDto = {
  /** The regenerated draft after mutation */
  draft: string;
  /** Full preview context with updated state */
  preview: PreviewContext;
};

