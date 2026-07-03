import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const errors = []
const fail = message => errors.push(message)
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const exists = file => fs.existsSync(path.join(root, file))

const migrationFile = 'supabase/migrations/202607030018_euro28_complete_admin_operations.sql'
const testFile = 'supabase/tests/database/018_complete_admin_operations.test.sql'
const contractFile = 'docs/STAGE-13F-K1-DATABASE-OPERATIONS-CONTRACT.md'

for (const file of [migrationFile, testFile, contractFile]) {
  if (!exists(file)) fail(`Stage 13F-K1 file is missing: ${file}`)
}

const migration = exists(migrationFile) ? read(migrationFile) : ''
for (const marker of [
  'add column fixture_revision bigint not null default 1',
  'matches_fixture_revision_positive_check',
  "'team_profile_updated'",
  "'time_control_updated'",
  "'time_control_reset'",
  "'fixture_schedule_updated'",
  "'tournament_points_reconciled'",
  'public.admin_list_tournament_matches',
  'public.admin_list_tournament_venues',
  'public.admin_update_match_fixture',
  'public.admin_reconcile_tournament_points',
  'private.euro28_require_tournament_owner',
  "current_match.status not in ('scheduled', 'postponed')",
  "current_match.result_status <> 'pending'",
  'current_match.result_revision <> 0',
  'selected venue is not an active venue for this tournament',
  'kick-off venue-local date must match the scheduled date',
  'fixture changed since it was loaded; refresh before saving',
  "private.euro28_recalculate_points(p_tournament_id, null)",
  "'euro28-tournament-picks-v1'",
  "'stage_17a'",
  'fixtures_missing_confirmed_kickoff',
  'complete_team_profiles',
  'incomplete_team_profiles',
  'revoke all on function public.admin_update_match_fixture',
  'revoke all on function public.admin_reconcile_tournament_points',
]) {
  if (!migration.toLowerCase().includes(marker.toLowerCase())) {
    fail(`Migration 018 is missing: ${marker}`)
  }
}

for (const forbidden of [
  'update public.match_slots',
  'update public.tournament_teams',
  'insert into public.teams',
  'insert into public.tournament_pick',
  'manual_points',
  'api-football',
  'football-data.org',
  'api_sports',
]) {
  if (migration.toLowerCase().includes(forbidden.toLowerCase())) {
    fail(`Migration 018 includes prohibited Stage 13F-K1 scope: ${forbidden}`)
  }
}

if (/grant\s+(?:all|insert|update|delete)[\s\S]{0,180}\bto\s+(?:anon|authenticated)\b/i.test(migration)) {
  fail('Migration 018 grants direct browser table writes')
}

const test = exists(testFile) ? read(testFile) : ''
for (const marker of [
  'results administrator cannot edit fixture scheduling',
  'results administrator cannot reconcile all tournament points',
  'successful fixture update increments the fixture revision exactly once',
  'stale fixture revisions fail closed',
  'venue outside the tournament fails closed',
  'kick-off local-date mismatch fails closed',
  'live fixture scheduling is immutable',
  'result processing makes fixture scheduling immutable',
  'restores the accepted team-profile audit operation value',
  'complete reconciliation creates one append-only Admin event',
  'one separate Original total',
  'one separate KO Predictor total',
  'complete reconciliation respects the existing feature switch',
  'Stage 17A dependency',
]) {
  if (!test.includes(marker)) fail(`Migration 018 database test is missing: ${marker}`)
}

const packageJson = JSON.parse(read('package.json'))
if (packageJson.scripts?.['audit:admin-db-contract'] !== 'node scripts/check-stage13fk-admin-database.mjs') {
  fail('audit:admin-db-contract is not wired correctly')
}
if (!packageJson.scripts?.check?.includes('audit:admin-db-contract')) {
  fail('npm run check does not include audit:admin-db-contract')
}
if (packageJson.scripts?.['test:db:018:local'] !== 'npx supabase test db --local supabase/tests/database/018_complete_admin_operations.test.sql') {
  fail('local Migration 018 test command is missing')
}
if (packageJson.scripts?.['test:db:018:linked'] !== 'npx supabase test db --linked supabase/tests/database/018_complete_admin_operations.test.sql') {
  fail('linked Migration 018 test command is missing')
}
if (!packageJson.scripts?.['lint:foundation']?.includes('scripts/check-stage13fk-admin-database.mjs')) {
  fail('Migration 018 audit is absent from lint:foundation')
}

const roadmap = read('docs/EURO28-AGENT-RULES-AND-ROADMAP.md')
const register = read('docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md')
const ledger = read('docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md')
const addendum = read('docs/EURO28-DECISION-REGISTER-ADDENDUM-2026-07-03.md')
for (const marker of [
  'Stage 13F-K1 — Database operations contract',
  'Migration 018',
  '18 active migrations',
  'Stage 13F-K2',
]) if (!roadmap.includes(marker)) fail(`Roadmap alignment is missing: ${marker}`)
for (const marker of [
  'Stage 13F-K1 database operations contract',
  'fixture_schedule_updated',
  'tournament_points_reconciled',
  'team_profile_updated',
]) if (!register.includes(marker)) fail(`Decision Register alignment is missing: ${marker}`)
for (const marker of [
  '| Fixture schedule operations | 🟠 PARTIAL |',
  '| Tournament-wide scoring reconciliation | 🟠 PARTIAL |',
  '| Operational readiness summary | 🟠 PARTIAL |',
]) if (!ledger.includes(marker)) fail(`Functional ledger alignment is missing: ${marker}`)
for (const marker of [
  'Migration 018',
  'team_profile_updated',
  'Stage 13F-K2',
]) if (!addendum.includes(marker)) fail(`Decision addendum alignment is missing: ${marker}`)

const migrations = fs.readdirSync(path.join(root, 'supabase/migrations'))
  .filter(file => file.endsWith('.sql'))
  .sort()

if (migrations.length !== 18) {
  fail(`Stage 13F-K1 requires exactly 18 active migration files, found ${migrations.length}`)
}
if (migrations.at(-1) !== '202607030018_euro28_complete_admin_operations.sql') {
  fail('Migration 018 is not the latest active migration')
}

if (errors.length) {
  console.error('Euro Stage 13F-K1 Admin database contract audit failed:')
  errors.forEach(error => console.error(`- ${error}`))
  process.exit(1)
}

console.log('Euro Stage 13F-K1 Admin database contract audit passed.')
console.log('Fixtures: owner-only date, kick-off, venue and schedule status with optimistic revision')
console.log('Scoring: owner-only whole-tournament replacement reconciliation with separate competition totals')
console.log('Readiness: fixture, participant, result, scoring, profile, safeguard and Tournament Picks dependency evidence')
console.log('Audit: append-only fixture before/after and reconciliation runs; Team Profile and Time & Phase values preserved')
console.log(`Database: ${migrations.length} active migrations; Migration 018 is the latest contract`)
