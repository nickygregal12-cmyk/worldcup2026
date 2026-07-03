import { describe, expect, it } from 'vitest'
import { createGuestPredictionState } from '../../guest/index.js'
import { buildGuestReference, COMPLETE_GROUP_SCORES } from '../../guest/__tests__/fixtures.js'
import { PREDICTION_ROW_KIND } from '../../contracts/predictionDatabaseContract.js'
import {
  buildOriginalPredictionLifecycle,
  buildPredictionJourneyRows,
  clearStaleBracketSelections,
  createPredictionJourneyDraft,
  summarisePredictionJourney,
  updatePredictionJourneyBracket,
  updatePredictionJourneyGroup,
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
    const match = summarisePredictionJourney(reference, state).preview.resolution.knockout.byMatchNumber[matchNumber]
    state = updatePredictionJourneyBracket(
      state,
      match,
      match.homeTeamId,
      { now: `2026-07-01T13:${String(matchNumber - 37).padStart(2, '0')}:00Z` },
    )
  }
  return state
}

describe('prediction journey model', () => {
  it('starts with an empty original-predictor draft', () => {
    const reference = buildGuestReference()
    const draft = createPredictionJourneyDraft(reference)
    const summary = summarisePredictionJourney(reference, draft)

    expect(summary.totalComplete).toBe(0)
    expect(summary.savableRows).toBe(0)
    expect(summary.canSubmit).toBe(false)
  })

  it('hydrates group scores and winner-only bracket rows', () => {
    const reference = buildGuestReference()
    const bundle = {
      updatedAt: '2026-07-01T12:00:00Z',
      predictions: [
        {
          prediction_kind: PREDICTION_ROW_KIND.GROUP_SCORE,
          match_id: 'match-1',
          home_score_90: 2,
          away_score_90: 1,
          joker_applied: true,
          updated_at: '2026-07-01T12:00:00Z',
        },
        {
          prediction_kind: PREDICTION_ROW_KIND.BRACKET_PICK,
          match_id: 'match-37',
          advancing_tournament_team_id: 'A1',
          updated_at: '2026-07-01T12:00:00Z',
        },
      ],
    }

    const draft = createPredictionJourneyDraft(reference, bundle)
    expect(draft.groupPredictions['1']).toMatchObject({ homeScore: 2, awayScore: 1, jokerApplied: true })
    expect(draft.bracketPredictions['37']).toMatchObject({ advancingTeamId: 'A1' })
    expect(draft.bracketPredictions['37']).not.toHaveProperty('homeScore')
  })

  it('builds an atomic partial group bundle from complete rows only', () => {
    const reference = buildGuestReference()
    let draft = createPredictionJourneyDraft(reference)
    draft = updatePredictionJourneyGroup(draft, { matchNumber: 1, homeScore: 2, awayScore: 1 })
    expect(buildPredictionJourneyRows(reference, draft)).toHaveLength(1)

    draft = updatePredictionJourneyGroup(draft, { matchNumber: 2, homeScore: 1 })
    expect(buildPredictionJourneyRows(reference, draft)).toHaveLength(1)
  })

  it('enforces five group jokers and no bracket joker field', () => {
    const reference = buildGuestReference()
    let draft = createPredictionJourneyDraft(reference)
    for (let matchNumber = 1; matchNumber <= 5; matchNumber += 1) {
      draft = updatePredictionJourneyGroup(draft, { matchNumber, jokerApplied: true })
    }
    expect(() => updatePredictionJourneyGroup(draft, { matchNumber: 6, jokerApplied: true }))
      .toThrow('Only 5 group-stage jokers')
    expect(draft.bracketPredictions['37']).not.toHaveProperty('jokerApplied')
  })

  it('unlocks the winner-only bracket after all 36 group predictions exist', () => {
    const reference = buildGuestReference()
    const draft = completeGroups(reference)
    const summary = summarisePredictionJourney(reference, draft)

    expect(summary.groupComplete).toBe(36)
    expect(summary.bracketComplete).toBe(0)
    expect(summary.savableRows).toBe(36)
    expect(summary.preview.resolution.knockout.byMatchNumber[37].participantsResolved).toBe(true)
  })


  it('summarises the central lifecycle and Original/KO boundary for prediction surfaces', () => {
    const reference = buildGuestReference()
    const draft = completeGroups(reference)
    const summary = summarisePredictionJourney(reference, draft)
    const lifecycle = {
      predictionLockAt: '2028-06-09T19:00:00.000Z',
      locked: false,
      provisional: true,
      source: 'central-provisional',
    }

    const surface = buildOriginalPredictionLifecycle(reference, lifecycle, summary)

    expect(surface.lockLabel).toBe('Editable until the central prediction lock')
    expect(surface.bracketOpen).toBe(true)
    expect(surface.bracketLabel).toBe('0/15 winner-only bracket picks')
    expect(surface.koBoundaryLabel).toContain('separate real-fixture competition')
  })

  it('requires the bracket winner to be one of the predicted participants', () => {
    const reference = buildGuestReference()
    const draft = completeGroups(reference)
    const match = summarisePredictionJourney(reference, draft).preview.resolution.knockout.byMatchNumber[37]

    expect(() => updatePredictionJourneyBracket(draft, match, 'F4'))
      .toThrow('winner must be one of the predicted participants')
  })

  it('builds a complete 36-score plus 15-bracket-pick bundle ready for review', () => {
    const reference = buildGuestReference()
    const draft = completeTournament(reference)
    const summary = summarisePredictionJourney(reference, draft)
    const rows = buildPredictionJourneyRows(reference, draft)

    expect(summary.totalComplete).toBe(51)
    expect(summary.savableRows).toBe(51)
    expect(summary.canSubmit).toBe(true)
    expect(rows.filter(row => row.prediction_kind === PREDICTION_ROW_KIND.GROUP_SCORE)).toHaveLength(36)
    expect(rows.filter(row => row.prediction_kind === PREDICTION_ROW_KIND.BRACKET_PICK)).toHaveLength(15)
    expect(rows.slice(36).every(row => row.home_score_90 === null && row.joker_applied === false)).toBe(true)
  })

  it('clears downstream bracket selections that become stale', () => {
    const reference = buildGuestReference()
    let draft = completeTournament(reference)
    const match39 = summarisePredictionJourney(reference, draft).preview.resolution.knockout.byMatchNumber[39]
    draft = updatePredictionJourneyBracket(draft, match39, match39.awayTeamId)

    const before = summarisePredictionJourney(reference, draft)
    expect(before.preview.diagnostics.length).toBeGreaterThan(0)

    const cleared = clearStaleBracketSelections(reference, draft)
    const after = summarisePredictionJourney(reference, cleared)
    expect(after.preview.diagnostics.length).toBe(0)
    expect(after.totalComplete).toBeLessThan(51)
  })
})
