import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const errors = []
const fail = message => errors.push(message)
const exists = relativePath => fs.existsSync(path.join(root, relativePath))
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')

const requiredFiles = [
  'src/testFixtures/stage13dVisualFixture.js',
  'src/testFixtures/__tests__/stage13dVisualFixture.test.js',
  'docs/STAGE-13D-BATCH-2-RESPONSIVE.md',
  'docs/design-baselines/stage13d/README.md',
]
for (const file of requiredFiles) if (!exists(file)) fail(`Stage 13D responsive file is missing: ${file}`)

const fixture = read('src/testFixtures/stage13dVisualFixture.js')
for (const marker of [
  'VISUAL_STAGE13D_REFERENCE',
  'VISUAL_STAGE13D_RESULT_ROWS',
  'VISUAL_STAGE13D_FOUNDATION',
  'createStage13dVisualClient',
  'get_league_standings',
  'get_member_predictions_after_lock',
  'get_my_competition_points',
]) {
  if (!fixture.includes(marker)) fail(`Stage 13D signed-in fixture is missing: ${marker}`)
}

const fixtureTest = read('src/testFixtures/__tests__/stage13dVisualFixture.test.js')
for (const marker of [
  'complete canonical match rows',
  'separate league and points contracts',
  'only for started fixture rows',
]) {
  if (!fixtureTest.includes(marker)) fail(`Stage 13D fixture test is missing: ${marker}`)
}

const productRoot = read('src/App.jsx')
if (productRoot.includes('createStage13dVisualClient') || productRoot.includes('VISUAL_STAGE13D_REFERENCE')) {
  fail('Stage 13D visual fixtures must not ship in the production product root')
}

const deployedVerifier = read('scripts/verify-euro28-foundation-page.mjs')
for (const marker of [
  'Stage 13D leagues, shared predictions',
  'Open a member row for the detailed comparison',
  'Original bracket progression',
  'Advancing teams',
]) {
  if (!deployedVerifier.includes(marker)) fail(`The deployed Stage 13D verifier is missing: ${marker}`)
}

const theme = read('src/app/useTheme.js')
if (!theme.includes("'stage13d'")) fail('Stage 13D visual captures cannot force light and dark themes')

const leagues = [read('src/leagues/Leagues.jsx'), read('src/leagues/LeaguePresentation.jsx')].join('\n')
for (const marker of [
  'Open a member row for the detailed comparison',
  'layoutStyles.memberRow',
  'League code copied.',
  'formatOrdinal',
]) {
  if (!leagues.includes(marker)) fail(`League usability journey is missing: ${marker}`)
}

const results = [read('src/results/ResultsAndLeaderboards.jsx'), read('src/results/ResultsPresentation.jsx')].join('\n')
if (results.includes('title="Completed" rows={feed.sections.completed} open=')) fail('Completed results must not expand the full feed by default')
if (!results.includes("rows.length === 1 ? 'entry' : 'entries'")) fail('Leaderboard entry counts are missing')

function pngDimensions(file) {
  const buffer = fs.readFileSync(path.join(root, file))
  if (buffer.length < 24 || buffer.toString('ascii', 1, 4) !== 'PNG') return null
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}

const baselineSizes = [
  ['mobile-light-380x844.png', 380, 844],
  ['mobile-dark-380x844.png', 380, 844],
  ['tablet-light-768x1024.png', 768, 1024],
  ['tablet-dark-768x1024.png', 768, 1024],
  ['desktop-light-1200x1000.png', 1200, 1000],
  ['desktop-dark-1200x1000.png', 1200, 1000],
]
for (const journey of ['leagues', 'results']) {
  for (const [suffix, width, height] of baselineSizes) {
    const file = `docs/design-baselines/stage13d/${journey}-${suffix}`
    if (!exists(file)) {
      fail(`Stage 13D baseline is missing: ${file}`)
      continue
    }
    const dimensions = pngDimensions(file)
    if (!dimensions || dimensions.width !== width || dimensions.height !== height) {
      fail(`${file} must be ${width}×${height}`)
    }
  }
}

const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(name => name.endsWith('.sql'))
if (migrations.length < 14) fail(`Stage 13D Batch 2 must retain the original fourteen-migration baseline, found ${migrations.length}`)

const packageJson = JSON.parse(read('package.json'))
if (packageJson.scripts?.['audit:stage13d:responsive'] !== 'node scripts/check-stage13d-responsive.mjs') {
  fail('audit:stage13d:responsive is not wired correctly')
}
if (!packageJson.scripts?.check?.includes('npm run audit:stage13d:responsive')) {
  fail('npm run check does not include audit:stage13d:responsive')
}

if (errors.length) {
  console.error('Euro Stage 13D responsive integration audit failed:')
  errors.forEach(error => console.error(`- ${error}`))
  process.exit(1)
}

console.log('Euro Stage 13D responsive integration audit passed.')
console.log('Fixtures: realistic signed-in league, result, shared-prediction and points journeys')
console.log('Baselines: leagues and results at 380, 768 and 1200 pixels in light and dark themes')
console.log('Usability: shared-member selection, copyable join code and collapsed result history')
console.log(`Database: original 14-migration baseline preserved; ${migrations.length} active migrations detected`)
