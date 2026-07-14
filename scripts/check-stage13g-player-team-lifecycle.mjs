import { migrationSequenceError } from './lib/migrationSequenceGuard.mjs'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = file => readFileSync(path.join(root, file), 'utf8')
const fail = message => {
  console.error(`Stage 13G-B player/team lifecycle audit failed: ${message}`)
  process.exit(1)
}

const packageJson = JSON.parse(read('package.json'))
const checkScript = packageJson.scripts?.check ?? ''
if (packageJson.scripts?.['audit:player-team-lifecycle'] !== 'node scripts/check-stage13g-player-team-lifecycle.mjs') fail('audit:player-team-lifecycle script is missing')
if (!checkScript.includes('npm run audit:player-team-lifecycle')) fail('audit:player-team-lifecycle is not wired into npm run check')

const playerModel = read('src/player/playerInsightModel.js')
const playerUi = read('src/player/PlayerInsight.jsx')
const playerH2h = read('src/player/PlayerHeadToHead.jsx')
const resultsUi = read('src/results/ResultsAndLeaderboards.jsx')
const leaguesUi = read('src/leagues/Leagues.jsx')
const teamModel = read('src/teamProfile/teamProfileModel.js')
const teamSheet = read('src/teamProfile/TeamProfileSheet.jsx')
const teamProvider = read('src/teamProfile/TeamProfileProvider.jsx')
const app = read('src/App.jsx')
const playerTests = read('src/player/__tests__/playerInsightModel.test.js')
const teamTests = read('src/teamProfile/__tests__/teamProfileModel.test.js')
const stageDoc = read('docs/archive/STAGE-13G-B-PLAYER-TEAM-LIFECYCLE.md')
const ledger = read('docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md')
const roadmap = read('docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md')
const agentRules = read('docs/EURO28-AGENT-RULES-AND-ROADMAP.md')

if (!playerModel.includes('export function buildPlayerInsightLifecycle')) fail('Player Insight lifecycle model is missing')
if (!playerModel.includes('You only see picks that are available for this player right now')) fail('Player Insight did not preserve player-facing privacy copy')
if (!playerModel.includes('KO Predictor points are shown separately')) fail('Player Insight Original/KO separation copy is missing')
if (!playerUi.includes('buildPlayerInsightLifecycle') || !playerUi.includes('lifecycleNote')) fail('Player Insight UI is not rendering lifecycle copy')
if (!playerH2h.includes('lifecycle = null') || !playerH2h.includes('lifecycle={lifecycle}')) fail('H2H does not pass lifecycle to Player Insight')
if (!resultsUi.includes('lifecycle={lifecycle}') || !leaguesUi.includes('lifecycle={lifecycle}')) fail('Results or Leagues do not pass lifecycle to player surfaces')

if (!teamModel.includes('export function buildTeamProfileLifecycle')) fail('Team Profile lifecycle model is missing')
if (!teamModel.includes('KO Predictor points stay out of it')) fail('Team Profile separation copy is missing')
if (!teamSheet.includes('buildTeamProfileLifecycle') || !teamSheet.includes('team-profile-lifecycle-note')) fail('Team Profile sheet is not rendering lifecycle copy')
if (!teamProvider.includes('lifecycle = null') || !teamProvider.includes('lifecycle={lifecycle}')) fail('Team Profile provider is not passing lifecycle to the sheet')
if (!app.includes('<TeamProfileProvider') || !app.includes('lifecycle={lifecycle}>')) fail('App does not pass central lifecycle into Team Profile provider')
if (!playerTests.includes('builds lifecycle copy from central lock state')) fail('Player Insight lifecycle test is missing')
if (!teamTests.includes('derives Team Profile lifecycle copy from central lock state')) fail('Team Profile lifecycle test is missing')

if (!stageDoc.includes('No database migration') || !stageDoc.includes('no Migration 019')) fail('stage doc does not preserve no-migration boundary')
if (!ledger.includes('v1.29') || !ledger.includes('Player Insight and Team Profile lifecycle alignment')) fail('ledger v1.29 close-out is missing')
if (!roadmap.includes('Stage 13G-B Player Insight and Team Profile lifecycle alignment')) fail('decision register lifecycle entry is missing')
if (!agentRules.includes('Stage 13G-B Player Insight and Team Profile lifecycle alignment')) fail('agent roadmap lifecycle entry is missing')

const migrationFiles = readdirSync(path.join(root, 'supabase/migrations')).filter(file => file.endsWith('.sql'))
const latest = migrationFiles.sort().at(-1)
if (migrationSequenceError(migrationFiles)) fail(migrationSequenceError(migrationFiles))

console.log('Stage 13G-B player/team lifecycle audit passed.')
console.log('Player Insight: central lifecycle copy with existing server privacy wording preserved')
console.log('Team Profile: central lifecycle copy with Original-only aggregate and KO exclusion boundary')
console.log(`Active migrations: ${migrationFiles.length}`)
console.log(`Latest migration: ${latest}`)
