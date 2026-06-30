import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {
  DATABASE_SCORING_MODEL,
  EURO_PREDICTION_DATABASE_CONTRACT_VERSION,
  PREDICTION_DATABASE_SCOPE,
  PREDICTION_VISIBILITY_MODEL,
  PREDICTION_WRITE_MODEL,
  validatePredictionDatabaseContract,
} from '../src/contracts/predictionDatabaseContract.js'

const root = process.cwd()
const fail = message => {
  console.error(`Prediction database design check failed: ${message}`)
  process.exitCode = 1
}

const validation = validatePredictionDatabaseContract()
validation.errors.forEach(fail)

const migrationsDirectory = path.join(root, 'supabase/migrations')
const activeMigrations = fs.readdirSync(migrationsDirectory)
  .filter(name => name.endsWith('.sql'))
  .sort()

if (activeMigrations.length !== PREDICTION_DATABASE_SCOPE.activeMigrationCountBeforeImplementation) {
  fail(`expected ${PREDICTION_DATABASE_SCOPE.activeMigrationCountBeforeImplementation} active migrations during the design batch, found ${activeMigrations.length}`)
}
if (activeMigrations.some(name => name.includes('005') || /prediction/i.test(name))) {
  fail('Migration 005 or another active prediction migration exists before design approval')
}

const blueprintPath = path.join(root, 'supabase/design/005-prediction-system-blueprint.md')
if (!fs.existsSync(blueprintPath)) fail('the non-executable Migration 005 blueprint is missing')
else {
  const blueprint = fs.readFileSync(blueprintPath, 'utf8')
  const required = [
    'NON-EXECUTABLE DESIGN BLUEPRINT',
    'scoring_rulesets',
    'prediction_sets',
    'match_predictions',
    'atomic bundle',
    'no direct browser table writes',
    'prediction_locked_at',
  ]
  required.forEach(text => {
    if (!blueprint.includes(text)) fail(`blueprint is missing: ${text}`)
  })
}

if (PREDICTION_WRITE_MODEL.directBrowserTableWrites) fail('direct browser writes must remain disabled')
if (PREDICTION_VISIBILITY_MODEL.anonymousAccess) fail('anonymous prediction access must remain disabled')
if (!DATABASE_SCORING_MODEL.lockedRulesetsImmutable) fail('locked scoring rulesets must be immutable')

if (!process.exitCode) {
  console.log('Euro prediction database design checks passed.')
  console.log(`Design contract: ${EURO_PREDICTION_DATABASE_CONTRACT_VERSION}`)
  console.log(`Active migrations: ${activeMigrations.length} (Migration 005 not created)`)
  console.log('Planned tables: scoring_rulesets, prediction_sets, match_predictions')
  console.log('Write model: atomic bundle with expected revision')
  console.log('Direct browser table writes: none')
  console.log('Lock authority: database time plus persisted prediction_locked_at')
  console.log('Scoring values: versioned ruleset, never copied into prediction rows')
}
