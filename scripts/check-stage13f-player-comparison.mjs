import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const errors = []
const fail = message => errors.push(message)
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const exists = file => fs.existsSync(path.join(root, file))

const requiredFiles = [
  'src/design-system/PlayerIdentity.jsx',
  'src/design-system/PlayerIdentity.module.css',
  'src/design-system/__tests__/PlayerIdentity.test.jsx',
  'src/player/PlayerHeadToHead.jsx',
  'src/player/PlayerHeadToHead.module.css',
  'src/player/playerComparisonModel.js',
  'src/player/__tests__/PlayerHeadToHead.test.jsx',
  'src/player/__tests__/playerComparisonModel.test.js',
  'docs/STAGE-13F-B-PLAYER-IDENTITY-AND-HEAD-TO-HEAD.md',
]
for (const file of requiredFiles) if (!exists(file)) fail(`Stage 13F-B file is missing: ${file}`)

const identity = read('src/design-system/PlayerIdentity.jsx')
for (const marker of [
  'data-player-identity-trigger="true"',
  'Compare predictions with',
  'isCurrentUser',
  'onActivate',
]) if (!identity.includes(marker)) fail(`Shared player identity is missing: ${marker}`)

const designIndex = read('src/design-system/index.jsx')
if (!designIndex.includes('PlayerIdentity')) fail('PlayerIdentity is not exported from the shared design system')

const leaguePresentation = read('src/leagues/LeaguePresentation.jsx')
const resultsPresentation = read('src/results/ResultsPresentation.jsx')
for (const [name, source] of [['league standings', leaguePresentation], ['overall leaderboard', resultsPresentation]]) {
  if (!source.includes('<PlayerIdentity')) fail(`${name} does not use the shared player identity primitive`)
  if (source.includes('foundation-member-link')) fail(`${name} still uses an ad hoc player-name button`)
}

const leagueController = read('src/leagues/Leagues.jsx')
const resultsController = read('src/results/ResultsAndLeaderboards.jsx')
for (const [name, source] of [['league', leagueController], ['overall', resultsController]]) {
  if (!source.includes('<PlayerHeadToHead')) fail(`${name} comparison does not use the shared H2H surface`)
  if (!source.includes('buildStandingComparison')) fail(`${name} comparison is missing competition-scoped rank and points context`)
}

const comparison = read('src/player/playerComparisonModel.js')
for (const marker of [
  'buildAlignedPlayerComparison',
  'currentBundle',
  'otherBundle',
  'privateSelections',
  'missingSelections',
  'bracketMatches',
  'advancingTeamMatches',
  'methodMatches',
]) if (!comparison.includes(marker)) fail(`Aligned comparison model is missing: ${marker}`)
if (/combined(?:Points|Total|Competition)/.test(comparison)) fail('Player comparison must not combine Original and KO totals')

const ledger = read('docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md')
for (const marker of [
  '| Head-to-head comparison | ✅ FUNCTIONAL |',
  '| Tappable player identity | ✅ FUNCTIONAL |',
  '| Converging wall-chart bracket layout (≥900px) + share-card image rendering | 🕓 SCHEDULED |',
  '| 13P-A |',
]) if (!ledger.includes(marker)) fail(`Functional ledger is missing: ${marker}`)

const roadmap = read('docs/EURO28-AGENT-RULES-AND-ROADMAP.md')
for (const marker of [
  '## Stage 13F-B — Player identity and complete H2H',
  '## Stage 13P-A — Converging wall-chart bracket and Share Image',
  'Stage 13F-I — Tournament-pick contract.',
]) if (!roadmap.includes(marker)) fail(`Roadmap is missing: ${marker}`)

const register = read('docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md')
if (!register.includes('Confirmed Decision 13 — Classic converging bracket and Share Card')) fail('Decision Register is missing the converging bracket decision')
const charter = read('docs/EURO28-DESIGN-CHARTER.md')
if (!charter.includes('DECIDED — Share Card')) fail('Design Charter has not settled the Share Card decision')

const comparisonView = read('src/player/PlayerHeadToHead.jsx')
for (const marker of [
  'Original and KO Predictor comparisons stay separate.',
  'Only selections released by the existing server privacy rules are shown.',
  'Comparison protected',
  'Same selection',
  'Different selection',
]) if (!comparisonView.includes(marker)) fail(`Shared comparison presentation is missing: ${marker}`)

const services = [read('src/leagues/leagueService.js'), read('src/results/resultService.js')].join('\n')
for (const marker of ['get_league_member_predictions', 'get_member_predictions_after_lock']) {
  if (!services.includes(marker)) fail(`Existing authorised comparison RPC is missing: ${marker}`)
}
if (/\.from\([^)]*\)\s*\.\s*(?:insert|update|delete|upsert)\s*\(/s.test(services)) {
  fail('Stage 13F-B must not add direct browser writes')
}

const packageJson = JSON.parse(read('package.json'))
if (packageJson.scripts?.['audit:player-comparison'] !== 'node scripts/check-stage13f-player-comparison.mjs') fail('audit:player-comparison is not wired correctly')
if (!packageJson.scripts?.check?.includes('audit:player-comparison')) fail('npm run check does not include audit:player-comparison')
if (!packageJson.scripts?.['lint:foundation']?.includes('src/player')) fail('the player feature root is not included in lint:foundation')

const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(name => name.endsWith('.sql'))
if (migrations.length !== 16) fail(`Stage 13F-B must preserve the approved 16-migration baseline, found ${migrations.length}`)
if (!migrations.some(name => name.includes('016_euro28_staging_time_phase_controls'))) fail('Approved staging Time & Phase Migration 016 is missing')

if (errors.length) {
  console.error('Euro Stage 13F-B player identity and H2H audit failed:')
  errors.forEach(error => console.error(`- ${error}`))
  process.exit(1)
}

console.log('Euro Stage 13F-B player identity and H2H audit passed.')
console.log('Identity: one shared accessible player primitive in league and overall tables')
console.log('Comparison: one aligned Original/KO surface with competition-scoped ranks and points')
console.log('Privacy: existing server-authorised release rules remain unchanged')
console.log(`Database: ${migrations.length} active migrations; approved staging Time & Phase Migration 016 present`)
