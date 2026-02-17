import { readFileSync, writeFileSync } from 'node:fs';
import type { Hono } from 'hono';
import { resolveFilePath, findInSource } from '../matcher/index.js';
import { ClaudeCodeAgent } from '../agent/claude.js';
import { validateFilePath } from '../security.js';

export function registerApiRoutes(app: Hono, rootDir: string): void {
  const agent = new ClaudeCodeAgent();

  app.post('/api/edit', async (c) => {
    const { filePath, selectedText, instruction } = await c.req.json<{
      filePath: string;
      selectedText: string;
      instruction: string;
    }>();

    const resolved = resolveFilePath(rootDir, filePath);
    if (!resolved) {
      return c.json({ error: `File not found: ${filePath}` }, 404);
    }

    if (!validateFilePath(rootDir, filePath)) {
      return c.json({ error: 'Invalid file path' }, 403);
    }

    const match = findInSource(resolved, selectedText);
    if (!match) {
      return c.json({ error: 'ソース内にテキストが見つかりません。' }, 404);
    }

    try {
      const fullSource = readFileSync(resolved, 'utf-8');
      const modified = await agent.edit({
        fullSource,
        matchedSource: match.matchedSource,
        selectedText,
        startLine: match.startLine,
        endLine: match.endLine,
        instruction,
        fileKey: filePath,
      });

      return c.json({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        original: match.matchedSource,
        modified,
        startLine: match.startLine,
        endLine: match.endLine,
        filePath: match.filePath,
      });
    } catch (err) {
      return c.json(
        { error: err instanceof Error ? err.message : 'Unknown error' },
        500,
      );
    }
  });

  app.post('/api/apply', async (c) => {
    const { filePath, startLine, endLine, modified } = await c.req.json<{
      filePath: string;
      startLine: number;
      endLine: number;
      modified: string;
    }>();

    if (!validateFilePath(rootDir, filePath)) {
      return c.json({ error: 'Invalid file path' }, 403);
    }

    try {
      const source = readFileSync(filePath, 'utf-8');
      const lines = source.split('\n');
      const modifiedLines = modified.split('\n');
      lines.splice(startLine - 1, endLine - startLine + 1, ...modifiedLines);
      writeFileSync(filePath, lines.join('\n'), 'utf-8');
      return c.json({ success: true });
    } catch (err) {
      return c.json(
        { error: err instanceof Error ? err.message : 'Unknown error' },
        500,
      );
    }
  });

  app.post('/api/reset-session', async (c) => {
    const { filePath } = await c.req.json<{ filePath: string }>();
    agent.resetSession(filePath);
    return c.json({ success: true });
  });
}
