import { migrationSequenceError } from './lib/migrationSequenceGuard.mjs'
// STAGE-PUBLIC-SIGNUP-OPENING-GATE-1 audit — final written gate before opening public signup.
//
// This guard is intentionally docs/audit-only. It verifies that the final
// pre-open checklist, explicit owner approval, external account-setting checks,
// capacity, support/contact readiness and display-name moderation confirmation
// are recorded without opening public registration or changing runtime/Auth/
// Supabase/scoring/resolver/league-write/migration behaviour.
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { buildPublicSignupReadiness } from '../src/auth/publicSignupReadiness.js'

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

const stageDoc = 'docs/archive/STAGE-PUBLIC-SIGNUP-OPENING-GATE-1.md'
const contractDoc = 'docs/PUBLIC-SIGNUP-OPENING-GATE-CONTRACT.md'
const register = 'docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md'
const ledger = 'docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md'
const agentRules = 'docs/EURO28-AGENT-RULES-AND-ROADMAP.md'
const roadmap = 'docs/PRODUCT-COMPLETENESS-ROADMAP.md'
const batchOrder = 'docs/archive/STREAMLINED-BATCH-ORDER.md'
const pkgFile = 'package.json'

for (const file of [stageDoc, contractDoc, register, ledger, agentRules, roadmap, batchOrder, pkgFile]) {
  if (!exists(file)) errors.push(`${file} is missing.`)
}

const readiness = buildPublicSignupReadiness()
if (readiness.isOpenForPublic !== false) errors.push('The central readiness model must keep wider public registration closed in this gate.')
if (readiness.implementation?.publicRegistrationOpened !== false) errors.push('Implementation status must keep the public opening flag false in this gate.')
if (readiness.ownerDecisions?.moderation?.clientPreAuthGuardImplemented !== true) errors.push('Display-name moderation must remain recorded as implemented before this opening gate can pass.')
if (readiness.ownerDecisions?.initialCapacity?.userCap !== 50) errors.push('The recorded public signup user capacity guardrail must be 50 after the external settings replacement decision.')
if (readiness.ownerDecisions?.initialCapacity?.leagueCap !== 20) errors.push('The recorded public signup league capacity guardrail must remain 20 unless replaced by an owner decision.')

const gateMarkers = [
  'final pre-open checklist for public signup',
  'visible “registration still closed / opening soon” state',
  'explicit owner approval requirement before opening registration',
  'confirmation that email confirmation is ON',
  'confirmation redirect URLs are correct',
  'confirmation capacity limits are acceptable',
  'confirmation support/contact route is ready',
  'confirmation display-name moderation is active',
  'no Supabase Auth dashboard/config change in the patch',
  'public registration remains closed',
  'No Migration 019',
]
for (const marker of gateMarkers) {
  requireText(stageDoc, marker, 'stage doc must lock the final public signup opening gate')
  requireText(contractDoc, marker, 'contract doc must preserve the final public signup opening gate')
}

const checklistMarkers = [
  'Email confirmation is ON',
  'return URLs point to the Euro 2028 development or launch deployment, not WC26',
  'support/contact route is ready for public users',
  '50 users and 20 leagues before the branded email sender is added',
  'Display-name moderation is active before the account is created',
  'display-name availability check remains before account creation',
  'Privacy wording is conservative',
  'owner has explicitly approved the public opening step',
]
for (const marker of checklistMarkers) requireText(stageDoc, marker, 'pre-open checklist must be explicit')

const safetyMarkers = [
  'does not open public registration',
  'does not alter external Auth settings',
  'does not create users',
  'does not write profile rows',
  'does not seed predictions',
  'does not write league data',
  'does not publish service-role credentials',
  'No runtime UI, route, Auth configuration, Supabase schema, RPC, RLS, service-role, browser write, scoring, resolver, result-entry, fake-result write, league-write or migration change is included',
  'Active migrations remain 18',
  'Migration 019 is not created',
]
for (const marker of safetyMarkers) requireText(stageDoc, marker, 'stage safety boundary must be explicit')

for (const file of [register, ledger, agentRules, roadmap, batchOrder]) {
  requireText(file, 'STAGE-PUBLIC-SIGNUP-OPENING-GATE-1', 'live docs must record the Public Signup Opening Gate stage')
  requireText(file, 'final pre-open checklist for public signup', 'live docs must carry the opening checklist marker')
  requireText(file, 'visible “registration still closed / opening soon” state', 'live docs must carry the visible closed/opening-soon marker')
  requireText(file, 'explicit owner approval requirement before opening registration', 'live docs must carry owner approval requirement')
  requireText(file, 'confirmation that email confirmation is ON', 'live docs must carry email confirmation marker')
  requireText(file, 'confirmation redirect URLs are correct', 'live docs must carry redirect marker')
  requireText(file, 'confirmation capacity limits are acceptable', 'live docs must carry capacity marker')
  requireText(file, 'confirmation support/contact route is ready', 'live docs must carry support route marker')
  requireText(file, 'confirmation display-name moderation is active', 'live docs must carry moderation marker')
  requireText(file, 'public registration remains closed', 'live docs must preserve the closed signup state')
  requireText(file, 'Migration 019', 'live docs must preserve migration boundary')
}

const pkg = JSON.parse(read(pkgFile))
if (pkg.scripts?.['audit:public-signup-opening-gate'] !== 'node scripts/check-stage-public-signup-opening-gate.mjs') {
  errors.push('audit:public-signup-opening-gate is not wired to scripts/check-stage-public-signup-opening-gate.mjs')
}
if (!pkg.scripts?.check?.includes('npm run audit:public-signup-opening-gate')) {
  errors.push('npm run check does not include audit:public-signup-opening-gate')
}
if (!pkg.scripts?.['lint:foundation']?.includes('scripts/check-stage-public-signup-opening-gate.mjs')) {
  errors.push('lint:foundation does not include scripts/check-stage-public-signup-opening-gate.mjs')
}

const migrationsDir = path.join(root, 'supabase/migrations')
const migrations = fs.readdirSync(migrationsDir).filter(name => name.endsWith('.sql'))
if (migrationSequenceError(migrations)) errors.push(migrationSequenceError(migrations))

if (errors.length > 0) {
  console.error(`STAGE-PUBLIC-SIGNUP-OPENING-GATE-1 audit failed with ${errors.length} issue(s):\n`)
  for (const error of errors) console.error(`  - ${error}`)
  process.exit(1)
}

console.log('Stage STAGE-PUBLIC-SIGNUP-OPENING-GATE-1 audit passed.')
console.log('Signup: final pre-open checklist, owner approval, email, redirect, capacity, support and moderation confirmations recorded.')
console.log('Safety: docs/audit-only; public registration remains closed with no Auth config, Supabase, scoring, resolver, fake-result, league-write or migration change.')
console.log(`Database: ${migrations.length} active migrations, sequentially numbered with no gaps.`)
