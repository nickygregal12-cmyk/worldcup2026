import { migrationSequenceError } from './lib/migrationSequenceGuard.mjs'
import fs from 'node:fs'
import path from 'node:path'

const repo = process.cwd()
const errors = []

function read(file) {
  const full = path.join(repo, file)
  if (!fs.existsSync(full)) {
    errors.push(`Missing required file: ${file}`)
    return ''
  }
  return fs.readFileSync(full, 'utf8')
}

function requireIncludes(file, content, tokens) {
  for (const token of tokens) {
    if (!content.includes(token)) errors.push(`${file} is missing: ${token}`)
  }
}

const doc = read('docs/STAGE-13G-BRACKET-REFERENCE-ADOPTION.md')
const register = read('docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md')
const ledger = read('docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md')
const agent = read('docs/EURO28-AGENT-RULES-AND-ROADMAP.md')
const charter = read('docs/EURO28-DESIGN-CHARTER.md')
const prototype = read('docs/reference-prototypes/euro28-bracket-page-prototype.html')
const packageJson = read('package.json')

requireIncludes('docs/STAGE-13G-BRACKET-REFERENCE-ADOPTION.md', doc, [
  'Stage 13G-BRACKET-REF',
  'Contract change',
  'below `900px`',
  'At `≥900px`',
  'converging wall chart',
  'one state and one set of tie/slot primitives',
  '`1B`',
  '`2A`',
  '`3DEF`',
  'tap-to-advance and winner-only',
  'clears only downstream picks that are no longer fed',
  'Re-pick — your tables changed this tie',
  'Pick through to the final',
  'winner picks only',
  'group predictions decide this bracket',
  'score inputs',
  'method controls',
  'joker controls',
  'without lines',
  'follow-on batch',
  'single 900px breakpoint',
  'No UI rebuild',
  'No Supabase writes',
  'Migration 019 is not created',
])

for (const [file, content] of [
  ['docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md', register],
  ['docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md', ledger],
  ['docs/EURO28-AGENT-RULES-AND-ROADMAP.md', agent],
  ['docs/EURO28-DESIGN-CHARTER.md', charter],
]) {
  requireIncludes(file, content, [
    'Stage 13G-BRACKET-REF',
    'contract change',
    'converging wall chart',
    '900px',
    'winner picks only',
    'Live results will not change your saved picks.',
  ])
}

requireIncludes('docs/reference-prototypes/euro28-bracket-page-prototype.html', prototype, [
  'Bracket — Euro 2028 Predictor (visual contract)',
  'APPROVED VISUAL CONTRACT',
  'proper desktop wall chart',
  'Round of 16 on the outside edges',
  'quarter-finals and semi-finals stepping inward',
  'centred final',
  'small vs treatment',
  'date, time, stadium and host flag',
  'winner-only',
  'no score inputs',
  'no method controls',
  'no joker controls',
])

requireIncludes('package.json', packageJson, [
  'audit:stage13g-bracket-reference-adoption',
  'check-stage13g-bracket-reference-adoption.mjs',
])

const migrationsDir = path.join(repo, 'supabase', 'migrations')
const active = fs.existsSync(migrationsDir)
  ? fs.readdirSync(migrationsDir).filter((name) => name.endsWith('.sql')).sort()
  : []
if (migrationSequenceError(active)) errors.push(migrationSequenceError(active))

if (errors.length) {
  console.error('Euro Stage 13G-BRACKET-REF audit failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Euro Stage 13G-BRACKET-REF approved Original Bracket visual contract audit passed.')
console.log('Reference: approved Bracket G with stacked mobile and proper ≥900px wall chart recorded.')
console.log('Contract change: charter v1.8 wall chart moved from backlog into Stage 13G.')
console.log('Sign-off: match details, subtle vs treatment and winner-only controls recorded; implementation remains separate.')
console.log('Scope: docs/audit only; no UI build, scoring, resolver, Supabase write or migration change.')
console.log(`Database: ${active.length} active migrations, sequentially numbered with no gaps.`)
