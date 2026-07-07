import { migrationSequenceError } from './lib/migrationSequenceGuard.mjs'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const errors = []

function read(file) {
  const full = path.join(root, file)
  if (!fs.existsSync(full)) {
    errors.push(`Missing required file: ${file}`)
    return ''
  }
  return fs.readFileSync(full, 'utf8')
}

function requireIncludes(file, content, markers) {
  for (const marker of markers) {
    if (!content.includes(marker)) errors.push(`${file} is missing marker: ${marker}`)
  }
}

const stageDoc = read('docs/STAGE-13G-MATCH-CENTRE-REFERENCE-ADOPTION.md')
const matchCentreDoc = read('docs/STAGE-13F-C-EURO-MATCH-CENTRE.md')
const prototype = read('docs/reference-prototypes/euro28-match-centre-page-prototype.html')
const expandedPrompt = read('docs/reference-prototypes/euro28-stage13g-expanded-agent-prompt.md')
const register = read('docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md')
const ledger = read('docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md')
const agent = read('docs/EURO28-AGENT-RULES-AND-ROADMAP.md')
const charter = read('docs/EURO28-DESIGN-CHARTER.md')
const siteAccess = read('docs/EURO28-SITE-ACCESS-MAP.md')
const packageJsonRaw = read('package.json')
let packageJson = {}
try {
  packageJson = JSON.parse(packageJsonRaw)
} catch (error) {
  errors.push(`package.json is not valid JSON: ${error.message}`)
}

requireIncludes('docs/STAGE-13G-MATCH-CENTRE-REFERENCE-ADOPTION.md', stageDoc, [
  'Stage 13G-MATCH-CENTRE-REF',
  'accepted docs/audit reference-adoption package',
  'implementation scheduled',
  'Group-stage fixtures (`matchNumber <= 36`) render Original Predictor only',
  'Knockout fixtures retain Original/KO Predictor tabs',
  'Group standings show `Live projection` while any match in that group is live and `Final` once the group is confirmed',
  'Live projection must use `resolveGroupTable` with live/confirmed inputs',
  'No second table calculator',
  'Read-only bracket-point preview',
  'must never write to `bracket_predictions` or alter the Original Bracket page',
  'No matchday hardcode',
  'Knockout panel unchanged',
  'This match’s predictions',
  'No group maximum-available framing',
  'No fixture nav, hero, status bar or viewing-scope selector rewrite',
  'No scoring/resolver contract change',
  'No Supabase write',
  'No database migration expected',
  'Active migrations remain 18',
  'Migration 019 must not be created',
  '13G-MATCH-CENTRE-1',
])

requireIncludes('docs/STAGE-13F-C-EURO-MATCH-CENTRE.md', matchCentreDoc, [
  'Stage 13F-C',
  'Match Centre',
  'Original Predictor',
  'KO Predictor',
  'Points-on-the-line',
])

requireIncludes('docs/reference-prototypes/euro28-match-centre-page-prototype.html', prototype, [
  'Match Centre — Euro 2028 Predictor',
  'Group impact',
  'Original Predictor',
  'KO Predictor',
  'This match\'s predictions',
  'Points on the line',
  'matchNumber &lt;= 36',
  'resolveGroupTable',
  'bracket_predictions',
])

requireIncludes('docs/reference-prototypes/euro28-stage13g-expanded-agent-prompt.md', expandedPrompt, [
  'Part D — Match Centre',
  'Decision 1 — Conditional competition tabs',
  'Decision 2 — Group impact panel gets a live/final state',
  'Decision 3 — Live projection reuses the real resolver, never a second calculator',
  'Decision 4',
  'Decision 5 — This activates naturally, not on a schedule',
  'Decision 6 — "Points on the line" is unchanged for knockout fixtures',
  'Decision 7 — Group fixtures get a different panel: "This match\'s predictions."',
  'Decision 8 — No "maximum available" framing on group panels',
])

for (const [file, content] of [
  ['docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md', register],
  ['docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md', ledger],
  ['docs/EURO28-AGENT-RULES-AND-ROADMAP.md', agent],
  ['docs/EURO28-DESIGN-CHARTER.md', charter],
  ['docs/EURO28-SITE-ACCESS-MAP.md', siteAccess],
]) {
  requireIncludes(file, content, [
    'Stage 13G-MATCH-CENTRE-REF',
    'Match Centre group-match reference adoption',
    '13G-MATCH-CENTRE-1',
    'Original Predictor',
    'KO Predictor',
    'Live projection',
    'Final',
    'resolveGroupTable',
    'read-only',
    'Migration 019',
  ])
}

if (packageJson.scripts?.['audit:stage13g-match-centre-reference-adoption'] !== 'node scripts/check-stage13g-match-centre-reference-adoption.mjs') {
  errors.push('package.json is missing audit:stage13g-match-centre-reference-adoption')
}
if (!packageJson.scripts?.check?.includes('npm run audit:stage13g-match-centre-reference-adoption')) {
  errors.push('npm run check must include audit:stage13g-match-centre-reference-adoption')
}
if (!packageJson.scripts?.['lint:foundation']?.includes('scripts/check-stage13g-match-centre-reference-adoption.mjs')) {
  errors.push('lint:foundation must include scripts/check-stage13g-match-centre-reference-adoption.mjs')
}

const migrationsDir = path.join(root, 'supabase', 'migrations')
const migrations = fs.existsSync(migrationsDir)
  ? fs.readdirSync(migrationsDir).filter(name => name.endsWith('.sql')).sort()
  : []
if (!fs.existsSync(migrationsDir)) {
  errors.push('Missing supabase/migrations directory')
} else if (migrationSequenceError(migrations)) {
  errors.push(migrationSequenceError(migrations))
}

if (errors.length > 0) {
  console.error(`Euro Stage 13G-MATCH-CENTRE-REF audit failed with ${errors.length} issue(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Euro Stage 13G-MATCH-CENTRE-REF reference adoption audit passed.')
console.log('Decisions: group fixtures use Original-only tabs, live/final group impact, resolver-backed projection and this-match prediction comparison.')
console.log('Boundary: knockout Points on the line stays unchanged; Match Centre projections are read-only and never write to saved brackets, standings or scores.')
console.log('Sequencing: Stage 13G-MATCH-CENTRE-1 is the next implementation slice; Player destinations and UI-copy hygiene remain separate.')
console.log(`Database: ${migrations.length} active migrations, sequentially numbered with no gaps.`)
