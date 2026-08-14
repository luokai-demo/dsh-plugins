/**
 * Unit tests for the pure query logic (balance-core). Runs with node:test
 * against the built lib/balance-core.js — no test framework, no harness.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fetchBalance } from '../lib/balance-core.js'

const config = {
  apiKeyEnv: 'DEEPSEEK_API_KEY',
  baseURL: 'https://api.deepseek.com',
  timeoutMs: 12000,
  lowBalanceThreshold: 2,
}

function balanceBody(overrides = {}) {
  return JSON.stringify({
    is_available: true,
    balance_infos: [
      { currency: 'CNY', total_balance: '110.00', granted_balance: '10.00', topped_up_balance: '100.00' },
    ],
    ...overrides,
  })
}

function jsonResponse(body, status = 200) {
  return new Response(body, { status, headers: { 'content-type': 'application/json' } })
}

test('resolves the key through the credential seam and sends a Bearer header', async () => {
  let seen = null
  globalThis.fetch = async (url, init) => {
    seen = { url, authorization: init.headers.authorization }
    return jsonResponse(balanceBody())
  }
  const readout = await fetchBalance(
    { resolve: async (ref) => { assert.equal(ref, 'DEEPSEEK_API_KEY'); return { value: 'secret' } } },
    {},
    config,
  )
  assert.equal(seen.url, 'https://api.deepseek.com/user/balance')
  assert.equal(seen.authorization, 'Bearer secret')
  assert.deepEqual(readout, {
    status: 'ok',
    available: true,
    display: '¥110.00',
    total: 110,
    threshold: 2,
    currencies: ['CNY'],
    infos: [{ currency: 'CNY', total: '110.00', granted: '10.00', toppedUp: '100.00' }],
  })
})

test('falls back to the environment when the seam is absent', async () => {
  let seen = null
  globalThis.fetch = async (_url, init) => {
    seen = init.headers.authorization
    return jsonResponse(balanceBody())
  }
  const readout = await fetchBalance(undefined, { DEEPSEEK_API_KEY: 'env-secret' }, config)
  assert.equal(seen, 'Bearer env-secret')
  assert.equal(readout.status, 'ok')
})

test('reports unconfigured when no key resolves', async () => {
  const readout = await fetchBalance(undefined, {}, config)
  assert.deepEqual(readout, { status: 'unconfigured' })
})

test('maps a non-2xx response to a stable http reason', async () => {
  globalThis.fetch = async () => new Response('forbidden', { status: 403 })
  const readout = await fetchBalance(undefined, { DEEPSEEK_API_KEY: 'k' }, config)
  assert.deepEqual(readout, { status: 'unavailable', reason: 'balance-http-403' })
})

test('maps a malformed body to balance-decode', async () => {
  globalThis.fetch = async () => jsonResponse('not json')
  const readout = await fetchBalance(undefined, { DEEPSEEK_API_KEY: 'k' }, config)
  assert.deepEqual(readout, { status: 'unavailable', reason: 'balance-decode' })
})

test('maps an empty balance list to balance-empty', async () => {
  globalThis.fetch = async () => jsonResponse(balanceBody({ balance_infos: [] }))
  const readout = await fetchBalance(undefined, { DEEPSEEK_API_KEY: 'k' }, config)
  assert.deepEqual(readout, { status: 'unavailable', reason: 'balance-empty' })
})

test('maps a network failure to balance-network', async () => {
  globalThis.fetch = async () => { throw new TypeError('fetch failed') }
  const readout = await fetchBalance(undefined, { DEEPSEEK_API_KEY: 'k' }, config)
  assert.deepEqual(readout, { status: 'unavailable', reason: 'balance-network' })
})

test('prefers the CNY entry for the compact display and sorts currencies', async () => {
  globalThis.fetch = async () => jsonResponse(balanceBody({
    balance_infos: [
      { currency: 'USD', total_balance: '9.99', granted_balance: '0.00', topped_up_balance: '9.99' },
      { currency: 'CNY', total_balance: '70.16', granted_balance: '0.00', topped_up_balance: '70.16' },
    ],
  }))
  const readout = await fetchBalance(undefined, { DEEPSEEK_API_KEY: 'k' }, config)
  assert.equal(readout.status, 'ok')
  assert.equal(readout.display, '¥70.16')
  assert.deepEqual(readout.currencies, ['CNY', 'USD'])
  assert.equal(readout.total, 70.16)
})
