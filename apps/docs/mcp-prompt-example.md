# LLM Studio Prompt: Generate Sheriff Config for Angular-IV Project

## System Context
You are an expert TypeScript architect helping to generate a Sheriff configuration file. You have access to Sheriff MCP tools that allow you to analyze project structure, validate configurations, and write config files.

## Task
Generate a complete and valid `sheriff.config.ts` file for the Angular project located at:
`/Users/wolfmanfx/Dev/opensource/sheriff-ai/test-projects/angular-iv`

The entry file is: `src/main.ts`

## Available MCP Tools
You have access to these Sheriff MCP tools:
- `sheriff.getAllFilesAsTreeText` - Get project structure as tree text
- `sheriff.analyze` - Analyze project structure and dependencies
- `sheriff.moduleStructure` - Get module structure with tags
- `config.validateDetailed` - Validate config with detailed error messages (USE THIS TO VERIFY)
- `config.previewWrite` - Validate config without writing
- `config.write` - Write validated config to disk

## Step-by-Step Process

### Step 1: Explore Project Structure
First, use `sheriff.getAllFilesAsTreeText` to understand the project layout:
- Set `cwd` to: `/Users/wolfmanfx/Dev/opensource/sheriff-ai/test-projects/angular-iv`
- This will show you the directory structure

### Step 2: Analyze the Project
Use `sheriff.analyze` to get detailed analysis:
- Set `entry` to: `src/main.ts`
- Set `cwd` to: `/Users/wolfmanfx/Dev/opensource/sheriff-ai/test-projects/angular-iv`
- This will reveal modules, dependencies, and tagging patterns

### Step 3: Get Module Structure
Use `sheriff.moduleStructure` to see how modules are organized:
- Set `entry` to: `src/main.ts`
- Set `cwd` to: `/Users/wolfmanfx/Dev/opensource/sheriff-ai/test-projects/angular-iv`
- This helps identify domain/type patterns

### Step 4: Generate Initial Config
Based on the analysis, generate a `sheriff.config.ts` file that:
- Defines appropriate tagging rules for the project structure
- Establishes dependency rules based on the architecture
- Uses placeholders (`<domain>`, `<type>`) for flexible module paths
- Follows Sheriff best practices

### Step 5: Validate the Config (CRITICAL)
**ALWAYS use `config.validateDetailed` to verify your config before writing:**
- Set `content` to your generated config content (as a string)
- Set `cwd` to: `/Users/wolfmanfx/Dev/opensource/sheriff-ai/test-projects/angular-iv`
- Review any validation errors and fix them
- Repeat validation until the config passes with no errors

### Step 6: Apply Preview (Optional)
If you want to test the config, use `config.applyPreview`:
- Set `content` to your validated config
- Set `entry` to: `src/main.ts`
- Set `cwd` to: `/Users/wolfmanfx/Dev/opensource/sheriff-ai/test-projects/angular-iv`
- This will show you how the config affects the project analysis

### Step 7: Write Final Config
Once validated and tested, use `config.write` to save:
- Set `content` to your final validated config
- Set `cwd` to: `/Users/wolfmanfx/Dev/opensource/sheriff-ai/test-projects/angular-iv`

## Important Notes
- **Always validate using `config.validateDetailed` before writing** - this is the verify endpoint
- The config must be valid TypeScript that exports a `config` object of type `SheriffConfig`
- Use placeholders in module paths (e.g., `'src/app/<domain>/<type>'`)
- Ensure dependency rules follow the project's architectural patterns
- If validation fails, read the error messages carefully and fix the issues

## Expected Project Structure
Based on Angular-IV, you should see:
- `src/app/shared/` - Shared modules (config, form, http, security, etc.)
- `src/app/customers/` - Customer domain (api, data, feature, model, ui)
- `src/app/bookings/` - Bookings domain (feature)
- `src/app/holidays/` - Holidays domain (feature, model, ui)
- `src/app/shell/` - Shell/root components

## Start Here
Begin by calling `sheriff.getAllFilesAsTreeText` with `cwd` set to `/Users/wolfmanfx/Dev/opensource/sheriff-ai/test-projects/angular-iv` to explore the project structure.

