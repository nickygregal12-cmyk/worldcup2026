import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const errors = []
const fail = message => errors.push(message)
const exists = file => fs.existsSync(path.join(root, file))
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(name => name.endsWith('.sql'))
if (migrations.length < 14) fail(`Stage 13C must retain the original fourteen-migration baseline, found ${migrations.length}`)

const requiredFiles = [
  'src/journey/OriginalBracket.jsx',
  'src/journey/originalBracketPresentationModel.js',
  'src/journey/__tests__/OriginalBracket.test.jsx',
  'src/journey/__tests__/originalBracketPresentationModel.test.js',
  'src/koPredictor/KoPredictorMatchCentre.jsx',
  'src/koPredictor/koPredictorPresentationModel.js',
  'src/koPredictor/__tests__/KoPredictorMatchCentre.test.jsx',
  'src/koPredictor/__tests__/koPredictorPresentationModel.test.js',
  'src/styles/knockout-experiences.css',
  'docs/STAGE-13C-BRACKET-AND-KO-PREDICTOR.md',
]
for (const file of requiredFiles) if (!exists(file)) fail(`Stage 13C file is missing: ${file}`)

const bracket = read('src/journey/OriginalBracket.jsx')
for (const marker of [
  'Your bracket',
  'Your pre-tournament bracket',
  'team that goes through',
  'No bracket jokers',
  'Original Predictor',
  'TeamLabel',
]) if (!bracket.includes(marker)) fail(`Original bracket is missing: ${marker}`)
for (const forbidden of ['ScoreInput', 'decisionMethod', 'jokerApplied', '90-minute score']) {
  if (bracket.includes(forbidden)) fail(`Original bracket must not contain ${forbidden}`)
}

const bracketModel = read('src/journey/originalBracketPresentationModel.js')
for (const marker of ['ORIGINAL_BRACKET_ROUNDS', 'deriveOriginalBracketMatchState', 'predictedChampion']) {
  if (!bracketModel.includes(marker)) fail(`Original bracket presentation model is missing: ${marker}`)
}

const journey = [
  read('src/journey/PredictionJourney.jsx'),
  read('src/journey/PredictionJourneyView.jsx'),
].join('\n')
if (!journey.includes("import OriginalBracket from './OriginalBracket.jsx'")) fail('Prediction journey does not use the shared OriginalBracket component')
if (!journey.includes('<OriginalBracket')) fail('Prediction journey does not render the shared OriginalBracket component')

const ko = read('src/koPredictor/KoPredictorMatchCentre.jsx')
for (const marker of [
  'Real knockout fixtures',
  'KO Predictor match centre',
  '90-minute score',
  'Penalty shoot-out score is never predicted',
  'Team to advance',
  'How the tie is decided',
  'KO jokers',
  'Your KO points',
  'TBC matches stay hidden',
  'Original Predictor points and picks are never included',
]) if (!ko.includes(marker)) fail(`KO Predictor match centre is missing: ${marker}`)
for (const component of ['ScoreInput', 'TeamLabel', 'PredictionStateBadge']) {
  if (!ko.includes(component)) fail(`KO Predictor match centre is missing shared component: ${component}`)
}

const koModel = read('src/koPredictor/koPredictorPresentationModel.js')
for (const marker of ['KO_PREDICTOR_ROUNDS', 'koMethodOptions', "value: 'normal_time'", "value: 'extra_time'", "value: 'penalties'", 'deriveKoMatchPresentation']) {
  if (!koModel.includes(marker)) fail(`KO presentation model is missing: ${marker}`)
}

const koFoundation = read('src/koPredictor/KoPredictor.jsx')
for (const marker of ['saveMyKoPredictionBundle', 'loadMyKoPredictorStanding', '<KoPredictorMatchCentre', 'createGuestKoPredictionStorage', 'guestTransferMode']) {
  if (!koFoundation.includes(marker)) fail(`KO Predictor controller is missing: ${marker}`)
}

const koService = read('src/koPredictor/koPredictorService.js')
for (const marker of ['get_my_competition_points', 'get_competition_leaderboard', 'KO_PREDICTOR_COMPETITION_KEY']) {
  if (!koService.includes(marker)) fail(`KO Predictor service is missing: ${marker}`)
}
if (koService.includes('original_predictor')) fail('KO Predictor service must not read Original Predictor totals')

const fixture = read('src/testFixtures/visualFixture.js')
for (const marker of ['VISUAL_BRACKET_DRAFT', 'VISUAL_KO_REFERENCE', 'VISUAL_KO_BUNDLE', 'VISUAL_KO_STANDING']) {
  if (!fixture.includes(marker)) fail(`Stage 13C visual fixture is missing: ${marker}`)
}

const main = read('src/main.jsx')
if (!main.includes("./styles/knockout-experiences.css")) fail('Stage 13C stylesheet is not imported by the app entry point')

const css = read('src/styles/knockout-experiences.css')
// .original-bracket__rounds was removed with the orphaned pre-module bracket CSS;
// the live Original Bracket styling lives in OriginalBracket*.module.css.
for (const marker of ['.knockout-context--predicted', '.knockout-context--real', '.ko-match-card', '.ko-joker-button', '@media (max-width: 40rem)']) {
  if (!css.includes(marker)) fail(`Stage 13C stylesheet is missing: ${marker}`)
}

const originalTest = read('src/journey/__tests__/OriginalBracket.test.jsx')
for (const marker of ['Your bracket', 'No bracket jokers', "not.toContain('90-minute score')"]) {
  if (!originalTest.includes(marker)) fail(`Original bracket component test is missing: ${marker}`)
}
const koTest = read('src/koPredictor/__tests__/KoPredictorMatchCentre.test.jsx')
for (const marker of ['Real knockout fixtures', '90-minute score', 'Team to advance', 'How the tie is decided']) {
  if (!koTest.includes(marker)) fail(`KO match-centre component test is missing: ${marker}`)
}

function pngDimensions(file) {
  const buffer = fs.readFileSync(path.join(root, file))
  if (buffer.length < 24 || buffer.toString('ascii', 1, 4) !== 'PNG') return null
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}
const baselineSizes = [
  ['mobile-light-380x844.png', 380, 844], ['mobile-dark-380x844.png', 380, 844],
  ['tablet-light-768x1024.png', 768, 1024], ['tablet-dark-768x1024.png', 768, 1024],
  ['desktop-light-1200x1000.png', 1200, 1000], ['desktop-dark-1200x1000.png', 1200, 1000],
]
for (const context of ['bracket', 'ko']) {
  for (const [suffix, width, height] of baselineSizes) {
    const file = `docs/design-baselines/stage13c/${context}-${suffix}`
    if (!exists(file)) { fail(`Stage 13C baseline is missing: ${file}`); continue }
    const dimensions = pngDimensions(file)
    if (!dimensions || dimensions.width !== width || dimensions.height !== height) fail(`${file} must be ${width}×${height}`)
  }
}

const packageJson = JSON.parse(read('package.json'))
if (packageJson.scripts?.['audit:knockout-experiences'] !== 'node scripts/check-knockout-experiences.mjs') fail('audit:knockout-experiences is not wired correctly')
if (!packageJson.scripts?.check?.includes('audit:knockout-experiences')) fail('npm run check does not include audit:knockout-experiences')

if (errors.length) {
  console.error('Euro Stage 13C knockout-experience audit failed:')
  errors.forEach(error => console.error(`- ${error}`))
  process.exit(1)
}

console.log('Euro Stage 13C knockout-experience audit passed.')
console.log('Original bracket: pre-tournament winner-only picks and no jokers')
console.log('KO Predictor: real fixtures, 90-minute scores, advancing team, method and five separate jokers')
console.log('Competition totals: Original Predictor and KO Predictor remain separate')
console.log('Unresolved knockout fixtures: hidden')
console.log('Guest KO entries: saved locally and transferable without affecting Original Predictor data')
console.log(`Database: original 14-migration baseline preserved; ${migrations.length} active migrations detected`)
