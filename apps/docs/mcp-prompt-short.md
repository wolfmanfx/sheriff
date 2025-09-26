# Quick Prompt for LLM Studio

Generate a Sheriff configuration for the Angular project at `/Users/wolfmanfx/Dev/opensource/sheriff-ai/test-projects/angular-iv` with entry file `src/main.ts`.

**Process:**
1. Use `sheriff.getAllFilesAsTreeText` with `cwd: "/Users/wolfmanfx/Dev/opensource/sheriff-ai/test-projects/angular-iv"` to explore structure
2. Use `sheriff.analyze` with `entry: "src/main.ts"` and `cwd: "/Users/wolfmanfx/Dev/opensource/sheriff-ai/test-projects/angular-iv"` to analyze dependencies
3. Generate a `sheriff.config.ts` with proper tagging and dependency rules
4. **CRITICAL: Use `config.validateDetailed` with your config content and `cwd` to verify** - fix any errors
5. Use `config.write` to save the validated config

Always validate with `config.validateDetailed` before writing. The config must export a valid `SheriffConfig` object.

