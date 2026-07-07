import fs from 'node:fs'
import path from 'node:path'
import { ORIGINAL_BRACKET_G_COPY } from '../src/journey/originalBracketCopy.js'

const root = process.cwd()
const errors = []
const fail = message => errors.push(message)
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const exists = file => fs.existsSync(path.join(root, file))

function requireFile(file) {
  if (!exists(file)) fail(`Missing file: ${file}`)
  return exists(file) ? read(file) : ''
}

function assertIncludes(file, markers) {
  const source = requireFile(file)
  for (const marker of markers) {
    if (!source.includes(marker)) fail(`${file} missing marker: ${marker}`)
  }
}

const component = requireFile('src/journey/OriginalBracket.jsx')
const cssShell = requireFile('src/journey/OriginalBracket.module.css')
const cssRounds = requireFile('src/journey/OriginalBracketRounds.module.css')
const cssTie = requireFile('src/journey/OriginalBracketTie.module.css')
const css = [cssShell, cssRounds, cssTie].join('\n')
const model = requireFile('src/journey/originalBracketPresentationModel.js')
const test = requireFile('src/journey/__tests__/OriginalBracket.test.jsx')
const modelTest = requireFile('src/journey/__tests__/originalBracketPresentationModel.test.js')
const stageDoc = requireFile('docs/STAGE-CORE-PAGE-ADOPTION-1B-ORIGINAL-BRACKET.md')
const ledger = requireFile('docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md')
const register = requireFile('docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md')
const agent = requireFile('docs/EURO28-AGENT-RULES-AND-ROADMAP.md')
const roadmap = requireFile('docs/PRODUCT-COMPLETENESS-ROADMAP.md')
const order = requireFile('docs/STREAMLINED-BATCH-ORDER.md')

for (const file of [
  'src/journey/OriginalBracket.jsx',
  'src/journey/OriginalBracket.module.css',
  'src/journey/OriginalBracketRounds.module.css',
  'src/journey/OriginalBracketTie.module.css',
  'src/journey/__tests__/OriginalBracket.test.jsx',
  'docs/STAGE-CORE-PAGE-ADOPTION-1B-ORIGINAL-BRACKET.md',
]) if (!exists(file)) fail(`Missing Original Bracket 1B file: ${file}`)

for (const marker of [
  'data-contract="original-bracket-g"',
  'BRACKET_G_COPY',
  'data-wall-chart="seven-lanes"',
  'data-wall-lanes="7"',
  'data-wall-lane={column.key}',
  'column.matchNumbers.map',
  'data-final-position="centre"',
  'formatKickoffTime',
  'venueLabel',
  'tieStyles.matchDetails',
  'OriginalBracketTie',
  'OriginalBracketSlot',
  'WallChampionBox',
]) if (!component.includes(marker)) fail(`OriginalBracket component missing 1B marker: ${marker}`)

if (!ORIGINAL_BRACKET_G_COPY.includes('knockout winner')) fail('Original Bracket G copy constant must stay player-facing')
if ((component.match(/KO Predictor/g) ?? []).length !== 1) fail('OriginalBracket component must still mention KO Predictor exactly once')
for (const forbidden of ['ScoreInput', 'decisionMethod', 'jokerApplied', 'ko-method', 'ko-joker-button', 'homeScore', 'awayScore']) {
  if (component.includes(forbidden)) fail(`OriginalBracket component must remain winner-only and not contain ${forbidden}`)
}
if (component.includes('WallConnectors')) fail('OriginalBracket component must not revive WallConnectors')
if (/<path\b[^>]*\bd=["'{`]M\s/i.test(component)) fail('OriginalBracket component must not contain hardcoded SVG connector paths')

for (const marker of [
  '.bracketHeroNote',
  '.wallFrame',
  '.matchDetails',
  '@media (min-width: 900px)',
  'grid-template-columns: repeat(7, minmax(8.25rem, 1fr))',
  '.laneStack',
  'overflow-wrap: anywhere',
  '.wallChampion',
]) if (!css.includes(marker)) fail(`OriginalBracket CSS missing 1B marker: ${marker}`)

// Connector lines are now implemented (round two of this stage): they must be anchored to each
// card's own real box via the `data-wall-side` attribute set from the actual column key, not
// hardcoded pixel coordinates or a fixed-position overlay `<svg>`.
if (!css.includes('data-wall-side')) fail('OriginalBracket CSS must anchor connector lines to real card position via data-wall-side, not fixed coordinates')
if (/<path\b[^>]*\bd=["'{`]M\s/i.test(css)) fail('OriginalBracket CSS must not contain hardcoded SVG connector paths')

for (const file of [
  'src/journey/OriginalBracket.module.css',
  'src/journey/OriginalBracketRounds.module.css',
  'src/journey/OriginalBracketTie.module.css',
]) {
  const lines = read(file).split('\n').length
  if (lines > 400) fail(`${file} must remain under the 400-line scoped stylesheet cap (currently ${lines})`)
}

const placementFunction = model.match(/export function buildOriginalBracketWallPlacement[\s\S]*?\n}/)?.[0] ?? ''
if (placementFunction.includes('column: 4, row: 5')) fail('Original Bracket wall placement must not silently fall back to the final-centre placement')
if (!placementFunction.includes('throw new Error')) fail('Original Bracket wall placement must fail loudly for unknown match numbers')
if (!placementFunction.includes('match ${matchNumber}')) fail('Unknown wall-placement error must include the match number')
if (!modelTest.includes('fails loudly when a knockout match has no wall placement')) fail('Original Bracket presentation model test must cover unknown wall placement')
if (!modelTest.includes('Unknown Original Bracket wall placement for match 999')) fail('Unknown wall-placement test must assert the match number appears in the error')

for (const marker of [
  'data-contract="original-bracket-g"',
  'data-wall-chart="seven-lanes"',
  'data-wall-lanes="7"',
  'data-wall-lane="r16-left"',
  'data-wall-lane="final-centre"',
  'data-wall-lane="r16-right"',
  'data-final-position="centre"',
  'Kick-off TBC',
  'Venue to be confirmed',
  'toHaveLength(1)',
]) if (!test.includes(marker)) fail(`OriginalBracket test missing 1B marker: ${marker}`)

for (const [label, source] of [
  ['stage doc', stageDoc],
  ['functional ledger', ledger],
  ['decision register', register],
  ['agent rules', agent],
  ['product roadmap', roadmap],
  ['streamlined order', order],
]) {
  if (!source.includes('STAGE-CORE-PAGE-ADOPTION-1B-ORIGINAL-BRACKET')) fail(`${label} missing stage name`)
}

for (const marker of [
  'Original Bracket G',
  'winner-only',
  'deterministic seven-lane bracket',
  'final centred',
  'no score inputs, method controls or joker controls',
  'Unknown wall placements now fail loudly',
  'No Migration 019',
]) if (!stageDoc.includes(marker)) fail(`Stage doc missing marker: ${marker}`)

const packageJson = JSON.parse(read('package.json'))
if (packageJson.scripts?.['audit:stage-core-page-adoption-1b-original-bracket'] !== 'node scripts/check-stage-core-page-adoption-1b-original-bracket.mjs') {
  fail('package.json missing audit:stage-core-page-adoption-1b-original-bracket')
}
if (!packageJson.scripts?.check?.includes('npm run audit:stage-core-page-adoption-1b-original-bracket')) {
  fail('npm run check must include audit:stage-core-page-adoption-1b-original-bracket')
}
if (!packageJson.scripts?.['lint:foundation']?.includes('scripts/check-stage-core-page-adoption-1b-original-bracket.mjs')) {
  fail('lint:foundation must include scripts/check-stage-core-page-adoption-1b-original-bracket.mjs')
}

const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(name => name.endsWith('.sql'))
if (migrations.length !== 18) fail(`Expected 18 active migrations, found ${migrations.length}`)
if (migrations.some(name => /(?:^|_)019|2026070\d0019/.test(name))) fail('Migration 019 must not exist for Original Bracket 1B')

if (errors.length) {
  console.error('Stage STAGE-CORE-PAGE-ADOPTION-1B-ORIGINAL-BRACKET audit failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Stage STAGE-CORE-PAGE-ADOPTION-1B-ORIGINAL-BRACKET audit passed.')
console.log('Original Bracket: Bracket G markers, desktop wall chart and match detail chips are active on the live surface.')
console.log('Safety: winner-only bracket preserved; no scores, methods, jokers, scoring, resolver, Supabase write or migration change.')
console.log('Database: active migrations remain 18; no Migration 019.')
