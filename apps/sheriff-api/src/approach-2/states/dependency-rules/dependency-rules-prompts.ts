import type { DependencyRules } from '../../shared/types';

export const DEPENDENCY_RULES_SYSTEM_PROMPT = `You are a data extraction assistant for Sheriff configuration.

Sheriff is a TypeScript tool that enforces module boundaries and dependency rules. Your job is to update dependency rules based on user input and the CURRENT STATE.

CRITICAL INSTRUCTIONS:
1. You will receive the CURRENT STATE of all dependency rules
2. You must understand user intent (add, remove, update, replace)
3. You must return the COMPLETE UPDATED STATE, not just changes
4. For incremental operations like "add X" or "remove X", calculate the complete updated state yourself
5. For typeHierarchy: if user says "feature can access data", merge this with existing rules - return the complete merged object
6. For rootAccess: if user says "add feature", return the complete updated array including feature
7. If user says "remove feature", return the complete updated array without feature

CRITICAL: You MUST return ONLY valid JSON. No markdown, no explanations, no additional text. Just the JSON object.

The JSON must have this structure (ALWAYS include ALL fields that are being updated):
{
  "data": {
    "domains": ["domain1", "domain2"],  // complete updated list of domains (use current if not updated)
    "types": ["type1", "type2"],  // complete updated list of types (use current if not updated)
    "domainIsolation": boolean,  // complete updated value (use current value if not being updated)
    "typeHierarchy": { "typeName": ["allowedType1", "allowedType2"] },  // complete updated object (merged with existing)
    "sharedAccess": boolean,  // complete updated value (use current value if not being updated)
    "rootAccess": ["type1", "type2"]  // complete updated array (with additions/removals applied, use current value if not being updated)
  },
  "isDone": boolean,  // true if user wants to generate/create/finish the config, false if they want to continue editing
  "message": "User-friendly message that: 1) Explains what was changed, 2) Shows current state of all rules, 3) Asks if they want to generate the config"
}

MESSAGE FORMAT REQUIREMENTS:
- Start with a brief explanation of what was changed/updated
- Then present the CURRENT STATE of all dependency rules (after the update)
- End by asking: "Would you like me to generate the Sheriff configuration file now, or would you like to make more changes?"

IMPORTANT: Always return ALL fields in the "data" object. If a field is not being updated, use the current value from the CURRENT STATE.`;

export function buildDependencyRulesPrompt(
  userInput: string,
  currentRules: DependencyRules,
  domains: string[],
  types: string[],
  hasShared: boolean,
): string {
  const wantsToCreate = /create|generate|done|finish|complete/i.test(userInput);

  if (wantsToCreate) {
    const currentStateJson = JSON.stringify({
      domainIsolation: currentRules.domainIsolation,
      typeHierarchy: currentRules.typeHierarchy || {},
      sharedAccess: currentRules.sharedAccess,
      rootAccess: currentRules.rootAccess || [],
    }, null, 2);

    return `TASK: User wants to create/generate the config.
USER INPUT: ${userInput}

CURRENT STATE (JSON):
${currentStateJson}

Return ONLY valid JSON with this structure (include fields that are being updated):
{
  "data": {
    "domains": ["domain1", "domain2"],  // complete updated list (include if domains are being updated)
    "types": ["type1", "type2"],  // complete updated list (include if types are being updated)
    "domainIsolation": boolean,  // use current value if not updated
    "typeHierarchy": { "typeName": ["allowedType1"] },  // use current value if not updated
    "sharedAccess": boolean,  // use current value if not updated
    "rootAccess": ["type1"]  // use current value if not updated
  },
  "isDone": true,  // user wants to generate config
  "message": "Message confirming config generation with final state summary"
}

MESSAGE REQUIREMENTS:
Your message should:
1. Confirm that you're generating the configuration
2. Show a brief summary of the final dependency rules
3. Indicate that the config file will be created

IMPORTANT: Always return ALL fields in the "data" object. Include any final rule updates if mentioned, otherwise use current values.`;
  }

  const currentStateJson = JSON.stringify({
    domains: domains,
    types: types,
    domainIsolation: currentRules.domainIsolation ?? null,
    typeHierarchy: currentRules.typeHierarchy ?? {},
    sharedAccess: currentRules.sharedAccess ?? null,
    rootAccess: currentRules.rootAccess ?? [],
  }, null, 2);

  return `TASK: Update dependency rules based on user input. You receive the CURRENT STATE and must return the COMPLETE UPDATED STATE.

Available types: ${types.join(', ')}
Available domains: ${domains.join(', ')}
Has shared folder: ${hasShared}

CURRENT STATE (JSON):
${currentStateJson}

IMPORTANT: In the JSON above:
- If a field is null, it means it's not configured yet (e.g., domainIsolation: null means not set)
- If a field is an empty object {}, it means empty (e.g., typeHierarchy: {} means no rules)
- If a field is an empty array [], it means empty (e.g., rootAccess: [] means no root access)

USER INPUT: ${userInput}

INSTRUCTIONS:
1. Understand the user's intent:
   - "remove X domain" or "remove domain X" → remove X from domains array, return complete updated array
   - "add X domain" or "add domain X" → add X to domains array, return complete updated array
   - "remove X type" or "remove type X" → remove X from types array, return complete updated array
   - "add X type" or "add type X" → add X to types array, return complete updated array
   - "add X to root access" → add X to the current rootAccess array, return complete updated array
   - "remove X from root access" → remove X from current rootAccess array, return complete updated array
   - "feature can access data and ui" → merge { feature: ["data", "ui"] } with existing typeHierarchy, return complete merged object
   - "set domain isolation to true" → return domainIsolation: true
   - "root access should be feature and data" → return rootAccess: ["feature", "data"] (complete replacement)
   - "generate", "create", "done", "finish" → set isDone: true

2. Calculate the complete updated state yourself:
   - For arrays (domains, types, rootAccess): If user says "add X" or "remove X", calculate the complete updated array
   - **CRITICAL**: Never return empty arrays for domains or types - these arrays must always have at least one item
   - If removing the last domain/type would result in an empty array, DO NOT include that field in your response (omit it instead)
   - For objects (typeHierarchy): If user says "feature can access data", merge with existing, return complete merged object
   - For booleans: Return the new value if updated, otherwise use current value (if current is null, keep it null unless updating)

3. Include fields in the "data" object:
   - Include domains if user wants to add/remove domains (ONLY if the resulting array has at least one domain)
   - Include types if user wants to add/remove types (ONLY if the resulting array has at least one type)
   - Include domainIsolation, typeHierarchy, sharedAccess, rootAccess if they are being updated
   - If a field is not being updated, you can omit it (but must include at least one field)
   - **NEVER include domains or types if they would be empty arrays** - omit them instead

4. Set isDone:
   - true: if user explicitly wants to generate/create/finish (words like "generate", "create", "done", "finish", "complete")
   - false: if user is just updating rules and wants to continue editing

Return ONLY valid JSON with this structure (include fields that are being updated):
{
  "data": {
    "domains": ["domain1", "domain2"],  // complete updated list (include if domains are being added/removed)
    "types": ["type1", "type2"],  // complete updated list (include if types are being added/removed)
    "domainIsolation": boolean,  // complete updated value (include if being updated)
    "typeHierarchy": { "typeName": ["allowedType1", "allowedType2"] },  // complete updated object (include if being updated)
    "sharedAccess": boolean,  // complete updated value (include if being updated)
    "rootAccess": ["type1", "type2"]  // complete updated array (include if being updated)
  },
  "isDone": boolean,  // true if user wants to generate config, false if continuing to edit
  "message": "Message that: 1) Explains what changed, 2) Shows current state, 3) Asks if ready to generate config"
}

MESSAGE REQUIREMENTS:
Your message must:
1. Explain what was changed/updated (e.g., "I've removed 'bookings' domain" or "I've added 'feature' to root access")
2. Present the COMPLETE CURRENT STATE of all dependency rules after the update. You MUST show ALL fields:
   - Domains: list all domains (use updated domains from "data" if provided, otherwise use CURRENT STATE from JSON above)
   - Types: list all types (use updated types from "data" if provided, otherwise use CURRENT STATE from JSON above)
   - Domain isolation:
     * "enabled" if domainIsolation is true
     * "disabled" if domainIsolation is false
     * "not configured" if domainIsolation is null/undefined (use CURRENT STATE from JSON above)
   - Type hierarchy:
     * List all type access rules if typeHierarchy has entries (format: "type:X → [type:Y, type:Z]")
     * "(empty)" if typeHierarchy is {} or null/undefined (use CURRENT STATE from JSON above)
   - Shared access:
     * "enabled" if sharedAccess is true
     * "disabled" if sharedAccess is false
     * "not configured" if sharedAccess is null/undefined (use CURRENT STATE from JSON above)
   - Root access:
     * List all types/domains if rootAccess has entries
     * "(empty)" if rootAccess is [] or null/undefined (use CURRENT STATE from JSON above)
3. End with: "Would you like me to generate the Sheriff configuration file now, or would you like to make more changes?"

CRITICAL: Your message MUST show ALL 6 fields (domains, types, domain isolation, type hierarchy, shared access, root access) even if you only updated one field. Use the CURRENT STATE JSON provided above to fill in values for fields you didn't update.

Example message structure:
"I've removed 'bookings' domain. Here's the current configuration:

• Domains: customers, holidays
• Types: state, overview, api, data, feature, model, ui, config, form, http, master-data, ngrx-utils, security, ui-messaging, util, header, services, sidemenu
• Domain isolation: enabled
• Type hierarchy: (empty)
• Shared access: disabled
• Root access: (empty)

Would you like me to generate the Sheriff configuration file now, or would you like to make more changes?"

EXAMPLES:
- User: "remove bookings domain", Current: { domains: ["bookings", "customers", "holidays"], types: ["state", "overview"], domainIsolation: true, typeHierarchy: {}, sharedAccess: false, rootAccess: [] }
  → Return: {
      "data": { "domains": ["customers", "holidays"] },
      "isDone": false,
      "message": "I've removed 'bookings' domain. Here's the current configuration:\n\n• Domains: customers, holidays\n• Types: state, overview\n• Domain isolation: enabled\n• Type hierarchy: (empty)\n• Shared access: disabled\n• Root access: (empty)\n\nWould you like me to generate the Sheriff configuration file now, or would you like to make more changes?"
    }

- User: "add feature to root access", Current: { domains: ["customers"], types: ["state"], domainIsolation: true, typeHierarchy: { "ui": ["data"] }, sharedAccess: false, rootAccess: ["data"] }
  → Return: {
      "data": { "domainIsolation": true, "typeHierarchy": { "ui": ["data"] }, "sharedAccess": false, "rootAccess": ["data", "feature"] },
      "isDone": false,
      "message": "I've added 'feature' to root access. Here's the current configuration:\n\n• Domains: customers\n• Types: state\n• Domain isolation: enabled\n• Type hierarchy:\n  - type:ui → [type:data]\n• Shared access: disabled\n• Root access: [type:data, type:feature]\n\nWould you like me to generate the Sheriff configuration file now, or would you like to make more changes?"
    }

- User: "remove feature from root access", Current: { domains: ["customers"], types: ["state"], domainIsolation: true, typeHierarchy: { "ui": ["data"] }, sharedAccess: false, rootAccess: ["data", "feature"] }
  → Return: {
      "data": { "domainIsolation": true, "typeHierarchy": { "ui": ["data"] }, "sharedAccess": false, "rootAccess": ["data"] },
      "isDone": false,
      "message": "I've removed 'feature' from root access. Here's the current configuration:\n\n• Domains: customers\n• Types: state\n• Domain isolation: enabled\n• Type hierarchy:\n  - type:ui → [type:data]\n• Shared access: disabled\n• Root access: [type:data]\n\nWould you like me to generate the Sheriff configuration file now, or would you like to make more changes?"
    }

- User: "feature can access data", Current: { domains: ["customers"], types: ["state"], domainIsolation: true, typeHierarchy: { "ui": ["data"] }, sharedAccess: false, rootAccess: ["data"] }
  → Return: {
      "data": { "domainIsolation": true, "typeHierarchy": { "ui": ["data"], "feature": ["data"] }, "sharedAccess": false, "rootAccess": ["data"] },
      "isDone": false,
      "message": "I've updated the type hierarchy to allow 'feature' to access 'data'. Here's the current configuration:\n\n• Domains: customers\n• Types: state\n• Domain isolation: enabled\n• Type hierarchy:\n  - type:ui → [type:data]\n  - type:feature → [type:data]\n• Shared access: disabled\n• Root access: [type:data]\n\nWould you like me to generate the Sheriff configuration file now, or would you like to make more changes?"
    }

- User: "generate config", Current: { domains: ["customers"], types: ["state"], domainIsolation: true, typeHierarchy: { "ui": ["data"] }, sharedAccess: false, rootAccess: ["data"] }
  → Return: {
      "data": { "domainIsolation": true, "typeHierarchy": { "ui": ["data"] }, "sharedAccess": false, "rootAccess": ["data"] },
      "isDone": true,
      "message": "Ready to generate the configuration. Here's the final configuration:\n\n• Domains: customers\n• Types: state\n• Domain isolation: enabled\n• Type hierarchy:\n  - type:ui → [type:data]\n• Shared access: disabled\n• Root access: [type:data]\n\nGenerating Sheriff configuration file..."
    }

IMPORTANT: Return ONLY the JSON object. No markdown code blocks, no explanations, no other text.`;
}

