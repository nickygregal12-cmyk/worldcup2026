import { RESOLVER_CONTEXT, resolveEuro28Tournament } from '../resolver/index.js'

const SCORE_VISIBLE_STATUSES = new Set(['live', 'paused', 'completed'])
const SCORE_VISIBLE_RESULT_STATUSES = new Set(['pending', 'confirmed'])

export const RESULT_COMPETITION = Object.freeze({
  ORIGINAL: 'original',
  KO_PREDICTOR: 'ko_predictor',
})

export function mapStoredDecisionMethod(value) {
  if (value === 'regulation') return 'normal_time'
  if (value === 'extra_time') return 'extra_time'
  if (value === 'penalties') return 'penalties'
  if (value === 'awarded') return 'administrative'
  return null
}

function integerOrNull(value) {
  return Number.isInteger(value) && value >= 0 ? value : null
}

export function normaliseCanonicalResult(row) {
  if (!row?.id) throw new TypeError('Every result row requires a match id')

  const scoreVisible = SCORE_VISIBLE_STATUSES.has(row.status) &&
    SCORE_VISIBLE_RESULT_STATUSES.has(row.result_status)
  const homeScore = scoreVisible ? integerOrNull(row.home_score_90) : null
  const awayScore = scoreVisible ? integerOrNull(row.away_score_90) : null

  return Object.freeze({
    matchId: row.id,
    matchNumber: Number(row.match_number),
    status: row.status,
    resultStatus: row.result_status ?? 'pending',
    resultRevision: Number(row.result_revision ?? 0),
    normalTimeHomeGoals: homeScore,
    normalTimeAwayGoals: awayScore,
    afterExtraTimeHomeGoals: integerOrNull(row.home_score_aet),
    afterExtraTimeAwayGoals: integerOrNull(row.away_score_aet),
    penaltyHomeGoals: integerOrNull(row.home_penalties),
    penaltyAwayGoals: integerOrNull(row.away_penalties),
    decisionMethod: mapStoredDecisionMethod(row.result_method),
    winnerTeamId: row.winner_tournament_team_id ?? null,
    confirmed: row.status === 'completed' && row.result_status === 'confirmed',
    scoreVisible: homeScore != null && awayScore != null,
  })
}

function resultMap(rows) {
  if (!Array.isArray(rows)) throw new TypeError('resultRows must be an array')
  return new Map(rows.map(row => {
    const result = normaliseCanonicalResult(row)
    return [result.matchId, result]
  }))
}

export function buildLiveTournamentSnapshot({ reference, resultRows }) {
  if (!reference?.tournamentId) throw new TypeError('A Euro reference model is required')
  const byMatchId = resultMap(resultRows)

  const groupMatches = reference.groupMatches.map(match => {
    const result = byMatchId.get(match.matchId)
    return Object.freeze({
      ...match,
      context: RESOLVER_CONTEXT.LIVE,
      status: result?.status ?? match.status,
      homeScore: result?.scoreVisible ? result.normalTimeHomeGoals : null,
      awayScore: result?.scoreVisible ? result.normalTimeAwayGoals : null,
      resultStatus: result?.resultStatus ?? 'pending',
      resultRevision: result?.resultRevision ?? 0,
    })
  })

  const knockoutDecisions = reference.knockoutMatches
    .map(match => {
      const result = byMatchId.get(match.matchId)
      if (!result?.confirmed || !result.winnerTeamId) return null
      return Object.freeze({
        context: RESOLVER_CONTEXT.LIVE,
        matchNumber: match.matchNumber,
        advancingTeamId: result.winnerTeamId,
        decisionMethod: result.decisionMethod,
        resultRevision: result.resultRevision,
      })
    })
    .filter(Boolean)

  const resolved = resolveEuro28Tournament({
    context: RESOLVER_CONTEXT.LIVE,
    groups: reference.groups,
    groupMatches,
    knockoutDecisions,
  })

  const results = [...byMatchId.values()].sort((left, right) => left.matchNumber - right.matchNumber)
  return Object.freeze({
    context: RESOLVER_CONTEXT.LIVE,
    resolverVersion: resolved.resolverVersion,
    groups: resolved.groupTables,
    bestThird: resolved.bestThird,
    knockout: resolved.knockout,
    issues: Object.freeze(resolved.issues),
    results: Object.freeze(results),
    summary: Object.freeze({
      liveMatches: results.filter(result => ['live', 'paused'].includes(result.status)).length,
      confirmedMatches: results.filter(result => result.confirmed).length,
      pendingResults: results.filter(result => result.resultStatus === 'pending' && result.scoreVisible).length,
      manualReviewResults: results.filter(result => result.resultStatus === 'manual_review').length,
      resolvedKnockoutDecisions: knockoutDecisions.length,
    }),
  })
}

export function normaliseLeaderboard(rows, competitionKey) {
  if (!Object.values(RESULT_COMPETITION).includes(competitionKey)) {
    throw new TypeError('Unsupported leaderboard competition')
  }
  if (!Array.isArray(rows)) return Object.freeze([])

  return Object.freeze(rows.map(row => Object.freeze({
    rank: Number(row.rank),
    userId: row.user_id,
    displayName: row.display_name,
    matchPoints: Number(row.match_points ?? 0),
    bracketPoints: Number(row.bracket_points ?? 0),
    totalPoints: Number(row.total_points ?? 0),
    scoredMatchCount: Number(row.scored_match_count ?? 0),
    competitionKey,
  })))
}
