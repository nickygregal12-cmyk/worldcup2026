import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const errors = []
const fail = message => errors.push(message)
const exists = file => fs.existsSync(path.join(root, file))
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

const requiredFiles = [
  'supabase/migrations/202607030017_euro28_player_insight.sql',
  'supabase/tests/database/017_player_insight.test.sql',
  'src/player/PlayerInsight.jsx',
  'src/player/PlayerInsight.module.css',
  'src/player/playerInsightModel.js',
  'src/player/playerInsightService.js',
  'src/player/__tests__/PlayerInsight.test.jsx',
  'src/player/__tests__/playerInsightModel.test.js',
  'src/player/__tests__/playerInsightService.test.js',
  'docs/STAGE-13F-J-PLAYER-INSIGHT-AND-POINTS-STORYTELLING.md',
]
for (const file of requiredFiles) if (!exists(file)) fail(`Stage 13F-J file is missing: ${file}`)

const migration = read('supabase/migrations/202607030017_euro28_player_insight.sql')
for (const marker of [
  'get_player_competition_points',
  'security definer',
  'Authentication is required',
  'private.euro28_build_shared_prediction_bundle',
  "p_competition_key = 'ko_predictor' and not target_is_self",
  "match_row.status in ('live', 'paused', 'completed', 'abandoned')",
  'grant execute on function public.get_player_competition_points',
]) if (!migration.includes(marker)) fail(`Migration 017 is missing: ${marker}`)
if (/\b(?:insert into|update|delete from|merge into)\b/i.test(migration)) fail('Migration 017 must remain read-only')
if (/grant\s+(?:all|insert|update|delete)[\s\S]{0,180}\bto\s+(?:anon|authenticated)\b/i.test(migration)) fail('Migration 017 grants browser writes')

const dbTest = read('supabase/tests/database/017_player_insight.test.sql')
for (const marker of [
  'another Original Predictor remains protected before the global lock',
  'another Original point row becomes visible after the global lock',
  'another KO insight exposes only started fixtures',
  'future KO point rows do not leak',
  'combined points are rejected',
  'unauthenticated callers are denied',
]) if (!dbTest.includes(marker)) fail(`Migration 017 database test is missing: ${marker}`)

const model = read('src/player/playerInsightModel.js')
for (const marker of [
  'pointsBehindLeader',
  'pointsToNextScore',
  'correctedMatches',
  'longestScoringStreak',
  'bestCalls',
  'unallocatedPoints',
]) if (!model.includes(marker)) fail(`Player insight model is missing: ${marker}`)
if (/groupPosition|combinedPoints|combinedTotal/.test(model)) fail('Player insight model introduces a rejected score category or combined total')

const view = read('src/player/PlayerInsight.jsx')
for (const marker of [
  'How the total was earned',
  'Canonical scoring rows only',
  'Behind leader',
  'Points by matchday',
  'Original bracket progression',
  '<TeamLabel',
  '#/match-centre?match=',
]) if (!view.includes(marker)) fail(`Player insight presentation is missing: ${marker}`)

const h2h = read('src/player/PlayerHeadToHead.jsx')
for (const marker of ['state.data.insights.current', 'state.data.insights.other', '<PlayerInsight', '<TeamLabel']) {
  if (!h2h.includes(marker)) fail(`H2H insight integration is missing: ${marker}`)
}

const results = read('src/results/ResultsAndLeaderboards.jsx')
const leagues = read('src/leagues/Leagues.jsx')
const home = read('src/home/HomeDashboard.jsx')
if (!results.includes('<PlayerInsight')) fail('Leaderboards does not render the full player-insight surface')
if (!results.includes('standingsRows')) fail('Overall comparison does not retain rank-story rows')
if (!leagues.includes('standingsRows')) fail('League comparison does not retain league rank-story rows')
if (!home.includes('pointsBehindLeader')) fail('Home does not expose concise leader-gap storytelling')

const services = [
  read('src/player/playerInsightService.js'),
  read('src/results/resultService.js'),
  read('src/leagues/leagueService.js'),
].join('\n')
for (const marker of ['get_player_competition_points', 'loadPlayerInsightPair', 'Promise.allSettled']) {
  if (!services.includes(marker)) fail(`Insight service boundary is missing: ${marker}`)
}
if (/\.from\([^)]*\)\s*\.\s*(?:insert|update|delete|upsert)\s*\(/s.test(services)) fail('Stage 13F-J adds a direct browser database write')

const roadmap = read('docs/EURO28-AGENT-RULES-AND-ROADMAP.md')
const register = read('docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md')
const ledger = read('docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md')
const access = read('docs/EURO28-SITE-ACCESS-MAP.md')
for (const marker of [
  'no group-position category',
  'Migration 017',
  'Stage 16A — Provisional teams, synthetic users and deterministic scenario seeding',
  'Approved persona keys:',
  'scripts/remove-synthetic-data.mjs',
  'privacy-safe `is_synthetic`',
  'staging-only effective database time contract',
]) if (!roadmap.includes(marker)) fail(`Roadmap alignment is missing: ${marker}`)
for (const marker of [
  'exactly 24 teams',
  'scripts/seed-provisional-teams.mjs',
  'Replace/confirm mode',
  'Approved synthetic persona catalogue',
  '@synthetic.euro28.test',
  'synthetic_euro28: true',
  'Seed → teardown → zero-residue assertion → reseed',
  'staging-effective database time',
]) if (!register.includes(marker)) fail(`Decision Register Stage 16A alignment is missing: ${marker}`)
for (const marker of [
  '| Player insight engine and points storytelling | 🟠 PARTIAL |',
  '| Provisional team seeding and zero-code-change rehearsal | 🕓 SCHEDULED |',
  '| 16A |',
]) if (!ledger.includes(marker)) fail(`Functional ledger alignment is missing: ${marker}`)
if (!access.includes('## 5A. Player insight access')) fail('Site Access Map does not record Stage 13F-J entry points')

const packageJson = JSON.parse(read('package.json'))
if (packageJson.scripts?.['audit:player-insight'] !== 'node scripts/check-stage13f-player-insight.mjs') fail('audit:player-insight is not wired correctly')
if (!packageJson.scripts?.check?.includes('audit:player-insight')) fail('npm run check does not include audit:player-insight')
if (packageJson.scripts?.['test:db:017:local'] !== 'npx supabase test db --local supabase/tests/database/017_player_insight.test.sql') fail('local Migration 017 test command is missing')
if (packageJson.scripts?.['test:db:017:linked'] !== 'npx supabase test db --linked supabase/tests/database/017_player_insight.test.sql') fail('linked Migration 017 test command is missing')

const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(file => file.endsWith('.sql')).sort()
if (migrations.length < 17) fail(`Stage 13F-J requires the accepted seventeen-migration baseline, found ${migrations.length}`)
if (!migrations.includes('202607030017_euro28_player_insight.sql')) fail('Migration 017 is missing from the active migration history')

if (errors.length) {
  console.error('Euro Stage 13F-J player insight audit failed:')
  errors.forEach(error => console.error(`- ${error}`))
  process.exit(1)
}

console.log('Euro Stage 13F-J player insight engine audit passed.')
console.log('Story engine: canonical source totals, rank gaps, matchday/round evidence, streaks, best calls and corrections')
console.log('Privacy: self detail plus existing Original global-lock and KO fixture-release boundaries for other players')
console.log('Ledger: engine remains accepted; dedicated player view, H2H and points-breakdown destinations are partial/scheduled')
console.log('Separation: Original and KO Predictor totals remain independent; no group-position category')
console.log('Stage 16A: provisional teams, nineteen deterministic personas, scenario oracle, leagues and marker-safe teardown recorded as later staging work')
console.log(`Database: ${migrations.length} active migrations; Migration 017 remains read-only`)
