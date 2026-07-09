import { migrationSequenceError } from './lib/migrationSequenceGuard.mjs'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import {
  EURO28_STAGING_PROJECT_REF,
  STAGE16A_P4_SEED_DRY_RUN_SQL_VERSION,
  WC26_PRODUCTION_PROJECT_REF,
  assertStage16aP4ReadOnlySql,
  buildStage16aP4SeedDryRunPlan,
  buildStage16aP4SeedDryRunSql,
} from './lib/stage16aSeedDryRunSql.mjs'

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

const doc = read('docs/archive/STAGE-16A-P4-SEED-SQL-DRY-RUN.md')
const scopeDoc = read('docs/archive/STAGE-16A-SCOPE-ALIGNMENT.md')
const register = read('docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md')
const ledger = read('docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md')
const agentRules = read('docs/EURO28-AGENT-RULES-AND-ROADMAP.md')
const p2Doc = read('docs/archive/STAGE-16A-P2-STAGING-EFFECTIVE-DATABASE-TIME.md')
const p3Doc = read('docs/archive/STAGE-16A-P3-SEED-MANIFEST-DRY-RUN.md')
const lib = read('scripts/lib/stage16aSeedDryRunSql.mjs')
const generator = read('scripts/generate-stage16a-p4-seed-dry-run-sql.mjs')
const tests = read('scripts/__tests__/stage16aSeedDryRunSql.test.js')
const packageJson = JSON.parse(read('package.json') || '{}')

for (const marker of [
  'Stage 16A-P4 — Seed SQL preview dry-run',
  'read-only SELECT preview',
  STAGE16A_P4_SEED_DRY_RUN_SQL_VERSION,
  EURO28_STAGING_PROJECT_REF,
  WC26_PRODUCTION_PROJECT_REF,
  'does not execute Supabase writes',
  'does not create Auth users',
  'does not seed predictions',
  'does not require service-role credentials',
  'does not create Migration 019',
  'Original Predictor and KO Predictor remain separate',
  'active migrations remain 18',
]) {
  assertIncludes('Stage 16A-P4 doc', doc, marker)
}

for (const marker of [
  'Stage 16A-P4',
  'Seed SQL preview dry-run',
  'read-only SELECT preview',
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
  '16A-P4 — Seed SQL preview dry-run',
  'read-only SQL preview',
]) {
  assertIncludes('Stage 16A-P2 doc', p2Doc, marker)
  assertIncludes('Stage 16A-P3 doc', p3Doc, marker)
}

for (const marker of [
  'STAGE16A_P4_SEED_DRY_RUN_SQL_VERSION',
  'buildStage16aP4SeedDryRunPlan',
  'buildStage16aP4SeedDryRunSql',
  'assertStage16aP4ReadOnlySql',
  'read_only_select_preview',
  'original_competition_key',
  'ko_predictor_competition_key',
]) {
  assertIncludes('Stage 16A-P4 lib', lib, marker)
}

for (const marker of [
  'buildStage16aP4SeedDryRunSql',
  '--project-ref=',
]) {
  assertIncludes('Stage 16A-P4 generator', generator, marker)
}

for (const marker of [
  'generates only a read-only SELECT preview',
  'fails closed outside Euro staging',
  'rejects SQL text containing mutating statements',
]) {
  assertIncludes('Stage 16A-P4 tests', tests, marker)
}

try {
  const plan = buildStage16aP4SeedDryRunPlan({ projectRef: EURO28_STAGING_PROJECT_REF })
  if (plan.stage !== '16A-P4') fail('Stage 16A-P4 plan has wrong stage key')
  if (!plan.readOnlySelectPreview) fail('Stage 16A-P4 must be a read-only SELECT preview')
  if (plan.writesDatabase) fail('Stage 16A-P4 must not write to the database')
  if (plan.createsUsers) fail('Stage 16A-P4 must not create users')
  if (plan.seedsPredictions) fail('Stage 16A-P4 must not seed predictions')
  if (plan.requiresServiceRole) fail('Stage 16A-P4 must not require service-role credentials')
  if (plan.createsMigration) fail('Stage 16A-P4 must not create a migration')
  if (plan.combinesCompetitions) fail('Stage 16A-P4 must not combine competitions')
  if (plan.plannedCounts.personas !== 19) fail('Stage 16A-P4 plan must include 19 personas')
  if (plan.plannedCounts.provisionalTeamSlots !== 24) fail('Stage 16A-P4 plan must include 24 provisional team slots')
  if (plan.plannedCounts.timePhaseCases !== 11) fail('Stage 16A-P4 plan must include 11 time-phase cases')
  if (plan.plannedCounts.leagues !== 3) fail('Stage 16A-P4 plan must include three league shapes')

  const sql = buildStage16aP4SeedDryRunSql({ projectRef: EURO28_STAGING_PROJECT_REF })
  assertStage16aP4ReadOnlySql(sql)
  if (!sql.includes('select')) fail('Stage 16A-P4 SQL preview must contain SELECT')
  if (/(\binsert\b|\bupdate\b|\bdelete\b|\bmerge\b|\balter\b|\bdrop\b|\btruncate\b|\bgrant\b|\brevoke\b|\bcopy\b|\bcall\b|\bexecute\b)/i.test(sql)) {
    fail('Stage 16A-P4 SQL preview contains a mutating SQL token')
  }

  try {
    buildStage16aP4SeedDryRunSql({ projectRef: WC26_PRODUCTION_PROJECT_REF })
    fail('Stage 16A-P4 did not block WC26 production')
  } catch (error) {
    if (!String(error.message).includes('blocked against the WC26 production project')) fail('Stage 16A-P4 WC26 block message drifted')
  }
} catch (error) {
  fail(error instanceof Error ? error.message : String(error))
}

if (packageJson.scripts?.['audit:stage16a-p4-seed-dry-run-sql'] !== 'node scripts/check-stage16a-p4-seed-dry-run-sql.mjs') {
  fail('package.json missing audit:stage16a-p4-seed-dry-run-sql')
}
if (packageJson.scripts?.['stage16a:p4:sql:dry-run'] !== 'node scripts/generate-stage16a-p4-seed-dry-run-sql.mjs') {
  fail('package.json missing stage16a:p4:sql:dry-run')
}
if (!packageJson.scripts?.check?.includes('npm run audit:stage16a-p4-seed-dry-run-sql')) {
  fail('check script does not include audit:stage16a-p4-seed-dry-run-sql')
}
if (!packageJson.scripts?.['lint:foundation']?.includes('scripts/check-stage16a-p4-seed-dry-run-sql.mjs')) {
  fail('lint:foundation must include the Stage 16A-P4 audit script')
}
if (!packageJson.scripts?.['lint:foundation']?.includes('scripts/generate-stage16a-p4-seed-dry-run-sql.mjs')) {
  fail('lint:foundation must include the Stage 16A-P4 generator script')
}

const migrations = existsSync('supabase/migrations') ? readdirSync('supabase/migrations').filter(name => name.endsWith('.sql')) : []
if (migrationSequenceError(migrations)) fail(migrationSequenceError(migrations))

if (failures.length > 0) {
  console.error(`Stage 16A-P4 seed SQL preview dry-run audit failed with ${failures.length} issue(s):`)
  for (const message of failures) console.error(`- ${message}`)
  process.exit(1)
}

console.log('Euro Stage 16A-P4 seed SQL preview dry-run audit passed.')
console.log('SQL preview: read-only SELECT output only; no mutating statements are generated.')
console.log('Safety: no users, prediction seeds, service-role use, Supabase writes or migration change.')
console.log('Boundary: Original Predictor and KO Predictor remain separate; WC26 production fails closed.')
console.log(`Database: ${migrations.length} active migrations, sequentially numbered with no gaps.`)
