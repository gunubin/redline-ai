#!/usr/bin/env node
import { Command } from 'commander';

const program = new Command();

program
  .name('redline-ai')
  .description('Inline AI editing for local Markdown files')
  .version('0.1.0');

program
  .command('serve')
  .description('Preview Markdown files with AI editing')
  .argument('<dir>', 'Directory containing Markdown files')
  .option('-p, --port <port>', 'Port number', '4321')
  .option('--host <host>', 'Host to bind (use 0.0.0.0 for LAN access)', '127.0.0.1')
  .option('--open', 'Open browser automatically')
  .option('-c, --config <path>', 'Path to redline.toml config file', 'redline.toml')
  .action(async (dir: string, opts: { port: string; host: string; open?: boolean; config: string }) => {
    const { startServeMode } = await import('./server/serve.js');
    const { loadConfig } = await import('./config.js');
    const config = loadConfig(opts.config);
    await startServeMode(dir, { port: Number(opts.port), host: opts.host, open: opts.open }, config?.agent);
  });

program
  .command('proxy')
  .description('Proxy an existing dev server with AI editing overlay')
  .option('-t, --target <url>', 'Target server URL')
  .option('-r, --root <dir>', 'Root directory for source files')
  .option('-c, --config <path>', 'Path to redline.toml config file', 'redline.toml')
  .option('-p, --port <port>', 'Port number', '4321')
  .option('--host <host>', 'Host to bind (use 0.0.0.0 for LAN access)', '127.0.0.1')
  .action(async (opts: { target?: string; root?: string; config: string; port: string; host: string }) => {
    const { startProxyMode } = await import('./server/proxy.js');
    await startProxyMode({
      target: opts.target,
      root: opts.root,
      configPath: opts.config,
      port: Number(opts.port),
      host: opts.host,
    });
  });

program.parse();
