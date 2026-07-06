// STAGE-PUBLIC-SIGNUP-SMTP-READINESS-1 audit — SMTP readiness gate only.
//
// This guard records custom SMTP as the next public-signup blocker while
// keeping public registration closed and avoiding Auth, Supabase, scoring,
// resolver, league-write and migration changes.
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

const stageDoc = 'docs/STAGE-PUBLIC-SIGNUP-SMTP-READINESS-1.md'
const contractDoc = 'docs/PUBLIC-SIGNUP-SMTP-READINESS-CONTRACT.md'
const externalSettingsDoc = 'docs/STAGE-PUBLIC-SIGNUP-EXTERNAL-SETTINGS-CHECK-1.md'
const register = 'docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md'
const ledger = 'docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md'
const agentRules = 'docs/EURO28-AGENT-RULES-AND-ROADMAP.md'
const roadmap = 'docs/PRODUCT-COMPLETENESS-ROADMAP.md'
const batchOrder = 'docs/STREAMLINED-BATCH-ORDER.md'
const pkgFile = 'package.json'

for (const file of [stageDoc, contractDoc, externalSettingsDoc, register, ledger, agentRules, roadmap, batchOrder, pkgFile]) {
  if (!exists(file)) errors.push(`${file} is missing.`)
}

const readiness = buildPublicSignupReadiness()
const capacity = readiness.ownerDecisions?.initialCapacity
if (readiness.isOpenForPublic !== false) errors.push('SMTP readiness must not open wider public registration.')
if (readiness.implementation?.publicRegistrationOpened !== false) errors.push('Implementation status must keep the public opening flag false in SMTP readiness.')
if (capacity?.userCap !== 50 || capacity?.leagueCap !== 20) errors.push('Pre-SMTP cap must remain 50 users and 20 leagues.')
if (capacity?.targetAfterEmailSenderUserCap !== 100) errors.push('Post-SMTP target user cap must remain 100 users.')
if (capacity?.reviewPoint?.userCount !== 75 || capacity?.reviewPoint?.leagueCount !== 15) errors.push('Post-SMTP review point must remain 75 users or 15 leagues.')
if (readiness.ownerDecisions?.emailConfirmation?.requiredForPublicRegistration !== true) errors.push('Email confirmation must remain required for public signup.')

const smtpMarkers = [
  'STAGE-PUBLIC-SIGNUP-SMTP-READINESS-1',
  'Custom SMTP is the next public-signup blocker',
  'Custom SMTP must be configured before branded public email templates are relied on',
  'SMTP sender address must be approved before public opening',
  'SMTP reply-to/support destination must be approved before public opening',
  'Confirm sign-up email template must be checked after SMTP is configured',
  'Reset password email template must be checked after SMTP is configured',
  'Invite or magic-link email template must be checked if enabled',
  'Auth email templates must not mention WC26',
  'Auth email templates should mention Euro 2028 Predictor or stay generic',
  'No SMTP secrets may be committed',
  'No SMTP password, token, API key or provider secret may be printed in logs',
  'Email confirmation remains ON',
  'Public registration remains closed',
  'Pre-SMTP capacity remains 50 users / 20 leagues',
  'Post-SMTP target remains 100 users / 20 leagues',
  'Post-SMTP review point remains 75 users / 15 leagues',
]
for (const marker of smtpMarkers) {
  requireText(stageDoc, marker, 'stage doc must record SMTP readiness evidence')
  requireText(contractDoc, marker, 'contract doc must preserve SMTP readiness evidence')
}

const safetyMarkers = [
  'docs/audit-only',
  'does not configure SMTP',
  'does not edit external Auth settings',
  'does not open signups',
  'does not create users',
  'does not write profile rows',
  'does not seed predictions',
  'does not write league data',
  'does not publish service-role credentials',
  'No runtime route, Auth configuration, Supabase schema, RPC, RLS, service-role, browser write, scoring, resolver, result-entry, fake-result write, league-write or migration change is included',
  'Active migrations remain 18',
  'Migration 019 is not created',
  'WC26 production remains blocked',
  'Original Predictor and KO Predictor remain separate',
]
for (const marker of safetyMarkers) requireText(stageDoc, marker, 'stage safety boundary must be explicit')

for (const file of [register, ledger, agentRules, roadmap, batchOrder]) {
  requireText(file, 'STAGE-PUBLIC-SIGNUP-SMTP-READINESS-1', 'live docs must record the Public Signup SMTP Readiness stage')
  requireText(file, 'SMTP readiness marker: custom SMTP is the next public-signup blocker', 'live docs must record SMTP as the next blocker')
  requireText(file, 'No SMTP secrets may be committed', 'live docs must preserve secret-handling boundary')
  requireText(file, 'No SMTP password, token, API key or provider secret may be printed in logs', 'live docs must preserve logging boundary')
  requireText(file, 'Auth email templates must not mention WC26', 'live docs must preserve WC26 email-template boundary')
  requireText(file, 'Pre-SMTP capacity remains 50 users / 20 leagues', 'live docs must preserve pre-SMTP cap')
  requireText(file, 'Post-SMTP target remains 100 users / 20 leagues', 'live docs must preserve post-SMTP target')
  requireText(file, 'Post-SMTP review point remains 75 users / 15 leagues', 'live docs must preserve review point')
  requireText(file, 'public registration remains closed', 'live docs must preserve closed signup state')
  requireText(file, 'Migration 019', 'live docs must preserve migration boundary')
}

requireText(externalSettingsDoc, 'Custom SMTP required before branded public email templates: yes', 'SMTP readiness must build on the checked external settings')
requireText(externalSettingsDoc, 'Initial capacity accepted before SMTP: 50 users / 20 leagues', 'SMTP readiness must preserve external settings capacity')

const pkg = JSON.parse(read(pkgFile))
if (pkg.scripts?.['audit:public-signup-smtp-readiness'] !== 'node scripts/check-stage-public-signup-smtp-readiness.mjs') {
  errors.push('audit:public-signup-smtp-readiness is not wired to scripts/check-stage-public-signup-smtp-readiness.mjs')
}
if (!pkg.scripts?.check?.includes('npm run audit:public-signup-smtp-readiness')) {
  errors.push('npm run check does not include audit:public-signup-smtp-readiness')
}
if (!pkg.scripts?.['lint:foundation']?.includes('scripts/check-stage-public-signup-smtp-readiness.mjs')) {
  errors.push('lint:foundation does not include scripts/check-stage-public-signup-smtp-readiness.mjs')
}

const migrationsDir = path.join(root, 'supabase/migrations')
const migrations = fs.readdirSync(migrationsDir).filter(name => name.endsWith('.sql'))
if (migrations.length !== 18) errors.push(`Expected 18 active migrations, found ${migrations.length}.`)
if (migrations.some(name => name.includes('019'))) errors.push('Migration 019 exists but this stage must not create it.')

if (errors.length > 0) {
  console.error(`STAGE-PUBLIC-SIGNUP-SMTP-READINESS-1 audit failed with ${errors.length} issue(s):\n`)
  for (const error of errors) console.error(`  - ${error}`)
  process.exit(1)
}

console.log('Stage STAGE-PUBLIC-SIGNUP-SMTP-READINESS-1 audit passed.')
console.log('Signup: SMTP readiness, sender/reply-to/template checks, capacity and secret boundaries recorded.')
console.log('Safety: docs/audit-only; public registration remains closed with no SMTP config, Auth config, Supabase, scoring, resolver, fake-result, league-write or migration change.')
console.log('Database: active migrations remain 18; no Migration 019.')
