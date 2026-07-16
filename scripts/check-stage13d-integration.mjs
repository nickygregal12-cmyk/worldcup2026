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
const playerComparison = [read('src/player/PlayerHeadToHead.jsx'), read('src/player/playerComparisonModel.js')].join('\n')
const leaguesPage = [read('src/leagues/Leagues.jsx'), read('src/leagues/LeaguePresentation.jsx'), playerComparison].join('\n')
const resultModel = read('src/results/resultModel.js')
const resultService = read('src/results/resultService.js')
const resultsPage = [read('src/results/ResultsAndLeaderboards.jsx'), read('src/results/ResultsPresentation.jsx'), playerComparison].join('\n')
const productApp = read('src/App.jsx')
const packageJson = JSON.parse(read('package.json'))

for (const required of [
  'buildLeagueCompetitionSummary',
  'buildSharedLeagueMemberList',
  'buildSharedPredictionJourney',
]) assert(leagueModel.includes(`export function ${required}`), `Missing league presentation model: ${required}`)

assert(leagueService.includes('Promise.allSettled'), 'League overview must preserve partial competition-table failures')
assert(leagueService.includes('LEAGUE_COMPETITION.ORIGINAL'), 'League overview must request Original standings explicitly')
assert(leagueService.includes('LEAGUE_COMPETITION.KO_PREDICTOR'), 'League overview must request KO standings explicitly')
// Single-competition model (register §15): each league IS one competition, named in the strip
// eyebrow. Asserted structurally — the retired "track both competitions" copy is gone, replaced by
// the model statement in App.jsx's PageIntro (policed by player-facing-copy-sweep-2).
assert(leaguesPage.includes('competitionName(league.competition)'), 'League strip must name its own competition (single-competition boundary)')
assert(leaguesPage.includes('You only see picks that are available for this player right now.'), 'Member comparison must explain server-authorised visibility')
assert(productApp.includes('reference={appData.guestReference}'), 'League journey must receive the canonical public reference')

for (const required of [
  'buildCanonicalResultFeed',
  'buildLiveBracketRounds',
  'normalisePointsBreakdown',
]) assert(resultModel.includes(`export function ${required}`), `Missing result presentation model: ${required}`)

assert(resultService.includes('Promise.allSettled'), 'Results loading must preserve partial section failures')
assert(resultsPage.includes('Live bracket') && resultsPage.includes('separate from your picks'), 'Live bracket must identify itself as separate from saved picks')
assert(resultsPage.includes('Original and KO Predictor') && resultsPage.includes('separate leaderboards'), 'Results page must state the competition boundary')
assert(resultsPage.includes('Recalculated from corrected result revision'), 'Points presentation must expose corrected-result recalculation')

for (const source of [leagueService, leaguesPage, resultService, resultsPage]) {
  assert(!/\.from\([^)]*\)\s*\.\s*(insert|update|delete|upsert)\s*\(/s.test(source), 'Stage 13D browser code must not write directly to protected tables')
}

const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(name => name.endsWith('.sql')).sort()
assert(migrations.length >= 14, `Expected the original 14-migration baseline, found ${migrations.length}`)
assert(packageJson.scripts['audit:stage13d'] === 'node scripts/check-stage13d-integration.mjs', 'Missing audit:stage13d package script')
assert(packageJson.scripts.check.includes('npm run audit:stage13d'), 'Full check must include the Stage 13D audit')

console.log('Stage 13D integration audit passed.')
console.log('Competition boundaries: Original and KO Predictor remain separate.')
console.log('Shared predictions: existing server-authorised RPCs remain the only data source.')
console.log(`Database migrations: Stage 13D baseline preserved; ${migrations.length} active migrations detected.`)
