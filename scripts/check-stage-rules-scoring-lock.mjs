import { migrationSequenceError } from './lib/migrationSequenceGuard.mjs'
// STAGE-RULES-SCORING-LOCK-1 audit — locked product rules/scoring target.
//
// This guard is intentionally docs/audit-only. It verifies that the locked
// scoring/tiebreak contract is recorded without introducing runtime scoring,
// resolver, Supabase, Auth, result-entry or migration changes.
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

const stageDoc = 'docs/archive/STAGE-RULES-SCORING-LOCK-1.md'
const contractDoc = 'docs/RULES-SCORING-LOCKED-CONTRACT.md'
const register = 'docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md'
const ledger = 'docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md'
const agentRules = 'docs/EURO28-AGENT-RULES-AND-ROADMAP.md'
const roadmap = 'docs/PRODUCT-COMPLETENESS-ROADMAP.md'
const batchOrder = 'docs/STREAMLINED-BATCH-ORDER.md'
const pkgFile = 'package.json'

for (const file of [stageDoc, contractDoc, register, ledger, agentRules, roadmap, batchOrder, pkgFile]) {
  if (!exists(file)) errors.push(`${file} is missing.`)
}

const lockedScoringMarkers = [
  'Correct group match result | 3',
  'Correct group match score | 5 total, not cumulative',
  'Correct exact group position | 2 per team',
  'All 4 group positions correct in one group | +5 bonus',
  'Correct team in Round of 16 | 8 per team',
  'Correct team in Quarter-final | 12 per team',
  'Correct team in Semi-final | 15 per team',
  'Correct team in Final | 20 per team',
  'Correct Champion | +25 bonus',
  'Exact group-goals total | 25',
  'Group-goals total within 5 | 15',
  'Group-goals total within 10 | 5',
  'Correct top scorer | 30',
  'Correct advancer, any method | 5',
  'Correct draw call (level at 90) | 5',
  'Exact 90-minute score | 5',
  'Regulation match maximum | 10',
  'Extra-time match maximum | 15',
]
for (const marker of lockedScoringMarkers) {
  requireText(stageDoc, marker, 'stage doc must lock the scoring value')
  requireText(contractDoc, marker, 'contract doc must lock the scoring value')
}

const rulesMarkers = [
  'Group goals are auto-calculated only',
  'It is not manually editable in Review',
  'Change scores',
  'Pick positions',
  'best-third',
  'does not award extra points',
  'must not affect official real tournament tables',
  'Your group changes affected your bracket',
  'This joker will double the points you earn from this match',
  'Delayed, postponed, suspended, abandoned, replay-required and result-pending states do not score',
  'closest calculated group-stage goals total',
  'most exact KO scorelines',
]
for (const marker of rulesMarkers) {
  requireText(stageDoc, marker, 'stage doc must record locked edge-case/tiebreak behaviour')
}

for (const file of [register, ledger, agentRules, roadmap, batchOrder]) {
  requireText(file, 'STAGE-RULES-SCORING-LOCK-1', 'live docs must record the rules/scoring lock stage')
  requireText(file, 'group goals', 'live docs must carry the group-goals correction')
  requireText(file, 'Migration 019', 'live docs must preserve migration boundary')
}

const pkg = JSON.parse(read(pkgFile))
if (pkg.scripts?.['audit:rules-scoring-lock'] !== 'node scripts/check-stage-rules-scoring-lock.mjs') {
  errors.push('audit:rules-scoring-lock is not wired to scripts/check-stage-rules-scoring-lock.mjs')
}
if (!pkg.scripts?.check?.includes('npm run audit:rules-scoring-lock')) {
  errors.push('npm run check does not include audit:rules-scoring-lock')
}
if (!pkg.scripts?.['lint:foundation']?.includes('scripts/check-stage-rules-scoring-lock.mjs')) {
  errors.push('lint:foundation does not include scripts/check-stage-rules-scoring-lock.mjs')
}

const migrationsDir = path.join(root, 'supabase/migrations')
const migrations = fs.readdirSync(migrationsDir).filter(name => name.endsWith('.sql'))
if (migrationSequenceError(migrations)) errors.push(migrationSequenceError(migrations))

if (errors.length > 0) {
  console.error(`STAGE-RULES-SCORING-LOCK-1 audit failed with ${errors.length} issue(s):\n`)
  for (const error of errors) console.error(`  - ${error}`)
  process.exit(1)
}

console.log('Stage STAGE-RULES-SCORING-LOCK-1 audit passed.')
console.log('Rules: locked scoring, group-goals auto-calculation, resolver prompts, tied-rank ladders and match-state rules recorded.')
console.log('Safety: docs/audit-only; no runtime scoring, resolver, Supabase, Auth, result-entry or migration change.')
console.log(`Database: ${migrations.length} active migrations, sequentially numbered with no gaps.`)
