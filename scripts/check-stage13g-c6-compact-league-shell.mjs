// Stage 13G-C6 — re-pointed twice: at the DP re-cut (2026-07-15), then at the
// PROTOTYPE-PACK-CONSOLIDATION-1 full-redesign ruling (2026-07-18). The prototype is the final
// design: the "League details" disclosure and actions card left the flow, Standings and Live
// activity are mutually exclusive views behind one toggle, the identity card carries share/copy,
// and league management (create/join/danger zone) lives in ONE place — the manage panel opened by
// the dashed entry actions. The anti-clutter markers are carried forward and extended.
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

const presentation = read('src/leagues/LeaguePresentation.jsx')
const leaguesPage = read('src/leagues/Leagues.jsx')
const cssModule = read('src/leagues/leagueRace.module.css')
const packageJson = JSON.parse(read('package.json') || '{}')

const migrations = existsSync('supabase/migrations')
  ? readdirSync('supabase/migrations').filter(name => name.endsWith('.sql'))
  : []

for (const marker of [
  'export function LeagueViewToggle',
  'export function LeagueActivityPanel',
  'podiumCutline',
]) {
  if (!presentation.includes(marker)) fail(`LeaguePresentation.jsx missing shell marker: ${marker}`)
}

for (const marker of [
  'LeagueViewToggle',
  'LeagueStandingsPanel',
  'standings={standings}',
  'buildLeagueActivityEntries',
]) {
  if (!leaguesPage.includes(marker)) fail(`Leagues.jsx missing shell marker: ${marker}`)
}

// One management surface: the manage panel (with the danger zone) is the only create/join
// location, and the retired League-details disclosure must not return to the flow.
if (!presentation.includes('dangerZone')) fail('The danger zone must live in the manage panel')
if ((leaguesPage.match(/<LeagueManagePanel/g) ?? []).length > 2) {
  fail('LeagueManagePanel must render in at most two places: the open panel and the empty-collection state')
}
if (leaguesPage.includes('LeagueSecondaryDetails')) {
  fail('The League details disclosure is retired from the Leagues flow (full-redesign ruling)')
}

for (const forbidden of [
  '<th>Groups</th>',
  '<th>Bracket</th>',
  '<th>Scored</th>',
  '<th>Match points</th>',
  '<MemberPicker',
  'Compare with member',
]) {
  if (leaguesPage.includes(forbidden) || presentation.includes(forbidden)) {
    fail(`Compact league shell must not contain default clutter marker: ${forbidden}`)
  }
}

for (const marker of [
  '.viewToggle',
  '.activityList',
  '.podiumCutline',
]) {
  if (!cssModule.includes(marker)) fail(`leagueRace.module.css missing shell class: ${marker}`)
}

if (packageJson.scripts?.['audit:compact-league-shell'] !== 'node scripts/check-stage13g-c6-compact-league-shell.mjs') {
  fail('package.json missing audit:compact-league-shell script')
}

if (!packageJson.scripts?.check?.includes('npm run audit:compact-league-shell')) {
  fail('package.json check chain must include audit:compact-league-shell')
}

if (migrationSequenceError(migrations)) fail(migrationSequenceError(migrations))

if (failures.length > 0) {
  console.error('Stage 13G-C6 compact league shell audit failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Stage 13G-C6 passed: compact shell — standings before League-details disclosure, summary inside it, code in the actions card.')
