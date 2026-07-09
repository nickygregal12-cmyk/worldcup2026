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
const playerView = read('src/player/PlayerView.jsx')
const packageJson = JSON.parse(read('package.json') || '{}')
const doc = read('docs/archive/STAGE-13G-C5-LEAGUE-DETAIL-DESTINATION.md')

const migrations = existsSync('supabase/migrations')
  ? readdirSync('supabase/migrations').filter(name => name.endsWith('.sql'))
  : []

// The inline LeagueDetailDestination panel was superseded: a member row now navigates
// straight to that player's PlayerView, which hosts the head-to-head comparison and
// points breakdown as tabs. The invariant this stage protects is unchanged — the
// league table stays rank/member/points and breakdowns live in a deeper destination.
for (const marker of [
  'onClick={() => onOpenPlayer(row)}',
  'raceStyles.leaderRow',
  'heroStyles.heroHint',
]) {
  if (!presentation.includes(marker)) fail(`LeaguePresentation.jsx missing marker: ${marker}`)
}

for (const marker of [
  'openPlayerView({ userId: row.userId, competitionKey: selectedLeague.competition })',
]) {
  if (!leaguesPage.includes(marker)) fail(`Leagues.jsx missing marker: ${marker}`)
}

for (const marker of [
  'PlayerHeadToHead',
  'buildStandingComparison',
]) {
  if (!playerView.includes(marker)) fail(`PlayerView.jsx missing detail-destination marker: ${marker}`)
}

if (leaguesPage.includes('<MemberPicker')) {
  fail('Leagues.jsx must not render the extra compare picker after C5')
}

for (const forbidden of [
  '<th>Groups</th>',
  '<th>Bracket</th>',
  '<th>Scored</th>',
  '<th>Match points</th>',
]) {
  if (presentation.includes(forbidden)) fail(`League table must stay compact; found ${forbidden}`)
}

// The inline destination's CSS classes were retired with the panel itself; the row
// styling that carries the destination affordance is asserted above via the JSX.

for (const marker of [
  'row detail destination',
  'rank member points',
  'member comparison',
  'breakdowns stay out of the league table',
  'Original Predictor and KO Predictor remain separate',
  'no database migration',
]) {
  if (!doc.toLowerCase().includes(marker.toLowerCase())) fail(`Stage 13G-C5 doc missing marker: ${marker}`)
}

if (packageJson.scripts?.['audit:league-detail-destination'] !== 'node scripts/check-stage13g-c5-league-detail-destination.mjs') {
  fail('package.json missing audit:league-detail-destination script')
}

if (!packageJson.scripts?.check?.includes('npm run audit:league-detail-destination')) {
  fail('package.json check chain must include audit:league-detail-destination')
}

if (migrationSequenceError(migrations)) fail(migrationSequenceError(migrations))

if (failures.length > 0) {
  console.error('Euro Stage 13G-C5 league detail-destination audit failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Euro Stage 13G-C5 league detail-destination audit passed.')
console.log('Table: rank, member and points only.')
console.log('Detail: member rows open the player\'s PlayerView, which hosts comparison and breakdown tabs.')
console.log('Boundary: Original Predictor and KO Predictor remain separate.')
console.log(`Database: ${migrations.length} active migrations, sequentially numbered with no gaps.`)
