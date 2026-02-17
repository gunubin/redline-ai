import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { stripMarkdown, normalizeWhitespace } from './strip.js';

export interface MatchResult {
  filePath: string;
  startLine: number;
  endLine: number;
  matchedSource: string;
}

/**
 * Resolve a relative file path within rootDir.
 * Tries .md and .mdx extensions if the path has no extension.
 */
export function resolveFilePath(rootDir: string, relativePath: string): string | null {
  const absRoot = resolve(rootDir);
  const candidate = resolve(absRoot, relativePath);

  // Security: ensure path is within rootDir
  if (!candidate.startsWith(absRoot + '/') && candidate !== absRoot) {
    return null;
  }

  if (existsSync(candidate)) return candidate;

  // Try extensions
  for (const ext of ['.md', '.mdx']) {
    const withExt = candidate + ext;
    if (existsSync(withExt)) return withExt;
  }

  return null;
}

/**
 * List all Markdown/MDX files in a directory recursively.
 */
export function listMarkdownFiles(rootDir: string, prefix = ''): string[] {
  const absRoot = resolve(rootDir);
  const dir = prefix ? join(absRoot, prefix) : absRoot;
  const results: string[] = [];

  if (!existsSync(dir)) return results;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      results.push(...listMarkdownFiles(rootDir, relPath));
    } else if (/\.(md|mdx)$/.test(entry.name)) {
      results.push(relPath);
    }
  }

  return results;
}

/**
 * Find selected text in a Markdown/MDX source file.
 * Returns the matched line range and original source text.
 */
export function findInSource(filePath: string, selectedText: string): MatchResult | null {
  const source = readFileSync(filePath, 'utf-8');
  const lines = source.split('\n');
  const normalizedSelected = normalizeWhitespace(selectedText);

  if (!normalizedSelected) return null;

  // Skip frontmatter
  let contentStart = 0;
  if (lines[0]?.trim() === '---') {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i]?.trim() === '---') {
        contentStart = i + 1;
        break;
      }
    }
  }

  // Skip empty lines and import lines after frontmatter
  while (contentStart < lines.length) {
    const trimmed = lines[contentStart]?.trim();
    if (trimmed === '' || trimmed?.startsWith('import ')) {
      contentStart++;
    } else {
      break;
    }
  }

  // Build plain text representation with line mapping
  const plainLines: { text: string; lineIndex: number }[] = [];
  let inCodeBlock = false;
  for (let i = contentStart; i < lines.length; i++) {
    const line = lines[i]!;
    // Detect fenced code block boundaries
    if (/^```/.test(line.trim())) {
      inCodeBlock = !inCodeBlock;
      continue; // skip fence markers
    }
    if (inCodeBlock) {
      // Code block content: use as-is (no markdown stripping)
      const trimmed = line.trimEnd();
      if (trimmed) {
        plainLines.push({ text: trimmed, lineIndex: i });
      }
    } else {
      const stripped = stripMarkdown(line);
      if (stripped) {
        plainLines.push({ text: stripped, lineIndex: i });
      }
    }
  }

  // Concatenate plain text for multi-line matching
  const joinedPlain = plainLines.map((l) => l.text).join(' ');
  const matchIndex = normalizeWhitespace(joinedPlain).indexOf(normalizedSelected);

  if (matchIndex === -1) return null;

  // Find which lines the match spans
  let charCount = 0;
  let startLineIdx = -1;
  let endLineIdx = -1;

  for (let i = 0; i < plainLines.length; i++) {
    const lineText = plainLines[i]!.text;
    const lineEnd = charCount + lineText.length;

    if (startLineIdx === -1 && lineEnd > matchIndex) {
      startLineIdx = i;
    }
    if (lineEnd >= matchIndex + normalizedSelected.length) {
      endLineIdx = i;
      break;
    }

    charCount = lineEnd + 1; // +1 for the space joiner
  }

  if (startLineIdx === -1 || endLineIdx === -1) return null;

  const startLine = plainLines[startLineIdx]!.lineIndex;
  const endLine = plainLines[endLineIdx]!.lineIndex;

  const matchedSource = lines.slice(startLine, endLine + 1).join('\n');

  return {
    filePath,
    startLine: startLine + 1, // 1-indexed
    endLine: endLine + 1,
    matchedSource,
  };
}
