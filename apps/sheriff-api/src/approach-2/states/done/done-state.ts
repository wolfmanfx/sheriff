import type { Model, ConfigData, SessionData } from '../../shared/types';
import { callLLM } from '../../shared/llm-utils';
import { CONFIG_GENERATION_PROMPT, buildConfigGenerationPrompt } from './done-prompts';
import type { RouterResponse } from '../router/router-state';
import { extractDependencyRules, updateDependencyRulesSessionData } from '../dependency-rules/dependency-rules-state';

export async function generateConfig(
  data: ConfigData,
  model: Model,
  sessionId?: string,
): Promise<string> {
  try {
    const llmResponse = await callLLM(
      model,
      CONFIG_GENERATION_PROMPT,
      buildConfigGenerationPrompt(data),
      {
        sessionId,
        functionId: 'done-generate-config',
        state: 'DONE',
      },
    );

    return llmResponse.trim();
  } catch (error) {
    console.error('Config generation error:', error);
    throw new Error(`Failed to generate config: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function handleGenerateConfig(
  userInput: string,
  session: SessionData,
  model: Model,
  action: string,
): Promise<RouterResponse> {
  if (userInput) {
    const rulesResponse = await extractDependencyRules(userInput, session, model);
    updateDependencyRulesSessionData(session, rulesResponse);
  }

  if (!session.data.domains || session.data.domains.length === 0) {
    return {
      nextState: session.state,
      action: action as RouterResponse['action'],
      message: '❌ Cannot generate config: No domains found. Please ensure domains are set before generating the configuration.',
    };
  }
  if (!session.data.types || session.data.types.length === 0) {
    return {
      nextState: session.state,
      action: action as RouterResponse['action'],
      message: '❌ Cannot generate config: No types found. Please ensure types are set before generating the configuration.',
    };
  }

  const configData: ConfigData = {
    domains: session.data.domains,
    types: session.data.types,
    hasShared: session.data.hasShared,
    domainBasePath: session.data.domainBasePath,
    domainIsolation: session.data.domainIsolation,
    typeHierarchy: session.data.typeHierarchy,
    sharedAccess: session.data.sharedAccess,
    rootAccess: session.data.rootAccess,
  };
  const config = await generateConfig(configData, model, session.sessionId);
  const sessionUpdates: Partial<SessionData> = {
    state: 'DONE',
    data: session.data,
  };
  return {
    nextState: 'DONE',
    action: action as RouterResponse['action'],
    message: `✅ Configuration generated successfully!\n\n\`\`\`typescript\n${config}\n\`\`\``,
    config,
    sessionUpdates,
  };
}

