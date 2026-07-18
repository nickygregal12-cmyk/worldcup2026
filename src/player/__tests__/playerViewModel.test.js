import { describe, expect, it } from 'vitest'
import { buildPlayerViewTestReference } from './playerViewTestReference.js'
import { buildPlayerBracketPreview, buildPlayerView } from '../playerViewModel.js'
import { VISUAL_BRACKET_DRAFT, VISUAL_GROUP_REFERENCE } from '../../testFixtures/visualFixture.js'

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
  it('rebuilds a released player bracket preview for live health comparisons', () => {
    const predictionBundle = {
      visible: true,
      match_predictions: Object.values(VISUAL_BRACKET_DRAFT.groupPredictions).map(row => ({
        match_number: row.matchNumber,
        home_score_90: row.homeScore,
        away_score_90: row.awayScore,
        joker_applied: row.jokerApplied,
      })),
      bracket_predictions: Object.values(VISUAL_BRACKET_DRAFT.bracketPredictions).map(row => ({
        match_number: row.matchNumber,
        advancing_tournament_team_id: row.advancingTeamId,
      })),
    }
    const preview = buildPlayerBracketPreview({ predictionBundle, reference: VISUAL_GROUP_REFERENCE })
    expect(preview.completeness.groups.complete).toBe(36)
    expect(preview.completeness.bracket.complete).toBe(15)
  })

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
    expect(view.bracketPreview).toBeNull()
    expect(view.counts.jokerPredictions).toBe(1)
  })

  // Pre-lock, the shared bundle a viewer receives about *another* player carries no picks at all.
  const preLockOtherBundle = {
    visible: false,
    reason: 'Original predictions remain private until the tournament prediction lock.',
    display_name: 'Dougie',
    match_predictions: [],
    bracket_predictions: [],
  }

  it('hides another player’s Original picks before the lock', () => {
    const view = buildPlayerView({
      memberUserId: 'player-1',
      standingsRows: [],
      predictionBundle: preLockOtherBundle,
      competitionKey: 'original',
      reference,
      lifecycle: { locked: false },
      isSelf: false,
    })

    expect(view.release.state).toBe('protected')
    expect(view.counts.visiblePredictions).toBe(0)
    expect(view.counts.protectedPredictions).toBe(view.predictions.length)
    expect(view.predictions[0].visibility).toBe('private')
    expect(view.bracketPreview).toBeNull()
  })

  it('shows your own Original picks in full before the lock', () => {
    const view = buildPlayerView({
      memberUserId: 'me',
      standingsRows: [],
      // Your own picks are read straight from your own rows, so they are always present.
      predictionBundle: { ...bundle, display_name: 'Nicky' },
      competitionKey: 'original',
      reference,
      lifecycle: { locked: false },
      isSelf: true,
    })

    expect(view.release.state).toBe('released')
    expect(view.release.title).toBe('Your own predictions')
    expect(view.player.isCurrentUser).toBe(true)
    expect(view.counts.visiblePredictions).toBe(2)
    expect(view.counts.protectedPredictions).toBe(0)
    expect(view.predictions[0].score).toBe('2–1')
    expect(view.bracketSummary.visibleCount).toBe(1)
    expect(view.bracket[0].advancingTeamLabel).toBe('Scotland')
    expect(view.predictedTables[0].rows[0].note).toBe('Saved prediction')
  })

  it('shows your own KO picks before their fixtures start', () => {
    const view = buildPlayerView({
      memberUserId: 'me',
      standingsRows: [],
      predictionBundle: {
        display_name: 'Nicky',
        match_predictions: [{ match_number: 37, home_score_90: 1, away_score_90: 0 }],
      },
      competitionKey: 'ko_predictor',
      reference,
      lifecycle: { locked: false },
      isSelf: true,
    })

    expect(view.release.state).toBe('released')
    expect(view.counts.visiblePredictions).toBe(1)
    expect(view.predictions[0].visibility).toBe('visible')
  })

  it('still hides another player’s KO pick before that fixture starts', () => {
    const view = buildPlayerView({
      memberUserId: 'player-1',
      standingsRows: [],
      predictionBundle: { display_name: 'Dougie', match_predictions: [] },
      competitionKey: 'ko_predictor',
      reference,
      lifecycle: { locked: false },
      isSelf: false,
    })

    expect(view.release.state).toBe('protected')
    expect(view.predictions[0].visibility).toBe('private')
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

describe('prediction DNA', () => {
  it('computes style shares, goals and the most-called line from released group scores', async () => {
    const { buildPredictionDna } = await import('../playerViewModel.js')
    const dna = buildPredictionDna([
      { visibility: 'visible', stageLabel: 'Group A', score: '2–1' },
      { visibility: 'visible', stageLabel: 'Group A', score: '2–1' },
      { visibility: 'visible', stageLabel: 'Group B', score: '0–0' },
      { visibility: 'visible', stageLabel: 'Group B', score: '0–2' },
      { visibility: 'private', stageLabel: 'Group C', score: null },
      { visibility: 'visible', stageLabel: 'Round of 16', score: '1–0' },
    ])
    expect(dna.sampleSize).toBe(4)
    expect(dna.homeWinsPercent).toBe(50)
    expect(dna.drawsPercent).toBe(25)
    expect(dna.awayWinsPercent).toBe(25)
    expect(dna.averageGoals).toBe('2.0')
    expect(dna.topScoreline).toBe('2–1')
  })

  it('returns null with no released group scores', async () => {
    const { buildPredictionDna } = await import('../playerViewModel.js')
    expect(buildPredictionDna([{ visibility: 'private', stageLabel: 'Group A', score: null }])).toBeNull()
  })
})
