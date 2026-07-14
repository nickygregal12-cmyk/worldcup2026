import { migrationSequenceError } from './lib/migrationSequenceGuard.mjs'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import {
  EURO28_STAGING_PROJECT_REF,
  STAGE16A_P6B_ALLOWED_BRANCH,
  STAGE16A_P6B_BLOCKED_COMMANDS,
  STAGE16A_P6B_EXECUTOR_PREPARATION_VERSION,
  STAGE16A_P6B_REQUIRED_LOCAL_ENV_KEYS,
  WC26_PRODUCTION_PROJECT_REF,
  buildStage16aP6BSeedWriteExecutorPreparation,
  validateStage16aP6BSeedWriteExecutorPreparation,
} from './lib/stage16aSeedWriteExecutorPreparation.mjs'

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

const doc = read('docs/archive/STAGE-16A-P6B-SEED-WRITE-EXECUTOR-PREPARATION.md')
const scopeDoc = read('docs/archive/STAGE-16A-SCOPE-ALIGNMENT.md')
const register = read('docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md')
const ledger = read('docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md')
const agentRules = read('docs/EURO28-AGENT-RULES-AND-ROADMAP.md')
const roadmap = read('docs/PRODUCT-COMPLETENESS-ROADMAP.md')
const p6aDoc = read('docs/archive/STAGE-16A-P6A-SEED-WRITE-ACCEPTANCE-PLAN.md')
const lib = read('scripts/lib/stage16aSeedWriteExecutorPreparation.mjs')
const tests = read('scripts/__tests__/stage16aSeedWriteExecutorPreparation.test.js')
const packageJson = JSON.parse(read('package.json') || '{}')

for (const marker of [
  'Stage 16A-P6B — Seed write executor preparation only',
  STAGE16A_P6B_EXECUTOR_PREPARATION_VERSION,
  EURO28_STAGING_PROJECT_REF,
  WC26_PRODUCTION_PROJECT_REF,
  STAGE16A_P6B_ALLOWED_BRANCH,
  'writesDatabase: false',
  'createsUsers: false',
  'seedsProvisionalTeams: false',
  'seedsPredictions: false',
  'seedsLeagues: false',
  'usesServiceRoleCredential: false',
  'readsServiceRoleCredential: false',
  'canStartWrite: false',
  'hasWriteExecutor: false',
  'exposesWriteCommand: false',
  'requiresExplicitNextSliceApproval: true',
  'does not execute Supabase writes',
  'does not create Auth users',
  'does not seed predictions',
  'does not read or print service-role credentials',
  'does not create Migration 019',
  'Original Predictor and KO Predictor remain separate',
  'active migrations remain 18',
  '@synthetic.euro28.test',
  'synthetic_euro28: true',
  'zero residue',
  'reseed',
  'future P6C',
]) {
  assertIncludes('Stage 16A-P6B doc', doc, marker)
}

for (const key of STAGE16A_P6B_REQUIRED_LOCAL_ENV_KEYS) {
  assertIncludes('Stage 16A-P6B doc', doc, key)
  assertIncludes('Stage 16A-P6B lib', lib, key)
}

for (const marker of [
  'Stage 16A-P6B',
  'Seed write executor preparation only',
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
    'Product roadmap': roadmap,
  })) {
    assertIncludes(label, text, marker)
  }
}

for (const marker of [
  '16A-P6B — Seed write executor preparation only',
  'no-write preparation',
]) {
  assertIncludes('Stage 16A-P6A doc', p6aDoc, marker)
}

for (const marker of [
  'STAGE16A_P6B_EXECUTOR_PREPARATION_VERSION',
  'STAGE16A_P6B_NO_WRITE_GUARD',
  'STAGE16A_P6B_PLANNED_EXECUTOR_MODULES',
  'STAGE16A_P6B_BLOCKED_COMMANDS',
  'STAGE16A_P6B_FUTURE_ENABLEMENT_SEQUENCE',
  'buildStage16aP6BSeedWriteExecutorPreparation',
  'validateStage16aP6BSeedWriteExecutorPreparation',
  'hasWriteExecutor',
  'plannedExecutorModules',
  'blockedCommands',
  'futureEnablementSequence',
]) {
  assertIncludes('Stage 16A-P6B lib', lib, marker)
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
  if (lib.includes(forbidden)) fail(`Stage 16A-P6B library must not contain executable write/secret marker: ${forbidden}`)
}

for (const marker of [
  'keeps P6B as executor preparation with no write executor',
  'inherits the P6A acceptance counts, env names and safety boundary',
  'defines planned executor modules but keeps every module non-executable',
  'preserves dual-marker teardown, zero residue and reseed proof',
  'keeps Original Predictor and KO Predictor separate',
  'fails closed outside Euro staging or the development branch',
]) {
  assertIncludes('Stage 16A-P6B tests', tests, marker)
}

try {
  const plan = buildStage16aP6BSeedWriteExecutorPreparation({ projectRef: EURO28_STAGING_PROJECT_REF, branch: STAGE16A_P6B_ALLOWED_BRANCH })
  validateStage16aP6BSeedWriteExecutorPreparation(plan)

  if (plan.stage !== '16A-P6B') fail('Stage 16A-P6B plan has wrong stage key')
  if (plan.writesDatabase) fail('Stage 16A-P6B must not write to the database')
  if (plan.createsUsers || plan.createsProfiles) fail('Stage 16A-P6B must not create users or profiles')
  if (plan.seedsProvisionalTeams) fail('Stage 16A-P6B must not seed provisional teams')
  if (plan.seedsPredictions) fail('Stage 16A-P6B must not seed predictions')
  if (plan.seedsLeagues) fail('Stage 16A-P6B must not seed leagues')
  if (plan.usesServiceRoleCredential || plan.readsServiceRoleCredential) fail('Stage 16A-P6B must not use or read service-role credentials')
  if (plan.envValuesRead || plan.envValuesPrinted) fail('Stage 16A-P6B must not read or print env values')
  if (plan.canStartWrite) fail('Stage 16A-P6B must not be able to start writes')
  if (plan.hasWriteExecutor) fail('Stage 16A-P6B must not introduce a write executor')
  if (plan.exposesWriteCommand) fail('Stage 16A-P6B must not expose a write command')
  if (plan.generatesSql) fail('Stage 16A-P6B must not generate SQL')
  if (plan.createsMigration) fail('Stage 16A-P6B must not create a migration')
  if (plan.changesScoring || plan.changesResolver || plan.changesUiRoutes) fail('Stage 16A-P6B must not change scoring, resolver or UI routes')
  if (plan.combinesCompetitions || plan.competitions.combinedTotal) fail('Stage 16A-P6B must not combine competitions')
  if (!plan.requiresExplicitNextSliceApproval) fail('Stage 16A-P6B must require explicit next-slice approval')
  if (plan.plannedCounts.personas !== 19) fail('Stage 16A-P6B plan must include 19 personas')
  if (plan.plannedCounts.provisionalTeamSlots !== 24) fail('Stage 16A-P6B plan must include 24 provisional team slots')
  if (plan.plannedCounts.timePhaseCases !== 11) fail('Stage 16A-P6B plan must include 11 time-phase cases')
  if (plan.plannedCounts.leagues !== 3) fail('Stage 16A-P6B plan must include three league shapes')
  if (!plan.plannedExecutorModules.every(module => module.executableInP6B === false)) fail('Stage 16A-P6B planned modules must not be executable')
  for (const blockedCommand of STAGE16A_P6B_BLOCKED_COMMANDS) {
    if (!plan.blockedCommands.includes(blockedCommand)) fail(`Stage 16A-P6B missing blocked command ${blockedCommand}`)
  }
  if (!plan.teardownSelector.requiresBothMarkers) fail('Stage 16A-P6B teardown must require both markers')
  if (plan.teardownSelector.emailDomainOnlyAllowed || plan.teardownSelector.metadataOnlyAllowed) fail('Stage 16A-P6B must reject single-marker teardown')
  if (!plan.zeroResidueTargets.every(target => target.expectedAfterTeardown === 0)) fail('Stage 16A-P6B zero-residue targets must all expect zero')
  if (plan.reseedValidation.expectedDuplicateSyntheticRowsAfterReseed !== 0) fail('Stage 16A-P6B reseed validation must require zero duplicates')

  try {
    buildStage16aP6BSeedWriteExecutorPreparation({ projectRef: WC26_PRODUCTION_PROJECT_REF, branch: STAGE16A_P6B_ALLOWED_BRANCH })
    fail('Stage 16A-P6B did not block WC26 production')
  } catch (error) {
    if (!String(error.message).includes('blocked against the WC26 production project')) fail('Stage 16A-P6B WC26 block message drifted')
  }

  try {
    buildStage16aP6BSeedWriteExecutorPreparation({ projectRef: EURO28_STAGING_PROJECT_REF, branch: 'main' })
    fail('Stage 16A-P6B did not block main')
  } catch (error) {
    if (!String(error.message).includes('requires branch euro28-development')) fail('Stage 16A-P6B branch block message drifted')
  }
} catch (error) {
  fail(error instanceof Error ? error.message : String(error))
}

if (packageJson.scripts?.['audit:stage16a-p6b-write-executor-preparation'] !== 'node scripts/check-stage16a-p6b-write-executor-preparation.mjs') {
  fail('package.json missing audit:stage16a-p6b-write-executor-preparation')
}
if (!packageJson.scripts?.check?.includes('npm run audit:stage16a-p6b-write-executor-preparation')) {
  fail('check script does not include audit:stage16a-p6b-write-executor-preparation')
}
if (Object.keys(packageJson.scripts || {}).some(name => name.startsWith('stage16a:p6b'))) {
  fail('Stage 16A-P6B must not expose a stage16a:p6b write-capable npm command')
}
if (!packageJson.scripts?.['lint:foundation']?.includes('scripts/check-stage16a-p6b-write-executor-preparation.mjs')) {
  fail('lint:foundation must include the Stage 16A-P6B audit script')
}
if (!packageJson.scripts?.['lint:foundation']?.includes('scripts/lib/stage16aSeedWriteExecutorPreparation.mjs')) {
  fail('lint:foundation must include the Stage 16A-P6B library')
}
if (!packageJson.scripts?.['lint:foundation']?.includes('scripts/__tests__/stage16aSeedWriteExecutorPreparation.test.js')) {
  fail('lint:foundation must include the Stage 16A-P6B tests')
}

const migrations = existsSync('supabase/migrations') ? readdirSync('supabase/migrations').filter(name => name.endsWith('.sql')) : []
if (migrationSequenceError(migrations)) fail(migrationSequenceError(migrations))

if (failures.length) {
  console.error('Euro Stage 16A-P6B seed write executor preparation audit failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Euro Stage 16A-P6B seed write executor preparation audit passed.')
console.log('Plan: executor module structure, blocked commands, future enablement sequence and safety boundaries are defined.')
console.log('Safety: canStartWrite is false; hasWriteExecutor is false; no users, prediction seeds, service-role use, Supabase writes or migration change.')
console.log('Boundary: Original Predictor and KO Predictor remain separate; WC26 production and non-development branches fail closed.')
console.log(`Database: ${migrations.length} active migrations, sequentially numbered with no gaps.`)
