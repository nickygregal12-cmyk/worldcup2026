// Stage 13G-C3 — re-pointed at the DP re-cut (Stage DP-LEAGUES, 2026-07-15).
//
// C3 originally proved a "race summary strip" backed by buildLeagueRaceSummary. That model was
// dead (no renderer, no importer) and is deleted in this commit. The living invariant it now
// guards is the DESIGNED NOT-YET STATE for rank movement (owner ruling 2026-07-15): with no
// previous-rank history, movement is stated ONCE per table using RANK_MOVEMENT_PENDING_REASON and
// gap-to-leader is static text — never an empty per-row movement chip. Tightened, not loosened:
// the dead model and the per-row chip are both forbidden.
import { migrationSequenceError } from './lib/migrationSequenceGuard.mjs'
import { existsSync, readdirSync, readFileSync } from 'node:fs'

const failures = []

function fail(message) {
  failures.push(message)
}

function read(path) {
  if (!existsSync(path)) {
    fail(`${path} is missing`)
    return ''
  }
  return readFileSync(path, 'utf8')
}

const model = read('src/leagues/leagueModel.js')
const presentation = read('src/leagues/LeaguePresentation.jsx')
const packageJson = JSON.parse(read('package.json') || '{}')

const migrations = existsSync('supabase/migrations')
  ? readdirSync('supabase/migrations').filter(name => name.endsWith('.sql'))
  : []

// The not-yet reason string lives in the model and is rendered once per table.
for (const marker of [
  'RANK_MOVEMENT_PENDING_REASON',
  'rankMovementLabel: null',
]) {
  if (!model.includes(marker)) fail(`leagueModel.js missing not-yet-state marker: ${marker}`)
}

// The dead race-summary model must stay deleted.
if (model.includes('buildLeagueRaceSummary')) {
  fail('leagueModel.js still exports the dead buildLeagueRaceSummary (no renderer, no importer) — it must stay deleted')
}

// The presentation renders the not-yet movement note once (guarded by hasScoring), and the gap
// as static text — not a per-row movement chip.
for (const marker of [
  'raceStyles.movementNote',
  'RANK_MOVEMENT_PENDING_REASON',
  'buildLeagueRaceRows',
]) {
  if (!presentation.includes(marker)) fail(`LeaguePresentation.jsx missing not-yet-state marker: ${marker}`)
}

for (const forbidden of [
  'raceStyles.movementChip',   // per-row movement chips are the exact not-yet-scaffold this state replaces
  'buildLeagueRaceSummary',
]) {
  if (presentation.includes(forbidden)) fail(`LeaguePresentation.jsx must not render the superseded marker: ${forbidden}`)
}

if (packageJson.scripts?.['audit:league-race-summary'] !== 'node scripts/check-stage13g-c3-league-race-summary.mjs') {
  fail('package.json missing audit:league-race-summary script')
}

if (!packageJson.scripts?.check?.includes('npm run audit:league-race-summary')) {
  fail('package.json check chain must include audit:league-race-summary')
}

if (migrationSequenceError(migrations)) fail(migrationSequenceError(migrations))

if (failures.length > 0) {
  console.error('Stage 13G-C3 league race-story not-yet-state audit failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Stage 13G-C3 passed: rank movement is a designed not-yet state (once per table), gap is static text, and the dead race-summary model stays deleted.')
