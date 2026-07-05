import { existsSync, readdirSync, readFileSync } from 'node:fs'
import {
  EURO28_STAGING_PROJECT_REF,
  STAGE16A_P3_DRY_RUN_LEAGUES,
  STAGE16A_P3_DRY_RUN_OPERATIONS,
  STAGE16A_P3_SEED_MANIFEST_VERSION,
  STAGE16A_P3_TEAM_SLOTS,
  WC26_PRODUCTION_PROJECT_REF,
  buildStage16aSeedManifestDryRun,
  validateStage16aSeedManifest,
} from './lib/stage16aSeedManifest.mjs'

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

const doc = read('docs/STAGE-16A-P3-SEED-MANIFEST-DRY-RUN.md')
const scopeDoc = read('docs/STAGE-16A-SCOPE-ALIGNMENT.md')
const register = read('docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md')
const ledger = read('docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md')
const agentRules = read('docs/EURO28-AGENT-RULES-AND-ROADMAP.md')
const p1Doc = read('docs/STAGE-16A-P1-SYNTHETIC-IDENTITY-PLUMBING.md')
const p2Doc = read('docs/STAGE-16A-P2-STAGING-EFFECTIVE-DATABASE-TIME.md')
const lib = read('scripts/lib/stage16aSeedManifest.mjs')
const tests = read('scripts/__tests__/stage16aSeedManifest.test.js')
const packageJson = JSON.parse(read('package.json') || '{}')

for (const marker of [
  'Stage 16A-P3 — Seed manifest dry-run',
  'manifest dry-run only',
  STAGE16A_P3_SEED_MANIFEST_VERSION,
  EURO28_STAGING_PROJECT_REF,
  WC26_PRODUCTION_PROJECT_REF,
  '24 provisional team slots',
  '19 synthetic personas',
  '11 resettable time-phase cases',
  'does not create Auth users',
  'does not write to Supabase',
  'does not seed predictions',
  'does not require service-role credentials',
  'Original Predictor and KO Predictor remain separate',
  'seed → validate → teardown → zero residue → reseed',
  'Active migrations remain 18 and Migration 019 must not exist',
]) {
  assertIncludes('Stage 16A-P3 doc', doc, marker)
}

for (const league of STAGE16A_P3_DRY_RUN_LEAGUES) {
  for (const [label, text] of Object.entries({
    'Stage 16A-P3 doc': doc,
    'seed manifest lib': lib,
  })) {
    assertIncludes(label, text, league.key)
  }
}

for (const operation of STAGE16A_P3_DRY_RUN_OPERATIONS) {
  assertIncludes('seed manifest lib', lib, operation.key)
}

for (const marker of [
  'Stage 16A-P3',
  'Seed manifest dry-run',
  'manifest dry-run only',
  '24 provisional team slots',
  '19 synthetic personas',
  '11 resettable time-phase cases',
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
  '16A-P3 — Seed manifest dry-run',
  'seed-manifest dry-run',
]) {
  assertIncludes('Stage 16A-P1 doc', p1Doc, marker)
  assertIncludes('Stage 16A-P2 doc', p2Doc, marker)
}

try {
  const validation = validateStage16aSeedManifest()
  if (validation.personaCount !== 19) fail(`Expected 19 personas, found ${validation.personaCount}`)
  if (validation.teamSlotCount !== 24) fail(`Expected 24 provisional team slots, found ${validation.teamSlotCount}`)
  if (validation.timeCaseCount !== 11) fail(`Expected 11 time cases, found ${validation.timeCaseCount}`)
  if (!validation.dryRunOnly) fail('Stage 16A-P3 must be dry-run only')
  if (validation.writesDatabase) fail('Stage 16A-P3 must not write to the database')
  if (validation.createsUsers) fail('Stage 16A-P3 must not create users')
  if (validation.seedsPredictions) fail('Stage 16A-P3 must not seed predictions')
  if (validation.createsMigration) fail('Stage 16A-P3 must not create a migration')
  if (validation.combinesCompetitions) fail('Stage 16A-P3 must not combine competitions')
} catch (error) {
  fail(error instanceof Error ? error.message : String(error))
}

try {
  const plan = buildStage16aSeedManifestDryRun({ projectRef: EURO28_STAGING_PROJECT_REF })
  if (plan.stage !== '16A-P3') fail('Stage 16A-P3 plan has wrong stage key')
  if (plan.requiresServiceRole !== false) fail('Stage 16A-P3 dry run must not require service-role credentials')
  if (plan.plannedCounts.provisionalTeamSlots !== 24) fail('Stage 16A-P3 plan must include 24 provisional team slots')
  if (plan.teardownGuard.requiresReservedEmailDomain !== true) fail('Stage 16A-P3 teardown guard must require reserved email domain')
  if (plan.teardownGuard.requiresSyntheticMetadataMarker !== true) fail('Stage 16A-P3 teardown guard must require synthetic metadata marker')
  try {
    buildStage16aSeedManifestDryRun({ projectRef: WC26_PRODUCTION_PROJECT_REF })
    fail('Stage 16A-P3 did not block WC26 production')
  } catch (error) {
    if (!String(error.message).includes('blocked against the WC26 production project')) fail('Stage 16A-P3 WC26 block message drifted')
  }
} catch (error) {
  fail(error instanceof Error ? error.message : String(error))
}

if (packageJson.scripts?.['audit:stage16a-p3-seed-manifest'] !== 'node scripts/check-stage16a-p3-seed-manifest.mjs') {
  fail('package.json missing audit:stage16a-p3-seed-manifest')
}
if (!packageJson.scripts?.check?.includes('npm run audit:stage16a-p3-seed-manifest')) {
  fail('check script does not include audit:stage16a-p3-seed-manifest')
}
if (!packageJson.scripts?.['lint:foundation']?.includes('scripts/check-stage16a-p3-seed-manifest.mjs')) {
  fail('lint:foundation must include the Stage 16A-P3 audit script')
}

const migrations = existsSync('supabase/migrations') ? readdirSync('supabase/migrations').filter(name => name.endsWith('.sql')) : []
if (migrations.length !== 18) fail(`Stage 16A-P3 expects 18 active migrations, found ${migrations.length}`)
const migration019 = migrations.find(name => /019|migration[-_ ]?019/i.test(name))
if (migration019) fail(`Stage 16A-P3 must not create Migration 019: ${migration019}`)

if (failures.length > 0) {
  console.error(`Stage 16A-P3 seed manifest dry-run audit failed with ${failures.length} issue(s):`)
  for (const message of failures) console.error(`- ${message}`)
  process.exit(1)
}

console.log('Euro Stage 16A-P3 seed manifest dry-run audit passed.')
console.log('Manifest: 24 provisional team slots, 19 synthetic personas, 11 time-phase cases and three league shapes are planned.')
console.log('Safety: dry-run only; no users, prediction seeds, service-role use, Supabase writes or migration change.')
console.log('Boundary: Original Predictor and KO Predictor remain separate; WC26 production fails closed.')
console.log('Database: active migrations remain 18; no Migration 019.')
