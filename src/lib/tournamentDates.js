import { TOURNAMENT_CONFIG } from '../config/tournament.js'

// Temporary compatibility values inherited from the WC26 application.
// Remove these once all screens read confirmed tournament records/configuration.
export const LEGACY_WC26_DATE_ISO = Object.freeze({
  TOURNAMENT_START: '2026-06-11T19:00:00Z',
  GROUP_STAGE_END: '2026-06-27T22:00:00Z',
  KNOCKOUT_BANNER: '2026-06-20T00:00:00Z',
  KO_PREDICTOR_OPEN: '2026-06-27T22:00:00Z',
  TOURNAMENT_END: '2026-07-19T20:00:00Z',
})

const configured = TOURNAMENT_CONFIG.dates

export const DATE_ISO = Object.freeze({
  TOURNAMENT_START: configured.tournamentStartAt || LEGACY_WC26_DATE_ISO.TOURNAMENT_START,
  GROUP_STAGE_END: configured.groupStageEndAt || LEGACY_WC26_DATE_ISO.GROUP_STAGE_END,
  KNOCKOUT_BANNER: configured.tournamentStartAt || LEGACY_WC26_DATE_ISO.KNOCKOUT_BANNER,
  KO_PREDICTOR_OPEN: configured.knockoutPredictorOpenAt || LEGACY_WC26_DATE_ISO.KO_PREDICTOR_OPEN,
  TOURNAMENT_END: configured.tournamentEndAt || LEGACY_WC26_DATE_ISO.TOURNAMENT_END,
})

export const DATES = Object.freeze(
  Object.fromEntries(Object.entries(DATE_ISO).map(([key, value]) => [key, new Date(value)]))
)
