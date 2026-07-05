import { RESOLVER_CONTEXT, resolveEuro28Tournament } from '../resolver/index.js'

const SCORE_VISIBLE_STATUSES = new Set(['live', 'paused', 'completed'])
const SCORE_VISIBLE_RESULT_STATUSES = new Set(['pending', 'confirmed'])
const LIVE_STATUSES = new Set(['live', 'paused'])

export const RESULT_COMPETITION = Object.freeze({
  ORIGINAL: 'original',
  KO_PREDICTOR: 'ko_predictor',
})


const RESULT_LIFECYCLE_STATE = Object.freeze({
  PRE_TOURNAMENT: 'pre_tournament',
  LIVE: 'live',
  REVIEW: 'review',
  COMPLETED: 'completed',
  QUIET: 'quiet',
})

function summariseResultRows(liveSnapshot) {
  const results = liveSnapshot?.results ?? []
  return {
    liveMatches: results.filter(result => LIVE_STATUSES.has(result.status)).length,
    reviewMatches: results.filter(result => ['manual_review', 'pending'].includes(result.resultStatus) && result.scoreVisible).length,
    confirmedMatches: results.filter(result => result.confirmed).length,
  }
}

export function buildResultsLifecycle({ lifecycle, liveSnapshot }) {
  const summary = summariseResultRows(liveSnapshot)
  const started = Boolean(lifecycle?.started) || summary.liveMatches > 0 || summary.confirmedMatches > 0
  const complete = Boolean(liveSnapshot?.summary?.confirmedMatches >= 51)
  const state = summary.liveMatches > 0
    ? RESULT_LIFECYCLE_STATE.LIVE
    : summary.reviewMatches > 0
      ? RESULT_LIFECYCLE_STATE.REVIEW
      : complete
        ? RESULT_LIFECYCLE_STATE.COMPLETED
        : started
          ? RESULT_LIFECYCLE_STATE.QUIET
          : RESULT_LIFECYCLE_STATE.PRE_TOURNAMENT

  const copy = {
    [RESULT_LIFECYCLE_STATE.PRE_TOURNAMENT]: {
      tone: 'info',
      title: 'Results open when the tournament starts',
      body: 'Fixtures are ready, but scores, live tables and the live bracket stay quiet until official result records arrive.',
    },
    [RESULT_LIFECYCLE_STATE.LIVE]: {
      tone: 'danger',
      title: 'Live results are moving now',
      body: 'The feed, tables and Match Centre use official live records only. Predictions remain in their own competition contexts.',
    },
    [RESULT_LIFECYCLE_STATE.REVIEW]: {
      tone: 'warning',
      title: 'Some scores need confirmation or review',
      body: 'Visible scores remain separate from final scoring until the result status is confirmed or corrected by Admin.',
    },
    [RESULT_LIFECYCLE_STATE.COMPLETED]: {
      tone: 'safe',
      title: 'Tournament results are complete',
      body: 'All official results have been confirmed. Corrections still show their revision trail where applicable.',
    },
    [RESULT_LIFECYCLE_STATE.QUIET]: {
      tone: 'info',
      title: 'No match is live right now',
      body: 'Confirmed results remain visible and the next unresolved fixture stays available through Match Centre.',
    },
  }

  return Object.freeze({
    state,
    tone: copy[state].tone,
    title: copy[state].title,
    body: copy[state].body,
    liveMatches: summary.liveMatches,
    reviewMatches: summary.reviewMatches,
    confirmedMatches: summary.confirmedMatches,
  })
}

export function buildLeaderboardLifecycle({ competitionKey, lifecycle, leaderboardRows = [], points }) {
  if (!Object.values(RESULT_COMPETITION).includes(competitionKey)) throw new TypeError('Unsupported leaderboard competition')
  const isKo = competitionKey === RESULT_COMPETITION.KO_PREDICTOR
  const scoredRows = leaderboardRows.filter(row => Number(row.scoredMatchCount ?? 0) > 0 || Number(row.totalPoints ?? 0) > 0).length
  const hasScored = scoredRows > 0 || Number(points?.scoredMatchCount ?? 0) > 0 || Number(points?.totalPoints ?? 0) > 0
  const preStart = !lifecycle?.started && !hasScored
  const locked = Boolean(lifecycle?.locked)

  if (preStart) {
    return Object.freeze({
      tone: 'info',
      title: isKo ? 'KO leaderboard waits for real knockout fixtures' : 'Leaderboard waits for scored results',
      body: isKo ? 'The KO Predictor table remains empty until real knockout matches are known and scored.' : 'Original Predictor standings will start once official results produce points.',
      scoredRows,
      locked,
    })
  }
  if (!hasScored) {
    return Object.freeze({
      tone: 'warning',
      title: 'No points have been awarded yet',
      body: 'The table is visible, but scoring only appears after confirmed result records are processed.',
      scoredRows,
      locked,
    })
  }
  return Object.freeze({
    tone: 'safe',
    title: isKo ? 'KO Predictor standings are separate' : 'Original Predictor standings are live',
    body: isKo ? 'Only real knockout match predictions feed this table.' : 'Group scores and the original pre-tournament bracket feed this table.',
    scoredRows,
    locked,
  })
}

function freezeRows(rows) {
  return Object.freeze(rows.map(row => Object.freeze(row)))
}

function numberOrZero(value) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function teamLabel(reference, teamId, fallback = 'TBC') {
  if (!teamId) return fallback
  return reference?.teamsById?.[teamId]?.label
    ?? reference?.teamsById?.[teamId]?.slotCode
    ?? fallback
}

function stageLabelFromNumber(matchNumber) {
  if (matchNumber <= 36) return 'Group stage'
  if (matchNumber <= 44) return 'Round of 16'
  if (matchNumber <= 48) return 'Quarter-finals'
  if (matchNumber <= 50) return 'Semi-finals'
  return 'Final'
}


function liveSlotTeamId(source, candidateTeamId, liveSnapshot) {
  if (!source || !candidateTeamId) return null
  if (source.sourceType === 'group_position') {
    return liveSnapshot.groups?.[source.groupCode]?.completedMatchCount === 6 ? candidateTeamId : null
  }
  if (source.sourceType === 'best_third') {
    const groupsComplete = Object.values(liveSnapshot.groups ?? {}).every(table => table.completedMatchCount === 6)
    return groupsComplete ? candidateTeamId : null
  }
  if (source.sourceType === 'match_winner') {
    return liveSnapshot.knockout?.byMatchNumber?.[source.matchNumber]?.winnerTeamId ? candidateTeamId : null
  }
  return null
}

function liveParticipants(match, liveSnapshot) {
  return {
    homeTeamId: liveSlotTeamId(match.home, match.homeTeamId, liveSnapshot),
    awayTeamId: liveSlotTeamId(match.away, match.awayTeamId, liveSnapshot),
  }
}

function sourceLabel(source) {
  if (!source) return 'TBC'
  if (source.sourceType === 'group_position') return `${source.position}${source.groupCode}`
  if (source.sourceType === 'best_third') return 'Best third-place team'
  if (source.sourceType === 'match_winner') return `Winner of match ${source.matchNumber}`
  return 'TBC'
}

export function mapStoredDecisionMethod(value) {
  if (value === 'regulation') return 'normal_time'
  if (value === 'extra_time') return 'extra_time'
  if (value === 'penalties') return 'penalties'
  if (value === 'awarded') return 'administrative'
  return null
}

export function decisionMethodLabel(value) {
  if (value === 'normal_time' || value === 'regulation') return 'Normal time'
  if (value === 'extra_time') return 'Extra time'
  if (value === 'penalties') return 'Penalties'
  if (value === 'administrative' || value === 'awarded') return 'Administrative decision'
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
      liveMatches: results.filter(result => LIVE_STATUSES.has(result.status)).length,
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

function resultState(result, fallbackStatus) {
  if (result?.resultStatus === 'manual_review') return 'manual_review'
  if (LIVE_STATUSES.has(result?.status)) return 'live'
  if (result?.confirmed) return 'completed'
  if (result?.scoreVisible) return 'awaiting_confirmation'
  if (fallbackStatus === 'abandoned') return 'abandoned'
  return 'upcoming'
}

function scoreText(result) {
  if (!result?.scoreVisible) return null
  return `${result.normalTimeHomeGoals}–${result.normalTimeAwayGoals}`
}

function resultDetail(result, reference) {
  if (!result?.scoreVisible) return null
  if (result.decisionMethod === 'penalties' && result.penaltyHomeGoals != null && result.penaltyAwayGoals != null) {
    return `${decisionMethodLabel(result.decisionMethod)} ${result.penaltyHomeGoals}–${result.penaltyAwayGoals}`
  }
  if (result.decisionMethod === 'extra_time' && result.afterExtraTimeHomeGoals != null && result.afterExtraTimeAwayGoals != null) {
    return `${decisionMethodLabel(result.decisionMethod)} ${result.afterExtraTimeHomeGoals}–${result.afterExtraTimeAwayGoals}`
  }
  if (result.winnerTeamId && result.decisionMethod === 'administrative') {
    return `${teamLabel(reference, result.winnerTeamId)} advanced by administrative decision`
  }
  return decisionMethodLabel(result.decisionMethod)
}

export function buildCanonicalResultFeed({ reference, liveSnapshot }) {
  if (!reference?.tournamentId) throw new TypeError('A Euro reference model is required')
  if (!liveSnapshot) return Object.freeze({ rows: Object.freeze([]), sections: Object.freeze({}) })

  const resultById = new Map(liveSnapshot.results.map(result => [result.matchId, result]))
  const liveKnockoutByNumber = liveSnapshot.knockout?.byMatchNumber ?? {}
  const matches = [...reference.groupMatches, ...reference.knockoutMatches]

  const rows = matches.map(match => {
    const result = resultById.get(match.matchId) ?? null
    const resolvedKnockout = match.matchNumber > 36 ? liveKnockoutByNumber[match.matchNumber] : null
    const participants = resolvedKnockout ? liveParticipants(resolvedKnockout, liveSnapshot) : null
    const homeTeamId = match.matchNumber > 36 ? participants?.homeTeamId ?? null : match.homeTeamId
    const awayTeamId = match.matchNumber > 36 ? participants?.awayTeamId ?? null : match.awayTeamId
    const state = resultState(result, result?.status ?? match.status)

    return Object.freeze({
      matchId: match.matchId,
      matchNumber: match.matchNumber,
      stageLabel: match.groupCode ? `Group ${match.groupCode}` : stageLabelFromNumber(match.matchNumber),
      scheduledDate: match.scheduledDate ?? null,
      kickoffAt: match.kickoffAt ?? null,
      homeTeamId,
      awayTeamId,
      homeLabel: teamLabel(reference, homeTeamId),
      awayLabel: teamLabel(reference, awayTeamId),
      state,
      status: result?.status ?? match.status ?? 'scheduled',
      resultStatus: result?.resultStatus ?? 'pending',
      score: scoreText(result),
      detail: resultDetail(result, reference),
      resultRevision: result?.resultRevision ?? 0,
      corrected: Number(result?.resultRevision ?? 0) > 1,
    })
  })

  const sections = {
    live: freezeRows(rows.filter(row => row.state === 'live')),
    review: freezeRows(rows.filter(row => ['manual_review', 'awaiting_confirmation', 'abandoned'].includes(row.state))),
    completed: freezeRows(rows.filter(row => row.state === 'completed').sort((left, right) => right.matchNumber - left.matchNumber)),
    upcoming: freezeRows(rows.filter(row => row.state === 'upcoming')),
  }

  return Object.freeze({ rows: Object.freeze(rows), sections: Object.freeze(sections) })
}

export function buildLiveBracketRounds({ reference, liveSnapshot }) {
  if (!reference?.tournamentId) throw new TypeError('A Euro reference model is required')
  if (!liveSnapshot?.knockout?.matches) return Object.freeze([])

  const resultByNumber = new Map(liveSnapshot.results.map(result => [result.matchNumber, result]))
  const roundOrder = ['round_of_16', 'quarter_final', 'semi_final', 'final']
  const roundNames = {
    round_of_16: 'Round of 16',
    quarter_final: 'Quarter-finals',
    semi_final: 'Semi-finals',
    final: 'Final',
  }

  return Object.freeze(roundOrder.map(stage => Object.freeze({
    stage,
    label: roundNames[stage],
    matches: freezeRows(liveSnapshot.knockout.matches.filter(match => match.stage === stage).map(match => {
      const result = resultByNumber.get(match.matchNumber) ?? null
      const participants = liveParticipants(match, liveSnapshot)
      return {
        matchNumber: match.matchNumber,
        homeTeamId: participants.homeTeamId,
        awayTeamId: participants.awayTeamId,
        homeLabel: participants.homeTeamId ? teamLabel(reference, participants.homeTeamId) : sourceLabel(match.home),
        awayLabel: participants.awayTeamId ? teamLabel(reference, participants.awayTeamId) : sourceLabel(match.away),
        participantsResolved: Boolean(participants.homeTeamId && participants.awayTeamId),
        winnerTeamId: match.winnerTeamId,
        winnerLabel: match.winnerTeamId ? teamLabel(reference, match.winnerTeamId) : null,
        score: scoreText(result),
        detail: resultDetail(result, reference),
        resultRevision: result?.resultRevision ?? 0,
        corrected: Number(result?.resultRevision ?? 0) > 1,
      }
    })),
  })))
}

export function normalisePointsBreakdown(raw, competitionKey, reference) {
  if (!Object.values(RESULT_COMPETITION).includes(competitionKey)) {
    throw new TypeError('Unsupported points competition')
  }

  const matchById = new Map(
    [...(reference?.groupMatches ?? []), ...(reference?.knockoutMatches ?? [])]
      .map(match => [match.matchId, match]),
  )
  const source = raw ?? {}
  const matchRows = (source.match_breakdown ?? []).map(row => {
    const match = matchById.get(row.match_id)
    const exactScorePoints = numberOrZero(row.exact_score_points)
    const correctOutcomePoints = numberOrZero(row.correct_outcome_points)
    const advancingTeamPoints = numberOrZero(row.advancing_team_points)
    const decisionMethodPoints = numberOrZero(row.decision_method_points)
    const basePoints = exactScorePoints + correctOutcomePoints + advancingTeamPoints + decisionMethodPoints
    const totalPoints = numberOrZero(row.total_points)

    return {
      matchId: row.match_id,
      matchNumber: Number(row.match_number ?? match?.matchNumber ?? 0) || null,
      matchday: Number(row.matchday ?? 0) || null,
      scheduledDate: row.scheduled_date ?? match?.scheduledDate ?? null,
      stageCode: row.stage_code ?? null,
      stageLabel: match?.groupCode ? `Group ${match.groupCode}` : stageLabelFromNumber(Number(row.match_number ?? match?.matchNumber ?? 51)),
      exactScorePoints,
      correctOutcomePoints,
      advancingTeamPoints,
      decisionMethodPoints,
      basePoints,
      jokerMultiplier: numberOrZero(row.joker_multiplier) || 1,
      jokerBonus: Math.max(0, totalPoints - basePoints),
      totalPoints,
      resultRevision: numberOrZero(row.result_revision),
      corrected: numberOrZero(row.result_revision) > 1,
    }
  }).sort((left, right) => numberOrZero(left.matchNumber) - numberOrZero(right.matchNumber))

  const bracketRows = (source.bracket_breakdown ?? []).map(row => ({
    milestone: row.milestone,
    tournamentTeamId: row.tournament_team_id,
    teamLabel: teamLabel(reference, row.tournament_team_id),
    team: reference?.teamsById?.[row.tournament_team_id] ?? null,
    points: numberOrZero(row.points),
  }))

  const visible = source.visible !== false
  const state = source.state === 'protected'
    ? 'protected'
    : source.state === 'unscored'
      ? 'unscored'
      : raw
        ? 'scored'
        : 'unscored'

  return Object.freeze({
    competitionKey,
    memberUserId: source.member_user_id ?? null,
    displayName: source.display_name ?? null,
    visible,
    visibilityScope: source.visibility_scope ?? null,
    reason: source.reason ?? null,
    matchPoints: numberOrZero(source.match_points),
    bracketPoints: numberOrZero(source.bracket_points),
    totalPoints: numberOrZero(source.total_points),
    scoredMatchCount: numberOrZero(source.scored_match_count),
    state,
    correctedMatchCount: matchRows.filter(row => row.corrected).length,
    matchBreakdown: freezeRows(matchRows),
    bracketBreakdown: freezeRows(bracketRows),
  })
}
