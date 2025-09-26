import { EvalSuite } from 'evalite';

/**
 * Base configuration for Sheriff AI Agent evalite tests
 */
export const sheriffEvalConfig = {
  model: {
    provider: process.env.MODEL_PROVIDER || 'lm-studio',
    baseUrl: process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234/v1',
    apiKey: process.env.LM_STUDIO_API_KEY,
    model: process.env.LM_STUDIO_CHAT_MODEL || 'gpt-4o',
  },
  testProject: process.env.TEST_PROJECT || 'test-projects/angular-iv',
  sheriffApiUrl: process.env.SHERIFF_API_URL || 'http://localhost:3000',
};

/**
 * Base scorer for config validity
 */
export function configValidityScorer(output: string, expected?: unknown): number {
  try {
    // Try to parse as TypeScript config
    const configMatch = output.match(/```typescript\s*([\s\S]*?)\s*```/);
    if (configMatch) {
      const configContent = configMatch[1];
      
      // Check for basic Sheriff config structure
      const hasModules = configContent.includes('modules:');
      const hasTags = configContent.includes('tags:');
      const hasDepRules = configContent.includes('depRules:');
      
      if (hasModules && hasTags && hasDepRules) {
        return 1.0;
      }
      if (hasModules || hasTags || hasDepRules) {
        return 0.5;
      }
    }
    return 0.0;
  } catch {
    return 0.0;
  }
}

/**
 * Scorer for rule compliance (no violations)
 */
export function ruleComplianceScorer(output: string, violations: string[]): number {
  if (violations.length === 0) {
    return 1.0;
  }
  
  // Check if output mentions violations
  const lowerOutput = output.toLowerCase();
  const hasViolations = violations.some((v) => lowerOutput.includes(v.toLowerCase()));
  
  if (hasViolations) {
    return 0.0;
  }
  
  return 1.0;
}

/**
 * Scorer for answer relevancy
 */
export function relevancyScorer(output: string, expectedKeywords: string[]): number {
  const lowerOutput = output.toLowerCase();
  const matchedKeywords = expectedKeywords.filter((keyword) =>
    lowerOutput.includes(keyword.toLowerCase()),
  ).length;
  
  return matchedKeywords / expectedKeywords.length;
}

