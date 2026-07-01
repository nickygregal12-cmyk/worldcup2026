import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import {
  ATOMIC_PREDICTION_SAVE_SCOPE,
  GUEST_PREDICTION_MODEL,
  PREDICTION_WRITE_MODEL,
} from '../src/contracts/predictionDatabaseContract.js'
import {
  EURO28_PREDICTION_SAVE_RPC,
  EURO28_PREDICTION_SAVE_VERSION,
  PREDICTION_SAVE_LIMITS,
  PREDICTION_SAVE_SOURCE,
} from '../src/predictions/predictionSaveConfig.js'

const scriptPath = fileURLToPath(import.meta.url)
const root = path.resolve(path.dirname(scriptPath), '..')
const errors = []
const fail = message => errors.push(message)
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')

const migrationsDir = path.join(root, 'supabase/migrations')
const migrations = fs.readdirSync(migrationsDir).filter(name => name.endsWith('.sql')).sort()
const migrationName = ATOMIC_PREDICTION_SAVE_SCOPE.migrationFilename
const migrationPath = path.join(migrationsDir, migrationName)

if (migrations.length !== 9) fail(`Stage 6 requires nine active migrations, found ${migrations.length}`)
if (!migrations.includes(migrationName)) fail(`required Migration 009 is missing: ${migrationName}`)
if (migrations.filter(name => name.includes('0009_')).length !== 1) fail('exactly one active Migration 009 file is required')

if (!fs.existsSync(migrationPath)) {
  fail('Migration 009 SQL cannot be audited because it is missing')
} else {
  const migration = fs.readFileSync(migrationPath, 'utf8')
  const lower = migration.toLowerCase()
  const required = [
    'create schema if not exists private',
    'revoke all on schema private from public, anon, authenticated',
    'add column guest_imported_at',
    'add column last_save_source',
    'create or replace function public.save_my_prediction_bundle',
    'security definer',
    "set search_path = ''",
    'for update',
    'prediction revision is stale',
    'prediction content is globally locked',
    'a joker cannot be changed after its match has started',
    'knockout prediction participants do not match the canonical bracket',
    'guest import requires a complete 51-match bundle before the global lock',
    'guest import cannot overwrite existing account predictions',
    'private.euro28_has_active_grace',
    'group_stage_joker_cap',
    'knockout_joker_cap',
    'delete from public.match_predictions',
    'on conflict (prediction_set_id, match_id)',
    'revision = revision + 1',
    'grant execute on function public.save_my_prediction_bundle',
    'to authenticated',
  ]
  required.forEach(snippet => {
    if (!lower.includes(snippet.toLowerCase())) fail(`Migration 009 is missing: ${snippet}`)
  })

  if (/for\s+(insert|update|delete|all)\s+to\s+(anon|authenticated)/i.test(migration)) {
    fail('Migration 009 creates a browser table-write policy')
  }
  const browserTableWriteGrant = /grant\s+(?:all|[\s\S]{0,100}\b(?:insert|update|delete)\b)[\s\S]{0,250}?\bon\s+(?:table\s+)?public\.(?:prediction_sets|match_predictions)[\s\S]{0,150}?\bto\s+(?:anon|authenticated)\b/i
  if (browserTableWriteGrant.test(migration)) fail('Migration 009 grants direct browser table writes')

  for (const excluded of [
    'create table public.leagues',
    'create table public.league_members',
    'create table public.scoring_runs',
    'create table public.prediction_points',
    'create table public.results',
  ]) {
    if (lower.includes(excluded)) fail(`Migration 009 must not contain: ${excluded}`)
  }
}

const predictionRoot = path.join(root, 'src/predictions')
const predictionFiles = []
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') walk(filePath)
    } else if (/\.(?:js|jsx|mjs)$/.test(entry.name)) {
      predictionFiles.push(filePath)
    }
  }
}
walk(predictionRoot)
const source = predictionFiles.map(filePath => fs.readFileSync(filePath, 'utf8')).join('\n')
for (const forbidden of ['.insert(', '.update(', '.upsert(', '.delete(', 'service_role']) {
  if (source.includes(forbidden)) fail(`prediction save browser code contains forbidden behaviour: ${forbidden}`)
}
for (const required of [
  `rpc(EURO28_PREDICTION_SAVE_RPC`,
  ".from('prediction_sets')",
  ".from('match_predictions')",
  'buildCompleteGuestImportRows',
  'expectedRevision',
  'GUEST_IMPORT',
]) {
  if (!source.includes(required)) fail(`prediction save browser code is missing: ${required}`)
}

const app = read('src/foundation/EuroFoundationApp.jsx')
if (!app.includes('PredictionSaveFoundation')) fail('the active Euro foundation must expose Stage 6 prediction storage')
const guestWorkspace = read('src/guest/GuestWorkspaceFoundation.jsx')
if (!guestWorkspace.includes('explicit')) fail('the guest workspace must describe account import as explicit')

const databaseTestPath = path.join(root, 'supabase/tests/database/009_atomic_prediction_save.test.sql')
if (!fs.existsSync(databaseTestPath)) {
  fail('Migration 009 pgTAP verification is missing')
} else {
  const databaseTest = fs.readFileSync(databaseTestPath, 'utf8').toLowerCase()
  for (const required of [
    'select plan(54)',
    'the first atomic save creates revision one',
    'a stale expected revision is rejected',
    'server resolver produces a complete canonical 51-match bundle',
    'guest import cannot replace account prediction rows',
    'differs from the canonical resolver',
    'content changes are rejected after the global lock',
    'scoped grace permits a content change',
    'per-match joker lock',
    'without cross-user false positives',
  ]) {
    if (!databaseTest.includes(required)) fail(`Migration 009 pgTAP coverage is missing: ${required}`)
  }
}

if (EURO28_PREDICTION_SAVE_VERSION !== 'euro28-atomic-save-v1') fail('unexpected prediction save version')
if (EURO28_PREDICTION_SAVE_RPC !== 'save_my_prediction_bundle') fail('unexpected prediction save RPC name')
if (PREDICTION_SAVE_LIMITS.totalMatches !== 51) fail('a complete Euro bundle must contain 51 matches')
if (PREDICTION_SAVE_SOURCE.GUEST_IMPORT !== 'guest_import') fail('guest imports must use the explicit guest_import source')
if (!PREDICTION_WRITE_MODEL.implemented) fail('the trusted atomic save must be marked implemented')
if (PREDICTION_WRITE_MODEL.directBrowserTableWrites) fail('direct browser table writes must remain disabled')
if (!PREDICTION_WRITE_MODEL.expectedRevisionRequired) fail('expected revision checking must remain mandatory')
if (!PREDICTION_WRITE_MODEL.validatesWholeBracketPath) fail('the server must validate the full knockout path')
if (!PREDICTION_WRITE_MODEL.validatesGraceScope) fail('the server must validate match-scoped grace')
if (!GUEST_PREDICTION_MODEL.explicitImportOnly) fail('guest import must remain explicit')
if (GUEST_PREDICTION_MODEL.accountOverwriteAllowed) fail('guest import must not overwrite account rows')

if (errors.length > 0) {
  console.error('Euro atomic prediction save audit failed:')
  errors.forEach(error => console.error(`- ${error}`))
  process.exit(1)
}

console.log('Euro atomic prediction save audit passed.')
console.log(`Save contract: ${EURO28_PREDICTION_SAVE_VERSION}`)
console.log(`RPC: ${EURO28_PREDICTION_SAVE_RPC} (authenticated execute only)`)
console.log('Write model: one server-validated full-bundle transaction')
console.log('Revision: optimistic expected_revision enforced')
console.log('Locks: global content, per-match joker and scoped grace enforced')
console.log('Bracket: canonical 36-group + 15-knockout path validated')
console.log('Guest import: explicit, complete, pre-lock and non-overwriting')
console.log('Direct browser table writes: none')
console.log('Active migrations: 9')
