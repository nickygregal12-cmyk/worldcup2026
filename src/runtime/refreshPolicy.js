export const REFRESH_SCOPE = Object.freeze({
  APP_BOOTSTRAP: 'app-bootstrap',
  ADMIN_ACTION: 'admin-action',
  USER_ACTION: 'user-action',
  BACKGROUND: 'background',
})

export const REFRESH_POLICY = Object.freeze({
  [REFRESH_SCOPE.APP_BOOTSTRAP]: Object.freeze({ manualButton: false, retryAllowed: true, invalidateAfterMutation: false }),
  [REFRESH_SCOPE.ADMIN_ACTION]: Object.freeze({ manualButton: false, retryAllowed: true, invalidateAfterMutation: true }),
  [REFRESH_SCOPE.USER_ACTION]: Object.freeze({ manualButton: false, retryAllowed: true, invalidateAfterMutation: true }),
  [REFRESH_SCOPE.BACKGROUND]: Object.freeze({ manualButton: false, retryAllowed: false, invalidateAfterMutation: false }),
})

export function refreshPolicyFor(scope) {
  return REFRESH_POLICY[scope] ?? REFRESH_POLICY[REFRESH_SCOPE.USER_ACTION]
}
