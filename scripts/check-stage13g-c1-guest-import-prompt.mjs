import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const errors = []
const fail = message => errors.push(message)

const requiredFiles = [
  'docs/STAGE-13G-C1-GUEST-IMPORT-PROMPT.md',
  'src/guest/GuestAccountTransfer.jsx',
  'src/guest/guestAccountTransferModel.js',
  'src/guest/guestAccountTransferPresentation.js',
  'src/guest/__tests__/guestAccountTransferModel.test.js',
  'src/guest/__tests__/GuestAccountTransfer.test.jsx',
]

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) fail(`${file} is missing`)
}

const component = read('src/guest/GuestAccountTransfer.jsx')
const model = read('src/guest/guestAccountTransferModel.js')
const presentation = read('src/guest/guestAccountTransferPresentation.js')
const test = read('src/guest/__tests__/guestAccountTransferModel.test.js')
const componentTest = read('src/guest/__tests__/GuestAccountTransfer.test.jsx')
const doc = read('docs/STAGE-13G-C1-GUEST-IMPORT-PROMPT.md')

for (const [file, text] of [
  ['guestAccountTransferModel.js', model],
  ['guestAccountTransferModel.test.js', test],
  ['STAGE-13G-C1-GUEST-IMPORT-PROMPT.md', doc],
]) {
  for (const marker of [
    'Keep your predictions from this device?',
    'Keep these predictions',
    'Start fresh',
  ]) {
    if (!text.includes(marker)) fail(`${file} missing marker: ${marker}`)
  }
}

for (const marker of [
  'buildGuestAccountTransferPrompt',
  'prompt.heading',
  'prompt.primaryAction',
  'prompt.secondaryAction',
  'function startFresh()',
]) {
  if (!component.includes(marker)) fail(`GuestAccountTransfer.jsx missing implementation marker: ${marker}`)
  if (!componentTest.includes(marker) && marker !== 'function startFresh()') fail(`GuestAccountTransfer.test.jsx missing implementation marker: ${marker}`)
}

for (const marker of ['messageForError', 'originalStatus', 'koStatus', 'browserStorage']) {
  if (!presentation.includes(marker)) fail(`guestAccountTransferPresentation.js missing marker: ${marker}`)
  if (!component.includes(marker)) fail(`GuestAccountTransfer.jsx must import/use presentation marker: ${marker}`)
  if (!componentTest.includes(marker)) fail(`GuestAccountTransfer.test.jsx missing presentation marker: ${marker}`)
}

for (const marker of ['group scores', 'bracket picks', 'KO Predictor draft', 'on this device']) {
  if (!model.includes(marker)) fail(`guestAccountTransferModel.js missing helper marker: ${marker}`)
  if (!test.includes(marker)) fail(`guestAccountTransferModel.test.js missing helper marker: ${marker}`)
  if (!componentTest.includes(marker)) fail(`GuestAccountTransfer.test.jsx missing helper marker: ${marker}`)
}

const activeFilesToScan = [
  'src/auth/AccountAccess.jsx',
  'src/guest/GuestAccountTransfer.jsx',
  'src/home/HomeDashboard.jsx',
  'src/journey/PredictionJourney.jsx',
  'src/journey/PredictionJourneyView.jsx',
  'src/journey/predictionJourneyRuntime.js',
]

const forbidden = [
  /Add your guest predictions to this account/i,
  /Add saved predictions/i,
  /browser draft/i,
  /browser copy/i,
  /browser predictions/i,
  /saved browser draft/i,
  /browser-only guest draft/i,
]

for (const file of activeFilesToScan) {
  const text = read(file)
  for (const pattern of forbidden) {
    if (pattern.test(text)) fail(`${file} still contains forbidden signed-in/internal copy: ${pattern}`)
  }
}

const packageJson = JSON.parse(read('package.json'))
if (packageJson.scripts['audit:guest-import-prompt'] !== 'node scripts/check-stage13g-c1-guest-import-prompt.mjs') {
  fail('package.json missing audit:guest-import-prompt script')
}
if (!packageJson.scripts.check.includes('npm run audit:guest-import-prompt')) {
  fail('npm run check must include audit:guest-import-prompt')
}
if (!packageJson.scripts['lint:foundation'].includes('scripts/check-stage13g-c1-guest-import-prompt.mjs')) {
  fail('lint:foundation must include the C1 audit script')
}

const migrationFiles = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(name => name.endsWith('.sql'))
if (migrationFiles.length !== 18) fail(`C1 must not change migration count; found ${migrationFiles.length}`)
if (migrationFiles.some(name => /(?:^|_)019|202607030019/.test(name))) fail('C1 must not create Migration 019')

if (errors.length) {
  console.error('Euro Stage 13G-C1 guest keep prompt audit failed:')
  errors.forEach(error => console.error(`- ${error}`))
  process.exit(1)
}

console.log('Euro Stage 13G-C1 guest keep prompt audit passed.')
console.log('Prompt: accepted import/start-fresh wording is present.')
console.log('Copy: signed-in import surfaces use device wording, not browser-draft wording.')
console.log('Competition boundary: Original Predictor and KO Predictor import readiness remains separate.')
console.log('Database: active migrations remain 18; no Migration 019.')
