import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import {
  GUEST_MATCH_RANGES,
  GUEST_PREDICTION_BUNDLE_FORMAT,
  GUEST_PREDICTION_BUNDLE_VERSION,
  GUEST_PREDICTION_CONTEXT,
  GUEST_PREDICTION_STATE_VERSION,
} from '../src/guest/guestPredictionConfig.js'
import { createGuestPredictionBundle } from '../src/guest/guestPredictionBundle.js'
import { createGuestPredictionState } from '../src/guest/guestPredictionState.js'
import { resolveGuestTournamentPreview } from '../src/guest/guestTournamentPreview.js'

const scriptPath = fileURLToPath(import.meta.url)
const root = path.resolve(path.dirname(scriptPath), '..')
const errors = []
const groupCodes = ['A', 'B', 'C', 'D', 'E', 'F']
const pairings = [[1, 2], [3, 4], [1, 3], [2, 4], [4, 1], [2, 3]]

function fail(message) {
  errors.push(message)
}

function buildAuditReference() {
  const groups = groupCodes.map((code, groupIndex) => ({
    code,
    teams: [1, 2, 3, 4].map(position => ({
      teamId: `${code}${position}`,
      stableKey: `${code}${position}`,
      qualifierRank: (groupIndex * 4) + position,
    })),
  }))
  let matchNumber = 1
  const groupMatches = []
  for (const code of groupCodes) {
    for (const [home, away] of pairings) {
      groupMatches.push({
        context: 'guest',
        matchNumber,
        groupCode: code,
        homeTeamId: `${code}${home}`,
        awayTeamId: `${code}${away}`,
        homeScore: null,
        awayScore: null,
      })
      matchNumber += 1
    }
  }
  return {
    context: 'guest',
    tournamentId: 'euro28-audit',
    tournamentCode: 'euro-2028',
    referenceVersion: 'euro28-guest-reference-v1:audit',
    groups,
    groupMatches,
    knockoutMatchNumbers: Array.from({ length: 15 }, (_, index) => index + 37),
  }
}

if (GUEST_PREDICTION_CONTEXT !== 'guest') fail('guest foundation context must remain guest')
if (GUEST_PREDICTION_STATE_VERSION !== 'euro28-guest-state-v1') fail('unexpected guest state version')
if (GUEST_PREDICTION_BUNDLE_FORMAT !== 'euro28-guest-prediction-bundle') fail('unexpected guest bundle format')
if (GUEST_PREDICTION_BUNDLE_VERSION !== 1) fail('unexpected guest bundle version')
if (GUEST_MATCH_RANGES.total !== 51) fail('guest workspace must contain 51 prediction rows')

const reference = buildAuditReference()
const state = createGuestPredictionState(reference, { now: '2026-07-01T00:00:00.000Z' })
const preview = resolveGuestTournamentPreview(reference, state)
const bundle = createGuestPredictionBundle(state, reference, { now: '2026-07-01T00:00:00.000Z' })

if (Object.keys(state.groupPredictions).length !== 36) fail('guest state must contain 36 group rows')
if (Object.keys(state.knockoutPredictions).length !== 15) fail('guest state must contain 15 knockout rows')
if (preview.resolution.context !== 'guest') fail('guest preview must use guest resolver context')
if (preview.completeness.overall.total !== 51) fail('guest completeness must cover all 51 matches')
if ('userId' in bundle || 'email' in bundle || 'profile' in bundle) fail('guest export must not contain account identity')

const guestRoot = path.join(root, 'src/guest')
const sourceFiles = []
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') walk(filePath)
    } else if (/\.(?:js|jsx|mjs)$/.test(entry.name)) {
      sourceFiles.push(filePath)
    }
  }
}
walk(guestRoot)

const combinedSource = sourceFiles.map(filePath => fs.readFileSync(filePath, 'utf8')).join('\n')
const bannedTerms = [
  '@supabase/supabase-js',
  ".from('",
  '.insert(',
  '.update(',
  '.upsert(',
  '.delete(',
  'fetch(',
  'XMLHttpRequest',
  'sendBeacon(',
]
for (const term of bannedTerms) {
  if (combinedSource.includes(term)) fail(`guest foundation contains a banned server or database operation: ${term}`)
}

const loader = fs.readFileSync(path.join(root, 'src/foundation/loadEuroFoundation.js'), 'utf8')
if (!loader.includes(".from('group_memberships')")) fail('foundation loader must read group membership reference rows')
if (!loader.includes('buildGuestReferenceModel')) fail('foundation loader must build the guest reference model')

const app = fs.readFileSync(path.join(root, 'src/foundation/EuroFoundationApp.jsx'), 'utf8')
if (!app.includes('PredictionJourneyFoundation')) fail('active foundation page must expose guest editing through the integrated prediction journey')

const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(name => name.endsWith('.sql'))
if (migrations.length !== 9) fail(`Stage 7 must retain nine active migrations, found ${migrations.length}`)
if (!migrations.some(name => name.includes('0006_euro28_auth_profiles'))) fail('Stage 5 auth/profile Migration 006 is missing')
if (!migrations.some(name => name.includes('0007_euro28_auth_function_privileges'))) fail('Stage 5 privilege correction Migration 007 is missing')
if (!migrations.some(name => name.includes('0008_euro28_provisional_joker_caps'))) fail('Stage 5 scoring correction Migration 008 is missing')
if (!migrations.some(name => name.includes('0009_euro28_atomic_prediction_save'))) fail('Migration 009 atomic saving is missing')

if (errors.length > 0) {
  console.error('Euro guest/explore foundation audit failed:')
  errors.forEach(error => console.error(`- ${error}`))
  process.exit(1)
}

console.log('Euro guest/explore foundation audit passed.')
console.log(`Guest state: ${GUEST_PREDICTION_STATE_VERSION}`)
console.log(`Bundle: ${GUEST_PREDICTION_BUNDLE_FORMAT} v${GUEST_PREDICTION_BUNDLE_VERSION}`)
console.log('Storage: browser localStorage only; no guest server persistence')
console.log('Prediction rows: 36 group + 15 knockout = 51')
console.log('Resolver context: guest; predicted and live records are not accepted')
console.log('Account identity in exports: none')
console.log('Active migrations: 9; guest server storage remains absent')
