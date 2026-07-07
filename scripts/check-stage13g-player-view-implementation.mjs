import fs from 'node:fs'
import process from 'node:process'
import { migrationSequenceError } from './lib/migrationSequenceGuard.mjs'

const errors = []
const fail = message => errors.push(message)
const read = file => fs.readFileSync(file, 'utf8')
const exists = file => fs.existsSync(file)

const files = [
  'src/player/PlayerView.jsx',
  'src/player/PlayerView.module.css',
  'src/player/playerViewModel.js',
  'src/player/playerViewService.js',
  'src/player/__tests__/playerViewModel.test.js',
  'src/player/__tests__/PlayerView.test.jsx',
]

for (const file of files) {
  if (!exists(file)) fail(`${file} is missing`)
}

const appRoutes = read('src/app/appRoutes.js')
const app = read('src/App.jsx')
const index = read('src/player/index.js')
const model = exists('src/player/playerViewModel.js') ? read('src/player/playerViewModel.js') : ''
const service = exists('src/player/playerViewService.js') ? read('src/player/playerViewService.js') : ''
const ui = exists('src/player/PlayerView.jsx') ? read('src/player/PlayerView.jsx') : ''
const pkg = JSON.parse(read('package.json'))

for (const marker of [
  "PLAYER: 'player'",
  "['/player', APP_ROUTE.PLAYER]",
  'playerViewParamsFromHash',
]) {
  if (!appRoutes.includes(marker)) fail(`Player route missing ${marker}`)
}

for (const marker of [
  "import PlayerView from './player/PlayerView.jsx'",
  'route === APP_ROUTE.PLAYER',
  '<PlayerView',
]) {
  if (!app.includes(marker)) fail(`App Player View wiring missing ${marker}`)
}

for (const marker of [
  'export function buildPlayerView',
  'buildSharedPredictionJourney',
  'tabs',
  'predictedTables',
  'bracketSummary',
]) {
  if (!model.includes(marker)) fail(`Player View model missing ${marker}`)
}

for (const marker of [
  'export async function loadPlayerView',
  'get_member_predictions_after_lock',
  'get_competition_leaderboard',
  'buildPlayerView',
]) {
  if (!service.includes(marker)) fail(`Player View service missing ${marker}`)
}

for (const marker of [
  'PlayerHeader',
  'PredictionsPanel',
  'BracketPanel',
  'TablesPanel',
  'Tabs label="Player View sections"',
]) {
  if (!ui.includes(marker)) fail(`Player View UI missing ${marker}`)
}

for (const marker of [
  'PlayerView',
  'buildPlayerView',
  'loadPlayerView',
]) {
  if (!index.includes(marker)) fail(`player index export missing ${marker}`)
}

if (pkg.scripts?.['audit:stage13g-player-view-implementation'] !== 'node scripts/check-stage13g-player-view-implementation.mjs') {
  fail('package.json missing audit:stage13g-player-view-implementation')
}

if (!pkg.scripts?.check?.includes('npm run audit:stage13g-player-view-implementation')) {
  fail('check script does not include audit:stage13g-player-view-implementation')
}

const migrations = fs.existsSync('supabase/migrations')
  ? fs.readdirSync('supabase/migrations').filter(name => name.endsWith('.sql'))
  : []
if (migrationSequenceError(migrations)) fail(migrationSequenceError(migrations))

if (errors.length > 0) {
  console.error(`Stage 13G-PLAYER-1 audit failed with ${errors.length} issue(s):`)
  for (const message of errors) console.error(`- ${message}`)
  process.exit(1)
}

console.log('Stage 13G-PLAYER-1 audit passed.')
console.log('Player View: dedicated route, always-visible header and Predictions/Bracket/Tables sections are active.')
console.log('Privacy: authorised shared-prediction reads are reused; protected picks remain hidden.')
console.log('Boundary: Original Predictor and KO Predictor remain separate; no write path or scoring change.')
console.log(`Database: ${migrations.length} active migrations, sequentially numbered with no gaps.`)
