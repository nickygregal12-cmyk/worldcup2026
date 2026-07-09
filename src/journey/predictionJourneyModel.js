import {
  PREDICTION_ROW_KIND,
  validatePredictionBundleShape,
} from '../contracts/predictionDatabaseContract.js'
import {
  createGuestPredictionState,
  resolveGuestTournamentPreview,
  updateGuestBracketPrediction,
  updateGuestGroupPrediction,
  validateGuestPredictionState,
} from '../guest/index.js'
import { EURO_SCORING_CONFIG } from '../config/scoringConfig.js'

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
  const bracketPredictions = cloneRows(draft.bracketPredictions)

  for (const prediction of accountBundle.predictions) {
    const match = matchById.get(prediction.match_id)
    if (!match) continue
    const updatedAt = prediction.updated_at ?? accountBundle.updatedAt ?? null

    if (prediction.prediction_kind === PREDICTION_ROW_KIND.GROUP_SCORE || match.matchNumber <= 36) {
      groupPredictions[String(match.matchNumber)] = {
        ...groupPredictions[String(match.matchNumber)],
        homeScore: prediction.home_score_90,
        awayScore: prediction.away_score_90,
        jokerApplied: Boolean(prediction.joker_applied),
        updatedAt,
      }
    } else {
      bracketPredictions[String(match.matchNumber)] = {
        ...bracketPredictions[String(match.matchNumber)],
        advancingTeamId: prediction.advancing_tournament_team_id,
        updatedAt,
      }
    }
  }

  return {
    ...draft,
    revision: 0,
    groupPredictions,
    bracketPredictions,
    updatedAt: accountBundle.updatedAt ?? draft.updatedAt,
  }
}

export function updatePredictionJourneyGroup(draft, input, options = {}) {
  const nextJoker = input?.jokerApplied
  if (nextJoker === true) {
    // The cap mirrors the database ruleset when loaded; central config is the labelled fallback.
    const groupJokerCap = options.groupJokerCap ?? EURO_SCORING_CONFIG.joker.GROUP_STAGE_CAP
    const currentCount = Object.values(draft.groupPredictions).filter(row => row.jokerApplied).length
    const current = draft.groupPredictions?.[String(input.matchNumber)]
    if (!current?.jokerApplied && currentCount >= groupJokerCap) {
      throw new TypeError(`Only ${groupJokerCap} group-stage jokers are allowed`)
    }
  }
  return updateGuestGroupPrediction(draft, input, options)
}

export function updatePredictionJourneyBracket(draft, match, advancingTeamId, options) {
  if (!match?.participantsResolved) throw new TypeError('Complete the earlier predictions that feed this bracket match')
  if (advancingTeamId != null && ![match.homeTeamId, match.awayTeamId].includes(advancingTeamId)) {
    throw new TypeError('The bracket winner must be one of the predicted participants')
  }
  return updateGuestBracketPrediction(draft, {
    matchNumber: match.matchNumber,
    advancingTeamId: advancingTeamId || null,
  }, options)
}

export function clearDisconnectedBracketSelections(reference, draft, { changedMatchNumber = 36, now } = {}) {
  let next = draft
  let changed = true

  while (changed) {
    changed = false
    const preview = resolveGuestTournamentPreview(reference, next)
    for (const match of preview.resolution.knockout.matches) {
      if (match.matchNumber <= changedMatchNumber) continue
      const row = next.bracketPredictions[String(match.matchNumber)]
      if (!row?.advancingTeamId) continue
      const stillFed = match.participantsResolved && [match.homeTeamId, match.awayTeamId].includes(row.advancingTeamId)
      if (stillFed) continue
      next = updateGuestBracketPrediction(next, {
        matchNumber: match.matchNumber,
        advancingTeamId: null,
      }, { now })
      changed = true
    }
  }

  return next
}

// Compatibility alias while Stage 7 callers are replaced.
export const updatePredictionJourneyKnockout = (draft, match, patch, options) => (
  updatePredictionJourneyBracket(draft, match, patch?.advancingTeamId ?? null, options)
)

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
      prediction_kind: PREDICTION_ROW_KIND.GROUP_SCORE,
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
    const draftRow = draft.bracketPredictions[String(match.matchNumber)]
    const bracketMatch = preview.resolution.knockout.byMatchNumber[match.matchNumber]
    if (!bracketMatch?.participantsResolved || !draftRow.advancingTeamId) continue
    if (![bracketMatch.homeTeamId, bracketMatch.awayTeamId].includes(draftRow.advancingTeamId)) continue

    rows.push({
      prediction_kind: PREDICTION_ROW_KIND.BRACKET_PICK,
      match_id: match.matchId,
      predicted_home_tournament_team_id: bracketMatch.homeTeamId,
      predicted_away_tournament_team_id: bracketMatch.awayTeamId,
      home_score_90: null,
      away_score_90: null,
      advancing_tournament_team_id: draftRow.advancingTeamId,
      decision_method: null,
      joker_applied: false,
    })
  }

  const result = validatePredictionBundleShape({
    tournament_id: reference.tournamentId,
    expected_revision: 0,
    matches: rows,
  })
  if (!result.valid) throw new TypeError(result.errors.join('; '))
  return rows
}

export function summarisePredictionJourney(reference, draft, scoring = null) {
  const scoringValues = scoring?.values ?? EURO_SCORING_CONFIG
  const preview = resolveGuestTournamentPreview(reference, draft)
  const rows = buildPredictionJourneyRows(reference, draft)
  const groupJokers = Object.values(draft.groupPredictions).filter(row => row.jokerApplied).length
  return {
    preview,
    savableRows: rows.length,
    canSubmit: preview.completeness.overall.readyForAccountImport,
    groupComplete: preview.completeness.groups.complete,
    bracketComplete: preview.completeness.bracket.complete,
    knockoutComplete: preview.completeness.bracket.complete,
    totalComplete: preview.completeness.overall.complete,
    remaining: preview.completeness.overall.remaining,
    groupJokers,
    groupJokerCap: scoringValues.joker.GROUP_STAGE_CAP,
    groupJokerMultiplier: scoringValues.joker.MULTIPLIER,
  }
}

export function buildOriginalPredictionLifecycle(reference, lifecycle, summary) {
  assertReference(reference)
  const lockLabel = lifecycle?.predictionLockedAt
    ? 'Locked by persisted tournament control'
    : lifecycle?.locked
      ? 'Central prediction lock reached'
      : lifecycle?.predictionLockAt
        ? 'Editable until the central prediction lock'
        : 'Prediction lock not configured'
  const groupsComplete = Number(summary?.groupComplete ?? 0)
  const bracketComplete = Number(summary?.bracketComplete ?? 0)
  const groupsTotal = reference.groupMatches.length
  const bracketTotal = reference.knockoutMatches.length
  const bracketOpen = groupsComplete === groupsTotal
  const complete = groupsComplete + bracketComplete
  const total = groupsTotal + bracketTotal

  return Object.freeze({
    lockLabel,
    lockTone: lifecycle?.locked ? 'warning' : lifecycle?.predictionLockAt ? 'safe' : 'danger',
    source: lifecycle?.source ?? 'unconfigured',
    provisional: Boolean(lifecycle?.provisional),
    locked: Boolean(lifecycle?.locked),
    groupsLabel: `${groupsComplete}/${groupsTotal} group scores`,
    bracketLabel: bracketOpen
      ? `${bracketComplete}/${bracketTotal} winner-only bracket picks`
      : 'Complete all group scores to open the bracket',
    bracketOpen,
    koBoundaryLabel: 'KO Predictor is a separate real-fixture competition',
    progressLabel: `${complete}/${total} Original Predictor selections`,
  })
}

export function clearStaleBracketSelections(reference, draft, { now } = {}) {
  const preview = resolveGuestTournamentPreview(reference, draft)
  const staleMatchNumbers = new Set(
    preview.diagnostics
      .filter(item => item.code === 'GUEST_BRACKET_STALE_ADVANCING_TEAM' || item.code === 'GUEST_BRACKET_BLOCKED')
      .map(item => item.matchNumber),
  )
  let next = draft
  for (const matchNumber of staleMatchNumbers) {
    next = updateGuestBracketPrediction(next, { matchNumber, advancingTeamId: null }, { now })
  }
  return next
}

export const clearStaleKnockoutSelections = clearStaleBracketSelections

export function buildGuestReviewStorageKey(reference) {
  assertReference(reference)
  return `euro28:guest-review:${reference.tournamentId}:${reference.referenceVersion}`
}
