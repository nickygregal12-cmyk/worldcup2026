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

function assertIncludes(label, text, marker) {
  if (!text.includes(marker)) fail(`${label} missing marker: ${marker}`)
}

const spec = read('docs/archive/STAGE-13G-GROUPS-BRACKET-REFERENCE-ADOPTION.md')
const register = read('docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md')
const ledger = read('docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md')
const agentRules = read('docs/EURO28-AGENT-RULES-AND-ROADMAP.md')
// Groups and Original Bracket are now governed by their v2 contracts (Stage
// CONTRACTS-PROTOTYPE-V2-INSTALL). The v1 files are retained only as `-v1-superseded` provenance
// and are deliberately not asserted against.
const groupsPrototype = read('docs/reference-prototypes/euro28-groups-page-prototype-v2.html')
const bracketPrototype = read('docs/reference-prototypes/euro28-bracket-page-prototype-v2.html')
const packageJson = JSON.parse(read('package.json') || '{}')

for (const marker of [
  'Stage 13G-REF-2',
  'Groups and Original Bracket Reference Prototype Adoption',
  'euro28-groups-page-prototype.html',
  'euro28-bracket-page-prototype.html',
  'Migration 019',
  'no UI build',
  'no route implementation',
  'no scoring change',
  'no resolver change',
  'no Supabase write',
  'no fixture-data implementation',
  'no score-stepper UI implementation',
]) {
  for (const [label, text] of Object.entries({
    'Stage 13G-REF-2 spec': spec,
    'Decision Register': register,
    'Functional Completion Ledger': ledger,
    'Agent Rules': agentRules,
  })) assertIncludes(label, text, marker)
}

// The spec is a frozen historical record of this stage's own completion and keeps its original
// "18" marker; Decision Register, Ledger and Agent Rules are governing docs that must always
// reflect the live migration count (see check-governance-coherence.mjs).
assertIncludes('Stage 13G-REF-2 spec', spec, 'active migrations remain 18')
{
  const migrationsForMarker = existsSync('supabase/migrations')
    ? readdirSync('supabase/migrations').filter(name => name.endsWith('.sql'))
    : []
  const liveMigrationCountMarker = `active migrations remain ${migrationsForMarker.length}`
  for (const [label, text] of Object.entries({
    'Decision Register': register,
    'Functional Completion Ledger': ledger,
    'Agent Rules': agentRules,
  })) assertIncludes(label, text, liveMigrationCountMarker)
}

for (const marker of [
  'b7f50de',
  'Stage 13F-K3 staging acceptance evidence remains recorded at commit b7f50de',
]) assertIncludes('Decision Register', register, marker)

for (const marker of [
  'Joker control',
  'bare `J` circle is retired',
  'star icon',
  '`Joker` label',
  '`2×` when armed',
  'gold card border',
  'Disabled treatment appears at cap',
  'five-dot gold JOKER METER',
  'By group | By date',
  'by group while predicting',
  'by date once play begins',
  'third-place ranking across all six groups',
  'Top four are marked as bracket-bound',
  'Calculated live from your predictions.',
  'This changes your bracket',
  'FLAG-FOR-RE-PICK',
  'never silently kept and not silently dropped',
  'Lucky Dip',
  'fills only blank scores in the current group',
  'points chip',
  'You predicted',
  'autosave pill',
  'privacy context banner',
  'zero dev text',
  'Match card meta line',
  'date · venue with the host country',
  'host-country circle flag',
  'fixture data',
  'existing circle-flag asset pipeline',
  'Score steppers',
  '≥640px',
  'clamp 0–15',
  'blank field as zero',
  'same save, coherence-warning and standings flow',
  'pointer-only exemption',
  'Undersized targets must not ship silently',
]) {
  for (const [label, text] of Object.entries({
    'Stage 13G-REF-2 spec': spec,
    'Decision Register': register,
    'Agent Rules': agentRules,
  })) assertIncludes(label, text, marker)
}

for (const marker of [
  'Original Bracket reference prototype adoption',
  'CONTRACT CHANGE / MOVED INTO 13G',
  'Below 900px',
  'At ≥900px',
  'converging wall chart',
  'ONE state, ONE set of tie/slot primitives',
  'No layout-specific logic',
  'slot-reference origin',
  '`1B`',
  '`2A`',
  '`3DEF`',
  'dashed placeholder chips',
  'tap-to-advance',
  'winner-only',
  'downstream picks that are no longer fed',
  'surviving picks persist',
  'Re-pick — your tables changed this tie',
  'winner picks only',
  'group predictions decide this bracket',
  'no score inputs',
  'no method controls',
  'no joker controls',
  'without connector lines',
  'share-card rendering lands in its own follow-on batch',
  '900px single breakpoint',
]) {
  for (const [label, text] of Object.entries({
    'Stage 13G-REF-2 spec': spec,
    'Decision Register': register,
    'Agent Rules': agentRules,
  })) assertIncludes(label, text, marker)
}

for (const marker of [
  '13G Groups reference prototype adoption',
  'S3.1 Joker control',
  'S3.3 Groups view switcher',
  '4.2 Predicted tables',
  '4.3 Third-place table',
  'Part 1.3 bracket coherence',
  'Match card meta line',
  'Score steppers',
  '13G Original Bracket reference prototype adoption',
  'Charter v1.8 wall chart',
  'Original Bracket control absence',
]) assertIncludes('Functional Completion Ledger', ledger, marker)

for (const [label, text, markers] of [
  // Groups v2: hero/watermark/context-banner are gone, so the v1 'NIGHT BROADCAST CONTRACT' banner and
  // its single-file implementation tokens ('mflag', 'const VEN', 'Tables fast path', ...) no longer
  // exist. These assert what v2 actually contains: the compact strip, the playing-card joker icon,
  // always-reachable collapsible tables, the bracket flow CTA, and in-tournament score-vs-pick chips.
  ['Groups v2 prototype reference', groupsPrototype, [
    'Groups v2 — Euro 2028 Predictor (prototype)',
    'COMPACT strip: view toggle · jokers · progress. Nothing else above the matches.',
    'JOKER PLAYING CARD icon — replaces the star.',
    'hero/watermark/context-banner removed',
    'Tables: collapsible so the page stays about predicting. Group table + third-place ALWAYS available.',
    'Your predicted tables',
    'Best third-placed — from your predictions',
    'Continue to your bracket',
    'cards carry date · time · stadium + host flag',
    'By group',
    'By date',
    'Exact +60',
  ]],
  // Bracket v2: mobile defaults to portrait stacked pick-a-winner cards and the wall chart becomes a
  // reversible opt-in, so the v1 markers 'APPROVED VISUAL CONTRACT', 'proper desktop wall chart' and
  // 'winner-only' no longer exist. These assert the v2 shape: stacked predicting state, reversible
  // wall-chart toggle, and the Locked Bracket/Health sub-tabs carrying the Bracket Health contract.
  ['Bracket v2 prototype reference', bracketPrototype, [
    'Original Bracket v2 — Euro 2028 Predictor (prototype)',
    'PREDICTING STATE — mobile stacked, tap a team to pick',
    'WALL CHART — desktop native (≥900px) or mobile opt-in landscape',
    'View as wall chart',
    'Back to list',
    'no score inputs, no joker controls',
    'HEALTH TAB — existing approved contract, carried forward as a tab',
    'On your path / Alive different path / Route conflict / Out categories',
    'Points still available, by round',
    'Your predicted bracket itself never changes.',
  ]],
]) {
  for (const marker of markers) assertIncludes(label, text, marker)
}

if (packageJson.scripts?.['audit:stage13g-groups-bracket-reference-adoption'] !== 'node scripts/check-stage13g-groups-bracket-reference-adoption.mjs') {
  fail('package.json missing audit:stage13g-groups-bracket-reference-adoption script')
}

if (!packageJson.scripts?.check?.includes('npm run audit:stage13g-groups-bracket-reference-adoption')) {
  fail('npm run check must include audit:stage13g-groups-bracket-reference-adoption')
}

if (!packageJson.scripts?.['lint:foundation']?.includes('scripts/check-stage13g-groups-bracket-reference-adoption.mjs')) {
  fail('lint:foundation must include scripts/check-stage13g-groups-bracket-reference-adoption.mjs')
}

const migrations = existsSync('supabase/migrations')
  ? readdirSync('supabase/migrations').filter(name => name.endsWith('.sql'))
  : []

if (migrationSequenceError(migrations)) fail(migrationSequenceError(migrations))

if (failures.length > 0) {
  console.error('Euro Stage 13G-REF-2 Groups/Bracket reference adoption audit failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Euro Stage 13G-REF-2 Groups/Bracket reference adoption audit passed.')
console.log('Groups: binding v2 contract — compact strip, playing-card joker icon, always-reachable collapsible tables, bracket flow CTA.')
console.log('Bracket: binding v2 contract — stacked pick-a-winner mobile default, reversible wall-chart opt-in, Locked Bracket/Health sub-tabs.')
console.log('Scope: docs/audit-only; no UI build, route implementation, scoring, resolver, Supabase write or migration change.')
console.log(`Database: ${migrations.length} active migrations, sequentially numbered with no gaps.`)
