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

function team(reference, teamId) {
  return teamId ? reference?.teamsById?.[teamId] ?? null : null
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

// A followable invite link that opens the app straight into the join flow with the code applied.
// Built from an origin (the caller passes window.location.origin) so a future domain switch is free.
export function buildInviteLink(origin, joinCode) {
  return `${String(origin ?? '').replace(/\/+$/, '')}/#/leagues?join=${joinCode}`
}

// Normalise an inbound invite code (from the URL or a stashed pending join) to the canonical code, or
// null if it is not a valid 10-character code. This is the continuation's validation gate.
export function normaliseInboundJoinCode(raw) {
  if (!raw) return null
  const checked = validateJoinCode(raw)
  return checked.valid ? checked.value : null
}

export function validateLeagueCompetition(value) {
  if (!Object.values(LEAGUE_COMPETITION).includes(value)) {
    return Object.freeze({ valid: false, value: null, error: 'Choose Original Predictor or KO Predictor for this league.' })
  }
  return Object.freeze({ valid: true, value, error: null })
}

// KO Predictor leagues may only be created once the competition itself is usable. This mirrors
// the database gate in create_my_league (private.euro28_ko_predictor_early_access), which is the
// authoritative check -- this is the client-side copy for early validation and defense in depth,
// not the sole enforcement. Gated on earlyAccess (first real knockout fixture known), the same
// boundary KO Predictor itself opens on -- not the stricter primaryReady (full readiness/nav
// boundary) -- so a league can exist for a competition the moment players can actually use it.
export function canCreateKoLeague(koReadiness) {
  return Boolean(koReadiness?.earlyAccess)
}

export function normaliseLeague(row) {
  return Object.freeze({
    id: row.league_id,
    name: row.league_name,
    joinCode: row.join_code,
    competition: row.competition,
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

export function buildLeagueCompetitionSummary(rows, competitionKey, { leagueCompetition = null } = {}) {
  if (!Object.values(LEAGUE_COMPETITION).includes(competitionKey)) {
    throw new TypeError('Unsupported league competition')
  }
  if (leagueCompetition && leagueCompetition !== competitionKey) {
    throw new TypeError('Requested competition does not match this league\'s fixed competition')
  }

  const standings = Array.isArray(rows) ? rows : []
  const current = standings.find(row => row.isCurrentUser) ?? null
  const leader = standings[0] ?? null
  const hasScoring = standings.some(row => row.scoredMatchCount > 0 || row.totalPoints > 0)
  const currentPoints = current?.totalPoints ?? 0
  const leaderPoints = hasScoring ? leader?.totalPoints ?? 0 : 0
  const gapToLeader = hasScoring && current ? Math.max(leaderPoints - currentPoints, 0) : null

  return Object.freeze({
    competitionKey,
    memberCount: standings.length,
    currentRank: current?.rank ?? null,
    currentPoints,
    currentScoredMatchCount: current?.scoredMatchCount ?? 0,
    leaderName: hasScoring ? leader?.displayName ?? null : null,
    leaderPoints,
    gapToLeader,
    gapToLeaderLabel: gapToLeader === null ? null : gapToLeader === 0 ? 'You are leading' : `${gapToLeader} behind leader`,
    state: standings.length === 0 ? 'empty' : hasScoring ? 'active' : 'pre_competition',
  })
}

// Shared constant so audits can assert the constant name instead of freezing the sentence.
// Movement stays honest: no arrow is invented until an earlier table exists to compare against.
export const RANK_MOVEMENT_PENDING_REASON = 'Rank moves appear once an earlier table exists to compare against.'

function podiumLabel(rank) {
  if (rank === 1) return 'Top spot'
  if (rank === 2) return 'Top two'
  if (rank === 3) return 'Top three'
  return null
}

export function buildLeagueRaceRows(rows) {
  const standings = Array.isArray(rows) ? rows : []
  const leader = standings[0] ?? null
  const leaderPoints = numberOrZero(leader?.totalPoints)

  return freezeRows(standings.map((row, index) => {
    const rank = Number.isInteger(Number(row.rank)) && Number(row.rank) > 0 ? Number(row.rank) : index + 1
    const totalPoints = numberOrZero(row.totalPoints)
    const gapToLeader = Math.max(leaderPoints - totalPoints, 0)
    const podium = rank <= 3 ? `top-${rank}` : null

    return {
      ...row,
      rank,
      totalPoints,
      podium,
      podiumLabel: podiumLabel(rank),
      gapToLeader,
      gapToLeaderLabel: gapToLeader === 0 ? 'Leader' : `${gapToLeader} behind leader`,
      rankStoryLabel: row.isCurrentUser ? 'YOU' : podiumLabel(rank),
      rankMovementLabel: null,
      rankMovementReason: RANK_MOVEMENT_PENDING_REASON,
    }
  }))
}

export function buildLeagueLifecycleState({ lifecycle, competitionKey = LEAGUE_COMPETITION.ORIGINAL, summary, koReadiness } = {}) {
  if (!Object.values(LEAGUE_COMPETITION).includes(competitionKey)) {
    throw new TypeError('Unsupported league competition')
  }
  const originalActive = competitionKey === LEAGUE_COMPETITION.ORIGINAL && summary?.state === 'active'
  const koActive = competitionKey === LEAGUE_COMPETITION.KO_PREDICTOR && summary?.state === 'active'
  const locked = Boolean(lifecycle?.locked)
  // The application lifecycle's `locked` boundary is the first tournament kick-off.
  // Tests and scenario fixtures may still supply the older `tournamentStarted` alias.
  const tournamentStarted = Boolean(lifecycle?.tournamentStarted ?? lifecycle?.started ?? lifecycle?.locked)
  const koOpen = Boolean(koReadiness?.open)
  const koAvailable = Number(koReadiness?.available ?? 0)

  const originalState = !locked
    ? 'pre_lock'
    : originalActive
      ? 'scoring'
      : 'released'

  const koState = !koOpen
    ? 'waiting_for_knockout_fixtures'
    : koActive
      ? 'scoring'
      : 'fixture_release'

  return Object.freeze({
    locked,
    tournamentStarted,
    koReadiness: Object.freeze({
      open: koOpen,
      available: koAvailable,
      label: koReadiness?.label ?? 'KO Predictor opens when real fixtures are known',
    }),
    originalState,
    koState,
    headline: locked ? 'League tables are open under privacy rules' : 'League tables are warming up',
    originalCopy: originalState === 'pre_lock'
      ? 'Original Predictor tables stay private until the global prediction lock. Member comparisons will not expose scores or bracket picks early.'
      : originalState === 'scoring'
        ? 'Original Predictor standings are scoring from group and pre-tournament bracket selections only.'
        : 'Original Predictor selections are released, but points appear only after results are scored.',
    koCopy: koState === 'waiting_for_knockout_fixtures'
      ? 'KO Predictor tables remain separate and hidden until the shared KO-readiness signal confirms a real knockout fixture.'
      : koState === 'scoring'
        ? 'KO Predictor standings are scoring real knockout fixtures only.'
        : 'KO Predictor comparisons unlock fixture by fixture after each real knockout match starts.',
  })
}

export function buildLeagueCompetitionLifecycleCopy({ competitionKey, lifecycle, summary, koReadiness, leagueCompetition = null } = {}) {
  if (!Object.values(LEAGUE_COMPETITION).includes(competitionKey)) {
    throw new TypeError('Unsupported league competition')
  }
  if (leagueCompetition && leagueCompetition !== competitionKey) {
    throw new TypeError('Requested competition does not match this league\'s fixed competition')
  }

  if (competitionKey === LEAGUE_COMPETITION.ORIGINAL) {
    if (!lifecycle?.locked) {
      return Object.freeze({
        state: 'private_until_lock',
        label: 'Private until global lock',
        copy: 'Standings and comparisons remain hidden until the Original Predictor lock releases saved selections.',
      })
    }
    return Object.freeze({
      state: summary?.state === 'active' ? 'scoring' : 'released_waiting_results',
      label: summary?.state === 'active' ? 'Scoring live' : 'Released, waiting results',
      copy: summary?.state === 'active'
        ? 'Original points are from group predictions and the pre-tournament bracket only.'
        : 'Original selections are visible, but standings will move once official results are scored.',
    })
  }

  if (!koReadiness?.open) {
    return Object.freeze({
      state: 'waiting_for_knockout_fixtures',
      label: 'Waiting for real KO fixtures',
      copy: 'KO Predictor rows stay separate and hidden until the shared KO-readiness signal confirms a real knockout fixture.',
    })
  }

  return Object.freeze({
    state: summary?.state === 'active' ? 'scoring' : 'fixture_release',
    label: summary?.state === 'active' ? 'KO scoring live' : 'Fixture-by-fixture release',
    copy: summary?.state === 'active'
      ? 'KO points are from real knockout fixtures only. Original Predictor points are shown separately.'
      : 'KO selections release only for fixtures that have individually started.',
  })
}


export function buildStandingComparison(rows, otherUserId) {
  const standings = Array.isArray(rows) ? rows : []
  const current = standings.find(row => row.isCurrentUser) ?? null
  const other = standings.find(row => row.userId === otherUserId) ?? null

  const normalise = row => row ? Object.freeze({
    userId: row.userId,
    displayName: row.displayName,
    rank: row.rank,
    totalPoints: row.totalPoints,
    matchPoints: row.matchPoints,
    bracketPoints: row.bracketPoints,
    scoredMatchCount: row.scoredMatchCount,
  }) : null

  return Object.freeze({
    current: normalise(current),
    other: normalise(other),
  })
}

export function buildLeagueMemberList(rows) {
  const members = new Map()
  for (const row of rows ?? []) {
    members.set(row.userId, Object.freeze({
      userId: row.userId,
      displayName: row.displayName,
      memberRole: row.memberRole ?? 'member',
      isCurrentUser: Boolean(row.isCurrentUser),
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
    homeTeam: team(reference, homeTeamId),
    awayTeam: team(reference, awayTeamId),
    visibility,
    message,
    score: prediction ? scoreLabel(prediction) : null,
    advancingTeamId: prediction?.advancing_tournament_team_id ?? null,
    advancingTeamLabel: prediction?.advancing_tournament_team_id
      ? teamLabel(reference, prediction.advancing_tournament_team_id)
      : null,
    advancingTeam: team(reference, prediction?.advancing_tournament_team_id),
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
    homeTeam: team(reference, homeTeamId),
    awayTeam: team(reference, awayTeamId),
    advancingTeamId,
    advancingTeamLabel: advancingTeamId ? teamLabel(reference, advancingTeamId) : null,
    advancingTeam: team(reference, advancingTeamId),
    visibility,
    message,
  }
}

// `viewerIsOwner` marks the journey as the viewer reading back their own saved picks. Nothing
// is hidden from you about yourself: the pre-release gates below exist to stop players seeing
// each other's picks early, which is not a concern when the viewer and the player are the same.
export function buildSharedPredictionJourney({ bundle, reference, competitionKey, leagueCompetition = null, viewerIsOwner = false }) {
  if (!reference?.tournamentId) throw new TypeError('A Euro tournament reference is required')
  if (!Object.values(LEAGUE_COMPETITION).includes(competitionKey)) {
    throw new TypeError('Unsupported shared-prediction competition')
  }
  if (leagueCompetition && leagueCompetition !== competitionKey) {
    throw new TypeError('Requested competition does not match this league\'s fixed competition')
  }

  const matchPredictions = new Map((bundle?.match_predictions ?? []).map(row => [matchNumber(row), row]))
  const bracketPredictions = new Map((bundle?.bracket_predictions ?? []).map(row => [matchNumber(row), row]))

  if (competitionKey === LEAGUE_COMPETITION.ORIGINAL) {
    const privateMessage = bundle?.reason ?? 'Original predictions remain private until the tournament prediction lock.'
    const shared = viewerIsOwner || Boolean(bundle?.visible)
    const matches = reference.groupMatches.map(match => {
      const prediction = matchPredictions.get(match.matchNumber)
      const visibility = !shared ? 'private' : prediction ? 'visible' : 'not_saved'
      const message = visibility === 'private' ? privateMessage : visibility === 'not_saved' ? 'No saved prediction.' : null
      return buildMatchJourneyRow({ match, prediction, visibility, message, reference })
    })
    const bracket = reference.knockoutMatches.map(match => {
      const prediction = bracketPredictions.get(match.matchNumber)
      const visibility = !shared ? 'private' : prediction ? 'visible' : 'not_saved'
      const message = visibility === 'private' ? privateMessage : visibility === 'not_saved' ? 'No saved bracket selection.' : null
      return buildBracketJourneyRow({ match, prediction, visibility, message, reference })
    })

    const selections = [...matches, ...bracket]
    return Object.freeze({
      competitionKey,
      displayName: bundle?.display_name ?? 'Member',
      visible: shared,
      reason: shared ? null : bundle?.reason ?? null,
      releaseState: shared ? 'released_after_global_lock' : 'private_until_global_lock',
      releaseCopy: shared
        ? 'Original Predictor selections are released together after the global lock.'
        : 'Original Predictor selections stay private until the global prediction lock.',
      visibleMatchCount: matches.filter(row => row.visibility === 'visible').length,
      privateMatchCount: matches.filter(row => row.visibility === 'private').length,
      visibleSelectionCount: selections.filter(row => row.visibility === 'visible').length,
      privateSelectionCount: selections.filter(row => row.visibility === 'private').length,
      notSavedSelectionCount: selections.filter(row => row.visibility === 'not_saved').length,
      totalSelectionCount: selections.length,
      matches: freezeRows(matches),
      bracket: freezeRows(bracket),
    })
  }

  const matches = reference.knockoutMatches.map(match => {
    const prediction = matchPredictions.get(match.matchNumber)
    const definitelyStarted = STARTED_MATCH_STATUSES.has(match.status)
    const visibility = prediction ? 'visible' : (viewerIsOwner || definitelyStarted) ? 'not_saved' : 'private'
    const message = visibility === 'private'
      ? 'This selection becomes available after the fixture starts.'
      : visibility === 'not_saved'
        ? viewerIsOwner ? 'No saved prediction.' : 'No saved prediction was returned for this started fixture.'
        : null
    return buildMatchJourneyRow({ match, prediction, visibility, message, reference })
  })

  return Object.freeze({
    competitionKey,
    displayName: bundle?.display_name ?? 'Member',
    visible: viewerIsOwner || matches.some(row => row.visibility === 'visible'),
    reason: viewerIsOwner ? null : bundle?.reason ?? null,
    releaseState: matches.some(row => row.visibility === 'visible') ? 'fixture_release_started' : 'fixture_release_waiting',
    releaseCopy: 'KO Predictor selections release fixture by fixture after each real knockout match starts.',
    visibleMatchCount: matches.filter(row => row.visibility === 'visible').length,
    privateMatchCount: matches.filter(row => row.visibility === 'private').length,
    visibleSelectionCount: matches.filter(row => row.visibility === 'visible').length,
    privateSelectionCount: matches.filter(row => row.visibility === 'private').length,
    notSavedSelectionCount: matches.filter(row => row.visibility === 'not_saved').length,
    totalSelectionCount: matches.length,
    matches: freezeRows(matches),
    bracket: Object.freeze([]),
  })
}

export function compareSharedPredictionBundles(leftBundle, rightBundle, competitionKey, { leagueCompetition = null } = {}) {
  if (leagueCompetition && leagueCompetition !== competitionKey) {
    throw new TypeError('Requested competition does not match this league\'s fixed competition')
  }
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

/* The Live activity feed (full-redesign ruling 2026-07-18) is derived from the canonical
   official-result snapshot — real match events, never authored page copy. Member-level
   entries join when per-member scoring aggregates exist server-side. */
export function buildLeagueActivityEntries({ reference, snapshot, limit = 12 }) {
  const results = snapshot?.results ?? []
  const matches = [...(reference?.groupMatches ?? []), ...(reference?.knockoutMatches ?? [])]
  const matchByNumber = new Map(matches.map(match => [match.matchNumber, match]))
  const teamLabel = teamId => reference?.teamsById?.[teamId]?.label ?? 'TBC'
  const entries = results
    .filter(row => row.scoreVisible)
    .sort((left, right) => right.matchNumber - left.matchNumber)
    .slice(0, limit)
    .map(row => {
      const match = matchByNumber.get(row.matchNumber)
      const live = row.status === 'live'
      return Object.freeze({
        key: `match-${row.matchNumber}`,
        matchNumber: row.matchNumber,
        live,
        label: `${teamLabel(match?.homeTeamId)} ${row.normalTimeHomeGoals}–${row.normalTimeAwayGoals} ${teamLabel(match?.awayTeamId)}`,
        detail: live ? 'In play — live score' : row.resultStatus === 'confirmed' ? 'Full time — official result' : 'Score awaiting confirmation',
      })
    })
  return Object.freeze(entries)
}
