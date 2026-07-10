import { migrationSequenceError } from './lib/migrationSequenceGuard.mjs'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = file => readFileSync(path.join(root, file), 'utf8')
const fail = message => {
  console.error(`Stage 13G-B KO-readiness audit failed: ${message}`)
  process.exit(1)
}

const packageJson = JSON.parse(read('package.json'))
const shared = read('src/app/koReadiness.js')
const homeModel = read('src/home/homeDashboardModel.js')
const navigation = read('src/app/navigationLifecycle.js')
const navigationTests = read('src/app/__tests__/navigationLifecycle.test.js')
const app = read('src/App.jsx')
const leagueModel = read('src/leagues/leagueModel.js')
const leagueUi = read('src/leagues/Leagues.jsx')
const leaguePresentation = read('src/leagues/LeaguePresentation.jsx')
const leagueTests = read('src/leagues/__tests__/leagueModel.test.js')
const homeAudit = read('scripts/check-stage13g-home-lifecycle.mjs')
const leagueAudit = read('scripts/check-stage13g-league-lifecycle.mjs')
const roadmap = read('docs/EURO28-AGENT-RULES-AND-ROADMAP.md')
const register = read('docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md')
const ledger = read('docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md')

if (!packageJson.scripts?.['audit:ko-readiness']) fail('package.json missing audit:ko-readiness')
if (!packageJson.scripts.check.includes('npm run audit:ko-readiness')) fail('npm run check does not include audit:ko-readiness')
if (!shared.includes('export function buildKoReadiness') || !shared.includes('ROUND_OF_16_MATCH_NUMBERS')) fail('shared KO-readiness model is missing')
if (!shared.includes('groupStageComplete') || !shared.includes('primaryReady') || !shared.includes('showInMore')) fail('shared KO-readiness model does not expose navigation-ready state')
if (!homeModel.includes("import { buildKoReadiness } from '../app/koReadiness.js'") || !homeModel.includes('const ko = buildKoReadiness(reference)')) fail('Home does not consume the shared KO-readiness model')
if (!navigation.includes("import { buildKoReadiness } from './koReadiness.js'") || !navigation.includes('const readiness = koReadiness ?? buildKoReadiness(reference, { resolverHealthy })')) fail('Navigation does not consume the shared KO-readiness model')
if (!navigationTests.includes('can consume a prebuilt shared KO readiness signal')) fail('Navigation test for prebuilt shared KO readiness is missing')
if (!app.includes("import { buildKoReadiness } from './app/koReadiness.js'") || !app.includes('const koReadiness = buildKoReadiness(appData.guestReference)')) fail('App does not build one shared KO-readiness signal')
if (!app.includes('deriveNavigationLifecycle(appData.guestReference, { koReadiness })')) fail('App does not pass shared KO-readiness to navigation')
if (!app.includes('koReadiness={koReadiness}')) fail('App does not pass shared KO-readiness to Leagues')
if (!leagueModel.includes('koReadiness') || !leagueModel.includes('shared KO-readiness signal')) fail('League model does not use shared KO-readiness copy')
// The readiness card render moved into LeagueStandingsPanel (checked on the next line);
// the page itself must still derive the gate from the shared signal.
if (!leagueUi.includes('koReadiness') || !leagueUi.includes('koLeagueReady')) fail('League UI does not gate KO league presentation with shared readiness')
if (!leaguePresentation.includes('LeagueKoReadinessCard') || !leaguePresentation.includes('disabled={disabled}')) fail('League presentation does not disable pre-readiness KO table access')
if (!leagueTests.includes('keeps KO league tables waiting when the tournament has started but KO readiness is closed')) fail('League KO-readiness test is missing')
if (!homeAudit.includes('shared KO readiness signal')) fail('Home lifecycle audit still checks the retired local KO-readiness helper')
if (!leagueAudit.includes('koReadiness={koReadiness}') || !leagueAudit.includes('LeagueKoReadinessCard')) fail('League timing audit does not enforce shared KO-readiness adoption')
if (!roadmap.includes('Stage 13G-B KO-readiness signal close-out')) fail('Roadmap missing KO-readiness close-out entry')
if (!register.includes('Stage 13G-B KO-readiness signal close-out')) fail('Decision register missing KO-readiness close-out entry')
if (!ledger.includes('v1.30') || !ledger.includes('Home, Navigation and Leagues now consume one shared KO-readiness model')) fail('Ledger KO-readiness close-out is missing')

const migrationFiles = readdirSync(path.join(root, 'supabase/migrations')).filter(file => file.endsWith('.sql')).sort()
if (migrationSequenceError(migrationFiles)) fail(migrationSequenceError(migrationFiles))

console.log('Stage 13G-B KO-readiness audit passed.')
console.log('Shared signal: Home, Navigation and Leagues consume buildKoReadiness')
console.log('Navigation: Groups stays primary until the confirmed full readiness boundary')
console.log('Leagues: KO tables stay hidden before real knockout fixtures are ready')
console.log(`Active migrations: ${migrationFiles.length}`)
console.log(`Latest migration: ${migrationFiles.at(-1)}`)
