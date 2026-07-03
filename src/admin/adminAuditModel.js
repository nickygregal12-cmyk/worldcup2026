export const ADMIN_AUDIT_CATEGORY = Object.freeze({
  ALL: 'all',
  FIXTURES: 'fixtures',
  RESULTS: 'results',
  SCORING: 'scoring',
  SAFEGUARDS: 'safeguards',
  CONTENT: 'content',
  ACCESS: 'access',
})

export const ADMIN_AUDIT_CATEGORY_LABELS = Object.freeze({
  [ADMIN_AUDIT_CATEGORY.ALL]: 'All operations',
  [ADMIN_AUDIT_CATEGORY.FIXTURES]: 'Fixtures',
  [ADMIN_AUDIT_CATEGORY.RESULTS]: 'Results',
  [ADMIN_AUDIT_CATEGORY.SCORING]: 'Scoring',
  [ADMIN_AUDIT_CATEGORY.SAFEGUARDS]: 'Safeguards',
  [ADMIN_AUDIT_CATEGORY.CONTENT]: 'Content and time',
  [ADMIN_AUDIT_CATEGORY.ACCESS]: 'Admin access',
})

const CATEGORY_BY_OPERATION = Object.freeze({
  fixture_schedule_updated: ADMIN_AUDIT_CATEGORY.FIXTURES,
  result_recorded: ADMIN_AUDIT_CATEGORY.RESULTS,
  result_corrected: ADMIN_AUDIT_CATEGORY.RESULTS,
  result_voided: ADMIN_AUDIT_CATEGORY.RESULTS,
  result_manual_review: ADMIN_AUDIT_CATEGORY.RESULTS,
  match_status_updated: ADMIN_AUDIT_CATEGORY.RESULTS,
  points_recalculated: ADMIN_AUDIT_CATEGORY.SCORING,
  tournament_points_reconciled: ADMIN_AUDIT_CATEGORY.SCORING,
  global_prediction_lock_applied: ADMIN_AUDIT_CATEGORY.SAFEGUARDS,
  grace_granted: ADMIN_AUDIT_CATEGORY.SAFEGUARDS,
  grace_revoked: ADMIN_AUDIT_CATEGORY.SAFEGUARDS,
  feature_control_updated: ADMIN_AUDIT_CATEGORY.SAFEGUARDS,
  team_profile_updated: ADMIN_AUDIT_CATEGORY.CONTENT,
  time_control_updated: ADMIN_AUDIT_CATEGORY.CONTENT,
  time_control_reset: ADMIN_AUDIT_CATEGORY.CONTENT,
  admin_granted: ADMIN_AUDIT_CATEGORY.ACCESS,
  admin_revoked: ADMIN_AUDIT_CATEGORY.ACCESS,
})

export function categoriseAdminOperation(operationType) {
  return CATEGORY_BY_OPERATION[operationType] ?? ADMIN_AUDIT_CATEGORY.ALL
}

export function filterAdminOperationEvents(events = [], category = ADMIN_AUDIT_CATEGORY.ALL) {
  if (category === ADMIN_AUDIT_CATEGORY.ALL) return events
  return events.filter(event => categoriseAdminOperation(event.operationType) === category)
}
