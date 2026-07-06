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
  'data-contract="night-broadcast-groups"',
  'polishStyles.nightContract',
  'polishStyles.contractMeta',
  'Private until lock',
  'Live tables',
  'Five 2× jokers',
  'GroupsContractTablePreview',
  'GroupsContractThirdPlacePreview',
  'tablesModel.groups.find(item => item.code === group.code)?.table',
  'tablesModel.bestThird.ranking',
  'Original Bracket',
  'sticky Tables pill',
])

assertIncludes('src/journey/GroupsPredictorPolish.module.css', [
  '.nightContract',
  'nightContract::after',
  '.contractMeta',
  '.contractTablePreview',
  '.contractThirdPreview',
  'radial-gradient',
  'contractThirdPreview',
])

assertIncludes('docs/STAGE-CORE-PAGE-ADOPTION-1A-GROUPS.md', [
  'STAGE-CORE-PAGE-ADOPTION-1A-GROUPS',
  'Night Broadcast',
  'native React/CSS',
  'shared predicted-tables and third-place components',
  'Original Predictor and KO Predictor remain separate',
  'no scoring, resolver, Supabase write, service-role or migration change',
])

assertIncludes('docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md', [
  'Stage STAGE-CORE-PAGE-ADOPTION-1A-GROUPS',
  'Groups Night Broadcast contract adoption slice',
])

assertIncludes('docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md', [
  'Stage STAGE-CORE-PAGE-ADOPTION-1A-GROUPS',
  'does not close the full STAGE-CORE-PAGE-ADOPTION-1 row',
])

assertIncludes('docs/EURO28-AGENT-RULES-AND-ROADMAP.md', [
  'Stage STAGE-CORE-PAGE-ADOPTION-1A-GROUPS',
  'Groups contract adoption slice',
])

assertIncludes('package.json', [
  'audit:stage-core-page-adoption-1a-groups',
  'scripts/check-stage-core-page-adoption-1a-groups.mjs',
])

const forbiddenSource = ['src/resolver/', 'supabase/migrations/202607']
for (const token of forbiddenSource) {
  assert(!read('docs/STAGE-CORE-PAGE-ADOPTION-1A-GROUPS.md').includes(`Changed ${token}`), `Stage note must not claim forbidden change: ${token}`)
}

const migrationsDir = path.join(root, 'supabase', 'migrations')
const migrations = fs.existsSync(migrationsDir) ? fs.readdirSync(migrationsDir).filter(name => name.endsWith('.sql')) : []
assert(migrations.length === 18, `Expected 18 active migrations, found ${migrations.length}`)
assert(!migrations.some(name => /019/.test(name)), 'Migration 019 must not be introduced by Stage Core Page Adoption 1A Groups')

console.log('Stage STAGE-CORE-PAGE-ADOPTION-1A-GROUPS audit passed.')
console.log('Groups: Night Broadcast contract language, live table previews, third-place preview and sticky table path are rebuilt natively on the live Groups surface.')
console.log('Safety: presentation-only React/CSS/docs/audit slice; no scoring, resolver, Supabase write, service-role use or migration change.')
console.log('Database: active migrations remain 18; no Migration 019.')
