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

assertIncludes('src/journey/GroupsPredictor.jsx', [
  'GroupsPredictorPolish.module.css',
  'polishStyles.focusIntro',
  'polishStyles.focusHeader',
  'polishStyles.focusTableButton',
  'polishStyles.focusStats',
  'Predicted tables',
  'summary.groupComplete',
  'summary.groupJokers',
  'setTablesOpen(true)',
])

assertIncludes('src/journey/GroupsPredictorPolish.module.css', [
  '.focusIntro',
  '.focusHeader',
  '.focusTableButton',
  '.focusStats',
  '.focusStrip::before',
  'radial-gradient',
  '.groupRail button:hover',
])

assertIncludes('docs/STAGE-13G-GROUPS-2-PREMIUM-VIEW.md', [
  'Stage 13G-GROUPS-2C',
  'Groups Top Dock Polish',
  'presentation-only design iteration',
])

assertIncludes('docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md', [
  'Stage 13G-GROUPS-2C — Groups Top Dock Polish',
  'No scoring, resolver, Supabase write, service-role, route or migration change',
])

assertIncludes('docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md', [
  'Stage 13G-GROUPS-2C — Groups Top Dock Polish',
  'not final visual sign-off',
])

assertIncludes('docs/EURO28-AGENT-RULES-AND-ROADMAP.md', [
  'Stage 13G-GROUPS-2C — Groups Top Dock Polish',
  'Do not treat this as final Groups visual polish',
])

assertIncludes('package.json', [
  'audit:stage13g-groups-top-dock-polish',
  'scripts/check-stage13g-groups-top-dock-polish.mjs',
])

const migrationsDir = path.join(root, 'supabase', 'migrations')
const migrations = fs.existsSync(migrationsDir) ? fs.readdirSync(migrationsDir).filter(name => name.endsWith('.sql')) : []
assert(migrations.length === 18, `Expected 18 active migrations, found ${migrations.length}`)
assert(!migrations.some(name => /019/.test(name)), 'Migration 019 must not be introduced by Groups top-dock polish')

console.log('Stage 13G-GROUPS-2C top-dock polish audit passed.')
console.log('Groups: top focus area now carries premium summary chips and a predicted-tables shortcut while preserving the existing view switcher and table sheet.')
console.log('Safety: presentation/docs/audit only; no scoring, resolver, Supabase write, service-role use, route or migration change.')
console.log('Database: active migrations remain 18; no Migration 019.')
