import { z } from 'zod';
import type { UIMessage } from 'ai';

const actionSchema = z.object({
  type: z.string(),
  label: z.string().optional(),
  params: z.record(z.string(), z.unknown()).optional(),
});

type Action = z.infer<typeof actionSchema>;

const confirmationSchema = z
  .object({
    type: z.literal('confirmation'),
    text: z.string(),
    confirmLabel: z.string().optional(),
    cancelLabel: z.string().optional(),
    allowCustomInput: z.boolean().optional(),
    customInputLabel: z.string().optional(),
    customInputPlaceholder: z.string().optional(),
    customInputType: z.enum(['text', 'path']).optional(),
    onConfirm: z.string().optional(),
    onCancel: z.string().optional(),
    onCustomSubmit: z.string().optional(),
    actions: z.array(actionSchema).optional(),
  })
  .passthrough();

const questionSchema = z
  .object({
    type: z.literal('question'),
    text: z.string(),
    options: z.array(
      z.object({
        label: z.string(),
        value: z.string(),
        description: z.string().optional(),
      }),
    ),
    multiple: z.boolean().optional(),
    required: z.boolean().optional(),
    actions: z.array(actionSchema).optional(),
  })
  .passthrough();

const projectAnalysisSchema = z
  .object({
    type: z.literal('project-analysis'),
    data: z.record(z.string(), z.unknown()).optional(),
    actions: z.array(actionSchema).optional(),
  })
  .passthrough();

const configBriefSchema = z
  .object({
    type: z.literal('config-brief'),
    data: z
      .object({
        entryFile: z.string().optional(),
        architecturalGoals: z.array(z.string()).optional(),
        constraints: z.array(z.string()).optional(),
      })
      .passthrough()
      .optional(),
    text: z.string().optional(),
    actions: z.array(actionSchema).optional(),
  })
  .passthrough();

const messageSchema = z
  .object({
    type: z.literal('message'),
    text: z.string(),
    actions: z.array(actionSchema).optional(),
  })
  .passthrough();

export type ConfirmationPayload = z.infer<typeof confirmationSchema>;
export type QuestionPayload = z.infer<typeof questionSchema>;
export type ProjectAnalysisPayload = Record<string, unknown> | null;
export type ConfigBriefPayload = z.infer<typeof configBriefSchema>;
export type MessagePayload = z.infer<typeof messageSchema>;

export type ConfigBriefViewModel = {
  entryFile?: string;
  architecturalGoals: string[];
  constraints: string[];
  text?: string;
  raw: string;
};

export type StructuredUiStateResponse =
  | { kind: 'confirmation'; confirmation: ConfirmationPayload; actions: Action[] }
  | { kind: 'question'; question: QuestionPayload; actions: Action[] }
  | { kind: 'project-analysis'; analysis: ProjectAnalysisPayload; actions: Action[] }
  | { kind: 'config-brief'; brief: ConfigBriefViewModel; actions: Action[] }
  | { kind: 'message'; markdown: string; actions: Action[] }
  | { kind: 'fallback'; markdown: string; actions: Action[] };

/**
 * Checks if a UI part should be skipped during rendering
 */
export function isSkippableUiPart(part: unknown): boolean {
  if (!part || typeof part !== 'object') {
    return false;
  }
  const type = (part as { type?: unknown }).type;
  if (typeof type !== 'string') {
    return false;
  }
  const t = type.toLowerCase();
  // Skip stream lifecycle/meta events
  const skip = new Set([
    'start',
    'finish',
    'step-start',
    'step-finish',
    'start-step',
    'finish-step',
    'message-start',
    'message-delta',
    'message-finish',
    'response-metadata',
    'request-metadata',
    'warning',
  ]);
  return skip.has(t);
}

/**
 * Checks if a part is a tool part
 */
export function isToolPart(part: unknown): boolean {
  return getToolName(part) !== null;
}

/**
 * Gets the tool name from a message part
 * Relies on SDK's toolName property when available, otherwise extracts from type
 */
export function getToolName(part: unknown): string | null {
  if (!part || typeof part !== 'object') {
    return null;
  }

  const partRecord = part as Record<string, unknown>;

  // SDK should provide toolName property - use it directly
  const toolName = partRecord['toolName'];
  if (typeof toolName === 'string' && toolName.length > 0) {
    return toolName;
  }

  // Fallback: some SDK versions may encode tool name in type as 'tool-{name}'
  const type = typeof partRecord['type'] === 'string' ? (partRecord['type'] as string) : undefined;
  if (type?.startsWith('tool-')) {
    return type.replace('tool-', '');
  }

  return null;
}

/**
 * Gets the tool call ID from a message part
 */
export function getToolCallId(part: unknown): string | null {
  if (!part || typeof part !== 'object') {
    return null;
  }
  const partRecord = part as Record<string, unknown>;
  const toolCallId = partRecord['toolCallId'];
  return typeof toolCallId === 'string' ? toolCallId : null;
}

/**
 * Gets the tool state from a message part
 */
export function getToolState(part: unknown): string | null {
  if (!part || typeof part !== 'object') {
    return null;
  }
  const partRecord = part as Record<string, unknown>;
  const state = partRecord['state'];
  return typeof state === 'string' ? state : null;
}

/**
 * Gets the tool input from a message part
 */
export function getToolInput(part: unknown): unknown {
  if (!part || typeof part !== 'object') {
    return undefined;
  }
  const partRecord = part as Record<string, unknown>;
  return partRecord['input'];
}

/**
 * Gets the tool output/result from a message part
 */
export function getToolOutput(part: unknown): unknown {
  if (!part || typeof part !== 'object') {
    return undefined;
  }
  const partRecord = part as Record<string, unknown>;
  return partRecord['result'] ?? partRecord['output'];
}

/**
 * Gets the tool error text from a message part
 */
export function getToolErrorText(part: unknown): string | null {
  if (!part || typeof part !== 'object') {
    return null;
  }
  const partRecord = part as Record<string, unknown>;
  const errorText = partRecord['errorText'];
  return typeof errorText === 'string' ? errorText : null;
}

/**
 * Parses a UI state response from a tool part.
 * Uses schema-based parsing with a map for cleaner code.
 */
export function parseUiStateResponse(part: unknown): StructuredUiStateResponse | null {
  const toolName = getToolName(part);
  if (toolName !== 'uiState') {
    return null;
  }

  const payload = extractUiStatePayload(part);
  if (payload === undefined || payload === null) {
    return null;
  }

  // Try each schema in order (most specific first)
  const confirmation = confirmationSchema.safeParse(payload);
  if (confirmation.success) {
    return {
      kind: 'confirmation',
      confirmation: confirmation.data,
      actions: confirmation.data.actions ?? [],
    };
  }

  const question = questionSchema.safeParse(payload);
  if (question.success) {
    return {
      kind: 'question',
      question: question.data,
      actions: question.data.actions ?? [],
    };
  }

  const projectAnalysis = projectAnalysisSchema.safeParse(payload);
  if (projectAnalysis.success) {
    return {
      kind: 'project-analysis',
      analysis: (projectAnalysis.data.data as Record<string, unknown> | undefined) ?? null,
      actions: projectAnalysis.data.actions ?? [],
    };
  }

  const configBrief = configBriefSchema.safeParse(payload);
  if (configBrief.success) {
    const data = configBrief.data.data ?? {};
    return {
      kind: 'config-brief',
      brief: {
        entryFile: (data as { entryFile?: string }).entryFile,
        architecturalGoals: Array.isArray((data as { architecturalGoals?: string[] }).architecturalGoals)
          ? ((data as { architecturalGoals?: string[] }).architecturalGoals as string[])
          : [],
        constraints: Array.isArray((data as { constraints?: string[] }).constraints)
          ? ((data as { constraints?: string[] }).constraints as string[])
          : [],
        text: configBrief.data.text,
        raw: JSON.stringify(payload, null, 2),
      },
      actions: configBrief.data.actions ?? [],
    };
  }

  const message = messageSchema.safeParse(payload);
  if (message.success) {
    return {
      kind: 'message',
      markdown: message.data.text,
      actions: message.data.actions ?? [],
    };
  }

  // Fallback for unknown payloads
  return {
    kind: 'fallback',
    markdown: JSON.stringify(payload, null, 2),
    actions: [],
  };
}

function extractUiStatePayload(part: unknown): unknown {
  const output = getToolOutput(part);
  const input = getToolInput(part);
  const candidate = output ?? input ?? part;
  if (candidate && typeof candidate === 'object' && 'response' in (candidate as Record<string, unknown>)) {
    return (candidate as Record<string, unknown>)['response'];
  }
  return candidate;
}

/**
 * Gets the config draft payload from a tool part
 */
export function getConfigDraftPayload(part: unknown): unknown {
  const toolName = getToolName(part);
  if (toolName !== 'writeConfigDraft') {
    return null;
  }
  return getToolOutput(part) ?? null;
}

/**
 * Gets tool information (name, input, output) from a message part
 */
export function getToolInfo(part: unknown): { toolName: string; input: unknown; output: unknown } | null {
  const toolName = getToolName(part);
  if (!toolName || toolName === 'uiState') {
    return null;
  }
  return {
    toolName,
    input: getToolInput(part),
    output: getToolOutput(part),
  };
}

/**
 * Gets text content from a message part
 */
export function getTextFromPart(part: unknown): string | null {
  if (!part || typeof part !== 'object') {
    return null;
  }
  const record = part as Record<string, unknown>;
  if (record['type'] === 'text' && typeof record['text'] === 'string') {
    return record['text'] as string;
  }
  return null;
}

/**
 * Checks if a message has structured parts
 */
export function hasStructuredParts(message: UIMessage): boolean {
  try {
    for (const part of message.parts) {
      if (parseUiStateResponse(part)) {
        return true;
      }
    }
  } catch {
    // ignore parsing errors
  }
  return false;
}

/**
 * Gets user message content by extracting text from all parts
 */
export function getUserMessageContent(message: UIMessage): string {
  return message.parts
    .map((part) => getTextFromPart(part))
    .filter((text): text is string => typeof text === 'string' && text.length > 0)
    .join('\n');
}

