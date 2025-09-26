# Sheriff Configuration Generation 

## Project Context
- **Type**: Angular DDD project
- **Path**: `/Users/wolfmanfx/Dev/opensource/sheriff-ai/test-projects/angular-iv`
- **Entry**: `src/main.ts`

## Questions to Answer

1. **Shared Access**: Do all sub-modules require access to all shared modules? Verify.
2. **Bookings Feature Access**: Can bookings only access customers' API in its feature module? (Note: bookings has `+state`/`overview`, not standard `feature`)
3. **Bookings Structure**: How to handle bookings' non-standard structure (`+state`, `overview`)?
4. **Single Tag**: How to achieve submodules/domains with only one tag per module? Is this possible?
5. **Cyclic Dependencies**: How does Sheriff prevent circular dependencies when `feature` → `api` and `api` → `feature` are both allowed? Explain the logic.

## Constraints
- **MCP Resources**: MUST use `sheriff://configuration-reference` resource for Sheriff documentation (DO NOT read files directly)
- **MCP Prompts**: Use `generate_sheriff_config` prompt with `cwd` and `entry` arguments for structured workflow
- **MCP Tools**: Use ONLY Sheriff MCP tools for analysis (no direct file reading/manual editing)
- **Output**: Present final configuration in chat response
- **Analysis**: All via MCP server tools and resources

## Expected Output
- Complete `sheriff.config.ts` configuration
- Answers to all 5 questions
- Verification of requirements
- Explanation of cyclic dependency prevention

## MCP Resources Available
- **`sheriff://configuration-reference`**: LLM-optimized Sheriff configuration reference (USE THIS instead of reading files)
  - Contains: Config basics, dependency rules, module types, practical patterns, examples
  - Access via: `fetch_mcp_resource` with URI `sheriff://configuration-reference`

## MCP Prompts Available
- **`generate_sheriff_config`**: Complete workflow prompt for generating Sheriff configs
  - Arguments: `cwd` (optional), `entry` (optional)
  - Provides: Step-by-step workflow, tool usage guidelines, best practices
  - Access via: MCP prompt system with arguments `{ cwd: "...", entry: "src/main.ts" }`

- **`sheriff_config_assistant`**: System prompt for Sheriff configuration assistance
  - Provides: General guidance and context for Sheriff config generation
  - Access via: MCP prompt system

## MCP Tools Available
- **Analysis Tools**:
  - `sheriff_analyze` - Analyze project structure and dependencies
  - `sheriff_moduleStructure` - Get module structure with tags for visualization
  - `sheriff_summarizeTags` - Inspect tags for specific module paths
  - `sheriff_allowedMatrix` - Compute allowed dependency matrix for selected modules
  - `sheriff_getAllFilesAsTreeText` - Get all files as tree-structured text

- **Validation Tools**:
  - `sheriff_full_allowedMatrix` - Get complete file-to-file import matrix showing all actual imports
  - `sheriff_getModuleAccessList` - Get list of modules a specific module can access (validates rules)

- **Configuration Tools**:
  - `config_read` - Read existing `sheriff.config.ts`
  - `config_validateDetailed` - Validate config with detailed error messages
  - `config_previewWrite` - Validate proposed config without writing
  - `config_applyPreview` - Temporarily apply config and run analysis for preview
  - `config_write` - Write validated config to disk

- **File System Tools**:
  - `fs_list` - List directories in workspace (minimal file system access only)

## Workflow Instructions

1. **Start with MCP Resources**: Fetch `sheriff://configuration-reference` resource for documentation
2. **Use MCP Prompts**: Invoke `generate_sheriff_config` prompt with project context
3. **Analyze Project**: Use `sheriff_analyze` and related tools to understand structure
4. **Check Actual Imports**: Use `sheriff_full_allowedMatrix` to see all real imports in codebase
5. **Generate Config**: Create configuration based on analysis and reference documentation
6. **Validate Syntax**: Use `config_validateDetailed` to check for errors
7. **Write Config**: Write configuration to disk
8. **Verify Module Access**: Use `sheriff_getModuleAccessList` for each key module to validate rules
9. **Cross-Reference**: Ensure all actual imports from step 4 are allowed by configuration

## Important Notes
- **DO NOT** read configuration files directly - use `config_read` tool instead
- **DO NOT** read documentation files directly - use `sheriff://configuration-reference` resource
- **DO** use MCP prompts for structured guidance
- **DO** use MCP tools for all analysis and configuration operations
- **CRITICAL**: Always validate with `sheriff_getModuleAccessList` - this shows exactly what each module can access
- **CRITICAL**: Check `sheriff_full_allowedMatrix` to ensure no real imports are blocked by config

