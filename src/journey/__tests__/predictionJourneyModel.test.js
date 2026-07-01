import { describe, expect, it } from 'vitest'
import { createGuestPredictionState } from '../../guest/index.js'
import { buildGuestReference, COMPLETE_GROUP_SCORES } from '../../guest/__tests__/fixtures.js'
import {
  buildPredictionJourneyRows,
  clearStaleKnockoutSelections,
  createPredictionJourneyDraft,
  normaliseKnockoutDraftEdit,
  summarisePredictionJourney,
  updatePredictionJourneyGroup,
  updatePredictionJourneyKnockout,
} from '../predictionJourneyModel.js'

function completeGroups(reference) {
  let state = createGuestPredictionState(reference, { now: '2026-07-01T12:00:00Z' })
  reference.groupMatches.forEach((match, index) => {
    const [homeScore, awayScore] = COMPLETE_GROUP_SCORES[index % COMPLETE_GROUP_SCORES.length]
    state = updatePredictionJourneyGroup(state, {
      matchNumber: match.matchNumber,
      homeScore,
      awayScore,
    }, { now: `2026-07-01T12:${String(index).padStart(2, '0')}:00Z` })
  })
  return state
}

function completeTournament(reference) {
  let state = completeGroups(reference)
  for (let matchNumber = 37; matchNumber <= 51; matchNumber += 1) {
    const summary = summarisePredictionJourney(reference, state)
    const match = summary.preview.resolution.knockout.byMatchNumber[matchNumber]
    state = updatePredictionJourneyKnockout(state, match, {
      homeScore: 1,
      awayScore: 0,
    }, { now: `2026-07-01T13:${String(matchNumber - 37).padStart(2, '0')}:00Z` })
  }
  return state
}

describe('prediction journey model', () => {
  it('starts with an empty 51-match draft', () => {
    const reference = buildGuestReference()
    const draft = createPredictionJourneyDraft(reference)

    const summary = summarisePredictionJourney(reference, draft)
    expect(summary.totalComplete).toBe(0)
    expect(summary.savableRows).toBe(0)
    expect(summary.canSubmit).toBe(false)
  })

  it('hydrates account rows into the shared draft model', () => {
    const reference = buildGuestReference()
    const bundle = {
      updatedAt: '2026-07-01T12:00:00Z',
      predictions: [
        {
          match_id: 'match-1',
          home_score_90: 2,
          away_score_90: 1,
          joker_applied: false,
          updated_at: '2026-07-01T12:00:00Z',
        },
      ],
    }

    const draft = createPredictionJourneyDraft(reference, bundle)
    expect(draft.groupPredictions['1']).toMatchObject({
      homeScore: 2,
      awayScore: 1,
    })
  })

  it('builds an atomic partial group bundle from complete rows only', () => {
    const reference = buildGuestReference()
    let draft = createPredictionJourneyDraft(reference)
    draft = updatePredictionJourneyGroup(draft, {
      matchNumber: 1,
      homeScore: 2,
      awayScore: 1,
    })

    expect(buildPredictionJourneyRows(reference, draft)).toHaveLength(1)

    draft = updatePredictionJourneyGroup(draft, {
      matchNumber: 2,
      homeScore: 1,
    })
    expect(buildPredictionJourneyRows(reference, draft)).toHaveLength(1)
  })

  it('unlocks knockout saving only after all 36 group predictions exist', () => {
    const reference = buildGuestReference()
    const draft = completeGroups(reference)
    const summary = summarisePredictionJourney(reference, draft)

    expect(summary.groupComplete).toBe(36)
    expect(summary.knockoutComplete).toBe(0)
    expect(summary.savableRows).toBe(36)
    expect(summary.preview.resolution.knockout.byMatchNumber[37].participantsResolved).toBe(true)
  })

  it('normalises a non-draw knockout score to the score winner and normal time', () => {
    const current = {
      matchNumber: 37,
      homeScore: null,
      awayScore: null,
      advancingTeamId: null,
      decisionMethod: null,
      jokerApplied: false,
    }
    const match = {
      matchNumber: 37,
      homeTeamId: 'A1',
      awayTeamId: 'C2',
      participantsResolved: true,
    }

    expect(normaliseKnockoutDraftEdit(current, match, {
      homeScore: 3,
      awayScore: 1,
    })).toMatchObject({
      advancingTeamId: 'A1',
      decisionMethod: 'normal_time',
    })
  })

  it('normalises a drawn knockout score to an extra-time decision awaiting a team', () => {
    const current = {
      matchNumber: 37,
      homeScore: null,
      awayScore: null,
      advancingTeamId: null,
      decisionMethod: null,
      jokerApplied: false,
    }
    const match = {
      matchNumber: 37,
      homeTeamId: 'A1',
      awayTeamId: 'C2',
      participantsResolved: true,
    }

    expect(normaliseKnockoutDraftEdit(current, match, {
      homeScore: 1,
      awayScore: 1,
    })).toMatchObject({
      advancingTeamId: null,
      decisionMethod: 'extra_time',
    })
  })

  it('builds a complete 51-row canonical bundle ready for review', () => {
    const reference = buildGuestReference()
    const draft = completeTournament(reference)
    const summary = summarisePredictionJourney(reference, draft)

    expect(summary.totalComplete).toBe(51)
    expect(summary.savableRows).toBe(51)
    expect(summary.canSubmit).toBe(true)
    expect(buildPredictionJourneyRows(reference, draft)).toHaveLength(51)
  })

  it('clears knockout selections that become stale after an earlier prediction changes', () => {
    const reference = buildGuestReference()
    let draft = completeTournament(reference)

    draft = updatePredictionJourneyKnockout(
      draft,
      summarisePredictionJourney(reference, draft).preview.resolution.knockout.byMatchNumber[39],
      { homeScore: 0, awayScore: 1 },
    )

    const before = summarisePredictionJourney(reference, draft)
    expect(before.preview.diagnostics.length).toBeGreaterThan(0)

    const cleared = clearStaleKnockoutSelections(reference, draft)
    const after = summarisePredictionJourney(reference, cleared)
    expect(after.preview.diagnostics.length).toBe(0)
    expect(after.totalComplete).toBeLessThan(51)
  })
})
