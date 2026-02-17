import MarkdownIt from 'markdown-it';
import { createHighlighter, type Highlighter } from 'shiki';

let highlighter: Highlighter | null = null;

async function getHighlighter(): Promise<Highlighter> {
  if (!highlighter) {
    highlighter = await createHighlighter({
      themes: ['github-dark'],
      langs: [
        'javascript', 'typescript', 'jsx', 'tsx',
        'html', 'css', 'json', 'yaml', 'toml',
        'bash', 'shell', 'python', 'rust', 'go',
        'markdown', 'sql', 'diff',
      ],
    });
  }
  return highlighter;
}

export async function renderMarkdown(source: string): Promise<string> {
  const hl = await getHighlighter();

  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: false,
    highlight(str: string, lang: string): string {
      if (lang && hl.getLoadedLanguages().includes(lang)) {
        return hl.codeToHtml(str, { lang, theme: 'github-dark' });
      }
      return '';
    },
  });

  // Strip frontmatter before rendering
  let content = source;
  if (content.startsWith('---')) {
    const endIdx = content.indexOf('---', 3);
    if (endIdx !== -1) {
      content = content.slice(endIdx + 3).trim();
    }
  }

  // Strip import lines
  content = content.replace(/^import\s+.*$/gm, '').trim();

  return md.render(content);
}
