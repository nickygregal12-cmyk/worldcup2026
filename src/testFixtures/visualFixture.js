import { EURO_SCORING_CONFIG } from '../config/scoringConfig.js'
import { GUEST_PREDICTION_CONTEXT, GUEST_PREDICTION_STATE_VERSION, GUEST_RESOLVER_VERSION } from '../guest/guestPredictionConfig.js'
import { resolveGuestTournamentPreview, updateGuestBracketPrediction } from '../guest/index.js'

export const VISUAL_HOME_DASHBOARD = Object.freeze({
  signedIn: true,
  displayName: 'Nicky',
  tournament: Object.freeze({
    name: 'UEFA EURO 2028',
    startsOn: '2028-06-09',
    endsOn: '2028-07-09',
    predictionLockAt: null,
    predictionLockedAt: null,
    unresolvedTeams: 24,
    totalTeams: 24,
    totalMatches: 51,
  }),
  original: Object.freeze({ groupComplete: 18, groupTotal: 36, bracketComplete: 0, bracketTotal: 15, totalComplete: 18, total: 51, submittedAt: null, revision: 4, points: 120, rank: 3, jokerCount: 3, jokerCap: EURO_SCORING_CONFIG.joker.GROUP_STAGE_CAP, dataAvailable: true }),
  koPredictor: Object.freeze({ available: 0, complete: 0, total: 15, points: 0, rank: null, jokerCount: 0, jokerCap: EURO_SCORING_CONFIG.joker.KO_PREDICTOR_CAP, dataAvailable: true }),
  leagues: Object.freeze({ count: 2, members: 14 }),
  live: Object.freeze({ liveMatches: 0, confirmedMatches: 0, totalMatches: 51, nextMatch: Object.freeze({ matchNumber: 1, scheduledDate: '2028-06-09', displayStatus: 'upcoming' }), dataAvailable: true }),
  sectionErrors: Object.freeze({}),
  hasPartialFailure: false,
})

const VISUAL_TEAMS = Object.freeze([
  ['SCO', 'Scotland'], ['GER', 'Germany'], ['ESP', 'Spain'], ['CRO', 'Croatia'],
  ['ENG', 'England'], ['ITA', 'Italy'], ['DEN', 'Denmark'], ['SUI', 'Switzerland'],
  ['FRA', 'France'], ['NED', 'Netherlands'], ['AUT', 'Austria'], ['POL', 'Poland'],
  ['POR', 'Portugal'], ['BEL', 'Belgium'], ['TUR', 'Türkiye'], ['CZE', 'Czechia'],
  ['WAL', 'Wales'], ['IRL', 'Republic of Ireland'], ['NOR', 'Norway'], ['SWE', 'Sweden'],
  ['NIR', 'Northern Ireland'], ['UKR', 'Ukraine'], ['SRB', 'Serbia'], ['ROU', 'Romania'],
].map(([isoCode, label], index) => Object.freeze({
  teamId: `visual-team-${index + 1}`,
  tournamentTeamId: `visual-team-${index + 1}`,
  // These 24 are fully identified teams — Scotland, Germany, and so on — so a
  // real team sits behind every slot, exactly as it does in staging. They are
  // still PROVISIONAL, because the draw has not been made: staging's rows all
  // carry is_provisional = true while their team_id is set. The two fields answer
  // different questions and the fixture has to model both, or a surface that
  // reads actualTeamId (TeamLabel, TeamBadge) tests green against a shape that
  // does not exist. This was `null`, which said "empty slot" about a team with a
  // name and a flag.
  actualTeamId: `visual-actual-${index + 1}`,
  slotCode: `V${index + 1}`,
  stableKey: `V${index + 1}`,
  label,
  isoCode,
  drawPosition: (index % 4) + 1,
  qualifierRank: index + 1,
  isProvisional: true,
})))

const VISUAL_GROUP_CODES = Object.freeze(['A', 'B', 'C', 'D', 'E', 'F'])
const VISUAL_PAIRINGS = Object.freeze([[0, 1], [2, 3], [0, 2], [1, 3], [3, 0], [1, 2]])

function buildVisualGroupsReference() {
  const groups = VISUAL_GROUP_CODES.map((code, groupIndex) => Object.freeze({
    code,
    groupId: `visual-group-${code}`,
    teams: Object.freeze(VISUAL_TEAMS.slice(groupIndex * 4, (groupIndex + 1) * 4)),
  }))

  let matchNumber = 1
  const groupMatches = []
  for (const group of groups) {
    for (const [home, away] of VISUAL_PAIRINGS) {
      groupMatches.push(Object.freeze({
        context: 'guest',
        matchId: `visual-match-${matchNumber}`,
        matchNumber,
        fixtureCode: `VISUAL-${group.code}-${matchNumber}`,
        groupCode: group.code,
        scheduledDate: `2028-06-${String(8 + Math.ceil(matchNumber / 6)).padStart(2, '0')}`,
        kickoffAt: null,
        status: 'scheduled',
        resultStatus: 'pending',
        homeTeamId: group.teams[home].teamId,
        awayTeamId: group.teams[away].teamId,
        homeScore: null,
        awayScore: null,
      }))
      matchNumber += 1
    }
  }

  const knockoutMatches = Array.from({ length: 15 }, (_, index) => Object.freeze({
    matchId: `visual-match-${37 + index}`,
    matchNumber: 37 + index,
    fixtureCode: `VISUAL-KO-${37 + index}`,
    scheduledDate: null,
    kickoffAt: null,
    status: 'scheduled',
    homeTeamId: null,
    awayTeamId: null,
    participantsResolved: false,
  }))

  return Object.freeze({
    modelVersion: 'euro28-guest-reference-v2',
    referenceVersion: 'visual-stage13b',
    scheduleVersion: 'visual-stage13b',
    context: 'guest',
    resolverHealthy: true,
    tournamentId: 'visual-tournament',
    tournamentCode: 'euro-2028',
    tournamentName: 'UEFA EURO 2028',
    groups: Object.freeze(groups),
    groupMatches: Object.freeze(groupMatches),
    knockoutMatches: Object.freeze(knockoutMatches),
    knockoutMatchNumbers: Object.freeze(knockoutMatches.map(match => match.matchNumber)),
    teamsById: Object.freeze(Object.fromEntries(VISUAL_TEAMS.map(team => [team.teamId, team]))),
  })
}

export const VISUAL_GROUP_REFERENCE = buildVisualGroupsReference()

export const VISUAL_GROUP_DRAFT = Object.freeze({
  version: GUEST_PREDICTION_STATE_VERSION,
  context: GUEST_PREDICTION_CONTEXT,
  resolverVersion: GUEST_RESOLVER_VERSION,
  tournamentId: 'visual-tournament',
  tournamentCode: 'euro-2028',
  referenceVersion: 'visual-stage13b',
  revision: 0,
  createdAt: '2026-07-02T12:00:00.000Z',
  updatedAt: '2026-07-02T12:00:00.000Z',
  lastImportedAt: null,
  groupPredictions: Object.freeze(Object.fromEntries(VISUAL_GROUP_REFERENCE.groupMatches.map(match => {
    const complete = match.matchNumber <= 18
    return [String(match.matchNumber), Object.freeze({
      matchNumber: match.matchNumber,
      homeScore: complete ? (match.matchNumber % 3) + 1 : null,
      awayScore: complete ? match.matchNumber % 2 : null,
      jokerApplied: [2, 8, 15].includes(match.matchNumber),
      updatedAt: complete ? '2026-07-02T12:00:00.000Z' : null,
    })]
  }))),
  bracketPredictions: Object.freeze(Object.fromEntries(VISUAL_GROUP_REFERENCE.knockoutMatchNumbers.map(matchNumber => [String(matchNumber), Object.freeze({ matchNumber, advancingTeamId: null, updatedAt: null })]))),
})

export const VISUAL_FOUNDATION = Object.freeze({
  tournament: Object.freeze({ id: 'visual-tournament', name: 'UEFA EURO 2028', starts_on: '2028-06-09', ends_on: '2028-07-09', prediction_lock_at: null, prediction_locked_at: null }),
  totals: Object.freeze({ groups: 6, tournamentSlots: 24, confirmedVenues: 9, enteredKickoffTimes: 0, matches: 51, groupMatches: 36, knockoutMatches: 15 }),
  stages: Object.freeze([]),
  guestReference: VISUAL_GROUP_REFERENCE,
})


function buildVisualBracketDraft() {
  let state = {
    ...VISUAL_GROUP_DRAFT,
    groupPredictions: Object.freeze(Object.fromEntries(VISUAL_GROUP_REFERENCE.groupMatches.map(match => [String(match.matchNumber), Object.freeze({
      matchNumber: match.matchNumber,
      homeScore: (match.matchNumber % 3) + 1,
      awayScore: match.matchNumber % 2,
      jokerApplied: [2, 8, 15, 22, 29].includes(match.matchNumber),
      updatedAt: '2026-07-02T12:00:00.000Z',
    })]))),
  }
  for (let matchNumber = 37; matchNumber <= 51; matchNumber += 1) {
    const preview = resolveGuestTournamentPreview(VISUAL_GROUP_REFERENCE, state)
    const match = preview.resolution.knockout.byMatchNumber[matchNumber]
    if (!match?.homeTeamId) break
    state = updateGuestBracketPrediction(state, { matchNumber, advancingTeamId: match.homeTeamId }, { now: '2026-07-02T12:00:00.000Z' })
  }
  return Object.freeze(state)
}

export const VISUAL_BRACKET_DRAFT = buildVisualBracketDraft()

const VISUAL_KO_MATCH_TEAMS = Object.freeze([
  ['visual-team-1', 'visual-team-2'], ['visual-team-3', 'visual-team-4'],
  ['visual-team-5', 'visual-team-6'], ['visual-team-7', 'visual-team-8'],
  ['visual-team-9', 'visual-team-10'], ['visual-team-11', 'visual-team-12'],
  ['visual-team-13', 'visual-team-14'], ['visual-team-15', 'visual-team-16'],
])

export const VISUAL_KO_REFERENCE = Object.freeze({
  ...VISUAL_GROUP_REFERENCE,
  referenceVersion: 'visual-stage13c-ko',
  knockoutMatches: Object.freeze(Array.from({ length: 15 }, (_, index) => {
    const matchNumber = 37 + index
    const pairing = VISUAL_KO_MATCH_TEAMS[index] ?? [null, null]
    return Object.freeze({
      matchId: `visual-match-${matchNumber}`,
      matchNumber,
      fixtureCode: `VISUAL-KO-${matchNumber}`,
      scheduledDate: `2028-06-${String(23 + Math.min(index, 6)).padStart(2, '0')}`,
      kickoffAt: null,
      status: index === 0 ? 'live' : index === 1 ? 'completed' : 'scheduled',
      resultStatus: index === 1 ? 'confirmed' : 'pending',
      homeTeamId: pairing[0],
      awayTeamId: pairing[1],
      participantsResolved: Boolean(pairing[0] && pairing[1]),
    })
  })),
})

export const VISUAL_KO_BUNDLE = Object.freeze({
  revision: 3,
  predictions: Object.freeze(VISUAL_KO_REFERENCE.knockoutMatches.slice(0, 5).map((match, index) => Object.freeze({
    match_id: match.matchId,
    home_score_90: index === 0 ? 1 : index % 2,
    away_score_90: index === 0 ? 1 : (index + 1) % 2,
    advancing_tournament_team_id: index === 0 ? match.homeTeamId : (index % 2 ? match.awayTeamId : match.homeTeamId),
    decision_method: index === 0 ? 'penalties' : 'normal_time',
    joker_applied: index === 2,
    updated_at: '2026-07-02T12:00:00.000Z',
  }))),
})

export const VISUAL_KO_STANDING = Object.freeze({ points: 85, rank: 4 })
