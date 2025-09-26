import type { ConfigData } from '../../shared/types';

export const CONFIG_GENERATION_PROMPT = `# Sheriff Configuration Generator - Strict Mode

## CRITICAL CONSTRAINTS - READ FIRST

### ⚠️ VALID PROPERTIES ONLY

The SheriffConfig type accepts EXACTLY these properties:

\`\`\`typescript
interface SheriffConfig {
  modules?: Record<string, string | string[]>;  // Module paths and tags
  depRules: Record<string, string | string[] | Function>;  // Dependency rules
  enableBarrelLess?: boolean;  // Enable barrel-less modules
  autoTagging?: boolean;  // Enable auto-tagging (default: true)
  excludeRoot?: boolean;  // Exclude root from checks
  version?: number;  // Config version
}
\`\`\`

**NEVER ADD THESE (they do NOT exist):**
- ❌ domainIsolation
- ❌ typeHierarchy
- ❌ sharedAccess
- ❌ rootAccess
- ❌ Any other property not listed above

### 🔑 MANDATORY PLACEHOLDER USAGE

**ALWAYS use placeholders \`<domain>\` and \`<type>\` in module paths.**
- ✅ CORRECT: \`'src/app/<domain>/<type>'\`
- ❌ WRONG: \`'src/app/customer/feature'\`
- ❌ WRONG: Listing each path individually

---

## GENERATION ALGORITHM

Follow these steps EXACTLY:

### Step 1: Import Statement
\`\`\`typescript
import { SheriffConfig, sameTag } from '@softarc/sheriff-core';
\`\`\`

### Step 2: Open Config Object
\`\`\`typescript
export const sheriffConfig: SheriffConfig = {
  enableBarrelLess: true,
\`\`\`

### Step 3: Module Definitions
\`\`\`typescript
  modules: {
    '<domainBasePath>/<domain>/<type>': ['domain:<domain>', 'type:<type>'],
    // If hasShared is true, add:
    '<domainBasePath>/shared/<type>': ['domain:shared', 'type:<type>']
  },
\`\`\`

### Step 4: Dependency Rules
\`\`\`typescript
  depRules: {
    // Domain rules (based on domainIsolation and sharedAccess):
    'domain:*': <rule>,  // See domain rule logic below

    // Type hierarchy rules (from typeHierarchy input):
    'type:X': ['type:Y', 'type:Z'],  // For each entry in typeHierarchy

    // Root access:
    root: <rootAccess array or 'type:feature'>,

    // Auto-tagging (ALWAYS include):
    noTag: ['noTag', 'root']
  }
\`\`\`

### Step 5: Close Config
\`\`\`typescript
};
\`\`\`

---

## DOMAIN RULE LOGIC

Choose ONE based on input:

| domainIsolation | sharedAccess | Rule |
|----------------|--------------|------|
| true | true | \`'domain:*': [sameTag, 'domain:shared']\` |
| true | false | \`'domain:*': sameTag\` |
| false | any | \`'domain:*': 'domain:*'\` |

---

## OUTPUT REQUIREMENTS

1. **NO markdown code blocks** - Start directly with \`import\`
2. **NO explanations** - Only TypeScript code
3. **MUST use placeholders** - Never hardcode domain/type names
4. **ONLY valid properties** - No invented properties
5. **Include all required rules** - Domain, type, root, noTag

Generate the TypeScript code now.`;

export function buildConfigGenerationPrompt(data: ConfigData): string {
  const errors: string[] = [];

  if (!data.domains || data.domains.length === 0) {
    errors.push('domains array is required and must not be empty');
  }

  if (!data.types || data.types.length === 0) {
    errors.push('types array is required and must not be empty');
  }

  if (errors.length > 0) {
    throw new Error(`Invalid config data: ${errors.join(', ')}`);
  }

  return `Generate Sheriff configuration for:

DOMAINS: ${JSON.stringify(data.domains)}
TYPES: ${JSON.stringify(data.types)}
HAS_SHARED: ${data.hasShared}
DOMAIN_BASE_PATH: ${data.domainBasePath || 'src/app'}
DOMAIN_ISOLATION: ${data.domainIsolation !== false}
TYPE_HIERARCHY: ${JSON.stringify(data.typeHierarchy || {})}
SHARED_ACCESS: ${data.sharedAccess !== false}
ROOT_ACCESS: ${JSON.stringify(data.rootAccess || ['feature'])}

Use placeholders. Output only TypeScript code.`;
}

