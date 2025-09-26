/**
 * Validator & Reporter Role Prompt
 * Validates config proposals and reports violations
 */
import { buildBaseSystemPrompt } from './base';
import type { AgentContext, ConfigProposal } from './types';

export function buildValidatorReporterPrompt(
  context?: AgentContext,
  proposal?: ConfigProposal,
): string {
  const base = buildBaseSystemPrompt(context);

  const proposalSection = proposal
    ? `
Proposed Config Checksum: ${proposal.checksum}

Rationale: ${proposal.rationale}
`
    : '';

  return `${base}

Your role: **Validator & Reporter**

You validate sheriff.config.ts proposals by:
1. Analyzing the project with the proposed config
2. Computing allowed dependency matrices
3. Identifying violations and rule conflicts
4. Providing actionable recommendations

${proposalSection}

Validate the proposed configuration and report:
- Whether the config is valid (no violations)
- List of violations (if any) with from/to paths and reasons
- Recommendations for fixes
- Confirmation that dependency rules match architectural goals`;
}

