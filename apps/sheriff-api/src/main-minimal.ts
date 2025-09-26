/**
 * Minimal Sheriff API Entry Point
 * Starts a lightweight Express server with only the endpoints required
 * for the manual UI (config, analyze, manual operations).
 *
 * This is used by the VS Code extension to avoid loading AI/chat dependencies.
 */
import 'dotenv/config';
import { createMinimalApp } from './minimal-app';

/**
 * Starts the minimal server and logs startup information
 */
function startServer(): void {
  const config = {
    host: process.env.HOST ?? 'localhost',
    port: process.env.PORT ? Number(process.env.PORT) : 3000,
  };

  const app = createMinimalApp();

  app.listen(config.port, config.host, () => {
    console.log(`[ sheriff-api ] http://${config.host}:${config.port}`);
    console.log(`[ sheriff-api ] Mode: minimal (manual UI only)`);
  });
}

startServer();
