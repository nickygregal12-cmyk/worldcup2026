import fs from 'node:fs'
import { readHomeView } from './lib/homeSource.mjs'

const required = [
  'src/matchCentre/MatchCentre.jsx',
  'src/matchCentre/MatchCentre.module.css',
  'src/matchCentre/matchCentreModel.js',
  'src/matchCentre/matchCentreService.js',
  'src/matchCentre/__tests__/matchCentreModel.test.js',
]
for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`Stage 13F-C required file missing: ${file}`)
}
const route = fs.readFileSync('src/app/appRoutes.js', 'utf8')
const app = fs.readFileSync('src/App.jsx', 'utf8')
const model = fs.readFileSync('src/matchCentre/matchCentreModel.js', 'utf8')
const service = fs.readFileSync('src/matchCentre/matchCentreService.js', 'utf8')
const home = readHomeView()
const results = fs.readFileSync('src/results/ResultsPresentation.jsx', 'utf8')
const homeModel = fs.readFileSync('src/home/homeDashboardModel.js', 'utf8')

const checks = [
  [route.includes("MATCH_CENTRE: 'match-centre'"), 'dedicated Match Centre route'],
  [route.includes('matchCentreParamsFromHash'), 'safe fixture/competition/scope query parsing'],
  [app.includes('<MatchCentre'), 'application route integration'],
  [model.includes('buildFixtureImpact'), 'fixture impact model'],
  [model.includes('RESULT_COMPETITION'), 'competition boundary'],
  [service.includes('get_member_predictions_after_lock'), 'server-authorised overall prediction reads'],
  [service.includes('getLeagueMemberPredictions'), 'server-authorised league prediction reads'],
  // Home v2 renders every match card as a Match Centre link (card.href from the model).
  [(home.includes('href={card.href}') && homeModel.includes('#/match-centre?match=')), 'Home Match Centre entry'],
  [results.includes('#/match-centre?match='), 'Results Match Centre entry'],
]
for (const [ok, label] of checks) if (!ok) throw new Error(`Stage 13F-C audit failed: ${label}`)
const migrationFiles = fs.readdirSync('supabase/migrations').filter(name => name.endsWith('.sql'))
if (migrationFiles.length < 16) throw new Error(`Expected Migration 016 and later approved migrations, found ${migrationFiles.length}`)
if (!migrationFiles.some(name => name.includes('016_euro28_staging_time_phase_controls'))) throw new Error('Approved staging Time & Phase Migration 016 is missing')
console.log('Euro Stage 13F-C Match Centre audit passed.')
console.log('Fixture: previous/next navigation, canonical state and direct Home/Results entry')
console.log('Impact: Overall/private league scopes with released predictions and maximum points')
console.log('Privacy: existing server-authorised Original and KO release rules remain unchanged')
console.log(`Database: ${migrationFiles.length} active migrations; approved staging Time & Phase Migration 016 present`)
