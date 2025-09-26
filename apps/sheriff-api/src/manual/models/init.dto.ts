import { z } from 'zod';
import type { PreviewContext } from './manual-preview.models';

export const InitRequestSchema = z.object({
  cwd: z.string().optional(),
  entry: z.string().optional(),
});

export type InitRequestDto = z.infer<typeof InitRequestSchema>;

export type InitResponseDto = {
  cwd: string;
  entry: string;
  missingConfig: boolean;
  activeConfigContent: string;
  draft: string;
  preview?: PreviewContext;
};

