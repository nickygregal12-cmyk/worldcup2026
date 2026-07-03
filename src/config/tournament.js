import { ENVIRONMENT } from './environment.js'

/**
 * Tournament-level configuration.
 *
 * Dates remain nullable until UEFA confirms the data we need. The existing
 * WC26 dates are retained separately in tournamentDates.js as a temporary
 * compatibility fallback so the copied application can still render while
 * the Euro database and UI are rebuilt.
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
    tournamentEndAt: import.meta.env.VITE_TOURNAMENT_END_AT || null,
  }),
  compatibility: Object.freeze({
    sourceTournament: 'wc26',
    useLegacyDatesUntilConfigured: true,
  }),
})
