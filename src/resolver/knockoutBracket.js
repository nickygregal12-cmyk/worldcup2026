import {
  EURO28_KNOCKOUT_MATCHES,
} from './euro28ResolverConfig.js'

function getGroupPositionTeamId(groupTables, groupCode, position) {
  const table = groupTables?.[groupCode]
  const row = table?.rows?.find(candidate => candidate.rank === position) ?? table?.rows?.[position - 1]
  return row?.teamId ?? null
}

function resolveSlot(slot, matchNumber, groupTables, bestThirdAssignments, resolvedWinners) {
  if (slot.sourceType === 'group_position') {
    return getGroupPositionTeamId(groupTables, slot.groupCode, slot.position)
  }

  if (slot.sourceType === 'best_third') {
    return bestThirdAssignments?.assignmentsByMatch?.[matchNumber]?.teamId ?? null
  }

  if (slot.sourceType === 'match_winner') {
    return resolvedWinners.get(slot.matchNumber) ?? null
  }

  throw new TypeError(`Unsupported knockout slot source ${slot.sourceType}`)
}

function uniqueTeamIds(matches) {
  const seen = new Set()
  const teamIds = []

  for (const match of matches) {
    for (const teamId of [match.homeTeamId, match.awayTeamId]) {
      if (teamId && !seen.has(teamId)) {
        seen.add(teamId)
        teamIds.push(teamId)
      }
    }
  }

  return teamIds
}

function normaliseDecision(decision) {
  const matchNumber = Number(decision?.matchNumber)
  const advancingTeamId = decision?.advancingTeamId ?? null

  if (!Number.isInteger(matchNumber)) throw new TypeError('Every knockout decision requires an integer matchNumber')
  if (!advancingTeamId) throw new TypeError(`Knockout decision ${matchNumber} requires advancingTeamId`)
  return { ...decision, matchNumber, advancingTeamId }
}

export function resolveKnockoutBracket({
  groupTables,
  bestThirdAssignments,
  knockoutDecisions = [],
}) {
  if (!Array.isArray(knockoutDecisions)) throw new TypeError('knockoutDecisions must be an array')

  const decisionByMatch = new Map()
  for (const decisionInput of knockoutDecisions) {
    const decision = normaliseDecision(decisionInput)
    if (decisionByMatch.has(decision.matchNumber)) {
      throw new TypeError(`Duplicate knockout decision for match ${decision.matchNumber}`)
    }
    decisionByMatch.set(decision.matchNumber, decision)
  }

  const resolvedWinners = new Map()
  const matches = []
  const issues = []

  for (const definition of EURO28_KNOCKOUT_MATCHES) {
    const homeTeamId = resolveSlot(
      definition.home,
      definition.matchNumber,
      groupTables,
      bestThirdAssignments,
      resolvedWinners,
    )
    const awayTeamId = resolveSlot(
      definition.away,
      definition.matchNumber,
      groupTables,
      bestThirdAssignments,
      resolvedWinners,
    )
    const decision = decisionByMatch.get(definition.matchNumber)
    let winnerTeamId = null

    if (decision) {
      if (!homeTeamId || !awayTeamId) {
        issues.push({
          code: 'DECISION_BEFORE_PARTICIPANTS',
          matchNumber: definition.matchNumber,
          advancingTeamId: decision.advancingTeamId,
          message: 'The advancing-team decision cannot be applied until both participants resolve.',
        })
      } else if (![homeTeamId, awayTeamId].includes(decision.advancingTeamId)) {
        throw new TypeError(
          `Knockout decision ${definition.matchNumber} selected ${decision.advancingTeamId}, which is not a participant`,
        )
      } else {
        winnerTeamId = decision.advancingTeamId
        resolvedWinners.set(definition.matchNumber, winnerTeamId)
      }
    }

    matches.push({
      ...definition,
      homeTeamId,
      awayTeamId,
      participantsResolved: Boolean(homeTeamId && awayTeamId),
      winnerTeamId,
      decisionResolved: Boolean(winnerTeamId),
    })
  }

  const byMatchNumber = Object.fromEntries(matches.map(match => [match.matchNumber, match]))
  const roundOf16 = matches.filter(match => match.stage === 'round_of_16')
  const quarterFinals = matches.filter(match => match.stage === 'quarter_final')
  const semiFinals = matches.filter(match => match.stage === 'semi_final')
  const final = matches.filter(match => match.stage === 'final')
  const championTeamId = byMatchNumber[51]?.winnerTeamId ?? null

  return {
    matches,
    byMatchNumber,
    championTeamId,
    milestones: {
      round_of_16: uniqueTeamIds(roundOf16),
      quarter_final: uniqueTeamIds(quarterFinals),
      semi_final: uniqueTeamIds(semiFinals),
      final: uniqueTeamIds(final),
      champion: championTeamId ? [championTeamId] : [],
    },
    issues,
  }
}
