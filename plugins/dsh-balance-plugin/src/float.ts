/**
 * Pure float-diff logic for the balance readout: deciding whether a change is
 * worth announcing, formatting the signed delta text, and extracting the
 * currency symbol from the display string. Kept free of DOM and React so it
 * runs under plain node:test against the built module.
 */

/** Smallest |delta| that counts as a visible change (guards float noise). */
export const FLOAT_EPSILON = 0.005

/**
 * Whether a primary-total change should float: a prior value must exist and
 * the absolute delta must reach the epsilon.
 * @param prev - previous primary total; undefined means first load, never float.
 * @param next - new primary total.
 * @param epsilon - minimum visible delta; defaults to {@link FLOAT_EPSILON}.
 */
export function shouldFloat(prev: number | undefined, next: number, epsilon = FLOAT_EPSILON): boolean {
  if (prev === undefined || !Number.isFinite(next)) return false
  return Math.abs(next - prev) >= epsilon
}

/** Signed delta, new minus old. */
export function floatDelta(prev: number, next: number): number {
  return next - prev
}

/**
 * Render a signed delta with the currency symbol, e.g. `+¥3.14` / `-¥1.97`.
 * @param delta - signed primary-total delta.
 * @param symbol - currency symbol prefix (may be empty).
 */
export function formatFloat(delta: number, symbol: string): string {
  const sign = delta >= 0 ? '+' : '-'
  return `${sign}${symbol}${Math.abs(delta).toFixed(2)}`
}

/**
 * Extract the leading non-digit run of a display string, e.g. `¥` from
 * `¥3.13` or `CNY ` from `CNY 10.00`; returns '' for a bare number.
 * @param display - the readout's display string.
 */
export function symbolOf(display: string): string {
  const match = /^\D+/.exec(display)
  return match === null ? '' : match[0]
}
