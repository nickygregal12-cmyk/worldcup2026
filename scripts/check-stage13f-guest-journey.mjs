import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const errors = []
const fail = message => errors.push(message)
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const exists = file => fs.existsSync(path.join(root, file))

const requiredFiles = [
  'src/guest/GuestAccountPrompt.jsx',
  'src/guest/GuestAccountPrompt.module.css',
  'src/guest/GuestAccountTransfer.jsx',
  'src/guest/GuestAccountTransfer.module.css',
  'src/guest/guestAccountTransferModel.js',
  'src/guest/guestKoPredictionStorage.js',
  'src/guest/__tests__/guestAccountTransferModel.test.js',
  'src/guest/__tests__/guestKoPredictionStorage.test.js',
  'src/journey/euroLuckyDip.js',
  'src/journey/GroupsPredictorActions.module.css',
  'src/journey/__tests__/euroLuckyDip.test.js',
  'docs/STAGE-13F-A-GUEST-JOURNEY-AND-LUCKY-DIP.md',
]
for (const file of requiredFiles) if (!exists(file)) fail(`Stage 13F-A file is missing: ${file}`)

const journeyController = read('src/journey/PredictionJourneyFoundation.jsx')
for (const marker of [
  'guestTransferMode',
  'applyEuroLuckyDip',
  'guestStorage.clear()',
  'writeGuestReview(reference, false)',
  "new Event(GUEST_STATE_UPDATED_EVENT)",
]) if (!journeyController.includes(marker)) fail(`Original guest journey is missing: ${marker}`)

const journeyView = read('src/journey/PredictionJourneyView.jsx')
for (const marker of [
  'GuestAccountPrompt',
  'Keep editing this saved browser draft',
  'Add completed draft to account',
  'onLuckyDip={runLuckyDip}',
]) if (!journeyView.includes(marker)) fail(`Original guest presentation is missing: ${marker}`)
for (const forbidden of ['Export JSON', 'Import JSON', 'guest-import-button']) {
  if (journeyView.includes(forbidden)) fail(`Live prediction journey still exposes development file UX: ${forbidden}`)
}

const auth = read('src/auth/EuroAuthFoundation.jsx')
for (const marker of ['GuestAccountTransfer', 'Any saved browser predictions are ready to add to this account']) {
  if (!auth.includes(marker)) fail(`Account conversion journey is missing: ${marker}`)
}
if (auth.includes('through Stage 6')) fail('Account copy still exposes Stage 6 development wording')

const koFoundation = read('src/koPredictor/KoPredictorFoundation.jsx')
for (const marker of [
  'createGuestKoPredictionStorage',
  'updateGuestKoPredictionState',
  'guestTransferMode',
  'guestStorage.clear()',
  'GuestAccountPrompt',
]) if (!koFoundation.includes(marker)) fail(`KO guest journey is missing: ${marker}`)

const koView = read('src/koPredictor/KoPredictorMatchCentre.jsx')
for (const marker of ['KO predictions save on this device', 'Add KO draft to account', "storageContext !== 'guest'"]) {
  if (!koView.includes(marker)) fail(`KO guest presentation is missing: ${marker}`)
}

const luckyDip = read('src/journey/euroLuckyDip.js')
for (const marker of ['EURO_LUCKY_DIP_MODE', 'generateEuroLuckyDipScore', 'clearStaleBracketSelections', 'homeScore', 'awayScore']) {
  if (!luckyDip.includes(marker)) fail(`Euro Lucky Dip is missing: ${marker}`)
}
if (/odds|ranking/i.test(luckyDip)) fail('Euro Lucky Dip must not depend on odds or rankings')

const groups = read('src/journey/GroupsPredictor.jsx')
for (const marker of ['Fill empty scores', 'Replace all scores', 'Lucky Dip never uses odds', 'Replace every group score?']) {
  if (!groups.includes(marker)) fail(`Groups Lucky Dip presentation is missing: ${marker}`)
}

const packageJson = JSON.parse(read('package.json'))
if (packageJson.scripts?.['audit:guest-journey'] !== 'node scripts/check-stage13f-guest-journey.mjs') fail('audit:guest-journey is not wired correctly')
if (!packageJson.scripts?.check?.includes('audit:guest-journey')) fail('npm run check does not include audit:guest-journey')

const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(name => name.endsWith('.sql'))
if (migrations.length !== 16) fail(`Stage 13F-A must preserve the approved 16-migration baseline, found ${migrations.length}`)
if (!migrations.some(name => name.includes('016_euro28_staging_time_phase_controls'))) fail('Approved staging Time & Phase Migration 016 is missing')

if (errors.length) {
  console.error('Euro Stage 13F-A guest-journey audit failed:')
  errors.forEach(error => console.error(`- ${error}`))
  process.exit(1)
}

console.log('Euro Stage 13F-A guest-journey audit passed.')
console.log('Original guest draft: remains editable after sign-in until a confirmed account transfer')
console.log('KO guest draft: browser-persisted and transferable without combining competitions')
console.log('Signup conversion: no ordinary JSON file controls and no development-stage copy')
console.log('Lucky Dip: local score generation, no odds, no automatic jokers and stale bracket clearing')
console.log(`Database: ${migrations.length} active migrations; approved staging Time & Phase Migration 016 present`)
