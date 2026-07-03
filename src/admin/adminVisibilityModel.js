export const ADMIN_VISIBILITY_STATUS = Object.freeze({
  CHECKING: 'checking',
  ALLOWED: 'allowed',
  SIGNED_OUT: 'signed_out',
  DENIED: 'denied',
  ERROR: 'error',
})

export function deriveAdminVisibility({ sessionStatus, session, access, accessError = null }) {
  if (sessionStatus === 'loading') {
    return Object.freeze({ status: ADMIN_VISIBILITY_STATUS.CHECKING, isAdmin: false, role: null, error: null })
  }
  if (!session?.user) {
    return Object.freeze({ status: ADMIN_VISIBILITY_STATUS.SIGNED_OUT, isAdmin: false, role: null, error: null })
  }
  if (accessError) {
    return Object.freeze({ status: ADMIN_VISIBILITY_STATUS.ERROR, isAdmin: false, role: null, error: accessError })
  }
  if (!access) {
    return Object.freeze({ status: ADMIN_VISIBILITY_STATUS.CHECKING, isAdmin: false, role: null, error: null })
  }
  if (!access.isAdmin) {
    return Object.freeze({ status: ADMIN_VISIBILITY_STATUS.DENIED, isAdmin: false, role: null, error: null })
  }
  return Object.freeze({ status: ADMIN_VISIBILITY_STATUS.ALLOWED, isAdmin: true, role: access.adminRole ?? null, error: null })
}
