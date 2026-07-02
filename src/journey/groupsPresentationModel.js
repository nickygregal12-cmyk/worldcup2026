import { PREDICTION_AUTOSAVE_STATE } from './predictionJourneyConfig.js'

export function buildGroupProgress(reference, draft) {
  return reference.groups.map(group => {
    const matches = reference.groupMatches.filter(match => match.groupCode === group.code)
    const complete = matches.filter(match => {
      const row = draft.groupPredictions[String(match.matchNumber)]
      return row?.homeScore != null && row?.awayScore != null
    }).length
    return Object.freeze({ code: group.code, complete, total: matches.length, isComplete: complete === matches.length })
  })
}

export function deriveGroupMatchState({
  reviewMode,
  locked,
  hasGrace,
  active,
  autosaveStatus,
  context,
  complete,
}) {
  if (hasGrace) return 'grace'
  if (locked) return 'locked'
  if (reviewMode) return 'submitted'
  if (active) {
    if (context === 'guest') return 'local'
    if (Object.values(PREDICTION_AUTOSAVE_STATE).includes(autosaveStatus)) return autosaveStatus
  }
  return complete ? 'complete' : 'empty'
}

export function jokerControlLabel({ applied, disabled, capReached, started, reviewMode }) {
  if (applied) return 'Joker applied'
  if (!disabled) return 'Add joker'
  if (reviewMode) return 'Submitted'
  if (started) return 'Joker locked'
  if (capReached) return 'Joker limit reached'
  return 'Joker unavailable'
}
