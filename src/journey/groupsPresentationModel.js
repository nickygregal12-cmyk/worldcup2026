import { rankBestThirdTeams } from '../resolver/bestThird.js'
import { resolveGroupTable } from '../resolver/groupStandings.js'
import { PREDICTION_AUTOSAVE_STATE } from './predictionJourneyConfig.js'

export const GROUPS_VIEW_MODE = Object.freeze({
  GROUP: 'group',
  DATE: 'date',
})

export const GROUPS_TABLE_KEY = Object.freeze({
  THIRD_PLACE: 'third-place',
})

function predictedMatch(match, draft) {
  const row = draft.groupPredictions[String(match.matchNumber)] ?? {}
  const homeScore = row.homeScore ?? null
  const awayScore = row.awayScore ?? null
  const completeScore = homeScore != null && awayScore != null
  return {
    ...match,
    homeScore: completeScore ? homeScore : null,
    awayScore: completeScore ? awayScore : null,
  }
}

function compareGroupMatches(left, right) {
  const leftDate = left.scheduledDate ?? '9999-12-31'
  const rightDate = right.scheduledDate ?? '9999-12-31'
  return leftDate.localeCompare(rightDate) || left.matchNumber - right.matchNumber
}

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

export function buildGroupDateSections(reference) {
  const sections = new Map()
  for (const match of [...reference.groupMatches].sort(compareGroupMatches)) {
    const key = match.scheduledDate ?? 'date-tbc'
    if (!sections.has(key)) {
      sections.set(key, {
        key,
        date: match.scheduledDate ?? null,
        label: match.scheduledDate ? 'Matchday' : 'Schedule pending',
        matches: [],
      })
    }
    sections.get(key).matches.push(match)
  }
  return Object.freeze([...sections.values()].map(section => Object.freeze({
    ...section,
    matches: Object.freeze(section.matches),
  })))
}

export function buildPredictedGroupTables(reference, draft) {
  const tables = Object.fromEntries(reference.groups.map(group => {
    const matches = reference.groupMatches
      .filter(match => match.groupCode === group.code)
      .map(match => predictedMatch(match, draft))
    return [group.code, resolveGroupTable({ groupCode: group.code, teams: group.teams, matches })]
  }))
  return Object.freeze(tables)
}

export function buildGroupsTablesSheetModel(reference, draft) {
  const groupTables = buildPredictedGroupTables(reference, draft)
  const bestThird = rankBestThirdTeams(groupTables)
  return Object.freeze({
    groups: Object.freeze(reference.groups.map(group => Object.freeze({ code: group.code, table: groupTables[group.code] }))),
    bestThird,
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
