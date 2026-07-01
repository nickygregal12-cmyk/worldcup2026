import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { EURO28_PREDICTION_JOURNEY_VERSION, PREDICTION_AUTOSAVE_DELAY_MS } from '../src/journey/predictionJourneyConfig.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const errors = []
const fail = message => errors.push(message)
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(name => name.endsWith('.sql')).sort()

if (migrations.length !== 10) fail(`Stage 8 requires ten active migrations, found ${migrations.length}`)
if (!migrations.includes('202607010010_euro28_competition_split_and_jokers.sql')) fail('Migration 010 is missing')
for (const file of [
  'src/journey/PredictionJourneyFoundation.jsx',
  'src/koPredictor/KoPredictorFoundation.jsx',
  'src/grace/predictionGraceService.js',
]) if (!fs.existsSync(path.join(root, file))) fail(`Stage 8 file is missing: ${file}`)

const original = read('src/journey/PredictionJourneyFoundation.jsx')
const ko = read('src/koPredictor/KoPredictorFoundation.jsx')
for (const required of [
  'Pre-tournament bracket — winner picks only',
  '0 bracket jokers',
  'group jokers selected',
  'hasActivePredictionGrace',
  'isPredictionMatchStarted',
]) if (!original.includes(required)) fail(`original journey is missing: ${required}`)
for (const required of [
  'Separate competition · KO Predictor',
  'five separate KO Predictor jokers',
  'No original-predictor points included',
  'saveMyKoPredictionBundle',
]) if (!ko.includes(required)) fail(`KO Predictor is missing: ${required}`)

if (PREDICTION_AUTOSAVE_DELAY_MS !== 800) fail('account autosave must remain 800 ms')
if (!EURO28_PREDICTION_JOURNEY_VERSION) fail('prediction journey version is missing')

if (errors.length) {
  console.error('Euro prediction journey audit failed:')
  errors.forEach(error => console.error(`- ${error}`))
  process.exit(1)
}
console.log('Euro prediction journey audit passed.')
console.log(`Journey: ${EURO28_PREDICTION_JOURNEY_VERSION}`)
console.log('Original views: groups, winner-only bracket and review')
console.log(`Account autosave: atomic RPC after ${PREDICTION_AUTOSAVE_DELAY_MS} ms`)
console.log('Global lock: scores/bracket freeze; future group jokers remain movable until their match starts')
console.log('KO Predictor: separate real-match workspace, points, five jokers and future leaderboard')
console.log('Active migrations: 10')
