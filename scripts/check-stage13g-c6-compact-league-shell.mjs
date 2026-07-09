import { migrationSequenceError } from './lib/migrationSequenceGuard.mjs'
import { existsSync, readdirSync, readFileSync } from 'node:fs'

const failures = []

function fail(message) {
  failures.push(message)
}

function read(path) {
  if (!existsSync(path)) {
    fail(`${path} is missing`)
    return ''
  }
  return readFileSync(path, 'utf8')
}

const presentation = read('src/leagues/LeaguePresentation.jsx')
const leaguesPage = read('src/leagues/Leagues.jsx')
const cssModule = read('src/leagues/leagueRace.module.css')
const packageJson = JSON.parse(read('package.json') || '{}')
const doc = read('docs/archive/STAGE-13G-C6-COMPACT-LEAGUE-SHELL.md')

const migrations = existsSync('supabase/migrations')
  ? readdirSync('supabase/migrations').filter(name => name.endsWith('.sql'))
  : []

// The shell was rebuilt natively for single-competition leagues: the league code is
// tucked into the actions card, standings are leader-list rows, and lifecycle copy plus
// competition summaries live behind the "League details" disclosure.
for (const marker of [
  'export function LeagueActionsCard',
  'export function LeagueSecondaryDetails',
  'raceStyles.compactCompetitionHeading',
  'Copy invite',
]) {
  if (!presentation.includes(marker)) fail(`LeaguePresentation.jsx missing marker: ${marker}`)
}

for (const marker of [
  'Private leagues',
  'Track Original Predictor',
  'LeagueActionsCard',
  'LeagueStandingsPanel',
  'standings={standings}',
]) {
  if (!leaguesPage.includes(marker)) fail(`Leagues.jsx missing marker: ${marker}`)
}

const tableIndex = presentation.indexOf('<LeaderList rows={standings}')
const detailsIndex = presentation.indexOf('LeagueSecondaryDetails title="League details"')
if (tableIndex === -1 || detailsIndex === -1 || detailsIndex < tableIndex) {
  fail('League details must render after the compact standings rows')
}

const summaryCardIndex = presentation.indexOf('<LeagueSummaryCard', detailsIndex)
if (summaryCardIndex === -1) {
  fail('Competition summary must live inside/after the secondary league details section')
}

if (leaguesPage.includes('<LeagueLifecycleBanner lifecycleState={leagueLifecycle} />\n\n      {notice')) {
  fail('League timing banner must not render as a top-level default block')
}

for (const forbidden of [
  '<th>Groups</th>',
  '<th>Bracket</th>',
  '<th>Scored</th>',
  '<th>Match points</th>',
  '<MemberPicker',
  'Compare with member',
]) {
  if (leaguesPage.includes(forbidden) || presentation.includes(forbidden)) {
    fail(`Compact league shell must not contain default clutter marker: ${forbidden}`)
  }
}

for (const marker of [
  'compact league standings',
  '.compactCompetitionHeading',
  '.secondaryDetails',
  '.secondaryDetailsBody',
  '@media (max-width: 640px)',
]) {
  if (!cssModule.includes(marker)) fail(`leagueRace.module.css missing marker: ${marker}`)
}

for (const marker of [
  'compact league page shell',
  'rank member points',
  'details after the table',
  'league code is tucked away',
  'Original Predictor and KO Predictor remain separate',
  'no database migration',
]) {
  if (!doc.toLowerCase().includes(marker.toLowerCase())) fail(`Stage 13G-C6 doc missing marker: ${marker}`)
}

if (packageJson.scripts?.['audit:compact-league-shell'] !== 'node scripts/check-stage13g-c6-compact-league-shell.mjs') {
  fail('package.json missing audit:compact-league-shell script')
}

if (!packageJson.scripts?.check?.includes('npm run audit:compact-league-shell')) {
  fail('package.json check chain must include audit:compact-league-shell')
}

if (migrationSequenceError(migrations)) fail(migrationSequenceError(migrations))

if (failures.length > 0) {
  console.error('Euro Stage 13G-C6 compact league shell audit failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Euro Stage 13G-C6 compact league shell audit passed.')
console.log('Default: selector, competition toggle and focused points table.')
console.log('Secondary: league code, lifecycle copy and summaries live behind details.')
console.log('Boundary: Original Predictor and KO Predictor remain separate.')
console.log(`Database: ${migrations.length} active migrations, sequentially numbered with no gaps.`)
