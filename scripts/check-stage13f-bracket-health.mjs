import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const required = [
  'src/bracketHealth/bracketHealthModel.js',
  'src/bracketHealth/OriginalBracketHealth.jsx',
  'src/bracketHealth/OriginalBracketHealth.module.css',
  'src/bracketHealth/__tests__/bracketHealthModel.test.js',
  'src/bracketHealth/liveSlotProjection.js',
  'src/bracketHealth/__tests__/liveSlotProjection.test.js',
  'docs/archive/STAGE-13F-D-ORIGINAL-BRACKET-HEALTH.md',
]
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing Stage 13F-D file: ${file}`)
}
const model = fs.readFileSync(path.join(root, 'src/bracketHealth/bracketHealthModel.js'), 'utf8')
const view = fs.readFileSync(path.join(root, 'src/bracketHealth/OriginalBracketHealth.jsx'), 'utf8')
const journey = fs.readFileSync(path.join(root, 'src/journey/PredictionJourneyView.jsx'), 'utf8')
const playerView = fs.readFileSync(path.join(root, 'src/player/PlayerView.jsx'), 'utf8')
for (const phrase of ['ROUTE_CONFLICT', 'ORIGINAL_ONLY', 'matchCentreHref', 'pointsSecured', 'pointsAvailable']) {
  if (!model.includes(phrase)) throw new Error(`Bracket-health model is missing ${phrase}`)
}
for (const phrase of ['saved bracket never changes', 'Known real fixture', 'Real fixture not known yet', 'View Match Centre']) {
  if (!view.includes(phrase)) throw new Error(`Bracket-health view is missing: ${phrase}`)
}
if (!journey.includes('<OriginalBracketHealth')) throw new Error('Original bracket does not render the bracket-health comparison')
if (!playerView.includes('<OriginalBracketHealth') || !playerView.includes('subjectLabel=')) {
  throw new Error('Player View does not expose competition-scoped bracket health for released profiles')
}

// ── Reveal timing — owner ruling 2026-07-14 ────────────────────────────────────────────
// Health used to be gated on (locked || reviewMode). reviewMode is true the moment a player
// submits, so a bracket submitted months out rendered fifteen cards all saying the real
// fixture was not known yet. The gate is now the standings: a group must have played two
// rounds before Health has anything true to say. These assertions exist so that cannot be
// quietly undone — the timing IS the feature.
const projection = fs.readFileSync(path.join(root, 'src/bracketHealth/liveSlotProjection.js'), 'utf8')

if (!/PROJECTION_MATCHES_PLAYED\s*=\s*2\b/.test(projection)) {
  throw new Error('The reveal threshold must remain two matches played per team (owner ruling 2026-07-14)')
}
for (const phrase of ['groupAtThreshold', 'allGroupsReady', 'tournamentUnderway', 'projectedSlotTeamId']) {
  if (!projection.includes(phrase)) throw new Error(`Live slot projection is missing ${phrase}`)
}
// A best-third slot is a cross-group ranking: projecting one before all six groups have
// reached the threshold produces the wrong combination key, and therefore the wrong team.
if (!/best_third[\s\S]*?allGroupsReady/.test(projection)) {
  throw new Error('Best-third slots must stay unprojected until every group has reached the threshold')
}
// A projection may say who leads a group. It may never bank points or declare a team out.
for (const phrase of ['liveParticipantsProjected', 'participantsProjected', "status: 'pending'"]) {
  if (!model.includes(phrase)) throw new Error(`Bracket-health model is missing ${phrase}`)
}
if (!model.includes('buildLiveSlotProjection')) {
  throw new Error('Bracket-health model no longer consults the reveal projection')
}
// The panel must never present a projected occupant as an official fixture. The copy itself
// lives in bracketHealthCopy.js — audits pin the shared constant, never the sentence.
const copy = fs.readFileSync(path.join(root, 'src/bracketHealth/bracketHealthCopy.js'), 'utf8')
for (const name of ['BRACKET_HEALTH_PENDING_COPY', 'BRACKET_HEALTH_PROJECTED_LABEL', 'BRACKET_HEALTH_BEST_THIRD_PENDING', 'bracketHealthProvenance']) {
  if (!copy.includes(`export const ${name}`) && !copy.includes(`export function ${name}`)) {
    throw new Error(`Bracket-health copy module must export ${name}`)
  }
}
for (const name of ['BRACKET_HEALTH_PROJECTED_LABEL', 'bracketHealthProvenance']) {
  if (!view.includes(name)) throw new Error(`Bracket-health view must mark projected slots via ${name}`)
}
if (!view.includes('provisional')) throw new Error('Bracket-health view must carry the provisional indicator')
// The page must not fall back to showing Health purely because the board is locked.
if (!journey.includes('healthProjection') || !journey.includes('healthAvailable')) {
  throw new Error('The bracket page must gate Health on the standings projection, not on lock alone')
}
if (!journey.includes('BRACKET_HEALTH_PENDING_COPY')) {
  throw new Error('The bracket page must say when Health opens while the threshold is unmet')
}
if (!journey.includes('<Tabs')) {
  throw new Error('The locked bracket must carry Bracket/Health sub-tabs per the approved prototype')
}
const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(file => file.endsWith('.sql'))
if (migrations.length < 16) throw new Error(`Expected Migration 016 and later approved migrations; found ${migrations.length}`)
if (!migrations.some(file => file.includes('016_euro28_staging_time_phase_controls'))) throw new Error('Approved staging Time & Phase Migration 016 is missing')
console.log('Euro Stage 13F-D Original Bracket Health audit passed.')
console.log('Prediction: immutable saved bracket remains the source of the original pick')
console.log('Comparison: known real fixtures supply live context; unresolved fixtures retain the predicted matchup')
console.log('Access: every known knockout fixture links to the existing Match Centre')
console.log(`Database: ${migrations.length} active migrations; approved staging Time & Phase Migration 016 present`)
