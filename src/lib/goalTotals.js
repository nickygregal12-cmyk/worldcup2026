export function matchGoalTotal(match) {
  const hasExtraTimeScore = ['et', 'penalties'].includes(match?.outcome_type)
    && match?.aet_home_score != null
    && match?.aet_away_score != null

  if (hasExtraTimeScore) {
    return Number(match.aet_home_score) + Number(match.aet_away_score)
  }

  return Number(match?.home_score || 0) + Number(match?.away_score || 0)
}

export function tournamentGoalTotal(matches = []) {
  return matches.reduce((total, match) => total + matchGoalTotal(match), 0)
}
