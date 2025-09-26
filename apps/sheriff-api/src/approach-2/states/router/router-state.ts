import type { Model, SessionData } from '../../shared/types';
import { callLLMForStructuredOutput } from '../../shared/llm-utils';
import { buildRouterPrompt, ROUTER_SYSTEM_PROMPT } from './router-prompts';
import { handleExtractPath, handleAnalyzeStructure } from '../structure/structure-state';
import { handleExtractRules } from '../dependency-rules/dependency-rules-state';
import { handleGenerateConfig } from '../done/done-state';
import { routerDecisionSchema } from './router-schemas';

export interface RouterResponse {
  nextState: 'INIT' | 'STRUCTURE' | 'DEPENDENCY_RULES' | 'DONE';
  action: 'welcome' | 'extractPath' | 'analyzeStructure' | 'extractRules' | 'generateConfig' | 'stay' | 'restart';
  message: string;
  config?: string;
  sessionUpdates?: Partial<SessionData>;
}

function handleRestart(
  message: string,
  action: string,
): RouterResponse {
  const sessionUpdates: Partial<SessionData> = {
    state: 'INIT',
    data: { domains: [], types: [], hasShared: false, domainBasePath: undefined },
    cwd: undefined,
    entry: undefined,
    analysisResult: undefined,
  };
  return {
    nextState: 'INIT',
    action: action as RouterResponse['action'],
    message,
    sessionUpdates,
  };
}

export async function routeMessage(
  session: SessionData,
  userInput: string,
  model: Model,
): Promise<RouterResponse> {
  try {
    const decision = await callLLMForStructuredOutput(
      model,
      ROUTER_SYSTEM_PROMPT,
      buildRouterPrompt(
        session.state,
        {
          cwd: session.cwd,
          entry: session.entry,
          domains: session.data.domains,
          types: session.data.types,
          hasShared: session.data.hasShared,
          domainIsolation: session.data.domainIsolation,
          typeHierarchy: session.data.typeHierarchy,
          sharedAccess: session.data.sharedAccess,
          rootAccess: session.data.rootAccess,
        },
        userInput,
      ),
      routerDecisionSchema,
      {
        sessionId: session.sessionId,
        functionId: 'router-analyze',
        state: session.state,
      },
    );

    switch (decision.action) {
      case 'extractPath':
        return handleExtractPath(userInput, session, model, decision.action);
      case 'analyzeStructure':
        return handleAnalyzeStructure(session, model, decision.action);
      case 'extractRules':
        return handleExtractRules(userInput, session, model, decision.action);
      case 'generateConfig':
        return handleGenerateConfig(userInput, session, model, decision.action);
      case 'restart':
        return handleRestart(decision.message, decision.action);
      default:
        return {
          nextState: decision.nextState as RouterResponse['nextState'],
          action: decision.action as RouterResponse['action'],
          message: decision.message,
        };
    }
  } catch (error) {
    console.error('[Router] Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      nextState: session.state,
      action: 'stay',
      message: `❌ Error: ${errorMessage}\n\n` +
        `This usually means:\n` +
        `1. Your LLM server (LM Studio) doesn't have a model loaded\n` +
        `2. Check that LM Studio is running and has a model loaded\n` +
        `3. Or set MODEL_PROVIDER=openai or MODEL_PROVIDER=anthropic with API keys\n` +
        `4. Check your .env file for MODEL_PROVIDER configuration`,
    };
  }
}

