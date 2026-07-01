import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import {
  EURO28_PREDICTION_JOURNEY_VERSION,
  PREDICTION_AUTOSAVE_DELAY_MS,
  PREDICTION_JOURNEY_VIEW,
} from '../src/journey/predictionJourneyConfig.js'
import {
  buildPredictionJourneyRows,
  createPredictionJourneyDraft,
} from '../src/journey/predictionJourneyModel.js'

const scriptPath = fileURLToPath(import.meta.url)
const root = path.resolve(path.dirname(scriptPath), '..')
const errors = []
const fail = message => errors.push(message)
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')

const migrations = fs.readdirSync(path.join(root, 'supabase/migrations'))
  .filter(name => name.endsWith('.sql'))
  .sort()

if (migrations.length !== 9) fail(`Stage 7 must retain nine active migrations, found ${migrations.length}`)
if (migrations.some(name => name.includes('0010_'))) fail('Stage 7 must not create Migration 010')

const requiredFiles = [
  'src/journey/PredictionJourneyFoundation.jsx',
  'src/journey/predictionJourneyConfig.js',
  'src/journey/predictionJourneyModel.js',
  'src/journey/__tests__/predictionJourneyModel.test.js',
  'docs/STAGE-7-PREDICTION-JOURNEY.md',
]
for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) fail(`Stage 7 file is missing: ${file}`)
}

const journeySource = [
  read('src/journey/PredictionJourneyFoundation.jsx'),
  read('src/journey/predictionJourneyModel.js'),
].join('\n')

for (const forbidden of [
  '.insert(',
  '.update(',
  '.upsert(',
  '.delete(',
  'service_role',
  'create table public.leagues',
  'scoring_runs',
]) {
  if (journeySource.includes(forbidden)) fail(`Stage 7 journey contains forbidden behaviour: ${forbidden}`)
}

for (const required of [
  'saveMyPredictionBundle',
  'loadMyPredictionBundle',
  'importGuestDraftToAccount',
  'PREDICTION_AUTOSAVE_DELAY_MS',
  'Submit predictions for review',
  'Edit predictions',
  'Score prediction always means the score after 90 minutes',
  'Jokers hidden until both caps are confirmed',
  'resolveGuestTournamentPreview',
]) {
  if (!journeySource.includes(required)) fail(`Stage 7 journey is missing: ${required}`)
}

const app = read('src/foundation/EuroFoundationApp.jsx')
if (!app.includes('PredictionJourneyFoundation')) fail('the active Euro foundation must render the Stage 7 journey')
if (app.includes('<GuestWorkspaceFoundation')) fail('the Stage 4 standalone guest panel must be replaced by the integrated journey')
if (app.includes('<PredictionSaveFoundation')) fail('the Stage 6 standalone save panel must be replaced by the integrated journey')
if (!app.includes('Stage 7 · Prediction journey')) fail('the active foundation branding must identify Stage 7')

const packageJson = JSON.parse(read('package.json'))
if (!packageJson.scripts['audit:journey']) fail('package.json is missing audit:journey')
if (!packageJson.scripts.check.includes('audit:journey')) fail('npm run check must include audit:journey')
if (!packageJson.scripts['lint:foundation'].includes('src/journey')) fail('foundation lint must include src/journey')

if (EURO28_PREDICTION_JOURNEY_VERSION !== 'euro28-prediction-journey-v1') fail('unexpected Stage 7 journey version')
if (PREDICTION_AUTOSAVE_DELAY_MS !== 800) fail('quiet autosave must use the agreed 800 ms delay')
if (Object.keys(PREDICTION_JOURNEY_VIEW).length !== 3) fail('the journey must expose groups, knockout and review views')
if (typeof buildPredictionJourneyRows !== 'function' || typeof createPredictionJourneyDraft !== 'function') {
  fail('the shared journey model is unavailable')
}

if (errors.length > 0) {
  console.error('Euro prediction journey audit failed:')
  errors.forEach(error => console.error(`- ${error}`))
  process.exit(1)
}

console.log('Euro prediction journey audit passed.')
console.log(`Journey: ${EURO28_PREDICTION_JOURNEY_VERSION}`)
console.log('Views: groups, knockout and review')
console.log('Guest saving: immediate browser-only persistence')
console.log(`Account autosave: atomic RPC after ${PREDICTION_AUTOSAVE_DELAY_MS} ms`)
console.log('Submission: reversible review mode; not a scoring gate')
console.log('Knockout: one canonical resolver path')
console.log('Jokers: hidden while exact caps remain unresolved')
console.log('Active migrations: 9; Migration 010: absent')
