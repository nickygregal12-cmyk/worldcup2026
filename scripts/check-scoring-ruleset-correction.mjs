import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const scriptPath = fileURLToPath(import.meta.url)
const root = path.resolve(path.dirname(scriptPath), '..')
const migrationsDir = path.join(root, 'supabase/migrations')
const migrationName = '202607010008_euro28_provisional_joker_caps.sql'
const migrationPath = path.join(migrationsDir, migrationName)
const testPath = path.join(root, 'supabase/tests/database/008_scoring_ruleset_correction.test.sql')
const errors = []
const fail = message => errors.push(message)

const migrations = fs.readdirSync(migrationsDir)
  .filter(name => name.endsWith('.sql'))
  .sort()

if (migrations.length !== 8) fail(`joker-cap correction requires eight active migrations, found ${migrations.length}`)
if (!migrations.includes(migrationName)) fail(`required Migration 008 is missing: ${migrationName}`)
if (migrations.filter(name => name.includes('0008_')).length !== 1) fail('exactly one active Migration 008 file is required')

if (!fs.existsSync(migrationPath)) {
  fail('Migration 008 cannot be audited because it is missing')
} else {
  const migration = fs.readFileSync(migrationPath, 'utf8').toLowerCase()
  for (const required of [
    "ruleset_key = 'euro28-scoring-provisional-v2'",
    "target_status <> 'provisional'",
    'group_stage_joker_cap = null',
    'knockout_joker_cap = null',
  ]) {
    if (!migration.includes(required)) fail(`Migration 008 is missing: ${required}`)
  }

  for (const forbidden of [
    'joker_multiplier =',
    'match_exact_score_points =',
    'match_correct_outcome_points =',
    'status =',
    'create table',
    'create policy',
    'grant ',
  ]) {
    if (migration.includes(forbidden)) fail(`Migration 008 must not contain: ${forbidden}`)
  }
}

if (!fs.existsSync(testPath)) {
  fail('Migration 008 pgTAP test is missing')
} else {
  const test = fs.readFileSync(testPath, 'utf8').toLowerCase()
  for (const required of [
    'select plan(7)',
    'the exact group-stage joker cap remains unresolved',
    'the exact knockout joker cap remains unresolved',
    'the provisional joker multiplier remains 2x',
    'the tournament still points at the corrected canonical ruleset',
  ]) {
    if (!test.includes(required)) fail(`Migration 008 pgTAP coverage is missing: ${required}`)
  }
}

if (errors.length > 0) {
  console.error('Euro provisional joker-cap correction audit failed:')
  errors.forEach(error => console.error(`- ${error}`))
  process.exit(1)
}

console.log('Euro provisional joker-cap correction audit passed.')
console.log('Migration 008: canonical provisional ruleset restored')
console.log('Group-stage joker cap: unresolved (NULL)')
console.log('Knockout joker cap: unresolved (NULL)')
console.log('Other scoring values and ruleset status: unchanged')
console.log('Active migrations: 8')
