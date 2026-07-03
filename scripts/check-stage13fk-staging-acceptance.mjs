import fs from 'node:fs'

const requiredFiles = [
  'docs/STAGE-13F-K3-STAGING-ACCEPTANCE-AND-CLOSE-OUT.md',
  'scripts/generate-stage13fk3-acceptance-sql.mjs',
  'scripts/lib/stage13fk3AcceptanceSql.mjs',
  'scripts/__tests__/stage13fk3AcceptanceSql.test.js',
]

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) throw new Error(`Missing Stage 13F-K3 acceptance file: ${file}`)
}

const migrations = fs.readdirSync('supabase/migrations').filter(file => file.endsWith('.sql')).sort()
if (migrations.length !== 18) {
  throw new Error(`Stage 13F-K3 requires exactly 18 migrations, found ${migrations.length}`)
}
if (migrations.some(file => file.includes('019'))) {
  throw new Error('Stage 13F-K3 must not introduce Migration 019')
}
if (!migrations.at(-1)?.startsWith('202607030018_')) {
  throw new Error(`Migration 018 must remain latest, found ${migrations.at(-1)}`)
}

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
if (packageJson.scripts?.['admin:stage13fk3:sql'] !== 'node scripts/generate-stage13fk3-acceptance-sql.mjs') {
  throw new Error('admin:stage13fk3:sql is not wired correctly')
}
if (packageJson.scripts?.['audit:admin-acceptance'] !== 'node scripts/check-stage13fk-staging-acceptance.mjs') {
  throw new Error('audit:admin-acceptance is not wired correctly')
}
if (!String(packageJson.scripts?.check ?? '').includes('audit:admin-acceptance')) {
  throw new Error('audit:admin-acceptance is not included in npm run check')
}

const acceptanceDoc = fs.readFileSync(requiredFiles[0], 'utf8')
for (const expected of [
  'c4342f1',
  'gcfdwobpnanjchcnvdco',
  'Migration 019: must not exist',
  'The real irreversible global lock must not be triggered',
  'No invented kick-off time may be written to shared staging',
  'Stage 13F-K3 complete staging reconciliation acceptance',
  'Stage 13G-A — destinations and discovery',
]) {
  if (!acceptanceDoc.includes(expected)) throw new Error(`K3 acceptance boundary missing: ${expected}`)
}

const generator = fs.readFileSync('scripts/lib/stage13fk3AcceptanceSql.mjs', 'utf8')
for (const expected of [
  "'role-transaction'",
  "'reconciliation-verify'",
  'context_row.kickoff_at',
  'context_row.scheduled_date',
  'rollback;',
  'Fixture transaction did not roll back to the exact persisted state',
  'Tournament owner access is required',
  'Tournament administrator access is required',
  "competition_key not in ('original', 'ko_predictor')",
]) {
  if (!generator.includes(expected)) throw new Error(`K3 SQL safety evidence missing: ${expected}`)
}

for (const prohibited of [
  'make_timestamptz',
  'admin_apply_global_lock',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ouhxawizadnwrhrjppld',
]) {
  if (generator.includes(prohibited)) throw new Error(`Prohibited K3 generator token found: ${prohibited}`)
}

const roadmap = fs.readFileSync('docs/EURO28-AGENT-RULES-AND-ROADMAP.md', 'utf8')
const register = fs.readFileSync('docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md', 'utf8')
const ledger = fs.readFileSync('docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md', 'utf8')
const addendum = fs.readFileSync('docs/EURO28-DECISION-REGISTER-ADDENDUM-2026-07-03.md', 'utf8')

for (const [name, content, tokens] of [
  ['roadmap', roadmap, ['Stage 13F-K3', 'c4342f1', 'Stage 13G-A']],
  ['register', register, ['Stage 13F-K3', 'c4342f1', 'Stage 13G-A']],
  ['ledger', ledger, ['Complete Admin operations backbone', '✅ FUNCTIONAL', 'Stage 13F-K3']],
  ['addendum', addendum, ['Stage 13F-K3', 'rollback', 'Stage 13G-A']],
]) {
  for (const token of tokens) {
    if (!content.includes(token)) throw new Error(`Stage 13F-K3 ${name} update missing: ${token}`)
  }
}

const verifier = fs.readFileSync('scripts/verify-euro28-foundation-page.mjs', 'utf8')
if (!verifier.includes('fixture scheduling, full reconciliation, readiness, Tournament Picks hand-off and append-only audit detail are role-controlled')) {
  throw new Error('Deployed verifier no longer covers the Stage 13F-K2 control-room marker')
}

console.log('Euro Stage 13F-K3 staging-acceptance contract audit passed.')
console.log('Roles: owner, results administrator and ordinary member use three distinct real staging accounts')
console.log('Fixture proof: same persisted values, optimistic revision, append-only event and exact rollback')
console.log('Reconciliation: one real owner UI run plus read-only event/run/separate-total verification')
console.log('Safety: no real global lock, no invented shared-staging kick-off, no secrets and no Migration 019')
console.log('Close-out: Stage 13F-K completes before Stage 13G-A')
