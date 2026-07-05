// Product gate-decision audit — the next signup and tournament decisions stay explicit.
//
// This guard keeps the scale-gate decision rows visible without inventing
// owner choices. It is docs/audit-only: no runtime, Supabase, scoring,
// resolver or migration behaviour is inspected or changed.
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
  if (!has(file, text)) errors.push(`${file} must record "${text}" — ${reason}.`)
}

const stageDoc = 'docs/STAGE-PRODUCT-GATE-DECISIONS.md'
const roadmap = 'docs/PRODUCT-COMPLETENESS-ROADMAP.md'
const register = 'docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md'
const ledger = 'docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md'
const agentRules = 'docs/EURO28-AGENT-RULES-AND-ROADMAP.md'
const pkg = 'package.json'

for (const file of [stageDoc, roadmap, register, ledger, agentRules, pkg]) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`${file} is missing.`)
}

const decisionRows = [
  'Tie-break ladders',
  'Display-name and league-name moderation',
  'Capacity planning',
  'Email confirmation',
]
for (const row of decisionRows) {
  requireText(stageDoc, row, 'the stage doc must name the decision row')
  requireText(register, row, 'the decision register must name the decision row')
  requireText(roadmap, row === 'Capacity planning' ? 'Capacity decision' : row, 'the product roadmap must retain the gate')
}

const ownerDecisionMarkers = [
  'No owner choice is invented here',
  'owner decisions',
  '650–1,300 users',
  'Recommendation remains ON',
  'later moderation stage',
  'later tie-break implementation stage',
]
for (const marker of ownerDecisionMarkers) {
  requireText(stageDoc, marker, 'the stage doc must keep provisional values separate from approved decisions')
}

const safetyMarkers = [
  'No Supabase writes',
  'No Auth users are created',
  'No predictions are seeded',
  'No service-role credential',
  'No scoring values are changed',
  'No resolver behaviour is changed',
  'No UI route is changed',
  'Active migrations remain 18',
  'Migration 019 is not created',
  'Original Predictor and KO Predictor remain separate',
  'Predicted bracket context and live bracket context must never blend',
]
for (const marker of safetyMarkers) {
  requireText(stageDoc, marker, 'the stage doc must preserve hard safety boundaries')
}

requireText(register, 'Stage PRODUCT-GATE-DECISIONS-1', 'the decision register must record the stage')
requireText(register, 'no owner choice is invented', 'the register must keep owner choices explicit')
requireText(ledger, 'Stage PRODUCT-GATE-DECISIONS-1', 'the ledger must record the stage')
requireText(agentRules, 'Stage PRODUCT-GATE-DECISIONS-1', 'future agents must preserve the gate decisions')
requireText(pkg, 'audit:product-gate-decisions', 'the audit must be reachable by name')
requireText(pkg, 'check-product-gate-decisions.mjs', 'the audit script must be wired into lint/check tooling')

const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(name => name.endsWith('.sql'))
if (migrations.length !== 18) errors.push(`Expected 18 active migrations, found ${migrations.length}.`)
if (migrations.some(name => name.includes('019'))) errors.push('Migration 019 exists but this stage must not create it.')

if (errors.length > 0) {
  console.error(`Product gate-decision audit failed with ${errors.length} issue(s):
`)
  for (const error of errors) console.error(`  - ${error}`)
  process.exit(1)
}

console.log('Stage PRODUCT-GATE-DECISIONS-1 product gate-decision audit passed.')
console.log('Gates: tie-breaks, moderation, capacity and email confirmation remain explicit owner/implementation decisions.')
console.log('Safety: docs/audit-only; no scoring, resolver, Supabase write, service-role use, route or migration change.')
console.log('Database: active migrations remain 18; no Migration 019.')
