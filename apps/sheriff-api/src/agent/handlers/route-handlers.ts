/**
 * Route handlers for agent endpoints
 */
import type { Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { sessionStore } from '../session-store';
import { SystemContext } from '../context/system-context';
import type { ApproveConfigRequest } from '../types/router';

/**
 * GET /api/agent/context/:sessionId
 * Get system context summary for a session
 */
export function handleGetContext(req: Request, res: Response): void {
  const { sessionId } = req.params;
  const session = sessionStore.getSession(sessionId);

  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  const systemContext = new SystemContext(sessionId, session);
  const totalUsage = systemContext.getTotalUsage();
  const usageByRole = {
    orchestrator: systemContext.getUsageByRole('orchestrator'),
    'config-engineer': systemContext.getUsageByRole('config-engineer'),
    'validator-reporter': systemContext.getUsageByRole('validator-reporter'),
  };

  res.json({
    sessionId,
    step: systemContext.getStep(),
    currentRole: systemContext.getCurrentRole(),
    projectContext: systemContext.getProjectContext(),
    totalUsage,
    usageByRole,
    toolCalls: systemContext.getToolCallLog(),
    roleTransitions: systemContext.getRoleTransitions(),
    proposals: systemContext.getProposals().length,
    reports: systemContext.getReports().length,
    summary: systemContext.getContextSummary(),
  });
}

/**
 * GET /api/agent/proposal/:sessionId
 * Get latest proposal from session
 */
export function handleGetProposal(req: Request, res: Response): void {
  const { sessionId } = req.params;
  const { proposalIndex } = req.query;
  const session = sessionStore.getSession(sessionId);

  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  const index = proposalIndex ? parseInt(String(proposalIndex), 10) : session.proposals.length - 1;
  const proposal = session.proposals[index];

  if (!proposal) {
    res.status(404).json({ error: 'Proposal not found' });
    return;
  }

  res.json({
    content: proposal.content,
    checksum: proposal.checksum,
    rationale: proposal.rationale,
    index,
  });
}

/**
 * POST /api/agent/approve-config
 * Approve and write config to disk
 */
export async function handleApproveConfig(req: Request, res: Response): Promise<void> {
  try {
    const { sessionId, proposalIndex = 0, cwd } = req.body as ApproveConfigRequest;

    const session = sessionStore.getSession(sessionId);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const proposal = session.proposals[proposalIndex];
    if (!proposal) {
      res.status(404).json({ error: 'Proposal not found' });
      return;
    }

    // Write config to disk
    const targetCwd = cwd || process.env.SHERIFF_ROOT || process.cwd();
    const configPath = path.join(targetCwd, 'sheriff.config.ts');
    fs.writeFileSync(configPath, proposal.content, {
      encoding: 'utf-8',
    });

    res.json({ ok: true, checksum: proposal.checksum });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
}




