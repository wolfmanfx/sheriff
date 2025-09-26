import { z } from 'zod/v3';

export const routerDecisionSchema = z.object({
  nextState: z.enum(['INIT', 'STRUCTURE', 'DEPENDENCY_RULES', 'DONE']).describe('The state to transition to'),
  action: z.enum(['welcome', 'extractPath', 'analyzeStructure', 'extractRules', 'generateConfig', 'stay', 'restart']).describe('What action to take'),
  message: z.string().describe('Response message for user'),
});

export type RouterDecision = z.infer<typeof routerDecisionSchema>;

