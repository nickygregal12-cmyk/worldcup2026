// Owner signup-decision audit — records owner choices without opening registration.
//
// This guard proves OWNER-SIGNUP-DECISIONS-1 stays model/docs/audit only. It
// records the support, capacity, email-confirmation, privacy, moderation and
// invite-only decisions while keeping public registration closed until the later
// implementation gates are complete.
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { buildPublicSignupReadiness } from '../src/auth/publicSignupReadiness.js'

const root = process.cwd()
const errors = []
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const has = (file, text) => read(file).toLowerCase().includes(text.toLowerCase())
const fileExists = file => fs.existsSync(path.join(root, file))
const requireText = (file, text, reason) => {
  if (!fileExists(file)) {
    errors.push(`${file} is missing — ${reason}.`)
    return
  }
  if (!has(file, text)) errors.push(`${file} must record "${text}" — ${reason}.`)
}

const readinessFile = 'src/auth/publicSignupReadiness.js'
const readinessTest = 'src/auth/__tests__/publicSignupReadiness.test.js'
const stageDoc = 'docs/STAGE-OWNER-SIGNUP-DECISIONS.md'
const readinessDoc = 'docs/STAGE-PUBLIC-SIGNUP-READINESS.md'
const roadmap = 'docs/PRODUCT-COMPLETENESS-ROADMAP.md'
const register = 'docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md'
const ledger = 'docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md'
const agentRules = 'docs/EURO28-AGENT-RULES-AND-ROADMAP.md'
const pkg = 'package.json'

for (const file of [
  readinessFile,
  readinessTest,
  stageDoc,
  readinessDoc,
  roadmap,
  register,
  ledger,
  agentRules,
  pkg,
]) {
  if (!fileExists(file)) errors.push(`${file} is missing.`)
}

const readiness = buildPublicSignupReadiness()
const decisions = readiness.ownerDecisions

if (readiness.isOpenForPublic !== false) {
  errors.push('Owner decisions must not open wider public registration.')
}
if (readiness.badge !== 'Closed for now') {
  errors.push('Public signup readiness must keep the Closed for now badge.')
}
if (decisions?.supportContact?.decision !== 'Contact admin') {
  errors.push('Support contact decision must be Contact admin.')
}
if (decisions?.initialCapacity?.userCap !== 50 || decisions?.initialCapacity?.leagueCap !== 20) {
  errors.push('Initial capacity decision must be 50 users and 20 leagues after the external settings check replacement decision.')
}
if (decisions?.initialCapacity?.targetAfterEmailSenderUserCap !== 100) {
  errors.push('Post-email-sender target capacity must be 100 users.')
}
if (decisions?.initialCapacity?.reviewPoint?.userCount !== 75 || decisions?.initialCapacity?.reviewPoint?.leagueCount !== 15) {
  errors.push('Capacity review point must be 75 users and 15 leagues.')
}
if (decisions?.emailConfirmation?.requiredForPublicRegistration !== true) {
  errors.push('Email confirmation must be required for public registration.')
}
if (decisions?.inviteOnly?.stayInviteOnlyUntilModeration !== false) {
  errors.push('Invite-only decision must be recorded as no.')
}
if (decisions?.inviteOnly?.publicOpeningStillBlocked !== true) {
  errors.push('Public opening must remain blocked until later implementation gates close.')
}

const modelMarkers = [
  'PUBLIC_SIGNUP_OWNER_DECISIONS',
  'Contact admin',
  'userCap: 50',
  'leagueCap: 20',
  'targetAfterEmailSenderUserCap: 100',
  'low-cost/free',
  'requiredForPublicRegistration: true',
  'stayInviteOnlyUntilModeration: false',
  'publicOpeningStillBlocked: true',
  'isOpenForPublic: false',
]
for (const marker of modelMarkers) {
  requireText(readinessFile, marker, 'the central readiness model must record owner decisions and keep signups closed')
  requireText(readinessTest, marker.includes(':') ? marker.split(':')[0] : marker, 'tests must prove the owner decision is present')
}

const decisionMarkers = [
  'OWNER-SIGNUP-DECISIONS-1',
  'Contact admin',
  '50 users',
  '20 leagues',
  '100 users',
  '75 users',
  '15 leagues',
  'current low-cost/free setup',
  'Review hosting, Supabase Auth and email limits before increasing capacity',
  'Email confirmation is ON',
  'no specific data-region claim',
  'stop the boats',
  'Public registration does not stay invite-only',
  'public registration remains closed',
]
for (const marker of decisionMarkers) {
  requireText(stageDoc, marker, 'the stage doc must record every owner signup decision')
}

for (const marker of ['racist', 'discriminatory', 'anti-immigrant', 'sectarian', 'abusive', 'inflammatory']) {
  requireText(stageDoc, marker, 'the stage doc must record the moderation categories')
  requireText(readinessFile, marker, 'the readiness model must record the moderation categories')
  requireText(readinessTest, marker, 'the tests must prove the moderation categories')
}

for (const marker of ['Do not publish', 'data-region claim']) {
  requireText(readinessFile, marker, 'the readiness model must avoid an unconfirmed region claim')
  requireText(readinessTest, marker, 'the tests must prove the region-claim boundary')
}

requireText(readinessDoc, 'OWNER-SIGNUP-DECISIONS-1', 'the readiness stage doc must link the owner-decision follow-on')
requireText(readinessDoc, 'owner choices', 'the readiness stage doc must reflect the updated state')
requireText(readinessDoc, 'now recorded', 'the readiness stage doc must reflect the updated state')
requireText(roadmap, 'OWNER-SIGNUP-DECISIONS-1 — CLOSED', 'the product roadmap must record the closed owner-decision slice')
requireText(register, 'Stage OWNER-SIGNUP-DECISIONS-1', 'the decision register must record the stage')
requireText(ledger, 'Stage OWNER-SIGNUP-DECISIONS-1', 'the functional ledger must record the stage')
requireText(agentRules, 'Stage OWNER-SIGNUP-DECISIONS-1', 'future agents must preserve the decisions')
requireText(pkg, 'audit:owner-signup-decisions', 'package scripts must expose the owner-decision audit')
requireText(pkg, 'check-owner-signup-decisions.mjs', 'the owner-decision audit must be wired')
requireText(pkg, 'npm run audit:owner-signup-decisions', 'npm run check must include the owner-decision audit')

const safetyMarkers = [
  'No signup flow is opened',
  'No Auth configuration is changed',
  'No Supabase writes',
  'No Auth users are created',
  'No predictions are seeded',
  'No service-role credential',
  'No scoring values are changed',
  'No resolver behaviour is changed',
  'No route is changed',
  'Active migrations remain 18',
  'Migration 019 is not created',
  'Original Predictor and KO Predictor remain separate',
  'Predicted bracket context and live bracket context must never blend',
]
for (const marker of safetyMarkers) {
  requireText(stageDoc, marker, 'the stage doc must preserve hard safety boundaries')
}

const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(name => name.endsWith('.sql'))
if (migrations.length !== 18) errors.push(`Expected 18 active migrations, found ${migrations.length}.`)
if (migrations.some(name => name.includes('019'))) errors.push('Migration 019 exists but this stage must not create it.')

if (errors.length > 0) {
  console.error(`Owner signup-decision audit failed with ${errors.length} issue(s):\n`)
  for (const error of errors) console.error(`  - ${error}`)
  process.exit(1)
}

console.log('Stage OWNER-SIGNUP-DECISIONS-1 owner signup-decision audit passed.')
console.log('Decisions: Contact admin, 50 users, 20 leagues, post-email-sender 100 user target, low-cost/free planning, email confirmation ON, conservative privacy wording and moderation policy recorded.')
console.log('Readiness: wider public registration remains closed until later implementation gates close.')
console.log('Database: active migrations remain 18; no Migration 019.')
