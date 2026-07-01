import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {
  COMPETITION_SPLIT_SCOPE,
  DATABASE_SCORING_MODEL,
  EURO_PREDICTION_DATABASE_CONTRACT_VERSION,
  GRACE_WINDOW_DATABASE_MODEL,
  GUEST_PREDICTION_MODEL,
  KO_PREDICTOR_MODEL,
  ORIGINAL_PREDICTOR_MODEL,
  PREDICTION_DATABASE_TABLES,
  PREDICTION_VISIBILITY_MODEL,
  PREDICTION_WRITE_MODEL,
  validatePredictionDatabaseContract,
} from '../src/contracts/predictionDatabaseContract.js'

const root = process.cwd()
const errors = []
const fail = message => errors.push(message)
const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(name => name.endsWith('.sql')).sort()

validatePredictionDatabaseContract().errors.forEach(fail)
if (migrations.length !== 11) fail(`Stage 9 requires eleven active migrations, found ${migrations.length}`)
for (const name of ['202607010005_euro28_prediction_storage.sql', '202607010009_euro28_atomic_prediction_save.sql', COMPETITION_SPLIT_SCOPE.migrationFilename]) {
  if (!migrations.includes(name)) fail(`required migration is missing: ${name}`)
}

const migration010 = fs.readFileSync(path.join(root, 'supabase/migrations', COMPETITION_SPLIT_SCOPE.migrationFilename), 'utf8').toLowerCase()
for (const snippet of [
  'create table public.bracket_predictions',
  "competition_key in ('original', 'ko_predictor')",
  'unique (tournament_id, user_id, competition_key)',
  'group_stage_joker_cap = 5',
  'knockout_joker_cap = 5',
  'create or replace function public.save_my_prediction_bundle',
  'create or replace function public.save_my_ko_prediction_bundle',
  'alter table public.bracket_predictions enable row level security',
  'grant execute on function public.save_my_ko_prediction_bundle',
]) {
  if (!migration010.includes(snippet)) fail(`Migration 010 is missing: ${snippet}`)
}
if (/grant\s+(?:all|[\s\S]{0,100}\b(?:insert|update|delete)\b)[\s\S]{0,250}?\bon\s+(?:table\s+)?public\.(?:prediction_sets|match_predictions|bracket_predictions|prediction_grace_windows)[\s\S]{0,150}?\bto\s+(?:anon|authenticated)\b/i.test(migration010)) {
  fail('Migration 010 grants direct browser table writes')
}
if (ORIGINAL_PREDICTOR_MODEL.bracketStoresScores || ORIGINAL_PREDICTOR_MODEL.bracketStoresJokers) fail('original bracket must be winner-only without jokers')
if (ORIGINAL_PREDICTOR_MODEL.groupJokerCap !== 5) fail('original group joker cap must be five')
if (KO_PREDICTOR_MODEL.jokerCap !== 5 || !KO_PREDICTOR_MODEL.pointsSeparateFromOriginal) fail('KO Predictor must have five jokers and separate points')
if (PREDICTION_WRITE_MODEL.directBrowserTableWrites) fail('direct browser writes must remain disabled')
if (PREDICTION_VISIBILITY_MODEL.anonymousPredictionAccess) fail('anonymous prediction access must remain disabled')
if (!DATABASE_SCORING_MODEL.competitionTotalsMustRemainSeparate) fail('competition totals must remain separate')
if (GRACE_WINDOW_DATABASE_MODEL.crossesCompetitionBoundary) fail('grace must not cross competitions')
if (GUEST_PREDICTION_MODEL.serverStorage) fail('guest predictions must not use server storage')
if (!Object.values(PREDICTION_DATABASE_TABLES).includes('bracket_predictions')) fail('bracket table is missing from the database contract')

if (errors.length) {
  console.error('Prediction database implementation check failed:')
  errors.forEach(error => console.error(`- ${error}`))
  process.exit(1)
}
console.log('Euro prediction database implementation checks passed.')
console.log(`Database contract: ${EURO_PREDICTION_DATABASE_CONTRACT_VERSION}`)
console.log(`Active migrations: ${migrations.length}`)
console.log('Original predictor: 36 group scores + 15 winner-only bracket picks')
console.log('KO Predictor: separate 15-match competition with separate points and five jokers')
console.log('Group jokers: five; original bracket jokers: zero')
console.log('Competition-scoped grace and separate atomic RPCs: active')
console.log('Direct browser table writes: none')
