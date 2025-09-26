import { z } from 'zod';

export const SaveRequestSchema = z.object({
  draft: z.string().min(1, 'draft is required'),
  cwd: z.string().optional(),
});

export type SaveRequestDto = z.infer<typeof SaveRequestSchema>;

export type SaveSuccessResponseDto = {
  ok: true;
  checksum?: string;
};

export type SaveErrorResponseDto = {
  ok: false;
  errors: string[];
};

export type SaveResponseDto = SaveSuccessResponseDto | SaveErrorResponseDto;

