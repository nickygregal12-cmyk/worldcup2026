import { migrationSequenceError } from './lib/migrationSequenceGuard.mjs'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const errors = []
const fail = message => errors.push(message)
const exists = file => fs.existsSync(path.join(root, file))
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

const requiredFiles = [
  'src/admin/AdminFixtureOperations.jsx',
  'src/admin/AdminMatchOperations.jsx',
  'src/admin/AdminScoringRecovery.jsx',
  'src/admin/AdminReadiness.jsx',
  'src/admin/AdminTournamentPicks.jsx',
  'src/admin/AdminAuditTimeline.jsx',
  'src/admin/AdminOperationsCompletion.module.css',
  'src/admin/adminFixtureModel.js',
  'src/admin/adminAuditModel.js',
  'src/admin/adminPresentation.js',
  'src/admin/__tests__/AdminOperationsCompletion.test.jsx',
  'src/admin/__tests__/adminFixtureModel.test.js',
  'src/admin/__tests__/adminAuditModel.test.js',
  'src/testFixtures/AdminControlRoomVisualFixture.jsx',
  'src/testFixtures/adminControlRoomVisualEntry.jsx',
  'src/testFixtures/__tests__/adminControlRoomVisualFixture.test.jsx',
  'visual-admin.html',
  'docs/archive/STAGE-13F-K2-EURO-CONTROL-ROOM-IMPLEMENTATION.md',
  'docs/design-baselines/stage13fk2/README.md',
]
for (const file of requiredFiles) if (!exists(file)) fail(`Stage 13F-K2 file is missing: ${file}`)

const operations = read('src/admin/AdminOperations.jsx')
for (const marker of [
  'Fixture schedule operations',
  'Operational readiness',
  'Scoring and recovery',
  'Tournament Picks',
  'Administrator audit',
  'Migration 018 active',
]) if (!operations.includes(marker)) fail(`AdminOperations is missing: ${marker}`)

const fixture = read('src/admin/AdminFixtureOperations.jsx')
for (const marker of [
  "adminRole === 'owner'",
  'only the tournament owner can change it',
  'updateAdminMatchFixture',
  'Fixture scheduling does not edit participants',
]) if (!fixture.includes(marker)) fail(`Fixture operations are missing: ${marker}`)

const scoring = read('src/admin/AdminScoringRecovery.jsx')
for (const marker of [
  "adminRole === 'owner'",
  'Reconcile all tournament points',
  'Original Predictor and KO Predictor totals remain separate',
  'reconcileAdminTournamentPoints',
]) if (!scoring.includes(marker)) fail(`Scoring recovery is missing: ${marker}`)

const picks = read('src/admin/AdminTournamentPicks.jsx')
for (const marker of [
  'Tournament Picks readiness',
  'no outcome-entry controls until Stage 17A',
  'One global Original Predictor lock',
  'No points or combined total',
]) if (!picks.includes(marker)) fail(`Tournament Picks readiness is missing: ${marker}`)

const audit = read('src/admin/AdminAuditTimeline.jsx')
for (const marker of [
  'Combined audit timeline',
  'Filter administrator operations',
  'payload.before',
  'payload.after',
  'payload.scoring_run_id',
]) if (!audit.includes(marker)) fail(`Admin audit presentation is missing: ${marker}`)

const service = read('src/admin/adminOperationsService.js')
for (const marker of [
  "client.rpc('admin_list_tournament_venues'",
  "client.rpc('admin_update_match_fixture'",
  "client.rpc('admin_reconcile_tournament_points'",
  'p_limit: 200',
]) if (!service.includes(marker)) fail(`Admin service is missing: ${marker}`)

if (operations.split('\n').length > 400) fail('AdminOperations.jsx exceeds the 400-line hard cap')
for (const file of [
  'src/admin/AdminFixtureOperations.jsx',
  'src/admin/AdminMatchOperations.jsx',
  'src/admin/AdminScoringRecovery.jsx',
  'src/admin/AdminReadiness.jsx',
  'src/admin/AdminTournamentPicks.jsx',
  'src/admin/AdminAuditTimeline.jsx',
]) if (read(file).split('\n').length > 400) fail(`${file} exceeds the 400-line hard cap`)

function pngDimensions(file) {
  const buffer = fs.readFileSync(path.join(root, file))
  if (buffer.length < 24 || buffer.toString('ascii', 1, 4) !== 'PNG') return null
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}
for (const [suffix, width, height] of [
  ['mobile-light-380x844.png', 380, 844],
  ['mobile-dark-380x844.png', 380, 844],
  ['tablet-light-768x1024.png', 768, 1024],
  ['tablet-dark-768x1024.png', 768, 1024],
  ['desktop-light-1200x1000.png', 1200, 1000],
  ['desktop-dark-1200x1000.png', 1200, 1000],
]) {
  const file = `docs/design-baselines/stage13fk2/admin-${suffix}`
  if (!exists(file)) { fail(`Stage 13F-K2 baseline is missing: ${file}`); continue }
  const dimensions = pngDimensions(file)
  if (!dimensions || dimensions.width !== width || dimensions.height !== height) fail(`${file} must be ${width}×${height}`)
}

const packageJson = JSON.parse(read('package.json'))
if (packageJson.scripts?.['audit:admin-completion'] !== 'node scripts/check-stage13fk-control-room.mjs') fail('audit:admin-completion is not wired correctly')
if (!packageJson.scripts?.check?.includes('npm run audit:admin-completion')) fail('npm run check omits audit:admin-completion')
if (!packageJson.scripts?.['lint:foundation']?.includes('scripts/check-stage13fk-control-room.mjs')) fail('lint:foundation omits the Stage 13F-K2 audit')

const verifier = read('scripts/verify-euro28-foundation-page.mjs')
for (const marker of ['Fixture schedule operations', 'Reconcile all tournament points', 'Tournament Picks readiness', 'Combined audit timeline']) {
  if (!verifier.includes(marker)) fail(`Deployed verifier is missing: ${marker}`)
}

const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(file => file.endsWith('.sql')).sort()
if (migrationSequenceError(migrations)) fail(migrationSequenceError(migrations))

if (errors.length) {
  console.error('Euro Stage 13F-K2 control-room audit failed:')
  errors.forEach(error => console.error(`- ${error}`))
  process.exit(1)
}

console.log('Euro Stage 13F-K2 control-room implementation audit passed.')
console.log('Roles: owners receive fixture and tournament-reconciliation actions; results admins remain read-only for those operations')
console.log('Readiness: schedule, participants, results, scoring, profiles, safeguards and Stage 17A Tournament Picks dependency are consolidated')
console.log('Audit: category filters and expandable append-only before/after and scoring-run evidence')
console.log('Responsive evidence: 380, 768 and 1200 pixel light/dark structural baselines')
console.log(`Database: ${migrations.length} active migrations; no Migration 019`)
