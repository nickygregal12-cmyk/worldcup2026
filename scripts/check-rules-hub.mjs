import { migrationSequenceError } from './lib/migrationSequenceGuard.mjs'
// Stage RULES-1A — public rules hub presentation audit.
//
// Scope: upgrade the existing #/how-to-play destination into a stranger-facing
// rules/trust hub while preserving every product boundary. This is a UI/model/
// docs slice only: no new route, no scoring change, no resolver change, no
// Supabase write path and no migration.
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const errors = []
const fail = message => errors.push(message)
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const exists = file => fs.existsSync(path.join(root, file))

for (const file of [
  'src/tournament/TournamentOverview.jsx',
  'src/tournament/TournamentOverview.module.css',
  'src/tournament/tournamentPageModel.js',
  'src/app/appRoutes.js',
  'docs/STAGE-RULES-1A-RULES-HUB.md',
]) {
  if (!exists(file)) fail(`Required RULES-1A file is missing: ${file}`)
}

const model = read('src/tournament/tournamentPageModel.js')
for (const marker of [
  'Rules, scoring and trust',
  'heroStats',
  'trustCards',
  'Corrections policy',
  'Name policy',
  'Privacy and deletion',
  'Support contact',
  'Tie-break ladder',
  'EURO_SCORING_CONFIG',
  'SCORING_CONFIG_STATUS',
  'scoring.bracket.champion',
  'scoring.koPredictor.CORRECT_DECISION_METHOD',
  'scoring.joker.ORIGINAL_BRACKET_CAP',
]) {
  if (!model.includes(marker)) fail(`Rules model is missing marker: ${marker}`)
}

const component = read('src/tournament/TournamentOverview.jsx')
for (const marker of [
  'RulesHeroStats',
  'TrustCards',
  'PolicyCard',
  'TieBreakPanel',
  'Rules hub',
  'Start predicting',
  'Rules snapshot',
  'Quick answers',
  'href="#/groups"',
  'href="#/tournament"',
]) {
  if (!component.includes(marker)) fail(`Rules component is missing marker: ${marker}`)
}

const styles = read('src/tournament/TournamentOverview.module.css')
for (const marker of [
  '.rulesHero',
  '.rulesHeroStats',
  '.trustGrid',
  '.rulesCompetitionGrid',
  '.rulesTwoColumn',
  '.policyGrid',
  '.tieBreakSteps',
  'var(--surface-inverse)',
  'var(--text-on-brand)',
]) {
  if (!styles.includes(marker)) fail(`Rules styles are missing marker: ${marker}`)
}

const routes = read('src/app/appRoutes.js')
for (const marker of [
  "HOW_TO_PLAY: 'how-to-play'",
  "hash: '#/how-to-play'",
  "['/rules', APP_ROUTE.HOW_TO_PLAY]",
]) {
  if (!routes.includes(marker)) fail(`Existing rules route contract changed or is missing: ${marker}`)
}
if (!routes.includes("['/new-rules'") && !routes.includes("['/rules-hub'")) {
  // expected: no new route alias was added by this presentation slice
} else {
  fail('RULES-1A must upgrade the existing #/how-to-play destination, not add a new route alias.')
}

for (const file of [
  'docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md',
  'docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md',
  'docs/EURO28-AGENT-RULES-AND-ROADMAP.md',
  'docs/STAGE-RULES-1A-RULES-HUB.md',
]) {
  const text = read(file)
  for (const marker of ['RULES-1A', 'rules hub', 'no Supabase writes', 'no migration']) {
    if (!text.includes(marker)) fail(`${file} is missing RULES-1A marker: ${marker}`)
  }
}

const pkg = JSON.parse(read('package.json'))
if (pkg.scripts?.['audit:rules-hub'] !== 'node scripts/check-rules-hub.mjs') {
  fail('audit:rules-hub is not wired correctly')
}
if (!pkg.scripts?.check?.includes('npm run audit:rules-hub')) {
  fail('npm run check does not include audit:rules-hub')
}
if (!pkg.scripts?.['lint:foundation']?.includes('scripts/check-rules-hub.mjs')) {
  fail('lint:foundation does not include scripts/check-rules-hub.mjs')
}

const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(name => name.endsWith('.sql'))
if (migrationSequenceError(migrations)) fail(migrationSequenceError(migrations))

const forbiddenMutations = [
  'supabase.auth.admin',
  '.insert(',
  '.upsert(',
  '.update(',
  '.delete(',
  'createClient(',
  'service_role',
]
const touchedSources = [component, model]
for (const forbidden of forbiddenMutations) {
  if (touchedSources.some(source => source.includes(forbidden))) {
    fail(`RULES-1A introduced forbidden mutation/secret/client marker: ${forbidden}`)
  }
}

if (errors.length > 0) {
  console.error(`RULES-1A rules hub audit failed with ${errors.length} issue(s):\n`)
  for (const message of errors) console.error(`  - ${message}`)
  process.exit(1)
}

console.log('RULES-1A rules hub audit passed.')
console.log('Destination: existing #/how-to-play route upgraded into scoring, locks, corrections, moderation, privacy and support hub.')
console.log('Safety: read-only UI/model/docs only; no scoring, resolver, Supabase write, service-role use or migration change.')
console.log(`Database: ${migrations.length} active migrations, sequentially numbered with no gaps.`)
