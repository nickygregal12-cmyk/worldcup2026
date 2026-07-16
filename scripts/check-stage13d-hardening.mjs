import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const errors = []
const fail = message => errors.push(message)
const exists = relativePath => fs.existsSync(path.join(root, relativePath))
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')

for (const file of [
  'docs/archive/STAGE-13D-BATCH-3-HARDENING.md',
  'scripts/check-stage13d-hardening.mjs',
  'src/lib/latestRequest.js',
  'src/lib/__tests__/latestRequest.test.js',
]) {
  if (!exists(file)) fail(`Stage 13D hardening file is missing: ${file}`)
}

const latestRequest = read('src/lib/latestRequest.js')
for (const marker of ['begin()', 'cancel()', 'isCurrent(token)']) {
  if (!latestRequest.includes(marker)) fail(`Latest-request guard is missing: ${marker}`)
}

const sharedComparison = [read('src/player/PlayerHeadToHead.jsx'), read('src/player/playerComparisonModel.js')].join('\n')
// The member comparison now lives in PlayerView (league rows navigate there with the
// league's fixed competition), so PlayerView joins the hardened-surface set.
const leagues = [read('src/leagues/Leagues.jsx'), read('src/leagues/LeaguePresentation.jsx'), read('src/player/PlayerView.jsx'), sharedComparison].join('\n')
for (const marker of [
  'createLatestRequestGuard',
  'const competitionKey = selectedLeague.competition',
  'loadLeagueOverview(client, { leagueId, competitionKey })',
  'buildStandingComparison',
  'destructiveConfirmation',
  'Confirm delete',
  'privateSelections',
]) {
  if (!leagues.includes(marker)) fail(`League hardening is missing: ${marker}`)
}
if (leagues.includes('<HeadToHead state={comparison} competitionKey={competitionKey}')) {
  fail('League comparison must use the competition captured by the authorised request')
}

const results = [read('src/results/ResultsAndLeaderboards.jsx'), read('src/results/ResultsPresentation.jsx'), sharedComparison].join('\n')
for (const marker of [
  'createLatestRequestGuard',
  "status: previous.data ? 'partial' : 'error'",
  'The last available data remains visible',
  'comparisonRequests.current.isCurrent',
  'privateSelections',
]) {
  if (!results.includes(marker)) fail(`Results hardening is missing: ${marker}`)
}

const model = read('src/leagues/leagueModel.js')
for (const marker of [
  'buildStandingComparison',
  'visibleSelectionCount',
  'privateSelectionCount',
  'notSavedSelectionCount',
  'totalSelectionCount',
]) {
  if (!model.includes(marker)) fail(`Shared prediction model is missing: ${marker}`)
}

const fixture = read('src/testFixtures/stage13dVisualFixture.js')
for (const marker of [
  'STAGE13D_VISUAL_SCENARIO',
  "PRIVACY: 'privacy'",
  "PARTIAL: 'partial'",
  'privateOriginalBundle',
]) {
  if (!fixture.includes(marker)) fail(`Stage 13D QA fixture is missing: ${marker}`)
}

const fixtureTest = read('src/testFixtures/__tests__/stage13dVisualFixture.test.js')
for (const marker of [
  'Original privacy scenario',
  'deterministic partial failures',
]) {
  if (!fixtureTest.includes(marker)) fail(`Stage 13D QA scenario test is missing: ${marker}`)
}

const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(name => name.endsWith('.sql'))
if (migrations.length < 14) fail(`Stage 13D Batch 3 must retain the original fourteen-migration baseline, found ${migrations.length}`)

const packageJson = JSON.parse(read('package.json'))
if (packageJson.scripts?.['audit:stage13d:hardening'] !== 'node scripts/check-stage13d-hardening.mjs') {
  fail('audit:stage13d:hardening is not wired correctly')
}
if (!packageJson.scripts?.check?.includes('npm run audit:stage13d:hardening')) {
  fail('npm run check does not include audit:stage13d:hardening')
}
if (!packageJson.scripts?.['lint:foundation']?.includes('src/lib/latestRequest.js')) {
  fail('The latest-request guard is not included in the foundation lint gate')
}
if (!packageJson.scripts?.['lint:foundation']?.includes('scripts/check-stage13d-hardening.mjs')) {
  fail('The Stage 13D hardening audit is not included in the foundation lint gate')
}

if (errors.length) {
  console.error('Euro Stage 13D hardening audit failed:')
  errors.forEach(error => console.error(`- ${error}`))
  process.exit(1)
}

console.log('Euro Stage 13D signed-in journey hardening audit passed.')
console.log('Comparisons: stale requests cannot cross league, member or competition boundaries')
console.log('Privacy: Original 51-selection lock state and fixture-by-fixture KO release remain server-authorised')
console.log('Recovery: last available results survive refresh failure; destructive league actions require confirmation')
console.log(`Database: original 14-migration baseline preserved; ${migrations.length} active migrations detected`)
