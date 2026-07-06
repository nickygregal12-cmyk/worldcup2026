// STAGE-PUBLIC-SIGNUP-IMPLEMENTATION-READINESS-1 audit — Public signup implementation readiness contract.
//
// This guard is intentionally docs/audit-only. It verifies that public signup
// gates, owner decisions, email confirmation, support flow, capacity, privacy,
// moderation, hosting assumptions and pre-Auth-change checks are recorded
// without opening signups or changing runtime UI, routes, Auth, Supabase,
// scoring, resolver, result-entry, fake-result writes, league writes or migrations.
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

const stageDoc = 'docs/STAGE-PUBLIC-SIGNUP-IMPLEMENTATION-READINESS-1.md'
const contractDoc = 'docs/PUBLIC-SIGNUP-IMPLEMENTATION-READINESS-CONTRACT.md'
const register = 'docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md'
const ledger = 'docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md'
const agentRules = 'docs/EURO28-AGENT-RULES-AND-ROADMAP.md'
const roadmap = 'docs/PRODUCT-COMPLETENESS-ROADMAP.md'
const batchOrder = 'docs/STREAMLINED-BATCH-ORDER.md'
const pkgFile = 'package.json'

for (const file of [stageDoc, contractDoc, register, ledger, agentRules, roadmap, batchOrder, pkgFile]) {
  if (!exists(file)) errors.push(`${file} is missing.`)
}

const readinessMarkers = [
  'public signup gates mapped to owner decisions',
  'email confirmation ON expectations',
  'support/contact-admin flow',
  '250-user / 20-league capacity guardrails',
  'conservative privacy wording',
  'display-name moderation expectations',
  'low-cost/free hosting assumptions',
  'exact “still closed until implementation” wording',
  'explicit checks before any Auth config change',
  'public signup remains closed until implementation gates are complete',
]
for (const marker of readinessMarkers) {
  requireText(stageDoc, marker, 'stage doc must lock public signup implementation readiness')
  requireText(contractDoc, marker, 'contract doc must preserve public signup implementation readiness')
}

const authCheckMarkers = [
  'the exact Supabase project is the Euro staging/development project, not WC26 production',
  'redirect URLs and password-recovery URLs point to the Euro 2028 deployment',
  'support/contact-admin route or route-equivalent content is visible',
  'privacy wording does not claim a specific data region unless confirmed',
  'display-name moderation expectations are implemented or the public gate remains closed',
  'no service-role key, private admin key or seeded/synthetic account detail is exposed to the browser',
]
for (const marker of authCheckMarkers) {
  requireText(contractDoc, marker, 'pre-Auth-change checklist must be explicit')
}

const ownerDecisionMarkers = [
  'signups are intended to move beyond invite-only only after implementation gates are complete',
  'email confirmation ON expectations must be preserved',
  '250-user / 20-league capacity guardrails are the launch planning assumption',
  'conservative privacy wording must be used until exact infrastructure claims are confirmed',
  'display-name moderation expectations must be implemented before wider public signup',
  'low-cost/free hosting assumptions must be monitored before expanding usage',
]
for (const marker of ownerDecisionMarkers) {
  requireText(contractDoc, marker, 'owner decisions must map to the public signup gates')
}

const safetyMarkers = [
  'No Auth configuration change in this stage',
  'No Supabase schema, RPC, RLS, service-role or browser write change',
  'No fake-result writes',
  'No league writes',
  'No Migration 019',
]
for (const marker of safetyMarkers) {
  requireText(stageDoc, marker, 'stage safety boundary must be explicit')
  requireText(contractDoc, marker, 'contract safety boundary must be explicit')
}

for (const file of [register, ledger, agentRules, roadmap, batchOrder]) {
  requireText(file, 'STAGE-PUBLIC-SIGNUP-IMPLEMENTATION-READINESS-1', 'live docs must record the Public Signup Implementation Readiness stage')
  requireText(file, 'public signup gates mapped to owner decisions', 'live docs must carry owner-decision gate mapping')
  requireText(file, 'email confirmation ON expectations', 'live docs must carry email confirmation expectation')
  requireText(file, 'support/contact-admin flow', 'live docs must carry support/contact-admin flow')
  requireText(file, '250-user / 20-league capacity guardrails', 'live docs must carry capacity guardrails')
  requireText(file, 'display-name moderation expectations', 'live docs must carry moderation expectation')
  requireText(file, 'explicit checks before any Auth config change', 'live docs must carry pre-Auth-change checks')
  requireText(file, 'Public signup remains closed', 'live docs must preserve closed signup state')
  requireText(file, 'Migration 019', 'live docs must preserve migration boundary')
}

const pkg = JSON.parse(read(pkgFile))
if (pkg.scripts?.['audit:public-signup-implementation-readiness'] !== 'node scripts/check-stage-public-signup-implementation-readiness.mjs') {
  errors.push('audit:public-signup-implementation-readiness is not wired to scripts/check-stage-public-signup-implementation-readiness.mjs')
}
if (!pkg.scripts?.check?.includes('npm run audit:public-signup-implementation-readiness')) {
  errors.push('npm run check does not include audit:public-signup-implementation-readiness')
}
if (!pkg.scripts?.['lint:foundation']?.includes('scripts/check-stage-public-signup-implementation-readiness.mjs')) {
  errors.push('lint:foundation does not include scripts/check-stage-public-signup-implementation-readiness.mjs')
}

const migrationsDir = path.join(root, 'supabase/migrations')
const migrations = fs.readdirSync(migrationsDir).filter(name => name.endsWith('.sql'))
if (migrations.length !== 18) errors.push(`Expected 18 active migrations, found ${migrations.length}.`)
if (migrations.some(name => name.includes('019'))) errors.push('Migration 019 exists but this stage must not create it.')

if (errors.length > 0) {
  console.error(`STAGE-PUBLIC-SIGNUP-IMPLEMENTATION-READINESS-1 audit failed with ${errors.length} issue(s):\n`)
  for (const error of errors) console.error(`  - ${error}`)
  process.exit(1)
}

console.log('Stage STAGE-PUBLIC-SIGNUP-IMPLEMENTATION-READINESS-1 audit passed.')
console.log('Signup: owner-decision gates, email confirmation, support flow, capacity, privacy, moderation and pre-Auth checks recorded.')
console.log('Safety: docs/audit-only; no runtime UI, route, Auth, Supabase, scoring, resolver, result-entry, fake-result write, league-write or migration change.')
console.log('Database: active migrations remain 18; no Migration 019.')
