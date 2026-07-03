import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = file => readFileSync(path.join(root, file), 'utf8')
const fail = message => {
  console.error(message)
  process.exit(1)
}

const required = [
  ['package.json', 'audit:league-lifecycle'],
  ['package.json', 'npm run audit:league-lifecycle && npm run audit:architecture'],
  ['src/App.jsx', 'lifecycle={lifecycle} />'],
  ['src/leagues/Leagues.jsx', 'buildLeagueLifecycleState'],
  ['src/leagues/Leagues.jsx', 'LeagueLifecycleBanner'],
  ['src/leagues/Leagues.jsx', 'CompetitionLifecycleNote'],
  ['src/leagues/LeaguePresentation.jsx', 'buildLeagueCompetitionLifecycleCopy'],
  ['src/leagues/leagueModel.js', 'buildLeagueLifecycleState'],
  ['src/leagues/leagueModel.js', 'private_until_global_lock'],
  ['src/leagues/leagueModel.js', 'fixture_release_started'],
  ['src/player/playerComparisonModel.js', 'release: Object.freeze'],
  ['src/player/PlayerHeadToHead.jsx', 'Original picks release after the global lock'],
  ['src/leagues/__tests__/leagueModel.test.js', 'builds league lifecycle copy without combining Original and KO states'],
  ['src/player/__tests__/playerComparisonModel.test.js', 'model.release.copy'],
  ['docs/STAGE-13G-B-LEAGUE-LIFECYCLE.md', 'No database migration'],
  ['docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md', 'v1.28'],
]

for (const [file, token] of required) {
  if (!read(file).includes(token)) fail(`${file} is missing required token: ${token}`)
}

const migrationFiles = readdirSync(path.join(root, 'supabase/migrations')).filter(file => file.endsWith('.sql'))
if (migrationFiles.length !== 18) fail(`Expected 18 active migrations, found ${migrationFiles.length}`)
const latest = migrationFiles.sort().at(-1)
if (latest !== '202607030018_euro28_complete_admin_operations.sql') fail(`Unexpected latest migration: ${latest}`)
if (migrationFiles.some(file => file.includes('019'))) fail('Unexpected Migration 019 present')

console.log('Stage 13G-B league lifecycle audit passed.')
console.log('Leagues: central lifecycle banner and competition-scoped privacy copy')
console.log('Member comparison: Original global-lock release and KO fixture-by-fixture release remain separate')
console.log(`Active migrations: ${migrationFiles.length}`)
console.log(`Latest migration: ${latest}`)
