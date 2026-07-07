import { migrationSequenceError } from './lib/migrationSequenceGuard.mjs'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const exists = file => fs.existsSync(path.join(root, file))
const fail = message => {
  console.error(`Stage 13G-B results lifecycle audit failed: ${message}`)
  process.exit(1)
}

const packageJson = JSON.parse(read('package.json'))
const checkScript = packageJson.scripts?.check ?? ''
if (!checkScript.includes('npm run audit:results-lifecycle')) fail('audit:results-lifecycle is not wired into npm run check')
if (packageJson.scripts?.['audit:results-lifecycle'] !== 'node scripts/check-stage13g-results-lifecycle.mjs') fail('audit:results-lifecycle script is missing')

const resultModel = read('src/results/resultModel.js')
const resultsUi = read('src/results/ResultsAndLeaderboards.jsx')
const matchModel = read('src/matchCentre/matchCentreModel.js')
const matchUi = read('src/matchCentre/MatchCentre.jsx')
const app = read('src/App.jsx')
const resultTests = read('src/results/__tests__/resultModel.test.js')
const matchTests = read('src/matchCentre/__tests__/matchCentreModel.test.js')
const ledger = read('docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md')
const roadmap = read('docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md')
const stageDoc = read('docs/STAGE-13G-B-RESULTS-LIFECYCLE.md')

if (!resultModel.includes('export function buildResultsLifecycle')) fail('results lifecycle model is missing')
if (!resultModel.includes('export function buildLeaderboardLifecycle')) fail('leaderboard lifecycle model is missing')
if (!matchModel.includes('export function buildMatchCentreLifecycle')) fail('Match Centre lifecycle model is missing')
if (!resultsUi.includes('buildResultsLifecycle') || !resultsUi.includes('buildLeaderboardLifecycle')) fail('Results/leaderboard UI is not using lifecycle models')
if (!matchUi.includes('buildMatchCentreLifecycle')) fail('Match Centre UI is not using lifecycle model')
if (!app.includes('lifecycle={lifecycle}') || !app.includes('<ResultsAndLeaderboards')) fail('central lifecycle is not passed to results surfaces')
if (!app.includes('<MatchCentre') || !app.includes('lifecycle={lifecycle}')) fail('central lifecycle is not passed to Match Centre')
if (!resultTests.includes('derives results lifecycle') || !resultTests.includes('keeps leaderboard lifecycle scoped by competition')) fail('results lifecycle tests are missing')
if (!matchTests.includes('derives Match Centre lifecycle')) fail('Match Centre lifecycle tests are missing')
if (!ledger.includes('v1.27') || !ledger.includes('Stage 13G-B Results lifecycle alignment')) fail('ledger v1.27 close-out is missing')
if (!roadmap.includes('Stage 13G-B Results lifecycle alignment')) fail('roadmap results lifecycle entry is missing')
if (!stageDoc.includes('No database migration') || !stageDoc.includes('no Migration 019')) fail('stage doc does not preserve no-migration boundary')

const migrationFiles = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(name => name.endsWith('.sql'))
const latest = migrationFiles.sort().at(-1)
if (migrationSequenceError(migrationFiles)) fail(migrationSequenceError(migrationFiles))

console.log('Stage 13G-B results lifecycle audit passed.')
console.log('Results surface: central pre-tournament, live, review, quiet and complete lifecycle state')
console.log('Leaderboards: Original and KO Predictor timing copy remains competition-scoped')
console.log('Match Centre: fixture-level live/review/completed/unresolved KO timing state')
console.log(`Active migrations: ${migrationFiles.length}`)
console.log(`Latest migration: ${latest}`)
