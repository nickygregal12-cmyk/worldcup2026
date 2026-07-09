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

const doc = read('docs/archive/STAGE-13G-BRACKET-REFERENCE-ADOPTION.md')
const register = read('docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md')
const ledger = read('docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md')
const agent = read('docs/EURO28-AGENT-RULES-AND-ROADMAP.md')
const charter = read('docs/EURO28-DESIGN-CHARTER.md')
// Original Bracket is now governed by its v2 contract (Stage CONTRACTS-PROTOTYPE-V2-INSTALL); the v1
// file is retained only as `-v1-superseded` provenance and is deliberately not asserted against.
const prototype = read('docs/reference-prototypes/euro28-bracket-page-prototype-v2.html')
const packageJson = read('package.json')

requireIncludes('docs/archive/STAGE-13G-BRACKET-REFERENCE-ADOPTION.md', doc, [
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

// v2 keeps the substance of Bracket G — winner picks only, no score inputs, no joker controls, and a
// desktop wall chart — but restates it. Mobile now defaults to portrait stacked pick-a-winner cards
// and the wall chart is a reversible opt-in in mobile landscape, so v1's 'APPROVED VISUAL CONTRACT'
// banner, 'proper desktop wall chart' and 'winner-only' wording is gone. The Locked state carries the
// approved Bracket Health contract forward as a sub-tab.
requireIncludes('docs/reference-prototypes/euro28-bracket-page-prototype-v2.html', prototype, [
  'Original Bracket v2 — Euro 2028 Predictor (prototype)',
  'PREDICTING STATE — mobile stacked, tap a team to pick',
  'LOCKED / FROZEN STATE — your predicted path, read-only',
  'WALL CHART — desktop native (≥900px) or mobile opt-in landscape',
  'View as wall chart',
  'Back to list',
  'no score inputs, no joker controls',
  'Tap a team to pick the winner',
  'HEALTH TAB — existing approved contract, carried forward as a tab',
  'On your path',
  'Alive, different path',
  'Points still available, by round',
  'Your predicted champion',
  'Your predicted bracket itself never changes.',
  'Predictions locked at kick-off — this is your predicted path through the tournament.',
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
console.log('Reference: binding Bracket v2 — portrait stacked pick-a-winner cards on mobile, native ≥900px wall chart, reversible landscape opt-in.')
console.log('Contract change: charter v1.8 wall chart moved from backlog into Stage 13G; v2 makes the mobile wall chart a reversible opt-in.')
console.log('Sign-off: winner picks only, no score inputs and no joker controls recorded; Locked state carries the Bracket Health contract as a sub-tab. Implementation remains separate.')
console.log('Scope: docs/audit only; no UI build, scoring, resolver, Supabase write or migration change.')
console.log(`Database: ${active.length} active migrations, sequentially numbered with no gaps.`)
