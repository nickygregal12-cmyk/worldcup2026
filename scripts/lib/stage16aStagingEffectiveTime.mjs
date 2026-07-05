import { TIME_PHASE_PRESETS } from '../../src/timePhase/timePhaseModel.js'
import {
  EURO28_STAGING_PROJECT_REF,
  WC26_PRODUCTION_PROJECT_REF,
  assertEuro28StagingProjectRef,
} from './stage16aSyntheticIdentity.mjs'

export { EURO28_STAGING_PROJECT_REF, WC26_PRODUCTION_PROJECT_REF }

export const STAGE16A_P2_REQUIRED_PHASE_KEYS = Object.freeze([
  'pre_lock',
  'global_lock',
  'grace_period',
  'group_live',
  'group_complete',
  'knockout_unresolved',
  'knockout_known',
  'ko_open',
  'fixture_locked',
  'match_live',
  'correction_review',
  'tournament_complete',
])

export const STAGE16A_EFFECTIVE_TIME_CASES = Object.freeze([
  Object.freeze({
    key: 'original_privacy_before_lock',
    phaseKey: 'pre_lock',
    evidence: Object.freeze(['original_private', 'guest_signed_in_draft_safe']),
    competitions: Object.freeze(['original']),
    resettable: true,
    appliesRealGlobalLock: false,
    mutatesTournamentData: false,
  }),
  Object.freeze({
    key: 'original_release_after_simulated_lock',
    phaseKey: 'global_lock',
    evidence: Object.freeze(['original_shared_release', 'league_original_player_view']),
    competitions: Object.freeze(['original']),
    resettable: true,
    appliesRealGlobalLock: false,
    mutatesTournamentData: false,
  }),
  Object.freeze({
    key: 'grace_exception_without_lock_write',
    phaseKey: 'grace_period',
    evidence: Object.freeze(['authorised_exception', 'unstarted_match_only']),
    competitions: Object.freeze(['original']),
    resettable: true,
    appliesRealGlobalLock: false,
    mutatesTournamentData: false,
  }),
  Object.freeze({
    key: 'group_live_read_context',
    phaseKey: 'group_live',
    evidence: Object.freeze(['match_centre_group_context', 'live_table_projection']),
    competitions: Object.freeze(['original']),
    resettable: true,
    appliesRealGlobalLock: false,
    mutatesTournamentData: false,
  }),
  Object.freeze({
    key: 'group_complete_knockout_unresolved',
    phaseKey: 'knockout_unresolved',
    evidence: Object.freeze(['ko_readiness_hidden', 'original_review_visible']),
    competitions: Object.freeze(['original']),
    resettable: true,
    appliesRealGlobalLock: false,
    mutatesTournamentData: false,
  }),
  Object.freeze({
    key: 'known_knockout_fixtures_before_kickoff',
    phaseKey: 'knockout_known',
    evidence: Object.freeze(['ko_fixture_shell', 'ko_predictions_private']),
    competitions: Object.freeze(['ko_predictor']),
    resettable: true,
    appliesRealGlobalLock: false,
    mutatesTournamentData: false,
  }),
  Object.freeze({
    key: 'ko_predictor_open_separate_standings',
    phaseKey: 'ko_open',
    evidence: Object.freeze(['ko_predictor_ready', 'separate_ko_leaderboard']),
    competitions: Object.freeze(['ko_predictor']),
    resettable: true,
    appliesRealGlobalLock: false,
    mutatesTournamentData: false,
  }),
  Object.freeze({
    key: 'ko_fixture_individual_lock',
    phaseKey: 'fixture_locked',
    evidence: Object.freeze(['fixture_level_lock', 'ko_joker_boundary']),
    competitions: Object.freeze(['ko_predictor']),
    resettable: true,
    appliesRealGlobalLock: false,
    mutatesTournamentData: false,
  }),
  Object.freeze({
    key: 'ko_fixture_release_when_live',
    phaseKey: 'match_live',
    evidence: Object.freeze(['fixture_by_fixture_release', 'match_centre_ko_points']),
    competitions: Object.freeze(['ko_predictor']),
    resettable: true,
    appliesRealGlobalLock: false,
    mutatesTournamentData: false,
  }),
  Object.freeze({
    key: 'correction_sensitive_recalculation_window',
    phaseKey: 'correction_review',
    evidence: Object.freeze(['correction_sensitive_persona', 'replacement_scoring_review']),
    competitions: Object.freeze(['original', 'ko_predictor']),
    resettable: true,
    appliesRealGlobalLock: false,
    mutatesTournamentData: false,
  }),
  Object.freeze({
    key: 'final_read_only_tournament_state',
    phaseKey: 'tournament_complete',
    evidence: Object.freeze(['final_leaderboards', 'read_only_player_evidence']),
    competitions: Object.freeze(['original', 'ko_predictor']),
    resettable: true,
    appliesRealGlobalLock: false,
    mutatesTournamentData: false,
  }),
])

function phaseKeySet(presets) {
  return new Set(presets.map(preset => preset.key))
}

function assertCompetitionBoundary(caseItem) {
  if (!Array.isArray(caseItem.competitions) || caseItem.competitions.length === 0) {
    throw new Error(`Stage 16A-P2 case ${caseItem.key} must name at least one competition`)
  }
  for (const competition of caseItem.competitions) {
    if (!['original', 'ko_predictor'].includes(competition)) {
      throw new Error(`Stage 16A-P2 case ${caseItem.key} has unsupported competition ${competition}`)
    }
  }
}

export function validateStage16aEffectiveTimeCases({
  presets = TIME_PHASE_PRESETS,
  cases = STAGE16A_EFFECTIVE_TIME_CASES,
} = {}) {
  if (!Array.isArray(presets)) throw new Error('Stage 16A-P2 presets must be an array')
  if (!Array.isArray(cases)) throw new Error('Stage 16A-P2 cases must be an array')

  const presetKeys = phaseKeySet(presets)
  for (const key of STAGE16A_P2_REQUIRED_PHASE_KEYS) {
    if (!presetKeys.has(key)) throw new Error(`Stage 16A-P2 missing existing time phase preset: ${key}`)
  }

  const caseKeys = cases.map(item => item.key)
  if (new Set(caseKeys).size !== caseKeys.length) throw new Error('Stage 16A-P2 case keys must be unique')

  for (const item of cases) {
    if (!presetKeys.has(item.phaseKey)) throw new Error(`Stage 16A-P2 case ${item.key} uses unknown phase ${item.phaseKey}`)
    if (item.resettable !== true) throw new Error(`Stage 16A-P2 case ${item.key} must be resettable`)
    if (item.appliesRealGlobalLock !== false) throw new Error(`Stage 16A-P2 case ${item.key} must not apply the real global lock`)
    if (item.mutatesTournamentData !== false) throw new Error(`Stage 16A-P2 case ${item.key} must not mutate tournament data`)
    if (!Array.isArray(item.evidence) || item.evidence.length === 0) {
      throw new Error(`Stage 16A-P2 case ${item.key} must name evidence targets`)
    }
    assertCompetitionBoundary(item)
  }

  return Object.freeze({
    presetCount: presets.length,
    caseCount: cases.length,
    phaseKeys: Object.freeze([...new Set(cases.map(item => item.phaseKey))]),
    hasOriginalEvidence: cases.some(item => item.competitions.includes('original')),
    hasKoEvidence: cases.some(item => item.competitions.includes('ko_predictor')),
    appliesRealGlobalLock: cases.some(item => item.appliesRealGlobalLock === true),
    mutatesTournamentData: cases.some(item => item.mutatesTournamentData === true),
  })
}

export function buildStage16aEffectiveTimePlan({ projectRef = EURO28_STAGING_PROJECT_REF } = {}) {
  const safeProjectRef = assertEuro28StagingProjectRef(projectRef)
  const validation = validateStage16aEffectiveTimeCases()

  return Object.freeze({
    stage: '16A-P2',
    projectRef: safeProjectRef,
    usesExistingTimeControl: true,
    createsMigration: false,
    createsUsers: false,
    seedsPredictions: false,
    appliesRealGlobalLock: validation.appliesRealGlobalLock,
    mutatesTournamentData: validation.mutatesTournamentData,
    caseCount: validation.caseCount,
    phaseKeys: validation.phaseKeys,
    cases: STAGE16A_EFFECTIVE_TIME_CASES,
  })
}
