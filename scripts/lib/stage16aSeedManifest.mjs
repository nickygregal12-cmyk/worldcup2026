import {
  EURO28_STAGING_PROJECT_REF,
  STAGE16A_SYNTHETIC_PERSONAS,
  WC26_PRODUCTION_PROJECT_REF,
  assertEuro28StagingProjectRef,
  validateStage16aSyntheticPersonaCatalogue,
} from './stage16aSyntheticIdentity.mjs'
import {
  STAGE16A_EFFECTIVE_TIME_CASES,
  validateStage16aEffectiveTimeCases,
} from './stage16aStagingEffectiveTime.mjs'

export { EURO28_STAGING_PROJECT_REF, WC26_PRODUCTION_PROJECT_REF }

const GROUPS = Object.freeze(['A', 'B', 'C', 'D', 'E', 'F'])

export const STAGE16A_P3_SEED_MANIFEST_VERSION = 'stage16a-seed-manifest-dry-run-v1'

export const STAGE16A_P3_TEAM_SLOTS = Object.freeze(
  GROUPS.flatMap(group => [1, 2, 3, 4].map(position => Object.freeze({
    key: `team_${group.toLowerCase()}${position}`,
    group,
    position,
    displayName: `Seed Team ${group}${position}`,
    isoCode: `S${group}${position}`,
    provisional: true,
    writesDatabase: false,
  }))),
)

export const STAGE16A_P3_DRY_RUN_LEAGUES = Object.freeze([
  Object.freeze({
    key: 'large_table',
    displayName: 'Synthetic Large Table',
    competitionEvidence: Object.freeze(['original', 'ko_predictor']),
    memberKeys: Object.freeze([
      'exact_score_heavy',
      'outcome_only',
      'all_wrong',
      'submitted_complete',
      'joker_cap_reached',
      'zero_jokers',
      'engineered_tie_a',
      'engineered_tie_b',
      'bracket_survives_deep',
      'bracket_dead_early',
      'ko_only',
      'original_only',
      'ko_advancing_only',
      'correction_sensitive',
    ]),
    writesDatabase: false,
  }),
  Object.freeze({
    key: 'tiny_h2h',
    displayName: 'Synthetic Tiny H2H',
    competitionEvidence: Object.freeze(['original', 'ko_predictor']),
    memberKeys: Object.freeze(['engineered_tie_a', 'engineered_tie_b']),
    writesDatabase: false,
  }),
  Object.freeze({
    key: 'multi_league_check',
    displayName: 'Synthetic Multi League Check',
    competitionEvidence: Object.freeze(['original', 'ko_predictor']),
    memberKeys: Object.freeze(['exact_score_heavy', 'engineered_tie_a', 'correction_sensitive']),
    writesDatabase: false,
  }),
])

export const STAGE16A_P3_DRY_RUN_OPERATIONS = Object.freeze([
  Object.freeze({ key: 'provisional_team_slots', plannedCount: 24, target: 'team_seed_slots', wouldWrite: false, writeMode: 'dry_run_only' }),
  Object.freeze({ key: 'synthetic_auth_users', plannedCount: 19, target: 'auth_users', wouldWrite: false, writeMode: 'dry_run_only' }),
  Object.freeze({ key: 'synthetic_profiles', plannedCount: 19, target: 'profiles', wouldWrite: false, writeMode: 'dry_run_only' }),
  Object.freeze({ key: 'original_prediction_bundles', plannedCount: 'derived_from_personas', target: 'original_predictions', wouldWrite: false, writeMode: 'dry_run_only' }),
  Object.freeze({ key: 'ko_prediction_bundles', plannedCount: 'derived_from_personas', target: 'ko_predictions', wouldWrite: false, writeMode: 'dry_run_only' }),
  Object.freeze({ key: 'synthetic_private_leagues', plannedCount: 3, target: 'leagues', wouldWrite: false, writeMode: 'dry_run_only' }),
  Object.freeze({ key: 'time_phase_evidence_cases', plannedCount: 11, target: 'existing_time_phase_controls', wouldWrite: false, writeMode: 'dry_run_only' }),
  Object.freeze({ key: 'correction_scenario_manifest', plannedCount: 1, target: 'correction_rehearsal_manifest', wouldWrite: false, writeMode: 'dry_run_only' }),
  Object.freeze({ key: 'teardown_selectors', plannedCount: 2, target: 'dual_marker_teardown_guard', wouldWrite: false, writeMode: 'dry_run_only' }),
])

function personaKeys(personas = STAGE16A_SYNTHETIC_PERSONAS) {
  return new Set(personas.map(persona => persona.key))
}

function countCompetition(personas, competition) {
  return personas.filter(persona => persona.competitions.includes(competition)).length
}

function assertTeamSlots(slots) {
  if (!Array.isArray(slots)) throw new Error('Stage 16A-P3 team slots must be an array')
  if (slots.length !== 24) throw new Error(`Stage 16A-P3 requires exactly 24 provisional team slots, found ${slots.length}`)

  const keys = slots.map(slot => slot.key)
  if (new Set(keys).size !== keys.length) throw new Error('Stage 16A-P3 provisional team slot keys must be unique')

  for (const group of GROUPS) {
    const groupSlots = slots.filter(slot => slot.group === group)
    if (groupSlots.length !== 4) throw new Error(`Stage 16A-P3 group ${group} must contain exactly four provisional slots`)
  }

  for (const slot of slots) {
    if (slot.provisional !== true) throw new Error(`Stage 16A-P3 team slot ${slot.key} must be provisional`)
    if (slot.writesDatabase !== false) throw new Error(`Stage 16A-P3 team slot ${slot.key} must be dry-run only`)
    if (!/^S[A-F][1-4]$/.test(slot.isoCode)) throw new Error(`Stage 16A-P3 team slot ${slot.key} must use a synthetic slot code`)
  }
}

function assertLeagueManifest(leagues, personas) {
  if (!Array.isArray(leagues)) throw new Error('Stage 16A-P3 leagues must be an array')
  if (leagues.length !== 3) throw new Error(`Stage 16A-P3 requires exactly three dry-run league shapes, found ${leagues.length}`)

  const approvedKeys = personaKeys(personas)
  const membershipCounts = new Map(personas.map(persona => [persona.key, 0]))

  for (const league of leagues) {
    if (league.writesDatabase !== false) throw new Error(`Stage 16A-P3 league ${league.key} must be dry-run only`)
    if (!Array.isArray(league.memberKeys) || league.memberKeys.length === 0) {
      throw new Error(`Stage 16A-P3 league ${league.key} must include member keys`)
    }
    if (!league.competitionEvidence.includes('original') || !league.competitionEvidence.includes('ko_predictor')) {
      throw new Error(`Stage 16A-P3 league ${league.key} must preserve Original and KO Predictor evidence separately`)
    }
    for (const key of league.memberKeys) {
      if (!approvedKeys.has(key)) throw new Error(`Stage 16A-P3 league ${league.key} references unknown persona ${key}`)
      membershipCounts.set(key, (membershipCounts.get(key) ?? 0) + 1)
    }
  }

  const largeLeague = leagues.find(league => league.memberKeys.length >= 14)
  if (!largeLeague) throw new Error('Stage 16A-P3 must include a large league with at least fourteen members')
  const tinyLeague = leagues.find(league => league.memberKeys.length >= 2 && league.memberKeys.length <= 3)
  if (!tinyLeague) throw new Error('Stage 16A-P3 must include a tiny league with two or three members')
  if (![...membershipCounts.values()].some(count => count > 1)) throw new Error('Stage 16A-P3 must include at least one multi-league persona')
  if (![...membershipCounts.values()].some(count => count === 0)) throw new Error('Stage 16A-P3 must include at least one no-league persona')
}

function assertDryRunOperations(operations) {
  if (!Array.isArray(operations)) throw new Error('Stage 16A-P3 operations must be an array')
  if (operations.length < 8) throw new Error('Stage 16A-P3 must describe all major dry-run seed groups')

  for (const operation of operations) {
    if (operation.wouldWrite !== false) throw new Error(`Stage 16A-P3 operation ${operation.key} must not write data`)
    if (operation.writeMode !== 'dry_run_only') throw new Error(`Stage 16A-P3 operation ${operation.key} must be dry-run only`)
  }
}

export function validateStage16aSeedManifest({
  personas = STAGE16A_SYNTHETIC_PERSONAS,
  timeCases = STAGE16A_EFFECTIVE_TIME_CASES,
  teamSlots = STAGE16A_P3_TEAM_SLOTS,
  leagues = STAGE16A_P3_DRY_RUN_LEAGUES,
  operations = STAGE16A_P3_DRY_RUN_OPERATIONS,
} = {}) {
  const personaValidation = validateStage16aSyntheticPersonaCatalogue(personas)
  const timeValidation = validateStage16aEffectiveTimeCases({ cases: timeCases })

  assertTeamSlots(teamSlots)
  assertLeagueManifest(leagues, personas)
  assertDryRunOperations(operations)

  const originalBundleCount = countCompetition(personas, 'original')
  const koBundleCount = countCompetition(personas, 'ko_predictor')

  if (originalBundleCount === 0 || koBundleCount === 0) {
    throw new Error('Stage 16A-P3 must plan both Original and KO Predictor prediction evidence')
  }

  return Object.freeze({
    manifestVersion: STAGE16A_P3_SEED_MANIFEST_VERSION,
    personaCount: personaValidation.personaCount,
    teamSlotCount: teamSlots.length,
    groupCount: GROUPS.length,
    originalBundleCount,
    koBundleCount,
    timeCaseCount: timeValidation.caseCount,
    leagueCount: leagues.length,
    operationCount: operations.length,
    dryRunOnly: true,
    writesDatabase: false,
    createsUsers: false,
    seedsPredictions: false,
    createsMigration: false,
    combinesCompetitions: false,
  })
}

export function buildStage16aSeedManifestDryRun({ projectRef = EURO28_STAGING_PROJECT_REF } = {}) {
  const safeProjectRef = assertEuro28StagingProjectRef(projectRef)
  const validation = validateStage16aSeedManifest()

  return Object.freeze({
    stage: '16A-P3',
    projectRef: safeProjectRef,
    manifestVersion: validation.manifestVersion,
    dryRunOnly: true,
    writesDatabase: false,
    createsUsers: false,
    seedsPredictions: false,
    requiresServiceRole: false,
    createsMigration: false,
    combinesCompetitions: false,
    plannedCounts: Object.freeze({
      personas: validation.personaCount,
      provisionalTeamSlots: validation.teamSlotCount,
      originalPredictionBundles: validation.originalBundleCount,
      koPredictionBundles: validation.koBundleCount,
      timePhaseCases: validation.timeCaseCount,
      leagues: validation.leagueCount,
      operations: validation.operationCount,
    }),
    teardownGuard: Object.freeze({
      requiresReservedEmailDomain: true,
      requiresSyntheticMetadataMarker: true,
      seedValidateTeardownZeroResidueReseed: true,
    }),
    teamSlots: STAGE16A_P3_TEAM_SLOTS,
    leagues: STAGE16A_P3_DRY_RUN_LEAGUES,
    operations: STAGE16A_P3_DRY_RUN_OPERATIONS,
  })
}
