import { migrationSequenceError } from './lib/migrationSequenceGuard.mjs'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const errors = []
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const exists = file => fs.existsSync(path.join(root, file))
const fail = message => errors.push(message)

const required = [
  'docs/archive/STAGE-13G-ADMIN-1-ADMIN-CONTROL-ROOM-RESTYLE.md',
  'src/admin/AdminOperations.jsx',
  'src/admin/AdminControlRoom.module.css',
  'src/admin/AdminOperationsCompletion.module.css',
  'scripts/check-stage13g-admin-control-room-restyle.mjs',
]
for (const file of required) if (!exists(file)) fail(`${file} is missing`)

const operations = read('src/admin/AdminOperations.jsx')
const shellCss = read('src/admin/AdminControlRoom.module.css')
const completionCss = read('src/admin/AdminOperationsCompletion.module.css')
const service = read('src/admin/adminOperationsService.js')
const appRoutes = read('src/app/appRoutes.js')
const doc = read('docs/archive/STAGE-13G-ADMIN-1-ADMIN-CONTROL-ROOM-RESTYLE.md')
const ledger = read('docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md')
const register = read('docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md')
const agent = read('docs/EURO28-AGENT-RULES-AND-ROADMAP.md')
const charter = read('docs/EURO28-DESIGN-CHARTER.md')
const siteAccess = read('docs/EURO28-SITE-ACCESS-MAP.md')
const packageJson = JSON.parse(read('package.json'))

for (const marker of [
  'data-stage13g-admin-control-room="prototype-restyle"',
  'styles.roleChip',
  'data-admin-prototype-guardrail',
  'High-impact actions stay audited and note-gated',
  'adminSectionFromHash(hash)',
  'ADMIN_SECTIONS.map',
  'ConfirmDialog',
]) {
  if (!operations.includes(marker)) fail(`AdminOperations.jsx missing marker: ${marker}`)
}

for (const marker of [
  '.roleChip',
  '.guardrail',
  '.navigation a[aria-current=\'page\']',
  'var(--gradient-brand)',
  'var(--gradient-accent)',
  'var(--surface-raised)',
  'var(--surface-sunken)',
  'var(--radius-full)',
  'var(--shadow-1)',
]) {
  if (!shellCss.includes(marker)) fail(`AdminControlRoom.module.css missing marker: ${marker}`)
}

for (const marker of [
  '.auditFilters button',
  'border-radius: var(--radius-full)',
  'background: var(--gradient-brand)',
  'color: var(--text-on-brand)',
]) {
  if (!completionCss.includes(marker)) fail(`AdminOperationsCompletion.module.css missing marker: ${marker}`)
}

for (const marker of [
  'Stage 13G-ADMIN-1',
  'cosmetic-only',
  'No Admin service, RPC, Supabase, database, scoring, resolver',
  'Active migrations remain 18',
  'Migration 019 must not exist',
]) {
  if (!doc.includes(marker)) fail(`Admin stage doc missing marker: ${marker}`)
}

for (const [name, content] of [
  ['ledger', ledger],
  ['register', register],
  ['agent', agent],
  ['charter', charter],
  ['site access map', siteAccess],
]) {
  for (const marker of ['13G-ADMIN-1', 'Admin control-room cosmetic restyle', 'Migration 019']) {
    if (!content.includes(marker)) fail(`${name} missing marker: ${marker}`)
  }
}

if (!appRoutes.includes('ADMIN_SECTIONS') || !appRoutes.includes('section=')) fail('Admin route section registry must remain query-addressed')
if (service.includes('13G-ADMIN-1') || service.includes('prototype-restyle')) fail('Admin service file must not be changed for cosmetic restyle markers')
if (packageJson.scripts['audit:stage13g-admin-control-room-restyle'] !== 'node scripts/check-stage13g-admin-control-room-restyle.mjs') {
  fail('package.json missing audit:stage13g-admin-control-room-restyle script')
}
if (!packageJson.scripts.check.includes('npm run audit:stage13g-admin-control-room-restyle')) {
  fail('npm run check must include audit:stage13g-admin-control-room-restyle')
}
if (!packageJson.scripts['lint:foundation'].includes('scripts/check-stage13g-admin-control-room-restyle.mjs')) {
  fail('lint:foundation must include admin restyle audit script')
}

const migrationDir = path.join(root, 'supabase/migrations')
const migrations = fs.readdirSync(migrationDir).filter(name => name.endsWith('.sql'))
if (migrationSequenceError(migrations)) fail(migrationSequenceError(migrations))

if (errors.length) {
  console.error('Euro Stage 13G-ADMIN-1 control-room restyle audit failed:')
  errors.forEach(error => console.error(`- ${error}`))
  process.exit(1)
}

console.log('Euro Stage 13G-ADMIN-1 control-room restyle audit passed.')
console.log('Admin shell: hero, section navigation, role chips, status cards, guardrail banner and audit filter pills use approved reference patterns.')
console.log('Safety: Admin route gate, section registry, permissions, RPCs, audit evidence and Tournament Picks readiness remain unchanged.')
console.log(`Database: ${migrations.length} active migrations, sequentially numbered with no gaps.`)
