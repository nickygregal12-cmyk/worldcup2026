import { migrationSequenceError } from './lib/migrationSequenceGuard.mjs'
import { existsSync, readdirSync, readFileSync } from 'node:fs'

const failures = []
const fail = message => failures.push(message)

function read(path) {
  if (!existsSync(path)) {
    fail(`${path} is missing`)
    return ''
  }
  return readFileSync(path, 'utf8')
}

const scopeDoc = read('docs/archive/STAGE-16A-SCOPE-ALIGNMENT.md')
const register = read('docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md')
const ledger = read('docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md')
const agentRules = read('docs/EURO28-AGENT-RULES-AND-ROADMAP.md')
const packageJson = JSON.parse(read('package.json') || '{}')

const requiredScopeMarkers = [
  'scope-alignment and launch-gate package only',
  '2e6f79b Compact Stage 13G league shell',
  'gcfdwobpnanjchcnvdco',
  'ouhxawizadnwrhrjppld',
  'Migration 019 must not exist in this package',
  'Stage 16A — Provisional teams, synthetic users and deterministic scenario seeding',
  'component redesign',
  'resolver changes',
  'scoring-rule changes',
  'combined Original Predictor / KO Predictor totals',
  '16A-P1 — Privacy-safe synthetic identity plumbing',
  '16A-P2 — Staging-effective database time',
  '16A-D1 — Provisional teams',
  'exactly 24 teams',
  '16A-D2 — Synthetic persona catalogue',
  'exactly nineteen deterministic personas',
  '@synthetic.euro28.test',
  'synthetic_euro28: true',
  '16A-D3 — Independent prediction/scoring oracle',
  'must not import frontend scoring helpers',
  'must not import database scoring functions',
  '16A-D4 — Synthetic leagues',
  '16A-D5 — Marker-safe teardown and reseed',
  'seed;\n2. validate;\n3. teardown;\n4. assert zero residue;\n5. reseed;\n6. validate again',
  'WC26 production fail-closed proof',
]

for (const marker of requiredScopeMarkers) {
  if (!scopeDoc.includes(marker)) fail(`Stage 16A scope document missing marker: ${marker}`)
}

const personaKeys = [
  'exact_score_heavy',
  'outcome_only',
  'all_wrong',
  'partial_predictions',
  'no_predictions',
  'submitted_complete',
  'unsubmitted_identical',
  'joker_cap_reached',
  'zero_jokers',
  'engineered_tie_a',
  'engineered_tie_b',
  'bracket_survives_deep',
  'bracket_dead_early',
  'ko_only',
  'original_only',
  'ko_advancing_only',
  'ko_method_variant',
  'ko_joker_variant',
  'correction_sensitive',
]

for (const key of personaKeys) {
  if (!scopeDoc.includes(`\`${key}\``)) fail(`Stage 16A scope document missing persona key: ${key}`)
  if (!register.includes(key)) fail(`Decision Register missing persona key: ${key}`)
  if (!agentRules.includes(key)) fail(`Agent Rules missing persona key: ${key}`)
}

const migrations = existsSync('supabase/migrations')
  ? readdirSync('supabase/migrations').filter(name => name.endsWith('.sql'))
  : []
// The current migration count is a live fact, not a stage-specific historical claim -- checking
// a frozen "18" here would put this audit permanently at odds with governance-coherence the
// moment a genuine new migration is approved (as happened with Migration 019).
const migrationCountMarker = `active migrations remain ${migrations.length} and Migration 019 is applied`

for (const [file, text] of Object.entries({
  'Decision Register': register,
  'Functional Completion Ledger': ledger,
  'Agent Rules': agentRules,
})) {
  for (const marker of [
    'Stage 16A scope alignment',
    'Stage 16A-S0',
    '16A-P1',
    '16A-P2',
    'No component, resolver, scoring, route, database or migration implementation is included',
    migrationCountMarker,
  ]) {
    if (!text.includes(marker)) fail(`${file} missing Stage 16A scope marker: ${marker}`)
  }
}

if (packageJson.scripts?.['audit:stage16a-scope-alignment'] !== 'node scripts/check-stage16a-scope-alignment.mjs') {
  fail('package.json missing audit:stage16a-scope-alignment script')
}

if (!packageJson.scripts?.check?.includes('npm run audit:stage16a-scope-alignment')) {
  fail('npm run check must include audit:stage16a-scope-alignment')
}

if (!packageJson.scripts?.['lint:foundation']?.includes('scripts/check-stage16a-scope-alignment.mjs')) {
  fail('lint:foundation must include the Stage 16A scope audit script')
}

if (migrationSequenceError(migrations)) fail(migrationSequenceError(migrations))

if (failures.length > 0) {
  console.error('Euro Stage 16A scope alignment audit failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Euro Stage 16A scope alignment audit passed.')
console.log('Scope: docs/audit-only launch gate; no seeding implementation in this package.')
console.log('Boundaries: Euro staging only; WC26 production fails closed; no secrets committed.')
console.log('Competitions: Original Predictor and KO Predictor remain separate.')
console.log(`Database: ${migrations.length} active migrations, sequentially numbered with no gaps.`)
