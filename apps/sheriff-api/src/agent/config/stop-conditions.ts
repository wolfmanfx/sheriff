/**
 * Stop conditions for agent
 */
import type { StopCondition } from 'ai';
import type { createToolRegistry } from '../tools/index';
import { extractToolCalls, extractToolResults } from '../utils/step-tools';

/**
 * Stop condition: Stop when uiState tool is called with a confirmation response
 * According to AI SDK v6 docs: stopWhen checks after tool results are available
 * We check if any step has a uiState tool call with confirmation type
 */
export function hasConfirmationResponse<T extends ReturnType<typeof createToolRegistry>>(): StopCondition<T> {
  return ({ steps }) => {
    // Check all steps for uiState tool calls with confirmation type
    for (const step of steps) {
      const toolCalls = extractToolCalls(step);
      const toolResults = extractToolResults(step);

      for (const toolCall of toolCalls) {
        if (toolCall.toolName === 'uiState') {
          const toolInput = toolCall.input as { response?: { type?: string } } | undefined;
          if (toolInput?.response?.type === 'confirmation' || toolInput?.response?.type === 'question') {
            return true;
          }
        }
      }

      for (const toolResult of toolResults) {
        if (toolResult.toolName === 'uiState') {
          const output = toolResult.output as { response?: { type?: string } } | undefined;
          if (output?.response?.type === 'confirmation' || output?.response?.type === 'question') {
            return true;
          }
        }
      }
    }
    return false;
  };
}

