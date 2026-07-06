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
const css = requireFile('src/journey/OriginalBracket.module.css')
const test = requireFile('src/journey/__tests__/OriginalBracket.test.jsx')
const stageDoc = requireFile('docs/STAGE-CORE-PAGE-ADOPTION-1B-ORIGINAL-BRACKET.md')
const ledger = requireFile('docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md')
const register = requireFile('docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md')
const agent = requireFile('docs/EURO28-AGENT-RULES-AND-ROADMAP.md')
const roadmap = requireFile('docs/PRODUCT-COMPLETENESS-ROADMAP.md')
const order = requireFile('docs/STREAMLINED-BATCH-ORDER.md')

for (const file of [
  'src/journey/OriginalBracket.jsx',
  'src/journey/OriginalBracket.module.css',
  'src/journey/__tests__/OriginalBracket.test.jsx',
  'docs/STAGE-CORE-PAGE-ADOPTION-1B-ORIGINAL-BRACKET.md',
]) if (!exists(file)) fail(`Missing Original Bracket 1B file: ${file}`)

for (const marker of [
  'data-contract="original-bracket-g"',
  'BRACKET_G_COPY',
  'data-wall-chart="converging"',
  'data-r16-position="outside-edges"',
  'data-final-position="centre"',
  'formatKickoffTime',
  'venueLabel',
  'styles.matchDetails',
  'OriginalBracketTie',
  'OriginalBracketSlot',
  'WallChampionBox',
]) if (!component.includes(marker)) fail(`OriginalBracket component missing 1B marker: ${marker}`)

if (!ORIGINAL_BRACKET_G_COPY.includes('knockout winner')) fail('Original Bracket G copy constant must stay player-facing')
if ((component.match(/KO Predictor/g) ?? []).length !== 1) fail('OriginalBracket component must still mention KO Predictor exactly once')
for (const forbidden of ['ScoreInput', 'decisionMethod', 'jokerApplied', 'ko-method', 'ko-joker-button', 'homeScore', 'awayScore']) {
  if (component.includes(forbidden)) fail(`OriginalBracket component must remain winner-only and not contain ${forbidden}`)
}

for (const marker of [
  '.bracketHeroNote',
  '.wallFrame',
  '.matchDetails',
  '@media (min-width: 900px)',
  'grid-template-columns: repeat(7',
  'grid-column: var(--wall-column)',
  'grid-row: var(--wall-row)',
  '.wallChampion',
]) if (!css.includes(marker)) fail(`OriginalBracket CSS missing 1B marker: ${marker}`)
if (css.includes('connector')) fail('OriginalBracket CSS must not add connector-line styling in this slice')

for (const marker of [
  'data-contract="original-bracket-g"',
  'data-wall-chart="converging"',
  'data-r16-position="outside-edges"',
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
  'Round of 16 columns on the outside edges',
  'final centred',
  'no score inputs, method controls or joker controls',
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
