import { describe, expect, it } from 'vitest'
import { createLatestRequestGuard } from '../latestRequest.js'

describe('latest request guard', () => {
  it('accepts only the newest request token', () => {
    const guard = createLatestRequestGuard()
    const first = guard.begin()
    const second = guard.begin()

    expect(guard.isCurrent(first)).toBe(false)
    expect(guard.isCurrent(second)).toBe(true)
  })

  it('invalidates an in-flight request when a view is closed or changed', () => {
    const guard = createLatestRequestGuard()
    const token = guard.begin()
    guard.cancel()

    expect(guard.isCurrent(token)).toBe(false)
  })
})
