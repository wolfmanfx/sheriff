/**
 * Tool Types
 * Types for MCP tool definitions and responses
 */
export type ToolCallResponse = {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
};

