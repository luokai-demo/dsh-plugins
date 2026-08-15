/**
 * dsh-balance-plugin browser half: the sidebar-foot balance action. Reads the
 * wallet readout from the host's `GET /dsh-balance` route, refreshes on
 * `refresh` SSE events (host emits one per turn end) and on click (with an
 * in-flight guard), and renders a status-tinted card icon + amount — the
 * icon stays neutral, only the amount carries the tint. On a visible amount
 * change it floats a signed delta (`+¥3.14` / `-¥1.97`) that drifts upward
 * and fades; the animation is suppressed under `prefers-reduced-motion`.
 * Renders nothing while loading, unconfigured, or after a failed fetch.
 */

import { createElement, useCallback, useEffect, useRef, useState } from 'react'
import { floatDelta, formatFloat, shouldFloat, symbolOf } from './float'

export const name = 'dsh-balance-plugin'
export const inject = ['slots']

const BALANCE_ENDPOINT = '/dsh-balance'
const EVENTS_ENDPOINT = '/dsh-balance/events'
/** How long a float text stays visible; must match the CSS animation duration. */
const FLOAT_LIFETIME_MS = 1300

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

/** One floating delta text waiting to animate out. */
interface FloatItem {
  id: number
  text: string
  tone: 'success' | 'danger'
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
    position: 'relative',
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
  floatLayer: {
    position: 'absolute',
    top: -16,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
  } as const,
  float: {
    fontSize: 13,
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1,
    whiteSpace: 'nowrap',
    animation: 'dsh-balance-float-up 1.3s ease-out forwards',
  } as const,
  success: { color: 'var(--dsw-alias-state-success-primary, #16a34a)' } as const,
  warning: { color: 'var(--dsw-static-amber-600, #d97706)' } as const,
  danger: { color: 'var(--dsw-alias-state-error-primary, #dc2626)' } as const,
}

/** Float animation keyframes + reduced-motion suppression (injected once). */
const FLOAT_CSS = `
@keyframes dsh-balance-float-up {
  from { transform: translateY(0); opacity: 1; }
  70% { opacity: 1; }
  to { transform: translateY(-26px); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .dsh-balance-float { display: none !important; }
}
`

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
  const [floats, setFloats] = useState<FloatItem[]>([])
  const inFlight = useRef(false)
  const floatSeq = useRef(0)
  const readoutRef = useRef<BalanceReadout | undefined>(undefined)

  /** Mirror the latest readout for the next refresh's delta comparison. */
  useEffect(() => {
    readoutRef.current = readout
  }, [readout])

  /** Queue a float text that removes itself after the animation lifetime. */
  const pushFloat = useCallback((delta: number, symbol: string) => {
    const id = ++floatSeq.current
    setFloats(items => [...items, { id, text: formatFloat(delta, symbol), tone: delta > 0 ? 'success' : 'danger' }])
    setTimeout(() => {
      setFloats(items => items.filter(item => item.id !== id))
    }, FLOAT_LIFETIME_MS)
  }, [])

  const refresh = useCallback(() => {
    if (inFlight.current) return
    inFlight.current = true
    fetch(BALANCE_ENDPOINT, { cache: 'no-store' })
      .then(response => response.json() as Promise<BalanceReadout>)
      .then(next => {
        const prev = readoutRef.current
        if (prev?.status === 'ok' && next.status === 'ok' && shouldFloat(prev.total, next.total)) {
          pushFloat(floatDelta(prev.total, next.total), symbolOf(next.display))
        }
        setReadout(next)
      })
      .catch(() => setReadout(undefined))
      .finally(() => {
        inFlight.current = false
      })
  }, [pushFloat])

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
    floats.length > 0
      ? createElement(
        'span',
        { style: styles.floatLayer, 'aria-hidden': true },
        floats.map(item => createElement(
          'span',
          { key: item.id, className: 'dsh-balance-float', style: { ...styles.float, ...styles[item.tone] } },
          item.text,
        )),
      )
      : null,
  )
}

/**
 * Client plugin body: register the balance action at the sidebar foot and
 * inject the float-animation stylesheet for the life of the registration.
 * @param ctx - client root context (slots injected).
 */
export function apply(ctx: {
  slots: {
    inject(name: string, callback: () => () => void): void
  }
}): void {
  ctx.slots.inject('sidebar.footer.action', () => {
    const styleEl = document.createElement('style')
    styleEl.textContent = FLOAT_CSS
    document.head.appendChild(styleEl)
    const disposer = ctx.slots.register({
      name: 'sidebar.footer.action',
      id: 'balance',
      order: 0,
    }, BalanceAction)
    return () => {
      disposer()
      styleEl.remove()
    }
  })
}
