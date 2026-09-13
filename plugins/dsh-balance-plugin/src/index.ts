/**
 * dsh-balance-plugin host half: registers two HTTP routes on the harness
 * webserver — `GET /dsh-balance` (the wallet readout as JSON) and
 * `GET /dsh-balance/events` (an SSE stream that emits `refresh` on every
 * turn end) — and reads the credential through the optional credential
 * seam, falling back to the environment.
 */

import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { fetchBalance, type BalanceConfig, type CredentialResolver } from './balance-core.ts'

export const name = 'dsh-balance-plugin'
export const inject = ['webServer', 'connection']

export const Config: Schema<BalanceConfig> = Schema.object({
  apiKeyEnv: Schema.string().default('DEEPSEEK_API_KEY'),
  baseURL: Schema.string().default('https://api.deepseek.com'),
  timeoutMs: Schema.natural().min(1).max(120000).default(12000),
  lowBalanceThreshold: Schema.number().min(0).default(2),
})

/** The credential seam's structural face; typed locally to avoid a hard runtime coupling. */
type CredentialsService = { resolve(ref: string): Promise<{ value: string } | undefined> }
type ConnectionService = {
  requestRejection(request: { readonly headers: IncomingMessage['headers'] }): 401 | 403 | undefined
}

/** 拒绝未通过 DSH 浏览器身份与 Origin 校验的请求。 */
function rejectUntrustedRequest(ctx: Context, req: IncomingMessage, res: ServerResponse): boolean {
  const connection = Reflect.get(ctx, 'connection') as ConnectionService
  const status = connection.requestRejection(req)
  if (status === undefined) return false
  res.statusCode = status
  res.end()
  return true
}

/** 拒绝余额端点不支持的 HTTP 方法。 */
function rejectNonGetRequest(req: IncomingMessage, res: ServerResponse): boolean {
  if (req.method === 'GET') return false
  res.writeHead(405, { allow: 'GET' })
  res.end()
  return true
}

/**
 * Plugin body: the balance JSON route, the turn-end SSE stream, and their
 * teardown. Registrations are effects — the returned disposer unwinds them.
 * @param ctx - host plugin context (webServer injected).
 * @param config - resolved plugin config (schema defaults applied).
 * @returns the plugin disposer.
 */
export function apply(ctx: Context, config: BalanceConfig): () => void {
  const sseClients = new Set<ServerResponse>()
  const broadcastRefresh = (): void => {
    for (const res of sseClients) {
      try {
        res.write('event: refresh\ndata: {}\n\n')
      } catch {
        sseClients.delete(res)
      }
    }
  }

  const unregisterBalance = ctx.webServer.register({
    kind: 'exact',
    path: '/dsh-balance',
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      if (rejectUntrustedRequest(ctx, req, res) || rejectNonGetRequest(req, res)) return
      // Resolve the credential per request: the credential seam may not be
      // mounted yet when this plugin's apply runs, and a changed credential
      // must reach the next request without a restart.
      const credentials = ctx.get('credentials') as CredentialsService | undefined
      const resolver: CredentialResolver | undefined = credentials === undefined
        ? undefined
        : { resolve: ref => credentials.resolve(ref) }
      const readout = await fetchBalance(resolver, process.env as Record<string, string | undefined>, config)
      const body = JSON.stringify(readout)
      res.writeHead(200, {
        'content-type': 'application/json',
        'cache-control': 'no-store',
        'content-length': Buffer.byteLength(body),
      })
      res.end(body)
    },
  })

  const unregisterEvents = ctx.webServer.register({
    kind: 'exact',
    path: '/dsh-balance/events',
    handler: (req: IncomingMessage, res: ServerResponse) => {
      if (rejectUntrustedRequest(ctx, req, res) || rejectNonGetRequest(req, res)) return
      res.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        connection: 'keep-alive',
      })
      res.write(': connected\n\n')
      sseClients.add(res)
      req.on('close', () => {
        sseClients.delete(res)
      })
    },
  })

  // A turn ending is the natural refresh moment: wallet spend settles with
  // the turn. Listen on the harness's durable session-event broadcast.
  ctx.on('session/event', (_session, event) => {
    if (event.type === 'turn/end') broadcastRefresh()
  })

  return () => {
    unregisterBalance()
    unregisterEvents()
    for (const res of sseClients) {
      try {
        res.end()
      } catch {
        // already closed
      }
    }
    sseClients.clear()
  }
}
