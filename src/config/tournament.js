import { ENVIRONMENT } from './environment.js'

const OFFICIAL_EURO_2028_VENUES = Object.freeze([
  Object.freeze({ name: 'Wembley Stadium', city: 'London', hostNation: 'England', tags: Object.freeze(['Semi-finals', 'Final']) }),
  Object.freeze({ name: 'Tottenham Hotspur Stadium', city: 'London', hostNation: 'England', tags: Object.freeze([]) }),
  Object.freeze({ name: 'National Stadium of Wales', city: 'Cardiff', hostNation: 'Wales', tags: Object.freeze(['Opening match']) }),
  Object.freeze({ name: 'Manchester City Stadium', city: 'Manchester', hostNation: 'England', tags: Object.freeze([]) }),
  Object.freeze({ name: 'Everton Stadium', city: 'Liverpool', hostNation: 'England', tags: Object.freeze([]) }),
  Object.freeze({ name: "St James' Park", city: 'Newcastle', hostNation: 'England', tags: Object.freeze([]) }),
  Object.freeze({ name: 'Villa Park', city: 'Birmingham', hostNation: 'England', tags: Object.freeze([]) }),
  Object.freeze({ name: 'Hampden Park', city: 'Glasgow', hostNation: 'Scotland', tags: Object.freeze([]) }),
  Object.freeze({ name: 'Dublin Arena', city: 'Dublin', hostNation: 'Republic of Ireland', tags: Object.freeze([]) }),
])

/**
 * Tournament-level configuration.
 *
 * UEFA confirmed the final-tournament date window, venues and host nations on
 * 12 November 2025. Participant assignments and match-specific kick-off times
 * remain separate from those confirmed facts and stay provisional until the
 * final tournament draw and later official confirmations.
 */
export const TOURNAMENT_CONFIG = Object.freeze({
  id: ENVIRONMENT.tournamentId,
  name: ENVIRONMENT.tournamentName,
  shortName: ENVIRONMENT.tournamentShortName,
  year: ENVIRONMENT.tournamentYear,
  timezone: 'Europe/London',
  status: 'development',
  provisionalData: true,
  dates: Object.freeze({
    predictionLockAt: import.meta.env.VITE_PREDICTION_LOCK_AT || '2028-06-09T19:00:00.000Z',
    tournamentStartAt: import.meta.env.VITE_TOURNAMENT_START_AT || '2028-06-09T20:00:00.000Z',
    groupStageEndAt: import.meta.env.VITE_GROUP_STAGE_END_AT || null,
    knockoutPredictorOpenAt: import.meta.env.VITE_KO_PREDICTOR_OPEN_AT || null,
    tournamentEndAt: import.meta.env.VITE_TOURNAMENT_END_AT || '2028-07-09T22:59:59.000Z',
  }),
  confirmedFacts: Object.freeze({
    scheduleAnnouncementDate: '2025-11-12',
    tournamentStartDate: '2028-06-09',
    tournamentEndDate: '2028-07-09',
    hostNations: Object.freeze(['England', 'Scotland', 'Wales', 'Republic of Ireland']),
    hostNationNote: 'Northern Ireland is not a final-schedule host nation after Casement Park was removed from the confirmed venue list.',
    venues: OFFICIAL_EURO_2028_VENUES,
    openingMatch: Object.freeze({
      date: '2028-06-09',
      venueName: 'National Stadium of Wales',
      city: 'Cardiff',
      label: 'Opening match',
    }),
    finalWeek: Object.freeze({
      venueName: 'Wembley Stadium',
      city: 'London',
      semiFinalDates: Object.freeze(['2028-07-04', '2028-07-05']),
      finalDate: '2028-07-09',
    }),
    format: Object.freeze({
      teamCount: 24,
      groupCount: 6,
      teamsPerGroup: 4,
      automaticGroupQualifiers: 2,
      bestThirdQualifiers: 4,
      groupMatches: 36,
      knockoutMatches: 15,
      totalMatches: 51,
      thirdPlacePlayoff: false,
    }),
    unconfirmed: Object.freeze([
      'Final group participants remain unconfirmed.',
      'Match-specific kick-off times remain unconfirmed until after the final tournament draw.',
    ]),
  }),
  compatibility: Object.freeze({
    sourceTournament: 'wc26',
    useLegacyDatesUntilConfigured: true,
  }),
})
