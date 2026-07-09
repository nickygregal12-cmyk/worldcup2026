import { migrationSequenceError } from './lib/migrationSequenceGuard.mjs'
// STAGE-PUBLIC-SIGNUP-EXTERNAL-SETTINGS-CHECK-1 audit — owner-verified external account settings.
//
// This guard records the manual external settings evidence and replacement
// capacity decision while keeping public registration closed and avoiding Auth,
// Supabase, scoring, resolver, league-write and migration changes.
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

const stageDoc = 'docs/archive/STAGE-PUBLIC-SIGNUP-EXTERNAL-SETTINGS-CHECK-1.md'
const contractDoc = 'docs/PUBLIC-SIGNUP-EXTERNAL-SETTINGS-CHECK-CONTRACT.md'
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
const capacity = readiness.ownerDecisions?.initialCapacity
if (readiness.isOpenForPublic !== false) errors.push('The external settings check must not open wider public registration.')
if (readiness.implementation?.publicRegistrationOpened !== false) errors.push('Implementation status must keep the public opening flag false in this external settings check.')
if (capacity?.userCap !== 50 || capacity?.leagueCap !== 20) errors.push('The pre-SMTP public opening cap must be 50 users and 20 leagues.')
if (capacity?.targetAfterEmailSenderUserCap !== 100) errors.push('The post-email-sender target user cap must be 100 users.')
if (capacity?.reviewPoint?.userCount !== 75 || capacity?.reviewPoint?.leagueCount !== 15) errors.push('The capacity review point must be 75 users or 15 leagues.')
if (readiness.ownerDecisions?.moderation?.clientPreAuthGuardImplemented !== true) errors.push('Display-name moderation must remain implemented before this external settings check can pass.')

const externalMarkers = [
  'STAGE-PUBLIC-SIGNUP-EXTERNAL-SETTINGS-CHECK-1',
  'Euro staging project checked: gcfdwobpnanjchcnvdco',
  'Email confirmation: ON',
  'New user signups: still closed',
  'Site URL / app URL: https://euro28-predictor-dev.netlify.app',
  'Redirect URLs include Euro dev site: yes',
  'Redirect URLs currently include local dev URLs: yes',
  'WC26 URLs used for Euro auth return: no',
  'Email templates editable without SMTP: no',
  'Email templates mention WC26: unable to edit/check fully without SMTP',
  'Custom SMTP required before branded public email templates: yes',
  'Initial capacity accepted before SMTP: 50 users / 20 leagues',
  'Target capacity after SMTP: 100 users / 20 leagues',
  'Review point after SMTP: 75 users / 15 leagues',
  'Support/contact route required: yes',
  'Display-name moderation required: yes',
]
for (const marker of externalMarkers) {
  requireText(stageDoc, marker, 'stage doc must record the owner-checked external settings')
  requireText(contractDoc, marker, 'contract doc must preserve the owner-checked external settings')
}

const safetyMarkers = [
  'Public registration remains closed',
  'does not alter external Auth settings',
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
  requireText(file, 'STAGE-PUBLIC-SIGNUP-EXTERNAL-SETTINGS-CHECK-1', 'live docs must record the Public Signup External Settings Check stage')
  requireText(file, 'Euro staging project checked: gcfdwobpnanjchcnvdco', 'live docs must carry the checked staging project marker')
  requireText(file, 'Email confirmation: ON', 'live docs must carry the email confirmation marker')
  requireText(file, 'New user signups: still closed', 'live docs must preserve the closed signup state')
  requireText(file, 'Redirect URLs currently include local dev URLs: yes', 'live docs must record local dev redirects for staging')
  requireText(file, 'WC26 URLs used for Euro auth return: no', 'live docs must preserve the WC26 return-url boundary')
  requireText(file, 'Custom SMTP required before branded public email templates: yes', 'live docs must record the branded-email dependency')
  requireText(file, 'Initial capacity accepted before SMTP: 50 users / 20 leagues', 'live docs must carry the replacement first-opening cap')
  requireText(file, 'Target capacity after SMTP: 100 users / 20 leagues', 'live docs must carry the post-SMTP target cap')
  requireText(file, 'Review point after SMTP: 75 users / 15 leagues', 'live docs must carry the review point')
  requireText(file, 'Support/contact route required: yes', 'live docs must carry the support marker')
  requireText(file, 'Display-name moderation required: yes', 'live docs must carry the moderation marker')
  requireText(file, 'Migration 019', 'live docs must preserve migration boundary')
}

const pkg = JSON.parse(read(pkgFile))
if (pkg.scripts?.['audit:public-signup-external-settings-check'] !== 'node scripts/check-stage-public-signup-external-settings-check.mjs') {
  errors.push('audit:public-signup-external-settings-check is not wired to scripts/check-stage-public-signup-external-settings-check.mjs')
}
if (!pkg.scripts?.check?.includes('npm run audit:public-signup-external-settings-check')) {
  errors.push('npm run check does not include audit:public-signup-external-settings-check')
}
if (!pkg.scripts?.['lint:foundation']?.includes('scripts/check-stage-public-signup-external-settings-check.mjs')) {
  errors.push('lint:foundation does not include scripts/check-stage-public-signup-external-settings-check.mjs')
}

const migrationsDir = path.join(root, 'supabase/migrations')
const migrations = fs.readdirSync(migrationsDir).filter(name => name.endsWith('.sql'))
if (migrationSequenceError(migrations)) errors.push(migrationSequenceError(migrations))

if (errors.length > 0) {
  console.error(`STAGE-PUBLIC-SIGNUP-EXTERNAL-SETTINGS-CHECK-1 audit failed with ${errors.length} issue(s):\n`)
  for (const error of errors) console.error(`  - ${error}`)
  process.exit(1)
}

console.log('Stage STAGE-PUBLIC-SIGNUP-EXTERNAL-SETTINGS-CHECK-1 audit passed.')
console.log('Signup: external settings, custom SMTP dependency, replacement capacity, support and moderation confirmations recorded.')
console.log('Safety: public registration remains closed with no Auth config, Supabase, scoring, resolver, fake-result, league-write or migration change.')
console.log(`Database: ${migrations.length} active migrations, sequentially numbered with no gaps.`)
