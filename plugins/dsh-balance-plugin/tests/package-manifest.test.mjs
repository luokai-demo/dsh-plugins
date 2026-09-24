import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import assert from 'node:assert/strict'

// 直接读取待发布清单，防止 DSH 兼容范围与宿主 peer 属性被误删。
const manifestUrl = new URL('../package.json', import.meta.url)

test('declares the tested DSH release series with optional harness-provided peers', async () => {
  const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'))
  assert.equal(manifest.peerDependencies['@deepseek-ai/dsh'], '>=0.1.7-0 <0.1.8-0')
  assert.deepEqual(manifest.peerDependenciesMeta, {
    '@deepseek-ai/cordis': { optional: true },
    '@deepseek-ai/dsh': { optional: true },
    '@deepseek-ai/schemastery': { optional: true },
    react: { optional: true },
  })
})
