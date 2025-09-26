import { z } from 'zod/v3';

export const dependencyRulesExtractionSchema = z.object({
  data: z.object({
    domains: z.array(z.string()).nullish().describe('Complete updated list of domains (null/undefined if not updated)'),
    types: z.array(z.string()).nullish().describe('Complete updated list of types (null/undefined if not updated)'),
    domainIsolation: z.boolean().nullish().describe('Whether domains should be isolated from each other (null/undefined if not updated)'),
    typeHierarchy: z.record(z.string(), z.array(z.string())).nullish().describe('Complete updated type hierarchy object (null/undefined if not updated)'),
    sharedAccess: z.boolean().nullish().describe('Whether shared folder can be accessed by domains (null/undefined if not updated)'),
    rootAccess: z.array(z.string()).nullish().describe('Complete updated list of domains/types that can access root (null/undefined if not updated)'),
  }).refine(
    (data) => {
      return Object.values(data).some((value) => value !== null && value !== undefined);
    },
    { message: 'At least one field must be provided' },
  ).describe('Complete updated dependency rules (must include at least one property)'),
  isDone: z.boolean().describe('Whether the user is ready to generate the config (true if user wants to generate/create/finish, false otherwise)'),
  message: z.string().describe('User-friendly confirmation message'),
});

export type DependencyRulesExtractionResponse = z.infer<typeof dependencyRulesExtractionSchema>;

