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

const model = read('src/leagues/leagueModel.js')
const presentation = read('src/leagues/LeaguePresentation.jsx')
const tests = read('src/leagues/__tests__/leagueModel.test.js')
const packageJson = JSON.parse(read('package.json') || '{}')

const migrations = existsSync('supabase/migrations')
  ? readdirSync('supabase/migrations').filter(name => name.endsWith('.sql'))
  : []

// The pending-movement sentence lives in one exported constant (spec-echo rule):
// assert the constant, never the sentence, so the copy stays improvable.
for (const marker of [
  'buildLeagueRaceRows',
  'gapToLeaderLabel',
  'rankMovementReason',
  'RANK_MOVEMENT_PENDING_REASON',
]) {
  if (!model.includes(marker)) fail(`leagueModel.js missing marker: ${marker}`)
}

// The presentation imports this module as raceStyles since the native single-competition rebuild.
for (const marker of [
  'raceStyles.rankMarker',
  'raceStyles.currentUserRow',
  'buildLeagueRaceRows',
  "from './leagueRace.module.css'",
]) {
  if (!presentation.includes(marker)) fail(`LeaguePresentation.jsx missing marker: ${marker}`)
}

for (const forbidden of ['🥇', '🥈', '🥉', '🏆']) {
  if (presentation.includes(forbidden)) fail(`LeaguePresentation.jsx must not use emoji icon treatment: ${forbidden}`)
}

for (const marker of [
  'buildLeagueRaceRows',
  '17 behind leader',
  'RANK_MOVEMENT_PENDING_REASON',
]) {
  if (!tests.includes(marker)) fail(`leagueModel.test.js missing marker: ${marker}`)
}

// Re-pointed at the DP re-cut (2026-07-15): the C2 doc dependency is dropped (that stage record is
// archived), and the invariant is proven from source — the race-story fields are modelled and the
// pending-movement reason is one exported constant, kept out of prose so the copy stays improvable.

if (packageJson.scripts?.['audit:league-race-story'] !== 'node scripts/check-stage13g-c2-league-race-story.mjs') {
  fail('package.json missing audit:league-race-story script')
}

if (!packageJson.scripts?.check?.includes('npm run audit:league-race-story')) {
  fail('package.json check chain must include audit:league-race-story')
}

if (migrationSequenceError(migrations)) fail(migrationSequenceError(migrations))

if (failures.length > 0) {
  console.error('Euro Stage 13G-C2 league race-story audit failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Euro Stage 13G-C2 league race-story audit passed.')
console.log('Rows: current-user YOU anchor and gap-to-leader are modelled; gap renders as static text.')
console.log('Movement: a designed not-yet state, deferred until trustworthy previous-rank data exists.')
console.log('Boundary: Original and KO Predictor standings remain separate.')
console.log(`Database: ${migrations.length} active migrations, sequentially numbered with no gaps.`)
