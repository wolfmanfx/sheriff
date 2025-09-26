import type { DirNode } from '../../../api/model/dir-node';
import type { SerializableDepRules } from './dep-rules';
import type { TagsByPathRel } from './tag-types';
import type { ManualConfigOptions } from './config-options';

export type PreviewContext = {
  cwd: string;
  tree: DirNode;
  analysis: unknown;
  fileIdByPathRel: Record<string, string>;
  configValid: boolean;
  errors?: string[];
  depRulesRaw?: SerializableDepRules;
  options?: ManualConfigOptions;
  inferredModulesByPathRel: TagsByPathRel;
  originalModulesConfig: TagsByPathRel;
  explicitModulesConfig: TagsByPathRel;
};

export type InitResponse = {
  cwd: string;
  entry: string;
  missingConfig: boolean;
  activeConfigContent: string;
  draft: string;
  preview?: PreviewContext;
};

export type MutationResponse = {
  draft: string;
  preview: PreviewContext;
};
