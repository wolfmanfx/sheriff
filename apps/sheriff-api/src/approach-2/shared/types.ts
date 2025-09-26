import type { UIMessage } from 'ai';
import { createModelFromProviderConfig } from '../../shared/llm-api-provider-config';

export type State = 'INIT' | 'STRUCTURE' | 'DEPENDENCY_RULES' | 'DONE';

export type Model = ReturnType<typeof createModelFromProviderConfig>;

export interface SessionData {
  sessionId: string;
  state: State;
  cwd?: string;
  entry?: string;
  analysisResult?: unknown;
  data: {
    domains: string[];
    types: string[];
    hasShared: boolean;
    domainBasePath?: string;
    domainIsolation?: boolean;
    typeHierarchy?: Record<string, string[]>;
    sharedAccess?: boolean;
    rootAccess?: string[];
  };
}

export interface DependencyRules {
  domainIsolation?: boolean;
  typeHierarchy?: Record<string, string[]>;
  sharedAccess?: boolean;
  rootAccess?: string[];
}

export interface ChatRequest {
  messages: UIMessage[];
  sessionId?: string;
}

export interface ChatResponse {
  message: string;
  config?: string;
  isDone: boolean;
}

export interface ChatHandlerContext {
  sessions: Map<string, SessionData>;
  model: Model;
}

export interface ConfigData {
  domains: string[];
  types: string[];
  hasShared: boolean;
  domainBasePath?: string;
  domainIsolation?: boolean;
  typeHierarchy?: Record<string, string[]>;
  sharedAccess?: boolean;
  rootAccess?: string[];
}

