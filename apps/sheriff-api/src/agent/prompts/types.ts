/**
 * Prompt Types
 * Types for agent context and roles
 */

export interface AgentContext {
  cwd?: string;
  entry?: string;
  sessionId?: string;
  brief?: ConfigBrief;
  proposal?: ConfigProposal;
  hasConfirmedPath?: boolean;
  confirmedPath?: string;
}

export type AgentRole = 'orchestrator' | 'config-engineer' | 'validator-reporter';

/**
 * Project Requirements Summary (ConfigBrief)
 * A structured summary of project requirements needed to generate a Sheriff configuration.
 * Contains project location, architectural goals, dependency constraints, and module organization.
 */
export interface ConfigBrief {
  targetRepo: string;
  entryFile: string;
  architecturalGoals: string[];
  constraints: string[];
  domainTaxonomy?: string[];
  sharedModules?: string[];
}

export interface ConfigProposal {
  content: string;
  rationale: string;
  checksum: string;
}

export interface ValidationReport {
  isValid: boolean;
  violations: Array<{
    from: string;
    to: string;
    reason: string;
  }>;
  recommendations: string[];
}

