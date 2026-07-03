import { EURO28_KNOCKOUT_MATCHES } from '../resolver/index.js'
import { buildKoReadiness } from './koReadiness.js'
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
void ROUND_OF_16_MATCH_NUMBER_SET

export function deriveNavigationLifecycle(reference, { resolverHealthy = reference?.resolverHealthy === true, koReadiness = null } = {}) {
  const readiness = koReadiness ?? buildKoReadiness(reference, { resolverHealthy })
  const koPrimary = readiness.primaryReady
  const koEarlyAccess = readiness.earlyAccess
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
    showKoInMore: readiness.showInMore,
    showGroupReviewInMore: readiness.showGroupReviewInMore,
    groupStageComplete: readiness.groupStageComplete,
    roundOf16Complete: readiness.roundOf16Complete,
    resolverHealthy: readiness.resolverHealthy,
    completedGroupMatchCount: readiness.completedGroupMatchCount,
    resolvedRoundOf16Count: readiness.resolvedRoundOf16Count,
    availableKoMatches: readiness.availableKoMatches,
    koReadiness: readiness,
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
