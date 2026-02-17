import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { getSession, setSession, deleteSession, hasSession } from './session.js';
import type { Agent, EditContext } from './index.js';

export class ClaudeCodeAgent implements Agent {
  edit(ctx: EditContext): Promise<string> {
    const { fullSource, matchedSource, selectedText, startLine, endLine, instruction, fileKey } = ctx;
    const isFirstCall = !hasSession(fileKey);
    const selectionContext =
      selectedText !== matchedSource.trim()
        ? `\nユーザーが選択した部分: 「${selectedText}」\n指示はこの選択部分に対して適用してください。選択部分以外は変更しないでください。`
        : '';

    let prompt: string;
    if (isFirstCall) {
      prompt = `あなたはドキュメントの編集アシスタントです。以下は編集対象のMarkdownドキュメント全体です:

<article>
${fullSource}
</article>

上記のドキュメントのL${startLine}-${endLine}にある以下の箇所を編集してください:

<target>
${matchedSource}
</target>
${selectionContext}
指示: ${instruction}

修正後のtarget全体を返してください。Markdown記法はそのまま維持してください。説明や前置きは不要です。`;
    } else {
      prompt = `同じドキュメントのL${startLine}-${endLine}にある以下の箇所を編集してください:

<target>
${matchedSource}
</target>
${selectionContext}
指示: ${instruction}

修正後のtarget全体を返してください。Markdown記法はそのまま維持してください。説明や前置きは不要です。`;
    }

    return new Promise((resolve, reject) => {
      const env = Object.fromEntries(
        Object.entries(process.env).filter(([key]) => key !== 'CLAUDECODE'),
      );
      const args = ['--print'];
      if (isFirstCall) {
        const sessionId = randomUUID();
        setSession(fileKey, sessionId);
        args.push('--session-id', sessionId);
      } else {
        const sessionId = getSession(fileKey)!;
        args.push('--resume', sessionId);
      }

      const proc = spawn('claude', args, {
        cwd: process.cwd(),
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      proc.stdin.write(prompt);
      proc.stdin.end();

      let stdout = '';
      let stderr = '';
      const timeout = setTimeout(() => {
        proc.kill();
        reject(new Error('Claude CLI timed out after 120s'));
      }, 120_000);

      proc.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });
      proc.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });
      proc.on('close', (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          reject(new Error(`Claude CLI exited with code ${code}: ${stderr}`));
          return;
        }
        resolve(stdout.trim());
      });
      proc.on('error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to spawn Claude CLI: ${err.message}`));
      });
    });
  }

  resetSession(fileKey: string): void {
    deleteSession(fileKey);
  }
}
