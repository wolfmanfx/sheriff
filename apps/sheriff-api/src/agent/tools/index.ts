/**
 * Tool Registry for AI Agents
 * AI SDK tools that call MCP handlers
 */
import { tool } from 'ai';
import { z } from 'zod/v3';
import { createSheriffToolClient } from '../sheriff-tool-client';
import { AgentResponseSchema } from '../schemas/response-types';
import type {
  AgentResponse,
  QuestionResponse,
  ProjectAnalysisResponse,
  Action,
} from '../schemas/response-types';

export function createToolRegistry() {
  const toolClient = createSheriffToolClient();

  const validateConfigDetailedTool = tool({
    description:
      'Validate config with detailed error messages including line numbers, column numbers, and error types (syntax, structure, semantic, runtime).',
    inputSchema: z.object({
      content: z.string().describe('Config file content to validate'),
      cwd: z.string().describe('Working directory path'),
    }),
    execute: async (input: { content: string; cwd: string }) => {
      return await toolClient.call('config_validateDetailed', {
        content: input.content,
        cwd: input.cwd,
      });
    },
  });

  return {
    uiState: tool({
      description:
        'Update UI state for the client. Use this to send structured responses with proper types. When asking for confirmation, use response.type="confirmation" and the agent will automatically stop to wait for user input. IMPORTANT: For confirmation responses, the tool requires approval and will pause the agent loop until the user responds.',
      inputSchema: z.object({
        // New structured format with response wrapper
        response: AgentResponseSchema.optional().describe('Structured response with type discriminator'),
        // Legacy format support (for backward compatibility during transition)
        text: z.string().optional().describe('Markdown content to display to the user (legacy format)'),
        actions: z
          .array(
            z.object({
              type: z.string().describe('Action identifier'),
              label: z.string().optional().describe('Human-friendly label'),
              params: z.record(z.string(), z.unknown()).optional().describe('Optional parameters for the action'),
            }),
          )
          .optional()
          .describe('Suggested next actions for the user (legacy format)'),
        data: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('Structured data payload to render in the UI (legacy format)'),
      }),
      // Echo back the provided input so the UI can consume it via tool-output events
      // For confirmation responses, we don't execute - this stops the agent loop until approval
      execute: async (input: {
        response?: AgentResponse;
        text?: string;
        actions?: Array<{ type: string; label?: string; params?: Record<string, unknown> }>;
        data?: Record<string, unknown>;
      }) => {
        // Normalize question to guarantee options exist
        if (input.response?.type === 'question') {
          const resp = input.response;
          const normalized: QuestionResponse = {
            ...resp,
            options: (resp.options && resp.options.length > 0)
              ? resp.options
              : [
                  { label: 'Modify Existing', value: 'modify', description: 'Update the existing configuration' },
                  { label: 'Create New', value: 'create', description: 'Create a new configuration from scratch' },
                ],
            multiple: resp.multiple ?? false,
            required: resp.required ?? true,
            actions: dedupeActions((resp.actions && resp.actions.length > 0)
              ? resp.actions
              : ([{ type: 'showConfig', label: 'Show Existing Config' }] as Action[])),
          };

          // Questions require user input; mark as approval-required to pause the agent loop
          return {
            response: normalized,
            _requiresApproval: true as const,
          };
        }

        // Normalize project-analysis to ensure some helpful actions exist
        // Also normalize domains and sharedModules from strings to objects if needed
        if (input.response?.type === 'project-analysis') {
          const resp = input.response;

          // Normalize domains: convert strings to objects
          let normalizedDomains = resp.data?.domains;
          if (normalizedDomains && Array.isArray(normalizedDomains)) {
            normalizedDomains = normalizedDomains.map((domain) => {
              if (typeof domain === 'string') {
                return { name: domain };
              }
              return domain;
            });
          }

          // Normalize sharedModules: convert strings to objects
          let normalizedSharedModules = resp.data?.sharedModules;
          if (normalizedSharedModules && Array.isArray(normalizedSharedModules)) {
            normalizedSharedModules = normalizedSharedModules.map((module) => {
              if (typeof module === 'string') {
                return { name: module };
              }
              return module;
            });
          }

          const normalized: ProjectAnalysisResponse = {
            ...resp,
            data: {
              ...resp.data,
              ...(normalizedDomains ? { domains: normalizedDomains } : {}),
              ...(normalizedSharedModules ? { sharedModules: normalizedSharedModules } : {}),
            },
            actions: dedupeActions((resp.actions && resp.actions.length > 0)
              ? resp.actions
              : ([
                  { type: 'generateConfig', label: 'Generate Config' },
                  { type: 'showOrgChart', label: 'Visualize Module Structure' },
                ] as Action[])),
          };
          return { response: normalized };
        }

        // CRITICAL: If this is a confirmation response, DO NOT execute
        // This makes the tool require approval, which stops the agent loop
        // The stop condition will detect this and stop the agent
        if (input.response?.type === 'confirmation') {
          // Return the response so UI can render it, but the agent will stop
          // because the tool call requires approval (no execute function result = requires approval)
          return {
            response: input.response,
            _requiresApproval: true,
          };
        }

        // For non-confirmation responses, execute normally
        // If new format is used, wrap it properly for the UI
        if (input.response) {
          return {
            response: input.response,
          };
        }
        // Legacy format
        return {
          text: input.text,
          actions: input.actions,
          data: input.data,
        };
      },
    }),

    listWorkspaces: tool({
      description:
        'List directories in the workspace. Returns directories and whether sheriff.config.ts exists.',
      inputSchema: z.object({
        cwd: z.string().describe('Working directory path'),
      }),
      execute: async (input: { cwd: string }) => {
        return await toolClient.call('fs_list', { cwd: input.cwd });
      },
    }),

    readConfig: tool({
      description:
        'Read the current sheriff.config.ts file content and checksum.',
      inputSchema: z.object({
        cwd: z.string().describe('Working directory path'),
      }),
      execute: async (input: { cwd: string }) => {
        return await toolClient.call('config_read', { cwd: input.cwd });
      },
    }),

    writeConfigDraft: tool({
      description:
        'Validate a proposed sheriff.config.ts without writing to disk. Returns validation result and checksum.',
      inputSchema: z.object({
        content: z.string().describe('Proposed config file content'),
        cwd: z.string().describe('Working directory path'),
      }),
      execute: async (input: { content: string; cwd: string }) => {
        return await toolClient.call('config_previewWrite', { content: input.content, cwd: input.cwd });
      },
    }),

    applyConfigPreview: tool({
      description:
        'Temporarily apply a config and run analysis for realtime preview. The config is not persisted to disk. Returns analysis results with tree, file mappings, and validation status.',
      inputSchema: z.object({
        content: z.string().describe('Config file content to apply temporarily'),
        entry: z.string().describe('Entry file path (relative to cwd)'),
        cwd: z.string().describe('Working directory path'),
      }),
      execute: async (input: { content: string; entry: string; cwd: string }) => {
        return await toolClient.call('config_applyPreview', {
          content: input.content,
          entry: input.entry,
          cwd: input.cwd,
        });
      },
    }),

    validateConfigDetailed: validateConfigDetailedTool,
    'config_validateDetailed': validateConfigDetailedTool,

    writeConfig: tool({
      description:
        'Write sheriff.config.ts to disk. Validates the config first, then writes it. Use this AFTER validating and testing the config with applyConfigPreview. This permanently saves the config file.',
      inputSchema: z.object({
        content: z.string().describe('Validated config file content to write to disk'),
        cwd: z.string().describe('Working directory path'),
      }),
      execute: async (input: { content: string; cwd: string }) => {
        return await toolClient.call('config_write', {
          content: input.content,
          cwd: input.cwd,
        });
      },
    }),

    getModuleStructure: tool({
      description:
        'Get module structure with tags for mermaid chart generation. Only includes modules that have tags (ignores untagged modules).',
      inputSchema: z.object({
        entry: z.string().describe('Entry file path (relative to cwd)'),
        cwd: z.string().describe('Working directory path'),
      }),
      execute: async (input: { entry: string; cwd: string }) => {
        return await toolClient.call('sheriff_moduleStructure', {
          entry: input.entry,
          cwd: input.cwd,
        });
      },
    }),

    analyzeProject: tool({
      description:
        'Analyze project structure and dependencies (directory-only, no files). Returns project tree with directory-level analysis.',
      inputSchema: z.object({
        entry: z.string().describe('Entry file path (relative to cwd)'),
        cwd: z.string().describe('Working directory path'),
      }),
      execute: async (input: { entry: string; cwd: string }) => {
        return await toolClient.call('sheriff_analyze', { entry: input.entry, cwd: input.cwd });
      },
    }),

    analyzeFullProject: tool({
      description:
        'Analyze project structure and dependencies including all files with full analysis data. Returns complete tree structure with file-level analysis, dependencies, and tags.',
      inputSchema: z.object({
        entry: z.string().describe('Entry file path (relative to cwd)'),
        cwd: z.string().describe('Working directory path'),
      }),
      execute: async (input: { entry: string; cwd: string }) => {
        return await toolClient.call('sheriff_full_analyze', { entry: input.entry, cwd: input.cwd });
      },
    }),

    computeAllowedMatrix: tool({
      description:
        'Compute the allowed dependency matrix for selected modules. Returns boolean matrix indicating allowed dependencies.',
      inputSchema: z.object({
        entry: z.string().describe('Entry file path (relative to cwd)'),
        selectedModules: z
          .array(z.string())
          .describe('Array of module paths to analyze'),
        cwd: z.string().describe('Working directory path'),
      }),
      execute: async (input: { entry: string; selectedModules: string[]; cwd: string }) => {
        return await toolClient.call('sheriff_allowedMatrix', {
          entry: input.entry,
          selectedModules: input.selectedModules,
          cwd: input.cwd,
        });
      },
    }),

    computeFullImportMatrix: tool({
      description:
        'Compute the full file-to-file import matrix showing which files import which files. Returns complete import structure matrix with all file-level import relationships.',
      inputSchema: z.object({
        entry: z.string().describe('Entry file path (relative to cwd)'),
        cwd: z.string().describe('Working directory path'),
      }),
      execute: async (input: { entry: string; cwd: string }) => {
        return await toolClient.call('sheriff_full_allowedMatrix', {
          entry: input.entry,
          cwd: input.cwd,
        });
      },
    }),

    inspectModuleTags: tool({
      description:
        'Inspect tags for a specific module path. Returns the tags assigned to the module.',
      inputSchema: z.object({
        modulePath: z.string().describe('Module directory path'),
        entry: z.string().describe('Entry file path (relative to cwd)'),
        cwd: z.string().describe('Working directory path'),
      }),
      execute: async (input: { modulePath: string; entry: string; cwd: string }) => {
        return await toolClient.call('sheriff_summarizeTags', {
          modulePath: input.modulePath,
          entry: input.entry,
          cwd: input.cwd,
        });
      },
    }),

    getModuleAccessList: tool({
      description:
        'Get the list of modules that a specific module can access based on Sheriff dependency rules. Returns an allow list of module paths that the queried module is allowed to import from.',
      inputSchema: z.object({
        modulePath: z.string().describe('Module path to query (relative to cwd)'),
        entry: z.string().describe('Entry file path (relative to cwd)'),
        cwd: z.string().describe('Working directory path'),
      }),
      execute: async (input: { modulePath: string; entry: string; cwd: string }) => {
        return await toolClient.call('sheriff_getModuleAccessList', {
          modulePath: input.modulePath,
          entry: input.entry,
          cwd: input.cwd,
        });
      },
    }),

    getAllFilesAsTreeText: tool({
      description:
        'Get all files in the project as a tree-structured text format. Returns a text representation showing directories and files hierarchically, similar to the tree command output.',
      inputSchema: z.object({
        cwd: z.string().describe('Working directory path'),
        rootPath: z.string().optional().describe('Optional root path to build tree from (defaults to cwd)'),
      }),
      execute: async (input: { cwd: string; rootPath?: string }) => {
        return await toolClient.call('sheriff_getAllFilesAsTreeText', {
          cwd: input.cwd,
          rootPath: input.rootPath,
        });
      },
    }),
  };
}

function dedupeActions(actions: Action[]): Action[] {
  const seen = new Set<string>();
  const result: Action[] = [];
  for (const a of actions) {
    const key = `${a.type}|${a.label ?? ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(a);
    }
  }
  return result;
}

