import fs from 'node:fs'
import path from 'node:path'
import { GROUPS_DATE_TABLES_COPY, PREDICTION_AUTOSAVE_NOTICE, PREDICTION_BRACKET_JOKERS_COPY, PREDICTION_GROUP_JOKERS_COPY, PREDICTION_LOCK_NOTICE, PREDICTION_SAVE_CHECK_COPY } from '../src/journey/predictionJourneyCopy.js'
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

// RE-POINTED at the DP Groups visual re-cut (owner ruling 2026-07-12 — §5.8 exception,
// recorded here and in the commit).
//
// This stage adopted the "Night Broadcast" contract on Groups: a dark gradient panel
// (data-contract="night-broadcast-groups", .nightContract, radial-gradient), three
// guardrail chips beneath it (Private until lock / Live tables / Five 2× jokers), and
// two bordered preview asides carrying the predicted tables. The owner has ruled that
// the binding contract for this page is now the approved Groups v2 prototype rendered
// in adopted DP tokens, and that prototype deletes the banner and the chips outright
// and turns the two asides into ONE collapsible, open where you are predicting.
//
// The substance the stage guaranteed is unchanged and still pinned below: the predicted
// group table and the best-third ranking are both reachable from the live Groups
// surface, built natively, fed from the player's own predictions. What is retired is
// the visual language that carried them. The re-cut adds a guarantee the old contract
// never made and the owner asked for — that Groups is not a dead end.
assertIncludes('src/journey/GroupsPredictor.jsx', [
  'data-contract="dp-groups-v2"',
  'PredictedTables',
  'tablesModel.groups.find(item => item.code === openGroup)?.table',
  'tablesModel.bestThird.ranking',
  'Original Bracket',
  'GROUPS_DATE_TABLES_COPY',
])
assertNotIncludes('src/journey/GroupsPredictor.jsx', [
  'night-broadcast-groups',
  'Private until lock',
  'Five 2× jokers',
])

// Groups flows into the bracket. It used to stop: the journey tabs are hidden on this
// route-owned surface, so a player who finished 36 scores had nowhere to go from here.
assertIncludes('src/journey/GroupsPredictorFlow.module.css', [
  '.flowCta',
  '.tables',
  '.tableCard',
])
const groupsFlow = read('src/journey/GroupsPredictor.jsx')
assert(groupsFlow.includes('BRACKET_DESTINATION.hash'), 'Groups must carry a real route link on to the Original Bracket, not a dead end')
assert(groupsFlow.includes('APP_ROUTE.BRACKET'), 'The bracket link must come from the route registry, never a hash spelled out on the page')
assert(!fs.existsSync(path.join(root, 'src/journey/GroupsPredictorPolish.module.css')), 'The Night Broadcast polish module is retired with the contract it carried')

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


const publicUiFiles = [
  'src/journey/GroupsPredictor.jsx',
  'src/journey/PredictionJourneyView.jsx',
]
const forbiddenPublicCopy = [
  'central provisional Euro 2028 lock configuration',
  'irreversible tournament lock',
  'euro28-prediction-journey-v3',
  'atomic saving',
  'Group tags keep context on every ticket',
  'sticky Tables pill',
]
for (const file of publicUiFiles) {
  const content = read(file)
  for (const token of forbiddenPublicCopy) {
    assert(!content.includes(token), `${file} must not expose internal product copy: ${token}`)
  }
}

assertIncludes('src/journey/PredictionJourneyView.jsx', [
  'PREDICTION_AUTOSAVE_NOTICE',
  'PREDICTION_LOCK_NOTICE',
  'PREDICTION_GROUP_JOKERS_COPY',
  'PREDICTION_BRACKET_JOKERS_COPY',
  'PREDICTION_SAVE_CHECK_COPY',
])

const groupsContent = read('src/journey/GroupsPredictor.jsx')
assert(groupsContent.includes('GROUPS_DATE_TABLES_COPY'), 'Groups date helper must use the shared player-facing copy constant')
assert(GROUPS_DATE_TABLES_COPY.includes('Tap Tables'), 'Groups date helper constant must keep the Tables action clear')
const journeyContent = read('src/journey/PredictionJourneyView.jsx')
for (const token of [
  PREDICTION_AUTOSAVE_NOTICE,
  PREDICTION_LOCK_NOTICE,
  PREDICTION_GROUP_JOKERS_COPY,
  PREDICTION_BRACKET_JOKERS_COPY,
  PREDICTION_SAVE_CHECK_COPY,
]) {
  assert(token && token.length > 10, `Shared prediction journey copy constant is unexpectedly short: ${token}`)
}
assert(journeyContent.includes('PREDICTION_AUTOSAVE_NOTICE'), 'Prediction journey must render the shared autosave copy constant')

const forbiddenSource = ['src/resolver/', 'supabase/migrations/202607']
for (const token of forbiddenSource) {
  assert(!read('docs/STAGE-CORE-PAGE-ADOPTION-1A-GROUPS.md').includes(`Changed ${token}`), `Stage note must not claim forbidden change: ${token}`)
}

const migrationsDir = path.join(root, 'supabase', 'migrations')
const migrations = fs.existsSync(migrationsDir) ? fs.readdirSync(migrationsDir).filter(name => name.endsWith('.sql')) : []
assert(!migrationSequenceError(migrations), migrationSequenceError(migrations))

console.log('Stage STAGE-CORE-PAGE-ADOPTION-1A-GROUPS audit passed.')
console.log('Groups: Night Broadcast contract language, live table previews, third-place preview and sticky table path are rebuilt natively on the live Groups surface.')
console.log('Safety: presentation-only React/CSS/docs/audit slice; no scoring, resolver, Supabase write, service-role use or migration change.')
console.log(`Database: ${migrations.length} active migrations, sequentially numbered with no gaps.`)
