import { BRACKET_WALL_TOPOLOGY } from './bracketWallTopology.js'

export const ORIGINAL_BRACKET_ROUNDS = Object.freeze([
  Object.freeze({ key: 'round_of_16', label: 'Round of 16', shortLabel: 'R16' }),
  Object.freeze({ key: 'quarter_final', label: 'Quarter-finals', shortLabel: 'QF' }),
  Object.freeze({ key: 'semi_final', label: 'Semi-finals', shortLabel: 'SF' }),
  Object.freeze({ key: 'final', label: 'Final', shortLabel: 'F' }),
])

/**
 * The seven lanes, derived — not declared (owner ruling 2026-07-13).
 *
 * These used to be a hand-written table that put R16 ties 37-40 in the left lane and 41-44 in the
 * right, by match number. The resolver pairs the quarter-finals 45<-39,37 46<-41,42 47<-44,43
 * 48<-40,38, so ties 41 and 42 feed a LEFT-side quarter-final and were being drawn on the right;
 * 38 and 40 were the mirror error. The chart was not a bracket. See bracketWallTopology.js — the
 * shape is now read off the resolver's own edges, so there is ONE placement source for this page
 * and the share image, and it cannot drift from the bracket it claims to draw.
 */
export const ORIGINAL_BRACKET_WALL_COLUMNS = BRACKET_WALL_TOPOLOGY.columns

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
  const placement = BRACKET_WALL_TOPOLOGY.placements.get(Number(matchNumber))
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
  const referenceByMatchNumber = new Map((reference.knockoutMatches ?? []).map(match => [match.matchNumber, match]))
  const ties = preview.resolution.knockout.matches.map(match => {
    const row = draft.bracketPredictions[String(match.matchNumber)] ?? { advancingTeamId: null }
    const stale = staleNumbers.has(match.matchNumber)
    const referenceMatch = referenceByMatchNumber.get(match.matchNumber)
    buildOriginalBracketWallPlacement(match.matchNumber) // throws if a knockout match has no approved wall-chart slot
    return Object.freeze({
      ...match,
      // The resolver definition carries no schedule/venue — EURO28_KNOCKOUT_MATCHES is match
      // number, stage and the two slot sources, nothing else — so all four fields come off the
      // reference row. Venue was sourced here and the schedule was not, which is why every KO
      // tie read "Date to be confirmed / Kick-off TBC" beside a correctly named stadium while
      // the reference had carried scheduled_date and kickoff_at all along.
      scheduledDate: match.scheduledDate ?? referenceMatch?.scheduledDate ?? null,
      kickoffAt: match.kickoffAt ?? referenceMatch?.kickoffAt ?? null,
      venueName: match.venueName ?? referenceMatch?.venueName ?? null,
      venueCity: match.venueCity ?? referenceMatch?.venueCity ?? null,
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
