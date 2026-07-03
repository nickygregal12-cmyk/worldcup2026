import { EURO28_KNOCKOUT_MATCHES } from '../resolver/index.js'

export const KO_READINESS_PHASE = Object.freeze({
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

function isResolvedRoundOf16Fixture(match) {
  return Boolean(
    match &&
    ROUND_OF_16_MATCH_NUMBER_SET.has(match.matchNumber) &&
    match.participantsResolved &&
    match.homeTeamId &&
    match.awayTeamId,
  )
}

export function buildKoReadiness(reference, { resolverHealthy = reference?.resolverHealthy === true } = {}) {
  const groupMatches = Array.isArray(reference?.groupMatches) ? reference.groupMatches : []
  const knockoutMatches = Array.isArray(reference?.knockoutMatches) ? reference.knockoutMatches : []
  const roundOf16Matches = knockoutMatches.filter(match => ROUND_OF_16_MATCH_NUMBER_SET.has(match.matchNumber))
  const availableKoMatches = roundOf16Matches.filter(isResolvedRoundOf16Fixture)

  const completedGroupMatchCount = groupMatches.filter(match =>
    match.status === 'completed' && match.resultStatus === 'confirmed',
  ).length
  const groupStageComplete = groupMatches.length === 36 && completedGroupMatchCount === 36
  const roundOf16Complete = roundOf16Matches.length === ROUND_OF_16_MATCH_NUMBERS.length &&
    availableKoMatches.length === ROUND_OF_16_MATCH_NUMBERS.length
  const earlyAccess = availableKoMatches.length > 0
  const primaryReady = groupStageComplete && roundOf16Complete && Boolean(resolverHealthy)
  const phase = primaryReady
    ? KO_READINESS_PHASE.KO_PRIMARY
    : earlyAccess
      ? KO_READINESS_PHASE.KO_EARLY_ACCESS
      : KO_READINESS_PHASE.GROUPS_PRIMARY

  return Object.freeze({
    phase,
    open: earlyAccess,
    earlyAccess,
    primaryReady,
    available: availableKoMatches.length,
    label: earlyAccess
      ? `${availableKoMatches.length} real knockout fixture${availableKoMatches.length === 1 ? '' : 's'} ready`
      : 'KO Predictor opens when real fixtures are known',
    tone: earlyAccess ? 'info' : 'neutral',
    showInMore: earlyAccess && !primaryReady,
    showGroupReviewInMore: primaryReady,
    groupStageComplete,
    roundOf16Complete,
    resolverHealthy: Boolean(resolverHealthy),
    completedGroupMatchCount,
    resolvedRoundOf16Count: availableKoMatches.length,
    availableKoMatches: Object.freeze([...availableKoMatches]),
  })
}
