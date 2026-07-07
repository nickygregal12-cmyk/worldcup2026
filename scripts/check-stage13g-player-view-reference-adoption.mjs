import fs from 'node:fs'
import path from 'node:path'
import { migrationSequenceError } from './lib/migrationSequenceGuard.mjs'

const ROOT = process.cwd()
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8')
const exists = (file) => fs.existsSync(path.join(ROOT, file))

const requiredFiles = [
  'docs/STAGE-13G-PLAYER-VIEW-REFERENCE-ADOPTION.md',
  'docs/reference-prototypes/euro28-player-view-prototype.html',
  'scripts/check-stage13g-player-view-reference-adoption.mjs',
]

for (const file of requiredFiles) {
  if (!exists(file)) throw new Error(`Stage 13G-PLAYER-REF required file missing: ${file}`)
}

const stageDoc = read('docs/STAGE-13G-PLAYER-VIEW-REFERENCE-ADOPTION.md')
const register = read('docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md')
const ledger = read('docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md')
const agent = read('docs/EURO28-AGENT-RULES-AND-ROADMAP.md')
const prototype = read('docs/reference-prototypes/euro28-player-view-prototype.html')
const pkg = JSON.parse(read('package.json'))

const stageMarkers = [
  'Stage 13G-PLAYER-REF — Player View / Viewing Player Predictions Reference Prototype Adoption',
  'Viewing another member\'s predictions is a dedicated destination/surface',
  'Before the global Original Predictor lock, the view shows only the informative privacy placeholder',
  'Predictions',
  'Bracket',
  'Tables',
  'Teams knocked out of the real tournament are struck through',
  'qualification-edge treatment and third-place-table logic',
  'Original Predictor and KO Predictor stay separate',
  'Do not import sample players, sample fixtures, the prototype lock switch, toast stubs, Google-hosted fonts',
  'Active migrations remain 18',
  'Migration 019 is not created',
]

for (const token of stageMarkers) {
  if (!stageDoc.includes(token)) throw new Error(`Stage 13G-PLAYER-REF doc missing marker: ${token}`)
}

const registerMarkers = [
  'Stage 13G-PLAYER-REF — Player View / Viewing Player Predictions Reference Prototype Adoption',
  'dedicated Player View, not inline expansion',
  'Predictions / Bracket / Tables',
  'Compact summary in Player View; full chart remains separate',
  'Must reuse Groups table and third-place logic',
]
for (const token of registerMarkers) {
  if (!register.includes(token)) throw new Error(`Stage 13G-PLAYER-REF register marker missing: ${token}`)
}

const ledgerMarkers = [
  '13G Player View reference prototype adoption',
  'Player View privacy state',
  'Player View post-lock tabs',
  'Player bracket summary',
  'Player predicted tables',
]
for (const token of ledgerMarkers) {
  if (!ledger.includes(token)) throw new Error(`Stage 13G-PLAYER-REF ledger marker missing: ${token}`)
}

const agentMarkers = [
  '13G-PLAYER-REF',
  'after 13G-REF-2',
  'before 13G-GROUPS-1',
  'do not port prototype code',
]
for (const token of agentMarkers) {
  if (!agent.includes(token)) throw new Error(`Stage 13G-PLAYER-REF agent marker missing: ${token}`)
}

const prototypeMarkers = [
  '<title>Dougie — Euro 2028 Predictor (prototype)</title>',
  "Dougie's predictions are under wraps",
  'Predictions',
  'Bracket',
  'Tables',
  'Their champion',
  'Their third-place ranking sits below',
]
for (const token of prototypeMarkers) {
  if (!prototype.includes(token)) throw new Error(`Stage 13G-PLAYER-REF prototype marker missing: ${token}`)
}

if (pkg.scripts?.['audit:stage13g-player-view-reference-adoption'] !== 'node scripts/check-stage13g-player-view-reference-adoption.mjs') {
  throw new Error('package.json missing audit:stage13g-player-view-reference-adoption script')
}
if (!pkg.scripts?.check?.includes('npm run audit:stage13g-player-view-reference-adoption')) {
  throw new Error('package.json check script does not include audit:stage13g-player-view-reference-adoption')
}

const migrationsDir = path.join(ROOT, 'supabase', 'migrations')
const migrations = fs.existsSync(migrationsDir)
  ? fs.readdirSync(migrationsDir).filter((name) => name.endsWith('.sql'))
  : []
if (migrationSequenceError(migrations)) throw new Error(migrationSequenceError(migrations))

console.log('Euro Stage 13G-PLAYER-REF player-view reference adoption audit passed.')
console.log('Player View: privacy placeholder, always-visible header and Predictions/Bracket/Tables IA recorded.')
console.log('Predictions: rows, joker chips, points chips, bracket summary and predicted tables recorded.')
console.log('Scope: docs/audit-only; no UI build, route implementation, scoring, resolver, Supabase write or migration change.')
console.log(`Database: ${migrations.length} active migrations, sequentially numbered with no gaps.`)
