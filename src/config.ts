import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'toml';

export interface RouteConfig {
  pattern: string;
  file: string;
}

export interface ProxyConfig {
  target: string;
  root: string;
  routes: RouteConfig[];
}

export interface RedlineConfig {
  proxy: ProxyConfig;
}

export function loadConfig(configPath: string): RedlineConfig | null {
  const absPath = resolve(configPath);
  if (!existsSync(absPath)) {
    return null;
  }

  const configDir = resolve(absPath, '..');
  const raw = readFileSync(absPath, 'utf-8');
  const parsed = parse(raw) as {
    proxy?: {
      target?: string;
      root?: string;
      routes?: RouteConfig[];
    };
  };

  // Resolve root relative to config file location
  const rawRoot = parsed.proxy?.root ?? '.';
  const resolvedRoot = resolve(configDir, rawRoot);

  return {
    proxy: {
      target: parsed.proxy?.target ?? 'http://localhost:3000',
      root: resolvedRoot,
      routes: parsed.proxy?.routes ?? [],
    },
  };
}
