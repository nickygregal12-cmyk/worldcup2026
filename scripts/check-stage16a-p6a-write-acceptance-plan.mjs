import { migrationSequenceError } from './lib/migrationSequenceGuard.mjs'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import {
  EURO28_STAGING_PROJECT_REF,
  STAGE16A_P6A_ACCEPTANCE_PLAN_VERSION,
  STAGE16A_P6A_ALLOWED_BRANCH,
  STAGE16A_P6A_REQUIRED_LOCAL_ENV_KEYS,
  STAGE16A_P6A_TEARDOWN_CONFIRMATION,
  WC26_PRODUCTION_PROJECT_REF,
  buildStage16aP6ASeedWriteAcceptancePlan,
  validateStage16aP6ASeedWriteAcceptancePlan,
} from './lib/stage16aSeedWriteAcceptancePlan.mjs'

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

const doc = read('docs/STAGE-16A-P6A-SEED-WRITE-ACCEPTANCE-PLAN.md')
const scopeDoc = read('docs/STAGE-16A-SCOPE-ALIGNMENT.md')
const register = read('docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md')
const ledger = read('docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md')
const agentRules = read('docs/EURO28-AGENT-RULES-AND-ROADMAP.md')
const p5Doc = read('docs/STAGE-16A-P5-STAGING-WRITE-PREFLIGHT.md')
const lib = read('scripts/lib/stage16aSeedWriteAcceptancePlan.mjs')
const tests = read('scripts/__tests__/stage16aSeedWriteAcceptancePlan.test.js')
const packageJson = JSON.parse(read('package.json') || '{}')

for (const marker of [
  'Stage 16A-P6A — Seed write acceptance plan only',
  STAGE16A_P6A_ACCEPTANCE_PLAN_VERSION,
  EURO28_STAGING_PROJECT_REF,
  WC26_PRODUCTION_PROJECT_REF,
  STAGE16A_P6A_ALLOWED_BRANCH,
  'writesDatabase: false',
  'createsUsers: false',
  'seedsPredictions: false',
  'usesServiceRoleCredential: false',
  'readsServiceRoleCredential: false',
  'envValuesRead: false',
  'envValuesPrinted: false',
  'canStartWrite: false',
  'hasWriteExecutor: false',
  'requiresExplicitNextSliceApproval: true',
  'does not execute Supabase writes',
  'does not create Auth users',
  'does not seed predictions',
  'does not read or print service-role credentials',
  'does not create Migration 019',
  'Original Predictor and KO Predictor remain separate',
  'active migrations remain 18',
  STAGE16A_P6A_TEARDOWN_CONFIRMATION,
  '@synthetic.euro28.test',
  'synthetic_euro28: true',
  'zero residue',
  'reseed',
]) {
  assertIncludes('Stage 16A-P6A doc', doc, marker)
}

for (const key of STAGE16A_P6A_REQUIRED_LOCAL_ENV_KEYS) {
  assertIncludes('Stage 16A-P6A doc', doc, key)
  assertIncludes('Stage 16A-P6A lib', lib, key)
}

for (const marker of [
  'Stage 16A-P6A',
  'Seed write acceptance plan only',
  'writesDatabase: false',
  'canStartWrite: false',
  'hasWriteExecutor: false',
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
  '16A-P6A — Seed write acceptance plan only',
  'docs/audit/test-only',
]) {
  assertIncludes('Stage 16A-P5 doc', p5Doc, marker)
}

for (const marker of [
  'STAGE16A_P6A_ACCEPTANCE_PLAN_VERSION',
  'STAGE16A_P6A_WRITE_ENABLEMENT_FLAGS',
  'STAGE16A_P6A_TEARDOWN_SELECTOR',
  'STAGE16A_P6A_ZERO_RESIDUE_TARGETS',
  'STAGE16A_P6A_ACCEPTANCE_SEQUENCE',
  'buildStage16aP6ASeedWriteAcceptancePlan',
  'validateStage16aP6ASeedWriteAcceptancePlan',
  'hasWriteExecutor',
  'zeroResidueTargets',
  'reseedValidation',
]) {
  assertIncludes('Stage 16A-P6A lib', lib, marker)
}

for (const forbidden of [
  'process.env',
  'createClient(',
  '.insert(',
  '.update(',
  '.delete(',
  '.upsert(',
  '.rpc(',
  'service_role',
]) {
  if (lib.includes(forbidden)) fail(`Stage 16A-P6A library must not contain executable write/secret marker: ${forbidden}`)
}

for (const marker of [
  'keeps P6A as an acceptance plan with no write executor',
  'defines exact local env names and later-slice write flags without reading values',
  'requires exact dual-marker teardown and zero-residue proof',
  'requires reseed validation after zero residue',
  'fails closed outside Euro staging or the development branch',
]) {
  assertIncludes('Stage 16A-P6A tests', tests, marker)
}

try {
  const plan = buildStage16aP6ASeedWriteAcceptancePlan({ projectRef: EURO28_STAGING_PROJECT_REF, branch: STAGE16A_P6A_ALLOWED_BRANCH })
  validateStage16aP6ASeedWriteAcceptancePlan(plan)

  if (plan.stage !== '16A-P6A') fail('Stage 16A-P6A plan has wrong stage key')
  if (plan.writesDatabase) fail('Stage 16A-P6A must not write to the database')
  if (plan.createsUsers) fail('Stage 16A-P6A must not create users')
  if (plan.seedsPredictions) fail('Stage 16A-P6A must not seed predictions')
  if (plan.usesServiceRoleCredential) fail('Stage 16A-P6A must not use service-role credentials')
  if (plan.readsServiceRoleCredential) fail('Stage 16A-P6A must not read service-role credentials')
  if (plan.envValuesRead || plan.envValuesPrinted) fail('Stage 16A-P6A must not read or print env values')
  if (plan.canStartWrite) fail('Stage 16A-P6A must not be able to start writes')
  if (plan.hasWriteExecutor) fail('Stage 16A-P6A must not introduce a write executor')
  if (plan.createsMigration) fail('Stage 16A-P6A must not create a migration')
  if (plan.changesScoring || plan.changesResolver || plan.changesUiRoutes) fail('Stage 16A-P6A must not change scoring, resolver or UI routes')
  if (plan.combinesCompetitions || plan.competitions.combinedTotal) fail('Stage 16A-P6A must not combine competitions')
  if (!plan.requiresExplicitNextSliceApproval) fail('Stage 16A-P6A must require explicit next-slice approval')
  if (plan.plannedCounts.personas !== 19) fail('Stage 16A-P6A plan must include 19 personas')
  if (plan.plannedCounts.provisionalTeamSlots !== 24) fail('Stage 16A-P6A plan must include 24 provisional team slots')
  if (plan.plannedCounts.timePhaseCases !== 11) fail('Stage 16A-P6A plan must include 11 time-phase cases')
  if (plan.plannedCounts.leagues !== 3) fail('Stage 16A-P6A plan must include three league shapes')
  if (!plan.teardownSelector.requiresBothMarkers) fail('Stage 16A-P6A teardown must require both markers')
  if (plan.teardownSelector.emailDomainOnlyAllowed || plan.teardownSelector.metadataOnlyAllowed) fail('Stage 16A-P6A must reject single-marker teardown')
  if (!plan.zeroResidueTargets.every(target => target.expectedAfterTeardown === 0)) fail('Stage 16A-P6A zero-residue targets must all expect zero')
  if (plan.reseedValidation.expectedDuplicateSyntheticRowsAfterReseed !== 0) fail('Stage 16A-P6A reseed validation must require zero duplicates')

  try {
    buildStage16aP6ASeedWriteAcceptancePlan({ projectRef: WC26_PRODUCTION_PROJECT_REF, branch: STAGE16A_P6A_ALLOWED_BRANCH })
    fail('Stage 16A-P6A did not block WC26 production')
  } catch (error) {
    if (!String(error.message).includes('blocked against the WC26 production project')) fail('Stage 16A-P6A WC26 block message drifted')
  }

  try {
    buildStage16aP6ASeedWriteAcceptancePlan({ projectRef: EURO28_STAGING_PROJECT_REF, branch: 'main' })
    fail('Stage 16A-P6A did not block main')
  } catch (error) {
    if (!String(error.message).includes('blocked on branch main')) fail('Stage 16A-P6A main branch block message drifted')
  }
} catch (error) {
  fail(error instanceof Error ? error.message : String(error))
}

if (packageJson.scripts?.['audit:stage16a-p6a-write-acceptance-plan'] !== 'node scripts/check-stage16a-p6a-write-acceptance-plan.mjs') {
  fail('package.json missing audit:stage16a-p6a-write-acceptance-plan')
}
if (!packageJson.scripts?.check?.includes('npm run audit:stage16a-p6a-write-acceptance-plan')) {
  fail('check script does not include audit:stage16a-p6a-write-acceptance-plan')
}
if (Object.keys(packageJson.scripts || {}).some(name => name.startsWith('stage16a:p6a'))) {
  fail('Stage 16A-P6A must not expose a stage16a:p6a write-capable npm command')
}
if (!packageJson.scripts?.['lint:foundation']?.includes('scripts/check-stage16a-p6a-write-acceptance-plan.mjs')) {
  fail('lint:foundation must include the Stage 16A-P6A audit script')
}
if (!packageJson.scripts?.['lint:foundation']?.includes('scripts/lib/stage16aSeedWriteAcceptancePlan.mjs')) {
  fail('lint:foundation must include the Stage 16A-P6A library')
}
if (!packageJson.scripts?.['lint:foundation']?.includes('scripts/__tests__/stage16aSeedWriteAcceptancePlan.test.js')) {
  fail('lint:foundation must include the Stage 16A-P6A tests')
}

const migrations = existsSync('supabase/migrations') ? readdirSync('supabase/migrations').filter(name => name.endsWith('.sql')) : []
if (migrationSequenceError(migrations)) fail(migrationSequenceError(migrations))

if (failures.length) {
  console.error('Euro Stage 16A-P6A seed write acceptance plan audit failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Euro Stage 16A-P6A seed write acceptance plan audit passed.')
console.log('Plan: exact staging ref, local env names, write flags, synthetic markers, teardown selector, zero-residue proof and reseed proof are defined.')
console.log('Safety: canStartWrite is false; hasWriteExecutor is false; no users, prediction seeds, service-role use, Supabase writes or migration change.')
console.log('Boundary: Original Predictor and KO Predictor remain separate; WC26 production and main branch fail closed.')
console.log(`Database: ${migrations.length} active migrations, sequentially numbered with no gaps.`)
