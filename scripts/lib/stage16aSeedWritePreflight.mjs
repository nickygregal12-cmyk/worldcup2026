import {
  EURO28_STAGING_PROJECT_REF,
  STAGE16A_SYNTHETIC_EMAIL_DOMAIN,
  STAGE16A_SYNTHETIC_METADATA_MARKER,
  WC26_PRODUCTION_PROJECT_REF,
  assertEuro28StagingProjectRef,
} from './stage16aSyntheticIdentity.mjs'
import { buildStage16aSeedManifestDryRun } from './stage16aSeedManifest.mjs'
import { buildStage16aP4SeedDryRunPlan } from './stage16aSeedDryRunSql.mjs'

export { EURO28_STAGING_PROJECT_REF, WC26_PRODUCTION_PROJECT_REF }

export const STAGE16A_P5_WRITE_PREFLIGHT_VERSION = 'stage16a-staging-write-preflight-v1'

export const STAGE16A_P5_REQUIRED_LOCAL_ENV_KEYS = Object.freeze([
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STAGE16A_ALLOW_STAGING_SEED_WRITE',
  'STAGE16A_SEED_TEARDOWN_CONFIRMATION',
])

export const STAGE16A_P5_TEARDOWN_CONFIRMATION = 'I_UNDERSTAND_STAGE16A_SYNTHETIC_TEARDOWN_ONLY'

export const STAGE16A_P5_WRITE_PREFLIGHT_GUARD = Object.freeze({
  stage: '16A-P5',
  preflightVersion: STAGE16A_P5_WRITE_PREFLIGHT_VERSION,
  writesDatabase: false,
  createsUsers: false,
  seedsPredictions: false,
  usesServiceRoleCredential: false,
  readsServiceRoleCredential: false,
  canStartWrite: false,
  requiresExplicitNextSliceApproval: true,
  createsMigration: false,
  combinesCompetitions: false,
})

export const STAGE16A_P5_PREFLIGHT_STEPS = Object.freeze([
  Object.freeze({ key: 'project_ref', label: 'Euro staging project ref', required: true }),
  Object.freeze({ key: 'local_env_names', label: 'Local-only environment variable names', required: true }),
  Object.freeze({ key: 'synthetic_email_domain', label: 'Reserved synthetic email domain', required: true }),
  Object.freeze({ key: 'synthetic_metadata_marker', label: 'Synthetic metadata marker', required: true }),
  Object.freeze({ key: 'teardown_selector', label: 'Dual-marker teardown selector', required: true }),
  Object.freeze({ key: 'zero_residue_assertion', label: 'Zero-residue assertion before reseed', required: true }),
  Object.freeze({ key: 'reseed_acceptance', label: 'Repeatable reseed acceptance', required: true }),
  Object.freeze({ key: 'competition_boundary', label: 'Original and KO Predictor separation', required: true }),
  Object.freeze({ key: 'explicit_write_approval', label: 'Separate approval before any write path', required: true }),
])

function redactEnvKey(key) {
  return Object.freeze({
    key,
    valueRead: false,
    valuePrinted: false,
    requiredForLaterWriteSlice: true,
  })
}

export function buildStage16aP5WritePreflightPlan({ projectRef = EURO28_STAGING_PROJECT_REF } = {}) {
  const safeProjectRef = assertEuro28StagingProjectRef(projectRef)
  const manifest = buildStage16aSeedManifestDryRun({ projectRef: safeProjectRef })
  const p4Plan = buildStage16aP4SeedDryRunPlan({ projectRef: safeProjectRef })

  return Object.freeze({
    ...STAGE16A_P5_WRITE_PREFLIGHT_GUARD,
    projectRef: safeProjectRef,
    sourceManifestVersion: manifest.manifestVersion,
    sourceSqlPreviewVersion: p4Plan.previewVersion,
    plannedCounts: manifest.plannedCounts,
    requiredLocalEnv: Object.freeze(STAGE16A_P5_REQUIRED_LOCAL_ENV_KEYS.map(redactEnvKey)),
    syntheticMarkers: Object.freeze({
      emailDomain: STAGE16A_SYNTHETIC_EMAIL_DOMAIN,
      metadataMarker: STAGE16A_SYNTHETIC_METADATA_MARKER,
      requiresReservedEmailDomain: true,
      requiresSyntheticMetadataMarker: true,
    }),
    teardown: Object.freeze({
      selectorRequiresEmailDomain: `@${STAGE16A_SYNTHETIC_EMAIL_DOMAIN}`,
      selectorRequiresMetadataMarker: STAGE16A_SYNTHETIC_METADATA_MARKER,
      requiresBothMarkers: true,
      confirmationPhrase: STAGE16A_P5_TEARDOWN_CONFIRMATION,
      zeroResidueAssertionRequired: true,
      reseedValidationRequired: true,
      protectsRealAccounts: true,
      protectsTournamentConfig: true,
      protectsStagingControls: true,
    }),
    competitions: Object.freeze({
      original: 'original',
      koPredictor: 'ko_predictor',
      combinedTotal: false,
    }),
    preflightSteps: STAGE16A_P5_PREFLIGHT_STEPS,
  })
}

export function validateStage16aP5WritePreflightPlan(plan = buildStage16aP5WritePreflightPlan()) {
  if (plan.stage !== '16A-P5') throw new Error('Stage 16A-P5 preflight has the wrong stage key')
  if (plan.projectRef !== EURO28_STAGING_PROJECT_REF) throw new Error(`Stage 16A-P5 preflight requires Euro staging project ${EURO28_STAGING_PROJECT_REF}`)
  if (plan.writesDatabase !== false) throw new Error('Stage 16A-P5 preflight must not write to the database')
  if (plan.createsUsers !== false) throw new Error('Stage 16A-P5 preflight must not create users')
  if (plan.seedsPredictions !== false) throw new Error('Stage 16A-P5 preflight must not seed predictions')
  if (plan.usesServiceRoleCredential !== false) throw new Error('Stage 16A-P5 preflight must not use service-role credentials')
  if (plan.readsServiceRoleCredential !== false) throw new Error('Stage 16A-P5 preflight must not read service-role credentials')
  if (plan.canStartWrite !== false) throw new Error('Stage 16A-P5 preflight cannot start a write path')
  if (plan.requiresExplicitNextSliceApproval !== true) throw new Error('Stage 16A-P5 must require explicit next-slice approval before writes')
  if (plan.createsMigration !== false) throw new Error('Stage 16A-P5 preflight must not create a migration')
  if (plan.combinesCompetitions !== false || plan.competitions?.combinedTotal !== false) throw new Error('Stage 16A-P5 preflight must not combine competitions')

  if (plan.plannedCounts?.personas !== 19) throw new Error('Stage 16A-P5 preflight must carry 19 synthetic personas')
  if (plan.plannedCounts?.provisionalTeamSlots !== 24) throw new Error('Stage 16A-P5 preflight must carry 24 provisional team slots')
  if (plan.plannedCounts?.timePhaseCases !== 11) throw new Error('Stage 16A-P5 preflight must carry 11 time-phase cases')
  if (plan.plannedCounts?.leagues !== 3) throw new Error('Stage 16A-P5 preflight must carry three league shapes')

  const envKeys = new Set((plan.requiredLocalEnv || []).map(item => item.key))
  for (const key of STAGE16A_P5_REQUIRED_LOCAL_ENV_KEYS) {
    if (!envKeys.has(key)) throw new Error(`Stage 16A-P5 preflight missing local env key ${key}`)
  }
  for (const item of plan.requiredLocalEnv || []) {
    if (item.valueRead !== false || item.valuePrinted !== false) throw new Error(`Stage 16A-P5 preflight must not read or print ${item.key}`)
  }

  if (plan.syntheticMarkers?.emailDomain !== STAGE16A_SYNTHETIC_EMAIL_DOMAIN) throw new Error('Stage 16A-P5 preflight synthetic email domain drifted')
  if (plan.syntheticMarkers?.metadataMarker?.synthetic_euro28 !== true) throw new Error('Stage 16A-P5 preflight synthetic metadata marker drifted')
  if (plan.teardown?.requiresBothMarkers !== true) throw new Error('Stage 16A-P5 teardown must require both synthetic markers')
  if (plan.teardown?.zeroResidueAssertionRequired !== true) throw new Error('Stage 16A-P5 teardown must require zero-residue assertion')
  if (plan.teardown?.reseedValidationRequired !== true) throw new Error('Stage 16A-P5 teardown must require reseed validation')
  if (plan.teardown?.protectsRealAccounts !== true) throw new Error('Stage 16A-P5 teardown must protect real accounts')
  if (plan.teardown?.protectsTournamentConfig !== true) throw new Error('Stage 16A-P5 teardown must protect tournament configuration')
  if (plan.teardown?.protectsStagingControls !== true) throw new Error('Stage 16A-P5 teardown must protect staging controls')

  for (const step of STAGE16A_P5_PREFLIGHT_STEPS) {
    if (!plan.preflightSteps?.some(item => item.key === step.key && item.required === true)) {
      throw new Error(`Stage 16A-P5 preflight missing required step ${step.key}`)
    }
  }

  return true
}

export function buildStage16aP5WritePreflightReport(options = {}) {
  const plan = buildStage16aP5WritePreflightPlan(options)
  validateStage16aP5WritePreflightPlan(plan)

  return JSON.stringify({
    stage: plan.stage,
    preflightVersion: plan.preflightVersion,
    projectRef: plan.projectRef,
    sourceManifestVersion: plan.sourceManifestVersion,
    sourceSqlPreviewVersion: plan.sourceSqlPreviewVersion,
    writesDatabase: plan.writesDatabase,
    createsUsers: plan.createsUsers,
    seedsPredictions: plan.seedsPredictions,
    usesServiceRoleCredential: plan.usesServiceRoleCredential,
    readsServiceRoleCredential: plan.readsServiceRoleCredential,
    canStartWrite: plan.canStartWrite,
    requiresExplicitNextSliceApproval: plan.requiresExplicitNextSliceApproval,
    createsMigration: plan.createsMigration,
    combinesCompetitions: plan.combinesCompetitions,
    plannedCounts: plan.plannedCounts,
    requiredLocalEnvKeys: plan.requiredLocalEnv.map(item => item.key),
    envValuesRead: false,
    envValuesPrinted: false,
    syntheticMarkers: {
      emailDomain: plan.syntheticMarkers.emailDomain,
      metadataMarkerRequired: plan.syntheticMarkers.metadataMarker.synthetic_euro28 === true,
    },
    teardown: {
      requiresBothMarkers: plan.teardown.requiresBothMarkers,
      zeroResidueAssertionRequired: plan.teardown.zeroResidueAssertionRequired,
      reseedValidationRequired: plan.teardown.reseedValidationRequired,
      protectsRealAccounts: plan.teardown.protectsRealAccounts,
      protectsTournamentConfig: plan.teardown.protectsTournamentConfig,
      protectsStagingControls: plan.teardown.protectsStagingControls,
      confirmationPhrase: plan.teardown.confirmationPhrase,
    },
    competitions: plan.competitions,
  }, null, 2)
}
