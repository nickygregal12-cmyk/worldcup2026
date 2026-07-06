// Rules hub signup-gate status audit — public rules surface keeps open signup gates visible.
//
// This guard proves the How to Play rules hub now exposes the remaining public
// signup blockers without pretending they are closed. It is UI/model/docs/audit
// only: no scoring, resolver, Supabase, route or migration behaviour is changed.
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const errors = []
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const has = (file, text) => read(file).toLowerCase().includes(text.toLowerCase())
const requireText = (file, text, reason) => {
  if (!fs.existsSync(path.join(root, file))) {
    errors.push(`${file} is missing — ${reason}.`)
    return
  }
  if (!has(file, text)) errors.push(`${file} must contain "${text}" — ${reason}.`)
}

const model = 'src/tournament/tournamentPageModel.js'
const readinessModel = 'src/auth/publicSignupReadiness.js'
const overview = 'src/tournament/TournamentOverview.jsx'
const styles = 'src/tournament/TournamentOverview.module.css'
const stageDoc = 'docs/STAGE-RULES-1B-SIGNUP-GATE-STATUS.md'
const rulesDoc = 'docs/STAGE-RULES-1A-RULES-HUB.md'
const roadmap = 'docs/PRODUCT-COMPLETENESS-ROADMAP.md'
const register = 'docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md'
const ledger = 'docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md'
const agentRules = 'docs/EURO28-AGENT-RULES-AND-ROADMAP.md'
const pkg = 'package.json'

for (const file of [model, readinessModel, overview, styles, stageDoc, rulesDoc, roadmap, register, ledger, agentRules, pkg]) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`${file} is missing.`)
}

const gateItems = [
  'Support contact',
  'Capacity and tiers',
  'Email confirmation',
  'privacy',
  'Name moderation',
]
for (const item of gateItems) {
  requireText(readinessModel, item, 'the readiness model must expose the open signup gate')
  requireText(stageDoc, item, 'the stage document must record the visible gate')
}

const modelMarkers = [
  'signupGateStatus',
  'buildPublicSignupReadiness()',
]
for (const marker of modelMarkers) {
  requireText(model, marker, 'the rules model must consume the central public signup readiness state')
}
for (const marker of ['eyebrow:', 'badge:', 'items:', 'isOpenForPublic: false']) {
  requireText(readinessModel, marker, 'the readiness model must keep public signup status explicit')
}

const renderMarkers = [
  'function SignupGatePanel',
  'model.signupGateStatus',
  'signupGateGrid',
  'gate.items.map',
]
for (const marker of renderMarkers) {
  requireText(overview, marker, 'the How to Play page must render the signup gate panel')
}

const styleMarkers = [
  'signupGatePanel',
  'signupGateGrid',
  'signupGateItem',
]
for (const marker of styleMarkers) {
  requireText(styles, marker, 'the signup gate panel must have scoped styles')
}

const safetyMarkers = [
  'No Supabase writes',
  'No Auth users are created',
  'No predictions are seeded',
  'No service-role credential',
  'No scoring values are changed',
  'No resolver behaviour is changed',
  'No new route is added',
  'Active migrations remain 18',
  'Migration 019 is not created',
  'Original Predictor and KO Predictor remain separate',
  'Predicted bracket context and live bracket context must never blend',
]
for (const marker of safetyMarkers) {
  requireText(stageDoc, marker, 'the stage doc must preserve hard safety boundaries')
}

requireText(rulesDoc, 'RULES-1B', 'the rules hub stage doc must link the follow-on visible-gate slice')
requireText(roadmap, 'RULES-1B signup gate status — CLOSED', 'the product roadmap must record the closed visible signup-gate slice')
requireText(register, 'Stage RULES-1B-SIGNUP-GATE-STATUS', 'the decision register must record the stage')
requireText(ledger, 'Stage RULES-1B-SIGNUP-GATE-STATUS', 'the functional ledger must record the stage')
requireText(agentRules, 'Stage RULES-1B-SIGNUP-GATE-STATUS', 'future agents must preserve the visible signup-gate panel')
requireText(pkg, 'audit:rules-hub-signup-gates', 'the audit must be reachable by name')
requireText(pkg, 'check-rules-hub-signup-gates.mjs', 'the audit script must be wired into package scripts')

const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(name => name.endsWith('.sql'))
if (migrations.length !== 18) errors.push(`Expected 18 active migrations, found ${migrations.length}.`)
if (migrations.some(name => name.includes('019'))) errors.push('Migration 019 exists but this stage must not create it.')

if (errors.length > 0) {
  console.error(`Rules hub signup-gate status audit failed with ${errors.length} issue(s):\n`)
  for (const error of errors) console.error(`  - ${error}`)
  process.exit(1)
}

console.log('Stage RULES-1B-SIGNUP-GATE-STATUS audit passed.')
console.log('Rules hub: visible public-signup gate panel lists support, capacity, email, privacy and moderation blockers.')
console.log('Safety: UI/model/docs/audit only; no scoring, resolver, Supabase write, service-role use, route or migration change.')
console.log('Database: active migrations remain 18; no Migration 019.')
