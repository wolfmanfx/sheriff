/**
 * Agent Orchestrator
 * Coordinates multi-agent workflow: Prompt Orchestrator → Config Engineer → Validator & Reporter
 */
import { Experimental_Agent as Agent, stepCountIs, hasToolCall } from 'ai';
import type { SheriffApiController } from '../controller';
import { createToolRegistry } from './tools';
import {
  buildPromptOrchestratorPrompt,
  buildConfigEngineerPrompt,
  buildValidatorReporterPrompt,
  type ConfigBrief,
  type ConfigProposal,
  type ValidationReport,
} from './prompts';
import { sessionStore } from './session-store';
import { createModelFromProviderConfig } from '../shared/llm-api-provider-config';

export interface OrchestrationContext {
  controller: SheriffApiController;
  sessionId: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  cwd?: string;
  entry?: string;
}

export interface OrchestrationResult {
  brief?: ConfigBrief;
  proposal?: ConfigProposal;
  report?: ValidationReport;
}

/**
 * Telemetry: Log orchestration events
 */
interface OrchestrationTelemetry {
  sessionId: string;
  timestamp: number;
  event: 'orchestration_start' | 'agent_transition' | 'orchestration_complete' | 'error';
  agentRole?: 'orchestrator' | 'config-engineer' | 'validator-reporter';
  duration?: number;
  error?: string;
}

function logOrchestrationTelemetry(telemetry: OrchestrationTelemetry): void {
  const logEntry = {
    ...telemetry,
    timestamp: new Date(telemetry.timestamp).toISOString(),
  };
  console.log('[ORCHESTRATION]', JSON.stringify(logEntry));
}

/**
 * Orchestrate multi-agent workflow
 */
export async function orchestrateAgents(
  context: OrchestrationContext,
): Promise<OrchestrationResult> {
  const startTime = Date.now();

  logOrchestrationTelemetry({
    sessionId: context.sessionId,
    timestamp: startTime,
    event: 'orchestration_start',
  });

  const tools = createToolRegistry();

  // Ensure session exists
  let session = sessionStore.getSession(context.sessionId);
  if (!session) {
    session = sessionStore.createSession(context.sessionId);
  }

  const result: OrchestrationResult = {};

  // Create model instance
  const model = createModelFromProviderConfig();

  const latestUserMessage = [...context.messages]
    .reverse()
    .find((msg) => msg.role === 'user')?.content?.toLowerCase() ?? '';

  const userRequestedNewProposal = /\b(generate|regenerate|create|draft)\b[\s\S]{0,40}\b(config|configuration)\b/.test(latestUserMessage)
    || latestUserMessage.includes('sheriff configuration')
    || latestUserMessage.includes('config draft')
    || latestUserMessage.includes('suggested config');

  // Step 1: Prompt Orchestrator Agent → Extract ConfigBrief
  if (!session.brief) {
    logOrchestrationTelemetry({
      sessionId: context.sessionId,
      timestamp: Date.now(),
      event: 'agent_transition',
      agentRole: 'orchestrator',
    });
    const orchestratorAgent = new Agent({
      model,
      instructions: buildPromptOrchestratorPrompt({
        cwd: context.cwd,
        entry: context.entry,
        sessionId: context.sessionId,
      }),
      tools,
      stopWhen: [stepCountIs(10), hasToolCall('writeConfigDraft')],
    });

    const orchestratorResult = await orchestratorAgent.generate({
      messages: context.messages,
    });

    const orchestratorResponse = orchestratorResult.text;

    // Extract brief from response - parse structured JSON if present
    try {
      const briefMatch = orchestratorResponse.match(
        /```json\s*([\s\S]*?)\s*```/,
      );
      if (briefMatch) {
        const briefData = JSON.parse(briefMatch[1]);
        const brief: ConfigBrief = {
          targetRepo: briefData.targetRepo || context.cwd || '',
          entryFile: briefData.entryFile || context.entry || '',
          architecturalGoals: Array.isArray(briefData.architecturalGoals)
            ? briefData.architecturalGoals
            : [],
          constraints: Array.isArray(briefData.constraints)
            ? briefData.constraints
            : [],
          domainTaxonomy: briefData.domainTaxonomy
            ? Array.isArray(briefData.domainTaxonomy)
              ? briefData.domainTaxonomy
              : []
            : undefined,
          sharedModules: briefData.sharedModules
            ? Array.isArray(briefData.sharedModules)
              ? briefData.sharedModules
              : []
            : undefined,
        };
        sessionStore.setBrief(context.sessionId, brief);
        result.brief = brief;
      }
    } catch {
      // If parsing fails, store raw response for manual review
      // The agent will need to be prompted again to provide structured output
    }
    sessionStore.addMessage(context.sessionId, {
      role: 'assistant',
      content: orchestratorResponse,
      agentRole: 'orchestrator',
    });
  }

  // Step 2: Config Engineer Agent → Generate ConfigProposal
  if (session.brief && (session.proposals.length === 0 || userRequestedNewProposal)) {
    logOrchestrationTelemetry({
      sessionId: context.sessionId,
      timestamp: Date.now(),
      event: 'agent_transition',
      agentRole: 'config-engineer',
    });
    const configAgent = new Agent({
      model,
      instructions: buildConfigEngineerPrompt(
        {
          cwd: context.cwd,
          entry: context.entry,
          sessionId: context.sessionId,
        },
        session.brief,
      ),
      tools,
      stopWhen: [stepCountIs(10), hasToolCall('writeConfigDraft')],
    });

    const configResult = await configAgent.generate({
      messages: [
        ...session.messages,
        {
          role: 'user' as const,
          content: 'Generate a sheriff.config.ts based on the brief.',
        },
      ],
    });

    const configResponse = configResult.text;
    let proposalContent = '';
    let proposalChecksum = '';

    // Extract proposal from tool calls if present
    // Tool results are in the steps, not directly on toolCalls
    if (configResult.steps) {
      for (const step of configResult.steps) {
        if (step.toolResults) {
          for (const toolResult of step.toolResults) {
            if (toolResult.toolName === 'writeConfigDraft') {
              const result = toolResult.output as { content?: string; checksum?: string };
              if (result?.content) proposalContent = result.content;
              if (result?.checksum) proposalChecksum = result.checksum;
            }
          }
        }
      }
    }

    if (proposalContent && proposalChecksum) {
      const proposal: ConfigProposal = {
        content: proposalContent,
        rationale: configResponse,
        checksum: proposalChecksum,
      };
      sessionStore.addProposal(context.sessionId, proposal);
      result.proposal = proposal;
    }

    if (configResponse?.trim()) {
      sessionStore.addMessage(context.sessionId, {
        role: 'assistant',
        content: configResponse,
        agentRole: 'config-engineer',
      });
    }
  }

  // Step 3: Validator & Reporter Agent → Create ValidationReport
  const latestProposal = session.proposals[session.proposals.length - 1];
  if (latestProposal && session.reports.length === 0) {
    logOrchestrationTelemetry({
      sessionId: context.sessionId,
      timestamp: Date.now(),
      event: 'agent_transition',
      agentRole: 'validator-reporter',
    });
    const validatorAgent = new Agent({
      model,
      instructions: buildValidatorReporterPrompt(
        {
          cwd: context.cwd,
          entry: context.entry,
          sessionId: context.sessionId,
        },
        latestProposal,
      ),
      tools,
      stopWhen: [stepCountIs(10)],
    });

    const validatorResult = await validatorAgent.generate({
      messages: [
        {
          role: 'user' as const,
          content: `Validate the proposed config:\n\`\`\`typescript\n${latestProposal.content}\n\`\`\``,
        },
      ],
    });

    const validationResponse = validatorResult.text;

    // Parse validation report - extract structured data from response
    const violations: Array<{ from: string; to: string; reason: string }> = [];
    const recommendations: string[] = [];

    // Try to extract JSON structure if present
    try {
      const jsonMatch = validationResponse.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        const reportData = JSON.parse(jsonMatch[1]);
        if (Array.isArray(reportData.violations)) {
          violations.push(...reportData.violations);
        }
        if (Array.isArray(reportData.recommendations)) {
          recommendations.push(...reportData.recommendations);
        }
      }
    } catch {
      // Fallback: parse violations from text format
      const violationLines = validationResponse.split('\n').filter((line) =>
        line.toLowerCase().includes('violation') ||
        line.includes('→') ||
        line.includes('cannot'),
      );
      for (const line of violationLines) {
        const match = line.match(/(\S+)\s*→\s*(\S+)\s*[:]\s*(.+)/);
        if (match) {
          violations.push({
            from: match[1],
            to: match[2],
            reason: match[3] || 'Violation detected',
          });
        }
      }

      // Extract recommendations from bullet points
      const recLines = validationResponse.split('\n').filter((line) =>
        line.trim().startsWith('-') || line.trim().startsWith('*'),
      );
      recommendations.push(...recLines.map((line) => line.trim().slice(1).trim()));
    }

    const report: ValidationReport = {
      isValid: violations.length === 0,
      violations,
      recommendations:
        recommendations.length > 0
          ? recommendations
          : validationResponse
              .split('\n')
              .filter((line) => line.trim().length > 0)
              .slice(0, 5),
    };

    sessionStore.addReport(context.sessionId, report);
    result.report = report;
  }

  const duration = Date.now() - startTime;
  logOrchestrationTelemetry({
    sessionId: context.sessionId,
    timestamp: Date.now(),
    event: 'orchestration_complete',
    duration,
  });

  return result;
}

