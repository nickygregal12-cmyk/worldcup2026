import { EURO28_KNOCKOUT_MATCHES } from '../resolver/index.js'
import { APP_ROUTE, destinationForRoute } from './appRoutes.js'

export const NAVIGATION_PHASE = Object.freeze({
  GROUPS_PRIMARY: 'groups_primary',
  KO_EARLY_ACCESS: 'ko_early_access',
  KO_PRIMARY: 'ko_primary',
})

export const ROUND_OF_16_MATCH_NUMBERS = Object.freeze(
  EURO28_KNOCKOUT_MATCHES
    .filter(match => match.stage === 'round_of_16')
    .map(match => match.matchNumber),
)

const ROUND_OF_16_MATCH_NUMBER_SET = new Set(ROUND_OF_16_MATCH_NUMBERS)

function isResolvedFixture(match) {
  return Boolean(
    match &&
    ROUND_OF_16_MATCH_NUMBER_SET.has(match.matchNumber) &&
    match.participantsResolved &&
    match.homeTeamId &&
    match.awayTeamId,
  )
}

export function deriveNavigationLifecycle(reference, { resolverHealthy = reference?.resolverHealthy === true } = {}) {
  const groupMatches = Array.isArray(reference?.groupMatches) ? reference.groupMatches : []
  const knockoutMatches = Array.isArray(reference?.knockoutMatches) ? reference.knockoutMatches : []
  const roundOf16Matches = knockoutMatches.filter(match => ROUND_OF_16_MATCH_NUMBER_SET.has(match.matchNumber))
  const availableKoMatches = roundOf16Matches.filter(isResolvedFixture)

  const groupStageComplete = groupMatches.length === 36 && groupMatches.every(match =>
    match.status === 'completed' && match.resultStatus === 'confirmed',
  )
  const roundOf16Complete = roundOf16Matches.length === ROUND_OF_16_MATCH_NUMBERS.length &&
    availableKoMatches.length === ROUND_OF_16_MATCH_NUMBERS.length
  const koEarlyAccess = availableKoMatches.length > 0
  const koPrimary = groupStageComplete && roundOf16Complete && resolverHealthy

  const phase = koPrimary
    ? NAVIGATION_PHASE.KO_PRIMARY
    : koEarlyAccess
      ? NAVIGATION_PHASE.KO_EARLY_ACCESS
      : NAVIGATION_PHASE.GROUPS_PRIMARY

  return Object.freeze({
    phase,
    primaryRoute: koPrimary ? APP_ROUTE.KO_PREDICTOR : APP_ROUTE.PREDICT,
    bracketRoute: APP_ROUTE.BRACKET,
    koEarlyAccess,
    koPrimary,
    showKoInMore: koEarlyAccess && !koPrimary,
    showGroupReviewInMore: koPrimary,
    groupStageComplete,
    roundOf16Complete,
    resolverHealthy: Boolean(resolverHealthy),
    completedGroupMatchCount: groupMatches.filter(match =>
      match.status === 'completed' && match.resultStatus === 'confirmed',
    ).length,
    resolvedRoundOf16Count: availableKoMatches.length,
    availableKoMatches: Object.freeze([...availableKoMatches]),
  })
}

export function buildNavigationDestinations(lifecycle) {
  const primary = destinationForRoute(lifecycle?.primaryRoute ?? APP_ROUTE.PREDICT)
  const bracket = destinationForRoute(APP_ROUTE.BRACKET)
  const phaseMoreDestinations = []

  if (lifecycle?.showKoInMore) {
    phaseMoreDestinations.push(destinationForRoute(APP_ROUTE.KO_PREDICTOR))
  }
  if (lifecycle?.showGroupReviewInMore) {
    phaseMoreDestinations.push(Object.freeze({
      ...destinationForRoute(APP_ROUTE.PREDICT),
      label: 'Group stage review',
      shortLabel: 'Groups',
    }))
  }

  return Object.freeze({
    primary,
    bracket,
    phaseMoreDestinations: Object.freeze(phaseMoreDestinations),
  })
}
