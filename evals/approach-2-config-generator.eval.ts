import { evalite, createScorer } from 'evalite';
import { generateConfig } from '../apps/sheriff-api/src/approach-2/config-generator';
import type { ConfigData } from '../apps/sheriff-api/src/approach-2/config-generation-prompts';
import { createModelFromProviderConfig } from '../apps/sheriff-api/src/shared/llm-api-provider-config';
import { sheriffEvalConfig } from './config';

interface Approach2GeneratorInput {
  configData: ConfigData;
}

interface Approach2GeneratorExpected {
  mustContain: string[];
  mustNotContain: string[];
  requirePlaceholders: boolean;
  requireValidProperties: boolean;
  requireDomainRule: boolean;
  requireTypeHierarchy?: boolean;
  requireRootRule: boolean;
  requireNoTagRule: boolean;
}

/**
 * Scorer for placeholder usage
 */
const placeholderScorer = createScorer('placeholder-usage', ({ output, expected }) => {
  const expectations = expected as Approach2GeneratorExpected;
  if (!expectations.requirePlaceholders) {
    return 1.0;
  }

  const config = output as string;
  const hasDomainPlaceholder = /<domain>/.test(config);
  const hasTypePlaceholder = /<type>/.test(config);
  const hasHardcodedDomain = /['"]src\/app\/[^<]+/.test(config) && !/<domain>/.test(config);
  const hasHardcodedType = /['"]src\/app\/[^<]+\/[^<]+['"]/.test(config) && !/<type>/.test(config);

  if (hasHardcodedDomain || hasHardcodedType) {
    return 0.0; // Hardcoded values are wrong
  }

  if (hasDomainPlaceholder && hasTypePlaceholder) {
    return 1.0;
  }

  return 0.5; // Partial placeholder usage
});

/**
 * Scorer for valid properties only
 */
const validPropertiesScorer = createScorer('valid-properties', ({ output, expected }) => {
  const expectations = expected as Approach2GeneratorExpected;
  if (!expectations.requireValidProperties) {
    return 1.0;
  }

  const config = output as string;
  const invalidProperties = [
    'domainIsolation',
    'typeHierarchy',
    'sharedAccess',
    'rootAccess',
  ];

  const hasInvalidProperty = invalidProperties.some((prop) => {
    const regex = new RegExp(`['"]${prop}['"]\\s*[:=]`, 'u');
    return regex.test(config);
  });

  if (hasInvalidProperty) {
    return 0.0;
  }

  // Check for valid properties
  const hasModules = /modules\s*:/.test(config);
  const hasDepRules = /depRules\s*:/.test(config);

  if (hasModules && hasDepRules) {
    return 1.0;
  }

  return 0.5;
});

/**
 * Scorer for no markdown code blocks
 */
const noMarkdownScorer = createScorer('no-markdown', ({ output }) => {
  const config = output as string;
  const hasMarkdownBlock = /```/.test(config);
  const startsWithImport = /^\s*import/.test(config.trim());

  if (hasMarkdownBlock) {
    return 0.0;
  }

  if (startsWithImport) {
    return 1.0;
  }

  return 0.5;
});

/**
 * Scorer for required content
 */
const contentScorer = createScorer('required-content', ({ output, expected }) => {
  const expectations = expected as Approach2GeneratorExpected;
  const config = output as string;
  const lowerConfig = config.toLowerCase();

  let score = 0.0;
  let maxScore = 0.0;

  // Check must contain
  for (const keyword of expectations.mustContain) {
    maxScore += 1.0;
    if (lowerConfig.includes(keyword.toLowerCase())) {
      score += 1.0;
    }
  }

  // Check must not contain
  for (const keyword of expectations.mustNotContain) {
    maxScore += 1.0;
    if (!lowerConfig.includes(keyword.toLowerCase())) {
      score += 1.0;
    }
  }

  return maxScore === 0 ? 1.0 : score / maxScore;
});

/**
 * Scorer for domain rule correctness
 */
const domainRuleScorer = createScorer('domain-rule', ({ output, expected, input }) => {
  const expectations = expected as Approach2GeneratorExpected;
  if (!expectations.requireDomainRule) {
    return 1.0;
  }

  const config = output as string;
  const configData = (input as Approach2GeneratorInput).configData;
  const hasDomainRule = /['"]domain:\*['"]\s*:/.test(config);

  if (!hasDomainRule) {
    return 0.0;
  }

  // Check domain rule logic based on domainIsolation and sharedAccess
  const domainIsolation = configData.domainIsolation !== false;
  const sharedAccess = configData.sharedAccess !== false;

  if (domainIsolation && sharedAccess) {
    // Should be: 'domain:*': [sameTag, 'domain:shared']
    const hasSameTag = /sameTag/.test(config);
    const hasSharedDomain = /['"]domain:shared['"]/.test(config);
    return hasSameTag && hasSharedDomain ? 1.0 : 0.5;
  }

  if (domainIsolation && !sharedAccess) {
    // Should be: 'domain:*': sameTag
    const hasSameTag = /sameTag/.test(config);
    const hasWildcard = /['"]domain:\*['"]\s*:\s*['"]domain:\*['"]/.test(config);
    return hasSameTag && !hasWildcard ? 1.0 : 0.5;
  }

  // domainIsolation === false: Should be 'domain:*': 'domain:*'
  const hasWildcard = /['"]domain:\*['"]\s*:\s*['"]domain:\*['"]/.test(config);
  return hasWildcard ? 1.0 : 0.5;
});

/**
 * Scorer for type hierarchy rules
 */
const typeHierarchyScorer = createScorer('type-hierarchy', ({ output, expected, input }) => {
  const expectations = expected as Approach2GeneratorExpected;
  if (!expectations.requireTypeHierarchy) {
    return 1.0;
  }

  const config = output as string;
  const configData = (input as Approach2GeneratorInput).configData;
  const typeHierarchy = configData.typeHierarchy || {};

  if (Object.keys(typeHierarchy).length === 0) {
    return 1.0;
  }

  // Check if type hierarchy rules are present
  let foundRules = 0;
  for (const [parentType, childTypes] of Object.entries(typeHierarchy)) {
    const typeRulePattern = new RegExp(`['"]type:${parentType}['"]\\s*:\\s*\\[`, 'u');
    if (typeRulePattern.test(config)) {
      // Check if child types are mentioned
      const allChildrenFound = childTypes.every((childType) =>
        new RegExp(`['"]type:${childType}['"]`, 'u').test(config),
      );
      if (allChildrenFound) {
        foundRules += 1;
      }
    }
  }

  const totalRules = Object.keys(typeHierarchy).length;
  return totalRules === 0 ? 1.0 : foundRules / totalRules;
});

/**
 * Scorer for root and noTag rules
 */
const rootAndNoTagScorer = createScorer('root-noTag-rules', ({ output, expected }) => {
  const expectations = expected as Approach2GeneratorExpected;
  const config = output as string;

  let score = 0.0;
  let maxScore = 0.0;

  if (expectations.requireRootRule) {
    maxScore += 1.0;
    const hasRootRule = /\broot\s*:/.test(config);
    if (hasRootRule) {
      score += 1.0;
    }
  }

  if (expectations.requireNoTagRule) {
    maxScore += 1.0;
    const hasNoTagRule = /\bnoTag\s*:/.test(config);
    if (hasNoTagRule) {
      score += 1.0;
    }
  }

  return maxScore === 0 ? 1.0 : score / maxScore;
});

/**
 * Test suite for approach-2 config generator
 * Tests the generator's ability to create valid Sheriff configs with placeholders
 */
export const approach2ConfigGeneratorSuite = evalite('approach-2-config-generator', {
  data: async () => [
    {
      input: {
        configData: {
          domains: ['customers', 'bookings'],
          types: ['feature', 'data', 'model'],
          hasShared: true,
          domainBasePath: 'src/app',
          domainIsolation: true,
          sharedAccess: true,
          rootAccess: ['feature'],
        },
      } satisfies Approach2GeneratorInput,
      expected: {
        mustContain: [
          'import',
          'SheriffConfig',
          '@softarc/sheriff-core',
          'modules:',
          'depRules:',
          'enableBarrelLess',
          'sameTag',
          'domain:shared',
          'root',
          'noTag',
        ],
        mustNotContain: ['domainIsolation', 'typeHierarchy', 'sharedAccess', 'rootAccess', '```'],
        requirePlaceholders: true,
        requireValidProperties: true,
        requireDomainRule: true,
        requireRootRule: true,
        requireNoTagRule: true,
      } satisfies Approach2GeneratorExpected,
    },
    {
      input: {
        configData: {
          domains: ['orders', 'payments'],
          types: ['ui', 'feature', 'data'],
          hasShared: false,
          domainBasePath: 'src/app',
          domainIsolation: true,
          sharedAccess: false,
          rootAccess: ['feature'],
          typeHierarchy: {
            ui: ['feature'],
            feature: ['data'],
          },
        },
      } satisfies Approach2GeneratorInput,
      expected: {
        mustContain: [
          'import',
          'SheriffConfig',
          'modules:',
          'depRules:',
          'sameTag',
          'type:ui',
          'type:feature',
          'type:data',
        ],
        mustNotContain: ['domainIsolation', 'typeHierarchy', 'sharedAccess', 'rootAccess', '```', 'domain:shared'],
        requirePlaceholders: true,
        requireValidProperties: true,
        requireDomainRule: true,
        requireTypeHierarchy: true,
        requireRootRule: true,
        requireNoTagRule: true,
      } satisfies Approach2GeneratorExpected,
    },
    {
      input: {
        configData: {
          domains: ['products'],
          types: ['feature'],
          hasShared: true,
          domainBasePath: 'src',
          domainIsolation: false,
          sharedAccess: true,
          rootAccess: ['feature'],
        },
      } satisfies Approach2GeneratorInput,
      expected: {
        mustContain: [
          'import',
          'SheriffConfig',
          'modules:',
          'depRules:',
          'domain:*',
          'domain:shared',
        ],
        mustNotContain: ['domainIsolation', 'typeHierarchy', 'sharedAccess', 'rootAccess', '```'],
        requirePlaceholders: true,
        requireValidProperties: true,
        requireDomainRule: true,
        requireRootRule: true,
        requireNoTagRule: true,
      } satisfies Approach2GeneratorExpected,
    },
  ],
  scorers: [
    placeholderScorer,
    validPropertiesScorer,
    noMarkdownScorer,
    contentScorer,
    domainRuleScorer,
    typeHierarchyScorer,
    rootAndNoTagScorer,
  ],
  task: async (input: Approach2GeneratorInput) => {
    const model = createModelFromProviderConfig({
      type: (sheriffEvalConfig.model.provider as 'lm-studio' | 'openai' | 'anthropic' | 'gemini') || 'lm-studio',
      baseUrl: sheriffEvalConfig.model.baseUrl,
      apiKey: sheriffEvalConfig.model.apiKey,
      model: sheriffEvalConfig.model.model,
    });

    const config = await generateConfig(input.configData, model, `eval-${Date.now()}`);
    return config;
  },
});

