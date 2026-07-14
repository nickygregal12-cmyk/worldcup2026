import { migrationSequenceError } from './lib/migrationSequenceGuard.mjs'
// STAGE-ENTRY-AND-REVIEW-JOURNEY-1 audit — entry/completion journey contract.
//
// This guard is intentionally docs/audit-only. It verifies that the Home,
// Review Picks, Welcome and Invite/Join journey contract is recorded without
// introducing runtime UI, route, scoring, resolver, Supabase, Auth, result-entry
// or migration changes.
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

const stageDoc = 'docs/archive/STAGE-ENTRY-AND-REVIEW-JOURNEY-1.md'
const contractDoc = 'docs/ENTRY-AND-REVIEW-JOURNEY-CONTRACT.md'
const register = 'docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md'
const ledger = 'docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md'
const agentRules = 'docs/EURO28-AGENT-RULES-AND-ROADMAP.md'
const roadmap = 'docs/PRODUCT-COMPLETENESS-ROADMAP.md'
const batchOrder = 'docs/STREAMLINED-BATCH-ORDER.md'
const pkgFile = 'package.json'

for (const file of [stageDoc, contractDoc, register, ledger, agentRules, roadmap, batchOrder, pkgFile]) {
  if (!exists(file)) errors.push(`${file} is missing.`)
}

const journeyMarkers = [
  'What should I do now?',
  'Start Groups',
  'Continue Groups',
  'Continue to Bracket',
  'Review Picks',
  'View leagues',
  'View today\'s matches',
  'no wrong-state flicker',
  '#/review',
  '#/welcome',
  'auto-calculated group-goals display',
  'unresolved in-group tiebreaker prompt',
  'best-third prompt',
  'Your group changes affected your bracket',
  'This joker will double the points you earn from this match',
  'locked prediction snapshot',
  'valid invite',
  'invalid invite',
  'expired invite',
  'already joined',
  'league full',
  'account required',
]
for (const marker of journeyMarkers) {
  requireText(stageDoc, marker, 'stage doc must lock the entry/review journey behaviour')
}

const contractMarkers = [
  'Home, Review Picks, Welcome and Invite/Join form one entry/completion journey',
  'No picks started → Start Groups',
  'Groups complete, bracket complete, Review incomplete → Review Picks',
  'Review is incomplete until row counts and qualitative blockers are clear',
  'Change scores',
  'Pick positions',
  'Group goals are auto-calculated only',
  'Review must not include a manual group-goals input',
  'Original and KO Predictor points remain separate',
]
for (const marker of contractMarkers) {
  requireText(contractDoc, marker, 'contract doc must preserve the implementation target')
}

for (const file of [register, ledger, agentRules, roadmap, batchOrder]) {
  requireText(file, 'STAGE-ENTRY-AND-REVIEW-JOURNEY-1', 'live docs must record the entry/review journey stage')
  requireText(file, 'Review Picks', 'live docs must carry the Review Picks completion gate')
  requireText(file, 'no wrong-state flicker', 'live docs must carry the no-flicker requirement')
  requireText(file, 'Migration 019', 'live docs must preserve migration boundary')
}

const pkg = JSON.parse(read(pkgFile))
if (pkg.scripts?.['audit:entry-review-journey'] !== 'node scripts/check-stage-entry-review-journey.mjs') {
  errors.push('audit:entry-review-journey is not wired to scripts/check-stage-entry-review-journey.mjs')
}
if (!pkg.scripts?.check?.includes('npm run audit:entry-review-journey')) {
  errors.push('npm run check does not include audit:entry-review-journey')
}
if (!pkg.scripts?.['lint:foundation']?.includes('scripts/check-stage-entry-review-journey.mjs')) {
  errors.push('lint:foundation does not include scripts/check-stage-entry-review-journey.mjs')
}

const migrationsDir = path.join(root, 'supabase/migrations')
const migrations = fs.readdirSync(migrationsDir).filter(name => name.endsWith('.sql'))
if (migrationSequenceError(migrations)) errors.push(migrationSequenceError(migrations))

if (errors.length > 0) {
  console.error(`STAGE-ENTRY-AND-REVIEW-JOURNEY-1 audit failed with ${errors.length} issue(s):\n`)
  for (const error of errors) console.error(`  - ${error}`)
  process.exit(1)
}

console.log('Stage STAGE-ENTRY-AND-REVIEW-JOURNEY-1 audit passed.')
console.log('Journey: Home clarity, Review Picks, Welcome, Invite/Join, resolver prompts, joker confirmation, locked snapshots and no-flicker states recorded.')
console.log('Safety: docs/audit-only; no runtime UI, route, scoring, resolver, Supabase, Auth, result-entry or migration change.')
console.log(`Database: ${migrations.length} active migrations, sequentially numbered with no gaps.`)
