/**
 * Response Type Schemas
 * Defines different types of structured responses from the AI agent
 */
import { z } from 'zod/v3';
import { ProjectAnalysisSchema } from './project-analysis';

/**
 * Action types that can be triggered in the UI
 */
export const ActionTypeSchema = z.enum([
  'showConfig',
  'showOrgChart',
  'openAssetView',
  'analyzeProject',
  'showValidationReport',
  'previewConfig',
  'generateConfig',
  'confirm',
  'cancel',
  'submit',
  'none',
]);

export const ActionSchema = z.object({
  type: ActionTypeSchema,
  label: z.string().optional(),
  params: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Confirmation Response
 * Used when the agent needs user confirmation (e.g., directory confirmation)
 */
export const ConfirmationResponseSchema = z.object({
  type: z.literal('confirmation'),
  text: z.string().describe('The message asking for confirmation'),
  confirmLabel: z.string().optional().default('Yes').describe('Label for the confirm button'),
  cancelLabel: z.string().optional().default('Cancel').describe('Label for the cancel button'),
  allowCustomInput: z.boolean().optional().default(false).describe('Whether to allow custom input (e.g., custom path)'),
  customInputLabel: z.string().optional().describe('Label for custom input field'),
  customInputPlaceholder: z.string().optional().describe('Placeholder for custom input field'),
  customInputType: z.enum(['text', 'path']).optional().default('text').describe('Type of custom input'),
  onConfirm: z.string().optional().describe('Text to send when confirm is clicked (defaults to confirmLabel)'),
  onCancel: z.string().optional().describe('Text to send when cancel is clicked'),
  onCustomSubmit: z.string().optional().describe('Pattern for custom input submission (use {value} placeholder)'),
});

/**
 * General Message Response
 * Standard markdown message with optional actions
 */
export const GeneralMessageResponseSchema = z.object({
  type: z.literal('message'),
  text: z.string().describe('The conversational response in markdown format'),
  actions: z.array(ActionSchema).optional().describe('Optional actions to trigger in the UI'),
});

/**
 * Question Response
 * Multiple choice or single choice question
 */
export const QuestionOptionSchema = z.object({
  label: z.string().describe('Display label for the option'),
  value: z.string().describe('Value to send when option is selected'),
  description: z.string().optional().describe('Optional description/tooltip for the option'),
});

export const QuestionResponseSchema = z.object({
  type: z.literal('question'),
  text: z.string().describe('The question text'),
  options: z.array(QuestionOptionSchema).min(1).describe('Available options for the question'),
  multiple: z.boolean().optional().default(false).describe('Whether multiple selections are allowed'),
  required: z.boolean().optional().default(true).describe('Whether an answer is required'),
  actions: z.array(ActionSchema).optional().describe('Optional actions to trigger in the UI (e.g., Show Existing Config)'),
});

/**
 * Project Analysis Response
 * Structured project analysis (already defined)
 */
export const ProjectAnalysisResponseSchema = z.object({
  type: z.literal('project-analysis'),
  text: z.string().optional().describe('Optional introductory text'),
  data: ProjectAnalysisSchema.omit({ type: true }),
  actions: z.array(ActionSchema).optional().describe('Optional actions to trigger in the UI'),
});

/**
 * Config Brief Response
 * Legacy config brief format (for backward compatibility)
 */
export const ConfigBriefResponseSchema = z.object({
  type: z.literal('config-brief'),
  text: z.string().describe('The conversational response in markdown format'),
  data: z.object({
    targetRepo: z.string().optional(),
    entryFile: z.string().optional(),
    architecturalGoals: z.array(z.string()).optional(),
    constraints: z.array(z.string()).optional(),
    domainTaxonomy: z.array(z.string()).optional(),
    sharedModules: z.array(z.string()).optional(),
  }).passthrough(),
  actions: z.array(ActionSchema).optional().describe('Optional actions to trigger in the UI'),
});

/**
 * Discriminated Union of all response types
 */
export const AgentResponseSchema = z.discriminatedUnion('type', [
  ConfirmationResponseSchema,
  GeneralMessageResponseSchema,
  QuestionResponseSchema,
  ProjectAnalysisResponseSchema,
  ConfigBriefResponseSchema,
]);

/**
 * Structured Agent Response
 * Wrapper that includes the response type
 */
export const StructuredAgentResponseSchema = z.object({
  /**
   * The response type determines how the UI should render it
   */
  response: AgentResponseSchema,
});

export type StructuredAgentResponse = z.infer<typeof StructuredAgentResponseSchema>;
export type AgentResponse = z.infer<typeof AgentResponseSchema>;
export type ConfirmationResponse = z.infer<typeof ConfirmationResponseSchema>;
export type GeneralMessageResponse = z.infer<typeof GeneralMessageResponseSchema>;
export type QuestionResponse = z.infer<typeof QuestionResponseSchema>;
export type ProjectAnalysisResponse = z.infer<typeof ProjectAnalysisResponseSchema>;
export type ConfigBriefResponse = z.infer<typeof ConfigBriefResponseSchema>;
export type Action = z.infer<typeof ActionSchema>;
export type ActionType = z.infer<typeof ActionTypeSchema>;
export type QuestionOption = z.infer<typeof QuestionOptionSchema>;

