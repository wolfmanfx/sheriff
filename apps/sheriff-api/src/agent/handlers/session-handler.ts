/**
 * Session handler - handles POST /api/agent/session
 */
import type { Request, Response } from 'express';
import { pipeAgentUIStreamToResponse, type UIMessage } from 'ai';
import { createToolRegistry } from '../tools';
import { createAgentInstance } from '../agent-instance';
import { determineAgentConfig } from '../config/agent-config';
import { logTelemetry } from '../utils/telemetry';
import { sessionStore } from '../session-store';
import { SystemContext } from '../context/system-context';
import type { SessionRequest, SessionRequestMessage } from '../types/router';
import { createModelFromProviderConfig } from '../../shared/llm-api-provider-config';
import type { SheriffApiController } from '../../controller';
import type { AgentRole } from '../prompts/types';

export async function handleSessionRequest(
  req: Request,
  res: Response,
  model: ReturnType<typeof createModelFromProviderConfig>,
  _controller: SheriffApiController,
): Promise<void> {
  try {
    const { messages = [], context = {}, sessionId } = req.body as SessionRequest;

    // Convert request messages to UIMessage[] format
    const uiMessages = convertToUIMessages(messages);

    // Use provided sessionId or create new one
    // NOTE: Session persists across multiple HTTP requests/streams
    // Each new message creates a new stream, but uses the same session
    const effectiveSessionId = sessionId || `session-${Date.now()}`;

    logTelemetry({
      sessionId: effectiveSessionId,
      timestamp: Date.now(),
      event: 'session_start',
    });

    // Ensure session exists (reuse existing session if it exists)
    // This allows multiple messages in the same session
    let session = sessionStore.getSession(effectiveSessionId);
    if (!session) {
      session = sessionStore.createSession(effectiveSessionId);
    }

    // Get current session state before processing messages
    let currentSession = sessionStore.getSession(effectiveSessionId);

    // Add user messages to session (extract text for storage)
    // Also detect path confirmations and update session state
    for (const msg of uiMessages) {
      if (msg.role === 'user') {
        const text = extractTextFromUIMessage(msg);
        const agentRole = (msg.metadata as { agentRole?: AgentRole } | undefined)?.agentRole;
        sessionStore.addMessage(effectiveSessionId, {
          role: 'user',
          content: text,
          agentRole,
        });

        const normalized = text.trim().toLowerCase();
        
        // Detect config decisions
        if (normalized === 'modify') {
          sessionStore.updateSession(effectiveSessionId, { configDecision: 'modify' });
        } else if (normalized === 'generate' || normalized === 'create') {
          sessionStore.updateSession(effectiveSessionId, { configDecision: 'create' });
        }
        
        // Detect path confirmations: "yes", "y", or path-like strings
        const isConfirmation = normalized === 'yes' || normalized === 'y';
        const isPath = text.trim().length > 0 && (
          text.trim().startsWith('/') ||
          /^[A-Za-z]:[\\/]/.test(text.trim()) ||
          text.trim().startsWith('./') ||
          text.trim().startsWith('../')
        );
        
        if (isConfirmation || isPath) {
          // If user confirmed with "yes", use the detected cwd from context or session
          // If user provided a path, use that path
          const confirmedPath = isPath ? text.trim() : (context.cwd || currentSession?.confirmedPath || process.cwd());
          sessionStore.updateSession(effectiveSessionId, {
            confirmedPath,
            hasConfirmedPath: true,
          });
          // Refresh session state after update
          currentSession = sessionStore.getSession(effectiveSessionId);
        }
      }
    }

    // Get current session state (after processing messages)
    currentSession = sessionStore.getSession(effectiveSessionId);
    if (!currentSession) {
      res.status(500).json({ error: 'Failed to get session' });
      return;
    }

    // Create system context for this session
    // Use confirmed path from session if available, otherwise use context.cwd
    const effectiveCwd = currentSession.hasConfirmedPath && currentSession.confirmedPath
      ? currentSession.confirmedPath
      : context.cwd;
    
    const systemContext = new SystemContext(
      effectiveSessionId,
      currentSession,
      {
        cwd: effectiveCwd,
        entry: context.entry,
      },
    );

    // Update system context with confirmation state from session
    if (currentSession.hasConfirmedPath && currentSession.confirmedPath) {
      systemContext.updateProjectContext({ cwd: currentSession.confirmedPath });
      systemContext.setHasConfirmedPath(true);
    }

    // Determine agent configuration
    // Pass confirmed path from session/context to agent config
    const confirmedPath = currentSession.hasConfirmedPath && currentSession.confirmedPath
      ? currentSession.confirmedPath
      : context.cwd;
    
    const agentConfig = determineAgentConfig(currentSession, uiMessages, {
      cwd: confirmedPath,
      entry: context.entry,
      sessionId: effectiveSessionId,
      hasConfirmedPath: systemContext.getHasConfirmedPath(),
    });

    // Set current role in context
    systemContext.setCurrentRole(agentConfig.role);

    console.log('[DEBUG] Agent phase:', {
      hasBrief: !!currentSession?.brief,
      hasProposal: (currentSession?.proposals.length || 0) > 0,
      hasReport: (currentSession?.reports.length || 0) > 0,
      currentAgentRole: agentConfig.role,
      contextSummary: systemContext.getContextSummary(),
    });

    // Create tools and agent
    const tools = createToolRegistry();

    const agent = createAgentInstance(
      model,
      agentConfig,
      effectiveSessionId,
      tools,
      currentSession,
      systemContext,
    );

    // Stream agent response - messages are already in UIMessage[] format
    await pipeAgentUIStreamToResponse({
      agent,
      messages: agentConfig.messages,
      response: res,
    });

    // Update context with latest session state after streaming
    const updatedSession = sessionStore.getSession(effectiveSessionId);
    if (updatedSession) {
      systemContext.updateSession(updatedSession);
    }

    console.log('[DEBUG] Session completed:', systemContext.getContextSummary());

    // After streaming completes, pipeAgentUIStreamToResponse automatically:
    // - Closes the response stream
    // - Sends [DONE] marker
    // - Handles cleanup
    // Custom events (annotations, structured-response) are injected during streaming via the response wrapper
  } catch (error) {
    console.error('Agent session error:', error);
  }
}

/**
 * Convert SessionRequestMessage[] to UIMessage[]
 */
function convertToUIMessages(messages: SessionRequestMessage[]): UIMessage[] {
  const baseTimestamp = Date.now();
  const result: UIMessage[] = [];

  for (const msg of messages) {
    if (!msg || (msg.role !== 'user' && msg.role !== 'assistant')) {
      continue;
    }

    // Extract text from parts or use content fallback
    let text = '';
    if (msg.parts && Array.isArray(msg.parts)) {
      text = msg.parts
        .map((part) => {
          if (part && typeof part === 'object' && 'type' in part && part.type === 'text' && 'text' in part) {
            return typeof part.text === 'string' ? part.text : '';
          }
          return '';
        })
        .join('')
        .trim();
    }
    if (!text && typeof msg.content === 'string') {
      text = msg.content;
    }
    if (!text) {
      continue;
    }

    const metadata: Record<string, unknown> = {};
    if (msg.metadata) {
      Object.assign(metadata, msg.metadata);
    }

    result.push({
      id: msg.id || `msg-${baseTimestamp}-${result.length}`,
      role: msg.role as 'user' | 'assistant',
      ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
      parts: [{ type: 'text' as const, text }],
    });
  }

  return result;
}

/**
 * Extract text content from UIMessage for session storage
 */
function extractTextFromUIMessage(message: UIMessage): string {
  if (message.parts && Array.isArray(message.parts)) {
    return message.parts
      .map((part) => {
        if (part && typeof part === 'object' && 'type' in part && part.type === 'text' && 'text' in part) {
          return typeof part.text === 'string' ? part.text : '';
        }
        return '';
      })
      .join('')
      .trim();
  }
  return '';
}

