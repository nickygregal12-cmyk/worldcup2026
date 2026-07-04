import { resolveTournamentLifecycle } from '../config/index.js'

export const ACCOUNT_STATS_DEFAULT = Object.freeze({
  leaguesJoined: 0,
  groupPredictionsSaved: 0,
  groupPredictionTotal: 36,
  groupJokersArmed: 0,
  groupJokerTotal: 5,
})

export function initialForDisplayName(name = '', email = '') {
  const source = String(name || email || '?').trim()
  return source ? source[0].toUpperCase() : '?'
}

export function buildAccountStats({ leagues = [], predictionBundle = null, groupPredictionTotal = 36, groupJokerTotal = 5 } = {}) {
  const groupRows = (predictionBundle?.predictions ?? []).filter(row => row.prediction_kind === 'group_score')
  return Object.freeze({
    leaguesJoined: Array.isArray(leagues) ? leagues.length : 0,
    groupPredictionsSaved: groupRows.filter(row => Number.isInteger(Number(row.home_score_90)) && Number.isInteger(Number(row.away_score_90))).length,
    groupPredictionTotal,
    groupJokersArmed: groupRows.filter(row => row.joker_applied).length,
    groupJokerTotal,
  })
}

export function buildAccountLifecycle(tournament, now) {
  const lifecycle = resolveTournamentLifecycle(tournament, now)
  return Object.freeze({
    locked: lifecycle.locked,
    clearPredictionsAvailable: !lifecycle.locked,
    lockLabel: lifecycle.locked ? 'Original Predictor locked' : 'Available before first kick-off',
  })
}

export function shouldShowGuestTransferModal({ requested, session, isRecovery }) {
  return Boolean(requested && session?.user && !isRecovery)
}
