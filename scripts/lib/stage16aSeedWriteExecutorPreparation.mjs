import {
  EURO28_STAGING_PROJECT_REF,
  STAGE16A_P6A_ACCEPTANCE_PLAN_VERSION,
  STAGE16A_P6A_ALLOWED_BRANCH,
  STAGE16A_P6A_TEARDOWN_CONFIRMATION,
  STAGE16A_P6A_WRITE_ENABLEMENT_FLAGS,
  WC26_PRODUCTION_PROJECT_REF,
  buildStage16aP6ASeedWriteAcceptancePlan,
} from './stage16aSeedWriteAcceptancePlan.mjs'

export { EURO28_STAGING_PROJECT_REF, WC26_PRODUCTION_PROJECT_REF }

export const STAGE16A_P6B_EXECUTOR_PREPARATION_VERSION = 'stage16a-seed-write-executor-preparation-v1'
export const STAGE16A_P6B_ALLOWED_BRANCH = STAGE16A_P6A_ALLOWED_BRANCH
export const STAGE16A_P6B_REQUIRED_LOCAL_ENV_KEYS = Object.freeze([
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STAGE16A_ALLOW_STAGING_SEED_WRITE',
  'STAGE16A_SEED_TEARDOWN_CONFIRMATION',
])
export const STAGE16A_P6B_TEARDOWN_CONFIRMATION = STAGE16A_P6A_TEARDOWN_CONFIRMATION

export const STAGE16A_P6B_NO_WRITE_GUARD = Object.freeze({
  stage: '16A-P6B',
  executorPreparationVersion: STAGE16A_P6B_EXECUTOR_PREPARATION_VERSION,
  writesDatabase: false,
  createsUsers: false,
  createsProfiles: false,
  seedsProvisionalTeams: false,
  seedsPredictions: false,
  seedsLeagues: false,
  usesServiceRoleCredential: false,
  readsServiceRoleCredential: false,
  envValuesRead: false,
  envValuesPrinted: false,
  canStartWrite: false,
  hasWriteExecutor: false,
  exposesWriteCommand: false,
  generatesSql: false,
  createsMigration: false,
  changesScoring: false,
  changesResolver: false,
  changesUiRoutes: false,
  combinesCompetitions: false,
  requiresExplicitNextSliceApproval: true,
})

export const STAGE16A_P6B_PLANNED_EXECUTOR_MODULES = Object.freeze([
  Object.freeze({ key: 'context_guard', purpose: 'refuse unsafe branch, project ref and write flags before any future secret read', executableInP6B: false }),
  Object.freeze({ key: 'synthetic_user_writer', purpose: 'future dual-marker Auth user creation for the 19 personas', executableInP6B: false }),
  Object.freeze({ key: 'provisional_team_writer', purpose: 'future 24-team provisional tournament-team load', executableInP6B: false }),
  Object.freeze({ key: 'prediction_seed_writer', purpose: 'future Original Predictor and KO Predictor seed rows kept separate', executableInP6B: false }),
  Object.freeze({ key: 'league_seed_writer', purpose: 'future large, tiny, multi-league and no-league membership cases', executableInP6B: false }),
  Object.freeze({ key: 'seed_validator', purpose: 'future first-seed validation against the manifest counts', executableInP6B: false }),
  Object.freeze({ key: 'synthetic_teardown', purpose: 'future dual-marker teardown selector with zero-residue proof', executableInP6B: false }),
  Object.freeze({ key: 'reseed_validator', purpose: 'future reseed proof with zero duplicate synthetic rows', executableInP6B: false }),
])

export const STAGE16A_P6B_BLOCKED_COMMANDS = Object.freeze([
  'stage16a:p6b:write',
  'stage16a:p6b:seed',
  'stage16a:p6b:teardown',
  'stage16a:p6b:reseed',
  'stage16a:p6b:execute',
])

export const STAGE16A_P6B_FUTURE_ENABLEMENT_SEQUENCE = Object.freeze([
  Object.freeze({ key: 'approve_p6c_write_executor', requiredProof: 'owner explicitly approves the first write-capable slice' }),
  Object.freeze({ key: 'refuse_before_secret_read', requiredProof: 'branch, project ref and flags are validated before any service-role credential is read' }),
  Object.freeze({ key: 'load_local_secrets_without_logging', requiredProof: 'future local secret values are never printed, committed or written to artifacts' }),
  Object.freeze({ key: 'seed_dual_marker_synthetic_only', requiredProof: 'future writes create only synthetic data with both reserved markers' }),
  Object.freeze({ key: 'validate_first_seed', requiredProof: 'future first seed proves manifest counts and separate Original/KO competitions' }),
  Object.freeze({ key: 'teardown_dual_marker_synthetic_only', requiredProof: 'future teardown refuses single-marker selectors and protects real data' }),
  Object.freeze({ key: 'prove_zero_residue', requiredProof: 'future teardown leaves zero synthetic residue across all P6A targets' }),
  Object.freeze({ key: 'reseed_same_manifest', requiredProof: 'future reseed recreates the same counts with zero duplicates' }),
])

function assertP6BAllowedBranch(branch) {
  const value = String(branch ?? '').trim()
  if (value !== STAGE16A_P6B_ALLOWED_BRANCH) {
    throw new Error(`Stage 16A-P6B seed write executor preparation requires branch ${STAGE16A_P6B_ALLOWED_BRANCH}`)
  }
  return value
}

function redactEnvKey(key) {
  return Object.freeze({
    key,
    valueRead: false,
    valuePrinted: false,
    requiredForFutureWriteSlice: true,
  })
}

export function buildStage16aP6BSeedWriteExecutorPreparation({
  projectRef = EURO28_STAGING_PROJECT_REF,
  branch = STAGE16A_P6B_ALLOWED_BRANCH,
} = {}) {
  const p6a = buildStage16aP6ASeedWriteAcceptancePlan({ projectRef, branch: assertP6BAllowedBranch(branch) })

  return Object.freeze({
    ...STAGE16A_P6B_NO_WRITE_GUARD,
    projectRef: p6a.projectRef,
    branch: p6a.branch,
    sourceAcceptancePlanVersion: STAGE16A_P6A_ACCEPTANCE_PLAN_VERSION,
    plannedCounts: p6a.plannedCounts,
    requiredLocalEnv: Object.freeze(STAGE16A_P6B_REQUIRED_LOCAL_ENV_KEYS.map(redactEnvKey)),
    writeEnablementFlags: STAGE16A_P6A_WRITE_ENABLEMENT_FLAGS.map(flag => Object.freeze({
      ...flag,
      valueReadByP6B: false,
      valuePrintedByP6B: false,
      futureWriteSliceOnly: true,
    })),
    syntheticMarkers: p6a.syntheticMarkers,
    teardownSelector: p6a.teardownSelector,
    zeroResidueTargets: p6a.zeroResidueTargets,
    reseedValidation: p6a.reseedValidation,
    competitions: Object.freeze({
      original: p6a.competitions.original,
      koPredictor: p6a.competitions.koPredictor,
      combinedTotal: false,
    }),
    plannedExecutorModules: STAGE16A_P6B_PLANNED_EXECUTOR_MODULES,
    blockedCommands: STAGE16A_P6B_BLOCKED_COMMANDS,
    futureEnablementSequence: STAGE16A_P6B_FUTURE_ENABLEMENT_SEQUENCE,
    refusalBoundary: Object.freeze({
      refusesWC26Production: true,
      refusesUnknownProjectRef: true,
      refusesMainBranch: true,
      refusesBeforeSecretRead: true,
      refusesSingleMarkerTeardown: true,
      refusesSecretLogging: true,
      requiresExplicitP6CApproval: true,
    }),
  })
}

export function validateStage16aP6BSeedWriteExecutorPreparation(plan = buildStage16aP6BSeedWriteExecutorPreparation()) {
  if (plan.stage !== '16A-P6B') throw new Error('Stage 16A-P6B preparation has the wrong stage key')
  if (plan.projectRef !== EURO28_STAGING_PROJECT_REF) throw new Error(`Stage 16A-P6B requires Euro staging project ${EURO28_STAGING_PROJECT_REF}`)
  if (plan.branch !== STAGE16A_P6B_ALLOWED_BRANCH) throw new Error(`Stage 16A-P6B requires branch ${STAGE16A_P6B_ALLOWED_BRANCH}`)
  if (plan.writesDatabase !== false) throw new Error('Stage 16A-P6B must not write to the database')
  if (plan.createsUsers !== false || plan.createsProfiles !== false) throw new Error('Stage 16A-P6B must not create users or profiles')
  if (plan.seedsProvisionalTeams !== false) throw new Error('Stage 16A-P6B must not seed provisional teams')
  if (plan.seedsPredictions !== false) throw new Error('Stage 16A-P6B must not seed predictions')
  if (plan.seedsLeagues !== false) throw new Error('Stage 16A-P6B must not seed leagues')
  if (plan.usesServiceRoleCredential !== false || plan.readsServiceRoleCredential !== false) throw new Error('Stage 16A-P6B must not use or read service-role credentials')
  if (plan.envValuesRead !== false || plan.envValuesPrinted !== false) throw new Error('Stage 16A-P6B must not read or print env values')
  if (plan.canStartWrite !== false) throw new Error('Stage 16A-P6B cannot start writes')
  if (plan.hasWriteExecutor !== false) throw new Error('Stage 16A-P6B must not introduce a write executor')
  if (plan.exposesWriteCommand !== false) throw new Error('Stage 16A-P6B must not expose a write command')
  if (plan.generatesSql !== false) throw new Error('Stage 16A-P6B must not generate SQL')
  if (plan.createsMigration !== false) throw new Error('Stage 16A-P6B must not create a migration')
  if (plan.changesScoring !== false || plan.changesResolver !== false || plan.changesUiRoutes !== false) throw new Error('Stage 16A-P6B must not change scoring, resolver or UI routes')
  if (plan.combinesCompetitions !== false || plan.competitions?.combinedTotal !== false) throw new Error('Stage 16A-P6B must not combine competitions')
  if (plan.requiresExplicitNextSliceApproval !== true) throw new Error('Stage 16A-P6B must require explicit next-slice approval')

  for (const key of STAGE16A_P6B_REQUIRED_LOCAL_ENV_KEYS) {
    const found = plan.requiredLocalEnv?.find(item => item.key === key)
    if (!found) throw new Error(`Stage 16A-P6B missing local env key ${key}`)
    if (found.valueRead !== false || found.valuePrinted !== false) throw new Error(`Stage 16A-P6B must not read or print ${key}`)
  }

  if (plan.plannedCounts?.personas !== 19) throw new Error('Stage 16A-P6B must carry 19 synthetic personas')
  if (plan.plannedCounts?.provisionalTeamSlots !== 24) throw new Error('Stage 16A-P6B must carry 24 provisional team slots')
  if (plan.plannedCounts?.timePhaseCases !== 11) throw new Error('Stage 16A-P6B must carry 11 time-phase cases')
  if (plan.plannedCounts?.leagues !== 3) throw new Error('Stage 16A-P6B must carry three league shapes')

  if (!plan.plannedExecutorModules?.length) throw new Error('Stage 16A-P6B must define planned executor modules')
  if (!plan.plannedExecutorModules.every(module => module.executableInP6B === false)) throw new Error('Stage 16A-P6B planned modules must not be executable in P6B')
  for (const key of ['context_guard', 'synthetic_user_writer', 'provisional_team_writer', 'prediction_seed_writer', 'league_seed_writer', 'seed_validator', 'synthetic_teardown', 'reseed_validator']) {
    if (!plan.plannedExecutorModules.some(module => module.key === key)) throw new Error(`Stage 16A-P6B missing planned executor module ${key}`)
  }

  for (const blockedCommand of STAGE16A_P6B_BLOCKED_COMMANDS) {
    if (!plan.blockedCommands?.includes(blockedCommand)) throw new Error(`Stage 16A-P6B missing blocked command ${blockedCommand}`)
  }

  for (const step of STAGE16A_P6B_FUTURE_ENABLEMENT_SEQUENCE) {
    if (!plan.futureEnablementSequence?.some(item => item.key === step.key)) throw new Error(`Stage 16A-P6B missing future enablement step ${step.key}`)
  }

  if (plan.teardownSelector?.requiresBothMarkers !== true) throw new Error('Stage 16A-P6B teardown selector must require both markers')
  if (plan.teardownSelector?.emailDomainOnlyAllowed !== false || plan.teardownSelector?.metadataOnlyAllowed !== false) throw new Error('Stage 16A-P6B must reject single-marker teardown')
  if (!plan.zeroResidueTargets?.every(target => target.expectedAfterTeardown === 0)) throw new Error('Stage 16A-P6B zero-residue targets must expect zero')
  if (plan.reseedValidation?.expectedDuplicateSyntheticRowsAfterReseed !== 0) throw new Error('Stage 16A-P6B reseed validation must require zero duplicates')
  if (plan.refusalBoundary?.refusesBeforeSecretRead !== true || plan.refusalBoundary?.requiresExplicitP6CApproval !== true) throw new Error('Stage 16A-P6B refusal boundary drifted')

  return true
}
