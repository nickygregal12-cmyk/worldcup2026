import { migrationSequenceError } from './lib/migrationSequenceGuard.mjs'
import { readHomeStyles, readHomeView } from './lib/homeSource.mjs'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const fail = message => { console.error(message); process.exit(1) }

const model = read('src/home/homeDashboardModel.js')
// Home's view and styles are layers, not files: the 400-line component cap split
// the page at Stage DP-HOME and each component took a colocated CSS Module with
// it. See scripts/lib/homeSource.mjs.
const view = readHomeView()
const lifecycle = read('src/config/tournamentLifecycle.js')
const lifecycleTest = read('src/config/__tests__/tournamentLifecycle.test.js')
const homeTest = read('src/home/__tests__/homeDashboardModel.test.js')
const styles = readHomeStyles()
const packageJson = JSON.parse(read('package.json'))
const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(file => file.endsWith('.sql')).sort()

if (migrationSequenceError(migrations)) fail(migrationSequenceError(migrations))
if (!lifecycle.includes('validStartTimestamp') || !lifecycle.includes('hasExplicitTime')) fail('Lifecycle resolver must keep date-only tournament starts from overriding central precise start config')
// Home v2 made the lock and the opening kick-off one moment: the central start fallback is 19:00Z.
if (!lifecycleTest.includes("starts_on: '2028-06-09'") || !lifecycleTest.includes("2028-06-09T19:00:00.000Z")) fail('Config-to-surface lifecycle test for central tournament start is missing')
if (!model.includes('resolveTournamentLifecycle(tournament, now)')) fail('Home model must derive lifecycle from the central resolver')
if (!model.includes('predictionLockCountdown') || !model.includes('tournamentStartCountdown')) fail('Home model must expose prediction-lock and tournament-start countdowns')
if (!model.includes("import { buildKoReadiness } from '../app/koReadiness.js'") || !model.includes('const ko = buildKoReadiness(reference)')) fail('Home model must consume the shared KO readiness signal')
if (!homeTest.includes('drives Home countdowns from the central lifecycle configuration')) fail('Home countdown contract test is missing')
if (!homeTest.includes('surfaces a central KO readiness signal')) fail('Home KO readiness contract test is missing')
if (!homeTest.includes('marks Home as live and promotes the active match')) fail('Home today/live match hub test is missing')
// Home v2: the lifecycle strip became the single CountdownHero (lock == opening kick-off),
// the today hub became state-ordered MatchdayLive cards, and guest conversion is the
// prediction CTA driven by the model.
if (!view.includes('CountdownHero')) fail('Home lifecycle countdown hero is missing')
if (!view.includes('MatchdayLive')) fail('Home matchday-live surface is missing')
if (!view.includes('predictionCta')) fail('Home prediction conversion prompt is missing')
if (!styles.includes('countHero') || !styles.includes('countBig')) fail('Stage 13G-B Home lifecycle styles are missing')
if (!packageJson.scripts['audit:home-lifecycle']) fail('audit:home-lifecycle script is not registered')
if (!packageJson.scripts.check.includes('npm run audit:home-lifecycle')) fail('npm run check must include the Home lifecycle audit')

console.log('Stage 13G-B Home lifecycle audit passed.')
console.log('Home countdowns: central prediction lock and tournament start')
console.log('Home conversion: first-visit and returning guest prompts')
console.log('Today hub: live/next match centre entry')
console.log('KO readiness: shared signal consumed by Home')
console.log(`Active migrations: ${migrations.length}`)
console.log(`Latest migration: ${migrations.at(-1)}`)
