// Stage GODMODE-1 — Admin Tournament Simulator (Migration 022).
// Pure normalisation for the simulator status payload plus the constants the
// section shares with the database contract.

// Must match public.admin_simulator_teardown_world's required phrase exactly.
export const SIMULATOR_TEARDOWN_CONFIRMATION = 'TEARDOWN-SYNTHETIC-WORLD'

const EMPTY_COUNTS = Object.freeze({
  syntheticUsers: 0,
  predictionSets: 0,
  matchPredictions: 0,
  bracketPredictions: 0,
  leagues: 0,
  leagueMembers: 0,
  totalPointsOriginal: 0,
  totalPointsKo: 0,
  confirmedResults: 0,
  liveMatches: 0,
  scoreScripts: 0,
})

function toCount(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function normaliseSimulatorStatus(value) {
  const counts = value?.counts ?? null
  const scripts = Array.isArray(value?.score_scripts) ? value.score_scripts : []
  return Object.freeze({
    isProvisional: Boolean(value?.is_provisional),
    clock: Object.freeze({
      isEnabled: Boolean(value?.clock?.is_enabled),
      simulatedAt: value?.clock?.simulated_at ?? null,
      phaseKey: value?.clock?.phase_key ?? null,
      revision: Number(value?.clock?.revision ?? 1),
      updatedAt: value?.clock?.updated_at ?? null,
    }),
    counts: counts
      ? Object.freeze({
        syntheticUsers: toCount(counts.synthetic_users),
        predictionSets: toCount(counts.prediction_sets),
        matchPredictions: toCount(counts.match_predictions),
        bracketPredictions: toCount(counts.bracket_predictions),
        leagues: toCount(counts.leagues),
        leagueMembers: toCount(counts.league_members),
        totalPointsOriginal: toCount(counts.total_points_original),
        totalPointsKo: toCount(counts.total_points_ko),
        confirmedResults: toCount(counts.confirmed_results),
        liveMatches: toCount(counts.live_matches),
        scoreScripts: toCount(counts.score_scripts),
      })
      : EMPTY_COUNTS,
    scoreScripts: Object.freeze(scripts.map(script => Object.freeze({
      matchId: script?.match_id ?? null,
      matchNumber: Number(script?.match_number ?? 0),
      homeGoals: toCount(script?.home_goals),
      awayGoals: toCount(script?.away_goals),
      updatedAt: script?.updated_at ?? null,
    }))),
    worldSeeded: toCount(counts?.synthetic_users) > 0,
  })
}

export const EMPTY_SIMULATOR_STATUS = normaliseSimulatorStatus(null)

// The simulator's instant field is a plain validated text input in UTC (the
// native date-time control ratchet permits no new native date inputs).
// Accepts `YYYY-MM-DDTHH:mm` with optional seconds and optional trailing Z.
const UTC_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?Z?$/

export function parseUtcInstant(value) {
  const trimmed = String(value ?? '').trim()
  if (!UTC_INSTANT_PATTERN.test(trimmed)) return null
  const bare = trimmed.replace(/Z$/, '')
  const withSeconds = /T\d{2}:\d{2}$/.test(bare) ? `${bare}:00Z` : `${bare}Z`
  const date = new Date(withSeconds)
  return Number.isNaN(date.getTime()) ? null : date
}

export function isValidScriptedGoals(value) {
  if (value === '' || value === null || value === undefined) return false
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 20
}
