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
const leaguesPage = read('src/leagues/Leagues.jsx')
const cssModule = read('src/leagues/leagueRace.module.css')
const tests = read('src/leagues/__tests__/leagueModel.test.js')
const packageJson = JSON.parse(read('package.json') || '{}')
const doc = read('docs/STAGE-13G-C3-LEAGUE-RACE-SUMMARY.md')

const migrations = existsSync('supabase/migrations')
  ? readdirSync('supabase/migrations').filter(name => name.endsWith('.sql'))
  : []

for (const marker of [
  'buildLeagueRaceSummary',
  'pre_scoring',
  'Race starts when members appear',
  'The race summary will show the gap to the leader',
]) {
  if (!model.includes(marker)) fail(`leagueModel.js missing marker: ${marker}`)
}

for (const marker of [
  'buildLeagueRaceRows',
  'Pts',
  'styles.rankMarker',
]) {
  if (!presentation.includes(marker)) fail(`LeaguePresentation.jsx missing compact correction marker: ${marker}`)
}

if (leaguesPage.includes('LeagueRaceSummary')) {
  fail('Leagues.jsx must not render the superseded C3 race summary strip after the compact C4 correction')
}

for (const marker of [
  '.rankMarker',
  '.currentUserRow',
  'Stage 13G-C4 compact league standings',
]) {
  if (!cssModule.includes(marker)) fail(`leagueRace.module.css missing compact correction marker: ${marker}`)
}

for (const marker of [
  'buildLeagueRaceSummary',
  '17 behind leader',
  'pre_scoring',
  'Race starts when members appear',
]) {
  if (!tests.includes(marker)) fail(`leagueModel.test.js missing marker: ${marker}`)
}

for (const marker of [
  'league race summary strip',
  'you vs leader',
  'pre-scoring',
  'empty-member',
  'no database migration',
  'Original Predictor and KO Predictor remain separate',
]) {
  if (!doc.toLowerCase().includes(marker.toLowerCase())) fail(`Stage 13G-C3 doc missing marker: ${marker}`)
}

if (packageJson.scripts?.['audit:league-race-summary'] !== 'node scripts/check-stage13g-c3-league-race-summary.mjs') {
  fail('package.json missing audit:league-race-summary script')
}

if (!packageJson.scripts?.check?.includes('npm run audit:league-race-summary')) {
  fail('package.json check chain must include audit:league-race-summary')
}

if (migrations.length !== 18) fail(`Expected 18 active migrations, found ${migrations.length}`)
if (migrations.some(name => /019/.test(name))) fail('Migration 019 must not exist for Stage 13G-C3')

if (failures.length > 0) {
  console.error('Euro Stage 13G-C3 league race-summary audit failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Euro Stage 13G-C3 league race-summary audit passed with C4 compact-table correction.')
console.log('Summary: you-vs-leader, pre-scoring and empty-member states are modelled.')
console.log('Boundary: Original Predictor and KO Predictor remain separate.')
console.log('Database: active migrations remain 18; no Migration 019.')
