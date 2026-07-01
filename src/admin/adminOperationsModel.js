export const ADMIN_MATCH_STATUS = Object.freeze([
  'scheduled',
  'live',
  'paused',
  'completed',
  'postponed',
  'cancelled',
  'abandoned',
])

export const ADMIN_RESULT_STATUS = Object.freeze([
  'pending',
  'confirmed',
  'manual_review',
  'void',
])

export const ADMIN_DECISION_METHOD = Object.freeze([
  'normal_time',
  'extra_time',
  'penalties',
])

const STORED_TO_ADMIN_METHOD = Object.freeze({
  regulation: 'normal_time',
  extra_time: 'extra_time',
  penalties: 'penalties',
  awarded: 'normal_time',
})

function optionalInteger(value) {
  if (value === '' || value === null || value === undefined) return null
  const number = Number(value)
  return Number.isInteger(number) ? number : Number.NaN
}

function assertNonNegativeInteger(value, label, errors, required = true) {
  const number = optionalInteger(value)
  if (number === null) {
    if (required) errors.push(`${label} is required.`)
    return null
  }
  if (!Number.isInteger(number) || number < 0) {
    errors.push(`${label} must be a whole number of zero or more.`)
    return null
  }
  return number
}

function normaliseTimestamp(value) {
  return value ? new Date(value).toISOString() : null
}

export function normaliseAdminAccess(value) {
  return Object.freeze({
    isAdmin: Boolean(value?.is_admin),
    adminRole: value?.admin_role ?? null,
    tournamentId: value?.tournament_id ?? null,
  })
}

export function normaliseAdminMatch(row) {
  return Object.freeze({
    matchId: row.match_id,
    matchNumber: Number(row.match_number),
    stageCode: row.stage_code,
    stageName: row.stage_name,
    groupCode: row.group_code ?? null,
    kickoffAt: normaliseTimestamp(row.kickoff_at),
    matchStatus: row.match_status,
    resultStatus: row.result_status,
    resultRevision: Number(row.result_revision ?? 0),
    homeTeamId: row.home_tournament_team_id ?? null,
    homeTeamLabel: row.home_team_label ?? 'TBC',
    awayTeamId: row.away_tournament_team_id ?? null,
    awayTeamLabel: row.away_team_label ?? 'TBC',
    homeScore90: row.home_score_90,
    awayScore90: row.away_score_90,
    homeScoreAet: row.home_score_aet,
    awayScoreAet: row.away_score_aet,
    homePenalties: row.home_penalties,
    awayPenalties: row.away_penalties,
    resultMethod: row.result_method ?? null,
    winnerTeamId: row.winner_tournament_team_id ?? null,
    resultSource: row.result_source ?? null,
    resultConfirmedAt: normaliseTimestamp(row.result_confirmed_at),
    updatedAt: normaliseTimestamp(row.updated_at),
  })
}

export function createAdminResultDraft(match) {
  return {
    matchStatus: match.matchStatus,
    resultStatus: match.resultStatus,
    decisionMethod: STORED_TO_ADMIN_METHOD[match.resultMethod] ?? 'normal_time',
    homeScore90: match.homeScore90 ?? '',
    awayScore90: match.awayScore90 ?? '',
    homeScoreAet: match.homeScoreAet ?? '',
    awayScoreAet: match.awayScoreAet ?? '',
    homePenalties: match.homePenalties ?? '',
    awayPenalties: match.awayPenalties ?? '',
    note: '',
  }
}

function deriveConfirmedWinner(match, draft, scores) {
  if (match.matchNumber <= 36) {
    if (scores.home90 === scores.away90) return null
    return scores.home90 > scores.away90 ? match.homeTeamId : match.awayTeamId
  }

  if (draft.decisionMethod === 'normal_time') {
    return scores.home90 > scores.away90 ? match.homeTeamId : match.awayTeamId
  }
  if (draft.decisionMethod === 'extra_time') {
    return scores.homeAet > scores.awayAet ? match.homeTeamId : match.awayTeamId
  }
  return scores.homePenalties > scores.awayPenalties ? match.homeTeamId : match.awayTeamId
}

export function validateAdminResultDraft(match, draft) {
  const errors = []
  const note = String(draft.note ?? '').trim().replace(/\s+/g, ' ')

  if (!ADMIN_MATCH_STATUS.includes(draft.matchStatus)) errors.push('Choose a valid match status.')
  if (!ADMIN_RESULT_STATUS.includes(draft.resultStatus)) errors.push('Choose a valid result status.')
  if (note.length < 5 || note.length > 500) errors.push('The audit note must be between 5 and 500 characters.')

  if (!match.homeTeamId || !match.awayTeamId || match.homeTeamId === match.awayTeamId) {
    errors.push('Both real match participants must be resolved before a result can be entered.')
  }

  if (draft.resultStatus === 'void' || draft.resultStatus === 'manual_review') {
    return Object.freeze({ valid: errors.length === 0, errors, note, scores: null, winnerTeamId: null })
  }

  if (!ADMIN_DECISION_METHOD.includes(draft.decisionMethod)) errors.push('Choose a valid decision method.')
  if (draft.resultStatus === 'confirmed' && draft.matchStatus !== 'completed') {
    errors.push('A confirmed result must have a completed match status.')
  }

  const home90 = assertNonNegativeInteger(draft.homeScore90, 'Home 90-minute score', errors)
  const away90 = assertNonNegativeInteger(draft.awayScore90, 'Away 90-minute score', errors)
  const isGroup = match.matchNumber <= 36
  let homeAet = null
  let awayAet = null
  let homePenalties = null
  let awayPenalties = null

  if (isGroup && draft.decisionMethod !== 'normal_time') {
    errors.push('Group results use normal-time scores only.')
  }

  if (!isGroup && draft.resultStatus === 'confirmed' && draft.decisionMethod === 'normal_time' && home90 === away90) {
    errors.push('A confirmed normal-time knockout result cannot be level.')
  }

  if (!isGroup && (draft.decisionMethod === 'extra_time' || draft.decisionMethod === 'penalties')) {
    if (draft.resultStatus === 'confirmed' && home90 !== null && away90 !== null && home90 !== away90) {
      errors.push('A match decided after normal time must be level after 90 minutes.')
    }
    homeAet = assertNonNegativeInteger(draft.homeScoreAet, 'Home score after extra time', errors)
    awayAet = assertNonNegativeInteger(draft.awayScoreAet, 'Away score after extra time', errors)

    if (homeAet !== null && home90 !== null && homeAet < home90) errors.push('Home score after extra time cannot be below the 90-minute score.')
    if (awayAet !== null && away90 !== null && awayAet < away90) errors.push('Away score after extra time cannot be below the 90-minute score.')

    if (draft.resultStatus === 'confirmed' && draft.decisionMethod === 'extra_time' && homeAet === awayAet) {
      errors.push('A confirmed extra-time result must have a winner before penalties.')
    }
  }

  if (!isGroup && draft.decisionMethod === 'penalties') {
    homePenalties = assertNonNegativeInteger(draft.homePenalties, 'Home penalty score', errors)
    awayPenalties = assertNonNegativeInteger(draft.awayPenalties, 'Away penalty score', errors)
    if (draft.resultStatus === 'confirmed' && homeAet !== null && awayAet !== null && homeAet !== awayAet) {
      errors.push('A penalty shoot-out requires the match to be level after extra time.')
    }
    if (draft.resultStatus === 'confirmed' && homePenalties === awayPenalties) {
      errors.push('A confirmed penalty shoot-out cannot finish level.')
    }
  }

  const scores = { home90, away90, homeAet, awayAet, homePenalties, awayPenalties }
  const winnerTeamId = draft.resultStatus === 'confirmed' && errors.length === 0
    ? deriveConfirmedWinner(match, draft, scores)
    : null

  return Object.freeze({ valid: errors.length === 0, errors, note, scores, winnerTeamId })
}

export function buildAdminResultPayload(match, draft) {
  const validation = validateAdminResultDraft(match, draft)
  if (!validation.valid) {
    throw new Error(validation.errors.join(' '))
  }

  if (draft.resultStatus === 'void' || draft.resultStatus === 'manual_review') {
    return Object.freeze({
      note: validation.note,
      payload: Object.freeze({
        match_status: draft.matchStatus,
        result_status: draft.resultStatus,
        normal_time_home_goals: null,
        normal_time_away_goals: null,
        after_extra_time_home_goals: null,
        after_extra_time_away_goals: null,
        penalty_home_goals: null,
        penalty_away_goals: null,
        decision_method: null,
        winner_tournament_team_id: null,
      }),
    })
  }

  const scores = validation.scores
  return Object.freeze({
    note: validation.note,
    payload: Object.freeze({
      match_status: draft.matchStatus,
      result_status: draft.resultStatus,
      normal_time_home_goals: scores.home90,
      normal_time_away_goals: scores.away90,
      after_extra_time_home_goals: scores.homeAet,
      after_extra_time_away_goals: scores.awayAet,
      penalty_home_goals: scores.homePenalties,
      penalty_away_goals: scores.awayPenalties,
      decision_method: draft.decisionMethod,
      winner_tournament_team_id: validation.winnerTeamId,
    }),
  })
}

export function normaliseAdminHistory(rows = []) {
  return Object.freeze(rows.map(row => Object.freeze({
    eventId: row.event_id,
    resultRevision: Number(row.result_revision),
    eventType: row.event_type,
    resultSource: row.result_source,
    recordedByUserId: row.recorded_by_user_id ?? null,
    recordedByDisplayName: row.recorded_by_display_name ?? 'System',
    adminNote: row.admin_note ?? null,
    snapshot: row.snapshot ?? {},
    createdAt: normaliseTimestamp(row.created_at),
  })))
}

export function normaliseScoringRuns(rows = []) {
  return Object.freeze(rows.map(row => Object.freeze({
    scoringRunId: row.scoring_run_id,
    triggerMatchId: row.trigger_match_id ?? null,
    triggerMatchNumber: row.trigger_match_number === null ? null : Number(row.trigger_match_number),
    runKey: row.run_key,
    status: row.status,
    startedAt: normaliseTimestamp(row.started_at),
    completedAt: normaliseTimestamp(row.completed_at),
    errorMessage: row.error_message ?? null,
  })))
}
