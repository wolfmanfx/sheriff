/**
 * Config Types
 * Types for configuration file operations
 */
import type { ProjectData } from '@softarc/sheriff-core';
import type { DirNode } from './dir-node';

export interface ConfigReadInput {
  cwd: string;
}

export interface ConfigReadResult {
  content: string;
  checksum: string;
}

export interface ConfigPreviewWriteInput {
  content: string;
  cwd: string;
}

export interface ConfigPreviewWriteResult {
  valid: boolean;
  errors?: string[];
  checksum?: string;
  content?: string;
}

export interface ConfigApplyPreviewInput {
  content: string;
  entry: string;
  cwd: string;
}

export interface ConfigApplyPreviewResult {
  cwd: string;
  tree: DirNode;
  analysis: Record<
    string,
    ProjectData[string] & { fileId?: string }
  >;
  fileIdByPathRel: Record<string, string>;
  configValid: boolean;
  errors?: string[];
}

export interface ConfigValidateDetailedInput {
  content: string;
  cwd: string;
}

export interface ConfigValidationError {
  type: 'syntax' | 'structure' | 'semantic' | 'runtime';
  message: string;
  line?: number;
  column?: number;
  path?: string;
}

export interface ConfigValidateDetailedResult {
  valid: boolean;
  errors: ConfigValidationError[];
  warnings?: string[];
}

export interface ConfigWriteInput {
  content: string;
  cwd: string;
}

export interface ConfigWriteResult {
  ok: boolean;
  checksum: string;
  path: string;
}

export interface GenerateSheriffConfigInput {
  cwd: string;
  entry: string;
}

export interface GenerateSheriffConfigResult {
  prompt: string;
}

