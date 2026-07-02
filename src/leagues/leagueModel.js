export const LEAGUE_COMPETITION = Object.freeze({
  ORIGINAL: 'original',
  KO_PREDICTOR: 'ko_predictor',
})

const STARTED_MATCH_STATUSES = new Set(['live', 'paused', 'completed', 'abandoned'])

function freezeRows(rows) {
  return Object.freeze(rows.map(row => Object.freeze(row)))
}

function numberOrZero(value) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function matchNumber(row) {
  return Number(row?.match_number ?? 0)
}

function teamLabel(reference, teamId, fallback = 'TBC') {
  if (!teamId) return fallback
  return reference?.teamsById?.[teamId]?.label
    ?? reference?.teamsById?.[teamId]?.slotCode
    ?? fallback
}

function scoreLabel(row) {
  return `${numberOrZero(row.home_score_90)}–${numberOrZero(row.away_score_90)}`
}

function sameScore(left, right) {
  return Number(left.home_score_90) === Number(right.home_score_90)
    && Number(left.away_score_90) === Number(right.away_score_90)
}

function stageLabel(matchNumberValue) {
  if (matchNumberValue <= 36) return 'Group stage'
  if (matchNumberValue <= 44) return 'Round of 16'
  if (matchNumberValue <= 48) return 'Quarter-final'
  if (matchNumberValue <= 50) return 'Semi-final'
  return 'Final'
}

function decisionMethodLabel(value) {
  if (value === 'normal_time' || value === 'regulation') return 'Normal time'
  if (value === 'extra_time') return 'Extra time'
  if (value === 'penalties') return 'Penalties'
  return null
}


export function formatOrdinal(value) {
  const rank = Number(value)
  if (!Number.isInteger(rank) || rank < 1) return '—'
  const lastTwo = rank % 100
  if (lastTwo >= 11 && lastTwo <= 13) return `${rank}th`
  const suffix = rank % 10 === 1 ? 'st' : rank % 10 === 2 ? 'nd' : rank % 10 === 3 ? 'rd' : 'th'
  return `${rank}${suffix}`
}

export function validateLeagueName(value) {
  const normalised = String(value ?? '').trim().replace(/\s+/g, ' ')
  if (normalised.length < 3 || normalised.length > 40) {
    return Object.freeze({ valid: false, value: normalised, error: 'League name must be between 3 and 40 characters.' })
  }
  if (!/^[\p{L}\p{N}][\p{L}\p{N} ._'&-]*[\p{L}\p{N}]$/u.test(normalised)) {
    return Object.freeze({ valid: false, value: normalised, error: 'League name contains unsupported characters.' })
  }
  return Object.freeze({ valid: true, value: normalised, error: null })
}

export function validateJoinCode(value) {
  const normalised = String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!/^[A-Z0-9]{10}$/.test(normalised)) {
    return Object.freeze({ valid: false, value: normalised, error: 'Enter the 10-character league code.' })
  }
  return Object.freeze({ valid: true, value: normalised, error: null })
}

export function normaliseLeague(row) {
  return Object.freeze({
    id: row.league_id,
    name: row.league_name,
    joinCode: row.join_code,
    memberRole: row.member_role,
    memberCount: Number(row.member_count ?? 0),
    createdAt: row.created_at ?? null,
  })
}

export function normaliseStanding(row) {
  return Object.freeze({
    rank: Number(row.rank ?? 0),
    userId: row.user_id,
    displayName: row.display_name,
    memberRole: row.member_role,
    matchPoints: numberOrZero(row.match_points),
    bracketPoints: numberOrZero(row.bracket_points),
    totalPoints: numberOrZero(row.total_points),
    scoredMatchCount: numberOrZero(row.scored_match_count),
    isCurrentUser: Boolean(row.is_current_user),
  })
}

export function buildLeagueCompetitionSummary(rows, competitionKey) {
  if (!Object.values(LEAGUE_COMPETITION).includes(competitionKey)) {
    throw new TypeError('Unsupported league competition')
  }

  const standings = Array.isArray(rows) ? rows : []
  const current = standings.find(row => row.isCurrentUser) ?? null
  const leader = standings[0] ?? null
  const hasScoring = standings.some(row => row.scoredMatchCount > 0 || row.totalPoints > 0)

  return Object.freeze({
    competitionKey,
    memberCount: standings.length,
    currentRank: current?.rank ?? null,
    currentPoints: current?.totalPoints ?? 0,
    currentScoredMatchCount: current?.scoredMatchCount ?? 0,
    leaderName: hasScoring ? leader?.displayName ?? null : null,
    leaderPoints: hasScoring ? leader?.totalPoints ?? 0 : 0,
    state: standings.length === 0 ? 'empty' : hasScoring ? 'active' : 'pre_competition',
  })
}

export function buildSharedLeagueMemberList(originalRows, koRows) {
  const members = new Map()
  for (const row of [...(originalRows ?? []), ...(koRows ?? [])]) {
    const existing = members.get(row.userId)
    members.set(row.userId, Object.freeze({
      userId: row.userId,
      displayName: row.displayName,
      memberRole: row.memberRole ?? existing?.memberRole ?? 'member',
      isCurrentUser: Boolean(row.isCurrentUser || existing?.isCurrentUser),
    }))
  }
  return freezeRows([...members.values()].sort((left, right) => left.displayName.localeCompare(right.displayName, 'en-GB')))
}

function buildMatchJourneyRow({ match, prediction, visibility, message, reference }) {
  const homeTeamId = prediction?.predicted_home_tournament_team_id ?? match.homeTeamId ?? null
  const awayTeamId = prediction?.predicted_away_tournament_team_id ?? match.awayTeamId ?? null
  const number = Number(match.matchNumber)

  return {
    kind: 'match',
    matchId: match.matchId,
    matchNumber: number,
    stageLabel: match.groupCode ? `Group ${match.groupCode}` : stageLabel(number),
    homeTeamId,
    awayTeamId,
    homeLabel: teamLabel(reference, homeTeamId),
    awayLabel: teamLabel(reference, awayTeamId),
    visibility,
    message,
    score: prediction ? scoreLabel(prediction) : null,
    advancingTeamId: prediction?.advancing_tournament_team_id ?? null,
    advancingTeamLabel: prediction?.advancing_tournament_team_id
      ? teamLabel(reference, prediction.advancing_tournament_team_id)
      : null,
    decisionMethod: prediction?.decision_method ?? null,
    decisionMethodLabel: decisionMethodLabel(prediction?.decision_method),
    jokerApplied: Boolean(prediction?.joker_applied),
  }
}

function buildBracketJourneyRow({ match, prediction, visibility, message, reference }) {
  const number = Number(match.matchNumber)
  const homeTeamId = prediction?.predicted_home_tournament_team_id ?? null
  const awayTeamId = prediction?.predicted_away_tournament_team_id ?? null
  const advancingTeamId = prediction?.advancing_tournament_team_id ?? null

  return {
    kind: 'bracket',
    matchId: match.matchId,
    matchNumber: number,
    stageLabel: stageLabel(number),
    homeTeamId,
    awayTeamId,
    homeLabel: teamLabel(reference, homeTeamId),
    awayLabel: teamLabel(reference, awayTeamId),
    advancingTeamId,
    advancingTeamLabel: advancingTeamId ? teamLabel(reference, advancingTeamId) : null,
    visibility,
    message,
  }
}

export function buildSharedPredictionJourney({ bundle, reference, competitionKey }) {
  if (!reference?.tournamentId) throw new TypeError('A Euro tournament reference is required')
  if (!Object.values(LEAGUE_COMPETITION).includes(competitionKey)) {
    throw new TypeError('Unsupported shared-prediction competition')
  }

  const matchPredictions = new Map((bundle?.match_predictions ?? []).map(row => [matchNumber(row), row]))
  const bracketPredictions = new Map((bundle?.bracket_predictions ?? []).map(row => [matchNumber(row), row]))

  if (competitionKey === LEAGUE_COMPETITION.ORIGINAL) {
    const privateMessage = bundle?.reason ?? 'Original predictions remain private until the tournament prediction lock.'
    const matches = reference.groupMatches.map(match => {
      const prediction = matchPredictions.get(match.matchNumber)
      const visibility = !bundle?.visible ? 'private' : prediction ? 'visible' : 'not_saved'
      const message = visibility === 'private' ? privateMessage : visibility === 'not_saved' ? 'No saved prediction.' : null
      return buildMatchJourneyRow({ match, prediction, visibility, message, reference })
    })
    const bracket = reference.knockoutMatches.map(match => {
      const prediction = bracketPredictions.get(match.matchNumber)
      const visibility = !bundle?.visible ? 'private' : prediction ? 'visible' : 'not_saved'
      const message = visibility === 'private' ? privateMessage : visibility === 'not_saved' ? 'No saved bracket selection.' : null
      return buildBracketJourneyRow({ match, prediction, visibility, message, reference })
    })

    return Object.freeze({
      competitionKey,
      displayName: bundle?.display_name ?? 'Member',
      visible: Boolean(bundle?.visible),
      reason: bundle?.reason ?? null,
      visibleMatchCount: matches.filter(row => row.visibility === 'visible').length,
      privateMatchCount: matches.filter(row => row.visibility === 'private').length,
      matches: freezeRows(matches),
      bracket: freezeRows(bracket),
    })
  }

  const matches = reference.knockoutMatches.map(match => {
    const prediction = matchPredictions.get(match.matchNumber)
    const definitelyStarted = STARTED_MATCH_STATUSES.has(match.status)
    const visibility = prediction ? 'visible' : definitelyStarted ? 'not_saved' : 'private'
    const message = visibility === 'private'
      ? 'This selection becomes available after the fixture starts.'
      : visibility === 'not_saved'
        ? 'No saved prediction was returned for this started fixture.'
        : null
    return buildMatchJourneyRow({ match, prediction, visibility, message, reference })
  })

  return Object.freeze({
    competitionKey,
    displayName: bundle?.display_name ?? 'Member',
    visible: matches.some(row => row.visibility === 'visible'),
    reason: bundle?.reason ?? null,
    visibleMatchCount: matches.filter(row => row.visibility === 'visible').length,
    privateMatchCount: matches.filter(row => row.visibility === 'private').length,
    matches: freezeRows(matches),
    bracket: Object.freeze([]),
  })
}

export function compareSharedPredictionBundles(leftBundle, rightBundle, competitionKey) {
  if (!leftBundle?.visible || !rightBundle?.visible) {
    return Object.freeze({
      visible: false,
      reason: leftBundle?.reason || rightBundle?.reason || 'Predictions are not visible yet.',
      comparedMatches: 0,
      exactScoreMatches: 0,
      advancingTeamMatches: 0,
      methodMatches: 0,
      bracketMatches: 0,
      rows: [],
    })
  }

  const leftMatches = new Map((leftBundle.match_predictions ?? []).map(row => [matchNumber(row), row]))
  const rightMatches = new Map((rightBundle.match_predictions ?? []).map(row => [matchNumber(row), row]))
  const sharedMatchNumbers = [...leftMatches.keys()].filter(number => rightMatches.has(number)).sort((a, b) => a - b)

  let exactScoreMatches = 0
  let advancingTeamMatches = 0
  let methodMatches = 0

  const rows = sharedMatchNumbers.map(number => {
    const left = leftMatches.get(number)
    const right = rightMatches.get(number)
    const scoreSame = sameScore(left, right)
    const advancingSame = Boolean(left.advancing_tournament_team_id)
      && left.advancing_tournament_team_id === right.advancing_tournament_team_id
    const methodSame = Boolean(left.decision_method)
      && left.decision_method === right.decision_method

    if (scoreSame) exactScoreMatches += 1
    if (advancingSame) advancingTeamMatches += 1
    if (methodSame) methodMatches += 1

    return Object.freeze({
      matchNumber: number,
      leftScore: scoreLabel(left),
      rightScore: scoreLabel(right),
      scoreSame,
      advancingSame,
      methodSame,
      leftAdvancingTeamId: left.advancing_tournament_team_id ?? null,
      rightAdvancingTeamId: right.advancing_tournament_team_id ?? null,
      leftDecisionMethod: left.decision_method ?? null,
      rightDecisionMethod: right.decision_method ?? null,
      leftJoker: Boolean(left.joker_applied),
      rightJoker: Boolean(right.joker_applied),
    })
  })

  let bracketMatches = 0
  if (competitionKey === LEAGUE_COMPETITION.ORIGINAL) {
    const leftBracket = new Map((leftBundle.bracket_predictions ?? []).map(row => [matchNumber(row), row]))
    const rightBracket = new Map((rightBundle.bracket_predictions ?? []).map(row => [matchNumber(row), row]))
    bracketMatches = [...leftBracket.keys()].filter(number => (
      rightBracket.has(number)
      && leftBracket.get(number).advancing_tournament_team_id === rightBracket.get(number).advancing_tournament_team_id
    )).length
  }

  return Object.freeze({
    visible: true,
    reason: null,
    comparedMatches: rows.length,
    exactScoreMatches,
    advancingTeamMatches,
    methodMatches,
    bracketMatches,
    rows: Object.freeze(rows),
  })
}
