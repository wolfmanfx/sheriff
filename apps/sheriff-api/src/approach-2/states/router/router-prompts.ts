export const ROUTER_SYSTEM_PROMPT = `You are an intelligent router for Sheriff configuration generation.

Sheriff is a TypeScript tool that enforces module boundaries and dependency rules. Your job is to analyze the current session state and user message to determine the appropriate next action.

## Available States:
- INIT: Initial state, welcome user and ask for project path
- STRUCTURE: Extract project path, analyze structure, extract domains/types
- DEPENDENCY_RULES: Configure dependency rules iteratively
- DONE: Generate final configuration

## Decision Logic:

1. **Welcome Message**: If state is INIT and user input is empty → return welcome message, stay in INIT
2. **Restart Detection**: If user says "restart" or wants to start over → transition to INIT, reset session, return welcome message
3. **Path Extraction**: If in INIT/STRUCTURE and no cwd/entry but user provided input → extract path from user input
4. **Structure Analysis**: If path exists but no domains/types → analyze project and extract domains/types
5. **Transition to Rules**: If in STRUCTURE state and domains/types are extracted → transition to DEPENDENCY_RULES
6. **Rule Configuration**: If domains/types exist → allow user to configure dependency rules
7. **Config Generation**: If user says "create", "generate", "done" → transition to DONE and generate config
8. **Stay in State**: If user is updating rules → stay in DEPENDENCY_RULES

## Output Format:
Return structured data with:
- nextState: The state to transition to
- action: What action to take (welcome, extractPath, analyzeStructure, extractRules, generateConfig, stay, restart)
- message: Response message for user
`;

export function buildRouterPrompt(
  currentState: string,
  sessionData: {
    cwd?: string;
    entry?: string;
    domains?: string[];
    types?: string[];
    hasShared?: boolean;
    domainIsolation?: boolean;
    typeHierarchy?: Record<string, string[]>;
    sharedAccess?: boolean;
    rootAccess?: string[];
  },
  userInput: string,
): string {
  return `CURRENT STATE: ${currentState}

SESSION DATA:
- Has path (cwd/entry): ${sessionData.cwd && sessionData.entry ? 'Yes' : 'No'}
- Path: ${sessionData.cwd || 'Not set'} / ${sessionData.entry || 'Not set'}
- Domains extracted: ${sessionData.domains?.length ? sessionData.domains.join(', ') : 'Not extracted'}
- Types extracted: ${sessionData.types?.length ? sessionData.types.join(', ') : 'Not extracted'}
- Has shared folder: ${sessionData.hasShared ? 'Yes' : 'No'}
- Domain isolation: ${sessionData.domainIsolation !== undefined ? sessionData.domainIsolation : 'Not set'}
- Type hierarchy: ${sessionData.typeHierarchy ? JSON.stringify(sessionData.typeHierarchy) : 'Not set'}
- Shared access: ${sessionData.sharedAccess !== undefined ? sessionData.sharedAccess : 'Not set'}
- Root access: ${sessionData.rootAccess ? JSON.stringify(sessionData.rootAccess) : 'Not set'}

USER INPUT: ${userInput}

Analyze the session state and user input. Decide:
1. What state to transition to (nextState)
2. What action to take (action)
3. What message to send (message)

Return the structured data according to the schema.`;
}

