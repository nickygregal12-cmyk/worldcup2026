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

// RETIRED at the DP Groups visual re-cut (owner ruling 2026-07-12 — §5.8 exception,
// recorded here and in the commit).
//
// This stage's own decision-register entry calls it "not final Groups visual polish",
// and the owner has now ruled what final looks like: the approved Groups v2 prototype,
// rendered in adopted DP tokens. Every marker retired below pinned the language that
// ruling supersedes, and GroupsPredictorPolish.module.css existed only to carry it:
//
//   polishStyles.focusIntro/focusHeader/focusCopy/focusTableButton   the hero panel
//   .focusStrip::before + radial-gradient                            its gradient wash
//   .groupRail button em / i, .viewToggle button small               a progress bar per
//                                                                    group — a second
//                                                                    progress display
//                                                                    competing with the
//                                                                    dock above it
//
// The prototype deletes the hero outright and makes the rail what it always was: tabs.
// So the module is gone with it. What the stage ACTUALLY guaranteed survives, re-pointed
// at the new structure and widened: no duplicate summary display anywhere, one compact
// dock carrying the two live numbers, and the model fix that stopped partial score
// drafts crashing the predicted tables (untouched, still asserted below).
const groupsPredictor = read('src/journey/GroupsPredictor.jsx')
assertIncludes('src/journey/GroupsPredictor.jsx', [
  'GroupsPredictorFlow.module.css',
  'viewStyles.focusStrip',
  'viewStyles.focusMeters',
  'viewStyles.progressPill',
  'viewStyles.miniMeter',
  'viewStyles.groupRail',
  'viewStyles.railComplete',
  'setTablesOpen(true)',
  "{ homeScore: null, awayScore: null, jokerApplied: false }",
])
// The duplicate-summary guarantee, kept and widened. With the hero gone the dock is the
// ONLY place the group counts appear, so the old chip block must not return in any form
// — nor may the module that gilded it.
assert(!groupsPredictor.includes('polishStyles'), 'The retired Groups hero polish module must not come back')
assert(!groupsPredictor.includes('Groups prediction summary'), 'Top-dock repair must keep duplicate summary chip copy removed')
assert(!fs.existsSync(path.join(root, 'src/journey/GroupsPredictorPolish.module.css')), 'GroupsPredictorPolish.module.css is retired: its rules gilded the hero the re-cut deletes')

assertIncludes('src/journey/groupsPresentationModel.js', [
  'const completeScore = homeScore != null && awayScore != null',
  'homeScore: completeScore ? homeScore : null',
  'awayScore: completeScore ? awayScore : null',
])

// The dock replaces the hero: one strip, the two numbers you want while predicting,
// sticky in BOTH views. By date had no dock at all, which is why it read as a different
// page — the owner's finding, pinned shut.
assertIncludes('src/journey/GroupsPredictor.module.css', [
  '.focusStrip',
  'position: sticky',
  '.progressPill',
  '.miniMeter',
  '.railComplete::after',
])
// The colour tokens only. --text-*, --space-*, --radius-* and --shadow-* are the shared
// type, spacing and elevation scales and are not a palette — DP modules use them too.
const LEGACY_PALETTE = /var\(--(?:brand|accent|gradient|joker|state-|surface-|text-(?:primary|secondary|muted|strong|link|on-brand)|border-(?:subtle|default|strong))/
const viewChrome = read('src/journey/GroupsPredictor.module.css')
assert(!/radial-gradient|linear-gradient/.test(viewChrome), 'The Groups chrome stands on flat DP ground: no gradient washes')
assert(!LEGACY_PALETTE.test(viewChrome), 'The Groups chrome must be on --dp-* tokens, not the legacy palette')
assert(!LEGACY_PALETTE.test(read('src/journey/GroupsPredictorFlow.module.css')), 'The Groups cards and flow must be on --dp-* tokens, not the legacy palette')

assertIncludes('src/journey/__tests__/groupsPresentationModel.test.js', [
  'treats one-sided partial score drafts as incomplete for predicted tables',
  'homeScore: null',
  'awayScore: 1',
])

assertIncludes('docs/archive/STAGE-13G-GROUPS-2-PREMIUM-VIEW.md', [
  'Stage 13G-GROUPS-2D',
  'Groups Top Dock Repair',
  'one-sided partial score drafts',
])

assertIncludes('docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md', [
  'Stage 13G-GROUPS-2D — Groups Top Dock Repair',
  'one-sided partial score drafts',
])

assertIncludes('docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md', [
  'Stage 13G-GROUPS-2D — Groups Top Dock Repair',
  'not final Groups visual polish',
])

assertIncludes('docs/EURO28-AGENT-RULES-AND-ROADMAP.md', [
  'Stage 13G-GROUPS-2D — Groups Top Dock Repair',
  'partial score drafts must not crash predicted tables',
])

assertIncludes('package.json', [
  'audit:stage13g-groups-top-dock-polish',
  'scripts/check-stage13g-groups-top-dock-polish.mjs',
])

const migrationsDir = path.join(root, 'supabase', 'migrations')
const migrations = fs.existsSync(migrationsDir) ? fs.readdirSync(migrationsDir).filter(name => name.endsWith('.sql')) : []
assert(!migrationSequenceError(migrations), migrationSequenceError(migrations))

console.log('Stage 13G-GROUPS-2D top-dock repair audit passed.')
console.log('Groups: duplicate summary chips are removed, view controls are richer, the group rail is upgraded, and partial score drafts no longer crash predicted tables.')
console.log('Safety: presentation/model/docs/audit/test only; no scoring, resolver, Supabase write, service-role use, route or migration change.')
console.log(`Database: ${migrations.length} active migrations, sequentially numbered with no gaps.`)
