import type { SessionData } from './types';

export function createSession(sessionId?: string): SessionData {
  return {
    sessionId: sessionId || '',
    state: 'INIT',
    data: { domains: [], types: [], hasShared: false, domainBasePath: undefined },
  };
}

