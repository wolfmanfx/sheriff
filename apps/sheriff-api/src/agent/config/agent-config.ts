/**
 * Agent configuration logic
 */
import { stepCountIs, hasToolCall, type StopCondition, type UIMessage } from 'ai';
import type { createToolRegistry } from '../tools/index';
import type { AgentConfig } from '../types/router';
import type { SessionData } from '../session-store';
import {
  buildPromptOrchestratorPrompt,
  buildConfigEngineerPrompt,
  buildValidatorReporterPrompt,
} from '../prompts';
import type { ConfigBrief } from '../prompts/types';
import { hasConfirmationResponse } from './stop-conditions';
import { extractToolCalls, extractToolResults } from '../utils/step-tools';

/**
 * Extract text content from UIMessage
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

/**
 * Convert toolChoice to provider-compatible format
 * LM Studio only supports string values ('none', 'auto', 'required'), not object format
 * However, LM Studio has issues with malformed JSON when forced to call tools
 * For LM Studio, we return undefined to avoid forcing tool calls and rely on instructions instead
 */
function convertToolChoiceForProvider<T extends ReturnType<typeof createToolRegistry>>(
  toolChoice: { type: 'tool'; toolName: keyof T & string } | 'required' | 'none' | undefined,
): { type: 'tool'; toolName: keyof T & string } | 'required' | 'auto' | 'none' | undefined {
  // Check if using LM Studio (which doesn't support object toolChoice and has JSON generation issues)
  const providerType = (process.env.MODEL_PROVIDER as string) || 'lm-studio';

  if (providerType === 'lm-studio') {
    // LM Studio has issues generating complete JSON when forced to call tools
    // Return undefined to avoid forcing tool calls - rely on instructions and fallback mechanism instead
    // The agent loop has fallback handling that will generate UI state directly if needed
    return undefined;
  }

  // For other providers, convert object format to 'required' if needed
  if (toolChoice && typeof toolChoice === 'object' && 'type' in toolChoice) {
    return 'required';
  }

  return toolChoice;
}

/**
 * Create agent configuration based on session state
 */
export function determineAgentConfig<T extends ReturnType<typeof createToolRegistry>>(
  session: SessionData | undefined,
  messages: UIMessage[],
  context: { cwd?: string; entry?: string; sessionId: string; hasConfirmedPath?: boolean },
): AgentConfig<T> {
  const hasConfirmedPath = context.hasConfirmedPath ?? false;

  // Check if user explicitly requested config generation
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const lastUserMessage = lastMessage && lastMessage.role === 'user'
    ? extractTextFromUIMessage(lastMessage).toLowerCase()
    : '';

  const userRequestedConfig = lastMessage && lastMessage.role === 'user' &&
    (lastUserMessage.includes('generate config') ||
     lastUserMessage.includes('create config') ||
     lastUserMessage.includes('write config') ||
     lastUserMessage.includes('generate a draft') ||
     lastUserMessage.includes('generate draft') ||
     lastUserMessage.includes('draft config') ||
     lastUserMessage.includes('draft sheriff') ||
     lastUserMessage.includes('preview config') ||
     lastUserMessage.includes('show config draft'));

  // Step 0: If user explicitly requests config generation and we have context, use config-engineer
  // even without a brief (it will analyze the project itself)
  if (userRequestedConfig && !session?.brief && context.cwd && context.entry) {
    const minimalBrief: ConfigBrief = {
      targetRepo: context.cwd,
      entryFile: context.entry,
      architecturalGoals: ['Generate configuration based on current project structure'],
      constraints: [],
    };

    const instructions = buildConfigEngineerPrompt(
      {
        cwd: context.cwd,
        entry: context.entry,
        sessionId: context.sessionId,
      },
      minimalBrief,
    );

    // Convert session messages to UIMessage format
    const sessionUIMessages: UIMessage[] = (session?.messages || [])
      .filter((msg) => msg.role !== 'system')
      .map((msg) => {
        const baseTimestamp = Date.now();
        const metadata: Record<string, unknown> = {};
        if (msg.agentRole) {
          metadata.agentRole = msg.agentRole;
        }
        return {
          id: `msg-${baseTimestamp}-${Date.now()}`,
          role: msg.role as 'user' | 'assistant',
          ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
          parts: [{ type: 'text' as const, text: msg.content }],
        };
      });

    const agentMessages: UIMessage[] = [
      ...sessionUIMessages,
      messages[messages.length - 1],
    ];

    return {
      role: 'config-engineer',
      instructions,
      messages: agentMessages,
      maxSteps: 30,
      stopWhen: [stepCountIs(30), hasToolCall('writeConfigDraft')],
      prepareStep: async ({ stepNumber, steps }) => {
        // If we've just analyzed or listed workspaces, drive towards generating a draft
        if (stepNumber > 0 && steps.length > 0) {
          const lastStep = steps[steps.length - 1];
          const calls = extractToolCalls(lastStep);
          const results = extractToolResults(lastStep);
          const hasAnalyze = calls.some(c => c.toolName === 'analyzeProject') || results.some(r => r.toolName === 'analyzeProject');
          const hasValidate = calls.some(c => c.toolName === 'config_validateDetailed') || results.some(r => r.toolName === 'config_validateDetailed');
          const hasPreview = calls.some(c => c.toolName === 'applyConfigPreview') || results.some(r => r.toolName === 'applyConfigPreview');
          const hasDraft = calls.some(c => c.toolName === 'writeConfigDraft') || results.some(r => r.toolName === 'writeConfigDraft');

          // Encourage progressing through validate -> preview -> draft
          if (hasAnalyze && !hasValidate) {
            return { };
          }
          if (hasValidate && !hasPreview) {
            return { };
          }
          if ((hasAnalyze || hasValidate || hasPreview) && !hasDraft) {
            return { };
          }
        }
        return {};
      },
    };
  }

  // Step 1: Use Orchestrator if no project requirements summary exists
  if (!session?.brief) {
    // Use confirmed path from session if available, otherwise use context.cwd
    const confirmedPath = session?.hasConfirmedPath && session?.confirmedPath
      ? session.confirmedPath
      : context.cwd;

    const instructions = buildPromptOrchestratorPrompt({
      cwd: confirmedPath,
      entry: context.entry,
      sessionId: context.sessionId,
      hasConfirmedPath,
      confirmedPath,
    });

    // Use the messages as-is - the prompt will handle directory confirmation and workflow
    // The prompt orchestrator will ask for confirmation first, then proceed based on config existence
    const agentMessages: UIMessage[] = messages;

    // Check if this is the first interaction (no messages or only one user message)
    const isFirstInteraction = agentMessages.length === 0 ||
      (agentMessages.length === 1 && agentMessages[0].role === 'user');

    // Always stop when a uiState question/confirmation is emitted to wait for user input
    const stopConditions: StopCondition<T>[] = [stepCountIs(20), hasConfirmationResponse<T>()];

    return {
      role: 'orchestrator',
      instructions,
      messages: agentMessages,
      maxSteps: 20,
      stopWhen: stopConditions,
      // Force uiState tool call on first step if this is the first interaction
      // Also force uiState after readConfig returns a config
      prepareStep: async ({ stepNumber, steps }) => {
        console.log('[DEBUG] prepareStep called:', { stepNumber, stepsLength: steps.length });

        // On step 0 (first step), force the uiState tool call for confirmation
        if (!hasConfirmedPath && stepNumber === 0 && isFirstInteraction) {
          console.log('[DEBUG] Forcing uiState on step 0 (first interaction)');
          const toolChoice = convertToolChoiceForProvider<T>({ type: 'tool', toolName: 'uiState' as keyof T & string });
          return {
            ...(toolChoice ? { toolChoice } : {}),
          };
        }

        // After readConfig returns a config (step > 0), force uiState with question
        // Only check the LAST step to avoid infinite loops
        if (stepNumber > 0 && steps.length > 0) {
          const lastStep = steps[steps.length - 1];
          const toolCalls = extractToolCalls(lastStep);
          const toolResults = extractToolResults(lastStep);

          console.log('[DEBUG] Checking last step for readConfig:', {
            hasToolCalls: toolCalls.length > 0,
            hasToolResults: toolResults.length > 0,
            toolCalls: toolCalls.map(tc => tc.toolName),
            toolResults: toolResults.map(tr => tr.toolName),
          });

          const hasReadConfigCall = toolCalls.some(tc => tc.toolName === 'readConfig');
          const readConfigResult = toolResults.find(tr => tr.toolName === 'readConfig');

          if ((hasReadConfigCall || readConfigResult) && !(session?.configDecision)) {
            const output = readConfigResult?.output;
            const configContent = typeof output === 'string'
              ? output
              : output && typeof (output as { content?: unknown }).content === 'string'
                ? ((output as { content: string }).content)
                : undefined;

            console.log('[DEBUG] Found readConfig result:', {
              hasOutput: output !== undefined,
              hasContent: typeof configContent === 'string' ? configContent.length > 0 : false,
            });

            if (configContent && configContent.length > 0) {
              const truncatedConfig = configContent.length > 2000
                ? `${configContent.slice(0, 2000)}\n// ... truncated ...`
                : configContent;
              const lastStepHasUiState = toolCalls.some(tc => tc.toolName === 'uiState') ||
                toolResults.some(tr => tr.toolName === 'uiState');

              console.log('[DEBUG] Check for uiState call in last step:', { lastStepHasUiState });

              if (!lastStepHasUiState) {
                console.log('[DEBUG] Forcing uiState tool call after readConfig returned config');
                const guidance = `You have just read an existing sheriff.config.ts from disk. Immediately call the uiState tool with a concise question (no long summary) asking how to proceed. The question MUST include an array "options" with at least two entries, each having "label" and "value" (and optionally "description"). Also include response.actions with a single action to view the existing config, e.g. { type: "showConfig", label: "Show Existing Config", params: { checksum: "[checksum]" } }. Example: { "type": "question", "text": "I found an existing Sheriff configuration. Do you want to modify it or create a new one?", "options": [{ "label": "Modify Existing", "value": "modify" }, { "label": "Create New", "value": "create" }], "multiple": false, "required": true, "actions": [{ "type": "showConfig", "label": "Show Existing Config", "params": { "checksum": "[checksum]" } }] }. Do not call readConfig again before you call uiState. Existing config snippet:\n\n\`\`\`ts\n${truncatedConfig}\`\`\`;\n`;
                const toolChoice = convertToolChoiceForProvider<T>({ type: 'tool', toolName: 'uiState' as keyof T & string });
                return {
                  ...(toolChoice ? { toolChoice } : {}),
                  system: `${instructions}\n\n${guidance}`,
                };
              }
            }
          }

          // After analyzeProject returns, force uiState with project-analysis card
          const analyzeResult = toolResults.find(tr => tr.toolName === 'analyzeProject');
          if (analyzeResult) {
            const lastStepHasUiState = toolCalls.some(tc => tc.toolName === 'uiState') ||
              toolResults.some(tr => tr.toolName === 'uiState');
            if (!lastStepHasUiState) {
              const resultPreview = typeof analyzeResult.output === 'string'
                ? analyzeResult.output.slice(0, 500)
                : JSON.stringify(analyzeResult.output ?? {}, null, 2).slice(0, 500);
              const guidance = `You have just analyzed the repository using analyzeProject. Immediately call the uiState tool with a structured project-analysis response (response.type = "project-analysis"). Keep it concise and populate fields like overview (framework/architecture), domains, sharedModules, taggingStrategy, dependencyRules, currentConfig, and proposedGoals based on the analysis. Include response.actions with at least { type: 'generateConfig', label: 'Generate Config' } and { type: 'showOrgChart', label: 'Visualize Module Structure' }. Do not paste large trees; summarize. Example skeleton: { type: 'project-analysis', text: 'Summary...', data: { overview: { framework: 'Angular', architecture: 'feature-based' }, domains: [...], sharedModules: [...], taggingStrategy: { ... }, dependencyRules: { ... }, currentConfig: { ... }, proposedGoals: [...] }, actions: [{ type: 'generateConfig', label: 'Generate Config' }, { type: 'showOrgChart', label: 'Visualize Module Structure' }] }. Analysis preview (truncated):\n\n${resultPreview}`;
              console.log('[DEBUG] Forcing uiState tool call after analyzeProject');
              const toolChoice = convertToolChoiceForProvider<T>({ type: 'tool', toolName: 'uiState' as keyof T & string });
              return {
                ...(toolChoice ? { toolChoice } : {}),
                system: `${instructions}\n\n${guidance}`,
              };
            }
          }
        }

        if (steps.length > 0) {
          const hasListWorkspaces = steps.some((step) => {
            const calls = extractToolCalls(step);
            const results = extractToolResults(step);
            return calls.some((tc) => tc.toolName === 'listWorkspaces') ||
              results.some((tr) => tr.toolName === 'listWorkspaces');
          });

          const hasAnalyzeProject = steps.some((step) => {
            const calls = extractToolCalls(step);
            const results = extractToolResults(step);
            return calls.some((tc) => tc.toolName === 'analyzeProject') ||
              results.some((tr) => tr.toolName === 'analyzeProject');
          });

          if (!hasListWorkspaces) {
            console.log('[DEBUG] Forcing listWorkspaces tool call to analyze repository');
            const toolChoice = convertToolChoiceForProvider<T>({ type: 'tool', toolName: 'listWorkspaces' as keyof T & string });
            return {
              ...(toolChoice ? { toolChoice } : {}),
            };
          }

          if (hasListWorkspaces && !hasAnalyzeProject) {
            console.log('[DEBUG] Forcing analyzeProject tool call after listWorkspaces');
            const toolChoice = convertToolChoiceForProvider<T>({ type: 'tool', toolName: 'analyzeProject' as keyof T & string });
            return {
              ...(toolChoice ? { toolChoice } : {}),
            };
          }
        }

        return {};
      },
    };
  }

  // Step 2: Use Config Engineer if project requirements summary exists but no proposal
  // OR if user explicitly requests config generation
  if (session?.brief && (session.proposals.length === 0 || userRequestedConfig)) {
    const instructions = buildConfigEngineerPrompt(
      {
        cwd: context.cwd,
        entry: context.entry,
        sessionId: context.sessionId,
      },
      session.brief,
    );

    // Convert session messages to UIMessage format
    const sessionUIMessages: UIMessage[] = session.messages
      .filter((msg) => msg.role !== 'system')
      .map((msg) => {
        const baseTimestamp = Date.now();
        const metadata: Record<string, unknown> = {};
        if (msg.agentRole) {
          metadata.agentRole = msg.agentRole;
        }
        return {
          id: `msg-${baseTimestamp}-${Date.now()}`,
          role: msg.role as 'user' | 'assistant',
          ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
          parts: [{ type: 'text' as const, text: msg.content }],
        };
      });

    const lastMessageText = userRequestedConfig
      ? extractTextFromUIMessage(messages[messages.length - 1])
      : 'Now generate a sheriff.config.ts file based on the project requirements summary. Use MCP tools (readConfig, analyzeProject, writeConfigDraft, config_validateDetailed, applyConfigPreview) to create and validate a working config.';

    const agentMessages: UIMessage[] = [
      ...sessionUIMessages,
      {
        id: `msg-${Date.now()}`,
        role: 'user' as const,
        parts: [{ type: 'text' as const, text: lastMessageText }],
      },
    ];

    return {
      role: 'config-engineer',
      instructions,
      messages: agentMessages,
      maxSteps: 30, // Increased to allow for multiple validation iterations
      stopWhen: [stepCountIs(30), hasToolCall('writeConfigDraft')],
      prepareStep: async ({ stepNumber, steps }) => {
        if (stepNumber > 0 && steps.length > 0) {
          const lastStep = steps[steps.length - 1];
          const calls = extractToolCalls(lastStep);
          const results = extractToolResults(lastStep);
          const hasAnalyze = calls.some(c => c.toolName === 'analyzeProject') || results.some(r => r.toolName === 'analyzeProject');
          const hasValidate = calls.some(c => c.toolName === 'config_validateDetailed') || results.some(r => r.toolName === 'config_validateDetailed');
          const hasPreview = calls.some(c => c.toolName === 'applyConfigPreview') || results.some(r => r.toolName === 'applyConfigPreview');
          const hasDraft = calls.some(c => c.toolName === 'writeConfigDraft') || results.some(r => r.toolName === 'writeConfigDraft');
          if (hasAnalyze && !hasValidate) {
            return { };
          }
          if (hasValidate && !hasPreview) {
            return { };
          }
          if ((hasAnalyze || hasValidate || hasPreview) && !hasDraft) {
            return { };
          }
        }
        return {};
      },
    };
  }

  // Step 3: Use Validator if proposal exists but no report
  if (session?.proposals && session.proposals.length > 0 && session.reports.length === 0) {
    const latestProposal = session.proposals[session.proposals.length - 1];
    const instructions = buildValidatorReporterPrompt(
      {
        cwd: context.cwd,
        entry: context.entry,
        sessionId: context.sessionId,
      },
      latestProposal,
    );

    const agentMessages: UIMessage[] = [
      {
        id: `msg-${Date.now()}`,
        role: 'user' as const,
        parts: [{ type: 'text' as const, text: `Validate the proposed config using analyzeProject and computeAllowedMatrix tools:\n\`\`\`typescript\n${latestProposal.content}\n\`\`\`` }],
      },
    ];

    return {
      role: 'validator-reporter',
      instructions,
      messages: agentMessages,
      maxSteps: 15,
    };
  }

  // Default: Use Orchestrator for general conversation
  const instructions = buildPromptOrchestratorPrompt({
    cwd: context.cwd,
    entry: context.entry,
    sessionId: context.sessionId,
  });

  return {
    role: 'orchestrator',
    instructions,
    messages,
    maxSteps: 15,
  };
}

