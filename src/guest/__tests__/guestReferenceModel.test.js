import { describe, expect, it } from 'vitest'
import { buildGuestReferenceModel } from '../guestReferenceModel.js'
import { buildRawReferenceRows } from './fixtures.js'

describe('guest reference model', () => {
  it('adapts the public Euro reference rows into resolver inputs', () => {
    const model = buildGuestReferenceModel(buildRawReferenceRows())

    expect(model.context).toBe('guest')
    expect(model.referenceVersion).toBe('euro28-guest-reference-v1:2025-11-12')
    expect(model.groups).toHaveLength(6)
    expect(model.groupMatches).toHaveLength(36)
    expect(model.knockoutMatchNumbers).toEqual(Array.from({ length: 15 }, (_, index) => index + 37))
  })

  it('uses stable tournament-team IDs rather than unresolved team names', () => {
    const rows = buildRawReferenceRows()
    rows.tournamentTeams[0].team_id = 'actual-team-id'
    const model = buildGuestReferenceModel(rows)

    expect(model.groups[0].teams[0].teamId).toBe('A1')
    expect(model.groups[0].teams[0].actualTeamId).toBe('actual-team-id')
    expect(model.groupMatches[0].homeTeamId).toBe('A1')
  })

  it('rejects an incomplete public reference model', () => {
    const rows = buildRawReferenceRows()
    rows.matchSlots.pop()

    expect(() => buildGuestReferenceModel(rows)).toThrow('72 group match slots')
  })

  it('rejects mixed schedule versions', () => {
    const rows = buildRawReferenceRows()
    rows.matchSlots[0].rule_data.scheduleVersion = 'other-version'

    expect(() => buildGuestReferenceModel(rows)).toThrow('mixed group schedule versions')
  })
})
