import type { UIMessage } from 'ai';

/**
 * Message annotation types for tool usage tracking
 * These match the backend annotation types
 */

export interface ToolUsageAnnotation {
  type: 'TOOL_USAGE';
  toolName: string;
  status: 'call' | 'result';
  timestamp: number;
}

export type MessageAnnotation = ToolUsageAnnotation;

/**
 * Extracts annotations from message metadata
 */
export function getMessageAnnotations(message: UIMessage): MessageAnnotation[] {
  const metadata = message.metadata;
  if (metadata && typeof metadata === 'object') {
    const annotations = (metadata as Record<string, unknown>)['annotations'];
    if (Array.isArray(annotations)) {
      return annotations.filter((a): a is MessageAnnotation => {
        if (!a || typeof a !== 'object') return false;
        const obj = a as Record<string, unknown>;
        const type = obj['type'];
        return type === 'TOOL_USAGE';
      });
    }
  }
  return [];
}

/**
 * Extracts agent role from message metadata
 */
export function getAgentRoleFromMessage(message: UIMessage): string | null {
  const metadata = message.metadata;
  if (metadata && typeof metadata === 'object') {
    const role = (metadata as Record<string, unknown>)['agentRole'];
    if (typeof role === 'string') {
      return role;
    }
  }
  return null;
}

