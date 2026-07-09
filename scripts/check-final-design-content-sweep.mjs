import { migrationSequenceError } from './lib/migrationSequenceGuard.mjs'
// FINAL-DESIGN-CONTENT-SWEEP-1 audit — public UI content polish before seeded-team testing.
//
// This guard makes sure player-facing copy no longer carries internal process
// wording from signup gates, stage specs or implementation records, while keeping
// the stage presentation-only: no database, Auth, scoring or resolver change.
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
const forbidText = (file, marker, reason) => {
  if (exists(file) && has(file, marker)) errors.push(`${file} must not include "${marker}" — ${reason}.`)
}

const stageDoc = 'docs/archive/STAGE-FINAL-DESIGN-CONTENT-SWEEP-1.md'
const contractDoc = 'docs/FINAL-DESIGN-CONTENT-SWEEP-CONTRACT.md'
const register = 'docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md'
const ledger = 'docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md'
const agentRules = 'docs/EURO28-AGENT-RULES-AND-ROADMAP.md'
const roadmap = 'docs/PRODUCT-COMPLETENESS-ROADMAP.md'
const batchOrder = 'docs/archive/STREAMLINED-BATCH-ORDER.md'
const pkgFile = 'package.json'

for (const file of [stageDoc, contractDoc, register, ledger, agentRules, roadmap, batchOrder, pkgFile]) {
  if (!exists(file)) errors.push(`${file} is missing.`)
}

const stageMarkers = [
  'FINAL-DESIGN-CONTENT-SWEEP-1',
  'Design/content sweep before seeded-team testing',
  'Player-facing copy must read like finished product copy',
  'Signup opening and SMTP remain parked for future launch readiness',
  'Rules Hub wording is polished away from signup-gate language',
  'Tournament overview wording avoids implementation or placeholder phrasing',
  'Account and guest-transfer wording remains product-facing',
  'Admin Control Room may keep operational wording because it is a protected admin surface',
  'No schema, Auth, scoring, resolver, result-entry, fake-result, league-write or migration change is included',
  'Active migrations remain 18',
  'Migration 019 is not created',
  'WC26 production remains blocked',
  'Original Predictor and KO Predictor remain separate',
]
for (const marker of stageMarkers) {
  requireText(stageDoc, marker, 'stage doc must record the design/content sweep')
  requireText(contractDoc, marker, 'contract doc must preserve the sweep boundary')
}

// Decision Register, Ledger and Agent Rules are governing docs that must always reflect the
// live migration count (see check-governance-coherence.mjs); Roadmap and Batch Order are not,
// so they keep the frozen historical marker from when this stage actually completed.
const migrationsDir = path.join(root, 'supabase/migrations')
const migrations = fs.readdirSync(migrationsDir).filter(name => name.endsWith('.sql'))
const liveMigrationCountMarker = `Active migrations remain ${migrations.length}`

for (const file of [register, ledger, agentRules]) {
  requireText(file, 'FINAL-DESIGN-CONTENT-SWEEP-1', 'live docs must record the final design/content sweep')
  requireText(file, 'Design/content sweep marker: player-facing copy must read like finished product copy', 'live docs must record the product-copy marker')
  requireText(file, 'Signup opening and SMTP remain parked for future launch readiness', 'live docs must park the signup thread')
  requireText(file, liveMigrationCountMarker, 'live docs must record the current migration count')
  requireText(file, 'Migration 019', 'live docs must preserve migration boundary')
}

for (const file of [roadmap, batchOrder]) {
  requireText(file, 'FINAL-DESIGN-CONTENT-SWEEP-1', 'live docs must record the final design/content sweep')
  requireText(file, 'Design/content sweep marker: player-facing copy must read like finished product copy', 'live docs must record the product-copy marker')
  requireText(file, 'Signup opening and SMTP remain parked for future launch readiness', 'live docs must park the signup thread')
  requireText(file, 'Active migrations remain 18', 'live docs must preserve migration count')
  requireText(file, 'Migration 019', 'live docs must preserve migration boundary')
}

const readiness = buildPublicSignupReadiness()
if (readiness.isOpenForPublic !== false) errors.push('Design sweep must not open wider public registration.')
if (readiness.implementation?.publicRegistrationOpened !== false) errors.push('Design sweep must keep public registration closed.')
if (readiness.ownerDecisions?.initialCapacity?.userCap !== 50) errors.push('Design sweep must preserve the pre-SMTP 50-user cap.')
if (readiness.ownerDecisions?.initialCapacity?.leagueCap !== 20) errors.push('Design sweep must preserve the 20-league cap.')

const publicFiles = [
  'src/auth/publicSignupReadiness.js',
  'src/tournament/tournamentPageModel.js',
  'src/tournament/TournamentOverview.jsx',
  'src/journey/PredictionJourneyView.jsx',
  'src/matchCentre/matchCentreModel.js',
  'src/teamProfile/teamProfileModel.js',
  'src/home/HomeDashboard.jsx',
]
const retiredPublicCopy = [
  'Decision recorded',
  'Implementation recorded',
  'Privacy region',
  'Public registration still has safety checks',
  'Not open yet',
  'signup gate before wide registration',
  'Signup gate',
  'Owner decision',
  'Audited corrections',
  'operational audit evidence',
  'admin audit evidence',
  'audit note',
  'External result APIs remain deferred',
  'Tournament gate',
  'Using the current provisional Euro 2028 rules',
  'Server privacy gate',
  'privacy gates',
  'data-hosting region must be recorded',
  'RULES-1 closes',
  'current closed/dev stage',
  'external account and safety checks',
]
for (const file of publicFiles) {
  for (const marker of retiredPublicCopy) forbidText(file, marker, 'retired internal/provisional wording must not appear in player-facing copy')
}

const sourceForbidden = [
  'supabase/migrations/019',
  'create table',
  'alter table',
  'create policy',
  'drop policy',
  'service_role',
]
for (const file of ['src/auth/publicSignupReadiness.js', 'src/tournament/tournamentPageModel.js']) {
  const source = exists(file) ? read(file).toLowerCase() : ''
  for (const marker of sourceForbidden) {
    if (source.includes(marker)) errors.push(`${file} contains database/Auth machinery text "${marker}" but this is a copy sweep only.`)
  }
}

if (migrationSequenceError(migrations)) errors.push(migrationSequenceError(migrations))

const pkg = JSON.parse(read(pkgFile))
if (pkg.scripts?.['audit:final-design-content-sweep'] !== 'node scripts/check-final-design-content-sweep.mjs') {
  errors.push('audit:final-design-content-sweep is not wired to scripts/check-final-design-content-sweep.mjs')
}
if (!pkg.scripts?.check?.includes('npm run audit:final-design-content-sweep')) {
  errors.push('npm run check does not include audit:final-design-content-sweep')
}
if (!pkg.scripts?.['lint:foundation']?.includes('scripts/check-final-design-content-sweep.mjs')) {
  errors.push('lint:foundation does not include scripts/check-final-design-content-sweep.mjs')
}

if (errors.length > 0) {
  console.error(`FINAL-DESIGN-CONTENT-SWEEP-1 audit failed with ${errors.length} issue(s):\n`)
  for (const error of errors) console.error(`  - ${error}`)
  process.exit(1)
}

console.log('Stage FINAL-DESIGN-CONTENT-SWEEP-1 audit passed.')
console.log('Design/content: player-facing copy is polished for seeded-team testing; signup opening and SMTP remain parked.')
console.log('Safety: presentation/copy/docs/audit only; no Auth config, Supabase, scoring, resolver, fake-result, league-write or migration change.')
console.log(`Database: ${migrations.length} active migrations, sequentially numbered with no gaps.`)
