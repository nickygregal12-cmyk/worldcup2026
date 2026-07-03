import { describe, expect, it } from 'vitest'
import { ADMIN_VISIBILITY_STATUS, deriveAdminVisibility } from '../adminVisibilityModel.js'

describe('deriveAdminVisibility', () => {
  it('keeps signed-out and non-admin users out of admin navigation', () => {
    expect(deriveAdminVisibility({ sessionStatus: 'ready', session: null, access: null }).status).toBe(ADMIN_VISIBILITY_STATUS.SIGNED_OUT)
    expect(deriveAdminVisibility({ sessionStatus: 'ready', session: { user: { id: 'u' } }, access: { isAdmin: false } }).status).toBe(ADMIN_VISIBILITY_STATUS.DENIED)
  })

  it('allows only server-verified administrators', () => {
    expect(deriveAdminVisibility({
      sessionStatus: 'ready',
      session: { user: { id: 'admin' } },
      access: { isAdmin: true, adminRole: 'owner' },
    })).toMatchObject({ status: ADMIN_VISIBILITY_STATUS.ALLOWED, isAdmin: true, role: 'owner' })
  })

  it('fails closed while checking and after verification errors', () => {
    expect(deriveAdminVisibility({ sessionStatus: 'loading', session: null, access: null }).isAdmin).toBe(false)
    expect(deriveAdminVisibility({ sessionStatus: 'ready', session: { user: { id: 'u' } }, access: null, accessError: 'offline' }).status).toBe(ADMIN_VISIBILITY_STATUS.ERROR)
  })
})
