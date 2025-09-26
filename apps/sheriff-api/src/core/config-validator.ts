/**
 * Config Validator
 *
 * Validates sheriff.config.ts files to ensure they are syntactically correct, semantically valid,
 * and structurally sound before they are written to disk or used by Sheriff.
 *
 * **Why this validator exists:**
 *
 * 1. **Early Error Detection**: Sheriff configs are TypeScript files that must be valid both
 *    syntactically and semantically. Without validation, users would only discover errors when
 *    Sheriff attempts to load the config at runtime, leading to cryptic error messages and
 *    poor developer experience.
 *
 * 2. **Real-time Feedback**: The UI uses this validator to provide immediate feedback as users
 *    edit config files, catching errors before they save. This prevents invalid configurations
 *    from being written and breaking the Sheriff workflow.
 *
 * 3. **Semantic Rule Enforcement**: Sheriff has specific rules that can't be caught by TypeScript
 *    alone (e.g., "cannot use both tagging and modules", "if autoTagging is false, modules or
 *    tagging is required"). This validator enforces these business rules.
 *
 * 4. **Structure Validation**: Ensures the config exports a valid SheriffConfig object with
 *    required properties like `depRules`, and validates the structure of nested properties.
 *
 * 5. **Runtime Safety**: By evaluating the config in a sandboxed VM environment, we can catch
 *    runtime errors (like missing imports, invalid expressions) before the config is actually
 *    used by Sheriff's core engine.
 *
 * The validator performs three types of checks:
 * - **Semantic**: String-based pattern matching for conflicting or invalid property combinations
 * - **Syntax**: TypeScript compiler diagnostics for syntax errors with line/column information
 * - **Runtime**: Actual evaluation of the config in a VM to validate structure and catch runtime errors
 */
import * as vm from 'vm';
import type { ConfigValidationError } from './types';
import type { SheriffConfig } from '@softarc/sheriff-core';
import * as sheriffCore from '@softarc/sheriff-core';

/**
 * Validates sheriff.config.ts content structure, syntax, and semantics.
 *
 * Provides static methods for validating config files at different levels:
 * - Semantic validation (fast, string-based checks)
 * - Runtime validation (evaluates config in VM)
 * - Detailed validation (combines all checks with line numbers)
 */
export class ConfigValidator {
  /**
   * Validates config semantic rules using string pattern matching.
   *
   * Performs fast, lightweight checks for conflicting properties and invalid combinations
   * without requiring full TypeScript compilation. This is useful for real-time validation
   * in the UI where performance matters.
   *
   * @param content - The raw config file content as a string
   * @returns Array of error messages for semantic violations
   */
  static validateSemantic(content: string): string[] {
    const errors: string[] = [];
    const hasModules = content.includes('modules:');
    const hasTagging = content.includes('tagging:');
    const autoTaggingFalse = /autoTagging:\s*false/.test(content);

    if (autoTaggingFalse && !hasModules && !hasTagging) {
      errors.push('If autoTagging is false, modules or tagging property is required');
    }

    if (hasTagging && hasModules) {
      errors.push(
        'Cannot use both tagging and modules properties (tagging is deprecated, use modules)',
      );
    }

    const hasEntryFile = content.includes('entryFile:');
    const hasEntryPoints = content.includes('entryPoints:');
    if (hasEntryFile && hasEntryPoints) {
      errors.push('Cannot use both entryFile and entryPoints properties (use only one)');
    }

    return errors;
  }

  /**
   * Validates the evaluated config object structure and properties.
   *
   * Checks that the config is a valid object with required properties (like depRules)
   * and validates the structure of nested properties. Also performs runtime semantic
   * validation on the actual config object (duplicated from validateSemantic for
   * runtime checks).
   *
   * @param config - The evaluated config object (unknown type for type safety)
   * @returns Array of validation error messages
   */
  private static validateConfigObject(config: unknown): string[] {
    if (typeof config !== 'object' || config === null) {
      return ['Config must export an object'];
    }

    const configObj = config as SheriffConfig;

    if (!configObj.depRules || typeof configObj.depRules !== 'object') {
      return ['Config must have a depRules property that is an object'];
    }

    const errors = [...this.validateDepRules(configObj.depRules)];

    if (configObj.autoTagging === false && !configObj.modules && !configObj.tagging) {
      errors.push('If autoTagging is false, modules or tagging property is required');
    }

    if (configObj.tagging && configObj.modules) {
      errors.push('Cannot use both tagging and modules properties');
    }

    if (configObj.entryFile && configObj.entryPoints) {
      errors.push('Cannot use both entryFile and entryPoints properties');
    }

    return errors;
  }

  /**
   * Validates the structure and types of depRules values.
   *
   * Ensures that depRules keys are non-empty strings and values are valid types:
   * - string (single allowed tag)
   * - function (dynamic rule function)
   * - array of strings/functions (multiple allowed tags or rules)
   *
   * @param depRules - The depRules object to validate
   * @returns Array of validation error messages
   */
  private static validateDepRules(depRules: unknown): string[] {
    const errors: string[] = [];

    if (typeof depRules !== 'object' || depRules === null || Array.isArray(depRules)) {
      return errors;
    }

    for (const [tag, allowedTags] of Object.entries(depRules as Record<string, unknown>)) {
      if (typeof tag !== 'string' || tag.trim() === '') {
        errors.push(`depRules key must be a non-empty string, got: ${typeof tag}`);
        continue;
      }

      if (allowedTags === null || allowedTags === undefined) {
        errors.push(`depRules value for '${tag}' cannot be null or undefined`);
        continue;
      }

      if (typeof allowedTags === 'string' || typeof allowedTags === 'function') {
        continue;
      }

      if (Array.isArray(allowedTags)) {
        for (const item of allowedTags) {
          if (typeof item !== 'string' && typeof item !== 'function') {
            errors.push(
              `depRules value for '${tag}' contains invalid item: must be string or function`,
            );
          }
        }
        continue;
      }

      errors.push(
        `depRules value for '${tag}' must be a string, array of strings/functions, or function, got: ${typeof allowedTags}`,
      );
    }

    return errors;
  }

  /**
   * Evaluates the config content in a sandboxed VM and validates the resulting object.
   *
   * This method:
   * 1. Transpiles TypeScript to JavaScript in memory using TypeScript compiler
   * 2. Replaces require("@softarc/sheriff-core") imports with direct reference to avoid module resolution issues
   * 3. Executes the JavaScript in a Node.js VM sandbox with sheriff-core injected
   * 4. Extracts the exported config object (supports various export patterns)
   * 5. Validates the actual config object structure
   *
   * @param content - The config file content to validate
   * @returns Array of validation error messages
   */
  private static evaluateAndValidateConfig(content: string): string[] {
    if (!content.trim()) {
      return ['Config content cannot be empty'];
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ts = require('typescript');

      const { outputText } = ts.transpileModule(content, {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2020,
          esModuleInterop: true,
        },
      });

      const processedCode = outputText.replace(
        /require\(['"]@softarc\/sheriff-core['"]\)/g,
        '__sheriffCore',
      );

      const moduleScope: { exports: Record<string, unknown> } = { exports: {} };
      const sandbox = vm.createContext({
        module: moduleScope,
        exports: moduleScope.exports,
        __sheriffCore: sheriffCore,
        console,
        process,
        Buffer,
      });

      vm.runInContext(processedCode, sandbox, { filename: 'sheriff.config.ts' });

      const exported = moduleScope.exports ?? {};
      const config =
        exported.config ?? exported.sheriffConfig ?? exported.default ?? exported;

      return this.validateConfigObject(config);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return [`Config evaluation error: ${message}`];
    }
  }

  /**
   * Validates config by evaluating it in a VM and checking runtime structure.
   *
   * This performs full runtime validation including transpilation, execution, and
   * structural validation. Use this when you need to catch runtime errors and validate
   * the actual config object structure.
   *
   * @param content - The config file content to validate
   * @returns Array of validation error messages
   */
  static validateRuntime(content: string): string[] {
    return this.evaluateAndValidateConfig(content);
  }

  /**
   * Converts an array of string error messages to ConfigValidationError objects.
   *
   * @param errors - Array of error message strings
   * @param type - The type of validation error (semantic, runtime, syntax)
   * @returns Array of ConfigValidationError objects
   */
  private static toValidationErrors(
    errors: string[],
    type: ConfigValidationError['type'],
  ): ConfigValidationError[] {
    return errors.map((message) => ({ type, message }));
  }

  /**
   * Validates TypeScript syntax using the TypeScript compiler API.
   *
   * Creates a TypeScript program and extracts pre-emit diagnostics to catch syntax errors,
   * type errors, and other compilation issues. Returns errors with line and column information
   * for precise error reporting in the UI.
   *
   * @param content - The config file content to validate
   * @param configPath - The file path to use for diagnostics (e.g., 'sheriff.config.ts')
   * @param targetCwd - The working directory context for the TypeScript compiler
   * @returns Array of ConfigValidationError objects with line/column information
   */
  private static validateTypeScriptSyntax(
    content: string,
    configPath: string,
    targetCwd: string,
  ): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ts = require('typescript');
      const sourceFile = ts.createSourceFile(configPath, content, ts.ScriptTarget.ES2020, true);

      const compilerHost = {
        getSourceFile: (fileName: string) =>
          fileName === configPath ? sourceFile : undefined,
        writeFile: () => {},
        getCurrentDirectory: () => targetCwd,
        getCanonicalFileName: (fileName: string) => fileName,
        useCaseSensitiveFileNames: () => true,
        getNewLine: () => '\n',
        fileExists: (fileName: string) => fileName === configPath,
        readFile: (fileName: string) => (fileName === configPath ? content : undefined),
        getDefaultLibFileName: () => 'lib.d.ts',
      };

      const diagnostics = ts.getPreEmitDiagnostics(
        ts.createProgram(
          [configPath],
          {
            target: ts.ScriptTarget.ES2020,
            module: ts.ModuleKind.NodeNext,
            esModuleInterop: true,
          },
          compilerHost,
        ),
      );

      for (const diagnostic of diagnostics) {
        if (diagnostic.file) {
          const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
            diagnostic.start || 0,
          );
          errors.push({
            type: 'syntax',
            message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
            line: line + 1,
            column: character + 1,
          });
        }
      }
    } catch (parseError) {
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      errors.push({
        type: 'syntax',
        message: `TypeScript parse error: ${errorMessage}`,
      });
    }

    return errors;
  }

  /**
   * Performs comprehensive validation with detailed error information.
   *
   * Combines semantic, syntax, and runtime validation to provide complete error reporting
   * with line numbers and column positions. This is the most thorough validation method
   * and should be used when you need complete error information for display in the UI.
   *
   * @param content - The config file content to validate
   * @param configPath - The file path to use for diagnostics (e.g., 'sheriff.config.ts')
   * @param targetCwd - The working directory context for the TypeScript compiler
   * @returns Array of ConfigValidationError objects with type, message, and optional line/column
   */
  static validateDetailed(
    content: string,
    configPath: string,
    targetCwd: string,
  ): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];

    errors.push(...this.toValidationErrors(this.validateSemantic(content), 'semantic'));

    errors.push(...this.validateTypeScriptSyntax(content, configPath, targetCwd));

    errors.push(...this.toValidationErrors(this.validateRuntime(content), 'runtime'));

    return errors;
  }
}

