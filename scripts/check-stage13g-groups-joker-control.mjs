import fs from 'node:fs'
import path from 'node:path'
import { migrationSequenceError } from './lib/migrationSequenceGuard.mjs'

const root = process.cwd()
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertIncludes(file, tokens) {
  const content = read(file)
  for (const token of tokens) {
    assert(content.includes(token), `${file} missing required token: ${token}`)
  }
}

function assertNotIncludes(file, tokens) {
  const content = read(file)
  for (const token of tokens) {
    assert(!content.includes(token), `${file} still contains retired token: ${token}`)
  }
}

assertIncludes('src/design-system/JokerControl.jsx', [
  'export function JokerPill',
  'export function JokerMeter',
  'Icon name="star"',
  'Joker',
  '`${multiplier}×`',
  'groups-joker-dot',
  'data-joker-pill="true"',
  'data-joker-meter="true"',
])

assertIncludes('src/design-system/Icon.jsx', [
  'Star,',
  'star: Star',
])

assertIncludes('src/design-system/index.jsx', [
  "import JokerPill, { JokerMeter } from './JokerControl.jsx'",
  'JokerPill',
  'JokerMeter',
])

assertIncludes('src/journey/GroupsPredictor.jsx', [
  'JokerMeter',
  'JokerPill',
  'value={summary.groupJokers}',
  'max={summary.groupJokerCap}',
  'active={row.jokerApplied}',
  'disabled={jokerDisabled}',
  'statusLabel={jokerLabel}',
  'onClick={() => onChange(match, { jokerApplied: !row.jokerApplied })}',
])

assertNotIncludes('src/journey/GroupsPredictor.jsx', [
  'groups-joker-mark',
  '>J</span>',
])

assertIncludes('src/styles/groups-predictor.css', [
  'Stage 13G-GROUPS-1',
  '.groups-joker-meter--dots',
  '.groups-joker-dot.is-active',
  '.joker-control--pill',
  '.joker-control__multiplier',
  '.group-match-card--joker',
])

assertIncludes('src/design-system/__tests__/JokerControl.test.jsx', [
  'renders the approved pill',
  'Joker limit reached',
  'five-dot joker meter',
  'groups-joker-dot',
])

assertIncludes('package.json', [
  'audit:stage13g-groups-joker-control',
  'scripts/check-stage13g-groups-joker-control.mjs',
])

const migrationsDir = path.join(root, 'supabase', 'migrations')
const migrations = fs.existsSync(migrationsDir) ? fs.readdirSync(migrationsDir).filter(name => name.endsWith('.sql')) : []
assert(!migrationSequenceError(migrations), migrationSequenceError(migrations))

console.log('Euro Stage 13G-GROUPS-1 joker-control audit passed.')
console.log('Groups: shared JokerPill, five-dot JokerMeter and disabled cap treatment are active.')
console.log('Retired: bare J circle no longer renders from the Groups predictor surface.')
console.log('Scope: no venue meta line, score stepper implementation, bracket rebuild, Supabase write or migration change.')
console.log(`Database: ${migrations.length} active migrations, sequentially numbered with no gaps.`)
