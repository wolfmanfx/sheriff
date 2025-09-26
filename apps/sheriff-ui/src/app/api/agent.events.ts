import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';

export const agentEvents = eventGroup({
  source: 'Agent',
  events: {
    showAssetView: type<void>(),
    ensureConfigAssetSelected: type<void>(),
    initializeConfigPreview: type<{ content: string }>(),
    loadConfig: type<void>(),
    analyzeProject: type<void>(),
    configApproved: type<{ proposalIndex: number }>(),
  },
});

export type AgentEvents = typeof agentEvents;

