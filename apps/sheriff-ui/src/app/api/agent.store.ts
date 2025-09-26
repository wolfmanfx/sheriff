import { HttpClient } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import { Chat } from '@ai-sdk/angular';
import { DefaultChatTransport } from 'ai';
import {
  patchState,
  withProps,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { injectDispatch } from '@ngrx/signals/events';
import type { UIMessage } from 'ai';
import { agentEvents } from './agent.events';


export interface ConfigProposal {
  content: string;
  checksum: string | null;
  rationale?: string;
  index: number;
}

export interface AgentContext {
  cwd?: string;
  entry?: string;
}


export const AgentStore = signalStore(
  { providedIn: 'root' },
  withState({
    sessionId: null as string | null,
    expandedToolParts: new Set<string>(),
    error: null as Error | null,
  }),
  withProps((store) => ({
    _chat: new Chat<UIMessage>({
      transport: new DefaultChatTransport({
        api: '/api/agent/session',
      }),
      onError: (error) => {
        patchState(store, { error: error });
      },
    })
  })),
  withComputed((store) => ({
    messages: computed(() => store._chat.messages),
    isStreaming: computed(() => {
      const status = store._chat.status;
      return status === 'submitted' || status === 'streaming';
    }),
  })),
  withMethods((store, http = inject(HttpClient)) => {
    const dispatchAgentEvent = injectDispatch(agentEvents);
    const formatActionMessage = (
      actionType: string,
      label?: string,
      params?: Record<string, unknown>,
    ): string => {
      const segments: string[] = [`UI action requested: ${actionType}`];

      if (label) {
        segments.push(`Label: ${label}`);
      }

      if (params && Object.keys(params).length > 0) {
        let serialized = '';
        try {
          serialized = JSON.stringify(params, null, 2);
        } catch (error) {
          serialized = `Unable to serialize params: ${String(error)}`;
        }
        segments.push(`Params:\n${serialized}`);
      }

      return segments.join('\n\n');
    };

    const ensureSession = (): string => {
      const existing = store.sessionId();
      if (existing) {
        return existing;
      }
      const sessionId = `session-${Date.now()}`;
      patchState(store, { sessionId });
      return sessionId;
    };

    return {
      sendMessage(text: string, context: AgentContext = {}): void {
        const trimmed = text.trim();
        if (!trimmed) {
          return;
        }

        const sessionId = ensureSession();

        void store._chat
          .sendMessage(
            { text: trimmed },
            {
              body: {
                sessionId,
                context,
              },
            },
          )
          .catch((error) => {
            console.error('Error sending agent message:', error);
          });
      },

      requestSuggestedConfig(
        reason: 'preview' | 'generate' = 'generate',
        context: AgentContext = {},
      ) {
        const prompt =
          reason === 'preview'
            ? 'Generate a draft Sheriff config for preview. Do not ask additional questions or show a project summary. Use MCP tools as needed and return a draft via writeConfigDraft.'
            : 'Please generate config now based on the current project. Do not ask additional questions or show a project summary. Use MCP tools as needed and produce a working draft via writeConfigDraft.';

        this.sendMessage(prompt, context);
      },

      getLatestProposal(): Promise<ConfigProposal | null> {
        const sessionId = store.sessionId();
        if (!sessionId) {
          return Promise.resolve(null);
        }

        return new Promise((resolve) => {
          http.get<ConfigProposal>(`/api/agent/proposal/${sessionId}`).subscribe({
            next: (proposal) => resolve(proposal),
            error: () => resolve(null),
          });
        });
      },

      approveConfig(proposal: ConfigProposal | null | undefined) {
        const sessionId = store.sessionId();
        if (!sessionId || !proposal) {
          console.warn('No config proposal available to approve.');
          return;
        }

        http
          .post('/api/agent/approve-config', {
            sessionId,
            proposalIndex: proposal.index,
          })
          .subscribe({
            next: () => {
              dispatchAgentEvent.configApproved({
                proposalIndex: proposal.index,
              });
            },
            error: (error) => {
              console.error('Error approving config:', error);
            },
          });
      },

      rejectConfig(proposal: ConfigProposal | null | undefined) {
        if (proposal?.checksum) {
          console.info(`Config proposal ${proposal.checksum} rejected.`);
        }
      },

      sendQuestionAnswer(
        answer: string | string[],
        context: AgentContext = {},
      ): void {
        const answerText = Array.isArray(answer) ? answer.join(', ') : answer;
        this.sendMessage(answerText, context);
      },

      async handleAction(
        action: { type: string; label?: string; params?: Record<string, unknown> },
        context: AgentContext = {},
      ): Promise<void> {
        const actionType = action.type?.trim();
        switch (actionType) {
          case 'showConfig':
          case 'viewConfig':
          case 'openConfig':
          case 'previewConfig': {
            const draft = await this.getLatestProposal();
            if (draft) {
              dispatchAgentEvent.initializeConfigPreview({
                content: draft.content,
              });
              dispatchAgentEvent.showAssetView();
              dispatchAgentEvent.ensureConfigAssetSelected();
              setTimeout(() => {
                const event = new CustomEvent('selectConfigAsset');
                window.dispatchEvent(event);
              }, 100);
            } else {
              if (actionType === 'previewConfig') {
                this.requestSuggestedConfig('preview', context);
                return;
              }
              // Fallback: load existing config from backend and open the preview canvas
              dispatchAgentEvent.loadConfig();
              dispatchAgentEvent.showAssetView();
              dispatchAgentEvent.ensureConfigAssetSelected();
              setTimeout(() => {
                const event = new CustomEvent('selectConfigAsset');
                window.dispatchEvent(event);
              }, 200);
            }
            break;
          }
          case 'showOrgChart':
          case 'viewOrgChart':
            dispatchAgentEvent.showAssetView();
            setTimeout(() => {
              const event = new CustomEvent('previewOrgChart');
              window.dispatchEvent(event);
            }, 100);
            break;
          case 'writeConfig':
          case 'generateConfig':
            this.requestSuggestedConfig('generate', context);
            break;
          case 'writeConfigToDisk':
            const proposal = await this.getLatestProposal();
            this.approveConfig(proposal);
            break;
          case 'openAssetView':
          case 'openAssets':
            dispatchAgentEvent.showAssetView();
            break;
          case 'analyzeProject':
            dispatchAgentEvent.analyzeProject();
            break;
          default:
            if (!actionType) {
              return;
            }
            const actionMessage = formatActionMessage(
              actionType,
              action.label,
              action.params,
            );
            this.sendMessage(actionMessage, context);
        }
      },

      toggleToolPart(key: string): void {
        const expanded = new Set(store.expandedToolParts());
        if (expanded.has(key)) {
          expanded.delete(key);
        } else {
          expanded.add(key);
        }
        patchState(store, { expandedToolParts: expanded });
      },

      isToolPartExpanded(key: string): boolean {
        return store.expandedToolParts().has(key);
      },
    };
  }),
);
