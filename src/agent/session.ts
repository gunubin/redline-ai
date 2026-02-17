const sessionMap = new Map<string, string>();

export function getSession(fileKey: string): string | undefined {
  return sessionMap.get(fileKey);
}

export function setSession(fileKey: string, sessionId: string): void {
  sessionMap.set(fileKey, sessionId);
}

export function deleteSession(fileKey: string): void {
  sessionMap.delete(fileKey);
}

export function hasSession(fileKey: string): boolean {
  return sessionMap.has(fileKey);
}
