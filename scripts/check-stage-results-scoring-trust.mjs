import { migrationSequenceError } from './lib/migrationSequenceGuard.mjs'
// STAGE-RESULTS-AND-SCORING-TRUST-1 audit — Results and scoring trust contract.
//
// This guard is intentionally docs/audit-only. It verifies that results status,
// scoring explanations, correction/recalculation copy, leaderboard freshness and
// simulated-result separation are recorded without introducing runtime UI, route,
// Auth, Supabase, scoring, resolver, result-entry, fake-result write or migration changes.
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

const stageDoc = 'docs/STAGE-RESULTS-AND-SCORING-TRUST-1.md'
const contractDoc = 'docs/RESULTS-AND-SCORING-TRUST-CONTRACT.md'
const register = 'docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md'
const ledger = 'docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md'
const agentRules = 'docs/EURO28-AGENT-RULES-AND-ROADMAP.md'
const roadmap = 'docs/PRODUCT-COMPLETENESS-ROADMAP.md'
const batchOrder = 'docs/STREAMLINED-BATCH-ORDER.md'
const pkgFile = 'package.json'

for (const file of [stageDoc, contractDoc, register, ledger, agentRules, roadmap, batchOrder, pkgFile]) {
  if (!exists(file)) errors.push(`${file} is missing.`)
}

const trustMarkers = [
  'results status wording',
  'scoring explanation',
  'correction/recalculation wording',
  'why did I get these points? clarity',
  'Original vs KO points separation',
  'admin result-entry trust copy',
  'pending/delayed/postponed/suspended/abandoned/replay states',
  'leaderboard freshness wording',
  'fake/simulated result separation',
  'public signup still closed until implementation gates are complete',
]
for (const marker of trustMarkers) {
  requireText(stageDoc, marker, 'stage doc must lock the results/scoring trust target')
  requireText(contractDoc, marker, 'contract doc must preserve the results/scoring trust target')
}

const resultStateMarkers = [
  'pending result',
  'delayed match',
  'postponed match',
  'suspended match',
  'abandoned match',
  'replay required',
  'result pending official confirmation',
  'recalculation pending',
  'recalculation complete',
]
for (const marker of resultStateMarkers) {
  requireText(contractDoc, marker, 'all result and recalculation states must be explicit')
}

const boundaryMarkers = [
  'Original Predictor and KO Predictor are separate competitions',
  'correct-score and correct-result points are not cumulative',
  'group goals are auto-calculated only from the 36 group-score predictions',
  'must not award or describe final points until the official result state is valid',
  'Admin Scenario Runner output, fake scores, testing seeds and simulated results',
  'never award real points',
  'never pollute production',
  'never write to canonical official results',
  'no Migration 019',
]
for (const marker of boundaryMarkers) {
  requireText(contractDoc, marker, 'results/scoring trust safety boundary must be explicit')
}

for (const file of [register, ledger, agentRules, roadmap, batchOrder]) {
  requireText(file, 'STAGE-RESULTS-AND-SCORING-TRUST-1', 'live docs must record the Results and Scoring Trust stage')
  requireText(file, 'results status wording', 'live docs must carry results status wording')
  requireText(file, 'scoring explanation', 'live docs must carry scoring explanation wording')
  requireText(file, 'correction/recalculation wording', 'live docs must carry correction/recalculation wording')
  requireText(file, 'why did I get these points? clarity', 'live docs must carry points-explanation wording')
  requireText(file, 'fake/simulated result separation', 'live docs must carry simulated-result separation wording')
  requireText(file, 'Public signup remains closed', 'live docs must preserve closed signup state')
  requireText(file, 'Migration 019', 'live docs must preserve migration boundary')
}

const pkg = JSON.parse(read(pkgFile))
if (pkg.scripts?.['audit:results-scoring-trust'] !== 'node scripts/check-stage-results-scoring-trust.mjs') {
  errors.push('audit:results-scoring-trust is not wired to scripts/check-stage-results-scoring-trust.mjs')
}
if (!pkg.scripts?.check?.includes('npm run audit:results-scoring-trust')) {
  errors.push('npm run check does not include audit:results-scoring-trust')
}
if (!pkg.scripts?.['lint:foundation']?.includes('scripts/check-stage-results-scoring-trust.mjs')) {
  errors.push('lint:foundation does not include scripts/check-stage-results-scoring-trust.mjs')
}

const migrationsDir = path.join(root, 'supabase/migrations')
const migrations = fs.readdirSync(migrationsDir).filter(name => name.endsWith('.sql'))
if (migrationSequenceError(migrations)) errors.push(migrationSequenceError(migrations))

if (errors.length > 0) {
  console.error(`STAGE-RESULTS-AND-SCORING-TRUST-1 audit failed with ${errors.length} issue(s):\n`)
  for (const error of errors) console.error(`  - ${error}`)
  process.exit(1)
}

console.log('Stage STAGE-RESULTS-AND-SCORING-TRUST-1 audit passed.')
console.log('Trust: results statuses, scoring explanations, corrections/recalculations, leaderboard freshness and simulated-result separation recorded.')
console.log('Safety: docs/audit-only; no runtime UI, route, Auth, Supabase, scoring, resolver, result-entry, fake-result write or migration change.')
console.log(`Database: ${migrations.length} active migrations, sequentially numbered with no gaps.`)
