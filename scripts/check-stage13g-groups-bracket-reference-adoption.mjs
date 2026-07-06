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

const spec = read('docs/STAGE-13G-GROUPS-BRACKET-REFERENCE-ADOPTION.md')
const register = read('docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md')
const ledger = read('docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md')
const agentRules = read('docs/EURO28-AGENT-RULES-AND-ROADMAP.md')
const groupsPrototype = read('docs/reference-prototypes/euro28-groups-page-prototype.html')
const bracketPrototype = read('docs/reference-prototypes/euro28-bracket-page-prototype.html')
const packageJson = JSON.parse(read('package.json') || '{}')

for (const marker of [
  'Stage 13G-REF-2',
  'Groups and Original Bracket Reference Prototype Adoption',
  'euro28-groups-page-prototype.html',
  'euro28-bracket-page-prototype.html',
  'active migrations remain 18',
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
  ['Groups prototype reference', groupsPrototype, ['Groups — Euro 2028 Predictor (Night Broadcast contract)', 'NIGHT BROADCAST CONTRACT', 'Preserved decisions', 'Joker', 'Lucky dip', 'Predicted third-place ranking', 'This changes your bracket', 'You predicted', 'mflag', 'const VEN', 'data-s=', 'Math.min(15', 'Tables fast path', 'sticky pill + slide-up sheet']],
  ['Bracket prototype reference', bracketPrototype, ['Bracket — Euro 2028 Predictor (visual contract)', 'APPROVED VISUAL CONTRACT', 'proper desktop wall chart', 'Round of 16 on the outside edges', 'quarter-finals and semi-finals stepping inward', 'centred final', 'small vs treatment', 'date, time, stadium and host flag', 'winner-only', 'no score inputs', 'no method controls', 'no joker controls']],
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

if (migrations.length !== 18) fail(`Expected 18 active migrations, found ${migrations.length}`)
if (migrations.some(name => /(?:^|_)019|2026070\d0019/.test(name))) fail('Migration 019 must not exist for Stage 13G-REF-2')

if (failures.length > 0) {
  console.error('Euro Stage 13G-REF-2 Groups/Bracket reference adoption audit failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Euro Stage 13G-REF-2 Groups/Bracket reference adoption audit passed.')
console.log('Groups: approved Night Broadcast contract, joker controls, tables fast path and preserved behaviour recorded.')
console.log('Bracket: approved Bracket G contract, proper wall chart, match detail and winner-only controls recorded.')
console.log('Scope: docs/audit-only; no UI build, route implementation, scoring, resolver, Supabase write or migration change.')
console.log('Database: active migrations remain 18; no Migration 019.')
