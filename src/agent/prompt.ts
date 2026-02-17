export const DEFAULT_FIRST_CALL = `あなたはドキュメントの編集アシスタントです。以下は編集対象のMarkdownドキュメント全体です:

<article>
{{fullSource}}
</article>

上記のドキュメントのL{{startLine}}-{{endLine}}にある以下の箇所を編集してください:

<target>
{{target}}
</target>
{{selectionContext}}
指示: {{instruction}}

修正後のtarget全体だけを返してください。Markdown記法はそのまま維持してください。説明や前置きは不要です。コードフェンス(\\\`\\\`\\\`)で囲まないでください。生のテキストだけ返してください。`;

export const DEFAULT_SUBSEQUENT_CALL = `同じドキュメントのL{{startLine}}-{{endLine}}にある以下の箇所を編集してください:

<target>
{{target}}
</target>
{{selectionContext}}
指示: {{instruction}}

修正後のtarget全体だけを返してください。Markdown記法はそのまま維持してください。説明や前置きは不要です。コードフェンス(\\\`\\\`\\\`)で囲まないでください。生のテキストだけ返してください。`;

/** All available template variables */
export const TEMPLATE_VARIABLES = [
  'fullSource',
  'target',
  'startLine',
  'endLine',
  'instruction',
  'selectionContext',
] as const;

export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number];

/**
 * Replace `{{variable}}` placeholders in a template string.
 * Unknown variables are left as-is.
 */
export function renderPrompt(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return key in vars ? vars[key]! : match;
  });
}
