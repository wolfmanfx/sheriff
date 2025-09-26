/**
 * Sheriff Tool Client for Agent Tools
 * Calls tool handler directly in memory (no HTTP requests)
 * Type-safe client that derives types from tool definitions
 */
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ZodSchema } from 'zod/v3';
import type {
  ListInput,
  ListResult,
  ConfigReadInput,
  ConfigReadResult,
  ConfigPreviewWriteInput,
  ConfigPreviewWriteResult,
  ConfigApplyPreviewInput,
  ConfigApplyPreviewResult,
  ConfigValidateDetailedInput,
  ConfigValidateDetailedResult,
  ConfigWriteInput,
  ConfigWriteResult,
  AnalyzeInput,
  AnalyzeResult,
  AllowedMatrixInput,
  AllowedMatrixResult,
  FullImportMatrixInput,
  FullImportMatrixResult,
  ModuleAccessListInput,
  ModuleAccessListResult,
  SummarizeTagsInput,
  SummarizeTagsResult,
  ModuleStructureInput,
  ModuleStructureResult,
  GetAllFilesAsTreeTextInput,
  GetAllFilesAsTreeTextResult,
} from '../core/types';
import { MCP_TOOL_DEFINITIONS } from '../core/tool-definitions';
import { createCallToolHandler } from '../core/tool-handler';

function zodSchemaToJsonSchema(schema: ZodSchema<unknown>) {
  return zodToJsonSchema(schema);
}

/**
 * Type-safe mapping of tool names to their input/output types
 * This mapping ensures type safety between the client and the tool handler.
 * The tool names must match those defined in MCP_TOOL_DEFINITIONS.
 */
type ToolCallMap = {
  'fs_list': { input: ListInput; output: ListResult };
  'config_read': { input: ConfigReadInput; output: ConfigReadResult };
  'config_previewWrite': { input: ConfigPreviewWriteInput; output: ConfigPreviewWriteResult };
  'config_applyPreview': { input: ConfigApplyPreviewInput; output: ConfigApplyPreviewResult };
  'config_validateDetailed': { input: ConfigValidateDetailedInput; output: ConfigValidateDetailedResult };
  'config_write': { input: ConfigWriteInput; output: ConfigWriteResult };
  'sheriff_analyze': { input: AnalyzeInput; output: AnalyzeResult };
  'sheriff_full_analyze': { input: AnalyzeInput; output: AnalyzeResult };
  'sheriff_allowedMatrix': { input: AllowedMatrixInput; output: AllowedMatrixResult };
  'sheriff_full_allowedMatrix': { input: FullImportMatrixInput; output: FullImportMatrixResult };
  'sheriff_summarizeTags': { input: SummarizeTagsInput; output: SummarizeTagsResult };
  'sheriff_getModuleAccessList': { input: ModuleAccessListInput; output: ModuleAccessListResult };
  'sheriff_moduleStructure': { input: ModuleStructureInput; output: ModuleStructureResult };
  'sheriff_getAllFilesAsTreeText': { input: GetAllFilesAsTreeTextInput; output: GetAllFilesAsTreeTextResult };
};

type ToolName = keyof ToolCallMap;

/**
 * Runtime validation helper to ensure tool name exists in definitions
 */
function isValidToolName(name: string): name is ToolName {
  return MCP_TOOL_DEFINITIONS.some((tool) => tool.name === name);
}

/**
 * Sheriff Tool Client that calls tool handler directly in memory
 * No HTTP requests - direct in-process calls for better performance
 */
export class SheriffToolClient {
  private readonly toolHandler: (request: { params: { name: ToolName; arguments?: Record<string, unknown> } }) => Promise<{
    content: Array<{ type: 'text'; text: string }>;
    isError?: boolean;
  }>;

  constructor() {
    // Create tool handler instance for in-memory calls
    this.toolHandler = createCallToolHandler();
  }

  /**
   * List all available tools
   * Returns the same tool definitions used by the handler
   */
  async listTools(): Promise<Array<{ name: string; description: string; inputSchema: unknown; outputSchema: unknown }>> {
    return MCP_TOOL_DEFINITIONS.map((tool) => {
      const inputSchemaZod: ZodSchema<unknown> = tool.inputSchema;
      const inputJsonSchema = zodSchemaToJsonSchema(inputSchemaZod);
      const inputSchema = { ...inputJsonSchema };
      delete inputSchema.$schema;

      const outputSchemaZod: ZodSchema<unknown> = tool.outputSchema;
      const outputJsonSchema = zodSchemaToJsonSchema(outputSchemaZod);
      const outputSchema = { ...outputJsonSchema };
      delete outputSchema.$schema;

      return {
        name: tool.name,
        description: tool.description,
        inputSchema,
        outputSchema,
      };
    });
  }

  /**
   * Call a tool by name (in-memory)
   * Type-safe method that ensures tool name and input/output types match tool definitions
   * @param toolName - Tool name from MCP_TOOL_DEFINITIONS
   * @param input - Input matching the tool's input schema
   * @returns Output matching the tool's output type
   */
  async call<T extends ToolName>(
    toolName: T,
    input: ToolCallMap[T]['input'],
  ): Promise<ToolCallMap[T]['output']> {
    if (!isValidToolName(toolName)) {
      throw new Error(`Invalid tool name: ${toolName}. Available tools: ${MCP_TOOL_DEFINITIONS.map((t) => t.name).join(', ')}`);
    }

    const response = await this.toolHandler({
      params: {
        name: toolName,
        arguments: input as unknown as Record<string, unknown>,
      },
    });

    // Handle error response
    if (response.isError) {
      const errorContent = response.content?.[0];
      if (errorContent && errorContent.type === 'text') {
        const errorData = JSON.parse(errorContent.text);
        throw new Error(errorData.error || 'Unknown error');
      }
      throw new Error('Tool call failed');
    }

    // Extract result from response format
    const content = response.content?.[0];
    if (content && content.type === 'text') {
      return JSON.parse(content.text) as ToolCallMap[T]['output'];
    }

    throw new Error('Invalid response format from tool handler');
  }
}

/**
 * Create a Sheriff tool client instance
 * Returns a client that calls tool handlers directly in memory
 */
export function createSheriffToolClient(): SheriffToolClient {
  return new SheriffToolClient();
}

