import { PREDICTION_COMPETITION, PREDICTION_ROW_KIND, validatePredictionBundleShape } from '../contracts/predictionDatabaseContract.js'
import { KO_PREDICTOR_JOKER_CAP } from './koPredictorConfig.js'

function isScore(value) {
  return Number.isInteger(value) && value >= 0 && value <= 99
}

export function createKoPredictorDraft(reference, bundle = null) {
  const rows = Object.fromEntries(reference.knockoutMatches.map(match => [String(match.matchNumber), {
    matchNumber: match.matchNumber,
    homeScore: null,
    awayScore: null,
    advancingTeamId: null,
    decisionMethod: null,
    jokerApplied: false,
  }]))
  for (const prediction of bundle?.predictions ?? []) {
    const match = reference.knockoutMatches.find(item => item.matchId === prediction.match_id)
    if (!match) continue
    rows[String(match.matchNumber)] = {
      matchNumber: match.matchNumber,
      homeScore: prediction.home_score_90,
      awayScore: prediction.away_score_90,
      advancingTeamId: prediction.advancing_tournament_team_id,
      decisionMethod: prediction.decision_method,
      jokerApplied: Boolean(prediction.joker_applied),
    }
  }
  return { revision: bundle?.revision ?? 0, rows }
}

export function updateKoPredictorDraft(draft, match, patch) {
  if (!match?.participantsResolved) throw new TypeError('The real knockout fixture is not resolved')
  const current = draft.rows[String(match.matchNumber)]
  const next = { ...current, ...patch }
  if (next.jokerApplied && !current.jokerApplied) {
    const count = Object.values(draft.rows).filter(row => row.jokerApplied).length
    if (count >= KO_PREDICTOR_JOKER_CAP) throw new TypeError('Only 5 KO Predictor jokers are allowed')
  }
  if (isScore(next.homeScore) && isScore(next.awayScore)) {
    if (next.homeScore !== next.awayScore) {
      next.advancingTeamId = next.homeScore > next.awayScore ? match.homeTeamId : match.awayTeamId
      next.decisionMethod = 'normal_time'
    } else {
      if (![match.homeTeamId, match.awayTeamId].includes(next.advancingTeamId)) next.advancingTeamId = null
      if (!['extra_time', 'penalties'].includes(next.decisionMethod)) next.decisionMethod = 'extra_time'
    }
  }
  return { ...draft, rows: { ...draft.rows, [String(match.matchNumber)]: next } }
}

export function buildKoPredictorRows(reference, draft) {
  const rows = []
  for (const match of reference.knockoutMatches.filter(item => item.participantsResolved)) {
    const row = draft.rows[String(match.matchNumber)]
    if (!isScore(row.homeScore) || !isScore(row.awayScore) || !row.advancingTeamId || !row.decisionMethod) continue
    rows.push({
      prediction_kind: PREDICTION_ROW_KIND.KO_MATCH_SCORE,
      match_id: match.matchId,
      predicted_home_tournament_team_id: match.homeTeamId,
      predicted_away_tournament_team_id: match.awayTeamId,
      home_score_90: row.homeScore,
      away_score_90: row.awayScore,
      advancing_tournament_team_id: row.advancingTeamId,
      decision_method: row.decisionMethod,
      joker_applied: Boolean(row.jokerApplied),
    })
  }
  const validation = validatePredictionBundleShape({ tournament_id: reference.tournamentId, expected_revision: draft.revision, matches: rows }, {
    competitionKey: PREDICTION_COMPETITION.KO_PREDICTOR,
  })
  if (!validation.valid) throw new TypeError(validation.errors.join('; '))
  return rows
}

export function summariseKoPredictor(reference, draft) {
  const available = reference.knockoutMatches.filter(match => match.participantsResolved).length
  const rows = buildKoPredictorRows(reference, draft)
  return {
    available,
    complete: rows.length,
    jokerCount: Object.values(draft.rows).filter(row => row.jokerApplied).length,
    jokerCap: KO_PREDICTOR_JOKER_CAP,
    rows,
  }
}
