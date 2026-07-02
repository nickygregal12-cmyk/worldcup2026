import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {
  GUEST_MATCH_RANGES,
  GUEST_PREDICTION_BUNDLE_FORMAT,
  GUEST_PREDICTION_BUNDLE_VERSION,
  GUEST_PREDICTION_CONTEXT,
  GUEST_PREDICTION_STATE_VERSION,
} from '../src/guest/guestPredictionConfig.js'
import { createGuestPredictionBundle } from '../src/guest/guestPredictionBundle.js'
import { createGuestPredictionState } from '../src/guest/guestPredictionState.js'

const root = process.cwd()
const errors = []
const fail = message => errors.push(message)
const groupCodes = ['A','B','C','D','E','F']
const pairings = [[1,2],[3,4],[1,3],[2,4],[4,1],[2,3]]
const groups = groupCodes.map((code, groupIndex) => ({ code, teams: [1,2,3,4].map(position => ({ teamId: `${code}${position}`, stableKey: `${code}${position}`, qualifierRank: groupIndex * 4 + position })) }))
let matchNumber = 1
const groupMatches = []
for (const code of groupCodes) for (const [home, away] of pairings) groupMatches.push({ context:'guest', matchNumber:matchNumber++, groupCode:code, homeTeamId:`${code}${home}`, awayTeamId:`${code}${away}`, homeScore:null, awayScore:null, kickoffAt:'2028-06-09T12:00:00Z', status:'scheduled' })
const reference = { context:'guest', tournamentId:'euro28-audit', tournamentCode:'euro-2028', referenceVersion:'euro28-guest-reference-v2:audit', groups, groupMatches, knockoutMatchNumbers:Array.from({length:15},(_,i)=>i+37) }
const state = createGuestPredictionState(reference, { now:'2026-07-01T00:00:00Z' })
const bundle = createGuestPredictionBundle(state, reference, { now:'2026-07-01T00:00:00Z' })

if (GUEST_PREDICTION_CONTEXT !== 'guest') fail('guest context must remain guest')
if (GUEST_PREDICTION_STATE_VERSION !== 'euro28-guest-state-v2') fail('guest state must use v2 split model')
if (GUEST_PREDICTION_BUNDLE_FORMAT !== 'euro28-guest-prediction-bundle' || GUEST_PREDICTION_BUNDLE_VERSION !== 2) fail('guest bundle must use version 2')
if (GUEST_MATCH_RANGES.group.count !== 36 || GUEST_MATCH_RANGES.bracket.count !== 15 || GUEST_MATCH_RANGES.total !== 51) fail('guest original predictor must contain 36 group rows and 15 bracket rows')
if (Object.keys(state.groupPredictions).length !== 36) fail('guest state must contain 36 group score rows')
if (Object.keys(state.bracketPredictions).length !== 15) fail('guest state must contain 15 bracket winner rows')
if ('knockoutPredictions' in state) fail('guest original state must not contain KO Predictor score rows')
if ('userId' in bundle || 'email' in bundle || 'profile' in bundle) fail('guest export must not contain account identity')

const files = []
const walk = directory => { for (const entry of fs.readdirSync(directory,{withFileTypes:true})) { const file = path.join(directory,entry.name); if (entry.isDirectory()) { if (entry.name !== '__tests__') walk(file) } else if (/\.(?:js|jsx|mjs)$/.test(entry.name)) files.push(file) } }
walk(path.join(root,'src/guest'))
const source = files.map(file => fs.readFileSync(file,'utf8')).join('\n')
for (const term of ['@supabase/supabase-js', '.insert(', '.update(', '.upsert(', '.delete(', 'fetch(', 'XMLHttpRequest']) if (source.includes(term)) fail(`guest foundation contains banned server behaviour: ${term}`)

const migrations = fs.readdirSync(path.join(root,'supabase/migrations')).filter(name=>name.endsWith('.sql'))
if (migrations.length !== 14) fail(`Stage 12 requires fourteen migrations, found ${migrations.length}`)
if (!migrations.some(name=>name.includes('0010_euro28_competition_split_and_jokers'))) fail('Migration 010 is missing')

if (errors.length) { console.error('Euro guest/explore foundation audit failed:'); errors.forEach(error=>console.error(`- ${error}`)); process.exit(1) }
console.log('Euro guest/explore foundation audit passed.')
console.log(`Guest state: ${GUEST_PREDICTION_STATE_VERSION}`)
console.log(`Bundle: ${GUEST_PREDICTION_BUNDLE_FORMAT} v${GUEST_PREDICTION_BUNDLE_VERSION}`)
console.log('Storage: browser localStorage only; no guest server persistence')
console.log('Original predictor rows: 36 group scores + 15 winner-only bracket picks')
console.log('Separate KO Predictor is not blended into the guest original bundle')
console.log('Account identity in exports: none')
console.log('Active migrations: 14')
