import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { buildPublicSignupReadiness } from '../src/auth/publicSignupReadiness.js'

const root = process.cwd()
const errors = []

const fileExists = file => fs.existsSync(path.join(root, file))
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

const requireText = (file, text, reason) => {
  if (!fileExists(file)) {
    errors.push(`${file} is missing — ${reason}.`)
    return
  }

  if (!read(file).includes(text)) {
    errors.push(`${file} must contain "${text}" — ${reason}.`)
  }
}

const readinessFile = 'src/auth/publicSignupReadiness.js'
const readinessTest = 'src/auth/__tests__/publicSignupReadiness.test.js'
const rulesModel = 'src/tournament/tournamentPageModel.js'
const stageDoc = 'docs/STAGE-PUBLIC-SIGNUP-READINESS.md'
const rulesStageDoc = 'docs/STAGE-RULES-1B-SIGNUP-GATE-STATUS.md'
const roadmap = 'docs/PRODUCT-COMPLETENESS-ROADMAP.md'
const register = 'docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md'
const ledger = 'docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md'
const agentRules = 'docs/EURO28-AGENT-RULES-AND-ROADMAP.md'
const pkg = 'package.json'

for (const file of [
  readinessFile,
  readinessTest,
  rulesModel,
  stageDoc,
  rulesStageDoc,
  roadmap,
  register,
  ledger,
  agentRules,
  pkg,
]) {
  if (!fileExists(file)) errors.push(`${file} is missing.`)
}

const readiness = buildPublicSignupReadiness()

const expectedLabels = [
  'Support contact',
  'Capacity and tiers',
  'Email confirmation',
  'Privacy region',
  'Name moderation',
]

if (readiness.isOpenForPublic !== false) {
  errors.push('Public signup readiness must keep isOpenForPublic false.')
}

if (readiness.badge !== 'Not open yet') {
  errors.push('Public signup readiness must keep the Not open yet badge.')
}

for (const label of expectedLabels) {
  if (!readiness.items.some(item => item.label === label)) {
    errors.push(`Public signup readiness must include "${label}".`)
  }

  requireText(readinessFile, label, 'the central readiness model must list every open signup gate')
  requireText(readinessTest, label, 'the readiness test must prove every open signup gate')
  requireText(stageDoc, label, 'the stage document must record every open signup gate')
}

requireText(readinessFile, 'buildPublicSignupReadiness', 'the readiness model must expose a builder')
requireText(readinessFile, 'PUBLIC_SIGNUP_READINESS', 'the readiness model must expose one central object')
requireText(readinessFile, 'isOpenForPublic: false', 'wider public registration must remain closed')
requireText(rulesModel, "import { buildPublicSignupReadiness } from '../auth/publicSignupReadiness.js'", 'Rules Hub model must import the central readiness model')
requireText(rulesModel, 'signupGateStatus: buildPublicSignupReadiness()', 'Rules Hub model must consume the central readiness model')
requireText(pkg, '"audit:public-signup-readiness"', 'package scripts must expose the readiness audit')
requireText(pkg, 'npm run audit:public-signup-readiness', 'npm run check must include the readiness audit')
requireText(roadmap, 'PUBLIC-SIGNUP-READINESS-1', 'product roadmap must record the readiness slice')
requireText(register, 'Stage PUBLIC-SIGNUP-READINESS-1', 'decision register must record the readiness slice')
requireText(ledger, 'Stage PUBLIC-SIGNUP-READINESS-1', 'functional ledger must record the readiness slice')
requireText(agentRules, 'Stage PUBLIC-SIGNUP-READINESS-1', 'agent rules must preserve the readiness boundary')

const forbiddenClaims = [
  'public registration is open',
  'signups are open',
  'email confirmation is on',
  'email confirmation is off',
  'support@example',
  'capacity is',
]

if (fileExists(readinessFile)) {
  const readinessText = read(readinessFile).toLowerCase()
  for (const claim of forbiddenClaims) {
    if (readinessText.includes(claim)) {
      errors.push(`${readinessFile} must not claim "${claim}".`)
    }
  }
}

const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(name => name.endsWith('.sql'))
if (migrations.length !== 18) errors.push(`Expected 18 active migrations, found ${migrations.length}.`)
if (migrations.some(name => name.includes('019'))) errors.push('Migration 019 exists but this stage must not create it.')

if (errors.length > 0) {
  console.error(`Public signup readiness audit failed with ${errors.length} issue(s):\n`)
  for (const error of errors) console.error(`  - ${error}`)
  process.exit(1)
}

console.log('Stage PUBLIC-SIGNUP-READINESS-1 public signup readiness audit passed.')
console.log('Readiness: wider public registration remains closed while explicit signup gates remain open.')
console.log('Safety: model/test/docs/audit only; no Auth config, Supabase write, service-role use, route or migration change.')
console.log('Database: active migrations remain 18; no Migration 019.')
