// STAGE-PUBLIC-SIGNUP-CONTROLLED-OPEN-1 audit — controlled public signup opening runbook.
//
// This guard is intentionally docs/audit-only. It verifies that the owner
// approval runbook, external account-setting checks, capacity, support/contact
// readiness and moderation checks are recorded without opening public
// registration or changing runtime/Auth/Supabase/scoring/resolver/league-write/
// migration behaviour.
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

const stageDoc = 'docs/STAGE-PUBLIC-SIGNUP-CONTROLLED-OPEN-1.md'
const contractDoc = 'docs/PUBLIC-SIGNUP-CONTROLLED-OPEN-CONTRACT.md'
const register = 'docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md'
const ledger = 'docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md'
const agentRules = 'docs/EURO28-AGENT-RULES-AND-ROADMAP.md'
const roadmap = 'docs/PRODUCT-COMPLETENESS-ROADMAP.md'
const batchOrder = 'docs/STREAMLINED-BATCH-ORDER.md'
const pkgFile = 'package.json'

for (const file of [stageDoc, contractDoc, register, ledger, agentRules, roadmap, batchOrder, pkgFile]) {
  if (!exists(file)) errors.push(`${file} is missing.`)
}

const readiness = buildPublicSignupReadiness()
if (readiness.isOpenForPublic !== false) errors.push('The central readiness model must keep wider public registration closed in this controlled-open runbook stage.')
if (readiness.implementation?.publicRegistrationOpened !== false) errors.push('Implementation status must keep the public opening flag false in this controlled-open runbook stage.')
if (readiness.ownerDecisions?.moderation?.clientPreAuthGuardImplemented !== true) errors.push('Display-name moderation must remain implemented before this controlled-open runbook can pass.')
if (readiness.ownerDecisions?.initialCapacity?.userCap !== 50) errors.push('The recorded public signup user capacity guardrail must be 50 after the external settings replacement decision.')
if (readiness.ownerDecisions?.initialCapacity?.leagueCap !== 20) errors.push('The recorded public signup league capacity guardrail must remain 20 unless replaced by an owner decision.')

const controlledOpenMarkers = [
  'controlled public signup opening runbook',
  'owner approval must be explicit, current and recorded',
  'opening-gate checklist must be satisfied before any public opening',
  'email confirmation must be checked in the external account settings',
  'account redirect URLs must return to the Euro 2028 app, not WC26',
  'display-name moderation remains before account creation',
  'display-name availability remains before account creation',
  'support/contact route remains visible for public users',
  'initial capacity is replaced by the external settings check: 50 users and 20 leagues before branded email sending, then 100 users after email delivery is reviewed',
  'public registration remains closed until the owner completes the external opening action',
  'no Supabase Auth dashboard/config change in the patch',
  'No Migration 019',
]
for (const marker of controlledOpenMarkers) {
  requireText(stageDoc, marker, 'stage doc must lock the controlled public signup opening runbook')
  requireText(contractDoc, marker, 'contract doc must preserve the controlled public signup opening runbook')
}

const runbookMarkers = [
  'Confirm the Euro 2028 deployment that will receive public users',
  'Confirm email confirmation is enabled for public account creation',
  'Confirm sign-up, sign-in and password-recovery redirects return to the Euro 2028 app and do not point at WC26',
  'Confirm the support/contact route is visible from public-facing help or rules surfaces',
  'Confirm display-name moderation blocks abusive, discriminatory and inflammatory names before account creation',
  'Confirm display-name availability is checked before account creation',
  'Confirm the first opening remains within 50 users and 20 leagues before the branded email sender is added',
  'Confirm no service-role key, admin secret or private credential is exposed to the browser',
  'Confirm WC26 production remains blocked',
  'Record explicit owner approval for the opening action',
]
for (const marker of runbookMarkers) requireText(stageDoc, marker, 'controlled opening runbook must be explicit')

const safetyMarkers = [
  'Public registration remains closed in this stage',
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
  requireText(file, 'STAGE-PUBLIC-SIGNUP-CONTROLLED-OPEN-1', 'live docs must record the Public Signup Controlled Open stage')
  requireText(file, 'controlled public signup opening runbook', 'live docs must carry the controlled-open marker')
  requireText(file, 'owner approval must be explicit, current and recorded', 'live docs must carry owner approval marker')
  requireText(file, 'opening-gate checklist must be satisfied before any public opening', 'live docs must carry opening-gate checklist marker')
  requireText(file, 'email confirmation must be checked in the external account settings', 'live docs must carry email confirmation marker')
  requireText(file, 'account redirect URLs must return to the Euro 2028 app, not WC26', 'live docs must carry redirect marker')
  requireText(file, 'display-name moderation remains before account creation', 'live docs must carry moderation marker')
  requireText(file, 'display-name availability remains before account creation', 'live docs must carry availability marker')
  requireText(file, 'support/contact route remains visible for public users', 'live docs must carry support route marker')
  requireText(file, 'initial capacity is replaced by the external settings check: 50 users and 20 leagues before branded email sending, then 100 users after email delivery is reviewed', 'live docs must carry capacity marker')
  requireText(file, 'public registration remains closed until the owner completes the external opening action', 'live docs must preserve the closed signup state')
  requireText(file, 'Migration 019', 'live docs must preserve migration boundary')
}

const pkg = JSON.parse(read(pkgFile))
if (pkg.scripts?.['audit:public-signup-controlled-open'] !== 'node scripts/check-stage-public-signup-controlled-open.mjs') {
  errors.push('audit:public-signup-controlled-open is not wired to scripts/check-stage-public-signup-controlled-open.mjs')
}
if (!pkg.scripts?.check?.includes('npm run audit:public-signup-controlled-open')) {
  errors.push('npm run check does not include audit:public-signup-controlled-open')
}
if (!pkg.scripts?.['lint:foundation']?.includes('scripts/check-stage-public-signup-controlled-open.mjs')) {
  errors.push('lint:foundation does not include scripts/check-stage-public-signup-controlled-open.mjs')
}

const migrationsDir = path.join(root, 'supabase/migrations')
const migrations = fs.readdirSync(migrationsDir).filter(name => name.endsWith('.sql'))
if (migrations.length !== 18) errors.push(`Expected 18 active migrations, found ${migrations.length}.`)
if (migrations.some(name => name.includes('019'))) errors.push('Migration 019 exists but this stage must not create it.')

if (errors.length > 0) {
  console.error(`STAGE-PUBLIC-SIGNUP-CONTROLLED-OPEN-1 audit failed with ${errors.length} issue(s):
`)
  for (const error of errors) console.error(`  - ${error}`)
  process.exit(1)
}

console.log('Stage STAGE-PUBLIC-SIGNUP-CONTROLLED-OPEN-1 audit passed.')
console.log('Signup: controlled opening runbook, owner approval, external account checks, replacement capacity, support and moderation confirmations recorded.')
console.log('Safety: docs/audit-only; public registration remains closed with no Auth config, Supabase, scoring, resolver, fake-result, league-write or migration change.')
console.log('Database: active migrations remain 18; no Migration 019.')
