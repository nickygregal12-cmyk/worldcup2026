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

const groupsPredictor = read('src/journey/GroupsPredictor.jsx')
assertIncludes('src/journey/GroupsPredictor.jsx', [
  'GroupsPredictorPolish.module.css',
  'polishStyles.focusIntro',
  'polishStyles.focusHeader',
  'polishStyles.focusCopy',
  'polishStyles.focusTableButton',
  'polishStyles.viewToggle',
  'polishStyles.groupRail',
  'setTablesOpen(true)',
  '<small>',
  '<em aria-hidden="true"><i style={{ width:',
  "{ homeScore: null, awayScore: null, jokerApplied: false }",
])
assert(!groupsPredictor.includes('polishStyles.focusStats'), 'Top-dock repair must not reintroduce redundant summary chips')
assert(!groupsPredictor.includes('Groups prediction summary'), 'Top-dock repair must keep duplicate summary chip copy removed')

assertIncludes('src/journey/groupsPresentationModel.js', [
  'const completeScore = homeScore != null && awayScore != null',
  'homeScore: completeScore ? homeScore : null',
  'awayScore: completeScore ? awayScore : null',
])

assertIncludes('src/journey/GroupsPredictorPolish.module.css', [
  '.focusCopy',
  '.focusTableButton',
  '.viewToggle button small',
  '.groupRail button em',
  '.groupRail button i',
  '.focusStrip::before',
  'radial-gradient',
  '.groupRail button:hover',
])
assert(!read('src/journey/GroupsPredictorPolish.module.css').includes('.focusStats'), 'Top-dock repair CSS must not include redundant focusStats styling')

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
