export const MATCH_STATUS = Object.freeze({
  SCHEDULED: 'scheduled',
  LIVE: 'live',
  SUSPENDED: 'suspended',
  POSTPONED: 'postponed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  AWARDED: 'awarded',
})

export const RESULT_STATUS = Object.freeze({
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  VOID: 'void',
  MANUAL_REVIEW: 'manual_review',
})

export const DECISION_METHOD = Object.freeze({
  NORMAL_TIME: 'normal_time',
  EXTRA_TIME: 'extra_time',
  PENALTIES: 'penalties',
  ADMINISTRATIVE: 'administrative',
})

function isGoal(value) {
  return Number.isInteger(value) && value >= 0 && value <= 99
}

function winnerFromScore(homeGoals, awayGoals, homeTeamId, awayTeamId) {
  if (homeGoals > awayGoals) return homeTeamId
  if (awayGoals > homeGoals) return awayTeamId
  return null
}

function addGoalError(errors, value, field) {
  if (!isGoal(value)) errors.push(`${field} must be an integer from 0 to 99`)
}

/**
 * Validate the official score representation. Penalty shoot-out kicks are
 * deliberately stored separately and never added to the football score.
 */
export function validateOfficialResult(result, { isKnockout = false } = {}) {
  const errors = []
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is required'] }
  }

  const homeTeamId = result.home_team_id
  const awayTeamId = result.away_team_id
  if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId) {
    errors.push('two different resolved participants are required')
  }

  addGoalError(errors, result.normal_time_home_goals, 'normal_time_home_goals')
  addGoalError(errors, result.normal_time_away_goals, 'normal_time_away_goals')
  if (errors.length) return { valid: false, errors }

  const normalWinner = winnerFromScore(
    result.normal_time_home_goals,
    result.normal_time_away_goals,
    homeTeamId,
    awayTeamId,
  )

  if (!isKnockout) {
    if (result.decision_method !== DECISION_METHOD.NORMAL_TIME) {
      errors.push('group matches must use normal_time')
    }
    if (result.after_extra_time_home_goals != null || result.after_extra_time_away_goals != null) {
      errors.push('group matches cannot contain an extra-time score')
    }
    if (result.penalty_home_goals != null || result.penalty_away_goals != null) {
      errors.push('group matches cannot contain a penalty shoot-out score')
    }
    if ((result.winner_team_id ?? null) !== normalWinner) {
      errors.push('winner_team_id must match the normal-time result')
    }
    return { valid: errors.length === 0, errors }
  }

  if (result.decision_method === DECISION_METHOD.NORMAL_TIME) {
    if (!normalWinner) errors.push('a knockout match decided in normal time cannot be drawn')
    if (result.after_extra_time_home_goals != null || result.after_extra_time_away_goals != null) {
      errors.push('normal-time decisions cannot contain an extra-time score')
    }
    if (result.penalty_home_goals != null || result.penalty_away_goals != null) {
      errors.push('normal-time decisions cannot contain a penalty shoot-out score')
    }
    if ((result.winner_team_id ?? null) !== normalWinner) {
      errors.push('winner_team_id must match the normal-time winner')
    }
  } else if (result.decision_method === DECISION_METHOD.EXTRA_TIME) {
    if (normalWinner) errors.push('extra time requires a draw at the end of normal time')
    addGoalError(errors, result.after_extra_time_home_goals, 'after_extra_time_home_goals')
    addGoalError(errors, result.after_extra_time_away_goals, 'after_extra_time_away_goals')
    if (!errors.length) {
      if (result.after_extra_time_home_goals < result.normal_time_home_goals ||
          result.after_extra_time_away_goals < result.normal_time_away_goals) {
        errors.push('the score after extra time cannot reduce the normal-time score')
      }
      const extraTimeWinner = winnerFromScore(
        result.after_extra_time_home_goals,
        result.after_extra_time_away_goals,
        homeTeamId,
        awayTeamId,
      )
      if (!extraTimeWinner) errors.push('an extra-time decision must have a winner')
      if ((result.winner_team_id ?? null) !== extraTimeWinner) {
        errors.push('winner_team_id must match the score after extra time')
      }
    }
    if (result.penalty_home_goals != null || result.penalty_away_goals != null) {
      errors.push('an extra-time decision cannot contain a penalty shoot-out score')
    }
  } else if (result.decision_method === DECISION_METHOD.PENALTIES) {
    if (normalWinner) errors.push('penalties require a draw at the end of normal time')
    addGoalError(errors, result.after_extra_time_home_goals, 'after_extra_time_home_goals')
    addGoalError(errors, result.after_extra_time_away_goals, 'after_extra_time_away_goals')
    addGoalError(errors, result.penalty_home_goals, 'penalty_home_goals')
    addGoalError(errors, result.penalty_away_goals, 'penalty_away_goals')
    if (!errors.length) {
      if (result.after_extra_time_home_goals < result.normal_time_home_goals ||
          result.after_extra_time_away_goals < result.normal_time_away_goals) {
        errors.push('the score after extra time cannot reduce the normal-time score')
      }
      if (result.after_extra_time_home_goals !== result.after_extra_time_away_goals) {
        errors.push('a penalty shoot-out requires the score after extra time to be level')
      }
      const shootoutWinner = winnerFromScore(
        result.penalty_home_goals,
        result.penalty_away_goals,
        homeTeamId,
        awayTeamId,
      )
      if (!shootoutWinner) errors.push('a completed penalty shoot-out cannot be level')
      if ((result.winner_team_id ?? null) !== shootoutWinner) {
        errors.push('winner_team_id must match the penalty shoot-out winner')
      }
    }
  } else {
    errors.push('decision_method is not valid for automatic knockout scoring')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Return only a confirmed, completed result that is safe to score.
 * Suspended, postponed, awarded and administratively decided matches remain
 * unscored until an explicit later policy resolves them.
 */
export function getScoreableResult(result, { isKnockout = false } = {}) {
  if (!result || typeof result !== 'object') {
    return { scoreable: false, reason: 'missing_result', result: null }
  }
  if (result.match_status !== MATCH_STATUS.COMPLETED) {
    return { scoreable: false, reason: 'match_not_completed', result: null }
  }
  if (result.result_status !== RESULT_STATUS.CONFIRMED) {
    return { scoreable: false, reason: 'result_not_confirmed', result: null }
  }
  if (result.decision_method === DECISION_METHOD.ADMINISTRATIVE) {
    return { scoreable: false, reason: 'manual_review_required', result: null }
  }

  const validation = validateOfficialResult(result, { isKnockout })
  if (!validation.valid) {
    return { scoreable: false, reason: 'invalid_result', errors: validation.errors, result: null }
  }

  return {
    scoreable: true,
    reason: 'confirmed_result',
    result: Object.freeze({
      normalTimeHomeGoals: result.normal_time_home_goals,
      normalTimeAwayGoals: result.normal_time_away_goals,
      advancingTeamId: isKnockout ? result.winner_team_id : null,
      decisionMethod: result.decision_method,
    }),
  }
}
