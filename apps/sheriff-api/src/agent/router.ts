/**
 * Agent Router with Streaming
 * Express router with SSE streaming for agent conversations
 */
import { Router } from 'express';
import { SheriffApiController } from '../controller';
import { createModelFromProviderConfig } from '../shared/llm-api-provider-config';
import { handleSessionRequest } from './handlers/session-handler';
import { handleGetContext, handleGetProposal, handleApproveConfig } from './handlers/route-handlers';

export function createAgentRouter(controller: SheriffApiController): Router {
  const router = Router();
  const model = createModelFromProviderConfig();

  /**
   * POST /api/agent/session
   * Stream agent responses via SSE
   */
  router.post('/api/agent/session', async (req, res) => {
    await handleSessionRequest(req, res, model, controller);
  });

  /**
   * GET /api/agent/context/:sessionId
   * Get system context summary for a session
   */
  router.get('/api/agent/context/:sessionId', handleGetContext);

  /**
   * GET /api/agent/proposal/:sessionId
   * Get latest proposal from session
   */
  router.get('/api/agent/proposal/:sessionId', handleGetProposal);

  /**
   * POST /api/agent/approve-config
   * Approve and write config to disk
   */
  router.post('/api/agent/approve-config', handleApproveConfig);

  return router;
}
