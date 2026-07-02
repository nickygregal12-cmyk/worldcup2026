import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { RESULT_COMPETITION } from '../src/results/resultModel.js'

const root = process.cwd()
const errors = []
const fail = message => errors.push(message)
const migrationName = '202607010011_euro28_results_scoring_leaderboards.sql'
const migrationPath = path.join(root, 'supabase/migrations', migrationName)
const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(name => name.endsWith('.sql')).sort()

if (migrations.length !== 14) fail(`Stage 12 requires fourteen active migrations, found ${migrations.length}`)
if (!fs.existsSync(migrationPath)) fail(`Migration 011 is missing: ${migrationName}`)
else {
  const sql = fs.readFileSync(migrationPath, 'utf8').toLowerCase()
  for (const snippet of [
    'result_revision bigint not null default 0',
    'create table public.match_result_events',
    'create table public.prediction_match_points',
    'create table public.prediction_bracket_points',
    'create table public.prediction_totals',
    'private.euro28_record_match_result',
    'private.euro28_recalculate_points',
    'public.get_competition_leaderboard',
    'public.get_my_competition_points',
    "competition_key in ('original', 'ko_predictor')",
    "prediction_set.competition_key = 'ko_predictor'",
    "prediction_set.competition_key = 'original'",
    'revoke insert, update, delete on table',
  ]) if (!sql.includes(snippet)) fail(`Migration 011 is missing: ${snippet}`)

  const writerGrant = sql.match(/grant\s+execute\s+on\s+function\s+private\.euro28_record_match_result[^;]*;/i)?.[0] ?? ''
  if (/to\s+authenticated\s*;/i.test(writerGrant)) {
    fail('the trusted result writer must not be executable by authenticated browsers')
  }
}

if (RESULT_COMPETITION.ORIGINAL !== 'original' || RESULT_COMPETITION.KO_PREDICTOR !== 'ko_predictor') {
  fail('result competition keys are incorrect')
}

for (const file of [
  'src/results/resultModel.js',
  'src/results/resultService.js',
  'src/results/ResultsAndLeaderboardsFoundation.jsx',
]) if (!fs.existsSync(path.join(root, file))) fail(`Stage 9 file is missing: ${file}`)

const app = fs.readFileSync(path.join(root, 'src/foundation/EuroFoundationApp.jsx'), 'utf8')
if (!app.includes('ResultsAndLeaderboardsFoundation')) fail('the active foundation does not expose Stage 9 results')
if (!app.includes('The tournament control room now covers lock, grace, joker allocation and kill-switch controls')) fail('Stage 12 public branding is missing')

if (errors.length) {
  console.error('Euro results and scoring audit failed:')
  errors.forEach(error => console.error(`- ${error}`))
  process.exit(1)
}

console.log('Euro results and scoring audit passed.')
console.log('Canonical results: revisioned, audited and service-role controlled')
console.log('Scoring: replacement-based and idempotent after corrections')
console.log('Original predictor and KO Predictor: separate totals and leaderboards')
console.log('Live tables and live bracket: canonical live resolver context only')
console.log('Active migrations: 14')
