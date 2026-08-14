/**
 * Shared wallet-balance query logic: resolves the credential, queries the
 * provider's DeepSeek-style GET /user/balance endpoint, and normalizes the
 * response for display. Pure functions — the host plugin wires credentials,
 * env, and HTTP.
 */

/** Plugin configuration: where the balance lives and how to read it. */
export interface BalanceConfig {
  /** Credential reference resolved through `ctx.credentials`, then the environment. */
  apiKeyEnv: string
  /** Provider base URL; the balance endpoint is `<baseURL>/user/balance`. */
  baseURL: string
  /** Positive finite request timeout in milliseconds. */
  timeoutMs: number
  /** Primary-currency amount at or above which the readout reads "healthy". */
  lowBalanceThreshold: number
}

/** One currency's balance as the provider reports it. */
export interface BalanceInfo {
  currency: string
  total: string
  granted: string
  toppedUp: string
}

/** One wallet-balance query outcome, normalized for display. */
export type BalanceReadout =
  | { status: 'unconfigured' }
  | { status: 'unavailable'; reason: string }
  | {
    status: 'ok'
    available: boolean
    display: string
    total: number
    threshold: number
    currencies: string[]
    infos: BalanceInfo[]
  }

/** The optional credential seam's resolve face (kept structural to avoid coupling). */
export interface CredentialResolver {
  resolve(ref: string): Promise<{ value: string } | undefined>
}

/** Map an ISO currency code to a compact symbol; unknown codes pass through. */
function symbol(currency: string): string {
  switch (currency.toUpperCase()) {
    case 'CNY':
    case 'RMB':
      return '¥'
    case 'USD':
      return '$'
    default:
      return currency === '' ? '' : `${currency} `
  }
}

/** Normalize a currency spelling to its ISO code; unknown spellings yield "". */
function normalizeCurrency(currency: string): string {
  switch (currency.toUpperCase().trim()) {
    case 'CNY':
    case 'RMB':
    case 'CNH':
    case '¥':
    case '￥':
      return 'CNY'
    case 'USD':
    case '$':
      return 'USD'
    default:
      return ''
  }
}

/** Pick the primary entry: the CNY entry when present, otherwise the first. */
function primaryInfo(infos: BalanceInfo[]): BalanceInfo | undefined {
  if (infos.length === 0) return undefined
  return infos.find(info => normalizeCurrency(info.currency) === 'CNY') ?? infos[0]
}

/** Render the compact primary readout (CNY preferred), never converting currencies. */
function displayFor(infos: BalanceInfo[]): string {
  const pick = primaryInfo(infos)
  if (pick === undefined) return ''
  return `${symbol(pick.currency)}${pick.total.trim()}`
}

/** Primary-currency amount as a number for threshold coloring. */
function primaryTotal(infos: BalanceInfo[]): number {
  const pick = primaryInfo(infos)
  if (pick === undefined) return 0
  const parsed = Number.parseFloat(pick.total)
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * Query the wallet-balance endpoint once.
 * @param credentials - the optional credential seam; undefined falls back to the environment.
 * @param env - the process environment (keyed by `config.apiKeyEnv`).
 * @param config - resolved plugin config.
 * @returns the normalized readout; never throws for provider-side failures.
 */
export async function fetchBalance(
  credentials: CredentialResolver | undefined,
  env: Record<string, string | undefined>,
  config: BalanceConfig,
): Promise<BalanceReadout> {
  const resolved = await credentials?.resolve(config.apiKeyEnv)
  const apiKey = resolved?.value ?? env[config.apiKeyEnv]
  if (!apiKey) {
    return { status: 'unconfigured' }
  }
  const timeout = AbortSignal.timeout(config.timeoutMs)
  const url = `${config.baseURL.replace(/\/+$/, '')}/user/balance`
  try {
    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      signal: timeout,
    })
    const body = await response.text()
    if (!response.ok) {
      return { status: 'unavailable', reason: `balance-http-${String(response.status)}` }
    }
    const parsed = JSON.parse(body) as {
      is_available: boolean
      balance_infos?: Array<{
        currency: string
        total_balance: string
        granted_balance: string
        topped_up_balance: string
      }>
    }
    const infos: BalanceInfo[] = (parsed.balance_infos ?? []).map(info => ({
      currency: info.currency,
      total: info.total_balance,
      granted: info.granted_balance,
      toppedUp: info.topped_up_balance,
    }))
    if (infos.length === 0) {
      return { status: 'unavailable', reason: 'balance-empty' }
    }
    return {
      status: 'ok',
      available: parsed.is_available,
      display: displayFor(infos),
      total: primaryTotal(infos),
      threshold: config.lowBalanceThreshold,
      currencies: [...new Set(infos.map((info) => {
        const normalized = normalizeCurrency(info.currency)
        return normalized === '' ? info.currency.toUpperCase() : normalized
      }))].sort(),
      infos,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { status: 'unavailable', reason: 'balance-timeout' }
    }
    if (error instanceof SyntaxError) {
      return { status: 'unavailable', reason: 'balance-decode' }
    }
    return { status: 'unavailable', reason: 'balance-network' }
  }
}
