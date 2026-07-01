import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {
  DATABASE_SCORING_MODEL,
  EURO_PREDICTION_DATABASE_CONTRACT_VERSION,
  GRACE_WINDOW_DATABASE_MODEL,
  GUEST_PREDICTION_MODEL,
  JOKER_DATABASE_MODEL,
  PREDICTION_COMPLETION_MODEL,
  PREDICTION_DATABASE_SCOPE,
  PREDICTION_VISIBILITY_MODEL,
  PREDICTION_WRITE_MODEL,
  validatePredictionDatabaseContract,
} from '../src/contracts/predictionDatabaseContract.js'

const root = process.cwd()
const fail = message => {
  console.error(`Prediction database implementation check failed: ${message}`)
  process.exitCode = 1
}

validatePredictionDatabaseContract().errors.forEach(fail)

const migrationsDirectory = path.join(root, 'supabase/migrations')
const activeMigrations = fs.readdirSync(migrationsDirectory).filter(name => name.endsWith('.sql')).sort()
const migrationName = PREDICTION_DATABASE_SCOPE.migrationFilename
const migrationPath = path.join(migrationsDirectory, migrationName)

if (activeMigrations.length !== PREDICTION_DATABASE_SCOPE.activeMigrationCountAfterImplementation) {
  fail(`expected ${PREDICTION_DATABASE_SCOPE.activeMigrationCountAfterImplementation} active migrations after Migration 005, found ${activeMigrations.length}`)
}
if (!activeMigrations.includes(migrationName)) fail(`required Migration 005 is missing: ${migrationName}`)
if (activeMigrations.filter(name => name.includes('0005_')).length !== 1) {
  fail('exactly one active Migration 005 file is required')
}

if (!fs.existsSync(migrationPath)) {
  fail('Migration 005 SQL cannot be audited because it is missing')
} else {
  const migration = fs.readFileSync(migrationPath, 'utf8')
  const lower = migration.toLowerCase()

  const requiredSnippets = [
    'create table public.scoring_rulesets',
    'create table public.prediction_sets',
    'create table public.match_predictions',
    'create table public.prediction_grace_windows',
    'active_scoring_ruleset_id',
    'prediction_contract_version',
    'prediction_locked_at',
    'submitted_at',
    'joker_applied',
    'joker_multiplier',
    'group_stage_joker_cap',
    'knockout_joker_cap',
    "decision_method in ('normal_time', 'extra_time', 'penalties')",
    'guard_tournament_prediction_lock',
    'guard_scoring_ruleset_state',
    'from public, anon, authenticated',
    'grant select on table public.scoring_rulesets to anon, authenticated',
    'euro28-scoring-provisional-v2',
    'euro28-prediction-db-v2',
  ]
  requiredSnippets.forEach((snippet) => {
    if (!lower.includes(snippet.toLowerCase())) fail(`Migration 005 is missing: ${snippet}`)
  })

  for (const table of PREDICTION_DATABASE_SCOPE.createdTables) {
    if (!lower.includes(`alter table public.${table} enable row level security`)) {
      fail(`RLS is not enabled for public.${table}`)
    }
  }

  const browserWritePolicy = /for\s+(insert|update|delete|all)\s+to\s+(anon|authenticated)/i
  if (browserWritePolicy.test(migration)) fail('Migration 005 creates a browser write policy')

  const browserWriteGrant = /grant\s+(?:all|[\s\S]{0,100}\b(?:insert|update|delete)\b)[\s\S]{0,250}?\bto\s+(?:anon|authenticated)\b/i
  if (browserWriteGrant.test(migration)) fail('Migration 005 grants direct browser writes')

  const finalSaveRpc = /create\s+(?:or\s+replace\s+)?function\s+public\.[a-z0-9_]*(?:save[a-z0-9_]*prediction|prediction[a-z0-9_]*save)/i
  if (finalSaveRpc.test(migration)) fail('Migration 005 creates the deferred final save RPC')

  const excludedTables = [
    'profiles',
    'leagues',
    'league_members',
    'scoring_runs',
    'prediction_points',
    'guest_predictions',
  ]
  for (const table of excludedTables) {
    if (lower.includes(`create table public.${table}`)) fail(`Migration 005 creates excluded table public.${table}`)
  }

  if (!lower.includes('group_stage_joker_cap is null') || !lower.includes('knockout_joker_cap is null')) {
    fail('the seeded exact joker caps must remain unresolved/null')
  }
}

const databaseTestPath = path.join(root, 'supabase/tests/database/005_prediction_storage.test.sql')
if (!fs.existsSync(databaseTestPath)) fail('the Migration 005 pgTAP verification file is missing')
else {
  const databaseTest = fs.readFileSync(databaseTestPath, 'utf8')
  const requiredDatabaseTests = [
    "has_table('public', 'scoring_rulesets'",
    'no browser write policies',
    'final prediction save rpc is still absent',
    'persisted global prediction lock cannot be reopened',
    'guest predictions have no server-side table',
  ]
  requiredDatabaseTests.forEach((snippet) => {
    if (!databaseTest.toLowerCase().includes(snippet.toLowerCase())) fail(`database verification is missing: ${snippet}`)
  })
}

if (PREDICTION_WRITE_MODEL.directBrowserTableWrites) fail('direct browser writes must remain disabled')
if (PREDICTION_VISIBILITY_MODEL.anonymousPredictionAccess) fail('anonymous prediction access must remain disabled')
if (!DATABASE_SCORING_MODEL.lockedRulesetsImmutable) fail('locked scoring rulesets must be immutable')
if (!PREDICTION_COMPLETION_MODEL.submitReviewModeAvailable) fail('submit/review mode must be represented')
if (!JOKER_DATABASE_MODEL.enabled) fail('joker allocation must be represented')
if (GRACE_WINDOW_DATABASE_MODEL.scope !== 'user_and_match') fail('grace must be user + match scoped')
if (GUEST_PREDICTION_MODEL.serverStorage) fail('guest predictions must not use server storage')

if (!process.exitCode) {
  console.log('Euro prediction database implementation checks passed.')
  console.log(`Database contract: ${EURO_PREDICTION_DATABASE_CONTRACT_VERSION}`)
  console.log(`Active migrations: ${activeMigrations.length}`)
  console.log(`Migration 005: ${migrationName}`)
  console.log('Created tables: scoring_rulesets, prediction_sets, match_predictions, prediction_grace_windows')
  console.log('Submit: reversible submitted_at review state only')
  console.log('Jokers: stored per match; unresolved caps and multiplier are central ruleset values')
  console.log('Grace: audited user + match record with expiry and revocation fields')
  console.log('Global lock: persisted monotonic tournament timestamp')
  console.log('Guest mode: no server-side prediction storage')
  console.log('Direct browser table writes: none')
  console.log('Final atomic save RPC: deferred')
}
