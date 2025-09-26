/**
 * Utilities for extracting tool invocations/results from Agent steps.
 *
 * The Vercel AI SDK has evolved the structure of step data between releases.
 * Depending on the runtime, tool information can appear under `toolCalls`,
 * `toolResults`, or the newer `toolInvocations` shape. These helpers normalise
 * the structure so the rest of the agent logic can reason about tool usage
 * without caring about the exact SDK version.
 */

export interface StepToolCall {
  toolName: string;
  input?: unknown;
}

export interface StepToolResult {
  toolName: string;
  output?: unknown;
}

interface ToolCallLike {
  toolName?: string;
  name?: string;
  input?: unknown;
  args?: unknown;
  call?: {
    toolName?: string;
    name?: string;
    input?: unknown;
    args?: unknown;
  };
}

interface ToolResultLike {
  toolName?: string;
  name?: string;
  output?: unknown;
  result?: unknown;
}

interface ToolInvocationLike extends ToolCallLike {
  result?: ToolResultLike | unknown;
  output?: unknown;
}

interface StepLike {
  toolCalls?: ToolCallLike[];
  toolResults?: ToolResultLike[];
  toolInvocations?: ToolInvocationLike[];
}

function normaliseToolName(call: ToolCallLike | ToolResultLike | ToolInvocationLike | undefined): string | undefined {
  if (!call) {
    return undefined;
  }

  if (call.toolName) {
    return call.toolName;
  }

  if (call.name) {
    return call.name;
  }

  if ('call' in call && call.call) {
    return call.call.toolName ?? call.call.name ?? undefined;
  }

  return undefined;
}

function normaliseToolInput(call: ToolCallLike | ToolInvocationLike | undefined): unknown {
  if (!call) {
    return undefined;
  }

  if (call.input !== undefined) {
    return call.input;
  }

  if (call.args !== undefined) {
    return call.args;
  }

  if ('call' in call && call.call) {
    return call.call.input ?? call.call.args;
  }

  return undefined;
}

function normaliseToolOutput(result: ToolResultLike | ToolInvocationLike | undefined): unknown {
  if (!result) {
    return undefined;
  }

  const directOutput = (result as ToolResultLike).output ?? (result as ToolInvocationLike).output;
  if (directOutput !== undefined) {
    return directOutput;
  }

  const nestedResult = (result as ToolInvocationLike).result;
  if (!nestedResult) {
    return undefined;
  }

  if (typeof nestedResult === 'object' && nestedResult !== null) {
    const nested = nestedResult as ToolResultLike;
    return nested.output ?? nested.result ?? nested;
  }

  return nestedResult;
}

export function extractToolCalls(step: unknown): StepToolCall[] {
  const calls: StepToolCall[] = [];
  if (!step) {
    return calls;
  }

  const maybeStep = step as StepLike;

  if (Array.isArray(maybeStep.toolCalls)) {
    for (const raw of maybeStep.toolCalls) {
      const toolName = normaliseToolName(raw);
      if (toolName) {
        calls.push({
          toolName,
          input: normaliseToolInput(raw),
        });
      }
    }
  }

  if (Array.isArray(maybeStep.toolInvocations)) {
    for (const raw of maybeStep.toolInvocations) {
      const toolName = normaliseToolName(raw);
      if (toolName) {
        calls.push({
          toolName,
          input: normaliseToolInput(raw),
        });
      }
    }
  }

  return calls;
}

export function extractToolResults(step: unknown): StepToolResult[] {
  const results: StepToolResult[] = [];
  if (!step) {
    return results;
  }

  const maybeStep = step as StepLike;

  if (Array.isArray(maybeStep.toolResults)) {
    for (const raw of maybeStep.toolResults) {
      const toolName = normaliseToolName(raw);
      if (toolName) {
        results.push({
          toolName,
          output: normaliseToolOutput(raw),
        });
      }
    }
  }

  if (Array.isArray(maybeStep.toolInvocations)) {
    for (const raw of maybeStep.toolInvocations) {
      const toolName = normaliseToolName(raw);
      if (!toolName) {
        continue;
      }

      const output = normaliseToolOutput(raw);
      if (output !== undefined) {
        results.push({
          toolName,
          output,
        });
      }
    }
  }

  return results;
}


