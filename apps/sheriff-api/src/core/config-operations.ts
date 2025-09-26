/**
 * Config Operations
 * Functions for reading, writing, and validating config files
 */
import * as fs from 'fs';
import * as path from 'path';
import type {
  ListResult,
  ConfigPreviewWriteResult,
  ConfigApplyPreviewResult,
  ConfigValidateDetailedResult,
} from './types';
import { resolveCwd } from './path-utils';
import { computeChecksum } from './crypto-utils';
import { buildFolderTree } from './tree-operations';
import { analyzeAndMerge } from './analysis-operations';
import { ConfigValidator } from './config-validator';
import { ConfigPreviewManager } from './config-preview-manager';

/**
 * Reads sheriff.config.ts file and computes its checksum.
 *
 * @param cwd - Working directory containing the config file
 * @returns Config content and MD5 checksum
 * @throws Error if config file not found
 */
export function readConfig(cwd: string): { content: string; checksum: string } {
  const configPath = path.join(cwd, 'sheriff.config.ts');
  if (!fs.existsSync(configPath)) {
    throw new Error('sheriff.config.ts not found');
  }
  const content = fs.readFileSync(configPath, { encoding: 'utf-8' });
  const checksum = computeChecksum(content);
  return { content, checksum };
}

/**
 * Writes sheriff.config.ts file to disk and computes checksum.
 *
 * @param cwd - Working directory to write config file
 * @param content - Config file content to write
 * @returns Written file path and computed checksum
 */
export function writeConfig(
  cwd: string,
  content: string,
): { checksum: string; path: string } {
  const configPath = path.join(cwd, 'sheriff.config.ts');
  fs.writeFileSync(configPath, content, { encoding: 'utf-8' });
  const checksum = computeChecksum(content);
  return { checksum, path: configPath };
}

/**
 * Checks if sheriff.config.ts exists in the given directory.
 *
 * @param cwd - Working directory to check
 * @returns True if config file exists, false otherwise
 */
export function hasConfig(cwd: string): boolean {
  return fs.existsSync(path.join(cwd, 'sheriff.config.ts'));
}

/**
 * List directory contents with workspace boundary checks
 * Ignores node_modules, test folders, and folders starting with '.'
 *
 * @param cwdParam - Optional working directory path
 * @returns Directory listing with config file presence indicator
 */
export function listDirectories(cwdParam?: string): ListResult {
  const targetCwd = resolveCwd(cwdParam);

  const ignoredFolders = new Set(['node_modules', 'test', 'tests']);
  const isIgnored = (name: string): boolean =>
    name.startsWith('.') || ignoredFolders.has(name.toLowerCase());

  const entries = fs
    .readdirSync(targetCwd, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !isIgnored(d.name))
    .map((d) => ({
      name: d.name,
      path: path.join(targetCwd, d.name),
      type: 'dir' as const,
    }));

  const hasConfigResult = hasConfig(targetCwd);

  return { cwd: targetCwd, hasConfig: hasConfigResult, entries };
}

/**
 * Read sheriff.config.ts file with checksum
 *
 * @param cwdParam - Optional working directory path
 * @returns Config content and checksum
 */
export function readConfigFile(cwdParam?: string): { content: string; checksum: string } {
  const targetCwd = resolveCwd(cwdParam);
  return readConfig(targetCwd);
}

/**
 * Validate config without writing to disk
 *
 * @param content - Config file content to validate
 * @param _cwdParam - Optional working directory path (unused but kept for API consistency)
 * @returns Validation result with checksum
 */
export function previewWriteConfig(
  content: string,
  _cwdParam?: string,
): ConfigPreviewWriteResult {
  const errors = [
    ...ConfigValidator.validateSemantic(content),
    ...ConfigValidator.validateRuntime(content),
  ];

  const checksum = computeChecksum(content);

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    checksum,
    content,
  };
}

/**
 * Apply config temporarily and run analysis for preview
 * This allows realtime preview updates when config changes
 *
 * @param content - Config file content to apply temporarily
 * @param entry - Entry file path (relative to cwd)
 * @param cwdParam - Optional working directory path
 * @returns Analysis result with tree and file mappings
 */
export function applyConfigPreview(
  content: string,
  entry: string,
  cwdParam?: string,
): ConfigApplyPreviewResult {
  const targetCwd = resolveCwd(cwdParam);
  const validation = previewWriteConfig(content, cwdParam);

  if (!validation.valid) {
    return createInvalidPreviewResult(targetCwd, validation.errors);
  }

  const configPath = path.join(targetCwd, 'sheriff.config.ts');
  const backupPath = `${configPath}.backup.${Date.now()}`;
  const previewManager = new ConfigPreviewManager(configPath, backupPath);

  const { originalConfig, configExists } = previewManager.backup();

  try {
    previewManager.writePreview(content);

    const { tree, analysis, fileIdByPathRel } = analyzeAndMerge(entry, targetCwd);

    return {
      cwd: targetCwd,
      tree,
      analysis,
      fileIdByPathRel,
      configValid: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createInvalidPreviewResult(targetCwd, [`Analysis error: ${errorMessage}`]);
  } finally {
    previewManager.restore(configExists, originalConfig);
  }
}

/**
 * Validate config with detailed error messages
 * Returns precise error locations and types
 *
 * @param content - Config file content to validate
 * @param cwdParam - Optional working directory path
 * @returns Detailed validation result with error locations
 */
export function validateConfigDetailed(
  content: string,
  cwdParam?: string,
): ConfigValidateDetailedResult {
  const targetCwd = resolveCwd(cwdParam);
  const configPath = path.join(targetCwd, 'sheriff.config.ts');

  const errors = ConfigValidator.validateDetailed(content, configPath, targetCwd);

  return {
    valid: errors.length === 0,
    errors,
    warnings: undefined,
  };
}

/**
 * Write config to disk
 * Validates the config first, then writes it
 *
 * @param content - Config file content to write
 * @param cwdParam - Optional working directory path
 * @returns Written file path and computed checksum
 * @throws Error if validation fails
 */
export function writeConfigFile(
  content: string,
  cwdParam?: string,
): { ok: boolean; checksum: string; path: string } {
  const targetCwd = resolveCwd(cwdParam);

  const validation = validateConfigDetailed(content, cwdParam);

  if (!validation.valid) {
    const errorMessages = validation.errors.map((e: { message: string }) => e.message).join('; ');
    throw new Error(`Config validation failed: ${errorMessages}`);
  }

  const { checksum, path: configPath } = writeConfig(targetCwd, content);

  return {
    ok: true,
    checksum,
    path: configPath,
  };
}

/**
 * Creates an invalid preview result with error information
 *
 * @param targetCwd - Working directory path
 * @param errors - Array of error messages
 * @returns Invalid preview result with empty tree and analysis
 */
function createInvalidPreviewResult(
  targetCwd: string,
  errors: string[] | undefined,
): ConfigApplyPreviewResult {
  const tree = buildFolderTree(targetCwd, targetCwd, true);
  return {
    cwd: targetCwd,
    tree,
    analysis: {},
    fileIdByPathRel: {},
    configValid: false,
    errors,
  };
}

