import { z } from 'zod';
import type { PreviewContext } from './manual-preview.models';

export const PreviewRequestSchema = z.object({
  draft: z.string().min(1, 'draft is required'),
  entry: z.string().min(1, 'entry is required'),
  cwd: z.string().optional(),
});

export type PreviewRequestDto = z.infer<typeof PreviewRequestSchema>;

export type PreviewResponseDto = PreviewContext;

