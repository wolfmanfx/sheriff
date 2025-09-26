import { Router, Request, Response } from 'express';
import { streamText, type UIMessage } from 'ai';
import { createModelFromProviderConfig } from '../shared/llm-api-provider-config';
import type { SessionData, ChatHandlerContext } from './shared/types';
import { handleChatMessage } from './chat-handler';

export function createConversationalAgentRouter(): Router {
  const router = Router();
  const model = createModelFromProviderConfig();
  const sessions = new Map<string, SessionData>();

  router.get('/session/:sessionId', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
      }

      const session = sessions.get(sessionId);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      if(session && session.analysisResult) {
        session.analysisResult = undefined;
      }
      res.json(session);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: errorMessage });
    }
  });

  router.post('/chat', async (req: Request, res: Response) => {
    try {
      const { messages, sessionId } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Invalid messages format' });
      }

      const context: ChatHandlerContext = {
        sessions,
        model,
      };

      const response = await handleChatMessage(
        {
          messages: messages as UIMessage[],
          sessionId,
        },
        context,
      );

      const result = streamText({
        model,
        system: 'You are a helpful assistant helping users configure Sheriff (a TypeScript module boundary enforcement tool). Present information clearly, conversationally, and in a user-friendly way. Preserve all technical details, code blocks, and important information exactly as provided. Add extra spacing between sections, paragraphs, lists, and code blocks for better readability.',
        messages: [
          {
            role: 'user',
            content: `Please present this message to the user in a natural, conversational way. Make it easy to read and understand, but preserve all technical details, code blocks, and important information:\n\n${response.message}`,
          },
        ],
        temperature: 0.3,
      });

      if (res.headersSent) {
        return;
      }

      result.pipeUIMessageStreamToResponse(res);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (!res.headersSent) {
        res.status(500).json({ error: errorMessage });
      } else {
        try {
          res.write(`data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`);
          res.write('data: [DONE]\n\n');
          res.end();
        } catch {
        }
      }
    }
  });

  return router;
}
