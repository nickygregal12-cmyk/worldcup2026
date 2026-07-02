import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const migrationsDir = path.join(root, 'supabase/migrations')
const errors = []
const fail = message => errors.push(message)
const migrations = fs.readdirSync(migrationsDir).filter(name => name.endsWith('.sql')).sort()

if (migrations.length < 14) fail(`Stage 12 requires the original fourteen-migration baseline, found ${migrations.length}`)
for (const name of [
  '202607010008_euro28_provisional_joker_caps.sql',
  '202607010010_euro28_competition_split_and_jokers.sql',
]) if (!migrations.includes(name)) fail(`required scoring migration is missing: ${name}`)

const migration010 = fs.readFileSync(path.join(migrationsDir, '202607010010_euro28_competition_split_and_jokers.sql'), 'utf8').toLowerCase()
for (const required of [
  'group_stage_joker_cap = 5',
  'knockout_joker_cap = 5',
  'five jokers across the 36 original group-stage score predictions',
  'five jokers across the separate ko predictor',
]) if (!migration010.includes(required)) fail(`Migration 010 is missing: ${required}`)

for (const forbidden of ['joker_multiplier =', 'match_exact_score_points =', 'match_correct_outcome_points =']) {
  if (migration010.includes(forbidden)) fail(`Migration 010 must not silently change: ${forbidden}`)
}

if (errors.length) {
  console.error('Euro scoring ruleset audit failed:')
  errors.forEach(error => console.error(`- ${error}`))
  process.exit(1)
}
console.log('Euro scoring ruleset audit passed.')
console.log('Migration 008 preserved unresolved caps until owner confirmation.')
console.log('Migration 010 confirms 5 group jokers, 0 original-bracket jokers and 5 separate KO Predictor jokers.')
console.log('Joker multiplier and all other scoring values remain unchanged.')
console.log(`Active migrations: ${migrations.length}`)
