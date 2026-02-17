import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { registerApiRoutes } from './api.js';
import type { AgentConfig } from '../config.js';

export function createApp(rootDir: string, agentConfig?: AgentConfig): Hono {
  const app = new Hono();

  app.use('*', cors({
    origin: (origin) => /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ? origin : null,
  }));

  registerApiRoutes(app, rootDir, agentConfig);

  return app;
}
