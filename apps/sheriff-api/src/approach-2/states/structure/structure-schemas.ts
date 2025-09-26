import { z } from 'zod/v3';

export const pathExtractionSchema = z.object({
  data: z.object({
    cwd: z.string().nullish().describe('The project root directory path (absolute or relative)'),
    entry: z.string().nullish().describe('The entry file path relative to cwd'),
  }).refine(
    (data) => {
      return data.cwd !== null && data.cwd !== undefined || data.entry !== null && data.entry !== undefined;
    },
    { message: 'At least one of cwd or entry must be provided' },
  ).describe('Extracted path data (must include at least cwd or entry)'),
  nextState: z.literal('STRUCTURE'),
  message: z.string().describe('User-friendly confirmation message or polite request for missing information'),
});

export type PathExtractionResponse = z.infer<typeof pathExtractionSchema>;

export const domainTypeExtractionSchema = z.object({
  data: z.object({
    domains: z.array(z.string()).describe('List of extracted domain names'),
    types: z.array(z.string()).describe('List of extracted type names'),
    hasShared: z.boolean().describe('Whether a shared folder exists'),
    domainBasePath: z.string().describe('The base path where domains are located'),
  }),
  nextState: z.literal('DEPENDENCY_RULES'),
  message: z.string().describe('User-friendly findings message'),
});

export type DomainTypeExtractionResponse = z.infer<typeof domainTypeExtractionSchema>;

