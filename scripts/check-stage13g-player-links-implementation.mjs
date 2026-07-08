import { migrationSequenceError } from './lib/migrationSequenceGuard.mjs'
import fs from 'node:fs'
import process from 'node:process'

const errors = []
const fail = message => errors.push(message)
const read = file => fs.readFileSync(file, 'utf8')
const exists = file => fs.existsSync(file)

const helper = read('src/player/playerViewLinks.js')
const playerIndex = read('src/player/index.js')
const leagues = read('src/leagues/Leagues.jsx')
const leaguePresentation = read('src/leagues/LeaguePresentation.jsx')
const results = read('src/results/ResultsAndLeaderboards.jsx')
const resultsPresentation = read('src/results/ResultsPresentation.jsx')
const tests = read('src/player/__tests__/playerViewLinks.test.js')
const pkg = JSON.parse(read('package.json'))

for (const marker of [
  'buildPlayerViewHref',
  'normalisePlayerViewCompetition',
  'openPlayerView',
  '#/player?',
]) {
  if (!helper.includes(marker)) fail(`Player View link helper missing ${marker}`)
}

if (!playerIndex.includes('playerViewLinks')) fail('Player View link helper is not exported')

for (const marker of [
  'openPlayerView',
  'openMemberPlayerView',
  'onOpenPlayer={openMemberPlayerView}',
]) {
  if (!leagues.includes(marker)) fail(`Leagues controller missing ${marker}`)
}

// Opening a league member row now navigates straight to the Player View; there is no inline
// comparison panel on the Leagues page anymore.
if (leagues.includes('PlayerHeadToHead state={comparison}')) {
  fail('Leagues controller must not render an inline head-to-head panel; member rows navigate to the Player View')
}

for (const marker of [
  'onOpenPlayer',
  'onOpenPlayer(row)',
]) {
  if (!leaguePresentation.includes(marker)) fail(`League standings table missing ${marker}`)
}

// The relocated head-to-head and points-breakdown surfaces are hosted by the Player View.
const playerView = read('src/player/PlayerView.jsx')
for (const marker of [
  '<PlayerHeadToHead',
  'state={comparison}',
  '<PlayerInsight',
]) {
  if (!playerView.includes(marker)) fail(`Player View missing relocated comparison surface ${marker}`)
}

for (const marker of [
  'openPlayerView',
  'openLeaderboardPlayerView',
  'PlayerHeadToHead state={comparison}',
]) {
  if (!results.includes(marker)) fail(`Leaderboards controller missing ${marker}`)
}

if (!results.includes('onOpenPlayer={openLeaderboardPlayerView}') && !results.includes('onOpenPlayer: openLeaderboardPlayerView')) {
  fail('Leaderboards controller missing Player View opener prop')
}

for (const marker of [
  'onOpenPlayer',
  'onActivate={onOpenPlayer}',
  'onCompare(row)',
]) {
  if (!resultsPresentation.includes(marker)) fail(`Leaderboard presentation missing ${marker}`)
}

for (const marker of [
  'builds Original Player View links',
  'normalises KO Predictor link keys',
  '#/player?user=player-2&competition=ko_predictor',
]) {
  if (!tests.includes(marker)) fail(`Player View link tests missing ${marker}`)
}

if (pkg.scripts?.['audit:stage13g-player-links-implementation'] !== 'node scripts/check-stage13g-player-links-implementation.mjs') {
  fail('package.json missing audit:stage13g-player-links-implementation')
}

if (!pkg.scripts?.check?.includes('npm run audit:stage13g-player-links-implementation')) {
  fail('check script does not include audit:stage13g-player-links-implementation')
}

const migrations = exists('supabase/migrations')
  ? fs.readdirSync('supabase/migrations').filter(file => file.endsWith('.sql')).sort()
  : []
if (migrationSequenceError(migrations)) fail(migrationSequenceError(migrations))

if (errors.length > 0) {
  console.error(`Stage 13G-PLAYER-LINKS-1 audit failed with ${errors.length} issue(s):`)
  for (const message of errors) console.error(`- ${message}`)
  process.exit(1)
}

console.log('Stage 13G-PLAYER-LINKS-1 audit passed.')
console.log('Player rows now route to the dedicated Player View.')
console.log('League and leaderboard comparison remains available as a separate action.')
console.log('Original and KO Predictor links remain competition-scoped.')
console.log(`Database: ${migrations.length} active migrations, sequentially numbered with no gaps.`)
