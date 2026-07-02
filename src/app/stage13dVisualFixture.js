import { RESOLVER_CONTEXT, resolveEuro28Tournament } from '../resolver/index.js'
import { VISUAL_FOUNDATION, VISUAL_GROUP_REFERENCE } from './visualFixture.js'

const CURRENT_USER_ID = 'visual-user'
export const STAGE13D_VISUAL_SCENARIO = Object.freeze({
  ACTIVE: 'active',
  PRIVACY: 'privacy',
  PARTIAL: 'partial',
})

const MEMBER_NAMES = Object.freeze([
  [CURRENT_USER_ID, 'Nicky'],
  ['visual-member-2', 'Amy'],
  ['visual-member-3', 'Brian'],
  ['visual-member-4', 'Callum'],
  ['visual-member-5', 'Chloe'],
  ['visual-member-6', 'Daniel'],
  ['visual-member-7', 'Emma'],
  ['visual-member-8', 'Fraser'],
  ['visual-member-9', 'Grace'],
  ['visual-member-10', 'Jamie'],
  ['visual-member-11', 'Lewis'],
  ['visual-member-12', 'Megan'],
])

const GROUP_SCORE_PATTERNS = Object.freeze([
  [2, 0],
  [1, 1],
  [0, 1],
  [3, 1],
  [2, 2],
  [1, 0],
])

function groupResultRow(match) {
  const [homeScore, awayScore] = GROUP_SCORE_PATTERNS[(match.matchNumber - 1) % GROUP_SCORE_PATTERNS.length]
  return Object.freeze({
    id: match.matchId,
    match_number: match.matchNumber,
    status: 'completed',
    result_status: 'confirmed',
    result_revision: match.matchNumber === 4 ? 2 : 1,
    home_score_90: homeScore,
    away_score_90: awayScore,
    home_score_aet: null,
    away_score_aet: null,
    home_penalties: null,
    away_penalties: null,
    result_method: 'regulation',
    winner_tournament_team_id: homeScore === awayScore
      ? null
      : homeScore > awayScore ? match.homeTeamId : match.awayTeamId,
  })
}

const GROUP_RESULT_ROWS = Object.freeze(VISUAL_GROUP_REFERENCE.groupMatches.map(groupResultRow))
const RESOLVED_GROUP_MATCHES = Object.freeze(VISUAL_GROUP_REFERENCE.groupMatches.map((match, index) => Object.freeze({
  ...match,
  context: RESOLVER_CONTEXT.LIVE,
  status: 'completed',
  resultStatus: 'confirmed',
  homeScore: GROUP_RESULT_ROWS[index].home_score_90,
  awayScore: GROUP_RESULT_ROWS[index].away_score_90,
})))

const GROUP_RESOLUTION = resolveEuro28Tournament({
  context: RESOLVER_CONTEXT.LIVE,
  groups: VISUAL_GROUP_REFERENCE.groups,
  groupMatches: RESOLVED_GROUP_MATCHES,
  knockoutDecisions: [],
})

function resolvedRoundOf16Pairing(matchNumber) {
  const match = GROUP_RESOLUTION.knockout.byMatchNumber[matchNumber]
  return Object.freeze({
    homeTeamId: match?.homeTeamId ?? null,
    awayTeamId: match?.awayTeamId ?? null,
  })
}

const KO_VISUAL_STATES = Object.freeze({
  37: Object.freeze({ status: 'completed', resultStatus: 'confirmed' }),
  38: Object.freeze({ status: 'completed', resultStatus: 'confirmed' }),
  39: Object.freeze({ status: 'live', resultStatus: 'pending' }),
  40: Object.freeze({ status: 'completed', resultStatus: 'manual_review' }),
  41: Object.freeze({ status: 'completed', resultStatus: 'confirmed' }),
})

const STAGE13D_KNOCKOUT_MATCHES = Object.freeze(Array.from({ length: 15 }, (_, index) => {
  const matchNumber = 37 + index
  const pairing = matchNumber <= 44 ? resolvedRoundOf16Pairing(matchNumber) : { homeTeamId: null, awayTeamId: null }
  const state = KO_VISUAL_STATES[matchNumber] ?? { status: 'scheduled', resultStatus: 'pending' }
  return Object.freeze({
    matchId: `visual-match-${matchNumber}`,
    matchNumber,
    fixtureCode: `VISUAL-KO-${matchNumber}`,
    scheduledDate: matchNumber <= 44 ? `2028-06-${String(23 + (matchNumber - 37)).padStart(2, '0')}` : null,
    kickoffAt: null,
    status: state.status,
    resultStatus: state.resultStatus,
    homeTeamId: pairing.homeTeamId,
    awayTeamId: pairing.awayTeamId,
    participantsResolved: Boolean(pairing.homeTeamId && pairing.awayTeamId),
  })
}))

export const VISUAL_STAGE13D_REFERENCE = Object.freeze({
  ...VISUAL_GROUP_REFERENCE,
  referenceVersion: 'visual-stage13d-live',
  scheduleVersion: 'visual-stage13d-live',
  context: RESOLVER_CONTEXT.LIVE,
  groupMatches: RESOLVED_GROUP_MATCHES,
  knockoutMatches: STAGE13D_KNOCKOUT_MATCHES,
  knockoutMatchNumbers: Object.freeze(STAGE13D_KNOCKOUT_MATCHES.map(match => match.matchNumber)),
})

function knockoutResultRow(matchNumber, configuration = {}) {
  const match = VISUAL_STAGE13D_REFERENCE.knockoutMatches.find(candidate => candidate.matchNumber === matchNumber)
  const homeScore = configuration.homeScore ?? null
  const awayScore = configuration.awayScore ?? null
  const winnerSide = configuration.winnerSide ?? null
  const winnerTeamId = winnerSide === 'home' ? match?.homeTeamId : winnerSide === 'away' ? match?.awayTeamId : null
  return Object.freeze({
    id: match?.matchId,
    match_number: matchNumber,
    status: configuration.status ?? match?.status ?? 'scheduled',
    result_status: configuration.resultStatus ?? match?.resultStatus ?? 'pending',
    result_revision: configuration.resultRevision ?? 0,
    home_score_90: homeScore,
    away_score_90: awayScore,
    home_score_aet: configuration.homeScoreAet ?? null,
    away_score_aet: configuration.awayScoreAet ?? null,
    home_penalties: configuration.homePenalties ?? null,
    away_penalties: configuration.awayPenalties ?? null,
    result_method: configuration.resultMethod ?? null,
    winner_tournament_team_id: winnerTeamId,
  })
}

const KO_RESULT_OVERRIDES = new Map([
  [37, knockoutResultRow(37, { status: 'completed', resultStatus: 'confirmed', resultRevision: 1, homeScore: 2, awayScore: 0, resultMethod: 'regulation', winnerSide: 'home' })],
  [38, knockoutResultRow(38, { status: 'completed', resultStatus: 'confirmed', resultRevision: 1, homeScore: 1, awayScore: 1, homeScoreAet: 1, awayScoreAet: 1, homePenalties: 4, awayPenalties: 3, resultMethod: 'penalties', winnerSide: 'home' })],
  [39, knockoutResultRow(39, { status: 'live', resultStatus: 'pending', resultRevision: 0, homeScore: 1, awayScore: 0 })],
  [40, knockoutResultRow(40, { status: 'completed', resultStatus: 'manual_review', resultRevision: 1, homeScore: 2, awayScore: 2 })],
  [41, knockoutResultRow(41, { status: 'completed', resultStatus: 'confirmed', resultRevision: 2, homeScore: 0, awayScore: 1, resultMethod: 'regulation', winnerSide: 'away' })],
])

export const VISUAL_STAGE13D_RESULT_ROWS = Object.freeze([
  ...GROUP_RESULT_ROWS,
  ...VISUAL_STAGE13D_REFERENCE.knockoutMatches.map(match => (
    KO_RESULT_OVERRIDES.get(match.matchNumber) ?? knockoutResultRow(match.matchNumber)
  )),
])

export const VISUAL_STAGE13D_FOUNDATION = Object.freeze({
  ...VISUAL_FOUNDATION,
  tournament: Object.freeze({
    ...VISUAL_FOUNDATION.tournament,
    prediction_locked_at: '2028-06-09T19:00:00.000Z',
  }),
  guestReference: VISUAL_STAGE13D_REFERENCE,
})

const LEAGUES = Object.freeze([
  Object.freeze({
    league_id: 'visual-league-family',
    league_name: 'Jimmy Dynasty',
    join_code: 'JIMMY2028A',
    member_role: 'owner',
    member_count: MEMBER_NAMES.length,
    created_at: '2028-01-18T12:00:00.000Z',
  }),
  Object.freeze({
    league_id: 'visual-league-work',
    league_name: 'Office Predictor',
    join_code: 'OFFICE28UK',
    member_role: 'member',
    member_count: 8,
    created_at: '2028-02-03T09:30:00.000Z',
  }),
])

const ORIGINAL_POINT_TOTALS = Object.freeze([156, 174, 168, 151, 146, 140, 136, 128, 122, 115, 108, 101])
const ORIGINAL_BRACKET_TOTALS = Object.freeze([46, 54, 48, 41, 36, 40, 31, 38, 32, 25, 28, 21])
const KO_POINT_TOTALS = Object.freeze([65, 80, 70, 85, 55, 50, 45, 40, 35, 30, 25, 20])

function rankRows(totals) {
  return MEMBER_NAMES
    .map(([userId, displayName], index) => ({ userId, displayName, index, totalPoints: totals[index] }))
    .sort((left, right) => right.totalPoints - left.totalPoints || left.displayName.localeCompare(right.displayName, 'en-GB'))
    .map((row, index) => Object.freeze({ ...row, rank: index + 1 }))
}

function rawLeagueStandingRows(competitionKey) {
  const isOriginal = competitionKey === 'original'
  const ranked = rankRows(isOriginal ? ORIGINAL_POINT_TOTALS : KO_POINT_TOTALS)
  return Object.freeze(ranked.map(row => Object.freeze({
    rank: row.rank,
    user_id: row.userId,
    display_name: row.displayName,
    member_role: row.userId === CURRENT_USER_ID ? 'owner' : 'member',
    match_points: isOriginal ? row.totalPoints - ORIGINAL_BRACKET_TOTALS[row.index] : row.totalPoints,
    bracket_points: isOriginal ? ORIGINAL_BRACKET_TOTALS[row.index] : 0,
    total_points: row.totalPoints,
    scored_match_count: isOriginal ? 36 : 5,
    is_current_user: row.userId === CURRENT_USER_ID,
  })))
}

const ORIGINAL_STANDINGS = rawLeagueStandingRows('original')
const KO_STANDINGS = rawLeagueStandingRows('ko_predictor')

function predictionVariant(userId) {
  const position = MEMBER_NAMES.findIndex(([candidate]) => candidate === userId)
  return position < 0 ? 0 : position
}

function originalBundle(userId) {
  const variant = predictionVariant(userId)
  const displayName = MEMBER_NAMES.find(([candidate]) => candidate === userId)?.[1] ?? 'Member'
  const teamIds = Object.keys(VISUAL_STAGE13D_REFERENCE.teamsById)
  return Object.freeze({
    visible: true,
    reason: null,
    display_name: displayName,
    match_predictions: Object.freeze(VISUAL_STAGE13D_REFERENCE.groupMatches.map(match => Object.freeze({
      match_number: match.matchNumber,
      predicted_home_tournament_team_id: match.homeTeamId,
      predicted_away_tournament_team_id: match.awayTeamId,
      home_score_90: (match.matchNumber + variant) % 4,
      away_score_90: (match.matchNumber + variant + 1) % 3,
      joker_applied: [3, 10, 18, 25, 33].includes(match.matchNumber + (variant % 2)),
    }))),
    bracket_predictions: Object.freeze(VISUAL_STAGE13D_REFERENCE.knockoutMatches.map((match, index) => Object.freeze({
      match_number: match.matchNumber,
      predicted_home_tournament_team_id: teamIds[(index * 2 + variant) % teamIds.length],
      predicted_away_tournament_team_id: teamIds[(index * 2 + variant + 1) % teamIds.length],
      advancing_tournament_team_id: teamIds[(index * 2 + variant) % teamIds.length],
    }))),
  })
}

function koBundle(userId) {
  const variant = predictionVariant(userId)
  const displayName = MEMBER_NAMES.find(([candidate]) => candidate === userId)?.[1] ?? 'Member'
  const startedMatches = VISUAL_STAGE13D_REFERENCE.knockoutMatches.filter(match => ['live', 'paused', 'completed', 'abandoned'].includes(match.status))
  return Object.freeze({
    visible: true,
    reason: null,
    display_name: displayName,
    match_predictions: Object.freeze(startedMatches.map((match, index) => {
      const draw = (index + variant) % 3 === 0
      const homeScore = draw ? 1 : (index + variant) % 3
      const awayScore = draw ? 1 : (index + variant + 1) % 2
      const advancingTeamId = (index + variant) % 2 === 0 ? match.homeTeamId : match.awayTeamId
      return Object.freeze({
        match_number: match.matchNumber,
        predicted_home_tournament_team_id: match.homeTeamId,
        predicted_away_tournament_team_id: match.awayTeamId,
        home_score_90: homeScore,
        away_score_90: awayScore,
        advancing_tournament_team_id: advancingTeamId,
        decision_method: draw ? ((index + variant) % 2 === 0 ? 'extra_time' : 'penalties') : 'normal_time',
        joker_applied: index === variant % startedMatches.length,
      })
    })),
    bracket_predictions: Object.freeze([]),
  })
}

const ORIGINAL_POINTS = Object.freeze({
  match_points: 110,
  bracket_points: 46,
  total_points: 156,
  scored_match_count: 36,
  match_breakdown: Object.freeze([
    Object.freeze({ match_id: 'visual-match-1', exact_score_points: 30, correct_outcome_points: 0, advancing_team_points: 0, decision_method_points: 0, joker_multiplier: 2, total_points: 60, result_revision: 1 }),
    Object.freeze({ match_id: 'visual-match-2', exact_score_points: 0, correct_outcome_points: 10, advancing_team_points: 0, decision_method_points: 0, joker_multiplier: 1, total_points: 10, result_revision: 1 }),
    Object.freeze({ match_id: 'visual-match-3', exact_score_points: 30, correct_outcome_points: 0, advancing_team_points: 0, decision_method_points: 0, joker_multiplier: 1, total_points: 30, result_revision: 1 }),
    Object.freeze({ match_id: 'visual-match-4', exact_score_points: 0, correct_outcome_points: 10, advancing_team_points: 0, decision_method_points: 0, joker_multiplier: 1, total_points: 10, result_revision: 2 }),
  ]),
  bracket_breakdown: Object.freeze([
    Object.freeze({ milestone: 'round_of_16', tournament_team_id: 'visual-team-1', points: 8 }),
    Object.freeze({ milestone: 'quarter_final', tournament_team_id: 'visual-team-5', points: 12 }),
    Object.freeze({ milestone: 'semi_final', tournament_team_id: 'visual-team-9', points: 16 }),
    Object.freeze({ milestone: 'final', tournament_team_id: 'visual-team-13', points: 10 }),
  ]),
})

const KO_POINTS = Object.freeze({
  match_points: 65,
  bracket_points: 0,
  total_points: 65,
  scored_match_count: 5,
  match_breakdown: Object.freeze([
    Object.freeze({ match_id: 'visual-match-37', exact_score_points: 30, correct_outcome_points: 0, advancing_team_points: 10, decision_method_points: 5, joker_multiplier: 1, total_points: 45, result_revision: 1 }),
    Object.freeze({ match_id: 'visual-match-38', exact_score_points: 0, correct_outcome_points: 10, advancing_team_points: 10, decision_method_points: 5, joker_multiplier: 1, total_points: 25, result_revision: 1 }),
    Object.freeze({ match_id: 'visual-match-41', exact_score_points: 0, correct_outcome_points: 0, advancing_team_points: 0, decision_method_points: 0, joker_multiplier: 1, total_points: 0, result_revision: 2 }),
  ]),
  bracket_breakdown: Object.freeze([]),
})

function response(data, error = null) {
  return Promise.resolve({ data, error })
}

function privateOriginalBundle(userId) {
  const displayName = MEMBER_NAMES.find(([candidate]) => candidate === userId)?.[1] ?? 'Member'
  return Object.freeze({
    visible: false,
    reason: 'Original predictions remain private until the global tournament lock.',
    display_name: displayName,
    match_predictions: Object.freeze([]),
    bracket_predictions: Object.freeze([]),
  })
}

function sharedBundleFor(userId, competitionKey, scenario) {
  if (competitionKey === 'original' && scenario === STAGE13D_VISUAL_SCENARIO.PRIVACY) {
    return privateOriginalBundle(userId)
  }
  return competitionKey === 'original' ? originalBundle(userId) : koBundle(userId)
}


function visualTeamProfile(teamId, scenario) {
  const team = VISUAL_STAGE13D_REFERENCE.teamsById[teamId] ?? Object.values(VISUAL_STAGE13D_REFERENCE.teamsById)[0]
  const aggregatesVisible = scenario !== STAGE13D_VISUAL_SCENARIO.PRIVACY
  const isScotland = team?.isoCode === 'SCO'
  const groupCode = VISUAL_STAGE13D_REFERENCE.groups.find(group => group.teams.some(candidate => candidate.teamId === team?.teamId))?.code ?? null
  return Object.freeze({
    team: Object.freeze({
      tournament_team_id: team.teamId,
      team_id: null,
      name: team.label,
      short_name: team.label,
      iso_code: team.isoCode,
      slot_code: team.slotCode,
      group_code: groupCode,
      qualification_status: 'provisional',
      is_host: isScotland,
      is_provisional: true,
    }),
    curated: Object.freeze(isScotland ? {
      status: 'ready',
      ranking: 44,
      qualifying_route: 'Provisional host-nation place for interface testing',
      best_euro_finish: 'Group stage',
      editorial_note: 'A clearly labelled sample profile used to test the Euro 2028 team sheet before the official participants are confirmed.',
      profile_revision: 1,
      updated_at: '2026-07-02T12:00:00.000Z',
    } : {
      status: 'empty', ranking: null, qualifying_route: null, best_euro_finish: null,
      editorial_note: null, profile_revision: 0, updated_at: null,
    }),
    predictions: Object.freeze({
      aggregates_visible: aggregatesVisible,
      visibility_reason: aggregatesVisible ? null : 'Community prediction percentages unlock after the global Original Predictor lock.',
      eligible_prediction_count: aggregatesVisible ? 12 : null,
      aggregates: aggregatesVisible ? Object.freeze({
        group_winner_percentage: isScotland ? 41.7 : 16.7,
        round_of_16_percentage: isScotland ? 66.7 : 33.3,
        quarter_final_percentage: isScotland ? 33.3 : 16.7,
        semi_final_percentage: isScotland ? 16.7 : 8.3,
        final_percentage: isScotland ? 8.3 : 0,
        champion_percentage: isScotland ? 8.3 : 0,
      }) : null,
      viewer_prediction: Object.freeze({
        has_original_prediction_set: true,
        bracket_pick_count: 15,
        predicted_group_winner: isScotland,
        predicted_round_of_16: isScotland,
        predicted_quarter_final: isScotland,
        predicted_semi_final: false,
        predicted_final: false,
        predicted_champion: false,
      }),
    }),
  })
}

function normaliseScenario(value) {
  return Object.values(STAGE13D_VISUAL_SCENARIO).includes(value)
    ? value
    : STAGE13D_VISUAL_SCENARIO.ACTIVE
}

export function createStage13dVisualClient({ scenario = STAGE13D_VISUAL_SCENARIO.ACTIVE } = {}) {
  const activeScenario = normaliseScenario(scenario)
  return Object.freeze({
    auth: Object.freeze({
      getSession: () => response({ session: { user: { id: CURRENT_USER_ID, email: 'nicky@example.com' } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    }),
    from: table => {
      if (table !== 'matches') {
        return { select: () => ({ eq: () => ({ order: () => response([], { message: `Visual fixture cannot read ${table}.` }) }) }) }
      }
      return {
        select: () => ({
          eq: () => ({
            order: () => response(VISUAL_STAGE13D_RESULT_ROWS),
          }),
        }),
      }
    },
    rpc: (name, args = {}) => {
      if (name === 'get_team_profile_sheet') return response(visualTeamProfile(args.p_tournament_team_id, activeScenario))
      if (name === 'admin_list_team_profiles') {
        return response(Object.values(VISUAL_STAGE13D_REFERENCE.teamsById).map(team => {
          const profile = visualTeamProfile(team.teamId, activeScenario)
          return {
            tournament_team_id: team.teamId,
            team_name: team.label,
            short_name: team.label,
            iso_code: team.isoCode,
            slot_code: team.slotCode,
            group_code: team.stableKey?.[0] ?? null,
            is_provisional: true,
            ranking: profile.curated.ranking,
            qualifying_route: profile.curated.qualifying_route,
            best_euro_finish: profile.curated.best_euro_finish,
            editorial_note: profile.curated.editorial_note,
            profile_revision: profile.curated.profile_revision,
            updated_at: profile.curated.updated_at,
          }
        }))
      }
      if (name === 'admin_upsert_team_profile') return response({ tournament_team_id: args.p_tournament_team_id, profile_revision: Number(args.p_expected_revision ?? 0) + 1 })
      if (name === 'get_my_leagues') return response(LEAGUES)
      if (name === 'get_league_standings') {
        if (activeScenario === STAGE13D_VISUAL_SCENARIO.PARTIAL && args.p_competition_key === 'ko_predictor') {
          return response(null, { message: 'Visual partial fixture: KO league standings unavailable.' })
        }
        return response(args.p_competition_key === 'original' ? ORIGINAL_STANDINGS : KO_STANDINGS)
      }
      if (name === 'get_league_member_predictions' || name === 'get_member_predictions_after_lock') {
        const userId = args.p_member_user_id ?? CURRENT_USER_ID
        return response(sharedBundleFor(userId, args.p_competition_key, activeScenario))
      }
      if (name === 'get_competition_leaderboard') {
        if (activeScenario === STAGE13D_VISUAL_SCENARIO.PARTIAL && args.p_competition_key === 'ko_predictor') {
          return response(null, { message: 'Visual partial fixture: KO overall leaderboard unavailable.' })
        }
        return response(args.p_competition_key === 'original' ? ORIGINAL_STANDINGS : KO_STANDINGS)
      }
      if (name === 'get_my_competition_points') {
        if (activeScenario === STAGE13D_VISUAL_SCENARIO.PARTIAL && args.p_competition_key === 'original') {
          return response(null, { message: 'Visual partial fixture: Original points unavailable.' })
        }
        return response(args.p_competition_key === 'original' ? ORIGINAL_POINTS : KO_POINTS)
      }
      if (name === 'create_my_league') return response({ league_id: 'visual-created', name: args.p_name })
      if (name === 'join_league_by_code') return response({ league_id: 'visual-league-work', name: 'Office Predictor' })
      if (name === 'leave_my_league' || name === 'delete_my_league') return response({ ok: true })
      return response(null, { message: `Visual fixture RPC is not implemented: ${name}` })
    },
  })
}

export const VISUAL_STAGE13D_EXPECTATIONS = Object.freeze({
  currentUserId: CURRENT_USER_ID,
  leagueCount: LEAGUES.length,
  memberCount: MEMBER_NAMES.length,
  resultCount: VISUAL_STAGE13D_RESULT_ROWS.length,
  originalTotalPoints: ORIGINAL_POINTS.total_points,
  koTotalPoints: KO_POINTS.total_points,
})
