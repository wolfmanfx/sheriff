import type { Model, SessionData } from '../../shared/types';
import { callLLM, callLLMForStructuredOutput, parseJSONResponse } from '../../shared/llm-utils';
import { buildExtractPathPrompt, buildExtractDomainsTypesPrompt, STRUCTURE_SYSTEM_PROMPT } from './structure-prompts';
import { analyzeProjectStructure } from './structure-operations';
import { domainTypeExtractionSchema, type DomainTypeExtractionResponse } from './structure-schemas';
import type { RouterResponse } from '../router/router-state';

export interface PathExtractionResponse {
  cwd: string | null;
  entryFilePath: string | null;
  message: string;
}

export async function extractPathFromInput(
  userInput: string,
  model: Model,
  sessionId?: string,
  currentCwd?: string,
  currentEntry?: string,
): Promise<PathExtractionResponse> {
  try {
    const llmResponse = await callLLM(
      model,
      STRUCTURE_SYSTEM_PROMPT,
      buildExtractPathPrompt(userInput, currentCwd, currentEntry),
      {
        sessionId,
        functionId: 'structure-extract-path',
        state: 'STRUCTURE',
      },
    );

    const parsed = parseJSONResponse<PathExtractionResponse>(llmResponse);
    return parsed;
  } catch (error) {
    console.error('LLM Error extracting path:', error);
    throw new Error(`Failed to extract path: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function analyzeAndExtractDomains(
  session: SessionData,
  model: Model,
): Promise<{ domainsData: DomainTypeExtractionResponse; findingsMessage: string }> {
  if (!session.cwd || !session.entry) {
    throw new Error('Session must have cwd and entry before analysis');
  }

  const analysisResult = analyzeProjectStructure(session.cwd);
  session.analysisResult = analysisResult;

  let domainsData: DomainTypeExtractionResponse;
  try {
    domainsData = await callLLMForStructuredOutput(
      model,
      STRUCTURE_SYSTEM_PROMPT,
      buildExtractDomainsTypesPrompt(analysisResult),
      domainTypeExtractionSchema,
      {
        sessionId: session.sessionId,
        functionId: 'structure-extract-domains',
        state: 'STRUCTURE',
      },
    );
  } catch (error) {
    console.error('LLM Error extracting domains/types:', error);
    throw new Error(`Failed to extract domains/types: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  if (domainsData.data) {
    Object.assign(session.data, domainsData.data);
  }

  if (!session.data.domains || session.data.domains.length === 0) {
    throw new Error(
      'Could not extract domains from the project structure. Please check if your project has domain tags (e.g., "domain:bookings") in the folder structure.',
    );
  }

  const domainsList = session.data.domains.join(', ');
  const typesList = session.data.types.join(', ');
  const sharedText = session.data.hasShared ? 'yes' : 'no';
  const findingsMessage = `✅ Found domains: ${domainsList}. Types: ${typesList}. Shared folder: ${sharedText}.\n\nNow let's configure the dependency rules.`;

  return { domainsData, findingsMessage };
}

export async function handleExtractPath(
  userInput: string,
  session: SessionData,
  model: Model,
  action: string,
): Promise<RouterResponse> {
  const pathResponse = await extractPathFromInput(userInput, model, session.sessionId, session.cwd, session.entry);
  const sessionUpdates: Partial<SessionData> = {};

  if (pathResponse.cwd !== null) {
    sessionUpdates.cwd = pathResponse.cwd;
  }
  if (pathResponse.entryFilePath !== null) {
    sessionUpdates.entry = pathResponse.entryFilePath;
  }

  if (pathResponse.cwd !== null && pathResponse.entryFilePath !== null) {
    const tempSession = { ...session, ...sessionUpdates } as SessionData;
    const { findingsMessage } = await analyzeAndExtractDomains(tempSession, model);
    Object.assign(sessionUpdates, {
      data: tempSession.data,
      analysisResult: tempSession.analysisResult,
      state: 'STRUCTURE',
    });
    return {
      nextState: 'STRUCTURE',
      action: 'analyzeStructure',
      message: findingsMessage,
      sessionUpdates,
    };
  }

  return {
    nextState: session.state,
    action: action as RouterResponse['action'],
    message: pathResponse.message || 'Could you please provide the project root path and entry file path?',
    sessionUpdates,
  };
}

export async function handleAnalyzeStructure(
  session: SessionData,
  model: Model,
  action: string,
): Promise<RouterResponse> {
  if (!session.cwd || !session.entry) {
    return {
      nextState: session.state,
      action: action as RouterResponse['action'],
      message: '❌ Path not set. Please provide project path first.',
    };
  }
  const { findingsMessage } = await analyzeAndExtractDomains(session, model);
  const sessionUpdates: Partial<SessionData> = {
    state: 'DEPENDENCY_RULES',
    data: session.data,
    analysisResult: session.analysisResult,
  };
  return {
    nextState: 'DEPENDENCY_RULES',
    action: action as RouterResponse['action'],
    message: findingsMessage,
    sessionUpdates,
  };
}

