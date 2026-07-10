import { migrationSequenceError } from './lib/migrationSequenceGuard.mjs'
import fs from 'node:fs'
import path from 'node:path'
import { ACTIVE_UI_ROOTS, FOUNDATION_CLASS_RATCHET_CAP } from './architecture-policy.mjs'
import { allowanceFor, countNativeControls } from './lib/nativeControlPolicy.mjs'

const root = process.cwd()
const fail = message => { console.error(message); process.exit(1) }
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const sourceExtensions = new Set(['.js', '.jsx', '.css'])

function listFiles(dir) {
  const absolute = path.join(root, dir)
  if (!fs.existsSync(absolute)) return []
  const entries = fs.readdirSync(absolute, { withFileTypes: true })
  return entries.flatMap(entry => {
    const relative = path.join(dir, entry.name)
    if (entry.isDirectory()) return listFiles(relative)
    if (!sourceExtensions.has(path.extname(entry.name))) return []
    return [relative]
  })
}

const activeFiles = ACTIVE_UI_ROOTS.flatMap(listFiles)
const activeText = activeFiles.map(file => [file, read(file)])
const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(file => file.endsWith('.sql')).sort()

if (migrationSequenceError(migrations)) fail(migrationSequenceError(migrations))

// Native selects and browser confirms score against the shared ratchet in
// lib/nativeControlPolicy.mjs rather than a local exemption list, so this audit
// and check-native-controls.mjs can never disagree about what is allowed.
// (The regex replaced here carried a stray backspace control character, which
// made its `<select` branch dead — only `</select>` ever matched, so a
// self-closing `<select {...props} />` was invisible to it.)
const aboveAllowance = controlId =>
  activeText.filter(([file, text]) => (countNativeControls(text)[controlId] ?? 0) > allowanceFor(file, controlId))

const nativeSelectViolations = aboveAllowance('select')
if (nativeSelectViolations.length) fail(`Native select elements above the native-control ratchet: ${nativeSelectViolations.map(([file]) => file).join(', ')}`)

const confirmViolations = aboveAllowance('dialog')
if (confirmViolations.length) fail(`Native confirmation calls outside ConfirmDialog: ${confirmViolations.map(([file]) => file).join(', ')}`)

const manualRefreshViolations = activeText.filter(([, text]) => /Refresh control room|Refresh league|>Refresh<|Refreshing…/.test(text))
if (manualRefreshViolations.length) fail(`Manual refresh controls remain outside retry states: ${manualRefreshViolations.map(([file]) => file).join(', ')}`)

const adminOperations = read('src/admin/AdminOperations.jsx')
if (!adminOperations.includes('pendingConfirmation')) fail('Admin operations must route high-impact actions through shared confirmation state')
if (!adminOperations.includes('<ConfirmDialog')) fail('Admin operations must render the shared ConfirmDialog primitive')

const adminSections = read('src/admin/AdminControlRoomSections.jsx')
if (!adminSections.includes('Apply irreversible Original Predictor lock?')) fail('Irreversible global lock must require a shared confirmation dialog')
if (!adminSections.includes('Revoke grace for')) fail('Grace revocation must require a shared confirmation dialog')
if (!adminSections.includes('database-enforced feature control')) fail('Feature-control changes must require shared confirmation copy')

const scoringRecovery = read('src/admin/AdminScoringRecovery.jsx')
if (!scoringRecovery.includes('Reconcile all tournament points?')) fail('Whole-tournament scoring reconciliation must require a shared confirmation dialog')

const refreshPolicy = read('src/runtime/refreshPolicy.js')
if (!refreshPolicy.includes('manualButton: false')) fail('Refresh policy must continue to disallow manual refresh buttons by default')

const foundationCount = activeText.reduce((total, [, text]) => total + (text.match(/foundation-/g) ?? []).length, 0)
if (foundationCount > FOUNDATION_CLASS_RATCHET_CAP) fail(`foundation-* usage increased above ratchet cap: ${foundationCount}/${FOUNDATION_CLASS_RATCHET_CAP}`)

const packageJson = JSON.parse(read('package.json'))
if (!packageJson.scripts['audit:interaction-enforcement']) fail('audit:interaction-enforcement script is not registered')
if (!packageJson.scripts.check.includes('npm run audit:interaction-enforcement')) fail('npm run check must include the interaction-enforcement audit')

console.log('Stage 13G-A interaction enforcement audit passed.')
console.log('Native active-surface selects: within the native-control ratchet')
console.log('Native confirmation calls: 0 outside ConfirmDialog')
console.log('Manual refresh controls: 0 outside retry states')
console.log(`foundation-* ratchet: ${foundationCount}/${FOUNDATION_CLASS_RATCHET_CAP}`)
console.log(`Active migrations: ${migrations.length}`)
console.log(`Latest migration: ${migrations.at(-1)}`)
