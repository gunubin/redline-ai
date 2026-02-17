import type { RouteConfig } from './config.js';

interface CompiledRoute {
  regex: RegExp;
  paramNames: string[];
  fileTemplate: string;
}

function compileRoute(route: RouteConfig): CompiledRoute {
  const paramNames: string[] = [];
  let regexStr = '^';

  const parts = route.pattern.split('/').filter(Boolean);
  for (const part of parts) {
    regexStr += '/';
    if (part.startsWith(':') && part.endsWith('*')) {
      // Wildcard param like :path*
      const name = part.slice(1, -1);
      paramNames.push(name);
      regexStr += '(.+)';
    } else if (part.startsWith(':')) {
      // Single param like :slug
      const name = part.slice(1);
      paramNames.push(name);
      regexStr += '([^/]+)';
    } else {
      regexStr += escapeRegex(part);
    }
  }

  regexStr += '/?$';

  return {
    regex: new RegExp(regexStr),
    paramNames,
    fileTemplate: route.file,
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class RouteMap {
  private routes: CompiledRoute[];

  constructor(routeConfigs: RouteConfig[]) {
    this.routes = routeConfigs.map(compileRoute);
  }

  resolve(urlPath: string): string | null {
    for (const route of this.routes) {
      const match = urlPath.match(route.regex);
      if (!match) continue;

      let filePath = route.fileTemplate;
      for (let i = 0; i < route.paramNames.length; i++) {
        const name = route.paramNames[i]!;
        const value = match[i + 1]!;
        filePath = filePath.replace(`:${name}`, value);
      }

      return filePath;
    }

    return null;
  }
}
