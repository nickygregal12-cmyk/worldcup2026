import { describe, expect, it } from 'vitest'
import { REFRESH_SCOPE, refreshPolicyFor } from '../refreshPolicy.js'

describe('refresh policy groundwork', () => {
  it('keeps manual refresh buttons disallowed by default', () => {
    expect(refreshPolicyFor(REFRESH_SCOPE.USER_ACTION).manualButton).toBe(false)
    expect(refreshPolicyFor(REFRESH_SCOPE.ADMIN_ACTION).manualButton).toBe(false)
  })

  it('uses mutation invalidation for user and admin actions', () => {
    expect(refreshPolicyFor(REFRESH_SCOPE.USER_ACTION).invalidateAfterMutation).toBe(true)
    expect(refreshPolicyFor(REFRESH_SCOPE.ADMIN_ACTION).invalidateAfterMutation).toBe(true)
  })
})
