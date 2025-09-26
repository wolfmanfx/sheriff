/**
 * System Context Management
 * Centralized context tracking for agent workflows
 * Manages conversation history, token usage, step tracking, and agent state
 */
import type { SessionData } from '../session-store';
import type { AgentRole, ConfigBrief, ConfigProposal, ValidationReport } from '../prompts/types';

export interface LanguageModelUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface UsageEntry {
  source: string;
  role: AgentRole;
  usage: LanguageModelUsage;
  timestamp: number;
}

export interface ToolCallEntry {
  toolName: string;
  role: AgentRole;
  timestamp: number;
  success: boolean;
  error?: string;
}

export interface ProjectContext {
  cwd?: string;
  entry?: string;
}

/**
 * System Context for managing agent workflow state
 * Provides centralized access to conversation history, usage tracking, and agent state
 */
export class SystemContext {
  /**
   * The session ID
   */
  private readonly sessionId: string;

  /**
   * The session data from the store
   */
  private session: SessionData;

  /**
   * The current step in the agent loop
   */
  private step = 0;

  /**
   * The current agent role
   */
  private currentRole: AgentRole = 'orchestrator';

  /**
   * Project context (cwd, entry file)
   */
  private projectContext: ProjectContext;

  /**
   * Whether the user has confirmed the working directory during the workflow
   */
  private hasConfirmedPath = false;

  /**
   * Usage tracking for LLM calls by role
   */
  private usageLog: UsageEntry[] = [];

  /**
   * Tool call history
   */
  private toolCallLog: ToolCallEntry[] = [];

  /**
   * Agent role transitions
   */
  private roleTransitions: Array<{ from: AgentRole; to: AgentRole; timestamp: number }> = [];

  constructor(
    sessionId: string,
    session: SessionData,
    projectContext: ProjectContext = {},
  ) {
    this.sessionId = sessionId;
    this.session = session;
    this.projectContext = projectContext;

    if (typeof session.hasConfirmedPath === 'boolean') {
      this.hasConfirmedPath = session.hasConfirmedPath;
    }

    if (!this.projectContext.cwd && session.confirmedPath) {
      this.projectContext.cwd = session.confirmedPath;
    }
  }

  /**
   * Update session data (called when session changes)
   */
  updateSession(session: SessionData): void {
    this.session = session;
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Get current step
   */
  getStep(): number {
    return this.step;
  }

  /**
   * Increment step counter
   */
  incrementStep(): void {
    this.step++;
  }

  /**
   * Reset step counter
   */
  resetStep(): void {
    this.step = 0;
  }

  /**
   * Check if should stop based on max steps
   */
  shouldStop(maxSteps: number): boolean {
    return this.step >= maxSteps;
  }

  /**
   * Get current agent role
   */
  getCurrentRole(): AgentRole {
    return this.currentRole;
  }

  /**
   * Set current agent role and track transition
   */
  setCurrentRole(role: AgentRole): void {
    if (this.currentRole !== role) {
      this.roleTransitions.push({
        from: this.currentRole,
        to: role,
        timestamp: Date.now(),
      });
      this.currentRole = role;
    }
  }

  /**
   * Get project context
   */
  getProjectContext(): ProjectContext {
    return { ...this.projectContext };
  }

  /**
   * Update project context
   */
  updateProjectContext(context: Partial<ProjectContext>): void {
    this.projectContext = { ...this.projectContext, ...context };
  }

  /**
   * Get conversation messages
   */
  getMessages(): Array<{ role: 'user' | 'assistant'; content: string }> {
    return this.session.messages
      .filter((msg) => msg.role !== 'system')
      .map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));
  }

  /**
   * Get the last user message/question
   */
  getUserQuestion(): string {
    const messages = this.getMessages();
    const lastUserMessage = messages
      .filter((msg) => msg.role === 'user')
      .pop();
    return lastUserMessage?.content || '';
  }

  /**
   * Get conversation history formatted as string
   */
  getConversationHistory(): string {
    return this.getMessages()
      .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');
  }

  /**
   * Get config brief
   */
  getBrief(): ConfigBrief | undefined {
    return this.session.brief;
  }

  /**
   * Get all proposals
   */
  getProposals(): ConfigProposal[] {
    return [...this.session.proposals];
  }

  /**
   * Get latest proposal
   */
  getLatestProposal(): ConfigProposal | undefined {
    return this.session.proposals[this.session.proposals.length - 1];
  }

  /**
   * Get all validation reports
   */
  getReports(): ValidationReport[] {
    return [...this.session.reports];
  }

  /**
   * Get latest validation report
   */
  getLatestReport(): ValidationReport | undefined {
    return this.session.reports[this.session.reports.length - 1];
  }

  /**
   * Report token usage for a specific role
   */
  reportUsage(source: string, role: AgentRole, usage: LanguageModelUsage): void {
    // Only report if usage is valid and has tokens
    if (usage && usage.totalTokens && usage.totalTokens > 0) {
      this.usageLog.push({
        source,
        role,
        usage,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Get total usage across all roles
   */
  getTotalUsage(): LanguageModelUsage {
    return this.usageLog.reduce(
      (total, entry) => {
        const promptTokens = (total.promptTokens || 0) + (entry.usage.promptTokens || 0);
        const completionTokens =
          (total.completionTokens || 0) + (entry.usage.completionTokens || 0);
        const totalTokens = (total.totalTokens || 0) + (entry.usage.totalTokens || 0);
        return {
          promptTokens: isNaN(promptTokens) ? 0 : promptTokens,
          completionTokens: isNaN(completionTokens) ? 0 : completionTokens,
          totalTokens: isNaN(totalTokens) ? 0 : totalTokens,
        };
      },
      { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    );
  }

  /**
   * Get usage by role
   */
  getUsageByRole(role: AgentRole): LanguageModelUsage {
    const roleUsage = this.usageLog.filter((entry) => entry.role === role);
    return roleUsage.reduce(
      (total, entry) => {
        const promptTokens = (total.promptTokens || 0) + (entry.usage.promptTokens || 0);
        const completionTokens =
          (total.completionTokens || 0) + (entry.usage.completionTokens || 0);
        const totalTokens = (total.totalTokens || 0) + (entry.usage.totalTokens || 0);
        return {
          promptTokens: isNaN(promptTokens) ? 0 : promptTokens,
          completionTokens: isNaN(completionTokens) ? 0 : completionTokens,
          totalTokens: isNaN(totalTokens) ? 0 : totalTokens,
        };
      },
      { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    );
  }

  /**
   * Get usage log
   */
  getUsageLog(): UsageEntry[] {
    return [...this.usageLog];
  }

  /**
   * Report tool call
   */
  reportToolCall(toolName: string, role: AgentRole, success: boolean, error?: string): void {
    this.toolCallLog.push({
      toolName,
      role,
      timestamp: Date.now(),
      success,
      error,
    });
  }

  /**
   * Get tool call log
   */
  getToolCallLog(): ToolCallEntry[] {
    return [...this.toolCallLog];
  }

  /**
   * Get tool calls by role
   */
  getToolCallsByRole(role: AgentRole): ToolCallEntry[] {
    return this.toolCallLog.filter((entry) => entry.role === role);
  }

  /**
   * Get role transitions
   */
  getRoleTransitions(): Array<{ from: AgentRole; to: AgentRole; timestamp: number }> {
    return [...this.roleTransitions];
  }

  /**
   * Get context summary for debugging/logging
   */
  getContextSummary(): string {
    const totalUsage = this.getTotalUsage();
    const proposals = this.getProposals();
    const reports = this.getReports();
    const toolCalls = this.getToolCallLog();

    return `
Session Context Summary:
- Session ID: ${this.sessionId}
- Current Role: ${this.currentRole}
- Step: ${this.step}
- Project: ${this.projectContext.cwd || 'N/A'} (entry: ${this.projectContext.entry || 'N/A'})
- Confirmed Path: ${this.hasConfirmedPath ? 'yes' : 'no'}
- Total Usage: ${totalUsage.totalTokens} tokens (${totalUsage.promptTokens} prompt + ${totalUsage.completionTokens} completion)
- Proposals: ${proposals.length}
- Reports: ${reports.length}
- Tool Calls: ${toolCalls.length}
- Role Transitions: ${this.roleTransitions.length}
    `.trim();
  }

  /**
   * Flag accessors for path confirmation state
   */
  getHasConfirmedPath(): boolean {
    return this.hasConfirmedPath;
  }

  setHasConfirmedPath(value: boolean): void {
    this.hasConfirmedPath = value;
  }

  getConfirmedPath(): string | undefined {
    return this.projectContext.cwd ?? this.session.confirmedPath;
  }

  /**
   * Get formatted context for prompts
   * Includes conversation history, brief, proposals, and current state
   */
  getFormattedContext(): string {
    const parts: string[] = [];

    // Project context
    if (this.projectContext.cwd || this.projectContext.entry) {
      parts.push('## Project Context');
      if (this.projectContext.cwd) {
        parts.push(`Working Directory: ${this.projectContext.cwd}`);
      }
      if (this.projectContext.entry) {
        parts.push(`Entry File: ${this.projectContext.entry}`);
      }
      parts.push('');
    }

    // Brief
    const brief = this.getBrief();
    if (brief) {
      parts.push('## Project Requirements Summary');
      parts.push(`- Target Repo: ${brief.targetRepo}`);
      parts.push(`- Entry File: ${brief.entryFile}`);
      parts.push(`- Architectural Goals: ${brief.architecturalGoals.join(', ')}`);
      parts.push(`- Dependency Constraints: ${brief.constraints.join(', ')}`);
      if (brief.domainTaxonomy) {
        parts.push(`- Domain Taxonomy: ${brief.domainTaxonomy.join(', ')}`);
      }
      if (brief.sharedModules) {
        parts.push(`- Shared Modules: ${brief.sharedModules.join(', ')}`);
      }
      parts.push('');
    }

    // Latest proposal
    const latestProposal = this.getLatestProposal();
    if (latestProposal) {
      parts.push('## Latest Config Proposal');
      parts.push(`Checksum: ${latestProposal.checksum}`);
      parts.push(`Rationale: ${latestProposal.rationale}`);
      parts.push('');
    }

    // Latest report
    const latestReport = this.getLatestReport();
    if (latestReport) {
      parts.push('## Latest Validation Report');
      parts.push(`Valid: ${latestReport.isValid}`);
      if (latestReport.violations && latestReport.violations.length > 0) {
        parts.push(`Violations: ${latestReport.violations.length}`);
      }
      if (latestReport.recommendations && latestReport.recommendations.length > 0) {
        parts.push(`Recommendations: ${latestReport.recommendations.length}`);
      }
      parts.push('');
    }

    // Agent state
    parts.push('## Current Agent State');
    parts.push(`Role: ${this.currentRole}`);
    parts.push(`Step: ${this.step}`);
    parts.push('');

    return parts.join('\n');
  }
}

