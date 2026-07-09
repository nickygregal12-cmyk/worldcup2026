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
const doc = read('docs/archive/STAGE-13G-C4-COMPACT-LEAGUE-STANDINGS.md')

const migrations = existsSync('supabase/migrations')
  ? readdirSync('supabase/migrations').filter(name => name.endsWith('.sql'))
  : []

// The compact table was rebuilt as League table D leader-list rows: one row per member
// carrying rank, identity and running total only. Assert that structure.
for (const marker of [
  'raceStyles.leaderRow',
  'buildLeagueRaceRows',
  'hasScoring ? row.rank : \'—\'',
  'raceStyles.points',
]) {
  if (!presentation.includes(marker)) fail(`LeaguePresentation.jsx missing compact table marker: ${marker}`)
}

for (const forbidden of [
  '<th>Groups</th>',
  '<th>Bracket</th>',
  '<th>Scored</th>',
  '<th>Match points</th>',
  'styles.gapLabel',
  'styles.youChip',
  'styles.topThreeChip',
]) {
  if (presentation.includes(forbidden)) fail(`LeaguePresentation.jsx still contains data-heavy table marker: ${forbidden}`)
}

if (leaguesPage.includes('LeagueRaceSummary')) {
  fail('Leagues.jsx must not render the data-heavy race summary strip')
}

for (const marker of [
  'compact league standings',
  '.rankMarker',
  '.currentUserRow',
]) {
  if (!cssModule.includes(marker)) fail(`leagueRace.module.css missing marker: ${marker}`)
}

for (const marker of [
  'running total',
  'rank member points',
  'breakdowns belong in deeper destinations',
  'Original Predictor and KO Predictor remain separate',
  'no database migration',
]) {
  if (!doc.toLowerCase().includes(marker.toLowerCase())) fail(`Stage 13G-C4 doc missing marker: ${marker}`)
}

if (packageJson.scripts?.['audit:compact-league-standings'] !== 'node scripts/check-stage13g-c4-compact-league-standings.mjs') {
  fail('package.json missing audit:compact-league-standings script')
}

if (!packageJson.scripts?.check?.includes('npm run audit:compact-league-standings')) {
  fail('package.json check chain must include audit:compact-league-standings')
}

if (migrationSequenceError(migrations)) fail(migrationSequenceError(migrations))

if (failures.length > 0) {
  console.error('Euro Stage 13G-C4 compact league standings audit failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Euro Stage 13G-C4 compact league standings audit passed.')
console.log('Table: rank, member and running total only.')
console.log('Breakdowns: kept for deeper destinations such as member comparison and insight.')
console.log('Boundary: Original Predictor and KO Predictor remain separate.')
console.log(`Database: ${migrations.length} active migrations, sequentially numbered with no gaps.`)
