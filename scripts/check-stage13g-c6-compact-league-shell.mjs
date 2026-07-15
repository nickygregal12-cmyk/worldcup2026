// Stage 13G-C6 — re-pointed at the DP re-cut (Stage DP-LEAGUES, 2026-07-15).
//
// The compact shell survives the re-cut: standings are leader-list rows, the league code lives in
// the actions card, and lifecycle copy plus competition summaries stay behind the "League details"
// disclosure. The load-bearing ordering proof — LeaderList renders BEFORE the details disclosure,
// and the competition summary lives inside/after it — is carried forward verbatim. The archived C6
// doc dependency is dropped, and the `Private leagues` / `Track Original Predictor` markers are
// removed because the re-cut deleted the duplicate in-surface heading (App.jsx's PageIntro owns the
// page title now).
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

const migrations = existsSync('supabase/migrations')
  ? readdirSync('supabase/migrations').filter(name => name.endsWith('.sql'))
  : []

for (const marker of [
  'export function LeagueActionsCard',
  'export function LeagueSecondaryDetails',
  'raceStyles.compactCompetitionHeading',
  'Copy invite',
]) {
  if (!presentation.includes(marker)) fail(`LeaguePresentation.jsx missing shell marker: ${marker}`)
}

for (const marker of [
  'LeagueActionsCard',
  'LeagueStandingsPanel',
  'standings={standings}',
]) {
  if (!leaguesPage.includes(marker)) fail(`Leagues.jsx missing shell marker: ${marker}`)
}

// Ordering proof: the compact standings render before the "League details" disclosure, and the
// competition summary lives inside/after that disclosure — not as top-level clutter.
const tableIndex = presentation.indexOf('<LeaderList rows={standings}')
const detailsIndex = presentation.indexOf('LeagueSecondaryDetails title="League details"')
if (tableIndex === -1 || detailsIndex === -1 || detailsIndex < tableIndex) {
  fail('League details must render after the compact standings rows')
}

const summaryCardIndex = presentation.indexOf('<LeagueSummaryCard', detailsIndex)
if (summaryCardIndex === -1) {
  fail('Competition summary must live inside/after the secondary league details section')
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
  '.compactCompetitionHeading',
  '.secondaryDetails',
  '.secondaryDetailsBody',
]) {
  if (!cssModule.includes(marker)) fail(`leagueRace.module.css missing shell class: ${marker}`)
}

if (packageJson.scripts?.['audit:compact-league-shell'] !== 'node scripts/check-stage13g-c6-compact-league-shell.mjs') {
  fail('package.json missing audit:compact-league-shell script')
}

if (!packageJson.scripts?.check?.includes('npm run audit:compact-league-shell')) {
  fail('package.json check chain must include audit:compact-league-shell')
}

if (migrationSequenceError(migrations)) fail(migrationSequenceError(migrations))

if (failures.length > 0) {
  console.error('Stage 13G-C6 compact league shell audit failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Stage 13G-C6 passed: compact shell — standings before League-details disclosure, summary inside it, code in the actions card.')
