import {
  resolveEuro28Tournament,
  resolveKnockoutBracket,
  RESOLVER_CONTEXT,
} from '../resolver/index.js'
import { validateGuestPredictionState } from './guestPredictionState.js'

function isScore(value) {
  return Number.isInteger(value) && value >= 0 && value <= 99
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

function buildValidatedBracketDecisions(baseResolution, state) {
  const decisions = []
  const diagnostics = []

  for (let matchNumber = 37; matchNumber <= 51; matchNumber += 1) {
    const currentBracket = resolveKnockoutBracket({
      groupTables: baseResolution.groupTables,
      bestThirdAssignments: baseResolution.bestThird,
      knockoutDecisions: decisions,
    })
    const match = currentBracket.byMatchNumber[matchNumber]
    const draft = state.bracketPredictions[String(matchNumber)]

    if (!draft.advancingTeamId) continue
    if (!match.participantsResolved) {
      diagnostics.push({ code: 'GUEST_BRACKET_BLOCKED', matchNumber })
      continue
    }
    if (![match.homeTeamId, match.awayTeamId].includes(draft.advancingTeamId)) {
      diagnostics.push({
        code: 'GUEST_BRACKET_STALE_ADVANCING_TEAM',
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
  return { total: rows.length, complete, partial: rows.length - complete - empty, empty }
}

function bracketCompleteness(state, bracket) {
  let complete = 0
  let empty = 0
  let blocked = 0
  let invalid = 0

  for (const match of bracket.matches) {
    const row = state.bracketPredictions[String(match.matchNumber)]
    if (!row.advancingTeamId) {
      empty += 1
      if (!match.participantsResolved) blocked += 1
      continue
    }
    if (!match.participantsResolved) {
      blocked += 1
      invalid += 1
      continue
    }
    if ([match.homeTeamId, match.awayTeamId].includes(row.advancingTeamId)) complete += 1
    else invalid += 1
  }

  return {
    total: bracket.matches.length,
    complete,
    partial: invalid,
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
  const validated = buildValidatedBracketDecisions(baseResolution, state)
  const resolved = resolveEuro28Tournament({
    context: RESOLVER_CONTEXT.GUEST,
    groups: reference.groups,
    groupMatches,
    knockoutDecisions: validated.decisions,
  })

  const groups = groupCompleteness(state)
  const bracket = bracketCompleteness(state, resolved.knockout)
  const complete = groups.complete + bracket.complete

  return {
    resolution: resolved,
    completeness: {
      groups,
      bracket,
      // Compatibility key for existing callers during the Stage 8 transition.
      knockout: bracket,
      overall: {
        total: groups.total + bracket.total,
        complete,
        remaining: (groups.total + bracket.total) - complete,
        readyForAccountImport: complete === groups.total + bracket.total &&
          bracket.invalid === 0 && validated.diagnostics.length === 0,
      },
    },
    diagnostics: validated.diagnostics,
  }
}
