import { describe, expect, it } from 'vitest'
import { ALL_HOME_KNOCKOUT, buildGuestReference, COMPLETE_GROUP_SCORES } from './fixtures.js'
import { createGuestPredictionState } from '../guestPredictionState.js'
import { createGuestKoPredictionState, updateGuestKoPredictionState } from '../guestKoPredictionStorage.js'
import { buildGuestAccountTransferPrompt, buildGuestAccountTransferSummary } from '../guestAccountTransferModel.js'
import { updatePredictionJourneyBracket, updatePredictionJourneyGroup } from '../../journey/predictionJourneyModel.js'
import { resolveGuestTournamentPreview } from '../guestTournamentPreview.js'

function completeOriginal(reference) {
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

function withResolvedKo(reference) {
  return {
    ...reference,
    knockoutMatches: reference.knockoutMatches.map((match, index) => index === 0 ? {
      ...match,
      participantsResolved: true,
      homeTeamId: 'A1',
      awayTeamId: 'A2',
    } : match),
  }
}

describe('guest account transfer summary', () => {
  it('marks a complete Original draft and complete KO row as safely transferable', () => {
    const reference = withResolvedKo(buildGuestReference())
    const originalState = completeOriginal(reference)
    let koState = createGuestKoPredictionState(reference)
    koState = updateGuestKoPredictionState(koState, reference, reference.knockoutMatches[0], { homeScore: 2, awayScore: 1 })

    const summary = buildGuestAccountTransferSummary({ reference, originalState, koState, accountOriginal: null, accountKo: null })
    expect(summary).toMatchObject({ hasOriginal: true, hasKo: true, canImportOriginal: true, canImportKo: true, transferable: true })
  })

  it('never offers an overwrite when account predictions already exist', () => {
    const reference = withResolvedKo(buildGuestReference())
    const originalState = completeOriginal(reference)
    let koState = createGuestKoPredictionState(reference)
    koState = updateGuestKoPredictionState(koState, reference, reference.knockoutMatches[0], { homeScore: 1, awayScore: 0 })

    const summary = buildGuestAccountTransferSummary({ reference, originalState, koState, accountOriginal: { revision: 2 }, accountKo: { revision: 3 } })
    expect(summary).toMatchObject({ canImportOriginal: false, canImportKo: false, transferable: false })
  })

  it('retains an incomplete device draft until it is ready', () => {
    const reference = withResolvedKo(buildGuestReference())
    let originalState = createGuestPredictionState(reference)
    originalState = updatePredictionJourneyGroup(originalState, { matchNumber: 1, homeScore: 1, awayScore: 1 })
    const summary = buildGuestAccountTransferSummary({ reference, originalState, koState: createGuestKoPredictionState(reference), accountOriginal: null, accountKo: null })
    expect(summary.hasOriginal).toBe(true)
    expect(summary.canImportOriginal).toBe(false)
    expect(summary.originalCompleteness.remaining).toBe(50)
  })

  it('builds the accepted signed-in import prompt copy for combined Original and KO drafts', () => {
    const prompt = buildGuestAccountTransferPrompt({ hasOriginal: true, hasKo: true })
    expect(prompt).toMatchObject({
      heading: 'Import your saved Euro 2028 predictions?',
      helper: 'We found group scores, bracket picks and a KO Predictor draft on this device. Choose whether to import them to this account or start fresh.',
      primaryAction: 'Import predictions to my account',
      secondaryAction: 'Start fresh',
    })
  })

  it('builds device-only helper copy when only a KO Predictor draft exists', () => {
    const prompt = buildGuestAccountTransferPrompt({ hasOriginal: false, hasKo: true })
    expect(prompt.helper).toBe('We found a KO Predictor draft on this device. Choose whether to import them to this account or start fresh.')
    expect(prompt.helper).not.toMatch(/browser draft|browser copy/i)
  })

})
