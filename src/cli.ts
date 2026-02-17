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
  .option('--open', 'Open browser automatically')
  .action(async (dir: string, opts: { port: string; open?: boolean }) => {
    const { startServeMode } = await import('./server/serve.js');
    await startServeMode(dir, { port: Number(opts.port), open: opts.open });
  });

program
  .command('proxy')
  .description('Proxy an existing dev server with AI editing overlay')
  .option('-t, --target <url>', 'Target server URL')
  .option('-r, --root <dir>', 'Root directory for source files')
  .option('-c, --config <path>', 'Path to redline.toml config file', 'redline.toml')
  .option('-p, --port <port>', 'Port number', '4321')
  .action(async (opts: { target?: string; root?: string; config: string; port: string }) => {
    const { startProxyMode } = await import('./server/proxy.js');
    await startProxyMode({
      target: opts.target,
      root: opts.root,
      configPath: opts.config,
      port: Number(opts.port),
    });
  });

program.parse();
