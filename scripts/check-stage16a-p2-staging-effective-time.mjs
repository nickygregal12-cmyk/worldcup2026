import { migrationSequenceError } from './lib/migrationSequenceGuard.mjs'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import {
  EURO28_STAGING_PROJECT_REF,
  STAGE16A_EFFECTIVE_TIME_CASES,
  STAGE16A_P2_REQUIRED_PHASE_KEYS,
  WC26_PRODUCTION_PROJECT_REF,
  buildStage16aEffectiveTimePlan,
  validateStage16aEffectiveTimeCases,
} from './lib/stage16aStagingEffectiveTime.mjs'

const failures = []
const fail = message => failures.push(message)

function read(path) {
  if (!existsSync(path)) {
    fail(`${path} is missing`)
    return ''
  }
  return readFileSync(path, 'utf8')
}

function assertIncludes(label, text, marker) {
  if (!text.includes(marker)) fail(`${label} missing marker: ${marker}`)
}

const doc = read('docs/archive/STAGE-16A-P2-STAGING-EFFECTIVE-DATABASE-TIME.md')
const scopeDoc = read('docs/archive/STAGE-16A-SCOPE-ALIGNMENT.md')
const register = read('docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md')
const ledger = read('docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md')
const agentRules = read('docs/EURO28-AGENT-RULES-AND-ROADMAP.md')
const timeModel = read('src/timePhase/timePhaseModel.js')
const timeMigration = read('supabase/migrations/202607030016_euro28_staging_time_phase_controls.sql')
const lib = read('scripts/lib/stage16aStagingEffectiveTime.mjs')
const tests = read('scripts/__tests__/stage16aStagingEffectiveTime.test.js')
const packageJson = JSON.parse(read('package.json') || '{}')

for (const marker of [
  'Stage 16A-P2 — Staging-effective database time',
  'guarded planning, model and audit package',
  'without applying the irreversible real global prediction lock',
  EURO28_STAGING_PROJECT_REF,
  WC26_PRODUCTION_PROJECT_REF,
  'TIME_PHASE_PRESETS',
  'VITE_APP_ENV=staging',
  'VITE_ENABLE_TIME_TRAVEL=true',
  'does not mutate fixtures, results, prediction rows, lock records, scoring records, league rows or tournament picks',
  'Original Predictor and KO Predictor stay separate',
  'Active migrations remain 18 and Migration 019 must not exist',
]) {
  assertIncludes('Stage 16A-P2 doc', doc, marker)
}

for (const key of STAGE16A_P2_REQUIRED_PHASE_KEYS) {
  for (const [label, text] of Object.entries({
    'Stage 16A-P2 doc': doc,
    'time-phase model': timeModel,
    'time-phase migration': timeMigration,
    'effective-time lib': lib,
    'effective-time tests': tests,
  })) {
    assertIncludes(label, text, key)
  }
}

for (const item of STAGE16A_EFFECTIVE_TIME_CASES) {
  assertIncludes('effective-time lib', lib, item.key)
  for (const marker of item.evidence) assertIncludes('effective-time lib', lib, marker)
}

for (const marker of [
  'Stage 16A-P2',
  'Staging-effective database time',
  'irreversible real global prediction lock',
  'existing Time & Phase control',
  'no Migration 019',
]) {
  for (const [label, text] of Object.entries({
    'Stage 16A scope doc': scopeDoc,
    'Decision Register': register,
    'Functional Completion Ledger': ledger,
    'Agent Rules': agentRules,
  })) {
    assertIncludes(label, text, marker)
  }
}

try {
  const validation = validateStage16aEffectiveTimeCases()
  if (validation.caseCount !== 11) fail(`Expected 11 Stage 16A-P2 phase cases, found ${validation.caseCount}`)
  if (!validation.hasOriginalEvidence) fail('Stage 16A-P2 must include Original evidence')
  if (!validation.hasKoEvidence) fail('Stage 16A-P2 must include KO Predictor evidence')
  if (validation.appliesRealGlobalLock) fail('Stage 16A-P2 must not apply the real global lock')
  if (validation.mutatesTournamentData) fail('Stage 16A-P2 must not mutate tournament data')
} catch (error) {
  fail(error instanceof Error ? error.message : String(error))
}

try {
  const plan = buildStage16aEffectiveTimePlan({ projectRef: EURO28_STAGING_PROJECT_REF })
  if (plan.stage !== '16A-P2') fail('Stage 16A-P2 plan has wrong stage key')
  if (plan.usesExistingTimeControl !== true) fail('Stage 16A-P2 must use the existing time-control path')
  if (plan.createsMigration !== false) fail('Stage 16A-P2 must not create a migration')
  if (plan.createsUsers !== false) fail('Stage 16A-P2 must not create users')
  if (plan.seedsPredictions !== false) fail('Stage 16A-P2 must not seed predictions')
  try {
    buildStage16aEffectiveTimePlan({ projectRef: WC26_PRODUCTION_PROJECT_REF })
    fail('Stage 16A-P2 did not block WC26 production')
  } catch (error) {
    if (!String(error.message).includes('blocked against the WC26 production project')) fail('Stage 16A-P2 WC26 block message drifted')
  }
} catch (error) {
  fail(error instanceof Error ? error.message : String(error))
}

if (packageJson.scripts?.['audit:stage16a-p2-staging-effective-time'] !== 'node scripts/check-stage16a-p2-staging-effective-time.mjs') {
  fail('package.json missing audit:stage16a-p2-staging-effective-time')
}
if (!packageJson.scripts?.check?.includes('npm run audit:stage16a-p2-staging-effective-time')) {
  fail('check script does not include audit:stage16a-p2-staging-effective-time')
}

const migrations = existsSync('supabase/migrations') ? readdirSync('supabase/migrations').filter(name => name.endsWith('.sql')) : []
if (migrationSequenceError(migrations)) fail(migrationSequenceError(migrations))

if (failures.length > 0) {
  console.error(`Stage 16A-P2 staging-effective database time audit failed with ${failures.length} issue(s):`)
  for (const message of failures) console.error(`- ${message}`)
  process.exit(1)
}

console.log('Euro Stage 16A-P2 staging-effective database time audit passed.')
console.log('Time: privacy, lock, release, correction and final phase cases are resettable through existing Time & Phase controls.')
console.log('Safety: Euro staging only; WC26 production fails closed; the real global prediction lock is not applied.')
console.log('Boundary: Original Predictor and KO Predictor remain separate; no users, seeds, scoring, resolver or migration change.')
console.log(`Database: ${migrations.length} active migrations, sequentially numbered with no gaps.`)
