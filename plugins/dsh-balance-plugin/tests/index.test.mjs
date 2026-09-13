/**
 * Host-route tests against the built bundle. The mocked Cordis context keeps
 * the assertions at the public HTTP boundary without booting a full Harness.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { apply } from '../lib/index.js'

function response() {
  return {
    statusCode: undefined,
    headers: undefined,
    body: undefined,
    writeHead(statusCode, headers) {
      this.statusCode = statusCode
      this.headers = headers
    },
    end(body) {
      this.body = body
    },
    write() {},
  }
}

function routesFor(rejection) {
  const routes = []
  let credentialReads = 0
  const context = {
    webServer: { register(route) { routes.push(route); return () => {} } },
    connection: { requestRejection: () => rejection },
    get: () => {
      credentialReads += 1
      return undefined
    },
    on: () => {},
  }
  const dispose = apply(context, {
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    baseURL: 'https://api.deepseek.com',
    timeoutMs: 12_000,
    lowBalanceThreshold: 2,
  })
  return { routes, dispose, credentialReads: () => credentialReads }
}

test('balance routes reject unauthenticated requests before reading credentials', async () => {
  for (const rejection of [401, 403]) {
    const { routes, dispose, credentialReads } = routesFor(rejection)
    try {
      for (const route of routes) {
        const res = response()
        await route.handler({ method: 'GET', headers: {} }, res)
        assert.equal(res.statusCode, rejection)
        assert.equal(res.body, undefined)
      }
      assert.equal(credentialReads(), 0)
    } finally {
      dispose()
    }
  }
})

test('balance routes allow only GET after the trust fence', async () => {
  const { routes, dispose } = routesFor(undefined)
  try {
    for (const route of routes) {
      const res = response()
      await route.handler({ method: 'POST', headers: {} }, res)
      assert.equal(res.statusCode, 405)
      assert.deepEqual(res.headers, { allow: 'GET' })
    }
  } finally {
    dispose()
  }
})
