import { EURO_SCORING_CONFIG } from '../config/scoringConfig.js'
import { buildLiveBracketRounds } from '../results/resultModel.js'
import { buildLiveSlotProjection, projectedSlotTeamId } from './liveSlotProjection.js'

export const BRACKET_HEALTH_STATE = Object.freeze({
  EXACT: 'exact',
  NEED: 'need',
  WINNER_ALIVE: 'winner_alive',
  ROUTE_CHANGED: 'route_changed',
  LOST: 'lost',
  SURVIVED: 'survived',
  ROUTE_CONFLICT: 'route_conflict',
  ORIGINAL_ONLY: 'original_only',
})

const ROUND_ORDER = Object.freeze(['round_of_16', 'quarter_final', 'semi_final', 'final'])
const ROUND_LABELS = Object.freeze({
  round_of_16: 'Round of 16',
  quarter_final: 'Quarter-finals',
  semi_final: 'Semi-finals',
  final: 'Final',
})

function teamSet(...ids) {
  return new Set(ids.filter(Boolean))
}

function sameTeams(left, right) {
  if (left.size !== right.size) return false
  return [...left].every(value => right.has(value))
}

function pointsForStage(stage) {
  return Number(EURO_SCORING_CONFIG.bracket?.[stage] ?? 0)
}

function resultByNumber(liveSnapshot) {
  return new Map((liveSnapshot?.results ?? []).map(result => [result.matchNumber, result]))
}

function knownLiveMatches(reference, liveSnapshot) {
  return buildLiveBracketRounds({ reference, liveSnapshot })
    .flatMap(round => round.matches.map(match => ({ ...match, stage: round.stage })))
}

// buildLiveBracketRounds deliberately withholds a knockout participant until its whole
// group is finished — the right call for Results, where a slot is either official or it
// is not. Health asks a different question ("who would be there if the groups ended
// now?"), so it overlays the resolver's projected occupant onto the slots the strict view
// leaves empty, and marks every one it touches.
//
// The strict list is still what eliminations and secured points are counted from. A
// projection can say who leads a group; it can never say a team is out.
function comparisonMatches(liveSnapshot, strictMatches, projection) {
  if (!projection.revealed) return strictMatches
  // Slot sources come from the resolver's own knockout output — the same place the strict
  // gate reads them from, so the two views can never disagree about what a slot IS.
  const sourceByNumber = new Map((liveSnapshot?.knockout?.matches ?? []).map(match => [match.matchNumber, match]))

  return strictMatches.map(match => {
    if (match.participantsResolved) return match
    const slots = sourceByNumber.get(match.matchNumber)
    if (!slots) return match

    const project = source => projectedSlotTeamId({ source, matchNumber: match.matchNumber, liveSnapshot, projection })
    const homeTeamId = match.homeTeamId ?? project(slots.home)
    const awayTeamId = match.awayTeamId ?? project(slots.away)
    // Half a projected tie is not a tie. Both sides must be known before the card can
    // compare anything, so a partially-projected fixture stays the original matchup.
    if (!homeTeamId || !awayTeamId) return match

    return { ...match, homeTeamId, awayTeamId, participantsResolved: true, participantsProjected: true }
  })
}

function eliminatedTeams(reference, liveSnapshot, liveMatches) {
  const eliminated = new Set()
  const groupsComplete = Object.values(liveSnapshot?.groups ?? {}).length > 0 &&
    Object.values(liveSnapshot.groups).every(table => table.completedMatchCount === 6)

  if (groupsComplete) {
    const qualified = new Set(
      liveMatches
        .filter(match => match.stage === 'round_of_16' && match.participantsResolved)
        .flatMap(match => [match.homeTeamId, match.awayTeamId])
        .filter(Boolean),
    )
    for (const teamId of Object.keys(reference?.teamsById ?? {})) {
      if (!qualified.has(teamId)) eliminated.add(teamId)
    }
  }

  for (const match of liveMatches) {
    if (!match.winnerTeamId || !match.participantsResolved) continue
    const loser = [match.homeTeamId, match.awayTeamId].find(teamId => teamId && teamId !== match.winnerTeamId)
    if (loser) eliminated.add(loser)
  }
  return eliminated
}

function labelFor(reference, teamId, fallback = 'TBC') {
  return reference?.teamsById?.[teamId]?.label ?? fallback
}

function routeConflictFor(predictedMatch, liveMatches) {
  const predictedTeams = teamSet(predictedMatch.homeTeamId, predictedMatch.awayTeamId)
  if (predictedTeams.size !== 2) return null
  const predictedIndex = ROUND_ORDER.indexOf(predictedMatch.stage)
  return liveMatches.find(match => {
    const liveIndex = ROUND_ORDER.indexOf(match.stage)
    return liveIndex >= 0 && liveIndex < predictedIndex && match.participantsResolved &&
      sameTeams(predictedTeams, teamSet(match.homeTeamId, match.awayTeamId))
  }) ?? null
}

function cardState({ reference, predictedMatch, liveMatch, result, eliminated, routeConflict }) {
  const selectedTeamId = predictedMatch.winnerTeamId
  const originalTeams = teamSet(predictedMatch.homeTeamId, predictedMatch.awayTeamId)

  if (routeConflict) {
    return {
      state: BRACKET_HEALTH_STATE.ROUTE_CONFLICT,
      tone: 'warning',
      title: 'Route conflict',
      description: `${labelFor(reference, predictedMatch.homeTeamId)} and ${labelFor(reference, predictedMatch.awayTeamId)} can now meet before this predicted fixture. At least one selection for this round is guaranteed to be lost.`,
    }
  }

  if (!liveMatch?.participantsResolved) {
    return {
      state: BRACKET_HEALTH_STATE.ORIGINAL_ONLY,
      tone: 'neutral',
      title: 'Original matchup',
      description: 'The real participants are not known yet, so this remains your original predicted fixture.',
    }
  }

  const liveTeams = teamSet(liveMatch.homeTeamId, liveMatch.awayTeamId)
  const exact = sameTeams(originalTeams, liveTeams)
  const selectedPresent = Boolean(selectedTeamId && liveTeams.has(selectedTeamId))
  const confirmedWinner = result?.confirmed ? result.winnerTeamId : null

  if (confirmedWinner) {
    if (confirmedWinner === selectedTeamId) {
      return {
        state: BRACKET_HEALTH_STATE.SURVIVED,
        tone: 'safe',
        title: exact ? 'Bracket pick survives' : 'Best result for your bracket',
        description: `${labelFor(reference, confirmedWinner)} advanced and keeps your saved winner for this fixture alive.`,
      }
    }
    return {
      state: BRACKET_HEALTH_STATE.LOST,
      tone: 'danger',
      title: 'Bracket pick lost',
      description: `${labelFor(reference, confirmedWinner)} advanced, so your saved winner for this fixture can no longer score.`,
    }
  }

  if (exact) {
    return {
      state: BRACKET_HEALTH_STATE.EXACT,
      tone: 'safe',
      title: 'Exact matchup still possible',
      description: `Both teams reached the fixture exactly as predicted. You need ${labelFor(reference, selectedTeamId)} to advance.`,
    }
  }

  if (selectedPresent) {
    return {
      state: BRACKET_HEALTH_STATE.NEED,
      tone: 'info',
      title: `Need ${labelFor(reference, selectedTeamId)}`,
      description: `${labelFor(reference, selectedTeamId)} must advance for your saved winner in this fixture to survive. The opponent has changed from your original bracket.`,
    }
  }

  if (selectedTeamId && !eliminated.has(selectedTeamId)) {
    return {
      state: BRACKET_HEALTH_STATE.ROUTE_CHANGED,
      tone: 'info',
      title: `${labelFor(reference, selectedTeamId)} still on track`,
      description: `${labelFor(reference, selectedTeamId)} remains alive in the tournament, but can no longer arrive in this exact fixture through the current route.`,
    }
  }

  return {
    state: BRACKET_HEALTH_STATE.LOST,
    tone: 'danger',
    title: 'Exact matchup lost',
    description: selectedTeamId
      ? `${labelFor(reference, selectedTeamId)} can no longer reach this fixture, so no points remain available from this saved pick.`
      : 'This original fixture can no longer occur.',
  }
}

export function buildOriginalBracketHealth({ reference, preview, liveSnapshot }) {
  if (!reference?.tournamentId || !preview?.resolution?.knockout) {
    throw new TypeError('A complete original prediction and Euro reference are required')
  }
  if (!liveSnapshot?.knockout) {
    return Object.freeze({ status: 'unavailable', rounds: Object.freeze([]), cards: Object.freeze([]) })
  }

  const projection = buildLiveSlotProjection(liveSnapshot)

  // Nothing to compare against until a group has reached its second round. Owner ruling
  // 2026-07-14: Bracket Health does not show at all before then.
  if (!projection.revealed) {
    return Object.freeze({ status: 'pending', projection, rounds: Object.freeze([]), cards: Object.freeze([]) })
  }

  const liveMatches = knownLiveMatches(reference, liveSnapshot)
  const projectedMatches = comparisonMatches(liveSnapshot, liveMatches, projection)
  const liveByNumber = new Map(projectedMatches.map(match => [match.matchNumber, match]))
  const results = resultByNumber(liveSnapshot)
  const eliminated = eliminatedTeams(reference, liveSnapshot, liveMatches)
  const predictedMatches = preview.resolution.knockout.matches
  // Reached — and therefore secured — is counted from the strict list only. A team the
  // standings project into the Round of 16 has not reached it.
  const liveReachedByStage = Object.fromEntries(ROUND_ORDER.map(stage => [
    stage,
    new Set(liveMatches.filter(match => match.stage === stage && match.participantsResolved)
      .flatMap(match => [match.homeTeamId, match.awayTeamId]).filter(Boolean)),
  ]))

  const cards = predictedMatches.map(predictedMatch => {
    const liveMatch = liveByNumber.get(predictedMatch.matchNumber) ?? null
    const result = results.get(predictedMatch.matchNumber) ?? null
    const routeConflict = routeConflictFor(predictedMatch, projectedMatches)
    const state = cardState({ reference, predictedMatch, liveMatch, result, eliminated, routeConflict })
    const points = pointsForStage(predictedMatch.stage)
    const matchReference = reference.knockoutMatches.find(match => match.matchNumber === predictedMatch.matchNumber)
    return Object.freeze({
      matchNumber: predictedMatch.matchNumber,
      matchId: matchReference?.matchId ?? null,
      stage: predictedMatch.stage,
      stageLabel: ROUND_LABELS[predictedMatch.stage],
      originalHomeTeamId: predictedMatch.homeTeamId,
      originalAwayTeamId: predictedMatch.awayTeamId,
      selectedTeamId: predictedMatch.winnerTeamId,
      liveHomeTeamId: liveMatch?.homeTeamId ?? null,
      liveAwayTeamId: liveMatch?.awayTeamId ?? null,
      liveParticipantsKnown: Boolean(liveMatch?.participantsResolved),
      // Projected from the standings so far, not an official fixture. The view must say so.
      liveParticipantsProjected: Boolean(liveMatch?.participantsProjected),
      score: liveMatch?.score ?? null,
      resultDetail: liveMatch?.detail ?? null,
      points,
      pointsSecured: state.state === BRACKET_HEALTH_STATE.SURVIVED ? points : 0,
      pointsAvailable: [BRACKET_HEALTH_STATE.EXACT, BRACKET_HEALTH_STATE.NEED].includes(state.state) ? points : 0,
      // Match Centre covers real fixtures. A projected tie has no match to open.
      matchCentreHref: liveMatch?.participantsResolved && !liveMatch?.participantsProjected
        ? `#/match-centre?match=${predictedMatch.matchNumber}&competition=original`
        : null,
      ...state,
    })
  })

  const rounds = ROUND_ORDER.map(stage => {
    const predictedTeams = new Set(preview.resolution.knockout.milestones?.[stage] ?? [])
    const reached = liveReachedByStage[stage]
    const secured = [...predictedTeams].filter(teamId => reached.has(teamId)).length
    const out = [...predictedTeams].filter(teamId => eliminated.has(teamId)).length
    const alive = Math.max(0, predictedTeams.size - out)
    const pointsEach = pointsForStage(stage)
    return Object.freeze({
      key: stage,
      label: ROUND_LABELS[stage],
      total: predictedTeams.size,
      alive,
      out,
      secured,
      healthPercent: predictedTeams.size ? Math.round((alive / predictedTeams.size) * 100) : 0,
      securedPoints: secured * pointsEach,
      remainingPoints: Math.max(0, alive - secured) * pointsEach,
    })
  })

  return Object.freeze({
    status: 'ready',
    projection,
    // True while any card is comparing against a projected occupant rather than an
    // official one — the whole panel is provisional until the groups finish.
    provisional: cards.some(card => card.liveParticipantsProjected),
    rounds: Object.freeze(rounds),
    cards: Object.freeze(cards),
  })
}
