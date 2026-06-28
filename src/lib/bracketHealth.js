export const BRACKET_STAGE_ORDER = ['r32', 'r16', 'qf', 'sf', 'final']
export const BRACKET_REACH_LABELS = ['Round of 32', 'Round of 16', 'quarter-finals', 'semi-finals', 'final', 'champion']

export function buildPredictedDepthByTeam({ allStages, knockoutPicks, getMatchTeams }) {
  const depth = new Map()
  ;(allStages || []).forEach((stage, stageIndex) => {
    ;(stage.matches || []).forEach(matchDef => {
      const { home, away } = getMatchTeams(matchDef) || {}
      ;[home, away].forEach(team => {
        if (!team?.id) return
        depth.set(team.id, Math.max(depth.get(team.id) ?? -1, stageIndex))
      })
      const winnerId = knockoutPicks?.[matchDef.match_number]?.winner_id
      if (winnerId) depth.set(winnerId, Math.max(depth.get(winnerId) ?? -1, stageIndex + 1))
    })
  })
  return depth
}

export function buildFixtureBracketHealth({
  fixture,
  stageKey,
  stageConfig,
  knockoutPicks,
  predictedDepthByTeam,
  getTeamById,
  getMatchTeams,
  advancePoints = 0,
}) {
  if (!fixture?.home_team?.id || !fixture?.away_team?.id) return null
  const activeStageIndex = Math.max(0, BRACKET_STAGE_ORDER.indexOf(stageKey))
  const savedWinnerId = knockoutPicks?.[fixture.match_number]?.winner_id || null
  const savedWinner = savedWinnerId ? getTeamById(savedWinnerId) : null
  const matchDef = stageConfig?.matches?.find(m => m.match_number === fixture.match_number) || null
  const originalMatchup = matchDef ? (getMatchTeams(matchDef) || {}) : {}
  const originalHome = originalMatchup.home || null
  const originalAway = originalMatchup.away || null
  const homeMatchesPick = savedWinnerId === fixture.home_team.id
  const awayMatchesPick = savedWinnerId === fixture.away_team.id
  const pickIsInFixture = homeMatchesPick || awayMatchesPick

  const homeDepth = predictedDepthByTeam.get(fixture.home_team.id) ?? -1
  const awayDepth = predictedDepthByTeam.get(fixture.away_team.id) ?? -1
  const homeHasFutureValue = homeDepth > activeStageIndex
  const awayHasFutureValue = awayDepth > activeStageIndex
  const homeFutureDepth = homeHasFutureValue ? homeDepth : -1
  const awayFutureDepth = awayHasFutureValue ? awayDepth : -1
  const preferredId = homeFutureDepth > awayFutureDepth ? fixture.home_team.id
    : awayFutureDepth > homeFutureDepth ? fixture.away_team.id
    : null

  const completed = ['completed', 'finished'].includes(String(fixture.status || '').toLowerCase())
  const winnerId = fixture.winner_team_id || (
    completed && fixture.home_score != null && fixture.away_score != null
      ? fixture.home_score > fixture.away_score ? fixture.home_team.id
        : fixture.away_score > fixture.home_score ? fixture.away_team.id
        : null
      : null
  )

  let tone = 'neutral'
  let label = 'No saved winner'
  let detail = 'You did not save a winner for this match.'
  let neededId = null

  if (savedWinnerId && pickIsInFixture) {
    neededId = savedWinnerId
    tone = 'need'
    const needed = savedWinner?.name || (homeMatchesPick ? fixture.home_team.name : fixture.away_team.name)
    label = `Need ${needed}`
    detail = `${needed} must advance for your saved winner in this exact fixture to survive.`
  } else if (savedWinnerId && !pickIsInFixture) {
    if (preferredId) {
      const preferredTeam = preferredId === fixture.home_team.id ? fixture.home_team : fixture.away_team
      const otherTeam = preferredId === fixture.home_team.id ? fixture.away_team : fixture.home_team
      const preferredDepth = preferredId === fixture.home_team.id ? homeDepth : awayDepth
      const otherDepth = preferredId === fixture.home_team.id ? awayDepth : homeDepth
      neededId = preferredId
      tone = 'partial'
      label = `Prefer ${preferredTeam.name}`
      detail = `${savedWinner?.name || 'Your selected team'} was your saved winner for M${fixture.match_number}, so that exact path is lost. ` +
        `${preferredTeam.name} is better for your remaining bracket because you predicted them to reach the ${BRACKET_REACH_LABELS[preferredDepth] || 'later rounds'}, ` +
        `while ${otherTeam.name} was only predicted to reach the ${BRACKET_REACH_LABELS[Math.max(otherDepth, 0)] || 'earlier rounds'}.`
    } else if (homeHasFutureValue && awayHasFutureValue && homeDepth === awayDepth) {
      tone = 'partial'
      label = 'Either result preserves the same value'
      detail = `${savedWinner?.name || 'Your selected team'} was your saved winner for M${fixture.match_number}, so that exact path is lost. ` +
        `Both official teams were predicted to progress as far as the ${BRACKET_REACH_LABELS[homeDepth] || 'same later round'}, so either winner preserves the same remaining bracket value.`
    } else {
      tone = 'out'
      label = 'No result helps your bracket'
      detail = `${savedWinner?.name || 'Your selected team'} was your saved winner for M${fixture.match_number}, but did not reach this official fixture. Neither official team has remaining value beyond this round in your predicted bracket.`
    }
  }

  let completedOutcome = null
  let pointsEffect = null

  if (completed) {
    const winnerTeam = winnerId === fixture.home_team.id ? fixture.home_team
      : winnerId === fixture.away_team.id ? fixture.away_team
      : null
    const loserTeam = winnerId === fixture.home_team.id ? fixture.away_team
      : winnerId === fixture.away_team.id ? fixture.home_team
      : null
    const winnerDepth = winnerId ? (predictedDepthByTeam.get(winnerId) ?? -1) : -1
    const loserDepth = loserTeam?.id ? (predictedDepthByTeam.get(loserTeam.id) ?? -1) : -1
    const winnerWasPredictedToAdvance = winnerDepth > activeStageIndex
    const loserWasPredictedToAdvance = loserDepth > activeStageIndex

    if (!winnerId) {
      tone = 'neutral'
      label = 'Result awaiting winner'
      detail = 'The match is marked complete, but the advancing team has not been recorded yet.'
      completedOutcome = 'pending'
    } else if (!savedWinnerId) {
      tone = winnerWasPredictedToAdvance ? 'partial' : 'neutral'
      label = winnerWasPredictedToAdvance ? 'Some bracket value remains' : 'No bracket impact'
      detail = winnerWasPredictedToAdvance
        ? `${winnerTeam?.name || 'The winner'} advanced and remains part of your predicted path.`
        : 'This result did not change your remaining bracket because no saved winner or later-round path depended on either team.'
      completedOutcome = winnerWasPredictedToAdvance ? 'value-remains' : 'no-impact'
      pointsEffect = winnerWasPredictedToAdvance ? advancePoints : 0
    } else if (pickIsInFixture && winnerId === savedWinnerId) {
      tone = 'safe'
      label = `Bracket pick survives${advancePoints ? ` · +${advancePoints} pts` : ''}`
      detail = `${savedWinner?.name || 'Your selected team'} advanced and keeps this exact part of your bracket alive.`
      completedOutcome = 'pick-survives'
      pointsEffect = advancePoints
    } else if (pickIsInFixture && winnerId) {
      tone = 'out'
      label = 'Bracket pick lost · 0 pts'
      detail = `${savedWinner?.name || 'Your selected team'} was your saved winner for M${fixture.match_number}, but ${winnerTeam?.name || 'the other team'} advanced.`
      completedOutcome = 'pick-lost'
      pointsEffect = 0
    } else if (!pickIsInFixture) {
      if (!winnerWasPredictedToAdvance && !loserWasPredictedToAdvance) {
        tone = 'neutral'
        label = 'No bracket impact'
        detail = `${savedWinner?.name || 'Your selected team'} did not reach this official fixture. Neither official team had remaining value beyond this round in your predicted bracket.`
        completedOutcome = 'no-impact'
        pointsEffect = 0
      } else if (winnerWasPredictedToAdvance && loserWasPredictedToAdvance && winnerDepth === loserDepth) {
        tone = 'partial'
        label = 'Equal-value result'
        detail = `${winnerTeam?.name || 'The winner'} advanced. Both official teams were predicted to reach the ${BRACKET_REACH_LABELS[winnerDepth] || 'same later round'}, so the result preserved the same maximum bracket value.`
        completedOutcome = 'equal-value'
        pointsEffect = advancePoints
      } else if (winnerWasPredictedToAdvance && winnerDepth > loserDepth) {
        tone = 'safe'
        label = 'Best result for your bracket'
        detail = `${winnerTeam?.name || 'The winner'} advanced and keeps your deeper ${BRACKET_REACH_LABELS[winnerDepth] || 'later-round'} prediction alive.`
        completedOutcome = 'best-result'
        pointsEffect = advancePoints
      } else if (loserWasPredictedToAdvance && loserDepth > winnerDepth) {
        tone = 'out'
        label = 'Deeper pick lost'
        detail = `${winnerTeam?.name || 'The winner'} advanced, but ${loserTeam?.name || 'the eliminated team'} was the side you predicted to progress further, reaching the ${BRACKET_REACH_LABELS[loserDepth] || 'later rounds'}.`
        completedOutcome = 'deeper-pick-lost'
        pointsEffect = winnerWasPredictedToAdvance ? advancePoints : 0
      } else if (winnerWasPredictedToAdvance) {
        tone = 'partial'
        label = 'Some bracket value remains'
        detail = `${winnerTeam?.name || 'The winner'} advanced and preserves part of your predicted path.`
        completedOutcome = 'value-remains'
        pointsEffect = advancePoints
      } else {
        tone = 'out'
        label = 'No bracket impact'
        detail = `${savedWinner?.name || 'Your selected team'} did not reach this official fixture, and the winner was not predicted to progress beyond this round.`
        completedOutcome = 'no-impact'
        pointsEffect = 0
      }
    }
  }

  return {
    fixture, matchDef, savedWinnerId, savedWinner, originalHome, originalAway,
    homeNeeded: homeMatchesPick, awayNeeded: awayMatchesPick,
    homeInRoundPath: homeHasFutureValue, awayInRoundPath: awayHasFutureValue,
    homeDepth, awayDepth, preferredId, activeStageIndex,
    neededId, tone, label, detail, completed, completedOutcome, pointsEffect, winnerId,
    reachLabels: BRACKET_REACH_LABELS,
  }
}

export function buildBracketHealthByStage({
  allStages,
  knockoutPicks,
  getMatchTeams,
  matches = [],
  isTeamOut,
}) {
  const stageOrder = BRACKET_STAGE_ORDER
  const defsByNumber = new Map((allStages || []).flatMap(stage => stage.matches || []).map(match => [match.match_number, match]))
  const realByNumber = new Map((matches || []).filter(match => match?.match_number).map(match => [match.match_number, match]))
  const candidateMemo = new Map()

  const completedWinnerFor = match => {
    if (!match) return null
    if (match.winner_team_id) return match.winner_team_id
    const completed = ['completed', 'finished'].includes(String(match.status || '').toLowerCase())
    if (!completed || match.home_score == null || match.away_score == null) return null
    if (match.home_score > match.away_score) return match.home_team_id || match.home_team?.id || null
    if (match.away_score > match.home_score) return match.away_team_id || match.away_team?.id || null
    return null
  }

  const candidateIdsForMatch = matchNumber => {
    if (candidateMemo.has(matchNumber)) return candidateMemo.get(matchNumber)
    const ids = new Set()
    const real = realByNumber.get(matchNumber)
    const completedWinner = completedWinnerFor(real)

    if (completedWinner) {
      ids.add(completedWinner)
      candidateMemo.set(matchNumber, ids)
      return ids
    }

    const realHomeId = real?.home_team_id || real?.home_team?.id
    const realAwayId = real?.away_team_id || real?.away_team?.id
    if (realHomeId) ids.add(realHomeId)
    if (realAwayId) ids.add(realAwayId)
    if (ids.size) {
      candidateMemo.set(matchNumber, ids)
      return ids
    }

    const def = defsByNumber.get(matchNumber)
    ;[def?.home_slot, def?.away_slot].forEach(slot => {
      const feeder = String(slot || '').match(/^[WL](\d+)$/)
      if (!feeder) return
      candidateIdsForMatch(Number(feeder[1])).forEach(id => ids.add(id))
    })

    candidateMemo.set(matchNumber, ids)
    return ids
  }

  const rows = (allStages || []).map((stage, stageIndex) => {
    const predictedTeams = new Map()
    ;(stage.matches || []).forEach(matchDef => {
      const matchup = getMatchTeams(matchDef) || {}
      ;[matchup.home, matchup.away].forEach(team => {
        if (team?.id) predictedTeams.set(team.id, team)
      })
    })

    const teamIds = [...predictedTeams.keys()]
    const outIds = teamIds.filter(id => isTeamOut?.(id))
    const aliveIds = teamIds.filter(id => !isTeamOut?.(id))

    let guaranteedLosses = 0
    const conflicts = []
    if (stageIndex > 0) {
      const previousStage = allStages[stageIndex - 1]
      ;(previousStage?.matches || []).forEach(previousMatch => {
        const candidates = [...candidateIdsForMatch(previousMatch.match_number)]
          .filter(id => aliveIds.includes(id))
        if (candidates.length > 1) {
          const losses = candidates.length - 1
          guaranteedLosses += losses
          conflicts.push({
            matchNumber: previousMatch.match_number,
            teamIds: candidates,
            losses,
            pointsLost: losses * Number(stage.points || 0),
          })
        }
      })
    }

    guaranteedLosses = Math.min(guaranteedLosses, aliveIds.length)
    const scoringPaths = Math.max(0, aliveIds.length - guaranteedLosses)
    const maxPoints = scoringPaths * Number(stage.points || 0)
    const healthPct = teamIds.length ? Math.round((aliveIds.length / teamIds.length) * 100) : 0

    return {
      stage: stage.key,
      label: stage.label,
      pointsPerTeam: Number(stage.points || 0),
      total: teamIds.length,
      alive: aliveIds.length,
      out: outIds.length,
      guaranteedLosses,
      scoringPaths,
      maxPoints,
      healthPct,
      teamIds,
      aliveIds,
      outIds,
      conflicts,
    }
  })

  return Object.fromEntries(rows.map(row => [row.stage, row]))
}
