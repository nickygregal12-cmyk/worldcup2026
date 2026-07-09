import { migrationSequenceError } from './lib/migrationSequenceGuard.mjs'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const errors = []
const fail = message => errors.push(message)
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')
const exists = relativePath => fs.existsSync(path.join(root, relativePath))

for (const file of [
  'src/config/tournament.js',
  'src/app/appRoutes.js',
  'src/app/EuroAppShell.jsx',
  'src/App.jsx',
  'src/tournament/TournamentOverview.jsx',
  'src/tournament/tournamentPageModel.js',
  'docs/STAGE-1-TOURNAMENT-MODEL.md',
  'docs/STAGE-13G-B-TOURNAMENT-HOW-TO-PLAY-SPLIT.md',
]) {
  if (!exists(file)) fail(`Required Stage 13G-B Tournament split file is missing: ${file}`)
}

const config = read('src/config/tournament.js')
for (const marker of [
  "tournamentEndAt: import.meta.env.VITE_TOURNAMENT_END_AT || '2028-07-09T22:59:59.000Z'",
  'confirmedFacts',
  "tournamentStartDate: '2028-06-09'",
  "tournamentEndDate: '2028-07-09'",
  'Northern Ireland is not a final-schedule host nation',
  'thirdPlacePlayoff: false',
  'Match-specific kick-off times remain unconfirmed',
]) {
  if (!config.includes(marker)) fail(`Tournament config is missing confirmed fact marker: ${marker}`)
}

// Venue facts moved into the database (Migration 021): client config must not carry a
// venue list, and the Tournament page must render the foundation's public.venues rows.
for (const forbidden of ['OFFICIAL_EURO_2028_VENUES', "hostNation: 'England'", 'Wembley Stadium']) {
  if (config.includes(forbidden)) fail(`Tournament config must not hardcode venue facts: ${forbidden}`)
}
const venueMigration = read('supabase/migrations/202607090021_euro28_venue_metadata.sql')
for (const marker of ['add column if not exists metadata jsonb', "('hampden-park', 'Scotland')", "('dublin-arena', 'Republic of Ireland')"]) {
  if (!venueMigration.includes(marker)) fail(`Venue metadata migration is missing: ${marker}`)
}
const tournamentPage = read('src/tournament/tournamentPageModel.js')
for (const marker of ['foundation.venues', 'foundation.keyFixtures', 'Host nation not recorded']) {
  if (!tournamentPage.includes(marker)) fail(`Tournament page model must render database venues: ${marker}`)
}

const routes = read('src/app/appRoutes.js')
for (const marker of [
  "HOW_TO_PLAY: 'how-to-play'",
  "hash: '#/how-to-play'",
  "['/how-to-play', APP_ROUTE.HOW_TO_PLAY]",
  "['/rules', APP_ROUTE.HOW_TO_PLAY]",
]) {
  if (!routes.includes(marker)) fail(`How to Play route contract is missing: ${marker}`)
}

const app = read('src/App.jsx')
for (const marker of [
  'HowToPlayOverview',
  'route === APP_ROUTE.HOW_TO_PLAY',
  '<HowToPlayOverview foundation={appData} />',
]) {
  if (!app.includes(marker)) fail(`Application route composition is missing: ${marker}`)
}

const shell = read('src/app/EuroAppShell.jsx')
for (const marker of [
  'Hosts, venues, dates and format',
  'Scoring, locks and predictor rules',
  'destinationForRoute(APP_ROUTE.HOW_TO_PLAY)',
  '<a href="#/how-to-play">How to play</a>',
]) {
  if (!shell.includes(marker)) fail(`Shell navigation copy is missing: ${marker}`)
}

const model = read('src/tournament/tournamentPageModel.js')
for (const marker of [
  'buildTournamentPageModel',
  'buildHowToPlayPageModel',
  'EURO_SCORING_CONFIG',
  'TOURNAMENT_CONFIG',
  'Qualifying under way',
  'Everyone starts the knockouts on zero.',
  'Original Predictor comparisons unlock after the global tournament lock',
]) {
  if (!model.includes(marker)) fail(`Tournament model is missing marker: ${marker}`)
}

const component = read('src/tournament/TournamentOverview.jsx')
for (const marker of [
  'HowToPlayOverview',
  'buildTournamentPageModel',
  'buildHowToPlayPageModel',
  'href="#/how-to-play"',
  'href="#/tournament"',
  'Tournament facts',
  'Mechanics only',
]) {
  if (!component.includes(marker)) fail(`Tournament component is missing marker: ${marker}`)
}
for (const forbidden of ['why can\'t I see real teams', 'Why can\'t I see real teams', 'why can’t I see real teams', 'Why can’t I see real teams']) {
  if (component.includes(forbidden) || model.includes(forbidden)) fail(`Defensive real-team FAQ framing must not be used: ${forbidden}`)
}

const stage1 = read('docs/STAGE-1-TOURNAMENT-MODEL.md')
for (const marker of [
  'Confirmed UEFA 2028 facts',
  '9 June 2028 to 9 July 2028',
  'England, Scotland, Wales and Republic of Ireland',
  'Northern Ireland is not a final-schedule host nation',
  'National Stadium of Wales in Cardiff',
  'Wembley Stadium, London',
  'Group participants and match-specific kick-off times remain unconfirmed',
]) {
  if (!stage1.includes(marker)) fail(`Stage 1 doc is missing confirmed fact marker: ${marker}`)
}

for (const [file, markers] of Object.entries({
  'docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md': ['Stage 13G-B-TOURNAMENT-1', '`#/how-to-play`', 'Match Centre remains a later focused batch'],
  'docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md': ['Tournament/How to Play split', 'Dedicated `#/how-to-play` destination', 'Canonical tournament facts'],
  'docs/EURO28-AGENT-RULES-AND-ROADMAP.md': ['Stage 13G-B-TOURNAMENT-1', '`#/tournament` is the football facts destination', '`#/how-to-play` is the predictor mechanics destination'],
  'docs/EURO28-DESIGN-CHARTER.md': ['Tournament, How to Play', 'How to Play is a separate mechanics lookup destination'],
  'docs/STAGE-13G-0-INFORMATION-ARCHITECTURE-AND-COHERENT-UI-SCOPE.md': ['| Tournament | `#/tournament`', '| How to play | `#/how-to-play`'],
})) {
  const text = read(file)
  for (const marker of markers) {
    if (!text.includes(marker)) fail(`${file} is missing Stage 13G-B split marker: ${marker}`)
  }
}

const packageJson = JSON.parse(read('package.json'))
if (packageJson.scripts?.['audit:stage13g-tournament-how-to-play-split'] !== 'node scripts/check-stage13g-tournament-how-to-play-split.mjs') {
  fail('audit:stage13g-tournament-how-to-play-split is not wired correctly')
}
if (!packageJson.scripts?.check?.includes('npm run audit:stage13g-tournament-how-to-play-split')) {
  fail('npm run check does not include audit:stage13g-tournament-how-to-play-split')
}

const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(name => name.endsWith('.sql'))
if (migrationSequenceError(migrations)) fail(migrationSequenceError(migrations))

if (errors.length) {
  console.error('Euro Stage 13G-B Tournament/How to Play split audit failed:')
  errors.forEach(error => console.error(`- ${error}`))
  process.exit(1)
}

console.log('Euro Stage 13G-B Tournament/How to Play split audit passed.')
console.log('Routes: Tournament facts and How to Play mechanics are separate More/footer destinations.')
console.log('Facts: confirmed dates, hosts, venues, Cardiff opener and Wembley final week are centralised in TOURNAMENT_CONFIG.')
console.log('Unconfirmed: group participants and match-specific kick-off times remain explicitly provisional.')
console.log(`Database: ${migrations.length} active migrations, sequentially numbered with no gaps.`)
