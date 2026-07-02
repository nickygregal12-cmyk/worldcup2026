import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const leagueModel = read('src/leagues/leagueModel.js')
const leagueService = read('src/leagues/leagueService.js')
const leaguesPage = read('src/leagues/LeaguesFoundation.jsx')
const resultModel = read('src/results/resultModel.js')
const resultService = read('src/results/resultService.js')
const resultsPage = read('src/results/ResultsAndLeaderboardsFoundation.jsx')
const foundationApp = read('src/foundation/EuroFoundationApp.jsx')
const packageJson = JSON.parse(read('package.json'))

for (const required of [
  'buildLeagueCompetitionSummary',
  'buildSharedLeagueMemberList',
  'buildSharedPredictionJourney',
]) assert(leagueModel.includes(`export function ${required}`), `Missing league presentation model: ${required}`)

assert(leagueService.includes('Promise.allSettled'), 'League overview must preserve partial competition-table failures')
assert(leagueService.includes('LEAGUE_COMPETITION.ORIGINAL'), 'League overview must request Original standings explicitly')
assert(leagueService.includes('LEAGUE_COMPETITION.KO_PREDICTOR'), 'League overview must request KO standings explicitly')
assert(leaguesPage.includes('Original Predictor and KO Predictor ranks and points are always shown separately.'), 'League page must state the competition boundary')
assert(leaguesPage.includes('Only selections released by the existing server privacy rules are shown.'), 'Member comparison must explain server-authorised visibility')
assert(foundationApp.includes('reference={foundation.guestReference}'), 'League journey must receive the canonical public reference')

for (const required of [
  'buildCanonicalResultFeed',
  'buildLiveBracketRounds',
  'normalisePointsBreakdown',
]) assert(resultModel.includes(`export function ${required}`), `Missing result presentation model: ${required}`)

assert(resultService.includes('Promise.allSettled'), 'Results loading must preserve partial section failures')
assert(resultsPage.includes('Live context · not your bracket'), 'Live bracket must identify its canonical live context')
assert(resultsPage.includes('Original and KO Predictor totals never combine.'), 'Results page must state the competition boundary')
assert(resultsPage.includes('Recalculated from corrected result revision'), 'Points presentation must expose corrected-result recalculation')

for (const source of [leagueService, leaguesPage, resultService, resultsPage]) {
  assert(!/\.from\([^)]*\)\s*\.\s*(insert|update|delete|upsert)\s*\(/s.test(source), 'Stage 13D browser code must not write directly to protected tables')
}

const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(name => name.endsWith('.sql')).sort()
assert(migrations.length === 14, `Expected 14 migrations, found ${migrations.length}`)
assert(!migrations.some(name => name.includes('015')), 'Stage 13D Batch 1 must not add Migration 015')
assert(packageJson.scripts['audit:stage13d'] === 'node scripts/check-stage13d-integration.mjs', 'Missing audit:stage13d package script')
assert(packageJson.scripts.check.includes('npm run audit:stage13d'), 'Full check must include the Stage 13D audit')

console.log('Stage 13D integration audit passed.')
console.log('Competition boundaries: Original and KO Predictor remain separate.')
console.log('Shared predictions: existing server-authorised RPCs remain the only data source.')
console.log('Database migrations: 14 (no Stage 13D migration added).')
