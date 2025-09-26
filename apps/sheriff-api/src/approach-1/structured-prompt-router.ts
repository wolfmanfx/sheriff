import { Router, Request, Response } from 'express';
import { streamText, convertToModelMessages, type UIMessage, type ModelMessage } from 'ai';
import { createModelFromProviderConfig } from '../shared/llm-api-provider-config';
import { SHERIFF_CONFIG_JSON_SCHEMA } from './sheriff-config-json-schema';

export const SHERIFF_DOCS = `
# Sheriff Configuration Documentation

Sheriff enforces module boundaries and dependency rules in TypeScript projects.

## Config File Basics

- **Location**: \`sheriff.config.ts\` at the project root
- **Signature**: \`import { SheriffConfig } from '@softarc/sheriff-core';\` then \`export const config: SheriffConfig = { ... }\`
- **Quick Start**: Use \`npx sheriff init\` to generate a config with sensible defaults
- **Mandatory keys**:
  - \`modules\` (type: \`ModuleConfig\`): declares modules and tags. Required unless \`autoTagging\` stays enabled.
  - \`depRules\` (type: \`DependencyRulesConfig\`): declares allowed tag-to-tag dependencies. **Required**.

## Required Properties

- **\`depRules\`** (type: \`DependencyRulesConfig\`): **Required**. Declares allowed tag-to-tag dependencies. Defines which tags can access which other tags.

## Optional Core Properties

- **\`modules\`** (type: \`ModuleConfig\`): Declares modules and their associated tags. Required unless \`autoTagging\` stays enabled (default \`true\`). Supports nested objects and placeholder syntax (\`<name>\`).
- **\`tagging\`**: **Deprecated**. Use \`modules\` instead.

## Entry Point Configuration (Mutually Exclusive)

- **\`entryFile\`** (type: \`string\`): Single entry path for single-app projects. Incompatible with \`entryPoints\`.
- **\`entryPoints\`** (type: \`Record<string, string>\`): Named entry paths for multi-app workspaces. Incompatible with \`entryFile\`.

## Module Detection & Tagging

- **\`autoTagging\`** (type: \`boolean\`, default: \`true\`): Automatically detects modules and tags them \`noTag\`. Disable when relying on explicit \`modules\` configuration.

## Barrel-less Module Configuration (Recommended)

- **\`enableBarrelLess\`** (type: \`boolean\`, default: \`false\`): Enables barrel-less modules with encapsulation folders. **Recommended** for better tree-shaking.
- **\`encapsulationPattern\`** (type: \`string | RegExp\`, default: \`'internal'\`): Pattern for encapsulated content in barrel-less modules. Can be a string folder name or regex pattern.

## Barrel Module Configuration

- **\`barrelFileName\`** (type: \`string\`, default: \`'index.ts'\`): Barrel entry filename used to identify barrel modules.

## Root Module Configuration

- **\`excludeRoot\`** (type: \`boolean\`, default: \`false\`): Removes implicit root module from all checks. Useful for incremental integration.

## Modules & Tags

- Modules can be declared explicitly (\`modules: { 'path': ['tag'] }\`) or discovered automatically (barrel detection or \`autoTagging\`).
- Tags commonly encode:
  - Domains, e.g. \`domain:customer\`
  - Types, e.g. \`type:feature\`, \`type:data\`, \`type:ui\`
- Use nested objects or placeholder syntax (\`<name>\`) within \`modules\` for repetitive structures, e.g. \`'src/app/<domain>/<type>': ['domain:<domain>', 'type:<type>']\`.

## Dependency Rules

- **MUST be defined inside a \`depRules\` object property** - this is REQUIRED and cannot be omitted
- Structure: \`depRules: { 'tag': 'allowedTag', 'tag2': ['tag1', 'tag2'] }\`
- Keys are source tags, values specify accessible tags.
- **Access Control Logic**: For an import to be allowed, Sheriff checks each tag of the source module. Access is granted if ANY source tag allows access to ANY target tag. If NO source tag allows access, the import is denied.
- Values accept:
  - String (single allowed tag), string array (multiple allowed tags), function returning boolean, or combination
  - Wildcards such as \`domain:*\` (use with functions: \`'domain:*': ({ from, to }) => from === to\`)
  - Helpers like \`sameTag\` from \`@softarc/sheriff-core\` (e.g., \`'domain:*': [sameTag, 'shared']\`)
- Typical strategy:
  - Domain isolation: \`'domain:customer': ['domain:customer']\` (same domain only)
  - Type hierarchy: \`'type:feature': ['type:data', 'type:ui']\` (feature can access data/ui, but not reverse)
  - Root access: \`root: ['type:feature']\` (root can access feature modules)
- **Critical**: Always ensure \`root\` can reach \`noTag\` when \`autoTagging\` is active: \`depRules: { root: 'noTag', noTag: ['noTag', 'root'] }\`
- **Best Practice**: Use dual-tag system (domain + type) for scalable architecture. Tags should be categorized into domain/scope tags and type tags.

## Automatic Tagging & Root Module

- With \`autoTagging: true\`, any unconfigured module becomes \`noTag\`; remaining files join the implicit \`root\` module tagged \`root\`.
- **Root Module Behavior**:
  - Root module tagging (\`root\` tag) **cannot be changed** - it's automatic
  - With \`enableBarrelLess: false\` (default), **no module can access the root module**
  - Root module contains all files not part of any configured module
  - Use \`excludeRoot: true\` to remove root from checks, or enable \`enableBarrelLess\` to make root a barrel-less module
- Recommended defaults (generated by CLI):
  - \`depRules: { root: 'noTag', noTag: ['noTag', 'root'] }\`

## Module Types

- **Barrel-less Modules** (Recommended for tree-shaking)
  - Require explicit declaration in \`modules\` and \`enableBarrelLess: true\`.
  - Encapsulated files reside in \`internal\` (or configured pattern via \`encapsulationPattern\`).
  - Imports reaching into \`internal\` violate boundaries.
  - Files outside \`internal\` are directly accessible (no barrel file needed).
- **Barrel Modules**
  - Identified by exported barrel file (default \`index.ts\`, configurable via \`barrelFileName\`).
  - Exported symbols define public API; non-exported files remain encapsulated.
  - Auto-detected even without explicit \`modules\` configuration.
  - Both module types can coexist in the same project.

## Practical Patterns

### Dual-Tag System (Recommended)
- Use domain tags (\`domain:customer\`, \`domain:holiday\`) + type tags (\`type:feature\`, \`type:data\`, \`type:ui\`)
- Example: \`'src/app/holidays/feature': ['domain:holidays', 'type:feature']\`
- Rules enforce: same-domain access, type hierarchies, root permissions

### Placeholders for Scalability
- Use \`<name>\` syntax to reduce duplication: \`'src/app/<domain>/<type>': ['domain:<domain>', 'type:<type>']\`
- Placeholders work at all nesting levels

### Common Anti-Patterns to Avoid
- **CRITICAL**: Don't put dependency rules at the root level - they MUST be inside \`depRules: { ... }\`
- Don't set both \`entryFile\` and \`entryPoints\` (mutually exclusive)
- Don't disable \`autoTagging\` without defining \`modules\`
- Don't forget to allow \`root\` -> \`noTag\` access when using \`autoTagging\`
- Don't use overly permissive rules like \`'*': '*'\` (defeats the purpose)
- Don't forget the \`depRules\` property wrapper - all dependency rules must be nested inside it

## Configuration Examples

### Minimal Config (Auto-tagging)
\`\`\`typescript
import { SheriffConfig } from '@softarc/sheriff-core';
export const config: SheriffConfig = {
  depRules: {
    root: 'noTag',
    noTag: ['noTag', 'root'],
  },
};
\`\`\`

### Barrel-less Modules
\`\`\`typescript
import { SheriffConfig } from '@softarc/sheriff-core';
export const config: SheriffConfig = {
  enableBarrelLess: true,
  modules: {
    db: 'noTag',
    web: 'noTag',
  },
  depRules: {
    root: 'noTag',
    noTag: 'noTag',
  },
};
\`\`\`

### Manual Tagging with Domain/Type
\`\`\`typescript
import { SheriffConfig } from '@softarc/sheriff-core';
export const config: SheriffConfig = {
  modules: {
    'src/app/holidays/feature': ['domain:holidays', 'type:feature'],
    'src/app/holidays/data': ['domain:holidays', 'type:data'],
    'src/app/customers/feature': ['domain:customers', 'type:feature'],
    'src/app/customers/data': ['domain:customers', 'type:data'],
  },
  depRules: {
    'domain:holidays': ['domain:holidays'],
    'domain:customers': ['domain:customers'],
    'type:feature': 'type:data',
    root: 'type:feature',
  },
};
\`\`\`

### Using Placeholders
\`\`\`typescript
import { SheriffConfig } from '@softarc/sheriff-core';
export const config: SheriffConfig = {
  modules: {
    'src/app/<domain>/<type>': ['domain:<domain>', 'type:<type>'],
  },
  depRules: {
    'domain:*': ({ from, to }) => from === to,
    'type:feature': 'type:data',
    root: 'type:feature',
  },
};
\`\`\`

### Dual-Tag System with sameTag Helper
\`\`\`typescript
import { sameTag, SheriffConfig } from '@softarc/sheriff-core';
export const config: SheriffConfig = {
  modules: {
    'src/app/<domain>/<type>': ['domain:<domain>', 'type:<type>'],
  },
  depRules: {
    'domain:*': [sameTag, 'shared'],
    'type:feature': ['type:data', 'type:ui', 'type:model'],
    'type:data': 'type:model',
    'type:ui': 'type:model',
    'type:model': [], // Model layer has no dependencies
    'shared': 'shared',
    'root': ['type:feature', 'shared'],
  },
};
\`\`\`
`;

export const SYSTEM_PROMPT = `You are an expert in Sheriff configuration for TypeScript projects. Sheriff enforces module boundaries and dependency rules.

Your task is to help users generate Sheriff configuration files based on their project structure and requirements.

When generating configs:
1. ALWAYS start with: import { sameTag, SheriffConfig } from '@softarc/sheriff-core';
2. Use the exact TypeScript format shown in the documentation
3. Include helpful comments explaining the rules
4. Use placeholders like <domain> and <type> for scalable configs
5. Ensure the config is syntactically correct TypeScript
6. When asked to generate a config, output ONLY the TypeScript code
7. Be conversational when answering questions, but precise when generating code
8. **DO NOT include optional properties with default values** - only include them if they differ from defaults:
   - \`enableBarrelLess\` (default: \`false\`) - only include if set to \`true\`
   - \`barrelFileName\` (default: \`'index.ts'\`) - only include if different
   - \`excludeRoot\` (default: \`false\`) - only include if set to \`true\`
   - \`autoTagging\` (default: \`true\`) - only include if set to \`false\`
   - \`encapsulationPattern\` (default: \`'internal'\`) - only include if different
   - \`version\` (default: \`1\`) - only include if different
   - \`log\` (default: \`false\`) - only include if set to \`true\`

**CRITICAL STRUCTURE REQUIREMENTS:**
- The config object MUST have a \`depRules\` property that is an object containing ALL dependency rules
- Dependency rules MUST be nested inside \`depRules: { ... }\`, NOT at the root level
- The structure is: \`export const config: SheriffConfig = { depRules: { ... }, modules: { ... }, ... }\`
- All tag-to-tag dependency rules go inside the \`depRules\` object
- Example structure:
  \`\`\`typescript
  export const config: SheriffConfig = {
    entryFile: 'src/main.ts',
    modules: { ... },
    depRules: {
      'domain:*': [sameTag, 'shared'],
      'type:feature': ['type:data'],
      root: ['type:feature'],
    },
  };
  \`\`\`

**JSON SCHEMA REFERENCE:**
The configuration MUST follow this structure (see full schema below). Key requirements:
- \`depRules\` is REQUIRED and must be an object containing all dependency rules
- \`modules\` is optional (unless \`autoTagging\` is disabled)
- \`entryFile\` and \`entryPoints\` are mutually exclusive (cannot use both)
- All dependency rules must be properties within the \`depRules\` object, NOT at the root level

Full JSON Schema (for structure validation):
\`\`\`json
${JSON.stringify(SHERIFF_CONFIG_JSON_SCHEMA, null, 2)}
\`\`\`

${SHERIFF_DOCS}`;

export function createStructuredPromptRouter(): Router {
  const router = Router();
  const model = createModelFromProviderConfig();

  router.post('/chat', async (req: Request, res: Response) => {
    try {
      const { messages } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Invalid messages format' });
      }

      const modelMessages = convertToModelMessages(messages as UIMessage[]);

      const systemMessage: ModelMessage = { role: 'system', content: SYSTEM_PROMPT };
      const messagesWithSystem: ModelMessage[] = modelMessages[0]?.role === 'system'
        ? modelMessages
        : [systemMessage, ...modelMessages];

      const result = streamText({
        model,
        messages: messagesWithSystem,
        temperature: 0.1,
      });

      if (res.headersSent) {
        return;
      }

      result.pipeUIMessageStreamToResponse(res);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (!res.headersSent) {
        res.status(500).json({ error: errorMessage });
      } else {
        try {
          res.write(`data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`);
          res.write('data: [DONE]\n\n');
          res.end();
        } catch {
        }
      }
    }
  });

  return router;
}
