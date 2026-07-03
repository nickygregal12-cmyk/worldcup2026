import { describe, expect, it } from 'vitest'
import {
  ADMIN_AUDIT_CATEGORY,
  categoriseAdminOperation,
  filterAdminOperationEvents,
} from '../adminAuditModel.js'

describe('admin audit model', () => {
  it('maps every Stage 13F-K event to a read-only filter category', () => {
    expect(categoriseAdminOperation('fixture_schedule_updated')).toBe(ADMIN_AUDIT_CATEGORY.FIXTURES)
    expect(categoriseAdminOperation('tournament_points_reconciled')).toBe(ADMIN_AUDIT_CATEGORY.SCORING)
    expect(categoriseAdminOperation('team_profile_updated')).toBe(ADMIN_AUDIT_CATEGORY.CONTENT)
  })

  it('filters without mutating the append-only event list', () => {
    const events = Object.freeze([
      Object.freeze({ eventId: '1', operationType: 'fixture_schedule_updated' }),
      Object.freeze({ eventId: '2', operationType: 'result_corrected' }),
    ])
    expect(filterAdminOperationEvents(events, ADMIN_AUDIT_CATEGORY.FIXTURES)).toEqual([events[0]])
    expect(filterAdminOperationEvents(events, ADMIN_AUDIT_CATEGORY.ALL)).toBe(events)
  })
})
