/**
 * MCP Tool Handler
 * Type-safe handler for executing MCP tools
 */
import { z } from 'zod/v3';
import { MCP_TOOL_DEFINITIONS, type ToolDefinition } from './tool-definitions';
import {
  analyzeDirectoryOnly,
  analyzeFull,
  computeAllowedMatrixById,
  computeFullImportMatrix,
  getModuleAllowedModules,
  summarizeTagsForModule,
  getModuleStructureWithMermaid,
  getAllFilesAsTreeText,
  resolveCwd,
  listDirectories,
  readConfigFile,
  previewWriteConfig,
  applyConfigPreview,
  validateConfigDetailed,
  writeConfigFile,
} from './index';
import { buildPromptWithArguments } from '../mcp/prompt-definitions';
import type {
  ListInput,
  ConfigReadInput,
  ConfigPreviewWriteInput,
  ConfigApplyPreviewInput,
  AnalyzeInput,
  AllowedMatrixInput,
  FullImportMatrixInput,
  ModuleAccessListInput,
  SummarizeTagsInput,
  ConfigValidateDetailedInput,
  ConfigWriteInput,
  ModuleStructureInput,
  GetAllFilesAsTreeTextInput,
  GenerateSheriffConfigInput,
  ToolCallResponse,
} from './types';

type ToolName = ToolDefinition['name'];

// Helper to get schema by name
function getToolSchema(name: ToolName): z.ZodObject<z.ZodRawShape> {
  const tool = MCP_TOOL_DEFINITIONS.find((t) => t.name === name);
  if (!tool) {
    throw new Error(`Tool ${name} not found`);
  }
  return tool.inputSchema;
}

/**
 * Create a type-safe tool handler map
 */
export function createToolHandlerMap() {
  const fsListSchema = getToolSchema('fs_list');
  const configReadSchema = getToolSchema('config_read');
  const configPreviewWriteSchema = getToolSchema('config_previewWrite');
  const configApplyPreviewSchema = getToolSchema('config_applyPreview');
  const sheriffAnalyzeSchema = getToolSchema('sheriff_analyze');
  const sheriffFullAnalyzeSchema = getToolSchema('sheriff_full_analyze');
  const sheriffAllowedMatrixSchema = getToolSchema('sheriff_allowedMatrix');
  const sheriffFullAllowedMatrixSchema = getToolSchema('sheriff_full_allowedMatrix');
  const sheriffSummarizeTagsSchema = getToolSchema('sheriff_summarizeTags');
  const sheriffGetModuleAccessListSchema = getToolSchema('sheriff_getModuleAccessList');
  const configValidateDetailedSchema = getToolSchema('config_validateDetailed');
  const configWriteSchema = getToolSchema('config_write');
  const sheriffModuleStructureSchema = getToolSchema('sheriff_moduleStructure');
  const sheriffGetAllFilesAsTreeTextSchema = getToolSchema('sheriff_getAllFilesAsTreeText');
  const generateSheriffConfigSchema = getToolSchema('generate_sheriff_config');

  return {
    'fs_list': {
      schema: fsListSchema,
      handler: async (input: ListInput) => listDirectories(input.cwd),
    },
    'config_read': {
      schema: configReadSchema,
      handler: async (input: ConfigReadInput) => readConfigFile(input.cwd),
    },
    'config_previewWrite': {
      schema: configPreviewWriteSchema,
      handler: async (input: ConfigPreviewWriteInput) => previewWriteConfig(input.content, input.cwd),
    },
    'config_applyPreview': {
      schema: configApplyPreviewSchema,
      handler: async (input: ConfigApplyPreviewInput) => applyConfigPreview(input.content, input.entry, input.cwd),
    },
    'sheriff_analyze': {
      schema: sheriffAnalyzeSchema,
      handler: async (input: AnalyzeInput) => {
        const cwd = resolveCwd(input.cwd);
        return analyzeDirectoryOnly(input.entry, cwd);
      },
    },
    'sheriff_full_analyze': {
      schema: sheriffFullAnalyzeSchema,
      handler: async (input: AnalyzeInput) => {
        const cwd = resolveCwd(input.cwd);
        return analyzeFull(input.entry, cwd);
      },
    },
    'sheriff_allowedMatrix': {
      schema: sheriffAllowedMatrixSchema,
      handler: async (input: AllowedMatrixInput) => {
        const cwd = resolveCwd(input.cwd);
        return computeAllowedMatrixById(cwd, input.entry, input.selectedModules);
      },
    },
    'sheriff_full_allowedMatrix': {
      schema: sheriffFullAllowedMatrixSchema,
      handler: async (input: FullImportMatrixInput) => {
        const cwd = resolveCwd(input.cwd);
        return computeFullImportMatrix(cwd, input.entry);
      },
    },
    'sheriff_summarizeTags': {
      schema: sheriffSummarizeTagsSchema,
      handler: async (input: SummarizeTagsInput) => {
        if (!input.entry) {
          throw new Error('Entry file is required for tag calculation');
        }
        const cwd = resolveCwd(input.cwd);
        return summarizeTagsForModule(input.modulePath, input.entry, cwd);
      },
    },
    'sheriff_getModuleAccessList': {
      schema: sheriffGetModuleAccessListSchema,
      handler: async (input: ModuleAccessListInput) => {
        const cwd = resolveCwd(input.cwd);
        return getModuleAllowedModules(input.modulePath, input.entry, cwd);
      },
    },
    'config_validateDetailed': {
      schema: configValidateDetailedSchema,
      handler: async (input: ConfigValidateDetailedInput) => validateConfigDetailed(input.content, input.cwd),
    },
    'config_write': {
      schema: configWriteSchema,
      handler: async (input: ConfigWriteInput) => writeConfigFile(input.content, input.cwd),
    },
    'sheriff_moduleStructure': {
      schema: sheriffModuleStructureSchema,
      handler: async (input: ModuleStructureInput) => {
        const cwd = resolveCwd(input.cwd);
        return getModuleStructureWithMermaid(input.entry, cwd);
      },
    },
    'sheriff_getAllFilesAsTreeText': {
      schema: sheriffGetAllFilesAsTreeTextSchema,
      handler: async (input: GetAllFilesAsTreeTextInput) => {
        const cwd = resolveCwd(input.cwd);
        const treeText = getAllFilesAsTreeText(cwd, input.rootPath);
        return { treeText };
      },
    },
    'generate_sheriff_config': {
      schema: generateSheriffConfigSchema,
      handler: async (input: GenerateSheriffConfigInput) => {
        const prompt = buildPromptWithArguments('generate_sheriff_config', {
          cwd: input.cwd,
          entry: input.entry,
        });
        return { prompt };
      },
    },
  };
}

/**
 * Type-safe tool call handler
 */
export function createCallToolHandler(): (request: { params: { name: ToolName; arguments?: Record<string, unknown> } }) => Promise<ToolCallResponse> {
  const toolHandlers = createToolHandlerMap();

  return async (request: { params: { name: ToolName; arguments?: Record<string, unknown> } }): Promise<ToolCallResponse> => {
    const { name, arguments: args } = request.params;
    const argsObj = args ?? {};

    try {
      let result: unknown;

      switch (name) {
        case 'fs_list': {
          const parsedInput = toolHandlers['fs_list'].schema.parse(argsObj);
          result = await toolHandlers['fs_list'].handler(parsedInput as unknown as ListInput);
          break;
        }
        case 'config_read': {
          const parsedInput = toolHandlers['config_read'].schema.parse(argsObj);
          result = await toolHandlers['config_read'].handler(parsedInput as unknown as ConfigReadInput);
          break;
        }
        case 'config_previewWrite': {
          const parsedInput = toolHandlers['config_previewWrite'].schema.parse(argsObj);
          result = await toolHandlers['config_previewWrite'].handler(parsedInput as unknown as ConfigPreviewWriteInput);
          break;
        }
        case 'config_applyPreview': {
          const parsedInput = toolHandlers['config_applyPreview'].schema.parse(argsObj);
          result = await toolHandlers['config_applyPreview'].handler(parsedInput as unknown as ConfigApplyPreviewInput);
          break;
        }
        case 'sheriff_analyze': {
          const parsedInput = toolHandlers['sheriff_analyze'].schema.parse(argsObj);
          result = await toolHandlers['sheriff_analyze'].handler(parsedInput as unknown as AnalyzeInput);
          break;
        }
        case 'sheriff_full_analyze': {
          const parsedInput = toolHandlers['sheriff_full_analyze'].schema.parse(argsObj);
          result = await toolHandlers['sheriff_full_analyze'].handler(parsedInput as unknown as AnalyzeInput);
          break;
        }
        case 'sheriff_allowedMatrix': {
          const parsedInput = toolHandlers['sheriff_allowedMatrix'].schema.parse(argsObj);
          result = await toolHandlers['sheriff_allowedMatrix'].handler(parsedInput as unknown as AllowedMatrixInput);
          break;
        }
        case 'sheriff_full_allowedMatrix': {
          const parsedInput = toolHandlers['sheriff_full_allowedMatrix'].schema.parse(argsObj);
          result = await toolHandlers['sheriff_full_allowedMatrix'].handler(parsedInput as unknown as FullImportMatrixInput);
          break;
        }
        case 'sheriff_summarizeTags': {
          const parsedInput = toolHandlers['sheriff_summarizeTags'].schema.parse(argsObj);
          result = await toolHandlers['sheriff_summarizeTags'].handler(parsedInput as unknown as SummarizeTagsInput);
          break;
        }
        case 'sheriff_getModuleAccessList': {
          const parsedInput = toolHandlers['sheriff_getModuleAccessList'].schema.parse(argsObj);
          result = await toolHandlers['sheriff_getModuleAccessList'].handler(parsedInput as unknown as ModuleAccessListInput);
          break;
        }
        case 'config_validateDetailed': {
          const parsedInput = toolHandlers['config_validateDetailed'].schema.parse(argsObj);
          result = await toolHandlers['config_validateDetailed'].handler(parsedInput as unknown as ConfigValidateDetailedInput);
          break;
        }
        case 'config_write': {
          const parsedInput = toolHandlers['config_write'].schema.parse(argsObj);
          result = await toolHandlers['config_write'].handler(parsedInput as unknown as ConfigWriteInput);
          break;
        }
        case 'sheriff_moduleStructure': {
          const parsedInput = toolHandlers['sheriff_moduleStructure'].schema.parse(argsObj);
          result = await toolHandlers['sheriff_moduleStructure'].handler(parsedInput as unknown as ModuleStructureInput);
          break;
        }
        case 'sheriff_getAllFilesAsTreeText': {
          const parsedInput = toolHandlers['sheriff_getAllFilesAsTreeText'].schema.parse(argsObj);
          result = await toolHandlers['sheriff_getAllFilesAsTreeText'].handler(parsedInput as unknown as GetAllFilesAsTreeTextInput);
          break;
        }
        case 'generate_sheriff_config': {
          const parsedInput = toolHandlers['generate_sheriff_config'].schema.parse(argsObj);
          result = await toolHandlers['generate_sheriff_config'].handler(parsedInput as unknown as GenerateSheriffConfigInput);
          break;
        }
        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
            }),
          },
        ],
        isError: true,
      };
    }
  };
}

