import { migrationSequenceError } from './lib/migrationSequenceGuard.mjs'
// STAGE-ADMIN-OPS-TRUST-1 audit — Admin operations trust contract.
//
// This guard is intentionally docs/audit-only. It verifies that admin trust
// wording, result-entry guardrails, correction/recalculation audit explanation,
// role clarity, dangerous-action wording and simulation separation are recorded
// without introducing runtime UI, route, Auth, Supabase, scoring, resolver,
// result-entry, fake-result write or migration changes.
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

const stageDoc = 'docs/archive/STAGE-ADMIN-OPS-TRUST-1.md'
const contractDoc = 'docs/ADMIN-OPS-TRUST-CONTRACT.md'
const register = 'docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md'
const ledger = 'docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md'
const agentRules = 'docs/EURO28-AGENT-RULES-AND-ROADMAP.md'
const roadmap = 'docs/PRODUCT-COMPLETENESS-ROADMAP.md'
const batchOrder = 'docs/STREAMLINED-BATCH-ORDER.md'
const pkgFile = 'package.json'

for (const file of [stageDoc, contractDoc, register, ledger, agentRules, roadmap, batchOrder, pkgFile]) {
  if (!exists(file)) errors.push(`${file} is missing.`)
}

const trustMarkers = [
  'admin control-room trust wording',
  'result-entry guardrails',
  'correction/recalculation audit explanation',
  'fixture schedule/edit trust wording',
  'admin roles explanation',
  'fake/simulated scenario separation',
  'owner-only dangerous action wording',
  'operation history clarity',
  'public/admin trust boundaries',
  'public signup remains closed until implementation gates are complete',
]
for (const marker of trustMarkers) {
  requireText(stageDoc, marker, 'stage doc must lock the admin ops trust target')
  requireText(contractDoc, marker, 'contract doc must preserve the admin ops trust target')
}

const roleMarkers = [
  'ordinary signed-in member',
  'results administrator',
  'owner/admin with elevated control-room actions',
  'public/guest user with no admin capability',
  'Hiding a link is not the security boundary',
]
for (const marker of roleMarkers) {
  requireText(contractDoc, marker, 'admin role and security boundary must be explicit')
}

const operationMarkers = [
  'what changed',
  'who ran the operation',
  'when it ran',
  'Original Predictor points were recalculated',
  'KO Predictor points were recalculated',
  'leaderboards are fresh, recalculation pending or recalculation complete',
  'before/after evidence',
  'notes/reason',
  'affected competition',
]
for (const marker of operationMarkers) {
  requireText(contractDoc, marker, 'operation history and recalculation explanation must be explicit')
}

const safetyMarkers = [
  'Admin Scenario Runner output, fake scores, synthetic seed runs and simulated results',
  'never be confused with official results',
  'never award real points',
  'never pollute production',
  'never write to canonical official results',
  'Original Predictor and KO Predictor are separate competitions',
  'no Migration 019',
  'No Migration 019 is created',
]
for (const marker of safetyMarkers) {
  requireText(contractDoc, marker, 'admin operations trust safety boundary must be explicit')
}

for (const file of [register, ledger, agentRules, roadmap, batchOrder]) {
  requireText(file, 'STAGE-ADMIN-OPS-TRUST-1', 'live docs must record the Admin Ops Trust stage')
  requireText(file, 'admin control-room trust wording', 'live docs must carry control-room trust wording')
  requireText(file, 'result-entry guardrails', 'live docs must carry result-entry guardrails')
  requireText(file, 'correction/recalculation audit explanation', 'live docs must carry recalculation audit wording')
  requireText(file, 'fake/simulated scenario separation', 'live docs must carry simulation separation wording')
  requireText(file, 'Public signup remains closed', 'live docs must preserve closed signup state')
  requireText(file, 'Migration 019', 'live docs must preserve migration boundary')
}

const pkg = JSON.parse(read(pkgFile))
if (pkg.scripts?.['audit:admin-ops-trust'] !== 'node scripts/check-stage-admin-ops-trust.mjs') {
  errors.push('audit:admin-ops-trust is not wired to scripts/check-stage-admin-ops-trust.mjs')
}
if (!pkg.scripts?.check?.includes('npm run audit:admin-ops-trust')) {
  errors.push('npm run check does not include audit:admin-ops-trust')
}
if (!pkg.scripts?.['lint:foundation']?.includes('scripts/check-stage-admin-ops-trust.mjs')) {
  errors.push('lint:foundation does not include scripts/check-stage-admin-ops-trust.mjs')
}

const migrationsDir = path.join(root, 'supabase/migrations')
const migrations = fs.readdirSync(migrationsDir).filter(name => name.endsWith('.sql'))
if (migrationSequenceError(migrations)) errors.push(migrationSequenceError(migrations))

if (errors.length > 0) {
  console.error(`STAGE-ADMIN-OPS-TRUST-1 audit failed with ${errors.length} issue(s):\n`)
  for (const error of errors) console.error(`  - ${error}`)
  process.exit(1)
}

console.log('Stage STAGE-ADMIN-OPS-TRUST-1 audit passed.')
console.log('Trust: admin wording, result-entry guardrails, correction/recalculation audit, roles, dangerous actions and simulation separation recorded.')
console.log('Safety: docs/audit-only; no runtime UI, route, Auth, Supabase, scoring, resolver, result-entry, fake-result write or migration change.')
console.log(`Database: ${migrations.length} active migrations, sequentially numbered with no gaps.`)
