/**
 * Sheriff API Main Entry Point
 * Initializes and starts the Express server with all routes and middleware
 */
import 'dotenv/config';

// Initialize OpenTelemetry instrumentation before any other imports
import { register } from './langfuse-instrumentation';
register();

import express from 'express';
import { SheriffApiController } from './controller';
import { createAgentRouter } from './agent/router';
import { createMcpServer, createMcpHttpRouter } from './mcp/server';
import * as path from 'path';
import { createStructuredPromptRouter } from './approach-1/structured-prompt-router';
import { createConversationalAgentRouter } from './approach-2/conversational-agent-router';
import { createManualRouter } from './manual/manual-router';


/**
 * Logs agent provider configuration
 */
function logAgentConfig(): void {
  const providerType = process.env.MODEL_PROVIDER || 'lm-studio';
  console.log(`[ agent ] Provider: ${providerType}`);

  switch (providerType) {
    case 'lm-studio':
      console.log(`[ agent ] Base URL: ${process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234/v1'}`);
      console.log(`[ agent ] Model: ${process.env.LM_STUDIO_CHAT_MODEL || 'gpt-4o'}`);
      break;
    case 'anthropic':
      console.log(`[ agent ] Model: ${process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest'}`);
      console.log(`[ agent ] API Key: ${process.env.ANTHROPIC_API_KEY ? '***configured***' : 'NOT SET'}`);
      break;
    case 'openai':
      console.log(`[ agent ] Base URL: ${process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'}`);
      console.log(`[ agent ] Model: ${process.env.OPENAI_MODEL || 'gpt-4o'}`);
      console.log(`[ agent ] API Key: ${process.env.OPENAI_API_KEY ? '***configured***' : 'NOT SET'}`);
      break;
    case 'gemini':
      console.log(`[ agent ] Model: ${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}`);
      console.log(`[ agent ] API Key: ${process.env.GEMINI_API_KEY ? '***configured***' : 'NOT SET'}`);
      break;
  }
}

/**
 * Logs Langfuse observability configuration
 */
function logLangfuseConfig(): void {
  if (process.env.LANGFUSE_SECRET_KEY && process.env.LANGFUSE_PUBLIC_KEY) {
    console.log(`[ langfuse ] Observability enabled`);
    console.log(`[ langfuse ] Base URL: ${process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com'}`);
  } else {
    console.log(`[ langfuse ] Observability disabled (credentials not provided)`);
  }
}

/**
 * Creates and configures the Express application
 *
 * @returns Configured Express application
 */
function createApp(): express.Application {
  const app = express();
  app.use(express.json());

  app.use('/mcp-docs', express.static(path.join(__dirname, '../../../public/mcp-docs'), { index: 'index.html' }));

  const controller = new SheriffApiController();

  const mcpRouter = createMcpHttpRouter(() => createMcpServer({}));
  app.use('/mcp', mcpRouter);

  controller.register(app);
  app.use('/api/manual', createManualRouter());

  const agentRouter = createAgentRouter(controller);
  app.use(agentRouter);

  const structuredPromptRouter = createStructuredPromptRouter();
  app.use('/api/approach1', structuredPromptRouter);

  const conversationalAgentRouter = createConversationalAgentRouter();
  app.use('/api/approach2', conversationalAgentRouter);

  return app;
}

/**
 * Starts the server and logs startup information
 */
function startServer(): void {
  const config = {
    host: process.env.HOST ?? 'localhost',
    port: process.env.PORT ? Number(process.env.PORT) : 3000,
  };
  const app = createApp();

  app.listen(config.port, config.host, () => {
    console.log(`[ ready ] http://${config.host}:${config.port}`);
    logAgentConfig();
    logLangfuseConfig();
  });
}

// Start the server
startServer();
