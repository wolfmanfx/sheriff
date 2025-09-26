import { getAllFilesAsTreeText } from '../../../core';

export function analyzeProjectStructure(cwd: string): unknown {
  return getAllFilesAsTreeText(cwd);
}

