import { DirNode } from "./dir-node";

export type AnalyzeMergeResponse = {
  cwd: string;
  tree: DirNode;
  analysis: unknown;
  fileIdByPathRel: Record<string, string>;
  allowedMatrixById?: Record<string, Record<string, boolean>>;
};
