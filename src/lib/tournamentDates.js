export const DATE_ISO = Object.freeze({
  TOURNAMENT_START: '2026-06-11T19:00:00Z',
  GROUP_STAGE_END: '2026-06-27T22:00:00Z',
  KNOCKOUT_BANNER: '2026-06-20T00:00:00Z',
  KO_PREDICTOR_OPEN: '2026-06-27T22:00:00Z',
  TOURNAMENT_END: '2026-07-19T20:00:00Z',
})

export const DATES = Object.freeze(
  Object.fromEntries(Object.entries(DATE_ISO).map(([key, value]) => [key, new Date(value)]))
)
