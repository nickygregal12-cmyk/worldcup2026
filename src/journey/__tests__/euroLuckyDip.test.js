import { describe, expect, it } from 'vitest'
import { ALL_HOME_KNOCKOUT, buildGuestReference, COMPLETE_GROUP_SCORES } from '../../guest/__tests__/fixtures.js'
import { createGuestPredictionState, resolveGuestTournamentPreview } from '../../guest/index.js'
import { applyEuroLuckyDip, EURO_LUCKY_DIP_MODE, generateEuroLuckyDipScore } from '../euroLuckyDip.js'
import { updatePredictionJourneyBracket, updatePredictionJourneyGroup } from '../predictionJourneyModel.js'

function completedDraft(reference) {
  let state = createGuestPredictionState(reference)
  for (const match of reference.groupMatches) {
    const [homeScore, awayScore] = COMPLETE_GROUP_SCORES[(match.matchNumber - 1) % COMPLETE_GROUP_SCORES.length]
    state = updatePredictionJourneyGroup(state, { matchNumber: match.matchNumber, homeScore, awayScore })
  }
  let preview = resolveGuestTournamentPreview(reference, state)
  for (const [matchNumber] of ALL_HOME_KNOCKOUT) {
    const match = preview.resolution.knockout.byMatchNumber[matchNumber]
    state = updatePredictionJourneyBracket(state, match, match.homeTeamId)
    preview = resolveGuestTournamentPreview(reference, state)
  }
  return state
}

describe('Euro-native Lucky Dip', () => {
  it('uses the local weighted score distribution', () => {
    expect(generateEuroLuckyDipScore(() => 0)).toEqual({ homeScore: 0, awayScore: 0 })
    expect(generateEuroLuckyDipScore(() => 0.999999)).toEqual({ homeScore: 0, awayScore: 4 })
    expect(() => generateEuroLuckyDipScore(() => 1)).toThrow('Lucky Dip random values')
  })

  it('fills only empty scores and preserves existing scores and jokers', () => {
    const reference = buildGuestReference()
    let state = createGuestPredictionState(reference)
    state = updatePredictionJourneyGroup(state, { matchNumber: 1, homeScore: 4, awayScore: 2, jokerApplied: true })
    const result = applyEuroLuckyDip(reference, state, { mode: EURO_LUCKY_DIP_MODE.EMPTY, random: () => 0 })

    expect(result.changed).toBe(35)
    expect(result.draft.groupPredictions['1']).toMatchObject({ homeScore: 4, awayScore: 2, jokerApplied: true })
    expect(result.draft.groupPredictions['2']).toMatchObject({ homeScore: 0, awayScore: 0, jokerApplied: false })
  })

  it('replaces all scores, preserves jokers and clears bracket picks made stale', () => {
    const reference = buildGuestReference()
    let state = completedDraft(reference)
    state = updatePredictionJourneyGroup(state, { matchNumber: 1, jokerApplied: true })
    const result = applyEuroLuckyDip(reference, state, { mode: EURO_LUCKY_DIP_MODE.REPLACE, random: () => 0.999999 })
    const preview = resolveGuestTournamentPreview(reference, result.draft)

    expect(result.changed).toBe(36)
    expect(result.draft.groupPredictions['1'].jokerApplied).toBe(true)
    expect(preview.diagnostics.filter(item => item.code === 'GUEST_BRACKET_STALE_ADVANCING_TEAM' || item.code === 'GUEST_BRACKET_BLOCKED')).toEqual([])
  })
})
