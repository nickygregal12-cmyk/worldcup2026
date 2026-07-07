import { migrationSequenceError } from './lib/migrationSequenceGuard.mjs'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import {
  EURO28_STAGING_PROJECT_REF,
  STAGE16A_P5_REQUIRED_LOCAL_ENV_KEYS,
  STAGE16A_P5_TEARDOWN_CONFIRMATION,
  STAGE16A_P5_WRITE_PREFLIGHT_VERSION,
  WC26_PRODUCTION_PROJECT_REF,
  buildStage16aP5WritePreflightPlan,
  buildStage16aP5WritePreflightReport,
  validateStage16aP5WritePreflightPlan,
} from './lib/stage16aSeedWritePreflight.mjs'

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

const doc = read('docs/STAGE-16A-P5-STAGING-WRITE-PREFLIGHT.md')
const scopeDoc = read('docs/STAGE-16A-SCOPE-ALIGNMENT.md')
const register = read('docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md')
const ledger = read('docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md')
const agentRules = read('docs/EURO28-AGENT-RULES-AND-ROADMAP.md')
const p3Doc = read('docs/STAGE-16A-P3-SEED-MANIFEST-DRY-RUN.md')
const p4Doc = read('docs/STAGE-16A-P4-SEED-SQL-DRY-RUN.md')
const lib = read('scripts/lib/stage16aSeedWritePreflight.mjs')
const generator = read('scripts/generate-stage16a-p5-write-preflight.mjs')
const tests = read('scripts/__tests__/stage16aSeedWritePreflight.test.js')
const packageJson = JSON.parse(read('package.json') || '{}')

for (const marker of [
  'Stage 16A-P5 — Staging write preflight and teardown contract',
  STAGE16A_P5_WRITE_PREFLIGHT_VERSION,
  EURO28_STAGING_PROJECT_REF,
  WC26_PRODUCTION_PROJECT_REF,
  'canStartWrite: false',
  'requiresExplicitNextSliceApproval: true',
  'does not execute Supabase writes',
  'does not create Auth users',
  'does not seed predictions',
  'does not read or print service-role credentials',
  'does not create Migration 019',
  'Original Predictor and KO Predictor remain separate',
  'active migrations remain 18',
  STAGE16A_P5_TEARDOWN_CONFIRMATION,
]) {
  assertIncludes('Stage 16A-P5 doc', doc, marker)
}

for (const key of STAGE16A_P5_REQUIRED_LOCAL_ENV_KEYS) {
  assertIncludes('Stage 16A-P5 doc', doc, key)
  assertIncludes('Stage 16A-P5 lib', lib, key)
}

for (const marker of [
  'Stage 16A-P5',
  'Staging write preflight and teardown contract',
  'canStartWrite: false',
  'requiresExplicitNextSliceApproval: true',
  'no database writes',
  'no user creation',
  'no prediction seeding',
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

for (const marker of [
  '16A-P5 — Staging write preflight and teardown contract',
  'no-write preflight',
]) {
  assertIncludes('Stage 16A-P3 doc', p3Doc, marker)
  assertIncludes('Stage 16A-P4 doc', p4Doc, marker)
}

for (const marker of [
  'STAGE16A_P5_WRITE_PREFLIGHT_VERSION',
  'STAGE16A_P5_REQUIRED_LOCAL_ENV_KEYS',
  'STAGE16A_P5_TEARDOWN_CONFIRMATION',
  'buildStage16aP5WritePreflightPlan',
  'validateStage16aP5WritePreflightPlan',
  'buildStage16aP5WritePreflightReport',
  'canStartWrite',
  'requiresExplicitNextSliceApproval',
  'zeroResidueAssertionRequired',
  'reseedValidationRequired',
]) {
  assertIncludes('Stage 16A-P5 lib', lib, marker)
}

for (const marker of [
  'buildStage16aP5WritePreflightReport',
  '--project-ref=',
]) {
  assertIncludes('Stage 16A-P5 generator', generator, marker)
}

for (const marker of [
  'keeps the P5 guard non-writing and approval-gated',
  'records required local env names without reading or printing values',
  'requires dual synthetic teardown markers',
  'fails closed outside Euro staging',
  'prints a safe JSON report',
]) {
  assertIncludes('Stage 16A-P5 tests', tests, marker)
}

try {
  const plan = buildStage16aP5WritePreflightPlan({ projectRef: EURO28_STAGING_PROJECT_REF })
  validateStage16aP5WritePreflightPlan(plan)

  if (plan.stage !== '16A-P5') fail('Stage 16A-P5 plan has wrong stage key')
  if (plan.writesDatabase) fail('Stage 16A-P5 must not write to the database')
  if (plan.createsUsers) fail('Stage 16A-P5 must not create users')
  if (plan.seedsPredictions) fail('Stage 16A-P5 must not seed predictions')
  if (plan.usesServiceRoleCredential) fail('Stage 16A-P5 must not use service-role credentials')
  if (plan.readsServiceRoleCredential) fail('Stage 16A-P5 must not read service-role credentials')
  if (plan.canStartWrite) fail('Stage 16A-P5 must not be able to start writes')
  if (!plan.requiresExplicitNextSliceApproval) fail('Stage 16A-P5 must require explicit next-slice approval')
  if (plan.createsMigration) fail('Stage 16A-P5 must not create a migration')
  if (plan.combinesCompetitions) fail('Stage 16A-P5 must not combine competitions')
  if (plan.plannedCounts.personas !== 19) fail('Stage 16A-P5 plan must include 19 personas')
  if (plan.plannedCounts.provisionalTeamSlots !== 24) fail('Stage 16A-P5 plan must include 24 provisional team slots')
  if (plan.plannedCounts.timePhaseCases !== 11) fail('Stage 16A-P5 plan must include 11 time-phase cases')
  if (plan.plannedCounts.leagues !== 3) fail('Stage 16A-P5 plan must include three league shapes')
  if (!plan.teardown.requiresBothMarkers) fail('Stage 16A-P5 teardown must require both markers')
  if (!plan.teardown.zeroResidueAssertionRequired) fail('Stage 16A-P5 teardown must require zero-residue assertion')
  if (!plan.teardown.reseedValidationRequired) fail('Stage 16A-P5 teardown must require reseed validation')

  const report = JSON.parse(buildStage16aP5WritePreflightReport({ projectRef: EURO28_STAGING_PROJECT_REF }))
  if (report.envValuesRead !== false) fail('Stage 16A-P5 report must not read env values')
  if (report.envValuesPrinted !== false) fail('Stage 16A-P5 report must not print env values')
  if (report.canStartWrite !== false) fail('Stage 16A-P5 report must not start writes')

  try {
    buildStage16aP5WritePreflightPlan({ projectRef: WC26_PRODUCTION_PROJECT_REF })
    fail('Stage 16A-P5 did not block WC26 production')
  } catch (error) {
    if (!String(error.message).includes('blocked against the WC26 production project')) fail('Stage 16A-P5 WC26 block message drifted')
  }
} catch (error) {
  fail(error instanceof Error ? error.message : String(error))
}

if (packageJson.scripts?.['audit:stage16a-p5-write-preflight'] !== 'node scripts/check-stage16a-p5-write-preflight.mjs') {
  fail('package.json missing audit:stage16a-p5-write-preflight')
}
if (packageJson.scripts?.['stage16a:p5:write-preflight'] !== 'node scripts/generate-stage16a-p5-write-preflight.mjs') {
  fail('package.json missing stage16a:p5:write-preflight')
}
if (!packageJson.scripts?.check?.includes('npm run audit:stage16a-p5-write-preflight')) {
  fail('check script does not include audit:stage16a-p5-write-preflight')
}
if (!packageJson.scripts?.['lint:foundation']?.includes('scripts/check-stage16a-p5-write-preflight.mjs')) {
  fail('lint:foundation must include the Stage 16A-P5 audit script')
}
if (!packageJson.scripts?.['lint:foundation']?.includes('scripts/generate-stage16a-p5-write-preflight.mjs')) {
  fail('lint:foundation must include the Stage 16A-P5 generator script')
}
if (!packageJson.scripts?.['lint:foundation']?.includes('scripts/lib/stage16aSeedWritePreflight.mjs')) {
  fail('lint:foundation must include the Stage 16A-P5 library')
}
if (!packageJson.scripts?.['lint:foundation']?.includes('scripts/__tests__/stage16aSeedWritePreflight.test.js')) {
  fail('lint:foundation must include the Stage 16A-P5 tests')
}

const migrations = existsSync('supabase/migrations') ? readdirSync('supabase/migrations').filter(name => name.endsWith('.sql')) : []
if (migrationSequenceError(migrations)) fail(migrationSequenceError(migrations))

if (failures.length) {
  console.error('Euro Stage 16A-P5 write preflight audit failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Euro Stage 16A-P5 staging write preflight audit passed.')
console.log('Preflight: local env names, staging project ref, dual synthetic markers and teardown checks are modelled.')
console.log('Safety: canStartWrite is false; no users, prediction seeds, service-role use, Supabase writes or migration change.')
console.log('Boundary: Original Predictor and KO Predictor remain separate; WC26 production fails closed.')
console.log(`Database: ${migrations.length} active migrations, sequentially numbered with no gaps.`)
