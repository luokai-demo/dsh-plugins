/**
 * dsh-balance-plugin browser half: the sidebar-foot balance action. Reads the
 * wallet readout from the host's `GET /dsh-balance` route, refreshes on
 * `refresh` SSE events (host emits one per turn end) and on click (with an
 * in-flight guard), and renders a status-tinted card icon + amount — the
 * icon stays neutral, only the amount carries the tint. Renders nothing
 * while loading, unconfigured, or after a failed fetch.
 */

import { createElement, useCallback, useEffect, useRef, useState } from 'react'

export const name = 'dsh-balance-plugin'
export const inject = ['slots']

const BALANCE_ENDPOINT = '/dsh-balance'
const EVENTS_ENDPOINT = '/dsh-balance/events'

/** Readout wire shape (mirrors the host's balance-core types). */
type BalanceReadout =
  | { status: 'unconfigured' }
  | { status: 'unavailable'; reason: string }
  | {
    status: 'ok'
    available: boolean
    display: string
    total: number
    threshold: number
    currencies: string[]
    infos: Array<{ currency: string; total: string; granted: string; toppedUp: string }>
  }

/** Card icon glyph (self-contained; the shell provides no icon library to a third-party plugin). */
function CardIcon({ size }: { size: number }): ReturnType<typeof createElement> {
  return createElement(
    'svg',
    {
      width: size,
      height: size,
      viewBox: '0 0 16 16',
      fill: 'none',
      xmlns: 'http://www.w3.org/2000/svg',
      style: { flex: 'none' },
    },
    createElement('rect', { x: 1.3, y: 3.2, width: 13.4, height: 9.6, rx: 1.8, stroke: 'currentColor', strokeWidth: 1.2 }),
    createElement('path', { d: 'M1.3 6.2 H14.7', stroke: 'currentColor', strokeWidth: 1.1 }),
    createElement('path', { d: 'M3.8 10.7 H8', stroke: 'currentColor', strokeWidth: 1, strokeLinecap: 'round' }),
    createElement('path', { d: 'M9.2 10.7 H12.2', stroke: 'currentColor', strokeWidth: 1, strokeLinecap: 'round' }),
  )
}

/** Component style constants (self-contained; no theme tokens outside the shell). */
const styles = {
  button: {
    flex: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 28,
    height: 28,
    border: 'none',
    borderRadius: 999,
    padding: '0 6px',
    background: 'transparent',
    cursor: 'pointer',
    color: 'var(--dsw-alias-label-secondary, #6b7280)',
  } as const,
  amount: {
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    fontSize: 17,
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1,
  } as const,
  success: { color: 'var(--dsw-alias-state-success-primary, #16a34a)' } as const,
  warning: { color: 'var(--dsw-static-amber-600, #d97706)' } as const,
  danger: { color: 'var(--dsw-alias-state-error-primary, #dc2626)' } as const,
}

/** Map a readout to its tint: >= threshold healthy, > 0 low, else exhausted. */
function toneOf(readout: Extract<BalanceReadout, { status: 'ok' }>): 'success' | 'warning' | 'danger' {
  if (readout.total >= readout.threshold) return 'success'
  if (readout.total > 0) return 'warning'
  return 'danger'
}

/**
 * The sidebar-foot action component.
 * @param props - the slot's owner props (the shell passes column state).
 */
export function BalanceAction({ wide }: { wide: boolean }): ReturnType<typeof createElement> | null {
  const [readout, setReadout] = useState<BalanceReadout | undefined>(undefined)
  const [turnEpoch, setTurnEpoch] = useState(0)
  const inFlight = useRef(false)

  const refresh = useCallback(() => {
    if (inFlight.current) return
    inFlight.current = true
    fetch(BALANCE_ENDPOINT, { cache: 'no-store' })
      .then(response => response.json() as Promise<BalanceReadout>)
      .then(setReadout)
      .catch(() => setReadout(undefined))
      .finally(() => {
        inFlight.current = false
      })
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh, turnEpoch])

  useEffect(() => {
    const source = new EventSource(EVENTS_ENDPOINT)
    source.addEventListener('refresh', () => {
      setTurnEpoch(epoch => epoch + 1)
    })
    return () => {
      source.close()
    }
  }, [])

  if (readout === undefined || readout.status !== 'ok') return null
  const tone = toneOf(readout)
  const label = `余额 ${readout.display}`

  return createElement(
    'button',
    {
      type: 'button',
      style: styles.button,
      'aria-label': '刷新余额',
      title: wide ? label : undefined,
      onClick: refresh,
    },
    createElement(CardIcon, { size: wide ? 16 : 18 }),
    wide
      ? createElement('span', { style: { ...styles.amount, ...styles[tone] } }, readout.display)
      : null,
  )
}

/**
 * Client plugin body: register the balance action at the sidebar foot.
 * @param ctx - client root context (slots injected).
 */
export function apply(ctx: {
  slots: {
    inject(name: string, callback: () => () => void): void
  }
}): void {
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action',
    id: 'balance',
    order: 0,
  }, BalanceAction))
}
