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
      rankMovementReason: 'Rank movement waits for trustworthy previous-rank data.',
    }
  }))
}

export function buildLeagueRaceSummary(rows, competitionKey, { leagueCompetition = null } = {}) {
  if (!Object.values(LEAGUE_COMPETITION).includes(competitionKey)) {
    throw new TypeError('Unsupported league competition')
  }
  if (leagueCompetition && leagueCompetition !== competitionKey) {
    throw new TypeError('Requested competition does not match this league\'s fixed competition')
  }

  const raceRows = buildLeagueRaceRows(rows)
  const current = raceRows.find(row => row.isCurrentUser) ?? null
  const leader = raceRows[0] ?? null
  const hasRows = raceRows.length > 0
  const hasScoring = raceRows.some(row => row.scoredMatchCount > 0 || row.totalPoints > 0)
  const competitionLabel = competitionKey === LEAGUE_COMPETITION.ORIGINAL ? 'Original Predictor' : 'KO Predictor'

  if (!hasRows) {
    return Object.freeze({
      competitionKey,
      competitionLabel,
      state: 'empty',
      headline: 'No league members yet',
      currentLabel: 'Join or invite members',
      leaderLabel: 'No leader',
      gapLabel: 'Race starts when members appear',
      copy: `${competitionLabel} race summary will appear after this league has members.`,
      memberCount: 0,
      leaderName: null,
      leaderPoints: 0,
      currentRank: null,
      currentPoints: 0,
      gapToLeader: null,
    })
  }

  if (!hasScoring) {
    return Object.freeze({
      competitionKey,
      competitionLabel,
      state: 'pre_scoring',
      headline: `${competitionLabel} race has not started`,
      currentLabel: current ? `${formatOrdinal(current.rank)} before scoring` : 'Your row is not available yet',
      leaderLabel: 'No scored leader',
      gapLabel: 'No points scored yet',
      copy: 'The race summary will show the gap to the leader once official results create points.',
      memberCount: raceRows.length,
      leaderName: null,
      leaderPoints: 0,
      currentRank: current?.rank ?? null,
      currentPoints: current?.totalPoints ?? 0,
      gapToLeader: null,
    })
  }

  const gapToLeader = current ? current.gapToLeader : null
  const leading = current && gapToLeader === 0

  return Object.freeze({
    competitionKey,
    competitionLabel,
    state: current ? 'active' : 'active_without_current_user',
    headline: leading
      ? `You lead the ${competitionLabel} race`
      : current
        ? `You are ${current.gapToLeaderLabel}`
        : `${leader?.displayName ?? 'Leader'} leads the ${competitionLabel} race`,
    currentLabel: current
      ? `${formatOrdinal(current.rank)} · ${current.totalPoints} pts`
      : 'Your row is not available yet',
    leaderLabel: `${leader?.displayName ?? 'Leader'} · ${leader?.totalPoints ?? 0} pts`,
    gapLabel: current ? current.gapToLeaderLabel : 'Sign in row unavailable',
    copy: current
      ? 'The race summary shows the leader, your rank and the gap before the full table.'
      : 'The table is active, but your own row is not available yet.',
    memberCount: raceRows.length,
    leaderName: leader?.displayName ?? null,
    leaderPoints: leader?.totalPoints ?? 0,
    currentRank: current?.rank ?? null,
    currentPoints: current?.totalPoints ?? 0,
    gapToLeader,
  })
}

// NOTE: this still takes both an originalSummary and a koSummary for one league, which was the
// correct shape when a league could be viewed in either competition. Leagues are now fixed to a
// single competition at creation, so a real single-competition league only ever has meaningful
// data for one side of this pair going forward. This is deliberately left unchanged: the current
// caller (Leagues.jsx) still fetches and displays both sides for every league and is out of scope
// for this change -- reshaping this function now would break that caller before its own UI update
// lands. Simplifying this to take one summary (matching the league's fixed competition) is a
// natural follow-up once Leagues.jsx stops dual-fetching.
export function buildLeagueLifecycleState({ lifecycle, originalSummary, koSummary, koReadiness } = {}) {
  const originalActive = originalSummary?.state === 'active'
  const koActive = koSummary?.state === 'active'
  const locked = Boolean(lifecycle?.locked)
  const tournamentStarted = Boolean(lifecycle?.tournamentStarted)
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

// NOTE: same dual-competition shape as buildLeagueLifecycleState above, left unchanged for the
// same reason -- the current caller still merges both competitions' member lists for one league
// and is out of scope for this change.
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

export function buildSharedPredictionJourney({ bundle, reference, competitionKey, leagueCompetition = null }) {
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

    const selections = [...matches, ...bracket]
    return Object.freeze({
      competitionKey,
      displayName: bundle?.display_name ?? 'Member',
      visible: Boolean(bundle?.visible),
      reason: bundle?.reason ?? null,
      releaseState: bundle?.visible ? 'released_after_global_lock' : 'private_until_global_lock',
      releaseCopy: bundle?.visible
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
