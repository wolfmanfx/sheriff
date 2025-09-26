/**
 * Path Utilities
 * Functions for resolving and validating paths
 */
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'dotenv';

/**
 * Resolves working directory path from parameter or environment.
 * Falls back to workspace root from env vars if no parameter provided.
 *
 * @param cwdParam - Optional working directory path (string or unknown)
 * @returns Absolute path to working directory
 */
export function resolveCwd(cwdParam?: string | unknown): string {
  const param = typeof cwdParam === 'string' ? cwdParam.trim() : '';
  if (!param) return getRootFromEnv();
  return path.isAbsolute(param) ? param : path.join(process.cwd(), param);
}

/**
 * Checks if a path is within the current workspace boundaries.
 *
 * @param absPath - Absolute path to check
 * @returns True if path is under workspace root, false otherwise
 */
export function isUnderWorkspace(absPath: string): boolean {
  const ws = process.cwd();
  const normalized = path.normalize(absPath);
  return normalized === ws || normalized.startsWith(ws + path.sep);
}

/**
 * Validates that a path is within workspace boundaries.
 * Throws error if path is outside workspace.
 *
 * @param absPath - Absolute path to validate
 * @throws Error if path is outside workspace
 */
export function ensureUnderWorkspace(absPath: string): void {
  if (!isUnderWorkspace(absPath)) {
    throw new Error('Path outside workspace');
  }
}

/**
 * Gets workspace root directory from environment variables.
 * Checks SHERIFF_ROOT or WORKSPACE_ROOT env vars, then .env file.
 *
 * @returns Absolute path to workspace root, or current working directory as fallback
 */
export function getRootFromEnv(): string {
  const fromProcess = process.env.SHERIFF_ROOT || process.env.WORKSPACE_ROOT;
  if (fromProcess && path.isAbsolute(fromProcess)) return fromProcess;

  const envPath = path.join(process.cwd(), '.env');
  try {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, { encoding: 'utf-8' });
      const env = parse(content);
      const val = env['SHERIFF_ROOT'] || env['WORKSPACE_ROOT'];
      if (val) {
        return path.isAbsolute(val) ? val : path.join(process.cwd(), val);
      }
    }
  } catch {
    // ignore
  }
  return process.cwd();
}

