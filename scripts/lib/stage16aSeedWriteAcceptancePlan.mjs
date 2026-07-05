import {
  EURO28_STAGING_PROJECT_REF,
  STAGE16A_SYNTHETIC_EMAIL_DOMAIN,
  STAGE16A_SYNTHETIC_METADATA_MARKER,
  WC26_PRODUCTION_PROJECT_REF,
  assertEuro28StagingProjectRef,
} from './stage16aSyntheticIdentity.mjs'
import { buildStage16aSeedManifestDryRun } from './stage16aSeedManifest.mjs'
import {
  STAGE16A_P5_TEARDOWN_CONFIRMATION,
  STAGE16A_P5_WRITE_PREFLIGHT_VERSION,
  buildStage16aP5WritePreflightPlan,
} from './stage16aSeedWritePreflight.mjs'

export { EURO28_STAGING_PROJECT_REF, WC26_PRODUCTION_PROJECT_REF }

export const STAGE16A_P6A_ACCEPTANCE_PLAN_VERSION = 'stage16a-seed-write-acceptance-plan-v1'
export const STAGE16A_P6A_ALLOWED_BRANCH = 'euro28-development'
export const STAGE16A_P6A_BLOCKED_BRANCHES = Object.freeze(['main', 'master'])
export const STAGE16A_P6A_TEARDOWN_CONFIRMATION = STAGE16A_P5_TEARDOWN_CONFIRMATION
export const STAGE16A_P6A_REQUIRED_LOCAL_ENV_KEYS = Object.freeze([
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STAGE16A_ALLOW_STAGING_SEED_WRITE',
  'STAGE16A_SEED_TEARDOWN_CONFIRMATION',
])

export const STAGE16A_P6A_NO_WRITE_GUARD = Object.freeze({
  stage: '16A-P6A',
  acceptancePlanVersion: STAGE16A_P6A_ACCEPTANCE_PLAN_VERSION,
  writesDatabase: false,
  createsUsers: false,
  seedsPredictions: false,
  usesServiceRoleCredential: false,
  readsServiceRoleCredential: false,
  envValuesRead: false,
  envValuesPrinted: false,
  canStartWrite: false,
  hasWriteExecutor: false,
  createsMigration: false,
  changesScoring: false,
  changesResolver: false,
  changesUiRoutes: false,
  combinesCompetitions: false,
  requiresExplicitNextSliceApproval: true,
})

export const STAGE16A_P6A_WRITE_ENABLEMENT_FLAGS = Object.freeze([
  Object.freeze({
    key: 'STAGE16A_ALLOW_STAGING_SEED_WRITE',
    requiredValue: 'true',
    valueReadByP6A: false,
    valuePrintedByP6A: false,
    laterWriteSliceOnly: true,
  }),
  Object.freeze({
    key: 'STAGE16A_SEED_TEARDOWN_CONFIRMATION',
    requiredValue: STAGE16A_P6A_TEARDOWN_CONFIRMATION,
    valueReadByP6A: false,
    valuePrintedByP6A: false,
    laterWriteSliceOnly: true,
  }),
])

export const STAGE16A_P6A_TEARDOWN_SELECTOR = Object.freeze({
  emailDomain: STAGE16A_SYNTHETIC_EMAIL_DOMAIN,
  emailSelector: `@${STAGE16A_SYNTHETIC_EMAIL_DOMAIN}`,
  metadataMarker: STAGE16A_SYNTHETIC_METADATA_MARKER,
  requiresBothMarkers: true,
  emailDomainOnlyAllowed: false,
  metadataOnlyAllowed: false,
  selectorDescription: `email ends with @${STAGE16A_SYNTHETIC_EMAIL_DOMAIN} AND metadata.synthetic_euro28 is true`,
})

export const STAGE16A_P6A_REFUSAL_RULES = Object.freeze([
  Object.freeze({ key: 'wrong_branch', refuses: STAGE16A_P6A_BLOCKED_BRANCHES, required: STAGE16A_P6A_ALLOWED_BRANCH }),
  Object.freeze({ key: 'wc26_project_ref', refuses: WC26_PRODUCTION_PROJECT_REF, required: EURO28_STAGING_PROJECT_REF }),
  Object.freeze({ key: 'unknown_project_ref', refuses: 'anything except Euro staging', required: EURO28_STAGING_PROJECT_REF }),
  Object.freeze({ key: 'missing_write_flag', refuses: 'STAGE16A_ALLOW_STAGING_SEED_WRITE not exactly true', required: 'true' }),
  Object.freeze({ key: 'missing_teardown_confirmation', refuses: 'teardown confirmation phrase mismatch', required: STAGE16A_P6A_TEARDOWN_CONFIRMATION }),
  Object.freeze({ key: 'single_marker_teardown', refuses: 'email-domain-only or metadata-only teardown selectors', required: 'both synthetic markers' }),
  Object.freeze({ key: 'secret_logging', refuses: 'printing, logging or committing service-role credential values', required: 'local-only secret use in a later approved write slice' }),
])

export const STAGE16A_P6A_ZERO_RESIDUE_TARGETS = Object.freeze([
  Object.freeze({ key: 'auth_users', target: 'auth.users', selector: 'dual synthetic markers', expectedAfterTeardown: 0 }),
  Object.freeze({ key: 'profiles', target: 'public.profiles', selector: 'synthetic auth user ids', expectedAfterTeardown: 0 }),
  Object.freeze({ key: 'prediction_sets', target: 'public.prediction_sets', selector: 'synthetic auth user ids', expectedAfterTeardown: 0 }),
  Object.freeze({ key: 'match_predictions', target: 'public.match_predictions', selector: 'synthetic prediction_set ids', expectedAfterTeardown: 0 }),
  Object.freeze({ key: 'bracket_predictions', target: 'public.bracket_predictions', selector: 'synthetic prediction_set ids', expectedAfterTeardown: 0 }),
  Object.freeze({ key: 'prediction_points', target: 'public.prediction_match_points and public.prediction_bracket_points', selector: 'synthetic prediction_set ids', expectedAfterTeardown: 0 }),
  Object.freeze({ key: 'prediction_totals', target: 'public.prediction_totals', selector: 'synthetic auth user ids', expectedAfterTeardown: 0 }),
  Object.freeze({ key: 'leagues', target: 'public.leagues and public.league_members', selector: 'synthetic owner/member user ids and Stage 16A league names', expectedAfterTeardown: 0 }),
  Object.freeze({ key: 'provisional_team_slots', target: 'public.tournament_teams synthetic Stage 16A slots', selector: 'synthetic Stage 16A team-slot marker', expectedAfterTeardown: 0 }),
])

export const STAGE16A_P6A_ACCEPTANCE_SEQUENCE = Object.freeze([
  Object.freeze({ key: 'refuse_unsafe_context', requiredProof: 'branch and project ref refused before any future service-role credential read' }),
  Object.freeze({ key: 'confirm_local_env_names', requiredProof: 'required local env names match the P6A contract and no values are printed' }),
  Object.freeze({ key: 'confirm_write_enablement_flags', requiredProof: 'future write flag and teardown phrase are exact matches' }),
  Object.freeze({ key: 'seed_synthetic_only', requiredProof: 'first seed creates only dual-marker synthetic data in Euro staging' }),
  Object.freeze({ key: 'validate_first_seed', requiredProof: 'first seed counts match manifest counts and competitions remain separate' }),
  Object.freeze({ key: 'teardown_synthetic_only', requiredProof: 'teardown selector requires both synthetic markers and protects real data' }),
  Object.freeze({ key: 'prove_zero_residue', requiredProof: 'all zero-residue targets return zero after teardown' }),
  Object.freeze({ key: 'reseed_same_manifest', requiredProof: 'second seed recreates the same manifest counts with no duplicate synthetic rows' }),
  Object.freeze({ key: 'validate_reseed', requiredProof: 'reseed validation equals first-seed validation and Original/KO totals remain separate' }),
])

function assertAllowedBranch(branch) {
  const value = String(branch ?? '').trim()
  if (STAGE16A_P6A_BLOCKED_BRANCHES.includes(value)) {
    throw new Error(`Stage 16A-P6A seed write acceptance plan is blocked on branch ${value}`)
  }
  if (value !== STAGE16A_P6A_ALLOWED_BRANCH) {
    throw new Error(`Stage 16A-P6A seed write acceptance plan requires branch ${STAGE16A_P6A_ALLOWED_BRANCH}`)
  }
  return value
}

function redactEnvKey(key) {
  return Object.freeze({
    key,
    valueRead: false,
    valuePrinted: false,
    requiredForLaterWriteSlice: true,
  })
}

export function buildStage16aP6ASeedWriteAcceptancePlan({
  projectRef = EURO28_STAGING_PROJECT_REF,
  branch = STAGE16A_P6A_ALLOWED_BRANCH,
} = {}) {
  const safeProjectRef = assertEuro28StagingProjectRef(projectRef)
  const safeBranch = assertAllowedBranch(branch)
  const manifest = buildStage16aSeedManifestDryRun({ projectRef: safeProjectRef })
  const preflight = buildStage16aP5WritePreflightPlan({ projectRef: safeProjectRef })

  return Object.freeze({
    ...STAGE16A_P6A_NO_WRITE_GUARD,
    projectRef: safeProjectRef,
    branch: safeBranch,
    sourceManifestVersion: manifest.manifestVersion,
    sourcePreflightVersion: STAGE16A_P5_WRITE_PREFLIGHT_VERSION,
    plannedCounts: manifest.plannedCounts,
    requiredLocalEnv: Object.freeze(STAGE16A_P6A_REQUIRED_LOCAL_ENV_KEYS.map(redactEnvKey)),
    writeEnablementFlags: STAGE16A_P6A_WRITE_ENABLEMENT_FLAGS,
    syntheticMarkers: Object.freeze({
      emailDomain: STAGE16A_SYNTHETIC_EMAIL_DOMAIN,
      metadataMarker: STAGE16A_SYNTHETIC_METADATA_MARKER,
      requiresReservedEmailDomain: true,
      requiresSyntheticMetadataMarker: true,
    }),
    teardownSelector: STAGE16A_P6A_TEARDOWN_SELECTOR,
    zeroResidueTargets: STAGE16A_P6A_ZERO_RESIDUE_TARGETS,
    reseedValidation: Object.freeze({
      requiresFirstSeedValidation: true,
      requiresTeardownBeforeReseed: true,
      requiresZeroResidueBeforeReseed: true,
      expectedDuplicateSyntheticRowsAfterReseed: 0,
      expectedCountsAfterFirstSeed: manifest.plannedCounts,
      expectedCountsAfterReseed: manifest.plannedCounts,
    }),
    refusalRules: STAGE16A_P6A_REFUSAL_RULES,
    acceptanceSequence: STAGE16A_P6A_ACCEPTANCE_SEQUENCE,
    competitions: Object.freeze({
      original: preflight.competitions.original,
      koPredictor: preflight.competitions.koPredictor,
      combinedTotal: false,
    }),
  })
}

export function validateStage16aP6ASeedWriteAcceptancePlan(plan = buildStage16aP6ASeedWriteAcceptancePlan()) {
  if (plan.stage !== '16A-P6A') throw new Error('Stage 16A-P6A acceptance plan has the wrong stage key')
  if (plan.projectRef !== EURO28_STAGING_PROJECT_REF) throw new Error(`Stage 16A-P6A requires Euro staging project ${EURO28_STAGING_PROJECT_REF}`)
  if (plan.branch !== STAGE16A_P6A_ALLOWED_BRANCH) throw new Error(`Stage 16A-P6A requires branch ${STAGE16A_P6A_ALLOWED_BRANCH}`)
  if (plan.writesDatabase !== false) throw new Error('Stage 16A-P6A must not write to the database')
  if (plan.createsUsers !== false) throw new Error('Stage 16A-P6A must not create users')
  if (plan.seedsPredictions !== false) throw new Error('Stage 16A-P6A must not seed predictions')
  if (plan.usesServiceRoleCredential !== false) throw new Error('Stage 16A-P6A must not use service-role credentials')
  if (plan.readsServiceRoleCredential !== false) throw new Error('Stage 16A-P6A must not read service-role credentials')
  if (plan.envValuesRead !== false || plan.envValuesPrinted !== false) throw new Error('Stage 16A-P6A must not read or print env values')
  if (plan.canStartWrite !== false) throw new Error('Stage 16A-P6A cannot start a write path')
  if (plan.hasWriteExecutor !== false) throw new Error('Stage 16A-P6A must not introduce a write executor')
  if (plan.createsMigration !== false) throw new Error('Stage 16A-P6A must not create a migration')
  if (plan.changesScoring !== false) throw new Error('Stage 16A-P6A must not change scoring')
  if (plan.changesResolver !== false) throw new Error('Stage 16A-P6A must not change resolver logic')
  if (plan.changesUiRoutes !== false) throw new Error('Stage 16A-P6A must not change UI routes')
  if (plan.combinesCompetitions !== false || plan.competitions?.combinedTotal !== false) throw new Error('Stage 16A-P6A must not combine competitions')
  if (plan.requiresExplicitNextSliceApproval !== true) throw new Error('Stage 16A-P6A must require explicit next-slice approval')

  if (plan.plannedCounts?.personas !== 19) throw new Error('Stage 16A-P6A must carry 19 synthetic personas')
  if (plan.plannedCounts?.provisionalTeamSlots !== 24) throw new Error('Stage 16A-P6A must carry 24 provisional team slots')
  if (plan.plannedCounts?.timePhaseCases !== 11) throw new Error('Stage 16A-P6A must carry 11 time-phase cases')
  if (plan.plannedCounts?.leagues !== 3) throw new Error('Stage 16A-P6A must carry three league shapes')

  const envKeys = new Set((plan.requiredLocalEnv || []).map(item => item.key))
  for (const key of STAGE16A_P6A_REQUIRED_LOCAL_ENV_KEYS) {
    if (!envKeys.has(key)) throw new Error(`Stage 16A-P6A missing local env key ${key}`)
  }
  for (const item of plan.requiredLocalEnv || []) {
    if (item.valueRead !== false || item.valuePrinted !== false) throw new Error(`Stage 16A-P6A must not read or print ${item.key}`)
  }

  const writeFlag = plan.writeEnablementFlags?.find(item => item.key === 'STAGE16A_ALLOW_STAGING_SEED_WRITE')
  if (writeFlag?.requiredValue !== 'true') throw new Error('Stage 16A-P6A write flag must require exactly true')
  const confirmationFlag = plan.writeEnablementFlags?.find(item => item.key === 'STAGE16A_SEED_TEARDOWN_CONFIRMATION')
  if (confirmationFlag?.requiredValue !== STAGE16A_P6A_TEARDOWN_CONFIRMATION) throw new Error('Stage 16A-P6A teardown confirmation phrase drifted')
  for (const flag of plan.writeEnablementFlags || []) {
    if (flag.valueReadByP6A !== false || flag.valuePrintedByP6A !== false) throw new Error(`Stage 16A-P6A must not read or print ${flag.key}`)
    if (flag.laterWriteSliceOnly !== true) throw new Error(`Stage 16A-P6A flag ${flag.key} must be later-write-slice only`)
  }

  if (plan.syntheticMarkers?.emailDomain !== STAGE16A_SYNTHETIC_EMAIL_DOMAIN) throw new Error('Stage 16A-P6A synthetic email domain drifted')
  if (plan.syntheticMarkers?.metadataMarker?.synthetic_euro28 !== true) throw new Error('Stage 16A-P6A synthetic metadata marker drifted')
  if (plan.teardownSelector?.requiresBothMarkers !== true) throw new Error('Stage 16A-P6A teardown selector must require both markers')
  if (plan.teardownSelector?.emailDomainOnlyAllowed !== false) throw new Error('Stage 16A-P6A must reject email-domain-only teardown')
  if (plan.teardownSelector?.metadataOnlyAllowed !== false) throw new Error('Stage 16A-P6A must reject metadata-only teardown')

  for (const target of STAGE16A_P6A_ZERO_RESIDUE_TARGETS) {
    const found = plan.zeroResidueTargets?.find(item => item.key === target.key)
    if (!found) throw new Error(`Stage 16A-P6A missing zero-residue target ${target.key}`)
    if (found.expectedAfterTeardown !== 0) throw new Error(`Stage 16A-P6A zero-residue target ${target.key} must expect zero`)
  }

  if (plan.reseedValidation?.requiresFirstSeedValidation !== true) throw new Error('Stage 16A-P6A reseed proof must require first-seed validation')
  if (plan.reseedValidation?.requiresTeardownBeforeReseed !== true) throw new Error('Stage 16A-P6A reseed proof must require teardown before reseed')
  if (plan.reseedValidation?.requiresZeroResidueBeforeReseed !== true) throw new Error('Stage 16A-P6A reseed proof must require zero residue before reseed')
  if (plan.reseedValidation?.expectedDuplicateSyntheticRowsAfterReseed !== 0) throw new Error('Stage 16A-P6A reseed proof must require zero duplicate synthetic rows')
  if (plan.reseedValidation?.expectedCountsAfterReseed?.personas !== 19) throw new Error('Stage 16A-P6A reseed proof must restore 19 personas')

  for (const key of ['wrong_branch', 'wc26_project_ref', 'unknown_project_ref', 'missing_write_flag', 'missing_teardown_confirmation', 'single_marker_teardown', 'secret_logging']) {
    if (!plan.refusalRules?.some(rule => rule.key === key)) throw new Error(`Stage 16A-P6A missing refusal rule ${key}`)
  }

  for (const step of STAGE16A_P6A_ACCEPTANCE_SEQUENCE) {
    if (!plan.acceptanceSequence?.some(item => item.key === step.key)) throw new Error(`Stage 16A-P6A missing acceptance step ${step.key}`)
  }

  return true
}
