import { EURO_SCORING_CONFIG } from '../config/scoringConfig.js'
import { GUEST_PREDICTION_CONTEXT, GUEST_PREDICTION_STATE_VERSION, GUEST_RESOLVER_VERSION } from '../guest/guestPredictionConfig.js'

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
  actualTeamId: null,
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
