import { migrationSequenceError } from './lib/migrationSequenceGuard.mjs'
import fs from 'node:fs'
import path from 'node:path'

const repo = process.cwd()
const read = file => fs.readFileSync(path.join(repo, file), 'utf8')
const fail = message => {
  console.error(`Stage 13G-B prediction lifecycle audit failed: ${message}`)
  process.exit(1)
}

const requiredFiles = [
  'src/journey/PredictionJourney.jsx',
  'src/journey/PredictionJourneyView.jsx',
  'src/journey/predictionJourneyModel.js',
  'src/journey/__tests__/predictionJourneyModel.test.js',
  'src/koPredictor/KoPredictor.jsx',
  'src/koPredictor/KoPredictorMatchCentre.jsx',
  'src/koPredictor/koPredictorPresentationModel.js',
  'src/koPredictor/__tests__/koPredictorPresentationModel.test.js',
  'src/journey/PredictionLifecycle.module.css',
  'src/koPredictor/KoPredictorLifecycle.module.css',
  'docs/archive/STAGE-13G-B-PREDICTION-LIFECYCLE.md',
]

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(repo, file))) fail(`missing required file ${file}`)
}

const journeyModel = read('src/journey/predictionJourneyModel.js')
if (!journeyModel.includes('buildOriginalPredictionLifecycle')) fail('Original Predictor timing model is missing')
if (!journeyModel.includes('KO Predictor is a separate real-fixture competition')) fail('Original/KO boundary label is missing')

const journeyView = read('src/journey/PredictionJourneyView.jsx')
if (!journeyView.includes('lifecycleStyles.lifecycle')) fail('Original Predictor timing cards are not rendered')
if (!journeyView.includes('Winner-only picks; no bracket jokers')) fail('Original bracket lifecycle copy is missing')

const koModel = read('src/koPredictor/koPredictorPresentationModel.js')
if (!koModel.includes('buildKoPredictorLifecycleStatus')) fail('KO timing model is missing')
if (!koModel.includes('real teams are known')) fail('KO closed-state boundary copy is missing')

const koView = read('src/koPredictor/KoPredictorMatchCentre.jsx')
if (!koView.includes('lifecycleStyles.lifecycle')) fail('KO timing strip is not rendered')
if (!koView.includes('KO Predictor timing')) fail('KO timing aria label is missing')

const app = read('src/App.jsx')
if (!app.includes('tournament={appData.tournament}')) fail('KO Predictor does not receive tournament timing input')

const pkg = JSON.parse(read('package.json'))
if (!pkg.scripts?.['audit:prediction-lifecycle']) fail('package.json missing audit:prediction-lifecycle')
if (!pkg.scripts.check.includes('npm run audit:prediction-lifecycle')) fail('npm run check does not include audit:prediction-lifecycle')

const migrations = fs.readdirSync(path.join(repo, 'supabase/migrations')).filter(file => file.endsWith('.sql')).sort()
if (migrationSequenceError(migrations)) fail(migrationSequenceError(migrations))
const latest = migrations.at(-1)

console.log('Stage 13G-B prediction lifecycle audit passed.')
console.log('Original surface: central lock, group, bracket and KO-boundary lifecycle cards')
console.log('KO surface: real-fixture readiness and separate-competition lifecycle strip')
console.log(`Active migrations: ${migrations.length}`)
console.log(`Latest migration: ${latest}`)
