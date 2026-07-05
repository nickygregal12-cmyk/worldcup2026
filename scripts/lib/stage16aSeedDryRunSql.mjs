import {
  EURO28_STAGING_PROJECT_REF,
  WC26_PRODUCTION_PROJECT_REF,
  buildStage16aSeedManifestDryRun,
} from './stage16aSeedManifest.mjs'
import { assertEuro28StagingProjectRef } from './stage16aSyntheticIdentity.mjs'

export { EURO28_STAGING_PROJECT_REF, WC26_PRODUCTION_PROJECT_REF }

export const STAGE16A_P4_SEED_DRY_RUN_SQL_VERSION = 'stage16a-seed-sql-dry-run-v1'

export const STAGE16A_P4_READ_ONLY_SQL_GUARD = Object.freeze({
  stage: '16A-P4',
  previewVersion: STAGE16A_P4_SEED_DRY_RUN_SQL_VERSION,
  readOnlySelectPreview: true,
  writesDatabase: false,
  createsUsers: false,
  seedsPredictions: false,
  requiresServiceRole: false,
  createsMigration: false,
  combinesCompetitions: false,
})

const SQL_MUTATION_PATTERNS = Object.freeze([
  /\binsert\b/i,
  /\bupdate\b/i,
  /\bdelete\b/i,
  /\bmerge\b/i,
  /\balter\b/i,
  /\bdrop\b/i,
  /\btruncate\b/i,
  /\bgrant\b/i,
  /\brevoke\b/i,
  /\bcopy\b/i,
  /\bcall\b/i,
  /\bexecute\b/i,
])

function sqlText(value) {
  return String(value).replaceAll("'", "''")
}

function boolLiteral(value) {
  return value ? 'true' : 'false'
}

function intLiteral(value) {
  if (!Number.isInteger(value)) throw new Error(`Stage 16A-P4 SQL preview expected an integer count, received ${value}`)
  return String(value)
}

const MUTATING_SQL_TOKENS = [
  /\binsert\b/i,
  /\bupdate\b/i,
  /\bdelete\b/i,
  /\btruncate\b/i,
  /\bdrop\b/i,
  /\balter\b/i,
  /\bcreate\b/i,
  /\bgrant\b/i,
  /\brevoke\b/i,
  /\bmerge\b/i,
  /\bcall\b/i,
  /\bdo\b/i,
  /\bcopy\b/i,
]

export function assertStage16aP4ReadOnlySql(sql) {
  const normalized = String(sql || '').trim()

  const blockedToken = MUTATING_SQL_TOKENS.find(token => token.test(normalized))
  if (blockedToken) {
    throw new Error(`Stage 16A-P4 SQL preview blocked mutating token: ${blockedToken}`)
  }

  if (!/^select\b/i.test(normalized)) {
    throw new Error('Stage 16A-P4 SQL preview must start with a read-only SELECT')
  }

  return true
}

export function buildStage16aP4SeedDryRunPlan({ projectRef = EURO28_STAGING_PROJECT_REF } = {}) {
  const safeProjectRef = assertEuro28StagingProjectRef(projectRef)
  const manifest = buildStage16aSeedManifestDryRun({ projectRef: safeProjectRef })

  return Object.freeze({
    stage: '16A-P4',
    projectRef: safeProjectRef,
    previewVersion: STAGE16A_P4_SEED_DRY_RUN_SQL_VERSION,
    readOnlySelectPreview: true,
    writesDatabase: false,
    createsUsers: false,
    seedsPredictions: false,
    requiresServiceRole: false,
    createsMigration: false,
    combinesCompetitions: false,
    sourceManifestVersion: manifest.manifestVersion,
    plannedCounts: manifest.plannedCounts,
    teardownGuard: manifest.teardownGuard,
    competitions: Object.freeze({
      original: 'original',
      koPredictor: 'ko_predictor',
      combinedTotal: false,
    }),
  })
}

export function buildStage16aP4SeedDryRunSql({ projectRef = EURO28_STAGING_PROJECT_REF } = {}) {
  const plan = buildStage16aP4SeedDryRunPlan({ projectRef })
  const counts = plan.plannedCounts

  const sql = [
    'select',
    `  '${sqlText(plan.stage)}'::text as stage,`,
    `  '${sqlText(plan.previewVersion)}'::text as preview_version,`,
    `  '${sqlText(plan.projectRef)}'::text as project_ref,`,
    `  '${sqlText(plan.sourceManifestVersion)}'::text as source_manifest_version,`,
    `  ${boolLiteral(plan.readOnlySelectPreview)}::boolean as read_only_select_preview,`,
    `  ${boolLiteral(plan.writesDatabase)}::boolean as writes_database,`,
    `  ${boolLiteral(plan.createsUsers)}::boolean as creates_users,`,
    `  ${boolLiteral(plan.seedsPredictions)}::boolean as seeds_predictions,`,
    `  ${boolLiteral(plan.requiresServiceRole)}::boolean as requires_service_role,`,
    `  ${boolLiteral(plan.createsMigration)}::boolean as creates_migration,`,
    `  ${boolLiteral(plan.combinesCompetitions)}::boolean as combines_competitions,`,
    "  'original'::text as original_competition_key,",
    "  'ko_predictor'::text as ko_predictor_competition_key,",
    `  ${intLiteral(counts.personas)}::integer as synthetic_personas,`,
    `  ${intLiteral(counts.provisionalTeamSlots)}::integer as provisional_team_slots,`,
    `  ${intLiteral(counts.originalPredictionBundles)}::integer as original_prediction_bundles,`,
    `  ${intLiteral(counts.koPredictionBundles)}::integer as ko_prediction_bundles,`,
    `  ${intLiteral(counts.timePhaseCases)}::integer as time_phase_cases,`,
    `  ${intLiteral(counts.leagues)}::integer as league_shapes,`,
    `  ${intLiteral(counts.operations)}::integer as manifest_operations,`,
    `  ${boolLiteral(plan.teardownGuard.requiresReservedEmailDomain)}::boolean as requires_reserved_email_domain,`,
    `  ${boolLiteral(plan.teardownGuard.requiresSyntheticMetadataMarker)}::boolean as requires_synthetic_metadata_marker,`,
    `  ${boolLiteral(plan.teardownGuard.seedValidateTeardownZeroResidueReseed)}::boolean as seed_validate_teardown_zero_residue_reseed`,
    ';',
  ].join('\n')

  assertStage16aP4ReadOnlySql(sql)
  return sql
}
