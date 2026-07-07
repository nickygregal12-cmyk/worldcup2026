import fs from 'node:fs'
import path from 'node:path'
import { ORIGINAL_BRACKET_CONTEXT_COPY, ORIGINAL_BRACKET_KO_SUBLINE } from '../src/journey/originalBracketCopy.js'

const root = process.cwd()
const errors = []
const fail = message => errors.push(message)
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const exists = file => fs.existsSync(path.join(root, file))

for (const file of [
  'src/journey/OriginalBracket.jsx',
  'src/journey/OriginalBracket.module.css',
  'src/journey/OriginalBracketRounds.module.css',
  'src/journey/OriginalBracketTie.module.css',
  'src/journey/originalBracketPresentationModel.js',
  'src/journey/predictionJourneyModel.js',
  'src/journey/__tests__/OriginalBracket.test.jsx',
  'src/journey/__tests__/originalBracketPresentationModel.test.js',
  'src/journey/__tests__/predictionJourneyModel.test.js',
  'docs/STAGE-13G-BRACKET-1-ORIGINAL-BRACKET-RESPONSIVE-WALLCHART.md',
]) if (!exists(file)) fail(`Missing Stage 13G-BRACKET-1 file: ${file}`)

const component = exists('src/journey/OriginalBracket.jsx') ? read('src/journey/OriginalBracket.jsx') : ''
const css = [
  'src/journey/OriginalBracket.module.css',
  'src/journey/OriginalBracketRounds.module.css',
  'src/journey/OriginalBracketTie.module.css',
].filter(exists).map(read).join('\n')
const model = exists('src/journey/originalBracketPresentationModel.js') ? read('src/journey/originalBracketPresentationModel.js') : ''
const journeyModel = exists('src/journey/predictionJourneyModel.js') ? read('src/journey/predictionJourneyModel.js') : ''
const journey = exists('src/journey/PredictionJourney.jsx') ? read('src/journey/PredictionJourney.jsx') : ''
const componentTest = exists('src/journey/__tests__/OriginalBracket.test.jsx') ? read('src/journey/__tests__/OriginalBracket.test.jsx') : ''
const modelTest = exists('src/journey/__tests__/originalBracketPresentationModel.test.js') ? read('src/journey/__tests__/originalBracketPresentationModel.test.js') : ''
const journeyTest = exists('src/journey/__tests__/predictionJourneyModel.test.js') ? read('src/journey/__tests__/predictionJourneyModel.test.js') : ''
const doc = exists('docs/STAGE-13G-BRACKET-1-ORIGINAL-BRACKET-RESPONSIVE-WALLCHART.md') ? read('docs/STAGE-13G-BRACKET-1-ORIGINAL-BRACKET-RESPONSIVE-WALLCHART.md') : ''
const packageJson = JSON.parse(read('package.json'))

for (const marker of [
  'OriginalBracketSlot',
  'OriginalBracketTie',
  'WallChampionBox',
  'buildOriginalBracketSurface',
  'Re-pick — your tables changed this tie',
  'bracket-team-choice__action',
  'aria-label="Seven-lane bracket"',
]) if (!component.includes(marker)) fail(`OriginalBracket component is missing marker: ${marker}`)

if (!ORIGINAL_BRACKET_CONTEXT_COPY.includes('group predictions decide this bracket')) fail('Original bracket context copy constant must keep the predicted-bracket explanation')
if (!ORIGINAL_BRACKET_KO_SUBLINE.includes('winner picks only')) fail('Original bracket KO subline constant must keep winner-only wording')
if ((component.match(/KO Predictor/g) ?? []).length !== 1) fail('OriginalBracket component must contain exactly one KO Predictor mention')
for (const forbidden of ['ScoreInput', 'decisionMethod', 'jokerApplied', 'ko-method', 'ko-joker-button']) {
  if (component.includes(forbidden)) fail(`OriginalBracket component must not contain ${forbidden}`)
}

for (const marker of [
  'ORIGINAL_BRACKET_WALL_COLUMNS',
  'buildOriginalBracketWallPlacement',
  'sourceCodeForBracketSlot',
  'buildOriginalBracketSurface',
  'staleMatchNumbers',
  "return 'repick'",
]) if (!model.includes(marker)) fail(`Original bracket presentation model is missing marker: ${marker}`)

for (const marker of ['1, row: 2', '4, row: 5', '7, row: 8', '3${combination}', 'W${slot.matchNumber}']) {
  if (!model.includes(marker)) fail(`Original bracket wall/source model is missing marker: ${marker}`)
}

for (const marker of [
  'clearDisconnectedBracketSelections',
  'changedMatchNumber',
  'stillFed',
]) if (!journeyModel.includes(marker)) fail(`Prediction journey model is missing downstream persistence marker: ${marker}`)
if (!journey.includes('clearDisconnectedBracketSelections(')) fail('PredictionJourney must prune disconnected downstream bracket picks after upstream bracket changes')

for (const marker of [
  '@media (min-width: 900px)',
  'grid-template-columns: repeat(7',
  'data-wall-side',
  '.wallChampion',
  '.placeholderChip',
  '.repickFlag',
]) if (!css.includes(marker)) fail(`OriginalBracket module CSS is missing marker: ${marker}`)
if (css.includes('@media (max-width')) fail('OriginalBracket module must keep a single 900px breakpoint')
// Connector lines are anchored to each card's real box via `data-wall-side` (checked above), not
// fixed pixel coordinates — `grid-column: var(--wall-column)` / `grid-row: var(--wall-row)` was the
// earlier fixed-coordinate mechanism and is deliberately retired, not a regression.
if (/<path\b[^>]*\bd=["'{`]M\s/i.test(css)) fail('OriginalBracket module CSS must not contain hardcoded SVG connector paths')

for (const marker of [
  'winner picks only',
  'toHaveLength(1)',
  'data-slot-source="1A"',
  'data-slot-source="3ABCD"',
  'data-slot-source="W39"',
  'Re-pick — your tables changed this tie',
]) if (!componentTest.includes(marker)) fail(`OriginalBracket test is missing marker: ${marker}`)

for (const marker of [
  'sourceCodeForBracketSlot',
  'buildOriginalBracketSurface',
  'buildOriginalBracketWallPlacement',
  '3CDEF',
  'repick',
  'GUEST_BRACKET_STALE_ADVANCING_TEAM',
]) if (!modelTest.includes(marker)) fail(`Original bracket model test is missing marker: ${marker}`)
for (const marker of ['clearDisconnectedBracketSelections', 'clears only downstream picks no longer fed']) {
  if (!journeyTest.includes(marker)) fail(`Prediction journey model test is missing marker: ${marker}`)
}

for (const marker of [
  'Stage 13G-BRACKET-1',
  'stacked vertical layout below 900px',
  'converging wall chart at 900px and above',
  'same `OriginalBracketTie` and `OriginalBracketSlot` primitives',
  'Re-pick — your tables changed this tie',
  'no score inputs, method controls or joker controls',
  'No Migration 019',
]) if (!doc.includes(marker)) fail(`Stage 13G-BRACKET-1 doc is missing marker: ${marker}`)

if (packageJson.scripts?.['audit:stage13g-bracket-responsive-wallchart'] !== 'node scripts/check-stage13g-bracket-responsive-wallchart.mjs') {
  fail('audit:stage13g-bracket-responsive-wallchart script is not registered')
}
if (!packageJson.scripts?.check?.includes('npm run audit:stage13g-bracket-responsive-wallchart')) {
  fail('npm run check must include audit:stage13g-bracket-responsive-wallchart')
}
if (!packageJson.scripts?.['lint:foundation']?.includes('scripts/check-stage13g-bracket-responsive-wallchart.mjs')) {
  fail('lint:foundation must include scripts/check-stage13g-bracket-responsive-wallchart.mjs')
}

const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(name => name.endsWith('.sql'))
if (migrations.length !== 18) fail(`Expected 18 active migrations, found ${migrations.length}`)
if (migrations.some(name => /(?:^|_)019|2026070\d0019/.test(name))) fail('Migration 019 must not exist for Stage 13G-BRACKET-1')

if (errors.length) {
  console.error('Euro Stage 13G-BRACKET-1 responsive wall-chart audit failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Euro Stage 13G-BRACKET-1 responsive wall-chart audit passed.')
console.log('Layout: stacked vertical below 900px; converging wall chart at 900px and above.')
console.log('Primitives: one OriginalBracketTie and OriginalBracketSlot set powers both arrangements.')
console.log('Safety: Original Bracket remains winner-only with no score inputs, method controls or joker controls.')
console.log('Database: active migrations remain 18; no Migration 019.')
