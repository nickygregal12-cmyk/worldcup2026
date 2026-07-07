import { migrationSequenceError } from './lib/migrationSequenceGuard.mjs'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const exists = file => fs.existsSync(path.join(root, file))
const errors = []
const fail = message => errors.push(message)

const required = [
  'docs/STAGE-13G-ACCOUNT-1-ACCOUNT-DESTINATION-REBUILD.md',
  'src/auth/AccountAccess.jsx',
  'src/auth/AccountDashboard.jsx',
  'src/auth/AccountDashboard.module.css',
  'src/auth/accountAccessModel.js',
  'src/auth/accountAccessService.js',
  'src/auth/__tests__/accountAccessModel.test.js',
  'src/guest/GuestAccountTransfer.jsx',
  'src/guest/guestAccountTransferModel.js',
  'scripts/check-stage13g-c1-guest-import-prompt.mjs',
]
for (const file of required) if (!exists(file)) fail(`${file} is missing`)
if (exists('src/pages/Profile.jsx')) fail('dead legacy src/pages/Profile.jsx must be retired')

const account = read('src/auth/AccountAccess.jsx')
const dashboard = read('src/auth/AccountDashboard.jsx')
const model = read('src/auth/accountAccessModel.js')
const service = read('src/auth/accountAccessService.js')
const guestModel = read('src/guest/guestAccountTransferModel.js')
const guest = read('src/guest/GuestAccountTransfer.jsx')
const app = read('src/App.jsx')
const doc = read('docs/STAGE-13G-ACCOUNT-1-ACCOUNT-DESTINATION-REBUILD.md')
const packageJson = JSON.parse(read('package.json'))

for (const marker of [
  'AccountStatsCard',
  'identityCard',
  'Security & preferences',
  'Match reminders',
  'Daily points update',
  'Open leagues',
  'Danger zone',
  'Clear my predictions',
  'setGuestTransferRequested(true)',
]) {
  if (!(account + dashboard).includes(marker)) fail(`Account destination missing marker: ${marker}`)
}

for (const marker of ['buildAccountStats', 'buildAccountLifecycle', 'clearPredictionsAvailable']) {
  if (!model.includes(marker)) fail(`accountAccessModel.js missing marker: ${marker}`)
}
for (const marker of ['loadAccountDashboard', 'clearMyOriginalPredictions', 'saveMyPredictionBundle', 'predictions: []']) {
  if (!service.includes(marker)) fail(`accountAccessService.js missing marker: ${marker}`)
}
for (const marker of ['Keep your predictions from this device?', 'Keep these predictions', 'Start fresh']) {
  if (!guestModel.includes(marker)) fail(`guestAccountTransferModel.js missing corrected copy marker: ${marker}`)
}
for (const marker of ['asDialog', 'Dialog', 'onComplete']) {
  if (!guest.includes(marker)) fail(`GuestAccountTransfer.jsx missing modal marker: ${marker}`)
}
if ((account + dashboard).includes('<GuestAccountTransfer client={client} reference={reference} userId={session.user.id} />')) {
  fail('GuestAccountTransfer must not render as a persistent signed-in Account card')
}
if (!app.includes('lifecycle={lifecycle}') || !app.includes('tournament={appData.tournament}')) {
  fail('App.jsx must pass lifecycle/tournament into AccountAccess')
}
for (const marker of ['Stage 13G-ACCOUNT-1', 'Clear my predictions', 'No Migration 019']) {
  if (!doc.includes(marker)) fail(`Account stage doc missing marker: ${marker}`)
}
if (packageJson.scripts['audit:stage13g-account-destination'] !== 'node scripts/check-stage13g-account-destination.mjs') {
  fail('package.json missing audit:stage13g-account-destination script')
}
if (!packageJson.scripts.check.includes('npm run audit:stage13g-account-destination')) {
  fail('npm run check must include audit:stage13g-account-destination')
}
if (!packageJson.scripts['lint:foundation'].includes('scripts/check-stage13g-account-destination.mjs')) {
  fail('lint:foundation must include account destination audit script')
}
const migrationFiles = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(name => name.endsWith('.sql'))
if (migrationSequenceError(migrationFiles)) fail(migrationSequenceError(migrationFiles))

if (errors.length) {
  console.error('Euro Stage 13G-ACCOUNT-1 audit failed:')
  errors.forEach(error => console.error(`- ${error}`))
  process.exit(1)
}

console.log('Euro Stage 13G-ACCOUNT-1 account destination audit passed.')
console.log('Account: signed-in destination has identity, quick stats, security, leagues and danger-zone sections.')
console.log('Guest transfer: one-time post sign-in/sign-up dialog with keep/start-fresh copy.')
console.log('Clear predictions: Original-only reset is hidden after central lock and uses existing atomic save boundary.')
console.log(`Database: ${migrationFiles.length} active migrations, sequentially numbered with no gaps.`)
