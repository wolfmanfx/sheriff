/**
 * Telemetry utilities
 */
import type { AgentTelemetry } from '../types/router';

/**
 * Log agent interactions
 */
export function logTelemetry(telemetry: AgentTelemetry): void {
  const logEntry = {
    ...telemetry,
    timestamp: new Date(telemetry.timestamp).toISOString(),
  };
  console.log('[TELEMETRY]', JSON.stringify(logEntry));
}

/**
 * Generate a Langfuse trace ID for the agent
 */
export function getLangfuseTraceId(
  sessionId: string,
  agentRole: string,
): string | undefined {
  // Only generate trace ID if Langfuse is configured
  if (!process.env.LANGFUSE_SECRET_KEY || !process.env.LANGFUSE_PUBLIC_KEY) {
    return undefined;
  }

  // Try to get the current OpenTelemetry trace ID, otherwise use sessionId + role
  try {
    // Dynamic import to avoid issues if @opentelemetry/api is not available
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { trace } = require('@opentelemetry/api');
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      const spanContext = activeSpan.spanContext();
      if (spanContext.traceId) {
        return spanContext.traceId;
      }
    }
  } catch {
    // If OpenTelemetry is not available, fall back to generated ID
  }

  // Generate trace ID based on sessionId and agent role
  return `${sessionId}-${agentRole}`;
}



