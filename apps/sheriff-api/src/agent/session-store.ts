/**
 * Session Store
 * In-memory session persistence for agent conversations
 */
import type {
  AgentRole,
  ConfigBrief,
  ConfigProposal,
  ValidationReport,
} from './prompts/types';

export interface SessionMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  agentRole?: AgentRole;
  toolCalls?: Array<{
    toolName: string;
    args: unknown;
    result?: unknown;
  }>;
}

export interface SessionData {
  sessionId: string;
  messages: SessionMessage[];
  createdAt: Date;
  updatedAt: Date;
  brief?: ConfigBrief;
  proposals: ConfigProposal[];
  reports: ValidationReport[];
  confirmedPath?: string;
  hasConfirmedPath?: boolean;
  configDecision?: 'modify' | 'create';
}

export class InMemorySessionStore {
  private sessions = new Map<string, SessionData>();

  /**
   * Create a new session
   */
  createSession(sessionId: string): SessionData {
    const session: SessionData = {
      sessionId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      proposals: [],
      reports: [],
      confirmedPath: undefined,
      hasConfirmedPath: false,
      configDecision: undefined,
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): SessionData | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Update session
   */
  updateSession(sessionId: string, updates: Partial<SessionData>): void {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    const definedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined),
    ) as Partial<SessionData>;
    Object.assign(session, definedUpdates, { updatedAt: new Date() });
  }

  /**
   * Add message to session
   */
  addMessage(sessionId: string, message: SessionMessage): void {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    session.messages.push(message);
    session.updatedAt = new Date();
  }


  /**
   * Set brief for session
   */
  setBrief(sessionId: string, brief: ConfigBrief): void {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    session.brief = brief;
    session.updatedAt = new Date();
  }

  /**
   * Add proposal to session
   */
  addProposal(sessionId: string, proposal: ConfigProposal): void {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    session.proposals.push(proposal);
    session.updatedAt = new Date();
  }

  /**
   * Add validation report to session
   */
  addReport(sessionId: string, report: ValidationReport): void {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    session.reports.push(report);
    session.updatedAt = new Date();
  }

  /**
   * Delete session
   */
  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * List all sessions
   */
  listSessions(): SessionData[] {
    return Array.from(this.sessions.values());
  }
}

// Singleton instance
export const sessionStore = new InMemorySessionStore();

