import { watch } from 'chokidar';
import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'node:http';

export function setupHMR(server: Server, rootDir: string): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    if (req.url === '/__redline/hmr') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  const watcher = watch(rootDir, {
    ignored: /(^|[\/\\])\./,
    persistent: true,
    ignoreInitial: true,
  });

  watcher.on('change', (path) => {
    if (/\.(md|mdx)$/.test(path)) {
      console.log(`[hmr] File changed: ${path}`);
      for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'reload' }));
        }
      }
    }
  });
}
