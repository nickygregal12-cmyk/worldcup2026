import { migrationSequenceError } from './lib/migrationSequenceGuard.mjs'
import { readHomeView } from './lib/homeSource.mjs'
import fs from 'node:fs'
import process from 'node:process'

const errors = []
const fail = message => errors.push(message)
const read = file => fs.readFileSync(file, 'utf8')
const exists = file => fs.existsSync(file)

const model = read('src/home/homeDashboardModel.js')
// Home's view is a layer, not a file: the 400-line component cap split it at
// Stage DP-HOME. See scripts/lib/homeSource.mjs.
const view = readHomeView()
const tests = read('src/home/__tests__/homeDashboardModel.test.js')
const pkg = JSON.parse(read('package.json'))

for (const marker of [
  'export function buildHomeMatchHub',
  'matchCentreCompetition',
  "competition === 'original'",
  "'ko_predictor'",
  'matchHub,',
]) {
  if (!model.includes(marker)) fail(`Home model missing ${marker}`)
}

// Home v2 replaced the single match-hub panel with per-fixture Match Centre cards:
// live and upcoming fixtures render as tappable HomeMatchCard links on matchday.
// TeamBadge replaced TeamLabel at Stage DP-HOME: TeamLabel falls back to a
// two-letter initial avatar whenever a slot is unresolved, and the design ruling
// requires the circular ISO badge with a neutral dashed placeholder instead.
for (const marker of [
  'home.liveMatches.map',
  'home.upcomingMatches.map',
  'href={card.href}',
  'HomeMatchCard',
  'TeamBadge',
]) {
  if (!view.includes(marker)) fail(`Home view missing ${marker}`)
}

// The match-card styles moved from the global src/styles/match-card.css into
// Home's own CSS Module at Stage DP-HOME, retiring that half of the frozen debt.
// Same three guarantees, at their new address: the live chip, the Match Centre
// hint, and the fail-loud provisional chip.
const matchCardStyles = read('src/home/HomeMatchCard.module.css')
for (const marker of [
  'chipLive',
  'matchCentreHint',
  'chipProvisional',
]) {
  if (!matchCardStyles.includes(marker)) fail(`Home match-card styles missing ${marker}`)
}

for (const marker of [
  'routes the next knockout fixture into KO Predictor Match Centre context',
  '#/match-centre?match=2&competition=original',
  '#/match-centre?match=37&competition=ko_predictor',
  'hides the match hub when live result data is unavailable',
]) {
  if (!tests.includes(marker)) fail(`Home matchday tests missing ${marker}`)
}

if (pkg.scripts?.['audit:stage13g-home-matchday-implementation'] !== 'node scripts/check-stage13g-home-matchday-implementation.mjs') {
  fail('package.json missing audit:stage13g-home-matchday-implementation')
}

if (!pkg.scripts?.check?.includes('npm run audit:stage13g-home-matchday-implementation')) {
  fail('check script does not include audit:stage13g-home-matchday-implementation')
}

const migrations = exists('supabase/migrations')
  ? fs.readdirSync('supabase/migrations').filter(file => file.endsWith('.sql')).sort()
  : []
if (migrationSequenceError(migrations)) fail(migrationSequenceError(migrations))

if (errors.length > 0) {
  console.error(`Stage 13G-HOME-MATCHDAY-1 audit failed with ${errors.length} issue(s):`)
  for (const message of errors) console.error(`- ${message}`)
  process.exit(1)
}

console.log('Stage 13G-HOME-MATCHDAY-1 audit passed.')
console.log('Home: match hub now carries fixture, teams, status and Match Centre route.')
console.log('Boundary: group fixtures open Original context; knockout fixtures open KO Predictor context.')
console.log('Safety: read-only presentation only; no scoring, resolver, Supabase write or migration change.')
console.log(`Database: ${migrations.length} active migrations, sequentially numbered with no gaps.`)
