// Stage 13G-C5 — re-pointed at the DP re-cut (Stage DP-LEAGUES, 2026-07-15).
//
// The invariant C5 protects is unchanged: a member row opens THAT player's shared profile flow,
// carrying the league's fixed competition, while deeper head-to-head / points evidence stays out
// of the compact league table. Product Experience v3 adds a quick sheet before PlayerView.
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
const quickView = read('src/player/PlayerQuickView.jsx')
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

// The load-bearing proof: row-click opens the player's quick sheet and passes the league's fixed
// competition into links for the full profile, points, H2H and bracket evidence.
for (const marker of [
  'setQuickPlayer(row)',
  '<PlayerQuickView player={quickPlayer}',
]) {
  if (!leaguesPage.includes(marker)) fail(`Leagues.jsx missing detail-destination proof: ${marker}`)
}

for (const marker of [
  "href('predictions')",
  "href('points')",
  "href('headToHead')",
  "href('bracket')",
]) {
  if (!quickView.includes(marker)) fail(`PlayerQuickView.jsx missing detail-destination proof: ${marker}`)
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

console.log('Stage 13G-C5 passed: a member row opens the shared quick profile carrying the league competition; full profile and deep comparison stay out of the compact table.')
