import { parseExternal } from '../contracts/externalValidation.js'
import { graceWindowRowsSchema } from '../contracts/externalSchemas.js'

export const PREDICTION_COMPETITION_KEY = Object.freeze({
  ORIGINAL: 'original',
  KO_PREDICTOR: 'ko_predictor',
})

function toDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function isPredictionMatchStarted(match, now = new Date()) {
  if (!match) return false
  if (['live', 'paused', 'completed', 'abandoned'].includes(match.status)) return true
  const kickoff = toDate(match.kickoffAt ?? match.kickoff_at)
  return Boolean(kickoff && kickoff <= new Date(now))
}

export function isActivePredictionGrace(window, {
  competitionKey,
  matchId,
  now = new Date(),
} = {}) {
  if (!window || window.competition_key !== competitionKey || window.match_id !== matchId) return false
  if (window.revoked_at) return false
  const grantedAt = toDate(window.granted_at)
  const expiresAt = toDate(window.expires_at)
  const current = new Date(now)
  return Boolean(grantedAt && expiresAt && grantedAt <= current && expiresAt > current)
}

export function hasActivePredictionGrace(windows, options) {
  return Array.isArray(windows) && windows.some(window => isActivePredictionGrace(window, options))
}

export async function loadMyPredictionGraceWindows(client, tournamentId, userId) {
  if (!client || !tournamentId || !userId) return []
  const { data, error } = await client
    .from('prediction_grace_windows')
    .select('id,tournament_id,user_id,match_id,competition_key,granted_at,expires_at,reason,revoked_at,revocation_reason')
    .eq('tournament_id', tournamentId)
    .eq('user_id', userId)
    .order('expires_at', { ascending: false })
  if (error) throw error
  return parseExternal(graceWindowRowsSchema, data ?? [], 'Prediction grace response')
}
