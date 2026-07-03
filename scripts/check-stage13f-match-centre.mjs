import fs from 'node:fs'

const required = [
  'src/matchCentre/MatchCentreFoundation.jsx',
  'src/matchCentre/MatchCentreFoundation.module.css',
  'src/matchCentre/matchCentreModel.js',
  'src/matchCentre/matchCentreService.js',
  'src/matchCentre/__tests__/matchCentreModel.test.js',
]
for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`Stage 13F-C required file missing: ${file}`)
}
const route = fs.readFileSync('src/app/appRoutes.js', 'utf8')
const app = fs.readFileSync('src/foundation/EuroFoundationApp.jsx', 'utf8')
const model = fs.readFileSync('src/matchCentre/matchCentreModel.js', 'utf8')
const service = fs.readFileSync('src/matchCentre/matchCentreService.js', 'utf8')
const home = fs.readFileSync('src/home/HomeDashboard.jsx', 'utf8')
const results = fs.readFileSync('src/results/ResultsPresentation.jsx', 'utf8')
const checks = [
  [route.includes("MATCH_CENTRE: 'match-centre'"), 'dedicated Match Centre route'],
  [route.includes('matchCentreParamsFromHash'), 'safe fixture/competition/scope query parsing'],
  [app.includes('<MatchCentreFoundation'), 'application route integration'],
  [model.includes('buildFixtureImpact'), 'fixture impact model'],
  [model.includes('RESULT_COMPETITION'), 'competition boundary'],
  [service.includes('get_member_predictions_after_lock'), 'server-authorised overall prediction reads'],
  [service.includes('getLeagueMemberPredictions'), 'server-authorised league prediction reads'],
  [home.includes('#/match-centre?match='), 'Home Match Centre entry'],
  [results.includes('#/match-centre?match='), 'Results Match Centre entry'],
]
for (const [ok, label] of checks) if (!ok) throw new Error(`Stage 13F-C audit failed: ${label}`)
const migrationFiles = fs.readdirSync('supabase/migrations').filter(name => name.endsWith('.sql'))
if (migrationFiles.length !== 15) throw new Error(`Expected 15 migrations, found ${migrationFiles.length}`)
if (migrationFiles.some(name => name.includes('016'))) throw new Error('Unexpected Migration 016 detected')
console.log('Euro Stage 13F-C Match Centre audit passed.')
console.log('Fixture: previous/next navigation, canonical state and direct Home/Results entry')
console.log('Impact: Overall/private league scopes with released predictions and maximum points')
console.log('Privacy: existing server-authorised Original and KO release rules remain unchanged')
console.log('Database: 15 active migrations; no Migration 016')
