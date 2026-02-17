import { build } from 'esbuild';

await build({
  entryPoints: ['overlay/ai-edit-overlay.ts'],
  bundle: true,
  outfile: 'overlay/dist/overlay.js',
  format: 'iife',
  target: ['chrome100', 'firefox100', 'safari15'],
  minify: false, // keep readable for dev tool
});

console.log('Overlay built: overlay/dist/overlay.js');
