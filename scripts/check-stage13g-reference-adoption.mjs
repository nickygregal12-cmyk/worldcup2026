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

const spec = read('docs/STAGE-13G-REF-PROTOTYPE-ADOPTION.md')
const register = read('docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md')
const ledger = read('docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md')
const agentRules = read('docs/EURO28-AGENT-RULES-AND-ROADMAP.md')
const homePrototype = read('docs/reference-prototypes/euro28-home-page-prototype.html')
const leaguePrototype = read('docs/reference-prototypes/euro28-league-page-prototype.html')
const packageJson = JSON.parse(read('package.json') || '{}')

for (const marker of [
  'Stage 13G-REF',
  'Home and League reference prototype adoption',
  'euro28-home-page-prototype.html',
  'euro28-league-page-prototype.html',
  'Active migrations remain 18',
  'Migration 019',
]) {
  for (const [label, text] of Object.entries({
    'Stage 13G-REF spec': spec,
    'Decision Register': register,
    'Functional Completion Ledger': ledger,
    'Agent Rules': agentRules,
  })) {
    assertIncludes(label, text, marker)
  }
}

for (const marker of [
  'not as code to port',
  'sample data',
  'stub toasts',
  'prototype switches',
  'Google-hosted fonts',
  'CDN flags',
  'single-file architecture',
]) {
  for (const [label, text] of Object.entries({
    'Stage 13G-REF spec': spec,
    'Decision Register': register,
    'Agent Rules': agentRules,
  })) {
    assertIncludes(label, text, marker)
  }
}

for (const marker of [
  'one countdown, not two',
  'First match & prediction lock',
  'Euro 2028 starts in',
  'Predictions lock at first kick-off.',
  'One deadline. Your Original Predictor locks when the opening match kicks off.',
  'same central first-kick-off config value',
  'KO Predictor zero Home presence pre-readiness',
  'no KO Predictor card',
  'More sheet',
  'how-to-play guide',
  'everyone starts the knockouts on zero',
  'navigation tab state',
  'Home KO card existence',
  'More sheet KO entry state',
  'league KO standings availability',
  'Predict every match. Beat your mates.',
  'live → upcoming by kick-off → finished',
  'Home circle overlaps the bar line',
  'all five labels share one baseline',
  'updates if your group predictions change',
]) {
  for (const [label, text] of Object.entries({
    'Stage 13G-REF spec': spec,
    'Decision Register': register,
    'Agent Rules': agentRules,
  })) {
    assertIncludes(label, text, marker)
  }
}

for (const marker of [
  'League tables are pure',
  'no stat chips',
  'stat-chip question is closed',
  'Gap-to-leader appears on every row',
  'leader shows points clear of second',
  'accent-filled first',
  'accent outline second',
  'quiet ring third',
  'No gold',
  'no emoji',
  'dedicated S5 player view',
  'inline-H2H-below-the-league presentation is retired',
  'design-system bottom sheet',
  'danger-ghost',
  'confirmed-state plus toast',
  'Freshness is passive',
  'no refresh controls',
  'KO Predictor standings arrive at the knockouts — everyone starts on zero.',
  'rules strip renders from the central versioned ruleset',
]) {
  for (const [label, text] of Object.entries({
    'Stage 13G-REF spec': spec,
    'Decision Register': register,
    'Agent Rules': agentRules,
  })) {
    assertIncludes(label, text, marker)
  }
}

for (const marker of [
  '13G Home reference prototype adoption',
  '13G Home countdown contract',
  '13G Home KO pre-readiness presence',
  '13G League reference prototype adoption',
  '13G League table purity',
  '13G League player row destination',
  '13G League KO pre-readiness',
  '13G League rules strip',
]) {
  assertIncludes('Functional Completion Ledger', ledger, marker)
}

for (const [label, text, markers] of [
  ['Home prototype reference', homePrototype, ['Home — Euro 2028 Predictor (prototype)', 'Predict every match. Beat your mates.', 'First match', 'Predictions lock', 'KO Predictor']],
  ['League prototype reference', leaguePrototype, ['Leagues — Euro 2028 Predictor (prototype)', 'League standings', 'KO Predictor standings arrive at the knockouts — everyone starts on zero.', 'Copy invite link', 'Delete this league']],
]) {
  for (const marker of markers) assertIncludes(label, text, marker)
}

if (packageJson.scripts?.['audit:stage13g-reference-adoption'] !== 'node scripts/check-stage13g-reference-adoption.mjs') {
  fail('package.json missing audit:stage13g-reference-adoption script')
}

if (!packageJson.scripts?.check?.includes('npm run audit:stage13g-reference-adoption')) {
  fail('npm run check must include audit:stage13g-reference-adoption')
}

if (!packageJson.scripts?.['lint:foundation']?.includes('scripts/check-stage13g-reference-adoption.mjs')) {
  fail('lint:foundation must include scripts/check-stage13g-reference-adoption.mjs')
}

const migrations = existsSync('supabase/migrations')
  ? readdirSync('supabase/migrations').filter(name => name.endsWith('.sql'))
  : []

if (migrations.length !== 18) fail(`Expected 18 active migrations, found ${migrations.length}`)
if (migrations.some(name => /(?:^|_)019|2026070\d0019/.test(name))) fail('Migration 019 must not exist for Stage 13G-REF')

if (failures.length > 0) {
  console.error('Euro Stage 13G-REF prototype adoption audit failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Euro Stage 13G-REF prototype adoption audit passed.')
console.log('Home: approved reference with one-countdown and zero-KO-pre-readiness amendments recorded.')
console.log('Leagues: approved reference recorded; pure table, no stat chips, dedicated S5 player view.')
console.log('Scope: docs/audit-only; no UI build, route implementation, scoring, resolver, Supabase write or migration change.')
console.log('Database: active migrations remain 18; no Migration 019.')
