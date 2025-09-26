import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { AnySchema } from '@modelcontextprotocol/sdk/server/zod-compat.js';
import express from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod/v3';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ZodSchema } from 'zod/v3';
import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { MCP_TOOL_DEFINITIONS } from '../core/tool-definitions';
import { createCallToolHandler } from '../core/tool-handler';
import {
  buildPromptWithArguments,
  configWorkflowPromptSchema,
} from './prompt-definitions';

function zodSchemaToJsonSchema(schema: ZodSchema<unknown>) {
  return zodToJsonSchema(schema);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function textContent(text: string): Array<{ type: 'text'; text: string }> {
  return [{ type: 'text', text }];
}

export interface McpServerOptions {
  name?: string;
  version?: string;
}

export function createMcpServer(options: McpServerOptions): McpServer {
  const server = new McpServer(
    {
      name: options.name || 'sheriff-mcp-server',
      version: options.version || '1.0.0',
    },
    {
      capabilities: {
        prompts: {
          listChanged: false,
        },
        resources: {},
      },
    },
  );

  const callToolHandler = createCallToolHandler();

  for (const toolDef of MCP_TOOL_DEFINITIONS) {
    const toolName = toolDef.name;
    const inputSchema: ZodSchema<unknown> = toolDef.inputSchema;
    const outputSchema: ZodSchema<unknown> = toolDef.outputSchema;

    server.registerTool<AnySchema, AnySchema>(
      toolName,
      {
        title: toolDef.name,
        description: toolDef.description,
        inputSchema,
        outputSchema,
      },
      async (args: unknown) => {
        try {
          const argsObj = isRecord(args) ? args : {};
          const response = await callToolHandler({
            params: {
              name: toolName,
              arguments: argsObj,
            },
          });

          return {
            content: response.content,
            isError: response.isError,
          };
        } catch (error) {
          return {
            content: textContent(
              JSON.stringify({
                error: error instanceof Error ? error.message : String(error),
              }),
            ),
            isError: true,
          };
        }
      },
    );
  }

  server.registerPrompt(
    'sheriff_config_assistant',
    {
      title: 'Sheriff Config Assistant',
      description: 'System prompt for helping users generate Sheriff configuration files. Guides the LLM through analyzing projects and creating appropriate configs.',
    },
    () => {
      const promptText = buildPromptWithArguments('sheriff_config_assistant');
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: promptText,
            },
          },
        ],
      };
    },
  );

  server.registerPrompt(
    'generate_sheriff_config',
    {
      title: 'Generate Sheriff Config',
      description: 'Guides the LLM through the complete workflow: analyze project structure, understand dependencies, generate config, validate, and write. Use MCP tools to gather information.',
      argsSchema: {
        cwd: z.string().describe('Working directory path'),
        entry: z.string().describe('Entry file path relative to cwd (e.g., src/main.ts or src/index.ts)'),
      },
    },
    (args: { cwd: string; entry: string }) => {
      let promptText: string;
      try {
        const validated = configWorkflowPromptSchema.parse(args);
        promptText = buildPromptWithArguments('generate_sheriff_config', validated);
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Invalid arguments for prompt generate_sheriff_config: ${error.message}`);
        }
        throw error;
      }
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: promptText,
            },
          },
        ],
      };
    },
  );

  const getResourcePath = (): string => {
    const distPath = join(__dirname, 'configuration-reference.md');
    if (existsSync(distPath)) {
      return distPath;
    }
    const workspaceRoot = resolve(__dirname, '../../../../../../..');
    return resolve(workspaceRoot, 'apps/sheriff-api/src/mcp/configuration-reference.md');
  };

  server.registerResource(
    'Sheriff Configuration Reference',
    'sheriff://configuration-reference',
    {
      description: 'LLM-optimized reference that summarizes core Sheriff documentation on configuration, dependency rules, and module boundaries.',
      mimeType: 'text/markdown',
    },
    async () => {
      const resourcePath = getResourcePath();
      const content = readFileSync(resourcePath, 'utf-8');
      return {
        contents: [
          {
            uri: 'sheriff://configuration-reference',
            mimeType: 'text/markdown',
            text: content,
          },
        ],
      };
    },
  );

  return server;
}

export function createMcpHttpRouter(createServer: () => McpServer): express.Router {
  const router = express.Router();
  const callToolHandler = createCallToolHandler();

  router.get('/tools', async (_req: Request, res: Response) => {
    try {
      const tools = MCP_TOOL_DEFINITIONS.map((toolDef) => {
        const inputJsonSchema = zodSchemaToJsonSchema(toolDef.inputSchema);
        const { $schema: _inputSchema, ...inputSchema } = inputJsonSchema;

        const outputJsonSchema = zodSchemaToJsonSchema(toolDef.outputSchema);
        const { $schema: _outputSchema, ...outputSchema } = outputJsonSchema;

        return {
          name: toolDef.name,
          description: toolDef.description,
          inputSchema: inputSchema,
          outputSchema: outputSchema,
        };
      });
      res.json({ tools });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  router.post('/tools/call', async (req: Request, res: Response) => {
    try {
      const { name, arguments: args } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Tool name is required' });
      }

      const response = await callToolHandler({
        params: {
          name,
          arguments: args ?? {},
        },
      });

      res.json(response);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  router.post('/', async (req: Request, res: Response) => {
    try {
      const server = createServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });

      res.on('close', () => {
        transport.close();
        server.close();
      });

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('MCP server error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
    }
  });

  router.get('/', async (_req: Request, res: Response) => {
    res.status(405).end(
      JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Method not allowed.' },
        id: null,
      }),
    );
  });

  router.delete('/', async (_req: Request, res: Response) => {
    res.status(405).end(
      JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Method not allowed.' },
        id: null,
      }),
    );
  });

  router.get('/health', async (_req: Request, res: Response) => {
    res.json({ ok: true, transport: 'streamable-http' });
  });

  return router;
}
