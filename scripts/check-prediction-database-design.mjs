import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {
  DATABASE_SCORING_MODEL,
  EURO_PREDICTION_DATABASE_CONTRACT_VERSION,
  GRACE_WINDOW_DATABASE_MODEL,
  GUEST_PREDICTION_MODEL,
  JOKER_DATABASE_MODEL,
  PREDICTION_COMPLETION_MODEL,
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

validatePredictionDatabaseContract().errors.forEach(fail)

const migrationsDirectory = path.join(root, 'supabase/migrations')
const activeMigrations = fs.readdirSync(migrationsDirectory).filter(name => name.endsWith('.sql')).sort()
if (activeMigrations.length !== PREDICTION_DATABASE_SCOPE.activeMigrationCountBeforeImplementation) {
  fail(`expected ${PREDICTION_DATABASE_SCOPE.activeMigrationCountBeforeImplementation} active migrations during reconciliation, found ${activeMigrations.length}`)
}
if (activeMigrations.some(name => name.includes('005') || /prediction/i.test(name))) {
  fail('Migration 005 or another active prediction migration exists before reconciled design approval')
}

const blueprintPath = path.join(root, 'supabase/design/005-prediction-system-blueprint.md')
if (!fs.existsSync(blueprintPath)) fail('the revised non-executable Migration 005 blueprint is missing')
else {
  const blueprint = fs.readFileSync(blueprintPath, 'utf8')
  const required = [
    'NON-EXECUTABLE DESIGN BLUEPRINT',
    'scoring_rulesets',
    'prediction_sets',
    'match_predictions',
    'prediction_grace_windows',
    'submitted_at',
    'joker_applied',
    'atomic bundle',
    'no direct browser table writes',
    'prediction_locked_at',
    'guest mode has no server-side prediction storage',
  ]
  required.forEach(text => { if (!blueprint.includes(text)) fail(`blueprint is missing: ${text}`) })
}

if (PREDICTION_WRITE_MODEL.directBrowserTableWrites) fail('direct browser writes must remain disabled')
if (PREDICTION_VISIBILITY_MODEL.anonymousAccess) fail('anonymous prediction access must remain disabled')
if (!DATABASE_SCORING_MODEL.lockedRulesetsImmutable) fail('locked scoring rulesets must be immutable')
if (!PREDICTION_COMPLETION_MODEL.submitReviewModeAvailable) fail('submit/review mode must be represented')
if (!JOKER_DATABASE_MODEL.enabled) fail('joker allocation must be represented')
if (GRACE_WINDOW_DATABASE_MODEL.scope !== 'user_and_match') fail('grace must be user + match scoped')
if (GUEST_PREDICTION_MODEL.serverStorage) fail('guest predictions must not use server storage')

if (!process.exitCode) {
  console.log('Euro prediction database design checks passed.')
  console.log(`Design contract: ${EURO_PREDICTION_DATABASE_CONTRACT_VERSION}`)
  console.log(`Active migrations: ${activeMigrations.length} (Migration 005 deliberately absent)`)
  console.log('Planned tables: scoring_rulesets, prediction_sets, match_predictions, prediction_grace_windows')
  console.log('Submit: reversible review state only')
  console.log('Jokers: stored per match; caps and multiplier pinned to ruleset')
  console.log('Grace: audited user + match record; unstarted matches only')
  console.log('Guest mode: core architecture, no server-side prediction storage')
  console.log('Write model: atomic bundle with expected revision')
  console.log('Direct browser table writes: none')
}
