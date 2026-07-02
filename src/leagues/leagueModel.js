export const LEAGUE_COMPETITION = Object.freeze({
  ORIGINAL: 'original',
  KO_PREDICTOR: 'ko_predictor',
})

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
    matchPoints: Number(row.match_points ?? 0),
    bracketPoints: Number(row.bracket_points ?? 0),
    totalPoints: Number(row.total_points ?? 0),
    scoredMatchCount: Number(row.scored_match_count ?? 0),
    isCurrentUser: Boolean(row.is_current_user),
  })
}

function matchNumber(row) {
  return Number(row?.match_number ?? 0)
}

function scoreLabel(row) {
  return `${Number(row.home_score_90 ?? 0)}–${Number(row.away_score_90 ?? 0)}`
}

function sameScore(left, right) {
  return Number(left.home_score_90) === Number(right.home_score_90)
    && Number(left.away_score_90) === Number(right.away_score_90)
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
