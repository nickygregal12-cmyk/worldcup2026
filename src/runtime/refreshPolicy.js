// AUDIT-CONSUMED POLICY MODULE — not dead code.
// No runtime component imports this today, but check-stage13g-interaction-
// enforcement.mjs and check-stage13g-shared-primitives.mjs read it by path and
// enforce its rules (manual refresh buttons stay disallowed). Deleting it
// breaks the audit gate; changing it changes recorded interaction policy.
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
