/**
 * Project Analysis Structured Response Schema
 * Defines the format for structured project analysis responses
 */
import { z } from 'zod/v3';

/**
 * Domain information schema
 * Accepts both string (simple name) and object (full domain info) formats
 * Note: No transform here to allow JSON Schema generation - normalization happens at runtime
 */
export const DomainSchema = z.union([
  z.string().describe('Domain name as string (e.g., "customers", "bookings")'),
  z.object({
    name: z.string().describe('Domain name (e.g., "customers", "bookings")'),
    subdirectories: z.array(z.string()).optional().describe('List of subdirectories/modules within the domain'),
    description: z.string().optional().nullable().describe('Optional description of the domain'),
  }),
]);

/**
 * Shared module information schema
 * Accepts both string (simple name) and object (full module info) formats
 * Note: No transform here to allow JSON Schema generation - normalization happens at runtime
 */
export const SharedModuleSchema = z.union([
  z.string().describe('Shared module name as string'),
  z.object({
    name: z.string().describe('Shared module name'),
    description: z.string().optional().nullable().describe('Optional description of the shared module'),
  }),
]);

/**
 * Tag suggestion schema
 */
export const TagSuggestionSchema = z.object({
  category: z.string().describe('Tag category (e.g., "domain", "type", "shared")'),
  pattern: z.string().describe('Tag pattern (e.g., "domain:customers", "type:feature")'),
  description: z.string().optional().nullable().describe('Optional description of the tag'),
});

/**
 * Dependency rule suggestion schema
 */
export const DependencyRuleSchema = z.object({
  from: z.string().describe('Source tag pattern (e.g., "domain:*", "type:ui")'),
  to: z.array(z.string()).describe('Allowed target tag patterns'),
  description: z.string().optional().nullable().describe('Optional description of the rule'),
});

/**
 * Project Analysis Structured Response Schema
 */
export const ProjectAnalysisSchema = z.object({
  /**
   * Type discriminator to identify this as a project analysis response
   */
  type: z.literal('project-analysis').describe('Type discriminator for project analysis'),

  /**
   * Project structure overview
   */
  overview: z.object({
    framework: z.string().optional().describe('Detected framework (e.g., "Angular", "React", "Next.js")'),
    architecture: z.string().optional().describe('Detected architecture style (e.g., "Domain-Driven Design", "Layered")'),
    description: z.string().optional().describe('Overall project description'),
  }).optional(),

  /**
   * Main domains identified in the project
   */
  domains: z.array(DomainSchema).optional().describe('List of identified domains'),

  /**
   * Shared modules identified in the project
   */
  sharedModules: z.array(SharedModuleSchema).optional().describe('List of identified shared modules'),

  /**
   * Shell/core application structure
   */
  shell: z.object({
    description: z.string().optional().nullable().describe('Description of shell/core structure'),
    modules: z.array(z.string()).optional().describe('List of shell/core modules'),
  }).optional(),

  /**
   * Tagging strategy suggestions
   * Accepts both structured format (with arrays) and simple format (with string patterns)
   */
  taggingStrategy: z.union([
    z.object({
      domainTags: z.array(TagSuggestionSchema).optional().describe('Suggested domain tags'),
      typeTags: z.array(TagSuggestionSchema).optional().describe('Suggested module type tags'),
      sharedTags: z.array(TagSuggestionSchema).optional().describe('Suggested shared module tags'),
      description: z.string().optional().nullable().describe('Overall tagging strategy description'),
    }),
    z.record(z.string(), z.string()).describe('Simple tagging strategy with pattern mappings'),
  ]).optional(),

  /**
   * Dependency rule suggestions
   * Accepts both structured format (with rules array) and simple format (with direct mappings)
   */
  dependencyRules: z.union([
    z.object({
      hierarchy: z.array(z.string()).optional().describe('Suggested dependency hierarchy'),
      rules: z.array(DependencyRuleSchema).optional().describe('Specific dependency rule suggestions'),
      description: z.string().optional().nullable().describe('Overall dependency rules description'),
    }),
    z.record(z.string(), z.union([z.array(z.string()), z.string()])).describe('Simple dependency rules with direct tag-to-allowed-tags mappings'),
  ]).optional(),

  /**
   * Current Sheriff configuration summary (if exists)
   * Accepts flexible structure to accommodate various config metadata
   */
  currentConfig: z.record(z.string(), z.unknown()).optional().describe('Current configuration metadata (may include checksum, usesNoTag, hasStrictRules, etc.)'),

  /**
   * Proposed architecture goals
   */
  proposedGoals: z.array(z.string()).optional().describe('List of proposed architectural goals'),
});

export type ProjectAnalysis = z.infer<typeof ProjectAnalysisSchema>;
export type Domain = z.infer<typeof DomainSchema>;
export type SharedModule = z.infer<typeof SharedModuleSchema>;
export type TagSuggestion = z.infer<typeof TagSuggestionSchema>;
export type DependencyRule = z.infer<typeof DependencyRuleSchema>;

