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

  if (completed) {
    if (!savedWinnerId) {
      tone = 'neutral'; label = 'No saved winner'; detail = 'This finished result did not have a saved winner to compare.'
    } else if (pickIsInFixture && winnerId === savedWinnerId) {
      tone = 'safe'; label = 'Your pick advanced'; detail = `${savedWinner?.name || 'Your selected team'} advanced and this exact part of your bracket remains alive.`
    } else if (pickIsInFixture && winnerId) {
      tone = 'out'; label = 'Your pick was eliminated'; detail = `${savedWinner?.name || 'Your selected team'} did not advance.`
    } else if (!pickIsInFixture) {
      const winnerDepth = winnerId ? (predictedDepthByTeam.get(winnerId) ?? -1) : -1
      const loserId = winnerId === fixture.home_team.id ? fixture.away_team.id : fixture.home_team.id
      const loserDepth = predictedDepthByTeam.get(loserId) ?? -1
      const winnerTeam = winnerId === fixture.home_team.id ? fixture.home_team : winnerId === fixture.away_team.id ? fixture.away_team : null
      tone = winnerDepth > activeStageIndex ? 'partial' : 'out'
      label = winnerDepth > activeStageIndex && winnerDepth > loserDepth ? 'Best available result' : winnerDepth > activeStageIndex ? 'Some bracket value remains' : 'No bracket value remains'
      detail = `${savedWinner?.name || 'Your selected team'} did not reach this official fixture.`
      detail += winnerTeam && winnerDepth > activeStageIndex
        ? ` ${winnerTeam.name} advanced and preserves the path you had predicted as far as the ${BRACKET_REACH_LABELS[winnerDepth] || 'later rounds'}.`
        : ' The result does not preserve another predicted path.'
    }
  }

  return {
    fixture, matchDef, savedWinnerId, savedWinner, originalHome, originalAway,
    homeNeeded: homeMatchesPick, awayNeeded: awayMatchesPick,
    homeInRoundPath: homeHasFutureValue, awayInRoundPath: awayHasFutureValue,
    homeDepth, awayDepth, preferredId, activeStageIndex,
    neededId, tone, label, detail, completed,
    reachLabels: BRACKET_REACH_LABELS,
  }
}
