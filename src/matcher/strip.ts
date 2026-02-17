export function stripMarkdown(line: string): string {
  return line
    .replace(/^#{1,6}\s+/, '')
    .replace(/^\s*[-*+]\s+/, '')       // unordered list markers
    .replace(/^\s*\d+\.\s+/, '')       // ordered list markers
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/<\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s[^>]*)?\/?>/g, '')  // only valid HTML tags
    .trim();
}

export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
