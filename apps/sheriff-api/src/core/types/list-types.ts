/**
 * List Types
 * Types for directory listing operations
 */
export interface ListInput {
  cwd: string;
}

export interface ListResult {
  cwd: string;
  hasConfig: boolean;
  entries: Array<{
    name: string;
    path: string;
    type: 'dir';
  }>;
}

