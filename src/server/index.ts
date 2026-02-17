import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { registerApiRoutes } from './api.js';

export function createApp(rootDir: string): Hono {
  const app = new Hono();

  app.use('*', cors({ origin: '*' }));

  registerApiRoutes(app, rootDir);

  return app;
}
