import { describe, expect, it } from 'vitest'
import { buildPlayerViewTestReference } from './playerViewTestReference.js'
import { buildPlayerView } from '../playerViewModel.js'

const reference = buildPlayerViewTestReference()

const bundle = {
  visible: true,
  releaseState: 'released',
  displayName: 'Dougie',
  match_predictions: [
    { match_number: 1, home_score_90: 2, away_score_90: 1, joker_applied: true },
    { match_number: 2, home_score_90: 0, away_score_90: 0, joker_applied: false },
  ],
  bracket_predictions: [
    { match_number: 37, advancing_tournament_team_id: reference.teams[0].id },
  ],
}

describe('player view model', () => {
  it('builds an Original Player View with predictions, bracket and table sections', () => {
    const view = buildPlayerView({
      memberUserId: 'player-1',
      displayName: 'Dougie',
      standingsRows: [{ userId: 'player-1', displayName: 'Dougie', rank: 2, totalPoints: 42 }],
      predictionBundle: bundle,
      competitionKey: 'original',
      reference,
      lifecycle: { locked: true },
    })

    expect(view.player.displayName).toBe('Dougie')
    expect(view.release.state).toBe('released')
    expect(view.predictions.length).toBeGreaterThan(0)
    expect(view.bracketSummary.totalCount).toBeGreaterThan(0)
    expect(view.predictedTables.length).toBeGreaterThan(0)
    expect(view.counts.jokerPredictions).toBe(1)
  })

  it('keeps KO Predictor separate from Original bracket and predicted tables', () => {
    const view = buildPlayerView({
      memberUserId: 'player-1',
      displayName: 'Dougie',
      standingsRows: [],
      predictionBundle: { ...bundle, bracket_predictions: [] },
      competitionKey: 'ko_predictor',
      reference,
      lifecycle: { tournamentStarted: true },
    })

    expect(view.bracket).toHaveLength(0)
    expect(view.predictedTables).toHaveLength(0)
  })
})
