import { migrationSequenceError } from './lib/migrationSequenceGuard.mjs'
import fs from 'node:fs'
import path from 'node:path'
import { PREDICTION_AUTOSAVE_NOTICE } from '../src/journey/predictionJourneyCopy.js'

const root = process.cwd()
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const fail = message => { console.error(message); process.exit(1) }

const tournament = read('src/config/tournament.js')
const lifecycle = read('src/config/tournamentLifecycle.js')
const journey = read('src/journey/PredictionJourney.jsx')
const view = read('src/journey/PredictionJourneyView.jsx')
const design = read('src/design-system/index.jsx')
const account = read('src/auth/AccountAccess.jsx') + read('src/auth/AccountDashboard.jsx')
const leagues = read('src/leagues/LeaguePresentation.jsx')
const refresh = read('src/runtime/refreshPolicy.js')
const packageJson = JSON.parse(read('package.json'))
const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(file => file.endsWith('.sql')).sort()

if (migrationSequenceError(migrations)) fail(migrationSequenceError(migrations))
if (!tournament.includes("predictionLockAt: import.meta.env.VITE_PREDICTION_LOCK_AT || '2028-06-09T19:00:00.000Z'")) fail('Central provisional prediction lock fallback is missing')
// Lock and opening kick-off are one moment since the Home v2 rebuild: both fall back to 19:00Z.
if (!tournament.includes("tournamentStartAt: import.meta.env.VITE_TOURNAMENT_START_AT || '2028-06-09T19:00:00.000Z'")) fail('Central provisional tournament start fallback is missing')
if (!lifecycle.includes('resolveTournamentLifecycle') || !lifecycle.includes('CENTRAL_PROVISIONAL')) fail('Tournament lifecycle resolver is missing central provisional source handling')
if (!journey.includes('resolveTournamentLifecycle(tournament)')) fail('PredictionJourney must derive lock state from the lifecycle resolver')
if (!view.includes('PREDICTION_AUTOSAVE_NOTICE')) fail('Player-facing autosave copy constant is missing')
if (!PREDICTION_AUTOSAVE_NOTICE.includes('save automatically')) fail('Player-facing autosave notice constant is missing the save message')
if (view.includes('central provisional Euro 2028 lock configuration') || view.includes('irreversible tournament lock') || view.includes('atomic saving')) fail('Internal lock/save-contract language must not appear in the prediction journey UI')
if (!design.includes('export function ConfirmDialog') || !design.includes('SelectField')) fail('Shared confirmation and selector primitives are missing')
// SelectField became a custom-rendered listbox at Stage DP-PRIMITIVES (no native
// OS picker). It lives in its own file and is re-exported from index.jsx.
const selectField = read('src/design-system/SelectField.jsx')
if (!selectField.includes('role="listbox"') || !selectField.includes('role="combobox"')) fail('SelectField must be a custom-rendered listbox (button trigger + option list), not a native select')
if (!account.includes('ConfirmDialog') || !account.includes('Sign out of Euro 2028 Predictor?')) fail('Sign-out must use the shared confirmation dialog')
if (!leagues.includes('SelectField') || leagues.includes('<select value={selectedId')) fail('League pickers must use the design-system selector groundwork')
if (!refresh.includes('REFRESH_POLICY') || !refresh.includes('manualButton: false')) fail('Refresh-policy groundwork is missing')
if (!packageJson.scripts['audit:shared-primitives']) fail('audit:shared-primitives script is not registered')
if (!packageJson.scripts.check.includes('npm run audit:shared-primitives')) fail('npm run check must include the shared-primitives audit')

console.log('Stage 13G-A shared primitives audit passed.')
console.log('Central provisional lock: 2028-06-09T19:00:00.000Z')
console.log('Central provisional tournament start: 2028-06-09T20:00:00.000Z')
console.log(`Active migrations: ${migrations.length}`)
console.log(`Latest migration: ${migrations.at(-1)}`)
