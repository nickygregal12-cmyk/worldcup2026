import { validateKnockoutPrediction } from '../contracts/predictionContract.js'
import {
  resolveEuro28Tournament,
  resolveKnockoutBracket,
  RESOLVER_CONTEXT,
} from '../resolver/index.js'
import { validateGuestPredictionState } from './guestPredictionState.js'

function isScore(value) {
  return Number.isInteger(value) && value >= 0 && value <= 99
}

function isEmptyKnockoutRow(row) {
  return row.homeScore == null &&
    row.awayScore == null &&
    row.advancingTeamId == null &&
    row.decisionMethod == null &&
    row.jokerApplied === false
}

function buildGroupInputs(reference, state) {
  return reference.groupMatches.map(match => {
    const draft = state.groupPredictions[String(match.matchNumber)]
    const complete = isScore(draft.homeScore) && isScore(draft.awayScore)
    return {
      ...match,
      context: RESOLVER_CONTEXT.GUEST,
      homeScore: complete ? draft.homeScore : null,
      awayScore: complete ? draft.awayScore : null,
    }
  })
}

function buildValidatedKnockoutDecisions(baseResolution, state) {
  const decisions = []
  const diagnostics = []

  for (let matchNumber = 37; matchNumber <= 51; matchNumber += 1) {
    const currentBracket = resolveKnockoutBracket({
      groupTables: baseResolution.groupTables,
      bestThirdAssignments: baseResolution.bestThird,
      knockoutDecisions: decisions,
    })
    const match = currentBracket.byMatchNumber[matchNumber]
    const draft = state.knockoutPredictions[String(matchNumber)]

    if (!draft.advancingTeamId) continue
    if (!match.participantsResolved) {
      diagnostics.push({ code: 'GUEST_KNOCKOUT_BLOCKED', matchNumber })
      continue
    }
    if (![match.homeTeamId, match.awayTeamId].includes(draft.advancingTeamId)) {
      diagnostics.push({
        code: 'GUEST_KNOCKOUT_STALE_ADVANCING_TEAM',
        matchNumber,
        advancingTeamId: draft.advancingTeamId,
      })
      continue
    }
    decisions.push({
      context: RESOLVER_CONTEXT.GUEST,
      matchNumber,
      advancingTeamId: draft.advancingTeamId,
    })
  }

  return { decisions, diagnostics }
}

function groupCompleteness(state) {
  const rows = Object.values(state.groupPredictions)
  const complete = rows.filter(row => isScore(row.homeScore) && isScore(row.awayScore)).length
  const empty = rows.filter(row => row.homeScore == null && row.awayScore == null && !row.jokerApplied).length
  return {
    total: rows.length,
    complete,
    partial: rows.length - complete - empty,
    empty,
  }
}

function knockoutCompleteness(state, bracket) {
  let complete = 0
  let partial = 0
  let empty = 0
  let blocked = 0
  let invalid = 0

  for (const match of bracket.matches) {
    const row = state.knockoutPredictions[String(match.matchNumber)]
    if (isEmptyKnockoutRow(row)) {
      empty += 1
      if (!match.participantsResolved) blocked += 1
      continue
    }
    if (!match.participantsResolved) {
      blocked += 1
      partial += 1
      continue
    }
    const validation = validateKnockoutPrediction({
      home_score: row.homeScore,
      away_score: row.awayScore,
      advancing_team_id: row.advancingTeamId,
      decision_method: row.decisionMethod,
    }, {
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
    })
    if (validation.valid) complete += 1
    else {
      partial += 1
      invalid += 1
    }
  }

  return {
    total: bracket.matches.length,
    complete,
    partial,
    empty,
    blocked,
    invalid,
  }
}

export function resolveGuestTournamentPreview(reference, state) {
  const stateValidation = validateGuestPredictionState(state, reference)
  if (!stateValidation.valid) throw new TypeError(stateValidation.errors.join('; '))
  if (reference.context !== RESOLVER_CONTEXT.GUEST) throw new TypeError('Guest reference context must be guest')

  const groupMatches = buildGroupInputs(reference, state)
  const baseResolution = resolveEuro28Tournament({
    context: RESOLVER_CONTEXT.GUEST,
    groups: reference.groups,
    groupMatches,
    knockoutDecisions: [],
  })
  const validated = buildValidatedKnockoutDecisions(baseResolution, state)
  const resolved = resolveEuro28Tournament({
    context: RESOLVER_CONTEXT.GUEST,
    groups: reference.groups,
    groupMatches,
    knockoutDecisions: validated.decisions,
  })

  const groups = groupCompleteness(state)
  const knockout = knockoutCompleteness(state, resolved.knockout)
  const complete = groups.complete + knockout.complete

  return {
    resolution: resolved,
    completeness: {
      groups,
      knockout,
      overall: {
        total: groups.total + knockout.total,
        complete,
        remaining: (groups.total + knockout.total) - complete,
        readyForAccountImport: complete === groups.total + knockout.total &&
          knockout.invalid === 0 && validated.diagnostics.length === 0,
      },
    },
    diagnostics: validated.diagnostics,
  }
}
