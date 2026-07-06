import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const errors = []
const fail = message => errors.push(message)
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

const playerFacingFiles = [
  'src/home/HomeDashboard.jsx',
  'src/home/homeDashboardModel.js',
  'src/auth/AccountAccess.jsx',
  'src/auth/AccountDashboard.jsx',
  'src/auth/publicSignupReadiness.js',
  'src/tournament/tournamentPageModel.js',
  'src/journey/GroupsPredictor.jsx',
  'src/journey/OriginalBracket.jsx',
  'src/journey/PredictionJourneyView.jsx',
  'src/journey/predictionJourneyCopy.js',
  'src/koPredictor/KoPredictorMatchCentre.jsx',
  'src/koPredictor/koPredictorPresentationModel.js',
  'src/results/ResultsAndLeaderboards.jsx',
  'src/results/ResultsPresentation.jsx',
  'src/results/resultModel.js',
  'src/leagues/Leagues.jsx',
  'src/leagues/leagueModel.js',
  'src/matchCentre/MatchCentre.jsx',
  'src/matchCentre/matchCentreModel.js',
  'src/player/playerInsightModel.js',
]

const sources = Object.fromEntries(playerFacingFiles.map(file => [file, read(file)]))
const combined = Object.values(sources).join('\n')
const combinedLower = combined.toLowerCase()

const requiredPlainCopy = [
  ['top two teams qualify', 'best third-place teams'],
  ['group predictions decide this bracket', 'live results will not change'],
  ['winner picks only', 'scores and jokers are handled'],
  ['team that goes through', 'scores and methods are not needed'],
  ['follow official results', 'saved predictions'],
  ['live scores', 'shown separately from your picks'],
  ['track original predictor', 'own points race'],
  ['once picks lock', 'no longer available'],
  ['simple guide', 'account privacy'],
]

for (const fragments of requiredPlainCopy) {
  if (!fragments.every(fragment => combinedLower.includes(fragment))) fail(`Plain player-facing replacement copy is missing fragments: ${fragments.join(' + ')}`)
}


const forbiddenExact = [
  'Predicted context',
  'Your permanent pre-tournament bracket',
  'Your predicted bracket — built from your predicted tables, never blended with live results',
  'Winner picks only — scores and jokers live in the KO Predictor',
  'Scoring boundary',
  '0 bracket jokers',
  'Pick only who advances. No scores or methods are stored here.',
  'One ruleset everywhere',
  'Original and KO Predictor totals are never combined.',
  'Original and KO Predictor totals never combine.',
  'Live results never blend with predicted brackets.',
  'Live scores, confirmed results and corrections are kept separate from every prediction context.',
  'Live knockout bracket',
  'All 15 positions are shown. Unresolved participants stay marked TBC.',
  'Hidden after lock in the live UI. The Original Predictor is locked.',
  'Guest predictions saved on this device stay here.',
  'Everything a new player needs before signing up',
  'The same shared table model feeds',
  'model feeds',
  'predicted tables now feed',
  'race context',
  'Fixture context',
  'Real fixture context',
  'Competition boundary',
  'atomic saving',
  'central provisional Euro 2028 lock configuration',
  'euro28-prediction-journey-v3',
]

for (const [file, source] of Object.entries(sources)) {
  for (const phrase of forbiddenExact) {
    if (source.includes(phrase)) fail(`${file} still contains internal/spec-like player copy: ${phrase}`)
  }
}

const originalBracket = sources['src/journey/OriginalBracket.jsx']
if ((originalBracket.match(/KO Predictor/g) ?? []).length !== 1) fail('Original Bracket should still mention KO Predictor exactly once')
for (const forbidden of ['ScoreInput', 'decisionMethod', 'jokerApplied', 'ko-method', 'ko-joker-button']) {
  if (originalBracket.includes(forbidden)) fail(`Original Bracket must remain winner-only and not contain ${forbidden}`)
}

const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(name => name.endsWith('.sql'))
if (migrations.length !== 18) fail(`Expected 18 active migrations, found ${migrations.length}`)
if (migrations.some(name => /(?:^|_)019|2026070\d0019/.test(name))) fail('Migration 019 must not exist for player-facing copy sweep')

const packageJson = JSON.parse(read('package.json'))
if (packageJson.scripts?.['audit:player-facing-copy-sweep-2'] !== 'node scripts/check-stage-player-facing-copy-sweep-2.mjs') {
  fail('package.json missing audit:player-facing-copy-sweep-2 script')
}
if (!packageJson.scripts?.check?.includes('npm run audit:player-facing-copy-sweep-2')) {
  fail('npm run check must include audit:player-facing-copy-sweep-2')
}

if (errors.length) {
  console.error('Stage PLAYER-FACING-COPY-SWEEP-2 audit failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Stage PLAYER-FACING-COPY-SWEEP-2 audit passed.')
console.log('Copy: player-facing surfaces use plain language instead of spec/internal wording.')
console.log('Boundary: Original Predictor and KO Predictor remain separate without implementation copy.')
console.log('Safety: copy/docs/audit only; no scoring, resolver, Supabase write, Auth or migration change.')
console.log('Database: active migrations remain 18; no Migration 019.')
