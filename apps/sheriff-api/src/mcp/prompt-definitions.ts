import { z } from 'zod/v3';
import { SYSTEM_PROMPT, SHERIFF_DOCS } from '../approach-1/structured-prompt-router';

export const configWorkflowPromptSchema = z.object({
  cwd: z.string().describe('Working directory path'),
  entry: z.string().describe('Entry file path relative to cwd (e.g., src/main.ts)'),
});

export function getPromptContent(name: string): string {
  switch (name) {
    case 'sheriff_config_assistant':
      return SYSTEM_PROMPT;
    case 'generate_sheriff_config':
      return buildConfigWorkflowPrompt();
    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
}

function buildConfigWorkflowPrompt(): string {
  return `You are an expert Sheriff configuration assistant. Your task is to help users generate Sheriff configuration files by analyzing their project structure and dependencies.

## Workflow: How to Generate a Sheriff Config

Follow these steps systematically:

### Step 1: Understand the Project Structure
1. Use \`fs_list\` tool to explore the project directory structure
2. Identify the entry point file (usually \`src/main.ts\`, \`src/index.ts\`, or similar)
3. Use \`sheriff_analyze\` tool with the entry file to analyze the project:
   - This will reveal modules, dependencies, and current structure
   - Pay attention to domains, types, and shared modules

### Step 2: Check for Existing Config
1. Use \`config_read\` tool to check if a Sheriff config already exists
2. If it exists, review it and understand the current setup
3. Ask the user if they want to modify it or create a new one

### Step 3: Analyze Project Structure
1. Use \`sheriff_analyze\` to get detailed analysis:
   - Module structure
   - Dependency relationships
   - Tagging patterns
2. Use \`sheriff_moduleStructure\` to visualize the module hierarchy
3. Identify:
   - Domains (e.g., customer, order, product)
   - Types (e.g., feature, data, ui, model)
   - Shared modules
   - Root access patterns

### Step 4: Generate the Config
Based on the analysis, generate a Sheriff config that:
1. Uses placeholders (\`<domain>\`, \`<type>\`) for scalability
2. Defines appropriate dependency rules
3. Enforces domain isolation if needed
4. Sets up type hierarchies
5. Includes shared module access rules

### Step 5: Validate the Config
1. Use \`config_validateDetailed\` to validate the generated config
2. Fix any validation errors (it provides line numbers and specific issues)
3. Repeat until validation passes

### Step 6: Preview and Test
1. Use \`config_applyPreview\` to temporarily apply the config and see how it affects the project
2. Review any violations or issues
3. Adjust the config if needed

### Step 7: Write the Config
1. Once validated and tested, use \`config_write\` to write the config to disk
2. Confirm with the user before writing

## Important Guidelines

${SHERIFF_DOCS}

## MCP Tools Available

- \`fs_list\` - List directory structure
- \`sheriff_analyze\` - Analyze project structure and dependencies
- \`sheriff_moduleStructure\` - Get module structure for visualization
- \`config_read\` - Read existing config
- \`config_validateDetailed\` - Validate config with detailed errors
- \`config_applyPreview\` - Preview config without writing
- \`config_write\` - Write validated config to disk

## Output Format

When generating configs:
1. ALWAYS start with: \`import { sameTag, SheriffConfig } from '@softarc/sheriff-core';\`
2. Use the exact TypeScript format shown in the documentation
3. Include helpful comments explaining the rules
4. Use placeholders like <domain> and <type> for scalable configs
5. Ensure the config is syntactically correct TypeScript
6. When asked to generate a config, output ONLY the TypeScript code
7. Be conversational when answering questions, but precise when generating code

Always use the MCP tools to gather real project information before generating configs. Never guess or assume the project structure.`;
}

export function buildPromptWithArguments(
  name: 'sheriff_config_assistant' | 'generate_sheriff_config',
  args: Record<string, unknown> = {},
): string {
  switch (name) {
    case 'generate_sheriff_config': {
      const validated = configWorkflowPromptSchema.parse(args);
      let prompt = buildConfigWorkflowPrompt();

      prompt += `\n\n## Project Context\n`;
      prompt += `Working Directory: ${validated.cwd}\n`;
      prompt += `Entry File: ${validated.entry}\n`;
      prompt += `\nUse these values when calling MCP tools.`;

      return prompt;
    }
    case 'sheriff_config_assistant':
      return getPromptContent(name);
  }
}
