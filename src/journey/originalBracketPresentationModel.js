export const ORIGINAL_BRACKET_ROUNDS = Object.freeze([
  Object.freeze({ key: 'round_of_16', label: 'Round of 16', shortLabel: 'R16' }),
  Object.freeze({ key: 'quarter_final', label: 'Quarter-finals', shortLabel: 'QF' }),
  Object.freeze({ key: 'semi_final', label: 'Semi-finals', shortLabel: 'SF' }),
  Object.freeze({ key: 'final', label: 'Final', shortLabel: 'F' }),
])

export function describeBracketSlot(slot) {
  if (!slot) return 'To be confirmed'
  if (slot.sourceType === 'group_position') {
    const position = slot.position === 1 ? 'Winner' : slot.position === 2 ? 'Runner-up' : `${slot.position}th`
    return `${position} Group ${slot.groupCode}`
  }
  if (slot.sourceType === 'best_third') return 'Best third-placed team'
  if (slot.sourceType === 'match_winner') return `Winner Match ${slot.matchNumber}`
  return 'To be confirmed'
}

export function deriveOriginalBracketMatchState({ participantsResolved, selectedTeamId, disabled, hasGrace }) {
  if (!participantsResolved) return 'blocked'
  if (hasGrace) return selectedTeamId ? 'complete' : 'grace'
  if (disabled) return 'locked'
  return selectedTeamId ? 'complete' : 'empty'
}

export function buildOriginalBracketRoundProgress(preview) {
  return ORIGINAL_BRACKET_ROUNDS.map(round => {
    const matches = preview.resolution.knockout.matches.filter(match => match.stage === round.key)
    const complete = matches.filter(match => match.decisionResolved).length
    return Object.freeze({ ...round, complete, total: matches.length, isComplete: complete === matches.length })
  })
}

export function predictedChampion(preview, reference) {
  const teamId = preview.resolution.knockout.championTeamId
  return teamId ? reference.teamsById?.[teamId] ?? null : null
}
