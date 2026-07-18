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

const spec = read('docs/archive/STAGE-13G-REF-PROTOTYPE-ADOPTION.md')
const register = read('docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md')
const ledger = read('docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md')
const agentRules = read('docs/EURO28-AGENT-RULES-AND-ROADMAP.md')
// Home is now governed by the final Product Experience, with its v2 contract retained as provenance.
// Leagues was amended by the owner on 2026-07-17: the final Product Experience plus the shared
// production modules own the final direction, while the
// standalone League HTML is retained as provenance only. The checks below replace the former
// "movement arrows remain active" prototype assertion with stronger production-hierarchy checks;
// this is the explicit §5.8 ratchet amendment recorded by FINAL-LEAGUES-VERTICAL-SLICE.
const homePrototype = read('docs/reference-prototypes/euro28-home-page-prototype-v2.html')
const leaguePrototype = read('docs/reference-prototypes/euro28-league-page-prototype.html')
const productExperience = read('docs/reference-prototypes/euro28-product-experience-final.md')
const leaguePage = read('src/leagues/Leagues.jsx')
const leagueToolbar = read('src/leagues/LeagueToolbar.jsx')
const leaguePresentation = read('src/leagues/LeaguePresentation.jsx')
const leagueHeroStyles = read('src/leagues/LeagueHero.module.css')
const leagueRaceStyles = read('src/leagues/leagueRace.module.css')
const packageJson = JSON.parse(read('package.json') || '{}')

for (const marker of [
  'Stage 13G-REF',
  'Home and League reference prototype adoption',
  'euro28-home-page-prototype.html',
  'euro28-league-page-prototype.html',
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

// The spec is a frozen historical record of this stage's own completion and keeps its original
// "18" marker; Decision Register, Ledger and Agent Rules are governing docs that must always
// reflect the live migration count (see check-governance-coherence.mjs).
assertIncludes('Stage 13G-REF spec', spec, 'Active migrations remain 18')
{
  const migrationsForMarker = existsSync('supabase/migrations')
    ? readdirSync('supabase/migrations').filter(name => name.endsWith('.sql'))
    : []
  const liveMigrationCountMarker = `Active migrations remain ${migrationsForMarker.length}`
  for (const [label, text] of Object.entries({
    'Decision Register': register,
    'Functional Completion Ledger': ledger,
    'Agent Rules': agentRules,
  })) {
    assertIncludes(label, text, liveMigrationCountMarker)
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
  // Home v2: the twin countdown grid is gone, so the v1 markers 'First match' / 'Predictions lock at
  // first kick-off.' no longer exist. These assert what v2 actually contains: a single countdown,
  // Groups card language on the featured match, tap-through to Match Centre, three tournament states,
  // and the pre-tournament-only scoring link.
  ['Home v2 prototype reference', homePrototype, [
    'Home v2 — Euro 2028 Predictor (prototype: 3 tournament states)',
    'ONE countdown, not two: the lock IS the first kick-off, so a single moment matters',
    'one countdown not two (the lock IS kick-off — one moment)',
    'Predictions lock at kick-off',
    'featured match uses the exact Groups card language',
    'whole match card taps through to Match Centre',
    'Match Centre',
    'How scoring works',
    'Pre-tournament',
    'Matchday (live)',
    'Post-match',
  ]],
  ['Retired League prototype provenance', leaguePrototype, ['RETIRED AS ACTIVE VISUAL AUTHORITY 2026-07-17', 'historical visual provenance only', 'compact Match Centre at the top', 'full user row clickable']],
  ['Final Product Experience League authority', productExperience, ['The page begins with the Original/KO collection switch only when KO is available', 'competition-specific league selector', 'one contiguous mobile standings table', 'Table and Activity are mutually exclusive views']],
  ['Final League page hierarchy', leaguePage, ['layoutStyles.contextDock', '<LeagueCollectionTabs', '<LeagueToolbar', '<LeagueHero', '<LeagueStandingsPanel']],
  // Toolbar and hero pins re-pointed at the PROTOTYPE-PACK-CONSOLIDATION-1 full-redesign
  // ruling (2026-07-18): the switcher is a chip rail, create/join are dashed entry actions,
  // and the identity card is the prototype's pitch-striped surface card with share.
  ['Final competition-specific league toolbar', leagueToolbar, ['<LeaguePicker', 'selectedLeagueId', 'Create league', 'Join with code']],
  ['Final League presentation', leaguePresentation, ['LeagueCompetitionHeading', 'raceStyles.tableHeader', 'currentUserRow', '<PlayerIdentity', 'podiumCutline']],
  ['Final League hero styling', leagueHeroStyles, ['.shareButton', '.leagueChip', 'repeating-linear-gradient']],
  ['Final League table styling', leagueRaceStyles, ['.tableHeader', '.currentUserRow', 'box-shadow: inset 0.3rem 0 0 var(--dp-action)']],
]) {
  for (const marker of markers) assertIncludes(label, text, marker)
}

const collectionIndex = leaguePage.indexOf('<LeagueCollectionTabs')
const toolbarIndex = leaguePage.indexOf('<LeagueToolbar')
const heroIndex = leaguePage.indexOf('<LeagueHero')
const tableIndex = leaguePage.indexOf('<LeagueStandingsPanel')
if (!(collectionIndex >= 0 && toolbarIndex > collectionIndex && heroIndex > toolbarIndex && tableIndex > heroIndex)) {
  fail('Final League hierarchy must remain collection switch, league picker, selected league identity, then standings')
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

if (migrationSequenceError(migrations)) fail(migrationSequenceError(migrations))

if (failures.length > 0) {
  console.error('Euro Stage 13G-REF prototype adoption audit failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Euro Stage 13G-REF prototype adoption audit passed.')
console.log('Home: binding v2 contract — single countdown (lock IS first kick-off), Groups card language on the featured match, tap-through to Match Centre, three tournament states.')
console.log('Leagues: the final Product Experience hierarchy is active; the standalone League HTML is provenance only.')
console.log('Production: collection switch → competition-specific league picker → league identity → compact full-row standings.')
console.log(`Database: ${migrations.length} active migrations, sequentially numbered with no gaps.`)
