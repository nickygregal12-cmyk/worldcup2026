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
  'The race summary will switch to leader gap context',
]) {
  if (!model.includes(marker)) fail(`leagueModel.js missing marker: ${marker}`)
}

for (const marker of [
  'LeagueRaceSummary',
  'styles.raceSummaryStrip',
  'styles.raceSummaryStats',
  'buildLeagueRaceSummary',
]) {
  if (!presentation.includes(marker)) fail(`LeaguePresentation.jsx missing marker: ${marker}`)
}

for (const marker of [
  'LeagueRaceSummary',
  'activeSection?.status === \'ready\'',
]) {
  if (!leaguesPage.includes(marker)) fail(`Leagues.jsx missing marker: ${marker}`)
}

for (const marker of [
  '.raceSummaryStrip',
  '.raceSummaryStats',
  '@media (max-width: 640px)',
]) {
  if (!cssModule.includes(marker)) fail(`leagueRace.module.css missing marker: ${marker}`)
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

console.log('Euro Stage 13G-C3 league race-summary audit passed.')
console.log('Summary: you-vs-leader, pre-scoring and empty-member states are modelled.')
console.log('Boundary: Original Predictor and KO Predictor remain separate.')
console.log('Database: active migrations remain 18; no Migration 019.')
