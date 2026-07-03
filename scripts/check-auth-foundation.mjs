import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import {
  DISPLAY_NAME_MAX_LENGTH,
  DISPLAY_NAME_MIN_LENGTH,
  PASSWORD_MIN_LENGTH,
  validateDisplayName,
} from '../src/auth/authValidation.js'

const scriptPath = fileURLToPath(import.meta.url)
const root = path.resolve(path.dirname(scriptPath), '..')
const errors = []
const fail = message => errors.push(message)
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')

const migrations = fs.readdirSync(path.join(root, 'supabase/migrations'))
  .filter(name => name.endsWith('.sql'))
  .sort()
const migrationName = '202607010006_euro28_auth_profiles.sql'
const correctionMigrationName = '202607010007_euro28_auth_function_privileges.sql'
const scoringCorrectionMigrationName = '202607010008_euro28_provisional_joker_caps.sql'
const migrationPath = path.join(root, 'supabase/migrations', migrationName)
const correctionMigrationPath = path.join(root, 'supabase/migrations', correctionMigrationName)

if (migrations.length < 14) fail(`Stage 12 must retain the original fourteen-migration baseline, found ${migrations.length}`)
if (!migrations.includes(migrationName)) fail(`required Migration 006 is missing: ${migrationName}`)
if (migrations.filter(name => name.includes('0006_')).length !== 1) fail('exactly one active Migration 006 file is required')
if (!migrations.includes(correctionMigrationName)) fail(`required Migration 007 is missing: ${correctionMigrationName}`)
if (migrations.filter(name => name.includes('0007_')).length !== 1) fail('exactly one active Migration 007 file is required')
if (!migrations.includes(scoringCorrectionMigrationName)) fail(`required Migration 008 is missing: ${scoringCorrectionMigrationName}`)
if (migrations.filter(name => name.includes('0008_')).length !== 1) fail('exactly one active Migration 008 file is required')

if (!fs.existsSync(migrationPath)) {
  fail('Migration 006 SQL cannot be audited because it is missing')
} else {
  const migration = fs.readFileSync(migrationPath, 'utf8')
  const lower = migration.toLowerCase()
  const required = [
    'create table public.profiles',
    'references auth.users(id) on delete cascade',
    'profiles_display_name_case_insensitive_unique',
    'normalise_profile_display_name',
    'on_auth_user_created_euro_profile',
    'is_display_name_available',
    'update_my_profile_display_name',
    'alter table public.profiles enable row level security',
    'create policy profiles_owner_read',
    'using (auth.uid() = id)',
    'revoke all on table public.profiles from public, anon, authenticated',
    'grant select on table public.profiles to authenticated',
  ]
  required.forEach(snippet => {
    if (!lower.includes(snippet.toLowerCase())) fail(`Migration 006 is missing: ${snippet}`)
  })

  if (/grant\s+(?:all|[\s\S]{0,100}\b(?:insert|update|delete)\b)[\s\S]{0,250}?\bto\s+(?:anon|authenticated)\b/i.test(migration)) {
    fail('Migration 006 grants direct browser table writes')
  }
  if (/for\s+(insert|update|delete|all)\s+to\s+(anon|authenticated)/i.test(migration)) {
    fail('Migration 006 creates a browser table-write policy')
  }
  if (/create\s+(?:or\s+replace\s+)?function\s+public\.[a-z0-9_]*(?:save[a-z0-9_]*prediction|prediction[a-z0-9_]*save)/i.test(migration)) {
    fail('Migration 006 creates the deferred prediction save RPC')
  }

  for (const excluded of ['leagues', 'league_members', 'scoring_runs', 'prediction_points', 'guest_predictions']) {
    if (lower.includes(`create table public.${excluded}`)) fail(`Migration 006 creates excluded table public.${excluded}`)
  }
}

if (!fs.existsSync(correctionMigrationPath)) {
  fail('Migration 007 privilege correction cannot be audited because it is missing')
} else {
  const correction = fs.readFileSync(correctionMigrationPath, 'utf8')
  const required = [
    'alter default privileges for role postgres in schema public',
    'revoke execute on functions from public',
    'revoke execute on functions from anon, authenticated',
    'revoke execute on function public.normalise_profile_display_name(text)',
    'revoke execute on function public.handle_new_euro_user_profile()',
    'revoke execute on function public.update_my_profile_display_name(text)',
    'grant execute on function public.is_display_name_available(text)',
    'to anon, authenticated',
    'grant execute on function public.update_my_profile_display_name(text)',
    'to authenticated',
  ]
  required.forEach(snippet => {
    if (!correction.toLowerCase().includes(snippet.toLowerCase())) {
      fail(`Migration 007 is missing: ${snippet}`)
    }
  })
}

const authSourceFiles = []
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') walk(fullPath)
    } else if (/\.(?:js|jsx|mjs)$/.test(entry.name)) {
      authSourceFiles.push(fullPath)
    }
  }
}
walk(path.join(root, 'src/auth'))

const authSource = authSourceFiles.map(filePath => fs.readFileSync(filePath, 'utf8')).join('\n')
for (const forbidden of [
  ".from('prediction_sets')",
  ".from('match_predictions')",
  ".from('prediction_grace_windows')",
  'guestPredictionStorage.clear',
  'localStorage.clear(',
  'sessionStorage.clear(',
  'service_role',
]) {
  if (authSource.includes(forbidden)) fail(`auth foundation contains forbidden behaviour: ${forbidden}`)
}
for (const required of [
  'signUp',
  'signInWithPassword',
  'resetPasswordForEmail',
  'updateUser',
  'signOut',
  "rpc('is_display_name_available'",
  "rpc('update_my_profile_display_name'",
  ".from('profiles')",
]) {
  if (!authSource.includes(required)) fail(`auth foundation is missing: ${required}`)
}

const client = read('src/runtime/appClient.js')
if (!client.includes('autoRefreshToken: true')) fail('auth client must refresh sessions')
if (!client.includes('persistSession: true')) fail('auth client must persist sessions')
if (!client.includes('detectSessionInUrl: true')) fail('auth client must process confirmation and recovery URLs')

const app = read('src/App.jsx')
if (!app.includes('AccountAccess')) fail('active foundation page must expose Euro authentication')
if (!app.includes('PredictionJourney') || !app.includes('KoPredictor')) fail('active page must expose both trusted prediction journeys')

const authView = read('src/auth/AccountAccess.jsx')
if (!authView.includes('GuestAccountTransfer')) fail('signed-in account view must expose the explicit guest-draft transfer flow')
if (/through Stage 6/i.test(authView)) fail('account copy must not expose development-stage wording')

const databaseTest = read('supabase/tests/database/006_auth_profiles.test.sql')
for (const required of [
  "has_table('public', 'profiles'",
  'authenticated users cannot insert profiles directly',
  'auth.users has the Euro profile creation trigger',
  'display names are unique without case sensitivity',
  'Stage 8 exposes separate original and KO Predictor save RPCs',
  'anonymous users cannot rename profiles',
  'new postgres functions do not grant execute to anonymous users',
]) {
  if (!databaseTest.toLowerCase().includes(required.toLowerCase())) fail(`Migration 006 pgTAP coverage is missing: ${required}`)
}

if (DISPLAY_NAME_MIN_LENGTH !== 3) fail('display-name minimum must remain 3')
if (DISPLAY_NAME_MAX_LENGTH !== 30) fail('display-name maximum must remain 30')
if (PASSWORD_MIN_LENGTH !== 8) fail('Stage 5 password minimum must remain 8')
if (!validateDisplayName('Nicky Gregal').valid) fail('expected display-name example is invalid')
if (validateDisplayName('Bad<Name').valid) fail('unsupported display-name punctuation is accepted')

if (errors.length > 0) {
  console.error('Euro authentication and profile foundation audit failed:')
  errors.forEach(error => console.error(`- ${error}`))
  process.exit(1)
}

console.log('Euro authentication and profile foundation audit passed.')
console.log('Migration 006: profiles, auth trigger and owner-scoped RLS')
console.log('Migration 007: explicit browser-role function privilege hardening')
console.log('Migration 008: provisional joker-cap drift correction')
console.log('Account flows: sign-up, sign-in, sign-out and password recovery')
console.log('Profile writes: controlled RPC only; no direct browser table writes')
console.log('Guest draft: remains local through sign-in and transfers only after an explicit confirmed account save')
console.log('Prediction save RPCs: separated by Migration 010')
console.log(`Active migrations: ${migrations.length}`)
