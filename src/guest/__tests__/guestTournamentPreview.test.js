import { describe, expect, it } from 'vitest'
import {
  createGuestPredictionState,
  updateGuestGroupPrediction,
  updateGuestKnockoutPrediction,
} from '../guestPredictionState.js'
import { resolveGuestTournamentPreview } from '../guestTournamentPreview.js'
import {
  ALL_HOME_KNOCKOUT,
  buildGuestReference,
  COMPLETE_GROUP_SCORES,
} from './fixtures.js'

function fillGroups(state) {
  let next = state
  for (let matchNumber = 1; matchNumber <= 36; matchNumber += 1) {
    const [homeScore, awayScore] = COMPLETE_GROUP_SCORES[(matchNumber - 1) % 6]
    next = updateGuestGroupPrediction(next, { matchNumber, homeScore, awayScore })
  }
  return next
}

describe('guest tournament preview', () => {
  it('uses the canonical resolver in guest context only', () => {
    const reference = buildGuestReference()
    const state = createGuestPredictionState(reference)
    const preview = resolveGuestTournamentPreview(reference, state)

    expect(preview.resolution.context).toBe('guest')
    expect(preview.resolution.resolverVersion).toBe('euro28-canonical-resolver-v1')
    expect(preview.completeness.groups.complete).toBe(0)
    expect(preview.completeness.knockout.complete).toBe(0)
    expect(preview.completeness.overall.total).toBe(51)
  })

  it('does not count a partial group score as complete', () => {
    const reference = buildGuestReference()
    let state = createGuestPredictionState(reference)
    state = updateGuestGroupPrediction(state, { matchNumber: 1, homeScore: 2 })
    const preview = resolveGuestTournamentPreview(reference, state)

    expect(preview.completeness.groups).toMatchObject({ complete: 0, partial: 1, empty: 35 })
    expect(preview.resolution.groupTables.A.completedMatchCount).toBe(0)
  })

  it('progresses a complete guest bracket without blending another context', () => {
    const reference = buildGuestReference()
    let state = fillGroups(createGuestPredictionState(reference))

    for (const [matchNumber, advancingTeamId] of ALL_HOME_KNOCKOUT) {
      state = updateGuestKnockoutPrediction(state, {
        matchNumber,
        homeScore: 2,
        awayScore: 0,
        advancingTeamId,
        decisionMethod: 'normal_time',
      })
    }

    const preview = resolveGuestTournamentPreview(reference, state)
    expect(preview.resolution.knockout.championTeamId).toBe('B1')
    expect(preview.completeness.groups.complete).toBe(36)
    expect(preview.completeness.knockout.complete).toBe(15)
    expect(preview.completeness.overall.readyForAccountImport).toBe(true)
  })

  it('diagnoses a stale advancing-team selection instead of crashing progression', () => {
    const reference = buildGuestReference()
    let state = fillGroups(createGuestPredictionState(reference))
    state = updateGuestKnockoutPrediction(state, {
      matchNumber: 37,
      homeScore: 2,
      awayScore: 0,
      advancingTeamId: 'F4',
      decisionMethod: 'normal_time',
    })

    const preview = resolveGuestTournamentPreview(reference, state)
    expect(preview.diagnostics).toContainEqual({
      code: 'GUEST_KNOCKOUT_STALE_ADVANCING_TEAM',
      matchNumber: 37,
      advancingTeamId: 'F4',
    })
    expect(preview.resolution.knockout.byMatchNumber[37].winnerTeamId).toBeNull()
  })
})
