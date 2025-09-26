/**
 * MCP Tool Definitions
 * Centralized definitions for all available MCP tools
 * These definitions can be reused across different MCP server implementations
 */
import { z } from 'zod/v3';

const FileNodeSchema: z.ZodType<{ id: string; name: string; pathRel: string; pathAbs: string; type: 'file' }> = z.object({
  id: z.string(),
  name: z.string(),
  pathRel: z.string(),
  pathAbs: z.string(),
  type: z.literal('file'),
});

const DirNodeSchema: z.ZodType<{
  id: string;
  name: string;
  pathRel: string;
  pathAbs: string;
  type: 'dir';
  children: Array<unknown>;
  isSheriffModule: boolean;
  tags?: string[];
}> = z.lazy(() =>
  z.object({
    id: z.string(),
    name: z.string(),
    pathRel: z.string(),
    pathAbs: z.string(),
    type: z.literal('dir'),
    children: z.array(z.union([DirNodeSchema, FileNodeSchema])),
    isSheriffModule: z.boolean(),
    tags: z.array(z.string()).optional(),
  }),
);

const ProjectDataEntrySchema = z.object({
  module: z.string(),
  tags: z.array(z.string()).optional(),
  fileId: z.string().optional(),
}).passthrough(); // Allow additional properties from ProjectData

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodObject<z.ZodRawShape>;
  outputSchema: z.ZodObject<z.ZodRawShape>;
}

/**
 * List of all available MCP tools with their schemas
 */
export const MCP_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'fs_list',
    description:
      'List all directories (not files) in the workspace. Returns an object with: cwd (string), hasConfig (boolean indicating if sheriff.config.ts exists), and entries (array of { name, path, type: "dir" }). Use this as the first step to explore project structure and identify entry points.',
    inputSchema: z.object({
      cwd: z.string().describe('Working directory path'),
    }),
    outputSchema: z.object({
      cwd: z.string().describe('Working directory path'),
      hasConfig: z.boolean().describe('Whether sheriff.config.ts exists in the directory'),
      entries: z
        .array(
          z.object({
            name: z.string().describe('Directory name'),
            path: z.string().describe('Full path to directory'),
            type: z.literal('dir').describe('Entry type (always "dir")'),
          }),
        )
        .describe('Array of directory entries'),
    }),
  },
  {
    name: 'config_read',
    description: 'Read the current sheriff.config.ts file content and checksum',
    inputSchema: z.object({
      cwd: z.string().describe('Working directory path'),
    }),
    outputSchema: z.object({
      content: z.string().describe('Content of sheriff.config.ts file'),
      checksum: z.string().describe('MD5 checksum of the config file content'),
    }),
  },
  {
    name: 'config_previewWrite',
    description: 'Validate a proposed sheriff.config.ts without writing to disk',
    inputSchema: z.object({
      content: z.string().describe('Proposed config file content'),
      cwd: z.string().describe('Working directory path'),
    }),
    outputSchema: z.object({
      valid: z.boolean().describe('Whether the config is valid'),
      errors: z.array(z.string()).optional().describe('Array of error messages if validation failed'),
      checksum: z.string().optional().describe('MD5 checksum of the config content'),
      content: z.string().optional().describe('The config content that was validated'),
    }),
  },
  {
    name: 'config_applyPreview',
    description:
      'Temporarily apply a config and run analysis for realtime preview. The config is not persisted to disk.',
    inputSchema: z.object({
      content: z.string().describe('Config file content to apply temporarily'),
      entry: z.string().describe('Entry file path (relative to cwd)'),
      cwd: z.string().describe('Working directory path'),
    }),
    outputSchema: z.object({
      cwd: z.string().describe('Working directory path'),
      tree: DirNodeSchema.describe('Directory tree structure with module and tag annotations'),
      analysis: z.record(z.string(), ProjectDataEntrySchema).describe('File-level analysis data keyed by file path'),
      fileIdByPathRel: z.record(z.string(), z.string()).describe('Mapping of relative file paths to file IDs'),
      configValid: z.boolean().describe('Whether the config was valid and successfully applied'),
      errors: z.array(z.string()).optional().describe('Array of error messages if config was invalid'),
    }),
  },
  {
    name: 'sheriff_analyze',
    description: 'Analyze project structure and dependencies (directory-only, no files)',
    inputSchema: z.object({
      entry: z.string().describe('Entry file path (relative to cwd)'),
      cwd: z.string().describe('Working directory path'),
    }),
    outputSchema: z.object({
      cwd: z.string().describe('Working directory path'),
      tree: DirNodeSchema.describe('Directory tree structure with module and tag annotations'),
      analysis: z.record(z.string(), z.unknown()).describe('Empty analysis object (directory-only mode)'),
      fileIdByPathRel: z.record(z.string(), z.string()).describe('Mapping of relative file paths to file IDs'),
    }),
  },
  {
    name: 'sheriff_full_analyze',
    description: 'Analyze project structure and dependencies including all files with full analysis data',
    inputSchema: z.object({
      entry: z.string().describe('Entry file path (relative to cwd)'),
      cwd: z.string().describe('Working directory path'),
    }),
    outputSchema: z.object({
      cwd: z.string().describe('Working directory path'),
      tree: DirNodeSchema.describe('Complete directory tree structure including files, with module and tag annotations'),
      analysis: z.record(z.string(), ProjectDataEntrySchema).describe('Complete file-level analysis data keyed by file path'),
      fileIdByPathRel: z.record(z.string(), z.string()).describe('Mapping of relative file paths to file IDs'),
    }),
  },
  {
    name: 'sheriff_allowedMatrix',
    description:
      'Compute a boolean dependency matrix for selected modules showing which modules can depend on which. Returns a nested object indexed by module IDs: { allowedMatrixById: { [fromModuleId]: { [toModuleId]: boolean } } }. Use this for batch validation of dependency rules across multiple modules. For single-module queries, prefer sheriff_getModuleAccessList for clearer results.',
    inputSchema: z.object({
      entry: z.string().describe('Entry file path (relative to cwd)'),
      selectedModules: z.array(z.string()).describe('Array of module paths to analyze'),
      cwd: z.string().describe('Working directory path'),
    }),
    outputSchema: z.object({
      allowedMatrixById: z
        .record(z.string(), z.record(z.string(), z.boolean()))
        .describe('Nested object mapping [fromModuleId][toModuleId] -> boolean indicating if dependency is allowed'),
    }),
  },
  {
    name: 'sheriff_full_allowedMatrix',
    description: 'Compute the full file-to-file import matrix showing which files import which files. Returns complete import structure matrix.',
    inputSchema: z.object({
      entry: z.string().describe('Entry file path (relative to cwd)'),
      cwd: z.string().describe('Working directory path'),
    }),
    outputSchema: z.object({
      importMatrix: z
        .record(z.string(), z.record(z.string(), z.boolean()))
        .describe('Nested object mapping [fromFilePath][toFilePath] -> boolean indicating if import exists'),
    }),
  },
  {
    name: 'sheriff_summarizeTags',
    description:
      'Get the tags assigned to a specific module path. Returns an array of tag strings (e.g., ["domain:customer", "type:feature"]). Use this to verify module tagging matches expectations and understand which dependency rules apply to a module.',
    inputSchema: z.object({
      modulePath: z.string().describe('Module directory path'),
      entry: z.string().describe('Entry file path (relative to cwd)'),
      cwd: z.string().describe('Working directory path'),
    }),
    outputSchema: z.object({
      tags: z.array(z.string()).describe('Array of tag strings assigned to the module (e.g., ["domain:customer", "type:feature"])'),
      modulePath: z.string().describe('The module path that was queried'),
    }),
  },
  {
    name: 'sheriff_getModuleAccessList',
    description: 'Get the list of modules that a specific module can access based on Sheriff dependency rules. Returns an allow list of module paths.',
    inputSchema: z.object({
      modulePath: z.string().describe('Module path to query (relative to cwd)'),
      entry: z.string().describe('Entry file path (relative to cwd)'),
      cwd: z.string().describe('Working directory path'),
    }),
    outputSchema: z.object({
      modulePath: z.string().describe('The module path that was queried'),
      allowedModules: z.array(z.string()).describe('Array of module paths that the queried module is allowed to access'),
    }),
  },
  {
    name: 'config_validateDetailed',
    description: 'Validate config with detailed error messages including line numbers and error types',
    inputSchema: z.object({
      content: z.string().describe('Config file content to validate'),
      cwd: z.string().describe('Working directory path'),
    }),
    outputSchema: z.object({
      valid: z.boolean().describe('Whether the config is valid'),
      errors: z
        .array(
          z.object({
            type: z.enum(['syntax', 'structure', 'semantic', 'runtime']).describe('Type of validation error'),
            message: z.string().describe('Error message'),
            line: z.number().optional().describe('Line number where error occurred'),
            column: z.number().optional().describe('Column number where error occurred'),
            path: z.string().optional().describe('File path where error occurred'),
          }),
        )
        .describe('Array of detailed validation errors'),
      warnings: z.array(z.string()).optional().describe('Array of warning messages'),
    }),
  },
  {
    name: 'config_write',
    description:
      'Write sheriff.config.ts to disk. Validates the config first, then writes it. Use this after validating and testing the config.',
    inputSchema: z.object({
      content: z.string().describe('Config file content to write'),
      cwd: z.string().describe('Working directory path'),
    }),
    outputSchema: z.object({
      ok: z.boolean().describe('Whether the write operation succeeded'),
      checksum: z.string().describe('MD5 checksum of the written config file'),
      path: z.string().describe('Full path to the written config file'),
    }),
  },
  {
    name: 'sheriff_moduleStructure',
    description: 'Get module structure with tags for mermaid chart generation. Only includes modules with tags.',
    inputSchema: z.object({
      entry: z.string().describe('Entry file path (relative to cwd)'),
      cwd: z.string().describe('Working directory path'),
    }),
    outputSchema: z.object({
      modules: z
        .array(
          z.object({
            path: z.string().describe('Module path'),
            tags: z.array(z.string()).describe('Array of tags assigned to the module'),
          }),
        )
        .describe('Array of modules with their tags (only includes modules that have tags)'),
      mermaid: z.string().describe('Mermaid diagram syntax representing the module structure'),
    }),
  },
  {
    name: 'sheriff_getAllFilesAsTreeText',
    description: 'Get all files in the project as a tree-structured text format. Returns a text representation showing directories and files hierarchically.',
    inputSchema: z.object({
      cwd: z.string().describe('Working directory path'),
      rootPath: z.string().optional().describe('Optional root path to build tree from (defaults to cwd)'),
    }),
    outputSchema: z.object({
      treeText: z.string().describe('Text representation of the directory tree structure showing directories and files hierarchically'),
    }),
  },
  {
    name: 'generate_sheriff_config',
    description:
      'Get the complete workflow prompt template for generating Sheriff configuration files. Returns a detailed prompt string with step-by-step instructions, project context (cwd and entry file), and guidance on using MCP tools. Use this first to understand the config generation workflow before analyzing the project.',
    inputSchema: z.object({
      cwd: z.string().describe('Working directory path'),
      entry: z.string().describe('Entry file path relative to cwd (e.g., src/main.ts or src/index.ts)'),
    }),
    outputSchema: z.object({
      prompt: z.string().describe('Complete workflow prompt template with step-by-step instructions and project context'),
    }),
  },
];

