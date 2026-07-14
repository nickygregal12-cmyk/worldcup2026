import { resolvePredictionLock } from '../contracts/lockContract.js'
import { getNow } from '../lib/clock.js'
import { TOURNAMENT_CONFIG } from './tournament.js'

export const TOURNAMENT_LIFECYCLE_SOURCE = Object.freeze({
  DATABASE: 'database',
  CENTRAL_PROVISIONAL: 'central-provisional',
  LOCKED: 'locked',
  UNCONFIGURED: 'unconfigured',
})

function validTimestamp(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function hasExplicitTime(value) {
  return typeof value === 'string' && /T\d{2}:\d{2}/.test(value)
}

function validStartTimestamp(tournament) {
  if (hasExplicitTime(tournament?.starts_on)) return validTimestamp(tournament.starts_on)
  return validTimestamp(TOURNAMENT_CONFIG.dates.tournamentStartAt) ?? validTimestamp(tournament?.starts_on)
}

export function resolveTournamentLifecycle(tournament = {}, now = getNow()) {
  const lockedAt = validTimestamp(tournament.prediction_locked_at)
  const databaseLockAt = validTimestamp(tournament.prediction_lock_at)
  const configuredLockAt = validTimestamp(TOURNAMENT_CONFIG.dates.predictionLockAt)
  const configuredStartAt = validTimestamp(TOURNAMENT_CONFIG.dates.tournamentStartAt)
  const databaseStartAt = validStartTimestamp(tournament)
  const predictionLockAt = lockedAt ?? databaseLockAt ?? configuredLockAt
  const tournamentStartAt = databaseStartAt ?? configuredStartAt
  const source = lockedAt
    ? TOURNAMENT_LIFECYCLE_SOURCE.LOCKED
    : databaseLockAt
      ? TOURNAMENT_LIFECYCLE_SOURCE.DATABASE
      : configuredLockAt
        ? TOURNAMENT_LIFECYCLE_SOURCE.CENTRAL_PROVISIONAL
        : TOURNAMENT_LIFECYCLE_SOURCE.UNCONFIGURED
  const currentTime = now instanceof Date ? now : new Date(now)

  // The lock rule itself lives in the contract and nowhere else. This resolver adds
  // provenance (which source the date came from, whether it is provisional) on top,
  // but it must never decide "locked" independently: a parallel implementation is
  // what let the one-hour tournamentStartAt mismatch, and later the never-engaging
  // lock, drift away from `docs/RULES-SCORING-LOCKED-CONTRACT.md`.
  const lock = resolvePredictionLock({
    now: currentTime,
    openingKickoffAt: databaseLockAt ?? configuredLockAt,
    persistedLockedAt: lockedAt,
  })

  return Object.freeze({
    predictionLockAt,
    predictionLockedAt: lockedAt,
    tournamentStartAt,
    source,
    lockState: lock.state,
    lockReason: lock.reason,
    // Database-backed only, mirroring the SQL save guard (which raises when both
    // prediction_lock_at and prediction_locked_at are NULL). The central-provisional
    // fallback keeps a labelled display date flowing but never counts as configured,
    // so account saving fails loud client-side instead of erroring at the database.
    lockConfigured: Boolean(lockedAt || databaseLockAt),
    startConfigured: Boolean(validTimestamp(tournament.starts_on)),
    locked: !lock.canEdit,
    provisional: source === TOURNAMENT_LIFECYCLE_SOURCE.CENTRAL_PROVISIONAL,
  })
}
