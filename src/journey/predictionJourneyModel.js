import { DECISION_METHOD } from '../contracts/resultContract.js'
import { validateKnockoutPrediction } from '../contracts/predictionContract.js'
import {
  createGuestPredictionState,
  resolveGuestTournamentPreview,
  updateGuestGroupPrediction,
  updateGuestKnockoutPrediction,
  validateGuestPredictionState,
} from '../guest/index.js'

function isScore(value) {
  return Number.isInteger(value) && value >= 0 && value <= 99
}

function assertReference(reference) {
  if (!reference?.tournamentId || !Array.isArray(reference.groupMatches) || !Array.isArray(reference.knockoutMatches)) {
    throw new TypeError('A complete Euro 2028 prediction reference is required')
  }
}

function cloneRows(rows) {
  return Object.fromEntries(Object.entries(rows).map(([key, value]) => [key, { ...value }]))
}

export function createPredictionJourneyDraft(reference, accountBundle = null, { now } = {}) {
  assertReference(reference)
  const draft = createGuestPredictionState(reference, { now })
  if (!accountBundle?.predictions?.length) return draft

  const matchById = new Map([
    ...reference.groupMatches,
    ...reference.knockoutMatches,
  ].map(match => [match.matchId, match]))
  const groupPredictions = cloneRows(draft.groupPredictions)
  const knockoutPredictions = cloneRows(draft.knockoutPredictions)

  for (const prediction of accountBundle.predictions) {
    const match = matchById.get(prediction.match_id)
    if (!match) continue
    const updatedAt = prediction.updated_at ?? accountBundle.updatedAt ?? null

    if (match.matchNumber <= 36) {
      groupPredictions[String(match.matchNumber)] = {
        ...groupPredictions[String(match.matchNumber)],
        homeScore: prediction.home_score_90,
        awayScore: prediction.away_score_90,
        jokerApplied: Boolean(prediction.joker_applied),
        updatedAt,
      }
    } else {
      knockoutPredictions[String(match.matchNumber)] = {
        ...knockoutPredictions[String(match.matchNumber)],
        homeScore: prediction.home_score_90,
        awayScore: prediction.away_score_90,
        advancingTeamId: prediction.advancing_tournament_team_id,
        decisionMethod: prediction.decision_method,
        jokerApplied: Boolean(prediction.joker_applied),
        updatedAt,
      }
    }
  }

  return {
    ...draft,
    revision: 0,
    groupPredictions,
    knockoutPredictions,
    updatedAt: accountBundle.updatedAt ?? draft.updatedAt,
  }
}

export function updatePredictionJourneyGroup(draft, input, options) {
  return updateGuestGroupPrediction(draft, input, options)
}

export function normaliseKnockoutDraftEdit(current, match, patch = {}) {
  const next = {
    ...current,
    ...patch,
  }

  if (!match?.participantsResolved) {
    return {
      ...next,
      advancingTeamId: null,
      decisionMethod: null,
    }
  }

  const hasScores = isScore(next.homeScore) && isScore(next.awayScore)
  if (!hasScores) return next

  if (next.homeScore !== next.awayScore) {
    return {
      ...next,
      advancingTeamId: next.homeScore > next.awayScore ? match.homeTeamId : match.awayTeamId,
      decisionMethod: DECISION_METHOD.NORMAL_TIME,
    }
  }

  const advancingTeamId = [match.homeTeamId, match.awayTeamId].includes(next.advancingTeamId)
    ? next.advancingTeamId
    : null
  const decisionMethod = [DECISION_METHOD.EXTRA_TIME, DECISION_METHOD.PENALTIES].includes(next.decisionMethod)
    ? next.decisionMethod
    : DECISION_METHOD.EXTRA_TIME

  return {
    ...next,
    advancingTeamId,
    decisionMethod,
  }
}

export function updatePredictionJourneyKnockout(draft, match, patch, options) {
  const current = draft.knockoutPredictions?.[String(match?.matchNumber)]
  if (!current) throw new TypeError('The knockout match is not part of this prediction draft')
  const next = normaliseKnockoutDraftEdit(current, match, patch)
  return updateGuestKnockoutPrediction(draft, {
    matchNumber: match.matchNumber,
    homeScore: next.homeScore,
    awayScore: next.awayScore,
    advancingTeamId: next.advancingTeamId,
    decisionMethod: next.decisionMethod,
    jokerApplied: next.jokerApplied,
  }, options)
}

export function buildPredictionJourneyRows(reference, draft) {
  assertReference(reference)
  const validation = validateGuestPredictionState(draft, reference)
  if (!validation.valid) throw new TypeError(validation.errors.join('; '))

  const preview = resolveGuestTournamentPreview(reference, draft)
  const rows = []

  for (const match of reference.groupMatches) {
    const row = draft.groupPredictions[String(match.matchNumber)]
    if (!isScore(row.homeScore) || !isScore(row.awayScore)) continue
    rows.push({
      match_id: match.matchId,
      predicted_home_tournament_team_id: match.homeTeamId,
      predicted_away_tournament_team_id: match.awayTeamId,
      home_score_90: row.homeScore,
      away_score_90: row.awayScore,
      advancing_tournament_team_id: null,
      decision_method: null,
      joker_applied: Boolean(row.jokerApplied),
    })
  }

  if (preview.completeness.groups.complete !== 36) return rows

  for (const match of reference.knockoutMatches) {
    const draftRow = draft.knockoutPredictions[String(match.matchNumber)]
    const bracketMatch = preview.resolution.knockout.byMatchNumber[match.matchNumber]
    if (!bracketMatch?.participantsResolved) continue

    const result = validateKnockoutPrediction({
      home_score: draftRow.homeScore,
      away_score: draftRow.awayScore,
      advancing_team_id: draftRow.advancingTeamId,
      decision_method: draftRow.decisionMethod,
    }, {
      homeTeamId: bracketMatch.homeTeamId,
      awayTeamId: bracketMatch.awayTeamId,
    })

    if (!result.valid) continue

    rows.push({
      match_id: match.matchId,
      predicted_home_tournament_team_id: bracketMatch.homeTeamId,
      predicted_away_tournament_team_id: bracketMatch.awayTeamId,
      home_score_90: draftRow.homeScore,
      away_score_90: draftRow.awayScore,
      advancing_tournament_team_id: draftRow.advancingTeamId,
      decision_method: draftRow.decisionMethod,
      joker_applied: Boolean(draftRow.jokerApplied),
    })
  }

  return rows
}

export function summarisePredictionJourney(reference, draft) {
  const preview = resolveGuestTournamentPreview(reference, draft)
  const rows = buildPredictionJourneyRows(reference, draft)
  return {
    preview,
    savableRows: rows.length,
    canSubmit: preview.completeness.overall.readyForAccountImport,
    groupComplete: preview.completeness.groups.complete,
    knockoutComplete: preview.completeness.knockout.complete,
    totalComplete: preview.completeness.overall.complete,
    remaining: preview.completeness.overall.remaining,
  }
}

export function clearStaleKnockoutSelections(reference, draft, { now } = {}) {
  const preview = resolveGuestTournamentPreview(reference, draft)
  const staleMatchNumbers = new Set(
    preview.diagnostics
      .filter(item => item.code === 'GUEST_KNOCKOUT_STALE_ADVANCING_TEAM' || item.code === 'GUEST_KNOCKOUT_BLOCKED')
      .map(item => item.matchNumber),
  )
  let next = draft

  for (const matchNumber of staleMatchNumbers) {
    next = updateGuestKnockoutPrediction(next, {
      matchNumber,
      homeScore: null,
      awayScore: null,
      advancingTeamId: null,
      decisionMethod: null,
      jokerApplied: false,
    }, { now })
  }

  return next
}

export function buildGuestReviewStorageKey(reference) {
  assertReference(reference)
  return `euro28:guest-review:${reference.tournamentId}:${reference.referenceVersion}`
}
