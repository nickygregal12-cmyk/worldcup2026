import { describe, expect, it } from 'vitest'
import { summariseFoundationData } from '../foundationModel.js'

const tournament = { id: 't1', name: 'UEFA EURO 2028' }
const stages = [
  { id: 's1', sequence: 1, stage_type: 'group' },
  { id: 's2', sequence: 2, stage_type: 'knockout' },
]

function makeModel(overrides = {}) {
  return summariseFoundationData({
    tournament,
    stages,
    groups: [{ id: 'g1', sequence: 1 }],
    tournamentTeams: [
      { id: 'tt1', team_id: null, is_provisional: true },
      { id: 'tt2', team_id: 'team-2', is_provisional: false },
    ],
    tournamentVenues: [
      { venue_id: 'v1', is_provisional: false },
      { venue_id: 'v2', is_provisional: true },
    ],
    matches: [
      { id: 'm1', stage_id: 's1', kickoff_at: null, schedule_status: 'official_date_venue', participants_status: 'provisional' },
      { id: 'm2', stage_id: 's2', kickoff_at: '2028-06-24T18:00:00Z', schedule_status: 'official', participants_status: 'confirmed' },
    ],
    matchSlots: [
      { id: 'ms1', source_type: 'best_third', resolved_tournament_team_id: null },
      { id: 'ms2', source_type: 'match_winner', resolved_tournament_team_id: 'tt2' },
    ],
    ...overrides,
  })
}

describe('summariseFoundationData', () => {
  it('separates group and knockout matches', () => {
    const model = makeModel()

    expect(model.totals.groupMatches).toBe(1)
    expect(model.totals.knockoutMatches).toBe(1)
  })

  it('keeps provisional and resolved slot counts separate', () => {
    const model = makeModel()

    expect(model.totals.unresolvedTournamentSlots).toBe(1)
    expect(model.totals.provisionalTournamentSlots).toBe(1)
    expect(model.totals.resolvedMatchSlots).toBe(1)
  })

  it('reports schedule and participant certainty independently', () => {
    const model = makeModel()

    expect(model.totals.officialDateVenueMatches).toBe(2)
    expect(model.totals.enteredKickoffTimes).toBe(1)
    expect(model.certainty.scheduleStatuses).toEqual({ official_date_venue: 1, official: 1 })
    expect(model.certainty.participantStatuses).toEqual({ provisional: 1, confirmed: 1 })
  })
})
