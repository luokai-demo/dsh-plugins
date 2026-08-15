/**
 * Unit tests for the pure float-diff logic (float). Runs with node:test
 * against the built lib/float.js — no test framework, no harness.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FLOAT_EPSILON, floatDelta, formatFloat, shouldFloat, symbolOf } from '../lib/float.js'

test('shouldFloat requires a prior value (first load never floats)', () => {
  assert.equal(shouldFloat(undefined, 3.13), false)
  assert.equal(shouldFloat(3.13, 5.1), true)
})

test('shouldFloat ignores sub-epsilon and non-finite deltas', () => {
  assert.equal(shouldFloat(3.13, 3.13), false)
  assert.equal(shouldFloat(3.13, 3.131), false)
  assert.equal(shouldFloat(3.13, NaN), false)
  assert.equal(shouldFloat(3.13, 3.14), true)
})

test('floatDelta is signed, new minus old', () => {
  assert.equal(floatDelta(5, 3), -2)
  assert.equal(floatDelta(3, 5), 2)
  assert.ok(Math.abs(floatDelta(3.13, 5.1) - 1.97) < 1e-9)
})

test('formatFloat renders a signed delta with symbol and two decimals', () => {
  assert.equal(formatFloat(1.97, '¥'), '+¥1.97')
  assert.equal(formatFloat(-1.97, '¥'), '-¥1.97')
  assert.equal(formatFloat(0.004, '$'), '+$0.00')
  assert.equal(formatFloat(-2, 'CNY '), '-CNY 2.00')
  assert.equal(formatFloat(0, ''), '+0.00')
})

test('symbolOf extracts the leading non-digit run', () => {
  assert.equal(symbolOf('¥3.13'), '¥')
  assert.equal(symbolOf('$1.20'), '$')
  assert.equal(symbolOf('CNY 10.00'), 'CNY ')
  assert.equal(symbolOf('3.13'), '')
})
