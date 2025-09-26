/**
 * Router types and interfaces
 */
import type { StopCondition, UIMessage } from 'ai';
import type { createToolRegistry } from '../tools/index';
import type { AgentRole } from '../prompts/types';

/**
 * Request body types
 */
export interface SessionRequestMessagePart {
  type: string;
  text?: string;
  [key: string]: unknown;
}

export interface SessionRequestMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  parts?: SessionRequestMessagePart[];
  content?: string;
  metadata?: {
    agentRole?: AgentRole;
    [key: string]: unknown;
  };
}

export interface SessionRequest {
  messages?: SessionRequestMessage[];
  context?: { cwd?: string; entry?: string };
  sessionId?: string;
}

export interface ApproveConfigRequest {
  sessionId: string;
  proposalIndex?: number;
  cwd?: string;
}

/**
 * Agent configuration
 */
export interface AgentConfig<T extends ReturnType<typeof createToolRegistry> = ReturnType<typeof createToolRegistry>> {
  role: AgentRole;
  instructions: string;
  messages: UIMessage[];
  maxSteps: number;
  stopWhen?: StopCondition<T>[];
  prepareStep?: (params: {
    stepNumber: number;
    steps: unknown[];
    messages: unknown[];
    model: unknown;
  }) => Promise<{
    toolChoice?: { type: 'tool'; toolName: keyof T & string } | 'required' | 'auto' | 'none';
    system?: string;
  }> | {
    toolChoice?: { type: 'tool'; toolName: keyof T & string } | 'required' | 'auto' | 'none';
    system?: string;
  };
}

/**
 * Telemetry: Log agent interactions
 */
export interface AgentTelemetry {
  sessionId: string;
  timestamp: number;
  event: 'session_start' | 'tool_call' | 'tool_result' | 'session_end' | 'error';
  duration?: number;
  toolName?: string;
  error?: string;
}

