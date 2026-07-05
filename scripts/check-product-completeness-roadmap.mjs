// Product-completeness roadmap audit — signup and tournament gates stay recorded.
//
// This is a docs/audit-only guard for the scale shift from a WC26-sized
// friends league to a wider Euro 2028 product. It does not inspect runtime
// behaviour. It only proves that the governing docs keep the signup and
// tournament readiness gates visible until the owning implementation slices
// close them with evidence.
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

const roadmap = 'docs/PRODUCT-COMPLETENESS-ROADMAP.md'
const stageDoc = 'docs/STAGE-PRODUCT-COMPLETENESS-REGISTER-ALIGNMENT.md'
const register = 'docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md'
const agentRules = 'docs/EURO28-AGENT-RULES-AND-ROADMAP.md'
const ledger = 'docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md'

for (const file of [roadmap, stageDoc, register, agentRules, ledger]) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`${file} is missing.`)
}

const signupGates = [
  'RULES-1',
  'Display-name and league-name moderation',
  'Support channel',
  'Capacity decision',
  'Email confirmation',
  'Privacy',
]
const tournamentGates = [
  'Tie-break ladders',
  'Load reality-check',
  'Uptime',
]
const scheduledFollowOns = [
  'Offline player lifecycle',
  'Unknown-route fallback',
  'Growth mechanics',
]

for (const gate of signupGates) {
  requireText(roadmap, gate, 'the source roadmap must retain the signup gate')
  requireText(register, gate, 'the decision register must retain the signup gate')
}
for (const gate of tournamentGates) {
  requireText(roadmap, gate, 'the source roadmap must retain the tournament gate')
  requireText(register, gate, 'the decision register must retain the tournament gate')
}
for (const item of scheduledFollowOns) {
  requireText(roadmap, item, 'the source roadmap must retain the scheduled follow-on')
  requireText(register, item, 'the decision register must retain the scheduled follow-on')
}

const crossDocTerms = [
  '650–1,300 users',
  'owner decision',
  'Supabase data region',
  'No Supabase writes',
  'No service-role credential use',
  'Active migrations remain 18',
  'Migration 019 is not created',
]
for (const text of crossDocTerms) {
  requireText(stageDoc, text, 'the stage scope must preserve scale and no-write boundaries')
}
requireText(agentRules, 'Product completeness gates before wider Euro 2028 scale', 'the agent roadmap must carry the sequence')
requireText(ledger, 'Product completeness register alignment', 'the ledger must record the accepted docs/audit-only package')
requireText(ledger, 'no database writes', 'the ledger must preserve the no-write boundary')
requireText(ledger, 'no user creation', 'the ledger must preserve the no-user-creation boundary')
requireText(ledger, 'no prediction seeding', 'the ledger must preserve the no-seeding boundary')
requireText(register, 'Stage 16A load rehearsal', 'load testing must remain tied to the seeded-data programme')
requireText(register, 'RULES-1 contact line', 'support must remain tied to the public rules/trust page')
requireText(register, 'Signup auth policy row', 'email confirmation must remain an explicit owner decision')

if (errors.length > 0) {
  console.error(`Product-completeness roadmap audit failed with ${errors.length} issue(s):\n`)
  for (const message of errors) console.error(`  - ${message}`)
  console.error('\nThe scale-driven signup and tournament gates must remain recorded until their owning stages close them with evidence.')
  process.exit(1)
}

console.log('Product-completeness roadmap audit passed. Signup gates, tournament gates, scheduled follow-ons, owner decisions and no-write/no-migration boundaries are recorded.')
