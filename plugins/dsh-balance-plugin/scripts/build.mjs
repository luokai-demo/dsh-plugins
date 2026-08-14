/**
 * Build both halves with esbuild:
 * - host: lib/index.js (Node ESM; framework packages stay external — the
 *   harness resolves them from its own tree at load time);
 * - client: lib/client.js (browser bundle wrapped in the shell's module
 *   loader handoff — window.__ModuleLoader__.load({ id, factory }), with
 *   react resolved through the loader's platform seed).
 * Self-contained: no project references, no typecheck — install-time safe
 * for git-hosted installs (the `prepare` script).
 */

import { build } from 'esbuild'

const ID = 'dsh-balance-plugin'
const define = { 'process.env.NODE_ENV': '"production"' }

await build({
  entryPoints: ['src/balance-core.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'es2022',
  outfile: 'lib/balance-core.js',
  define,
})

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'es2022',
  outfile: 'lib/index.js',
  external: ['@deepseek-ai/*'],
  define,
})

await build({
  entryPoints: ['src/client.tsx'],
  bundle: true,
  platform: 'browser',
  format: 'cjs',
  target: 'es2022',
  outfile: 'lib/client.js',
  external: ['react', 'react/jsx-runtime'],
  define,
  banner: {
    js: `window.__ModuleLoader__.load({ id: ${JSON.stringify(ID)}, factory: (require) => {\nvar module = { exports: {} }; var exports = module.exports;`,
  },
  footer: {
    js: 'return module.exports; } });',
  },
})

console.log('dsh-balance-plugin built: lib/index.js + lib/client.js')
