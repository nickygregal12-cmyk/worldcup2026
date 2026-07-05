import fs from 'node:fs'
import path from 'node:path'

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

assertIncludes('src/journey/groupsPresentationModel.js', [
  'GROUPS_VIEW_MODE',
  "GROUP: 'group'",
  "DATE: 'date'",
  'buildGroupDateSections',
  'buildGroupsTablesSheetModel',
  'buildPredictedGroupTables',
  'rankBestThirdTeams',
  'resolveGroupTable',
])

assertIncludes('src/journey/GroupsPredictor.jsx', [
  'By group',
  'By date',
  'Tables fast path',
  'Group {match.groupCode}',
  'setTablesOpen(true)',
  'GROUPS_TABLE_KEY.THIRD_PLACE',
  'Predicted third-place ranking',
])

assertIncludes('src/journey/GroupsPredictor.module.css', [
  '.viewToggle',
  '.dateView',
  '.groupTag',
  '.tablesPill',
  '.sheet',
  '.sheetRail',
  '.qualifies',
])

assertIncludes('src/journey/__tests__/groupsPresentationModel.test.js', [
  'groups matches into by-date sections while preserving group context',
  'builds the groups table sheet model with group and third-place rails',
  'GROUPS_TABLE_KEY.THIRD_PLACE',
])

assertIncludes('docs/STAGE-13G-GROUPS-2-PREMIUM-VIEW.md', [
  'By group / By date',
  'group tag',
  'sticky Tables pill',
  'slide-up sheet',
  'A–F + third-place rail',
  'No scoring, resolver, Supabase write or migration change',
])

assertIncludes('docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md', [
  'Stage 13G-GROUPS-2 — Groups Premium View Switcher',
  'By group / By date view switcher',
  'Tables fast path in by-date mode',
])

assertIncludes('docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md', [
  'Stage 13G-GROUPS-2 — Groups Premium View Switcher',
  'the By group / By date toggle is a restored settled Groups decision',
])

assertIncludes('docs/EURO28-AGENT-RULES-AND-ROADMAP.md', [
  'Stage 13G-GROUPS-2 — implemented Groups view switcher and table fast path',
])

assertIncludes('package.json', [
  'audit:stage13g-groups-premium-view',
  'scripts/check-stage13g-groups-premium-view.mjs',
])

const migrationsDir = path.join(root, 'supabase', 'migrations')
const migrations = fs.existsSync(migrationsDir) ? fs.readdirSync(migrationsDir).filter(name => name.endsWith('.sql')) : []
assert(migrations.length === 18, `Expected 18 active migrations, found ${migrations.length}`)
assert(!migrations.some(name => /019/.test(name)), 'Migration 019 must not be introduced by Stage 13G-GROUPS-2')

console.log('Stage 13G-GROUPS-2 premium view audit passed.')
console.log('Groups: By group / By date switcher restored, by-date tickets carry group tags and the sticky Tables fast path opens A-F plus third-place tables.')
console.log('Safety: presentation/model/docs only; no scoring, resolver, Supabase write, service-role use or migration change.')
console.log('Database: active migrations remain 18; no Migration 019.')
