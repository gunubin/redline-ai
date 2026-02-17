import { resolve } from 'node:path';

export function validateFilePath(rootDir: string, filePath: string): string | null {
  const absRoot = resolve(rootDir);
  const absPath = resolve(absRoot, filePath);
  if (!absPath.startsWith(absRoot + '/') && absPath !== absRoot) {
    return null;
  }
  return absPath;
}
