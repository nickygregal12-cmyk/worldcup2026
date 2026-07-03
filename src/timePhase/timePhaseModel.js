export const TIME_PHASE_PRESETS = Object.freeze([
  { key: 'pre_lock', label: 'Pre-lock', at: '2028-06-09T18:00:00.000Z' },
  { key: 'global_lock', label: 'Global lock', at: '2028-06-09T19:00:00.000Z' },
  { key: 'grace_period', label: 'Grace period', at: '2028-06-09T19:05:00.000Z' },
  { key: 'group_live', label: 'Group stage live', at: '2028-06-09T20:00:00.000Z' },
  { key: 'group_complete', label: 'Group stage complete', at: '2028-06-21T22:00:00.000Z' },
  { key: 'knockout_unresolved', label: 'Knockout unresolved', at: '2028-06-21T18:00:00.000Z' },
  { key: 'knockout_known', label: 'Knockout fixtures known', at: '2028-06-22T10:00:00.000Z' },
  { key: 'ko_open', label: 'KO Predictor open', at: '2028-06-22T12:00:00.000Z' },
  { key: 'fixture_locked', label: 'Fixture locked', at: '2028-06-24T16:00:00.000Z' },
  { key: 'match_live', label: 'Match live', at: '2028-06-24T17:05:00.000Z' },
  { key: 'match_complete', label: 'Match complete', at: '2028-06-24T19:15:00.000Z' },
  { key: 'correction_review', label: 'Correction review', at: '2028-06-24T20:00:00.000Z' },
  { key: 'tournament_complete', label: 'Tournament complete', at: '2028-07-09T22:00:00.000Z' },
])

export function normaliseTimeControl(value) {
  return Object.freeze({
    isEnabled: Boolean(value?.is_enabled),
    simulatedAt: value?.simulated_at ?? null,
    phaseKey: value?.phase_key ?? null,
    revision: Number(value?.revision ?? 1),
    updatedAt: value?.updated_at ?? null,
  })
}

export function canApplyStagingTime({ appEnv, enableTimeTravel, control }) {
  return appEnv === 'staging' && enableTimeTravel === true && Boolean(control?.isEnabled && control?.simulatedAt)
}
