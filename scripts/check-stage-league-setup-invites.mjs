import { migrationSequenceError } from './lib/migrationSequenceGuard.mjs'
// League setup and invites — RE-DERIVED at the DP-LEAGUES re-cut (owner ruling 2026-07-15: re-derive,
// do not retire).
//
// The original guard was docs-only: it asserted prose in seven documents, one of which
// (STAGE-LEAGUE-SETUP-AND-INVITES-1) is now archived, and proved nothing about the UI. This version
// asserts the DESIGNED ENTRY-POINT STATES that actually ship in source — the create-league and
// join-league flows plus the invite copy/share affordances. Product Experience v3 removed the old
// disabled Settings scaffold: a control must either work or stay out of the interface. The full
// Settings/Manage sheet remains a separately scheduled route upgrade. The behavioural contract still
// lives in the LIVING docs/LEAGUE-SETUP-AND-INVITES-CONTRACT.md,
// which this guard continues to police; the archived stage record is no longer a dependency.
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

const presentation = 'src/leagues/LeaguePresentation.jsx'
const leaguesPage = 'src/leagues/Leagues.jsx'
const contractDoc = 'docs/LEAGUE-SETUP-AND-INVITES-CONTRACT.md'
const pkgFile = 'package.json'

// ── The designed entry-point states, asserted STRUCTURALLY in source ──
// Structure/handlers, never the button/label copy (which marker-hygiene rightly forbids duplicating).
// Create-league and join-league flows live in the manage panel, wired to their submit handlers.
for (const marker of [
  'export function LeagueManagePanel',
  'onSubmit={onSubmitCreate}',
  'onSubmit={onSubmitJoin}',
]) {
  requireText(presentation, marker, 'the create/join league entry-point flow must ship in source')
}

// Invite copy/share affordances — re-pointed at the PROTOTYPE-PACK-CONSOLIDATION-1 full-redesign
// ruling (2026-07-18): the actions card is retired; share and copy-invite live directly on the
// league identity card, wired to the share-action handlers.
for (const marker of [
  'aria-label="Share league"',
  'aria-label="Copy invite code"',
  'void onShare()',
  'void onCopyCode()',
]) {
  requireText(presentation, marker, 'the invite/share entry-point states must ship in source')
}

// Signed-out continuation: the page routes signed-out users to sign-in rather than exposing a broken
// create/join. Asserted by the guarded structure, not the sentence.
requireText(leaguesPage, '!loadingSession && !session?.user &&', 'the signed-out league continuation state must ship in source')

// ── The behavioural contract still lives in the LIVING contract doc ──
for (const marker of [
  'valid invite',
  'already a member',
  'invalid code',
  'expired code',
  'full league',
  'Join codes do not bypass signup/auth gates',
  'Original Predictor and KO Predictor standings remain separate',
]) {
  requireText(contractDoc, marker, 'the league setup/invite behavioural contract must stay explicit')
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
  console.error(`League setup and invites audit failed with ${errors.length} issue(s):\n`)
  for (const error of errors) console.error(`  - ${error}`)
  process.exit(1)
}

console.log('League setup and invites audit passed.')
console.log('Source: create-league and join-league flows plus invite copy/share ship as working entry points; no disabled Settings scaffold is required.')
console.log('Contract: the behavioural spec (invite-code states, signup-gate and Original/KO separation) stays explicit in the living contract doc.')
console.log(`Database: ${migrations.length} active migrations, sequentially numbered with no gaps.`)
