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

// The Groups re-cut moved JokerControl onto its own --dp-* CSS module, so the pill,
// the multiplier and the five dots are asserted through structural markers rather
// than the global class names they used to emit. Gold stays joker-exclusive (§5) and
// is now pinned in the module itself, below — stricter than the greps it replaces.
//
// RETIRED at the DP Groups visual re-cut (owner ruling 2026-07-12, §5.8 exception):
// `Icon name="star"` and Icon.jsx's `Star,` / `star: Star`. The guarantee this pair
// protected was never "a star" — it was "the joker has a DESIGNED mark, not a bare J
// circle" (still pinned, below). The owner ruled the generic star fails that: it reads
// as "favourite", not "this match is doubled". The mark is now a bespoke joker card.
// The replacements are STRICTER: the mark is pinned in its own primitive, the pill is
// pinned to use it, and the star is pinned OUT so it cannot creep back.
assertIncludes('src/design-system/JokerControl.jsx', [
  'export function JokerPill',
  'export function JokerMeter',
  'Icon name="joker"',
  'Joker',
  '`${multiplier}×`',
  'data-joker-dot',
  'data-joker-pill="true"',
  'data-joker-meter="true"',
])
assertNotIncludes('src/design-system/JokerControl.jsx', [
  'name="star"',
])

assertIncludes('src/design-system/JokerControl.module.css', [
  '--dp-joker',
  '.dot',
  '.filled',
  '.pill',
  '.multiplier',
  '.meter',
])
// The "2×" chip carries white text on its own fill, so the fill must be the F1 ink
// gold (4.5:1+), not the declared --dp-joker, which measures 3.93:1 in light.
assert(/\.multiplier[^}]*background:\s*var\(--dp-joker-ink\)/s.test(read('src/design-system/JokerControl.module.css')),
  'The joker multiplier chip must fill with --dp-joker-ink; --dp-joker fails 4.5:1 under white text in light theme')

// The joker mark is a real primitive, hand-drawn because lucide has no joker. It lives
// outside Icon.jsx because check-design-tokens holds Icon.jsx to being a lucide adapter
// (no raw <svg> there).
assertIncludes('src/design-system/Icon.jsx', [
  "import JokerMark from './JokerMark.jsx'",
  'joker: JokerMark',
])
assertIncludes('src/design-system/JokerMark.jsx', [
  'data-joker-mark="true"',
  'currentColor',
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

// The joker rules left groups-predictor.css for JokerControl.module.css. The joker
// modifier on the match card is page styling and stays.
assertIncludes('src/styles/groups-predictor.css', [
  '.group-match-card--joker',
])

assertIncludes('src/design-system/__tests__/JokerControl.test.jsx', [
  'renders the approved pill',
  'Joker limit reached',
  'five-dot joker meter',
  'data-joker-dot',
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
console.log('Retired: the bare J circle, and the generic star that replaced it. The joker wears its own mark.')
console.log('Contrast: the 2x chip fills with the ink gold, so it clears 4.5:1 in both themes.')
console.log(`Database: ${migrations.length} active migrations, sequentially numbered with no gaps.`)
