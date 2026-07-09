import { migrationSequenceError } from './lib/migrationSequenceGuard.mjs'
// STAGE-MORE-ACCOUNT-TRUST-1 audit — More, Account and Trust contract.
//
// This guard is intentionally docs/audit-only. It verifies that More, Account,
// Support, Privacy/Data, About and signup-gate trust copy are recorded without
// introducing runtime UI, route, Auth, Supabase, scoring, resolver, result-entry
// or migration changes.
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const errors = []
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const exists = file => fs.existsSync(path.join(root, file))
const has = (file, marker) => exists(file) && read(file).includes(marker)
const requireText = (file, marker, reason) => {
  if (!exists(file)) {
    errors.push(`${file} is missing — ${reason}.`)
    return
  }
  if (!has(file, marker)) errors.push(`${file} must record "${marker}" — ${reason}.`)
}

const stageDoc = 'docs/archive/STAGE-MORE-ACCOUNT-TRUST-1.md'
const contractDoc = 'docs/MORE-ACCOUNT-TRUST-CONTRACT.md'
const register = 'docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md'
const ledger = 'docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md'
const agentRules = 'docs/EURO28-AGENT-RULES-AND-ROADMAP.md'
const roadmap = 'docs/PRODUCT-COMPLETENESS-ROADMAP.md'
const batchOrder = 'docs/archive/STREAMLINED-BATCH-ORDER.md'
const pkgFile = 'package.json'

for (const file of [stageDoc, contractDoc, register, ledger, agentRules, roadmap, batchOrder, pkgFile]) {
  if (!exists(file)) errors.push(`${file} is missing.`)
}

const trustMarkers = [
  'More menu information architecture',
  'Support route/content',
  'Privacy and data wording',
  'Settings placement',
  'About page/content',
  'Account request/delete wording',
  'signup gate copy',
  'admin-only link visibility',
  'public signup remains closed until implementation gates are complete',
]
for (const marker of trustMarkers) {
  requireText(stageDoc, marker, 'stage doc must lock the More/Account/Trust target')
  requireText(contractDoc, marker, 'contract doc must preserve the More/Account/Trust target')
}

const iaMarkers = [
  'How to Play / Rules',
  'Tournament information',
  'Account and settings',
  'Support',
  'Privacy and data',
  'About Euro 2028 Predictor',
  'Admin control room, visible only to authorised administrators',
]
for (const marker of iaMarkers) {
  requireText(stageDoc, marker, 'More menu IA must be recorded')
  requireText(contractDoc, marker, 'More menu IA must be recorded')
}

const boundaryMarkers = [
  'guest predictions are browser-only and unscored',
  'signed-in predictions are stored against the user account',
  'Original Predictor and KO Predictor evidence remains competition-scoped',
  'contact-admin/request wording',
  'Clearing guest/browser predictions and requesting account deletion are different behaviours',
  'must not imply official UEFA endorsement',
  'Hiding the link is not the security boundary',
  'no Migration 019',
  'no Auth configuration change',
]
for (const marker of boundaryMarkers) {
  requireText(contractDoc, marker, 'trust/account boundary must be explicit')
}

for (const file of [register, ledger, agentRules, roadmap, batchOrder]) {
  requireText(file, 'STAGE-MORE-ACCOUNT-TRUST-1', 'live docs must record the More/Account/Trust stage')
  requireText(file, 'Support route/content', 'live docs must carry support contract wording')
  requireText(file, 'admin-only link visibility', 'live docs must carry admin link visibility requirement')
  requireText(file, 'Public signup remains closed', 'live docs must preserve closed signup state')
  requireText(file, 'Migration 019', 'live docs must preserve migration boundary')
}

const pkg = JSON.parse(read(pkgFile))
if (pkg.scripts?.['audit:more-account-trust'] !== 'node scripts/check-stage-more-account-trust.mjs') {
  errors.push('audit:more-account-trust is not wired to scripts/check-stage-more-account-trust.mjs')
}
if (!pkg.scripts?.check?.includes('npm run audit:more-account-trust')) {
  errors.push('npm run check does not include audit:more-account-trust')
}
if (!pkg.scripts?.['lint:foundation']?.includes('scripts/check-stage-more-account-trust.mjs')) {
  errors.push('lint:foundation does not include scripts/check-stage-more-account-trust.mjs')
}

const migrationsDir = path.join(root, 'supabase/migrations')
const migrations = fs.readdirSync(migrationsDir).filter(name => name.endsWith('.sql'))
if (migrationSequenceError(migrations)) errors.push(migrationSequenceError(migrations))

if (errors.length > 0) {
  console.error(`STAGE-MORE-ACCOUNT-TRUST-1 audit failed with ${errors.length} issue(s):\n`)
  for (const error of errors) console.error(`  - ${error}`)
  process.exit(1)
}

console.log('Stage STAGE-MORE-ACCOUNT-TRUST-1 audit passed.')
console.log('Trust: More IA, Support, Privacy/Data, Settings, About, account requests, signup gates and admin-only links recorded.')
console.log('Safety: docs/audit-only; no runtime UI, route, Auth, Supabase, scoring, resolver, result-entry or migration change.')
console.log(`Database: ${migrations.length} active migrations, sequentially numbered with no gaps.`)
