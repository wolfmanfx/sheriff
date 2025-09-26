/**
 * Minimal Sheriff API Application
 * Creates a stripped-down Express app with only the endpoints required
 * for the manual UI (no AI/chat/agent functionality).
 *
 * Used by the VS Code extension to provide a lightweight backend.
 */
import express from 'express';
import { SheriffApiController } from './controller';
import { createManualRouter } from './manual/manual-router';

/**
 * CORS middleware for VS Code webview origins.
 * VS Code webviews use vscode-webview:// scheme which requires explicit CORS headers.
 */
function corsMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }

  next();
}

/**
 * Creates a minimal Express application with only core and manual endpoints.
 * Does not include AI/chat routers, MCP server, or observability instrumentation.
 *
 * @returns Configured Express application
 */
export function createMinimalApp(): express.Application {
  const app = express();

  app.use(corsMiddleware);

  app.use(express.json());

  const controller = new SheriffApiController();
  controller.register(app);

  app.use('/api/manual', createManualRouter());

  return app;
}
