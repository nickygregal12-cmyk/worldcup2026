// Stage 13G-C4 — re-pointed at the DP re-cut (Stage DP-LEAGUES, 2026-07-15).
//
// The compact standings table (League table D leader-list rows: rank, identity, running total,
// chevron) survives the re-cut on DP tokens. This asserts that structure against source and
// forbids the data-heavy table it replaced. The former dependency on the "compact league
// standings" line-1 CSS comment (a comment, not a class) and on the archived C4 doc is dropped —
// the invariant is proven from the JSX/CSS that actually renders.
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
const cssModule = read('src/leagues/leagueRace.module.css')
const packageJson = JSON.parse(read('package.json') || '{}')

const migrations = existsSync('supabase/migrations')
  ? readdirSync('supabase/migrations').filter(name => name.endsWith('.sql'))
  : []

for (const marker of [
  'raceStyles.leaderRow',
  'buildLeagueRaceRows',
  "hasScoring ? row.rank : '—'",
  'raceStyles.points',
]) {
  if (!presentation.includes(marker)) fail(`LeaguePresentation.jsx missing compact table marker: ${marker}`)
}

for (const forbidden of [
  '<th>Groups</th>',
  '<th>Bracket</th>',
  '<th>Scored</th>',
  '<th>Match points</th>',
  'raceStyles.gapLabel',
  'raceStyles.youChip',
  'raceStyles.topThreeChip',
]) {
  if (presentation.includes(forbidden)) fail(`LeaguePresentation.jsx still contains data-heavy table marker: ${forbidden}`)
}

// The row structure lives in CSS-module classes (class names, not comments).
for (const marker of [
  '.leaderRow',
  '.rankMarker',
  '.currentUserRow',
]) {
  if (!cssModule.includes(marker)) fail(`leagueRace.module.css missing compact standings class: ${marker}`)
}

if (packageJson.scripts?.['audit:compact-league-standings'] !== 'node scripts/check-stage13g-c4-compact-league-standings.mjs') {
  fail('package.json missing audit:compact-league-standings script')
}

if (!packageJson.scripts?.check?.includes('npm run audit:compact-league-standings')) {
  fail('package.json check chain must include audit:compact-league-standings')
}

if (migrationSequenceError(migrations)) fail(migrationSequenceError(migrations))

if (failures.length > 0) {
  console.error('Stage 13G-C4 compact league standings audit failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Stage 13G-C4 passed: standings stay compact leader-list rows (rank/identity/total); no data-heavy table markup.')
