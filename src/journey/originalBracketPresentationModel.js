export const ORIGINAL_BRACKET_ROUNDS = Object.freeze([
  Object.freeze({ key: 'round_of_16', label: 'Round of 16', shortLabel: 'R16' }),
  Object.freeze({ key: 'quarter_final', label: 'Quarter-finals', shortLabel: 'QF' }),
  Object.freeze({ key: 'semi_final', label: 'Semi-finals', shortLabel: 'SF' }),
  Object.freeze({ key: 'final', label: 'Final', shortLabel: 'F' }),
])

export const ORIGINAL_BRACKET_WALL_COLUMNS = Object.freeze([
  Object.freeze({ key: 'r16-left', label: 'Round of 16', shortLabel: 'R16', matchNumbers: Object.freeze([37, 38, 39, 40]), column: 1 }),
  Object.freeze({ key: 'qf-left', label: 'Quarter-finals', shortLabel: 'QF', matchNumbers: Object.freeze([45, 46]), column: 2 }),
  Object.freeze({ key: 'sf-left', label: 'Semi-final', shortLabel: 'SF', matchNumbers: Object.freeze([49]), column: 3 }),
  Object.freeze({ key: 'final-centre', label: 'Final', shortLabel: 'F', matchNumbers: Object.freeze([51]), column: 4 }),
  Object.freeze({ key: 'sf-right', label: 'Semi-final', shortLabel: 'SF', matchNumbers: Object.freeze([50]), column: 5 }),
  Object.freeze({ key: 'qf-right', label: 'Quarter-finals', shortLabel: 'QF', matchNumbers: Object.freeze([47, 48]), column: 6 }),
  Object.freeze({ key: 'r16-right', label: 'Round of 16', shortLabel: 'R16', matchNumbers: Object.freeze([41, 42, 43, 44]), column: 7 }),
])

const WALL_PLACEMENT = Object.freeze({
  37: Object.freeze({ column: 1, row: 2 }),
  38: Object.freeze({ column: 1, row: 4 }),
  39: Object.freeze({ column: 1, row: 6 }),
  40: Object.freeze({ column: 1, row: 8 }),
  45: Object.freeze({ column: 2, row: 3 }),
  46: Object.freeze({ column: 2, row: 7 }),
  49: Object.freeze({ column: 3, row: 5 }),
  51: Object.freeze({ column: 4, row: 5 }),
  50: Object.freeze({ column: 5, row: 5 }),
  47: Object.freeze({ column: 6, row: 3 }),
  48: Object.freeze({ column: 6, row: 7 }),
  41: Object.freeze({ column: 7, row: 2 }),
  42: Object.freeze({ column: 7, row: 4 }),
  43: Object.freeze({ column: 7, row: 6 }),
  44: Object.freeze({ column: 7, row: 8 }),
})

export function sourceCodeForBracketSlot(slot, preview, matchNumber) {
  if (!slot) return 'TBC'
  if (slot.sourceType === 'group_position') return `${slot.position}${slot.groupCode}`
  if (slot.sourceType === 'best_third') {
    const combination = preview?.resolution?.bestThird?.combinationKey
    const assignedGroup = preview?.resolution?.bestThird?.assignmentsByMatch?.[matchNumber]?.thirdPlaceGroup
    return combination ? `3${combination}` : assignedGroup ? `3${assignedGroup}` : '3A-F'
  }
  if (slot.sourceType === 'match_winner') return `W${slot.matchNumber}`
  return 'TBC'
}

export function describeBracketSlot(slot, context = {}) {
  if (!slot) return 'To be confirmed'
  if (slot.sourceType === 'group_position') {
    const position = slot.position === 1 ? 'Winner' : slot.position === 2 ? 'Runner-up' : `${slot.position}th`
    return `${position} Group ${slot.groupCode}`
  }
  if (slot.sourceType === 'best_third') {
    const sourceCode = sourceCodeForBracketSlot(slot, context.preview, context.matchNumber)
    if (/^3[A-F]+$/.test(sourceCode)) return `3rd ${sourceCode.slice(1).split('').join('/')}`
    return 'Best third-placed team'
  }
  if (slot.sourceType === 'match_winner') return `Winner Match ${slot.matchNumber}`
  return 'To be confirmed'
}

export function deriveOriginalBracketMatchState({ participantsResolved, selectedTeamId, disabled, hasGrace, stale }) {
  if (stale) return 'repick'
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

export function buildOriginalBracketWallPlacement(matchNumber) {
  const placement = WALL_PLACEMENT[Number(matchNumber)]
  if (!placement) throw new Error(`Unknown Original Bracket wall placement for match ${matchNumber}`)
  return placement
}

function staleMatchNumbers(preview) {
  return new Set((preview?.diagnostics ?? [])
    .filter(item => item.code === 'GUEST_BRACKET_STALE_ADVANCING_TEAM' || item.code === 'GUEST_BRACKET_BLOCKED')
    .map(item => Number(item.matchNumber)))
}

function teamFor(reference, teamId) {
  return teamId ? reference.teamsById?.[teamId] ?? null : null
}

function buildOriginalBracketSlot({ side, slot, teamId, selectedTeamId, reference, preview, matchNumber, stale }) {
  const team = teamFor(reference, teamId)
  const sourceCode = sourceCodeForBracketSlot(slot, preview, matchNumber)
  return Object.freeze({
    side,
    sourceCode,
    label: team?.label ?? describeBracketSlot(slot, { preview, matchNumber }),
    placeholderLabel: describeBracketSlot(slot, { preview, matchNumber }),
    teamId,
    team,
    unresolved: !teamId,
    selected: Boolean(teamId && selectedTeamId === teamId && !stale),
  })
}

export function buildOriginalBracketSurface({ reference, draft, preview }) {
  const staleNumbers = staleMatchNumbers(preview)
  const ties = preview.resolution.knockout.matches.map(match => {
    const row = draft.bracketPredictions[String(match.matchNumber)] ?? { advancingTeamId: null }
    const stale = staleNumbers.has(match.matchNumber)
    buildOriginalBracketWallPlacement(match.matchNumber) // throws if a knockout match has no approved wall-chart slot
    return Object.freeze({
      ...match,
      stale,
      selectedTeamId: row.advancingTeamId ?? null,
      slots: Object.freeze([
        buildOriginalBracketSlot({ side: 'home', slot: match.home, teamId: match.homeTeamId, selectedTeamId: row.advancingTeamId, reference, preview, matchNumber: match.matchNumber, stale }),
        buildOriginalBracketSlot({ side: 'away', slot: match.away, teamId: match.awayTeamId, selectedTeamId: row.advancingTeamId, reference, preview, matchNumber: match.matchNumber, stale }),
      ]),
    })
  })
  const tiesByMatchNumber = Object.fromEntries(ties.map(tie => [tie.matchNumber, tie]))
  const rounds = ORIGINAL_BRACKET_ROUNDS.map(round => {
    const roundTies = ties.filter(tie => tie.stage === round.key)
    const complete = roundTies.filter(tie => tie.decisionResolved && !tie.stale).length
    return Object.freeze({ ...round, complete, total: roundTies.length, ties: Object.freeze(roundTies), isComplete: complete === roundTies.length })
  })

  return Object.freeze({
    rounds: Object.freeze(rounds),
    ties: Object.freeze(ties),
    tiesByMatchNumber: Object.freeze(tiesByMatchNumber),
    wallColumns: ORIGINAL_BRACKET_WALL_COLUMNS,
  })
}
