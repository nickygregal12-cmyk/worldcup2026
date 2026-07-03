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

  return Object.freeze({
    predictionLockAt,
    predictionLockedAt: lockedAt,
    tournamentStartAt,
    source,
    lockConfigured: Boolean(predictionLockAt),
    locked: Boolean(lockedAt || (predictionLockAt && currentTime >= new Date(predictionLockAt))),
    provisional: source === TOURNAMENT_LIFECYCLE_SOURCE.CENTRAL_PROVISIONAL,
  })
}
