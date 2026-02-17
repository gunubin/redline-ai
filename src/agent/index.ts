export interface EditContext {
  fullSource: string;
  matchedSource: string;
  selectedText: string;
  startLine: number;
  endLine: number;
  instruction: string;
  fileKey: string;
}

export interface Agent {
  edit(ctx: EditContext): Promise<string>;
  resetSession(fileKey: string): void;
}
