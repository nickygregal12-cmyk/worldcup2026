// Stage 13G-C5 — re-pointed at the DP re-cut (Stage DP-LEAGUES, 2026-07-15).
//
// The invariant C5 protects is unchanged and is the load-bearing proof of the 5e4aad3 behaviour:
// a member row opens THAT player's PlayerView, carrying the league's fixed competition, and the
// deeper head-to-head / points breakdown lives in PlayerView — never as extra clutter in the
// compact league table. The `openPlayerView({ userId, competitionKey })` call is carried forward
// verbatim. The archived C5 doc dependency is dropped; the `heroStyles.heroHint` marker is updated
// to the re-cut's `heroStyles.hint`.
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

const migrations = existsSync('supabase/migrations')
  ? readdirSync('supabase/migrations').filter(name => name.endsWith('.sql'))
  : []

for (const marker of [
  'onClick={() => onOpenPlayer(row)}',
  'raceStyles.leaderRow',
  'heroStyles.hint',
]) {
  if (!presentation.includes(marker)) fail(`LeaguePresentation.jsx missing marker: ${marker}`)
}

// The load-bearing proof: row-click opens the player's PlayerView with the league's competition.
for (const marker of [
  'openPlayerView({ userId: row.userId, competitionKey: selectedLeague.competition })',
]) {
  if (!leaguesPage.includes(marker)) fail(`Leagues.jsx missing detail-destination proof: ${marker}`)
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

if (packageJson.scripts?.['audit:league-detail-destination'] !== 'node scripts/check-stage13g-c5-league-detail-destination.mjs') {
  fail('package.json missing audit:league-detail-destination script')
}

if (!packageJson.scripts?.check?.includes('npm run audit:league-detail-destination')) {
  fail('package.json check chain must include audit:league-detail-destination')
}

if (migrationSequenceError(migrations)) fail(migrationSequenceError(migrations))

if (failures.length > 0) {
  console.error('Stage 13G-C5 league detail destination audit failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Stage 13G-C5 passed: a member row opens their PlayerView carrying the league competition; deep comparison stays out of the compact table.')
