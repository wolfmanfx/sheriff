import { z } from 'zod/v3';
import type { Model, SessionData, DependencyRules } from '../../shared/types';
import { callLLM, parseJSONResponse } from '../../shared/llm-utils';
import { buildDependencyRulesPrompt, DEPENDENCY_RULES_SYSTEM_PROMPT } from './dependency-rules-prompts';
import { dependencyRulesExtractionSchema, type DependencyRulesExtractionResponse } from './dependency-rules-schemas';
import type { RouterResponse } from '../router/router-state';

export async function extractDependencyRules(
  userInput: string,
  session: SessionData,
  model: Model,
): Promise<DependencyRulesExtractionResponse> {
  const currentRules: DependencyRules = {
    domainIsolation: session.data.domainIsolation,
    typeHierarchy: session.data.typeHierarchy,
    sharedAccess: session.data.sharedAccess,
    rootAccess: session.data.rootAccess,
  };

  try {
    const responseText = await callLLM(
      model,
      DEPENDENCY_RULES_SYSTEM_PROMPT,
      buildDependencyRulesPrompt(
        userInput,
        currentRules,
        session.data.domains,
        session.data.types,
        session.data.hasShared,
      ),
      {
        sessionId: session.sessionId,
        functionId: 'dependency-rules-extract',
        state: 'DEPENDENCY_RULES',
      },
    );

    const parsed = parseJSONResponse<DependencyRulesExtractionResponse>(responseText);

    if (parsed.data) {
      const data = parsed.data as Record<string, unknown>;
      for (const key in data) {
        if (data[key] === null) {
          delete data[key];
        }
      }
    }

    const validated = dependencyRulesExtractionSchema.parse(parsed);

    return validated;
  } catch (error) {
    console.error('LLM Error in DEPENDENCY_RULES state:', error);
    throw new Error(`Failed to extract dependency rules: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function updateDependencyRulesSessionData(
  session: SessionData,
  response: DependencyRulesExtractionResponse,
): void {
  if ('domains' in response.data && response.data.domains != null) {
    const domainsResult = z.array(z.string()).min(1).safeParse(response.data.domains);
    if (domainsResult.success) {
      session.data.domains = domainsResult.data;
    } else {
      console.warn('[DEPENDENCY_RULES] Rejected empty domains array - preserving current domains');
    }
  }

  if ('types' in response.data && response.data.types != null) {
    const typesResult = z.array(z.string()).min(1).safeParse(response.data.types);
    if (typesResult.success) {
      session.data.types = typesResult.data;
    } else {
      console.warn('[DEPENDENCY_RULES] Rejected empty types array - preserving current types');
    }
  }

  if ('domainIsolation' in response.data && response.data.domainIsolation != null) {
    const domainIsolationResult = z.boolean().safeParse(response.data.domainIsolation);
    if (domainIsolationResult.success) {
      session.data.domainIsolation = domainIsolationResult.data;
    }
  }

  if ('typeHierarchy' in response.data && response.data.typeHierarchy != null) {
    const typeHierarchyResult = z.record(z.string(), z.array(z.string())).safeParse(response.data.typeHierarchy);
    if (typeHierarchyResult.success) {
      session.data.typeHierarchy = typeHierarchyResult.data;
    }
  }

  if ('sharedAccess' in response.data && response.data.sharedAccess != null) {
    const sharedAccessResult = z.boolean().safeParse(response.data.sharedAccess);
    if (sharedAccessResult.success) {
      session.data.sharedAccess = sharedAccessResult.data;
    }
  }

  if ('rootAccess' in response.data && response.data.rootAccess != null) {
    const rootAccessResult = z.array(z.string()).safeParse(response.data.rootAccess);
    if (rootAccessResult.success) {
      session.data.rootAccess = rootAccessResult.data;
    }
  }
}

export async function handleExtractRules(
  userInput: string,
  session: SessionData,
  model: Model,
  action: string,
): Promise<RouterResponse> {
  const rulesResponse = await extractDependencyRules(userInput, session, model);
  updateDependencyRulesSessionData(session, rulesResponse);
  const sessionUpdates: Partial<SessionData> = {
    state: rulesResponse.isDone ? 'DONE' : 'DEPENDENCY_RULES',
    data: session.data,
  };
  return {
    nextState: rulesResponse.isDone ? 'DONE' : 'DEPENDENCY_RULES',
    action: action as RouterResponse['action'],
    message: rulesResponse.message,
    sessionUpdates,
  };
}

