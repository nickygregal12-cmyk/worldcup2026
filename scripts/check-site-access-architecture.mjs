import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { readHomeView } from './lib/homeSource.mjs'

const root = process.cwd()
const errors = []
const fail = message => errors.push(message)
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')
const exists = relativePath => fs.existsSync(path.join(root, relativePath))

for (const file of [
  'docs/EURO28-PROJECT-CONSTITUTION.md',
  'docs/EURO28-SITE-ACCESS-MAP.md',
  'docs/archive/STAGE-13F-0-SITE-ACCESS-ARCHITECTURE.md',
  'src/app/appRoutes.js',
  'src/app/EuroAppShell.jsx',
  'src/app/MoreMenu.jsx',
  'src/home/HomeDashboard.jsx',
  'src/results/ResultsAndLeaderboards.jsx',
  'src/results/ResultsAccess.module.css',
]) {
  if (!exists(file)) fail(`Site-access file is missing: ${file}`)
}

const routes = read('src/app/appRoutes.js')
for (const marker of [
  "LEADERBOARDS: 'leaderboards'",
  "hash: '#/leaderboards'",
  "['/leaderboards', APP_ROUTE.LEADERBOARDS]",
  'leaderboardCompetitionFromHash',
  "KO_PREDICTOR: 'koPredictor'",
]) {
  if (!routes.includes(marker)) fail(`Leaderboard route contract is missing: ${marker}`)
}
if (routes.includes("['/leaderboards', APP_ROUTE.RESULTS]")) fail('Leaderboards must not remain an alias of Results')

const shell = read('src/app/EuroAppShell.jsx')
for (const marker of [
  'leaderboardsDestination',
  'leaderboardsDestination,',
]) {
  if (!shell.includes(marker)) fail(`Leaderboards access is missing from More: ${marker}`)
}
const moreMenu = read('src/app/MoreMenu.jsx')
if (!moreMenu.includes("destination.key === 'leaderboards'")) {
  fail('Leaderboards access is missing from grouped More directory')
}

const app = read('src/App.jsx')
for (const marker of [
  'route === APP_ROUTE.LEADERBOARDS',
  'view="results"',
  'view="leaderboards"',
  'leaderboardCompetitionFromHash(hashLocation.hash)',
]) {
  if (!app.includes(marker)) fail(`Application route composition is missing: ${marker}`)
}

// CW1 — Leaderboards is a More-nav destination, so the bottom nav never exposes
// it and Home is its only primary entry point. LeaderboardsCard replaced the
// single LinkButton at Stage DP-HOME: it carries BOTH competition deep links, as
// two rows that never merge into one tap, in every state including signed out.
// The rank strip is signed-in only, which is why it cannot be the entry point.
const home = readHomeView()
for (const marker of [
  '#/leaderboards?competition=original',
  '#/leaderboards?competition=koPredictor',
  'LeaderboardsCard',
  'Open full leaderboard',
]) {
  if (!home.includes(marker)) fail(`Home leaderboard access is missing: ${marker}`)
}

const results = read('src/results/ResultsAndLeaderboards.jsx')
for (const marker of [
  'RESULTS_PAGE_VIEW',
  'AccessSwitcher',
  'Leaderboard competition',
  'selectedLeaderboard',
  'selectedPoints',
  'history.replaceState',
  'Original Predictor',
  'KO Predictor',
]) {
  if (!results.includes(marker)) fail(`Results/leaderboards separation is missing: ${marker}`)
}
if (results.includes('combined leaderboard') || results.includes('combined total')) {
  fail('Results access must not introduce a combined competition table or total')
}

const accessMap = read('docs/EURO28-SITE-ACCESS-MAP.md')
for (const marker of [
  'five-position mobile navigation',
  '`#/results`',
  '`#/leaderboards`',
  '`#/leaderboards?competition=original`',
  '`#/leaderboards?competition=koPredictor`',
  'Admin',
  'Match Centre',
  'Bracket Health',
]) {
  if (!accessMap.includes(marker)) fail(`Site-access map is missing: ${marker}`)
}

const constitution = read('docs/EURO28-PROJECT-CONSTITUTION.md')
for (const marker of [
  'Approved disposable local Supabase environments',
  'Access is part of functionality',
  '`docs/EURO28-PROJECT-CONSTITUTION.md`',
]) {
  if (!constitution.includes(marker)) fail(`Project Constitution is missing: ${marker}`)
}

const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(name => name.endsWith('.sql'))
if (migrations.length < 16) fail(`Stage 13F-0 must retain Migration 016 and later approved migrations, found ${migrations.length}`)
if (!migrations.some(name => name.includes('016_euro28_staging_time_phase_controls'))) fail('Approved staging Time & Phase Migration 016 is missing')

const packageJson = JSON.parse(read('package.json'))
if (packageJson.scripts?.['audit:access'] !== 'node scripts/check-site-access-architecture.mjs') {
  fail('audit:access is not wired correctly')
}
if (!packageJson.scripts?.check?.includes('npm run audit:access')) {
  fail('npm run check does not include audit:access')
}
if (!packageJson.scripts?.['lint:foundation']?.includes('scripts/check-site-access-architecture.mjs')) {
  fail('The site-access audit is not included in the foundation lint gate')
}

if (errors.length) {
  console.error('Euro site-access architecture audit failed:')
  errors.forEach(error => console.error(`- ${error}`))
  process.exit(1)
}

console.log('Euro site-access architecture audit passed.')
console.log('Results: fixtures, live tables and live bracket have a dedicated destination')
console.log('Leaderboards: full Original and KO tables have a dedicated route and Home deep links')
console.log('Navigation: the five-position mobile lifecycle remains unchanged')
console.log(`Database: ${migrations.length} active migrations; approved staging Time & Phase Migration 016 present`)
