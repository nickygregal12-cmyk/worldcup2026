import { afterEach, describe, expect, it } from 'vitest'
import {
  clearClockOverride,
  getClockOverride,
  getNow,
  isAtOrAfter,
  isBefore,
  setClockOverride,
} from '../clock.js'

afterEach(() => clearClockOverride())

describe('application clock', () => {
  it('uses the real clock when no override exists', () => {
    const before = Date.now()
    const current = getNow().getTime()
    const after = Date.now()
    expect(current).toBeGreaterThanOrEqual(before)
    expect(current).toBeLessThanOrEqual(after)
  })

  it('supports a fixed time in test mode', () => {
    setClockOverride('2028-06-09T19:00:00Z')
    expect(getNow().toISOString()).toBe('2028-06-09T19:00:00.000Z')
    expect(getClockOverride()?.toISOString()).toBe('2028-06-09T19:00:00.000Z')
  })

  it('compares boundaries exactly', () => {
    setClockOverride('2028-06-09T19:00:00Z')
    expect(isAtOrAfter('2028-06-09T19:00:00Z')).toBe(true)
    expect(isBefore('2028-06-09T19:00:01Z')).toBe(true)
  })

  it('rejects invalid dates', () => {
    expect(() => setClockOverride('not-a-date')).toThrow(TypeError)
  })
})
