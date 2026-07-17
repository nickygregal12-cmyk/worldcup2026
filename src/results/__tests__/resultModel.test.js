import { describe, expect, it } from 'vitest'
import { buildGuestReference } from '../../guest/__tests__/fixtures.js'
import {
  buildCanonicalResultFeed,
  buildLeaderboardLifecycle,
  buildLiveBracketRounds,
  buildResultsLifecycle,
  buildLiveTournamentSnapshot,
  mapStoredDecisionMethod,
  normaliseCanonicalResult,
  normaliseLeaderboard,
  normalisePointsBreakdown,
  RESULT_COMPETITION,
} from '../resultModel.js'

function reference() {
  return buildGuestReference()
}

describe('Stage 13D result model', () => {
  it('maps stored database methods without adding shoot-out kicks to the score', () => {
    expect(mapStoredDecisionMethod('regulation')).toBe('normal_time')
    expect(mapStoredDecisionMethod('penalties')).toBe('penalties')
  })

  it('hides void and manual-review scores from the live resolver', () => {
    const row = normaliseCanonicalResult({
      id: 'match-1', match_number: 1, status: 'completed', result_status: 'void',
      result_revision: 2, home_score_90: 4, away_score_90: 0,
    })
    expect(row.scoreVisible).toBe(false)
    expect(row.normalTimeHomeGoals).toBeNull()
  })

  it('uses live and pending scores in live group tables', () => {
    const model = reference()
    const first = model.groupMatches[0]
    const snapshot = buildLiveTournamentSnapshot({
      reference: model,
      resultRows: [{
        id: first.matchId, match_number: first.matchNumber, status: 'live', result_status: 'pending',
        result_revision: 1, home_score_90: 2, away_score_90: 0,
      }],
    })
    expect(snapshot.summary.liveMatches).toBe(1)
    expect(snapshot.groups[first.groupCode].completedMatchCount).toBe(1)
  })

  it('uses only confirmed completed winners to progress the live bracket', () => {
    const model = reference()
    const knockout = model.knockoutMatches[0]
    const snapshot = buildLiveTournamentSnapshot({
      reference: model,
      resultRows: [{
        id: knockout.matchId, match_number: knockout.matchNumber, status: 'live', result_status: 'pending',
        result_revision: 1, home_score_90: 1, away_score_90: 0, winner_tournament_team_id: knockout.homeTeamId,
      }],
    })
    expect(snapshot.summary.resolvedKnockoutDecisions).toBe(0)
  })

  it('keeps the live resolver context separate from guest and predicted records', () => {
    const snapshot = buildLiveTournamentSnapshot({ reference: reference(), resultRows: [] })
    expect(snapshot.context).toBe('live')
    expect(snapshot.results).toHaveLength(0)
  })

  it('normalises separate leaderboard rows', () => {
    const rows = normaliseLeaderboard([{
      rank: 1, user_id: 'user-1', display_name: 'Nicky', match_points: 30,
      bracket_points: 20, total_points: 50, scored_match_count: 1,
    }], RESULT_COMPETITION.ORIGINAL)
    expect(rows[0]).toMatchObject({ totalPoints: 50, competitionKey: 'original' })
    expect(() => normaliseLeaderboard([], 'combined')).toThrow('Unsupported leaderboard competition')
  })

  it('builds a complete canonical result feed with correction state', () => {
    const model = reference()
    const first = model.groupMatches[0]
    const snapshot = buildLiveTournamentSnapshot({
      reference: model,
      resultRows: [{
        id: first.matchId, match_number: first.matchNumber, status: 'completed', result_status: 'confirmed',
        result_revision: 2, home_score_90: 2, away_score_90: 1, result_method: 'regulation',
      }],
    })
    const feed = buildCanonicalResultFeed({ reference: model, liveSnapshot: snapshot })
    expect(feed.rows).toHaveLength(51)
    expect(feed.sections.completed[0]).toMatchObject({ score: '2–1', corrected: true, resultRevision: 2 })
    expect(feed.sections.upcoming).toHaveLength(50)
  })

  it('does not leak stale correction metadata onto an upcoming fixture', () => {
    const model = reference()
    const first = model.groupMatches[0]
    const snapshot = buildLiveTournamentSnapshot({
      reference: model,
      resultRows: [{
        id: first.matchId, match_number: first.matchNumber, status: 'scheduled', result_status: 'pending',
        result_revision: 4, home_score_90: 3, away_score_90: 2, result_method: 'penalties',
      }],
    })
    const row = buildCanonicalResultFeed({ reference: model, liveSnapshot: snapshot }).rows[0]

    expect(row).toMatchObject({ state: 'upcoming', score: null, detail: null, corrected: false })
  })

  it('shows all 15 live bracket positions including unresolved source labels', () => {
    const model = reference()
    const snapshot = buildLiveTournamentSnapshot({ reference: model, resultRows: [] })
    const rounds = buildLiveBracketRounds({ reference: model, liveSnapshot: snapshot })
    expect(rounds.flatMap(round => round.matches)).toHaveLength(15)
    expect(rounds[0].matches[0].homeLabel).toBe('1A')
    expect(rounds.at(-1).label).toBe('Final')
  })

  it('normalises separate Original and KO point components and correction revisions', () => {
    const model = reference()
    const first = model.groupMatches[0]
    const points = normalisePointsBreakdown({
      competition_key: 'original',
      match_points: 20,
      bracket_points: 10,
      total_points: 30,
      scored_match_count: 1,
      match_breakdown: [{
        match_id: first.matchId,
        exact_score_points: 10,
        correct_outcome_points: 0,
        advancing_team_points: 0,
        decision_method_points: 0,
        joker_multiplier: 2,
        total_points: 20,
        result_revision: 3,
      }],
      bracket_breakdown: [{ milestone: 'quarter_final', tournament_team_id: 'A1', points: 10 }],
    }, RESULT_COMPETITION.ORIGINAL, model)
    expect(points).toMatchObject({ totalPoints: 30, correctedMatchCount: 1 })
    expect(points.matchBreakdown[0]).toMatchObject({ matchNumber: 1, jokerBonus: 10, corrected: true })
    expect(points.bracketBreakdown[0].teamLabel).toBe('Group A slot 1')
  })

  it('derives results lifecycle from central start and canonical result states', () => {
    expect(buildResultsLifecycle({ lifecycle: { started: false }, liveSnapshot: null })).toMatchObject({
      state: 'pre_tournament',
      title: 'Results open when the tournament starts',
    })
    const live = buildResultsLifecycle({
      lifecycle: { started: true },
      liveSnapshot: { results: [{ status: 'live', resultStatus: 'pending', scoreVisible: true, confirmed: false }] },
    })
    expect(live).toMatchObject({ state: 'live', liveMatches: 1 })
  })

  it('keeps leaderboard lifecycle scoped by competition', () => {
    const original = buildLeaderboardLifecycle({
      competitionKey: RESULT_COMPETITION.ORIGINAL,
      lifecycle: { started: true, locked: true },
      leaderboardRows: [{ scoredMatchCount: 1, totalPoints: 30 }],
    })
    expect(original).toMatchObject({ title: 'Original Predictor standings are live', scoredRows: 1, locked: true })

    const ko = buildLeaderboardLifecycle({
      competitionKey: RESULT_COMPETITION.KO_PREDICTOR,
      lifecycle: { started: false, locked: false },
      leaderboardRows: [],
    })
    expect(ko.title).toBe('KO leaderboard waits for real knockout fixtures')
  })

})
