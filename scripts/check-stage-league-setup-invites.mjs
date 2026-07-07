import { migrationSequenceError } from './lib/migrationSequenceGuard.mjs'
// STAGE-LEAGUE-SETUP-AND-INVITES-1 audit — League setup and invites contract.
//
// This guard is intentionally docs/audit-only. It verifies that create league,
// join league, invite-code states, privacy copy and post-auth continuation are
// recorded without introducing runtime UI, route, Auth, Supabase, scoring,
// resolver, result-entry, league-write or migration changes.
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

const stageDoc = 'docs/STAGE-LEAGUE-SETUP-AND-INVITES-1.md'
const contractDoc = 'docs/LEAGUE-SETUP-AND-INVITES-CONTRACT.md'
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
  'create league flow',
  'join league flow',
  'invite-code states',
  'invalid/expired/full league states',
  'league privacy explanation',
  'empty league states',
  'member list clarity',
  'post-signup/post-login league continuation',
  'league share/invite copy',
  'public signup remains closed until implementation gates are complete',
]
for (const marker of journeyMarkers) {
  requireText(stageDoc, marker, 'stage doc must lock the league setup/invite target')
  requireText(contractDoc, marker, 'contract doc must preserve the league setup/invite target')
}

const inviteStateMarkers = [
  'valid invite',
  'already a member',
  'invalid code',
  'expired code',
  'full league',
  'league deleted/closed',
  'signed-out user who needs to continue after sign-in/sign-up',
]
for (const marker of inviteStateMarkers) {
  requireText(contractDoc, marker, 'all invite-code states must be explicit')
}

const boundaryMarkers = [
  'Join codes do not bypass signup/auth gates',
  'Original Predictor and KO Predictor standings remain separate',
  'league membership does not combine Original and KO points',
  'joining a league does not make late predictions valid',
  'Joining a league after lock should not remove valid pre-deadline prediction points',
  'must not skip the guest import prompt',
  'no league membership writes',
  'no Migration 019',
  'no Auth configuration change',
]
for (const marker of boundaryMarkers) {
  requireText(contractDoc, marker, 'league privacy/safety boundary must be explicit')
}

for (const file of [register, ledger, agentRules, roadmap, batchOrder]) {
  requireText(file, 'STAGE-LEAGUE-SETUP-AND-INVITES-1', 'live docs must record the League Setup and Invites stage')
  requireText(file, 'create league flow', 'live docs must carry create league flow wording')
  requireText(file, 'join league flow', 'live docs must carry join league flow wording')
  requireText(file, 'invite-code states', 'live docs must carry invite-code state wording')
  requireText(file, 'post-signup/post-login league continuation', 'live docs must carry post-auth continuation wording')
  requireText(file, 'Public signup remains closed', 'live docs must preserve closed signup state')
  requireText(file, 'Migration 019', 'live docs must preserve migration boundary')
}

const pkg = JSON.parse(read(pkgFile))
if (pkg.scripts?.['audit:league-setup-invites'] !== 'node scripts/check-stage-league-setup-invites.mjs') {
  errors.push('audit:league-setup-invites is not wired to scripts/check-stage-league-setup-invites.mjs')
}
if (!pkg.scripts?.check?.includes('npm run audit:league-setup-invites')) {
  errors.push('npm run check does not include audit:league-setup-invites')
}
if (!pkg.scripts?.['lint:foundation']?.includes('scripts/check-stage-league-setup-invites.mjs')) {
  errors.push('lint:foundation does not include scripts/check-stage-league-setup-invites.mjs')
}

const migrationsDir = path.join(root, 'supabase/migrations')
const migrations = fs.readdirSync(migrationsDir).filter(name => name.endsWith('.sql'))
if (migrationSequenceError(migrations)) errors.push(migrationSequenceError(migrations))

if (errors.length > 0) {
  console.error(`STAGE-LEAGUE-SETUP-AND-INVITES-1 audit failed with ${errors.length} issue(s):\n`)
  for (const error of errors) console.error(`  - ${error}`)
  process.exit(1)
}

console.log('Stage STAGE-LEAGUE-SETUP-AND-INVITES-1 audit passed.')
console.log('Leagues: create flow, join flow, invite-code states, privacy copy, empty/member states and post-auth continuation recorded.')
console.log('Safety: docs/audit-only; no runtime UI, route, Auth, Supabase, league-write, scoring, resolver, result-entry or migration change.')
console.log(`Database: ${migrations.length} active migrations, sequentially numbered with no gaps.`)
