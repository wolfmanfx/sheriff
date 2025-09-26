import { convertToModelMessages } from 'ai';
import type { ChatRequest, ChatResponse, ChatHandlerContext } from './shared/types';
import { extractTextFromContent } from './shared/message-utils';
import { createSession } from './shared/session-utils';
import { routeMessage } from './states/router/router-state';

export async function handleChatMessage(
  request: ChatRequest,
  context: ChatHandlerContext,
): Promise<ChatResponse> {
  const sessionId = request.sessionId || `session-${Date.now()}`;
  const modelMessages = convertToModelMessages(request.messages);

  let session = context.sessions.get(sessionId);
  if (!session) {
    session = createSession(sessionId);
    context.sessions.set(sessionId, session);
  }

  const lastUserMessageObj = modelMessages.filter((m) => m.role === 'user').pop();
  const userInput = lastUserMessageObj ? extractTextFromContent(lastUserMessageObj.content) : '';

  const routerResponse = await routeMessage(session, userInput, context.model);

  if (routerResponse.sessionUpdates) {
    Object.assign(session, routerResponse.sessionUpdates);
  } else {
    session.state = routerResponse.nextState;
  }
  return {
    message: routerResponse.message,
    config: routerResponse.config,
    isDone: routerResponse.nextState === 'DONE',
  };
}
