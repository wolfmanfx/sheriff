# Sheriff Configuration Reference (LLM-Optimized)

Use this reference to answer questions about Sheriff configuration without altering the documented meaning.

## Config File Basics
- Location: `sheriff.config.ts` at the project root
- Signature: `import { SheriffConfig } from '@softarc/sheriff-core';` then `export const config: SheriffConfig = { ... }`
- Quick Start: Use `npx sheriff init` to generate a config with sensible defaults
- Mandatory keys:
  - `modules` (type: `ModuleConfig`): declares modules and tags. Required unless `autoTagging` stays enabled.
  - `depRules` (type: `DependencyRulesConfig`): declares allowed tag-to-tag dependencies.
- Validation guards against: mutually set `entryFile` + `entryPoints`, disabled `autoTagging` without `modules`, malformed dependency rules, missing required props.

## Allowed Properties

The `SheriffConfig` interface supports the following properties:

### Required Properties
- **`depRules`** (type: `DependencyRulesConfig`): **Required**. Declares allowed tag-to-tag dependencies. Defines which tags can access which other tags.

### Optional Core Properties
- **`modules`** (type: `ModuleConfig`): Declares modules and their associated tags. Required unless `autoTagging` stays enabled (default `true`). Supports nested objects and placeholder syntax (`<name>`).
- **`tagging`** (type: `ModuleConfig`): **Deprecated**. Use `modules` instead. Legacy property name for module configuration.

### Entry Point Configuration (Mutually Exclusive)
- **`entryFile`** (type: `string`): Single entry path for single-app projects. Incompatible with `entryPoints`.
- **`entryPoints`** (type: `Record<string, string>`): Named entry paths for multi-app workspaces. Incompatible with `entryFile`.

### Module Detection & Tagging
- **`autoTagging`** (type: `boolean`, default: `true`): Automatically detects modules and tags them `noTag`. Disable when relying on explicit `modules` configuration.

### Barrel-less Module Configuration
- **`enableBarrelLess`** (type: `boolean`, default: `false`): Enables barrel-less modules with encapsulation folders. **Recommended** for better tree-shaking.
- **`encapsulationPattern`** (type: `string | RegExp`, default: `'internal'`): Pattern for encapsulated content in barrel-less modules. Can be a string folder name or regex pattern.
- **`encapsulatedFolderNameForBarrelLess`** (type: `string`): **Deprecated**. Use `encapsulationPattern` instead.

### Barrel Module Configuration
- **`barrelFileName`** (type: `string`, default: `'index.ts'`): Barrel entry filename used to identify barrel modules.

### Root Module Configuration
- **`excludeRoot`** (type: `boolean`, default: `false`): Removes implicit root module from all checks. Useful for incremental integration.

### File Processing
- **`ignoreFileExtensions`** (type: `string[] | ((defaults: string[]) => string[])`): Customize file extensions to ignore during traversal. Can be an array (replaces defaults) or a function (transforms defaults). Default ignored extensions include: Images (`svg`, `png`, `jpg`, `jpeg`, `gif`, `webp`, `ico`), Styles (`css`, `scss`, `sass`, `less`), Fonts (`woff`, `woff2`, `ttf`, `eot`, `otf`), Audio (`mp3`, `wav`, `ogg`), Video (`mp4`, `webm`, `mov`), Data/Misc (`json`, `csv`, `xml`, `txt`, `md`).

### Legacy & Utility Properties
- **`version`** (type: `number`, default: `1`): Config schema version. Pins the configuration format version.
- **`log`** (type: `boolean`, default: `false`): Enables internal logging and saves to `sheriff.log`.
- **`showWarningOnBarrelCollision`** (type: `boolean`): **Deprecated**. No warning is shown.

### Property Usage Notes
- `modules` and `tagging` are mutually exclusive (use `modules`, `tagging` is deprecated)
- `entryFile` and `entryPoints` are mutually exclusive (use one or the other)
- If `autoTagging` is disabled, `modules` becomes required
- `enableBarrelLess` must be `true` to use barrel-less module features

## Entry Configuration

See [Entry Point Configuration](#entry-point-configuration-mutually-exclusive) in the Allowed Properties section for details.

- Use `entryFile` for single-app projects
- Use `entryPoints` for monorepos
- These properties are mutually exclusive (cannot use both)

## Optional Settings

See the [Allowed Properties](#allowed-properties) section above for complete details on all optional properties. Key optional settings include:

- `autoTagging` (default `true`): detects modules automatically, tagging them `noTag`. Disable when relying on explicit `modules`.
- `enableBarrelLess` (default `false`): enables barrel-less modules with `internal` encapsulation folders. **Recommended** for better tree-shaking.
- `encapsulationPattern` (default `'internal'`): folder name or regex pattern treated as encapsulated content for barrel-less modules.
- `barrelFileName` (default `'index.ts'`): barrel entry filename.
- `ignoreFileExtensions`: customize traversal ignore list; accepts array or transformer function.
- `excludeRoot` (default `false`): removes implicit root checks.
- `log` (default `false`): enables verbose logging to `sheriff.log`.
- `version` (default `1`): pins config schema version.

## Modules & Tags
- Modules can be declared explicitly (`modules: { 'path': ['tag'] }`) or discovered automatically (barrel detection or `autoTagging`).
- Tags commonly encode:
  - Domains, e.g. `domain:customer`
  - Types, e.g. `type:feature`, `type:data`, `type:ui`
- Use nested objects or placeholder syntax (`<name>`) within `modules` for repetitive structures, e.g. `'src/app/<domain>/<type>': ['domain:<domain>', 'type:<type>']`.

## Dependency Rules
- Defined in `depRules`; keys are source tags, values specify accessible tags.
- **CRITICAL - Key Formatting**: All `depRules` keys containing colons (`:`) or special characters MUST be quoted as strings. Unquoted keys like `type:feature:` will cause syntax errors. Always use quotes: `'type:feature': [...]` not `type:feature: [...]`.
- **Access Control Logic**: For an import to be allowed, Sheriff checks each tag of the source module. Access is granted if ANY source tag allows access to ANY target tag. If NO source tag allows access, the import is denied.
- Values accept:
  - String (single allowed tag), string array (multiple allowed tags), function returning boolean, or combination
  - Wildcards such as `domain:*` (use with functions: `'domain:*': ({ from, to }) => from === to`)
  - Helpers like `sameTag` from `@softarc/sheriff-core` (e.g., `'domain:*': [sameTag, 'shared']`)
- Typical strategy:
  - Domain isolation: `'domain:customer': ['domain:customer']` (same domain only)
  - Type hierarchy: `'type:feature': ['type:data', 'type:ui']` (feature can access data/ui, but not reverse)
  - Root access: `root: ['type:feature']` (root can access feature modules)
- **Key Formatting Rules**:
  - Keys without colons can be unquoted: `root: [...]` ✅
  - Keys with colons MUST be quoted: `'type:feature': [...]` ✅, `type:feature: [...]` ❌ (syntax error)
  - Keys with wildcards MUST be quoted: `'domain:*': [...]` ✅
  - When in doubt, always quote the key: `'domain:customer': [...]` ✅
- **Critical**: Always ensure `root` can reach `noTag` when `autoTagging` is active: `depRules: { root: 'noTag', noTag: ['noTag', 'root'] }`
- **Best Practice**: Use dual-tag system (domain + type) for scalable architecture. Tags should be categorized into domain/scope tags and type tags.

## Automatic Tagging & Root Module
- With `autoTagging: true`, any unconfigured module becomes `noTag`; remaining files join the implicit `root` module tagged `root`.
- **Root Module Behavior**:
  - Root module tagging (`root` tag) **cannot be changed** - it's automatic
  - With `enableBarrelLess: false` (default), **no module can access the root module**
  - Root module contains all files not part of any configured module
  - Use `excludeRoot: true` to remove root from checks, or enable `enableBarrelLess` to make root a barrel-less module
- Recommended defaults (generated by CLI):
  - `depRules: { root: 'noTag', noTag: ['noTag', 'root'] }`
- To ease incremental adoption, keep `root` -> `noTag` access. Disable via `excludeRoot` or prefer enabling `enableBarrelLess`.

## Module Types
- **Barrel-less Modules** (Recommended for tree-shaking)
  - Require explicit declaration in `modules` and `enableBarrelLess: true`.
  - Encapsulated files reside in `internal` (or configured pattern via `encapsulationPattern`).
  - Imports reaching into `internal` violate boundaries.
  - Files outside `internal` are directly accessible (no barrel file needed).
  - If a barrel-less module contains a barrel file, it becomes a barrel module.
- **Barrel Modules**
  - Identified by exported barrel file (default `index.ts`, configurable via `barrelFileName`).
  - Exported symbols define public API; non-exported files remain encapsulated.
  - Auto-detected even without explicit `modules` configuration.
  - Both module types can coexist in the same project.

## Enforcement & Violations
- Sheriff checks each import through a multi-step process:
  1. Determine from/to modules and their tags
  2. For each tag in the source module, check if it allows access to ANY tag in the target module via `depRules`
  3. Access is granted if at least one source tag allows access to at least one target tag
  4. Deny when no rule grants access or when encapsulation rules fail (e.g., accessing `internal` folder or non-exported barrel files)
- ESLint integration reports violations with specific error messages:
  - Accessing encapsulated files (barrel-less `internal` or non-exported barrel files)
  - Disallowed tag combinations (dependency rule violations)
  - Missing or invalid configuration

## Practical Patterns

### Dual-Tag System (Recommended)
- Use domain tags (`domain:customer`, `domain:holiday`) + type tags (`type:feature`, `type:data`, `type:ui`)
- Example: `'src/app/holidays/feature': ['domain:holidays', 'type:feature']`
- Rules enforce: same-domain access, type hierarchies, root permissions

### Placeholders for Scalability
- Use `<name>` syntax to reduce duplication: `'src/app/<domain>/<type>': ['domain:<domain>', 'type:<type>']`
- Placeholders work at all nesting levels
- Example with nested structure:
  ```typescript
  modules: {
    'src/app': {
      '<domain>': {
        '<type>': ['domain:<domain>', 'type:<type>']
      }
    }
  }
  ```

### Mixed Tagging Strategies
- Combining manual + automatic tagging is allowed
- When mixing, ensure `depRules` cover `noTag` interactions explicitly
- Example: `'domain:holidays': ['domain:holidays', 'noTag']` allows holidays domain to access both tagged and auto-tagged modules

### Common Anti-Patterns to Avoid
- Don't set both `entryFile` and `entryPoints` (mutually exclusive)
- Don't disable `autoTagging` without defining `modules`
- Don't forget to allow `root` -> `noTag` access when using `autoTagging`
- Don't use overly permissive rules like `'*': '*'` (defeats the purpose)
- **Don't forget to quote `depRules` keys containing colons**: `type:feature: [...]` ❌ (syntax error) → Use `'type:feature': [...]` ✅
- **Always quote tag-based keys**: Any key with format `'tag:value'` or `'domain:*'` must be quoted as a string

## Configuration Examples

### Minimal Config (Auto-tagging)
```typescript
import { SheriffConfig } from '@softarc/sheriff-core';
export const config: SheriffConfig = {
  depRules: {
    root: 'noTag',
    noTag: ['noTag', 'root'],
  },
};
```

### Barrel-less Modules
```typescript
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
```

### Manual Tagging with Domain/Type
```typescript
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
    'type:feature': 'type:data',  // ✅ Quoted key required for tags with colons
    root: 'type:feature',  // ✅ Unquoted OK for simple keys without colons
  },
};
```

**Note**: Notice that `'type:feature'` is quoted (required) while `root` is unquoted (optional but valid). All keys containing colons MUST be quoted.

### Using Placeholders
```typescript
import { SheriffConfig } from '@softarc/sheriff-core';
export const config: SheriffConfig = {
  modules: {
    'src/app/<domain>/<type>': ['domain:<domain>', 'type:<type>'],
  },
  depRules: {
    'domain:*': ({ from, to }) => from === to,  // ✅ Quoted - contains colon and wildcard
    'type:feature': 'type:data',  // ✅ Quoted - contains colon
    root: 'type:feature',  // ✅ Unquoted OK - simple key
  },
};
```

**Important**: All `depRules` keys with colons (`:`) MUST be quoted. Unquoted keys like `type:feature:` will cause JavaScript syntax errors.

## Available Tools for Analysis & Verification

Sheriff provides several MCP tools for analyzing project structure and verifying configurations. These tools are essential for validating configs before and after writing them to disk.

### Analysis Tools

- **`sheriff_analyze`**: Analyze project structure and dependencies (directory-only, no files). Returns project tree with directory-level analysis. Use for quick overview of module structure.
- **`sheriff_full_analyze`**: Analyze project structure including all files with full analysis data. Returns complete tree structure with file-level analysis, dependencies, and tags. Use for comprehensive analysis when you need file-level details.

### Dependency & Access Verification Tools (CRITICAL for Validation)

- **`sheriff_getModuleAccessList`** ⭐ **PRIMARY VALIDATION TOOL**: Get the list of modules that a specific module can access based on Sheriff dependency rules. Returns an array of module paths with clear names. **Use this to validate all dependency rules are working correctly.** Perfect for verifying domain isolation, exception rules, and shared module access.
  - Example: `sheriff_getModuleAccessList(modulePath: "src/app/holidays/feature")` returns `["src/app/holidays/feature", "src/app/holidays/model", "src/app/shared/config", ...]`
  
- **`sheriff_full_allowedMatrix`** ⭐ **CRITICAL for Checking Real Imports**: Compute the full file-to-file import matrix showing which files import which files. Returns complete import structure with all actual imports in the codebase. **Use this to ensure no legitimate imports are blocked by your configuration.**
  - Returns: Object with file paths as keys and their imports as values
  
- **`sheriff_allowedMatrix`**: Compute the allowed dependency matrix for selected modules. Returns boolean matrix by module IDs indicating which modules can depend on which. Requires providing `selectedModules` array upfront. Less readable than `sheriff_getModuleAccessList` but useful for batch checks.

### Module Inspection Tools

- **`sheriff_summarizeTags`**: Inspect tags for a specific module path. Returns the tags assigned to the module. Use to verify module tagging matches expectations.
- **`sheriff_moduleStructure`**: Get module structure with tags for mermaid chart generation. Only includes modules with tags. Use for visualization and understanding module hierarchy.

### Verification Workflow After Writing Config

After writing a config file with `config_write`, use these tools to verify the configuration works correctly:

1. **Check Actual Imports First** ⭐: Use `sheriff_full_allowedMatrix` to see all real imports in the codebase:
   - Understand what modules actually depend on each other
   - Identify critical import paths that must be allowed
   - Use this as ground truth for validation

2. **Verify Module Tags**: Use `sheriff_summarizeTags` for key modules:
   - Check bookings has correct domain tag (not `noTag`)
   - Check shared modules have `'shared'` tag
   - Verify each module has expected tags

3. **Validate Dependency Rules** ⭐ (CRITICAL): Use `sheriff_getModuleAccessList` for each key module:
   - **Domain Isolation**: Check holidays CANNOT access customers (except via shared)
   - **Domain Isolation**: Check customers CANNOT access holidays (except via shared)
   - **Exception Rules**: Check bookings CAN access customers modules
   - **Shared Access**: Check all domains CAN access all shared modules
   - **Shared Isolation**: Check shared modules CANNOT access domain modules
   - **Type Hierarchy**: Check feature can access api/data/ui/model within same domain

4. **Cross-Reference with Real Imports**: Compare results from step 1 (actual imports) with step 3 (allowed access):
   - Ensure ALL actual imports from `sheriff_full_allowedMatrix` are in the allowed lists from `sheriff_getModuleAccessList`
   - If any real import is missing from allowed list, config is wrong and will break the build

5. **Verify Module Structure**: Use `sheriff_moduleStructure` to visualize:
   - Module hierarchy matches expectations
   - Tag relationships are correct
   - No missing or incorrectly tagged modules

### Example Verification Queries

**Primary Validation Queries (Always use these):**
- "Which modules can `src/app/customers/feature` access?" → `sheriff_getModuleAccessList(modulePath: "src/app/customers/feature")`
  - Returns: `["src/app/customers/api", "src/app/customers/data", "src/app/shared/config", ...]`
- "Show me all actual file imports" → `sheriff_full_allowedMatrix()`
  - Returns: Complete object showing which files import which files
- "Can holidays access customers?" → `sheriff_getModuleAccessList(modulePath: "src/app/holidays/feature")` 
  - Check if result includes any `src/app/customers/*` paths (should be NO for domain isolation)

**Secondary Queries:**
- "What tags does module have?" → `sheriff_summarizeTags(modulePath: "src/app/shared/config")`
  - Returns: `["shared", "type:config"]`
- "Visualize module structure" → `sheriff_moduleStructure()`
  - Returns: List of modules with tags + Mermaid diagram

## Migration Notes
- Review release notes for breaking changes when upgrading Sheriff
- Sheriff aims to avoid breaking changes, but always validate configs with the latest tooling
- Use `npx sheriff init` to generate initial config for new projects
- For existing projects, start with auto-tagging defaults and incrementally add explicit modules
- **Always verify configs after writing** using the analysis and verification tools above

## Important Guardrails
- **Never** create configs that allow all modules to access everything (defeats Sheriff's purpose)
- **Always** validate configs using `sheriff_getModuleAccessList` for each key module
- **Always** check actual imports with `sheriff_full_allowedMatrix` to ensure no legitimate imports are blocked
- **Remember** that root module behavior differs based on `enableBarrelLess` setting
- **Ensure** dependency rules are symmetric where needed (e.g., `noTag: ['noTag', 'root']` allows bidirectional access)
- **Use** explicit tags and rules rather than relying solely on defaults for production code
- **Critical**: When using dual-tag system, make type rules domain-aware using functions to prevent cross-domain access via type rules

## Validation Checklist

After generating a Sheriff config, verify these requirements using `sheriff_getModuleAccessList`:

| Check | Tool | Expected Result |
|-------|------|-----------------|
| Domain isolation | `sheriff_getModuleAccessList` for each domain | Each domain's allowed list should NOT include other domains |
| Shared access | `sheriff_getModuleAccessList` for each domain | All domains should include all shared modules |
| Exception rules | `sheriff_getModuleAccessList` for exception source | Allowed list includes exception target |
| No false positives | Compare with `sheriff_full_allowedMatrix` | All actual imports are in allowed lists |

Keep responses grounded in this reference and avoid introducing undocumented behaviors.

