/**
 * Structured Agent Response Schema
 * Defines the format for agent responses with actions
 */
import { z } from 'zod/v3';

export const ActionTypeSchema = z.enum([
  'showConfig',
  'showOrgChart',
  'openAssetView',
  'analyzeProject',
  'showValidationReport',
  'none',
]);

export const ActionSchema = z.object({
  type: ActionTypeSchema,
  label: z.string().optional(),
  params: z.record(z.string(), z.unknown()).optional(),
});

export const StructuredAgentResponseSchema = z.object({
  /**
   * The conversational text response (markdown)
   */
  text: z.string().describe('The conversational response to show to the user in markdown format'),

  /**
   * Optional actions to trigger in the UI
   */
  actions: z.array(ActionSchema).optional().describe('Actions to trigger in the UI (e.g., show config, open org chart)'),

  /**
   * Optional structured data (e.g., project requirements summary, config brief)
   * Can be a generic object or a typed project analysis response
   */
  data: z.union([
    z.record(z.string(), z.unknown()),
    z.object({
      type: z.literal('project-analysis'),
    }).passthrough(),
  ]).optional().describe('Structured data extracted from the response (e.g., config brief, project analysis)'),
});

export type StructuredAgentResponse = z.infer<typeof StructuredAgentResponseSchema>;
export type Action = z.infer<typeof ActionSchema>;
export type ActionType = z.infer<typeof ActionTypeSchema>;

