import { EURO_SCORING_CONFIG } from '../config/scoringConfig.js'

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


export const VISUAL_FOUNDATION = Object.freeze({
  tournament: Object.freeze({ id: 'visual-tournament', name: 'UEFA EURO 2028', starts_on: '2028-06-09', ends_on: '2028-07-09', prediction_lock_at: null, prediction_locked_at: null }),
  totals: Object.freeze({ groups: 6, tournamentSlots: 24, confirmedVenues: 9, enteredKickoffTimes: 0, matches: 51, groupMatches: 36, knockoutMatches: 15 }),
  stages: Object.freeze([]),
  guestReference: Object.freeze({ referenceVersion: 'visual-stage13a', resolverHealthy: true, groupMatches: Object.freeze([]), knockoutMatches: Object.freeze([]) }),
})
