/**
 * Sheriff Types
 * Types for Sheriff analysis and operations
 */
import type { ProjectData } from '@softarc/sheriff-core';
import type { DirNode } from './dir-node';

export interface AnalyzeInput {
  entry: string;
  cwd: string;
}

export interface AnalyzeResult {
  cwd: string;
  tree: DirNode;
  analysis: Record<
    string,
    ProjectData[string] & { fileId?: string }
  >;
  fileIdByPathRel: Record<string, string>;
}

export interface AllowedMatrixInput {
  entry: string;
  cwd: string;
  selectedModules: string[];
}

export interface AllowedMatrixResult {
  allowedMatrixById: Record<string, Record<string, boolean>>;
}

export interface FullImportMatrixInput {
  entry: string;
  cwd: string;
}

export interface FullImportMatrixResult {
  importMatrix: Record<string, Record<string, boolean>>;
}

export interface SummarizeTagsInput {
  modulePath: string;
  entry?: string;
  cwd: string;
}

export interface SummarizeTagsResult {
  tags: string[];
  modulePath: string;
}

export interface ModuleAccessListInput {
  modulePath: string;
  entry: string;
  cwd: string;
}

export interface ModuleAccessListResult {
  modulePath: string;
  allowedModules: string[];
}

export interface ModuleStructureInput {
  entry: string;
  cwd: string;
}

export interface ModuleStructureResult {
  modules: Array<{
    path: string;
    tags: string[];
  }>;
  mermaid: string;
}

export interface GetAllFilesAsTreeTextInput {
  cwd: string;
  rootPath?: string;
}

export interface GetAllFilesAsTreeTextResult {
  treeText: string;
}

