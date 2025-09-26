export const STRUCTURE_SYSTEM_PROMPT = `You are a data extraction assistant for Sheriff configuration.

Sheriff is a TypeScript tool that enforces module boundaries and dependency rules. Your job is to extract structured data from user input.

Your task is to extract:
- Project root directory path (cwd)
- Entry file path (entry)
- Domains and types from project structure analysis

Return structured data according to the provided schema.`;

export function buildExtractPathPrompt(userInput: string, currentCwd?: string, currentEntry?: string): string {
  const hasCwd = !!currentCwd;
  const hasEntry = !!currentEntry;

  let contextInfo = '';
  if (hasCwd || hasEntry) {
    contextInfo = '\n\nCURRENT SESSION STATE:\n';
    if (hasCwd) {
      contextInfo += `- Project root path (cwd) is already set: ${currentCwd}\n`;
    }
    if (hasEntry) {
      contextInfo += `- Entry file path is already set: ${currentEntry}\n`;
    }
    contextInfo += '\nYou only need to extract the missing piece(s). If the user provides new values, update them.\n';
  }

  return `CURRENT STATE: STRUCTURE
TASK: Extract the root path (cwd) and entry file path (entryFilePath) from user input using natural language understanding.${contextInfo}

IMPORTANT: You must use LLM reasoning to understand the user's intent. Do NOT use code-based parsing.
Analyze the user input semantically to extract:
1. The project root directory path (cwd)${hasCwd ? ' (already have: ' + currentCwd + ')' : ''}
2. The entry file path relative to the project root (entryFilePath)${hasEntry ? ' (already have: ' + currentEntry + ')' : ''}

EXTRACTION GUIDELINES:

Root Path (cwd):
- Understand context: "my project at /Users/name/app" → cwd: "/Users/name/app"
- Handle variations: "project root is...", "path: ...", "working directory: ...", or just a path
- Support absolute paths: /Users/..., /home/..., C:\\Users\\...
- Support relative paths: ./project, ../project, test-projects/angular-iv
- If user provides a subdirectory, infer the project root (e.g., "src/app" → might be project root or might need parent)
- Preserve the exact format the user provides (don't normalize unless necessary)
- If not found in user input, set to null

Entry File Path (entryFilePath):
- Extract ONLY the entry file path, relative to the project root
- Common patterns: "main.ts", "index.ts", "src/main.ts", "src/index.ts", "app/main.ts", "app.ts"
- Look for explicit mentions: "entry is...", "main file is...", "start file: ..."
- If user provides both path and entry: "/path/to/project src/main.ts" → cwd: "/path/to/project", entryFilePath: "src/main.ts"
- If only path provided, infer common entry files: check for "main.ts" or "index.ts" in typical locations
- Entry must be relative to cwd (e.g., if cwd="/project", entryFilePath="src/main.ts" not "/project/src/main.ts")
- If not found in user input, set to null

Be Flexible - Handle Natural Language:
- "I want to analyze /Users/name/my-project" → cwd: "/Users/name/my-project", entryFilePath: "src/main.ts" (inferred)
- "project: test-projects/angular-iv, entry: src/app.ts" → cwd: "test-projects/angular-iv", entryFilePath: "src/app.ts"
- "analyze /home/user/app with entry file app/index.ts" → cwd: "/home/user/app", entryFilePath: "app/index.ts"
- "the project is at ./my-app and main.ts is the entry" → cwd: "./my-app", entryFilePath: "main.ts"

USER INPUT: ${userInput}

CRITICAL JSON OUTPUT REQUIREMENTS:
1. Output ONLY valid JSON - nothing else
2. NO markdown code blocks (no \`\`\`json or \`\`\`)
3. NO explanatory text before or after
4. NO special tokens or formatting
5. Start directly with { and end with }
6. Must be parseable by JSON.parse()

REQUIRED JSON FORMAT:
{
  "cwd": "string or null - The project root directory path (absolute or relative), or null if not found",
  "entryFilePath": "string or null - The entry file path relative to cwd, or null if not found",
  "message": "string - User-friendly confirmation message or polite request for missing information"
}

IMPORTANT - Handle partial extraction:
${hasCwd && hasEntry
  ? '- Both cwd and entryFilePath are already set. If user provides new values, update them. Otherwise, confirm you have everything.'
  : hasCwd
  ? '- cwd is already set. Focus on extracting entryFilePath. If user provides new cwd, update it.'
  : hasEntry
  ? '- entryFilePath is already set. Focus on extracting cwd. If user provides new entryFilePath, update it.'
  : '- Neither cwd nor entryFilePath are set. Extract what you can from user input.'
}

- If you can extract BOTH cwd and entryFilePath from the user input (or both are already set), return both with a confirmation message like "✅ Got it! Analyzing project structure..."
- If you can extract ONLY cwd (but not entryFilePath)${hasEntry ? ' (entryFilePath already set)' : ''}, return cwd as string and entryFilePath as null${hasEntry ? ' (or keep existing entryFilePath)' : ''}. Provide a polite message like: "✅ Got the project path!${hasEntry ? '' : ' Now I need the entry file path (e.g., src/main.ts or src/index.ts).'}"
- If you can extract ONLY entryFilePath (but not cwd)${hasCwd ? ' (cwd already set)' : ''}, return entryFilePath as string and cwd as null${hasCwd ? ' (or keep existing cwd)' : ''}. Provide a polite message like: "✅ Got the entry file!${hasCwd ? '' : ' Now I need the project root path (e.g., /Users/name/project or ./my-project).'}"
- If you CANNOT extract either (user input is unclear, missing, or doesn't contain path information), ${hasCwd || hasEntry ? 'return what is already set and ' : ''}return a POLITE, HELPFUL message asking for the missing piece(s). Set missing fields to null.

Example JSON outputs:

Both found:
{
  "cwd": "/Users/name/project",
  "entryFilePath": "src/main.ts",
  "message": "✅ Got it! Analyzing project structure..."
}

Only cwd found:
{
  "cwd": "/Users/name/project",
  "entryFilePath": null,
  "message": "✅ Got the project path: /Users/name/project. Now I need the entry file path (e.g., src/main.ts or src/index.ts)."
}

Only entryFilePath found:
{
  "cwd": null,
  "entryFilePath": "src/main.ts",
  "message": "✅ Got the entry file: src/main.ts. Now I need the project root path (e.g., /Users/name/project or ./my-project)."
}

Neither found:
{
  "cwd": null,
  "entryFilePath": null,
  "message": "To get started, I need a bit more information! 🛡️ Could you please provide:\\n1. The root path of your project (e.g., /Users/name/project or ./my-project)\\n2. The entry file path (e.g., src/main.ts or src/index.ts)\\n\\nYou can provide them together like: '/path/to/project src/main.ts' or separately."
}

YOUR RESPONSE - OUTPUT ONLY VALID JSON, NO MARKDOWN, NO EXPLANATIONS, NO CODE BLOCKS:`;
}

export function buildExtractDomainsTypesPrompt(analysisResult: unknown): string {
  return `CURRENT STATE: STRUCTURE
TASK: Analyze the provided analysis result JSON. Extract domains from tags like "domain:bookings", types from tags like "type:feature", check if shared folder exists (look for "shared" tag or path containing "shared"), and extract the base path where domains are located. The base path is the common parent directory of all domain-tagged directories (e.g., if domains are at "src/app/holidays" and "src/app/customers", the base path is "src/app"). Return unique domains, types, hasShared, and domainBasePath.

ANALYSIS RESULT: ${JSON.stringify(analysisResult)}

Extract the domains, types, shared folder status, and domain base path from the analysis result. Return the structured data according to the schema.`;
}

