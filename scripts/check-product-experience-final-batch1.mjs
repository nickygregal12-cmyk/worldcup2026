import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const errors = []
const fail = message => errors.push(message)
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const exists = file => fs.existsSync(path.join(root, file))

const requiredFiles = [
  'src/tournament/QualificationTables.jsx',
  'src/tournament/QualificationTables.module.css',
  'src/tournament/TournamentExperience.jsx',
  'src/tournament/TournamentExperience.module.css',
  'src/tournament/__tests__/QualificationTables.test.jsx',
  'src/tournament/__tests__/TournamentExperience.test.jsx',
  'src/results/ResultsExperience.jsx',
  'src/results/ResultsExperience.module.css',
  'src/results/resultsHubModel.js',
  'src/results/__tests__/ResultsExperience.test.jsx',
  'src/results/__tests__/resultsHubModel.test.js',
]
for (const file of requiredFiles) {
  if (!exists(file)) fail(`Final Product Experience batch-one file is missing: ${file}`)
}

const qualification = read('src/tournament/QualificationTables.jsx')
for (const marker of [
  'GroupStandingsTable',
  'ThirdPlaceQualificationTable',
  'qualifiesAsBestThird',
  "'Qualifies'",
  "'Outside'",
  'TeamLabel',
  'ranking.map',
]) {
  if (!qualification.includes(marker)) fail(`Shared qualification compound is missing: ${marker}`)
}

const groups = read('src/journey/GroupsPredictor.jsx')
for (const marker of ['GroupStandingsTable', 'ThirdPlaceQualificationTable', 'reference={reference}', 'euro28VenueHostIso']) {
  if (!groups.includes(marker)) fail(`Groups does not consume the shared qualification presentation: ${marker}`)
}
if (groups.includes('ranking.slice(0, 5)')) fail('Groups still hides the sixth third-place team.')
if (groups.includes('HOST_NATION_ISO') || groups.includes('VENUE_HOST_ISO')) fail('Groups still owns a page-local venue/host fact map.')

const results = read('src/results/ResultsAndLeaderboards.jsx')
if (!results.includes('<ResultsExperience')) fail('Results is not composed through the phase-aware experience.')
const resultsExperience = read('src/results/ResultsExperience.jsx')
for (const marker of ['QualificationTables', 'bestThird={liveSnapshot.bestThird}', 'data-results-experience="phase-aware"', '<details']) {
  if (!resultsExperience.includes(marker)) fail(`Results experience is missing its progressive tournament presentation: ${marker}`)
}

const tournament = read('src/tournament/TournamentExperience.jsx')
for (const marker of [
  'loadCanonicalTournamentSnapshot',
  'buildLiveTournamentSnapshot',
  '<QualificationTables',
  '<TeamLabel',
  'href="#/groups"',
  'href="#/results"',
  'href="#/bracket"',
  '#/match-centre?match=',
  'model.venues.map',
  'venue.hostNation',
]) {
  if (!tournament.includes(marker)) fail(`Tournament experience is missing: ${marker}`)
}

const app = read('src/App.jsx')
if (!app.includes('<TournamentOverview foundation={appData} client={activeClient} lifecycle={lifecycle} />')) {
  fail('Tournament is not composed with the canonical client and lifecycle.')
}

const pkg = JSON.parse(read('package.json'))
if (pkg.scripts?.['audit:product-experience-final-batch1'] !== 'node scripts/check-product-experience-final-batch1.mjs') {
  fail('audit:product-experience-final-batch1 is not wired correctly.')
}
if (!pkg.scripts?.check?.includes('npm run audit:product-experience-final-batch1')) {
  fail('npm run check does not enforce final Product Experience batch one.')
}
if (!pkg.scripts?.['lint:foundation']?.includes('scripts/check-product-experience-final-batch1.mjs')) {
  fail('lint:foundation does not lint the batch-one enforcement script.')
}

const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(file => file.endsWith('.sql'))
if (migrations.length !== 21) fail(`Final Product Experience batch one must not change migrations; found ${migrations.length}.`)

if (errors.length) {
  console.error('Final Product Experience batch-one audit failed:')
  errors.forEach(error => console.error(`- ${error}`))
  process.exit(1)
}

console.log('Final Product Experience batch-one audit passed.')
console.log('Shared qualification: Groups, Results and Tournament render the same six-team third-place contract.')
console.log('Tournament: canonical live snapshot, priority fixture, teams, qualification, dates, hosts and venues are present.')
console.log('Safety: no scoring, resolver, Supabase write, Auth or migration change is introduced.')
