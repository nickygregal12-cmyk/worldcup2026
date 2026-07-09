import { ENVIRONMENT } from './environment.js'

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
    // Predictions lock at the first kick-off, so these are the same moment.
    // 19:00Z is 8:00pm UK — June is BST. Opening kick-off time is assumed, not confirmed.
    predictionLockAt: import.meta.env.VITE_PREDICTION_LOCK_AT || '2028-06-09T19:00:00.000Z',
    tournamentStartAt: import.meta.env.VITE_TOURNAMENT_START_AT || '2028-06-09T19:00:00.000Z',
    groupStageEndAt: import.meta.env.VITE_GROUP_STAGE_END_AT || null,
    knockoutPredictorOpenAt: import.meta.env.VITE_KO_PREDICTOR_OPEN_AT || null,
    tournamentEndAt: import.meta.env.VITE_TOURNAMENT_END_AT || '2028-07-09T22:59:59.000Z',
  }),
  confirmedFacts: Object.freeze({
    scheduleAnnouncementDate: '2025-11-12',
    tournamentStartDate: '2028-06-09',
    tournamentEndDate: '2028-07-09',
    // Venues, host nations, opening-match and final-week facts live in the
    // database (public.venues + venues.metadata, Migration 021) and reach the
    // UI through the foundation load — never as a client-side list here.
    hostNationNote: 'Northern Ireland is not a final-schedule host nation after Casement Park was removed from the confirmed venue list.',
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
