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

function requireIncludes(file, content, markers) {
  for (const marker of markers) {
    if (!content.includes(marker)) errors.push(`${file} is missing: ${marker}`)
  }
}

const stageDoc = read('docs/STAGE-13G-DESTINATION-REFERENCE-ADOPTION.md')
const register = read('docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md')
const ledger = read('docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md')
const agent = read('docs/EURO28-AGENT-RULES-AND-ROADMAP.md')
const charter = read('docs/EURO28-DESIGN-CHARTER.md')
const scope = read('docs/STAGE-13G-0-INFORMATION-ARCHITECTURE-AND-COHERENT-UI-SCOPE.md')
const packageJson = read('package.json')

const referenceFiles = [
  ['Tournament prototype', 'docs/reference-prototypes/euro28-tournament-page-prototype.html', ['Tournament — Euro 2028 Predictor', 'Across 9 venues, 8 cities', 'Qualifying under way']],
  ['How to Play prototype', 'docs/reference-prototypes/euro28-how-to-play-page-prototype.html', ['How to play — Euro 2028 Predictor', 'Original Predictor', 'KO Predictor']],
  ['Account prototype', 'docs/reference-prototypes/euro28-account-page-prototype.html', ['Account — Euro 2028 Predictor', 'quick stats', 'Clear my predictions']],
  ['Admin prototype', 'docs/reference-prototypes/euro28-admin-page-prototype.html', ['Admin — Euro 2028 Predictor', 'Tournament control room', 'section nav']],
  ['Match Centre prototype', 'docs/reference-prototypes/euro28-match-centre-page-prototype.html', ['Match Centre — Euro 2028 Predictor', 'Group impact', 'Points on the line']],
  ['Reference brief', 'docs/reference-prototypes/euro28-tournament-split-agent-prompt.md', ['Part A — Tournament / How to Play', 'Part B — Account', 'Part C — Admin', 'Part D — Match Centre']],
]

for (const [label, file, markers] of referenceFiles) {
  const content = read(file)
  requireIncludes(`${label} reference`, content, markers)
}

requireIncludes('docs/STAGE-13G-DESTINATION-REFERENCE-ADOPTION.md', stageDoc, [
  'Stage 13G Destination Reference Adoption',
  'docs/audit only',
  'No UI rebuild',
  'euro28-tournament-page-prototype.html',
  'euro28-how-to-play-page-prototype.html',
  'euro28-account-page-prototype.html',
  'euro28-admin-page-prototype.html',
  'euro28-match-centre-page-prototype.html',
  'Part A — Stage 13G-B-TOURNAMENT-1',
  'amends that existing stage in place',
  'Tournament / How to Play split',
  'Account destination rebuild',
  'Admin cosmetic restyle',
  'Match Centre group-match upgrade',
  'Active migrations must remain 18',
  'Migration 019 must not be created',
])

for (const [file, content] of [
  ['docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md', register],
  ['docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md', ledger],
  ['docs/EURO28-AGENT-RULES-AND-ROADMAP.md', agent],
]) {
  requireIncludes(file, content, [
    'Reference Adoption',
    '13G-B-TOURNAMENT-1',
    'Tournament / How to Play split',
    'Account',
    'Admin',
    'Match Centre',
    'no Migration 019',
  ])
}

requireIncludes('docs/EURO28-DESIGN-CHARTER.md', charter, [
  'Version 1.10',
  'Tournament, How to Play',
  'Tournament and How to Play split — CONFIRMED',
  'football tournament reference content and predictor mechanics must not be bundled into one destination',
])

requireIncludes('docs/STAGE-13G-0-INFORMATION-ARCHITECTURE-AND-COHERENT-UI-SCOPE.md', scope, [
  '| Tournament | `#/tournament`',
  '| How to Play | `#/how-to-play`',
  'Stage 13G destination reference adoption amends this map',
  'add How to Play as the separate mechanics, scoring, locks and FAQ destination',
])

requireIncludes('package.json', packageJson, [
  'audit:stage13g-destination-reference-adoption',
  'check-stage13g-destination-reference-adoption.mjs',
  'npm run audit:stage13g-destination-reference-adoption',
])

const forbiddenImplementationMarkers = [
  ['src/app/appRoutes.js', 'HOW_TO_PLAY'],
  ['src/config/tournament.js', 'tournamentEndAt: import.meta.env.VITE_TOURNAMENT_END_AT || \'2028-07-09'],
]
for (const [file, marker] of forbiddenImplementationMarkers) {
  const content = fs.existsSync(path.join(repo, file)) ? read(file) : ''
  if (content.includes(marker)) {
    errors.push(`${file} appears to contain implementation work forbidden in this docs/audit package: ${marker}`)
  }
}

const migrationsDir = path.join(repo, 'supabase', 'migrations')
if (fs.existsSync(migrationsDir)) {
  const active = fs.readdirSync(migrationsDir).filter((name) => name.endsWith('.sql')).sort()
  if (active.length !== 18) errors.push(`Expected 18 active migrations, found ${active.length}`)
  if (active.some((name) => name.includes('019'))) errors.push('Migration 019 must not exist for Stage 13G destination reference adoption')
}

if (errors.length) {
  console.error('Euro Stage 13G destination reference adoption audit failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Euro Stage 13G destination reference adoption audit passed.')
console.log('References: Tournament, How to Play, Account, Admin and Match Centre prototypes are recorded.')
console.log('Sequencing: next implementation is 13G-B-TOURNAMENT-1; Account/Admin/Match Centre remain later focused batches.')
console.log('Scope: docs/audit only; no UI, route, scoring, resolver, Supabase write or migration change.')
console.log('Database: active migrations remain 18; no Migration 019.')
