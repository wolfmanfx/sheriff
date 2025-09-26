/**
 * File Node Type
 * Represents a file in the file tree
 */
export type FileNode = {
  id: string;
  name: string;
  pathRel: string;
  pathAbs: string;
  type: 'file';
};

