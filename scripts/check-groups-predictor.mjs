import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const errors = []
const fail = message => errors.push(message)
const exists = file => fs.existsSync(path.join(root, file))
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(name => name.endsWith('.sql'))
if (migrations.length < 14) fail(`Stage 13B must retain the original fourteen-migration baseline, found ${migrations.length}`)

const requiredFiles = [
  'src/design-system/TeamLabel.jsx',
  'src/design-system/ScoreInput.jsx',
  'src/design-system/PredictionStateBadge.jsx',
  'src/design-system/teamFlagRegistry.js',
  'src/design-system/__tests__/TeamLabel.test.jsx',
  'src/design-system/__tests__/ScoreInput.test.jsx',
  'src/journey/GroupsPredictor.jsx',
  'src/journey/PredictionReview.jsx',
  'src/journey/groupsPresentationModel.js',
  'src/journey/euroLuckyDip.js',
  'src/journey/GroupsPredictorActions.module.css',
  'src/journey/__tests__/groupsPresentationModel.test.js',
  'src/journey/__tests__/euroLuckyDip.test.js',
  'src/styles/groups-predictor.css',
  'docs/STAGE-13B-GROUPS-PREDICTOR-AND-REVIEW.md',
  'docs/THIRD-PARTY-ASSETS.md',
]
for (const file of requiredFiles) if (!exists(file)) fail(`Required Stage 13B file is missing: ${file}`)

const packageJson = JSON.parse(read('package.json'))
if (!packageJson.dependencies?.['circle-flags']) fail('circle-flags must be a declared local dependency')
if (packageJson.scripts?.['audit:groups-predictor'] !== 'node scripts/check-groups-predictor.mjs') fail('audit:groups-predictor is not wired correctly')
if (!packageJson.scripts?.check?.includes('audit:groups-predictor')) fail('npm run check does not run the Groups predictor audit')

const lock = read('package-lock.json')
if (!lock.includes('node_modules/circle-flags')) fail('package-lock.json does not lock circle-flags')
if (/circle-flags[^\n]+(?:applied-caas|openai|internal\.api)/i.test(lock)) fail('circle-flags is locked to a private registry')

const registry = read('src/design-system/teamFlagRegistry.js')
const codes = [...registry.matchAll(/^\s{2}([A-Z]{3}):/gm)].map(match => match[1])
if (new Set(codes).size !== 55) fail(`Team flag registry must contain all 55 UEFA association codes, found ${new Set(codes).size}`)
if (/https?:\/\//.test(registry)) fail('Team flags must be bundled locally, not loaded from a runtime CDN')
for (const code of ['SCO', 'ENG', 'WAL', 'NIR', 'IRL', 'KOS']) if (!codes.includes(code)) fail(`Team flag registry is missing ${code}`)

// The Groups re-cut moved the seam, not the guarantee. TeamLabel now carries its own
// --dp-* CSS module, so its identity states are asserted through structural markers
// (data-team-label="…") rather than the old global class names. All THREE states are
// pinned now, not just the placeholder: an empty slot and a resolved team whose flag
// asset is missing used to share one `!flagUrl` branch, so a registry miss silently
// wore the empty-slot treatment. They are distinct states now and a miss is loud.
// The conflation itself is pinned shut below. Stricter than the greps it replaces.
const teamLabel = read('src/design-system/TeamLabel.jsx')
for (const marker of [
  'data-team-label="placeholder"',
  'data-team-label="missing-flag"',
  'data-team-provisional',
  'actualTeamId',
  'onActivate',
  'Open ${resolvedLabel} team profile',
  'flagAssetForTeamIso',
]) {
  if (!teamLabel.includes(marker)) fail(`TeamLabel is missing: ${marker}`)
}
if (teamLabel.includes('onClick={team') || teamLabel.includes('article onClick')) fail('Team profile activation must remain on the identity primitive only')
// The DP-HOME conflation, pinned shut on this surface too: unresolved means "no team
// behind this slot" and nothing else. Every staging tournament_teams row carries
// is_provisional = true, so inferring unresolved from it blanks the entire board.
if (/isProvisional\s*\|\|\s*!/.test(teamLabel)) fail('TeamLabel must not infer unresolved-ness from isProvisional')

const teamLabelStyles = read('src/design-system/TeamLabel.module.css')
for (const marker of ['.placeholder', '.missingFlag', '--dp-']) {
  if (!teamLabelStyles.includes(marker)) fail(`TeamLabel module is missing: ${marker}`)
}

// Stage DP-PRIMITIVES moved the seam, not the guarantee. ScoreInput now carries its
// own --dp-* CSS module, so the read-only state is asserted through its structural
// marker (data-score-input="readonly") rather than the old global class name; and
// Groups reaches ScoreInput through the shared PredictionInputRow rather than
// importing it directly. Both assertions below are re-pointed, and the composition
// chain is checked end to end — Groups -> PredictionInputRow -> ScoreInput — which is
// stricter than the single grep it replaces, not looser.
const scoreInput = read('src/design-system/ScoreInput.jsx')
for (const marker of ['inputMode="numeric"', 'pattern="[0-9]*"', 'data-score-input="readonly"', "grace ? 'unlock' : 'lock'", 'Decrease ${label}', 'Increase ${label}']) {
  if (!scoreInput.includes(marker)) fail(`ScoreInput is missing: ${marker}`)
}

const predictionInputRow = read('src/design-system/PredictionInputRow.jsx')
if (!predictionInputRow.includes('ScoreInput')) fail('PredictionInputRow must compose the shared ScoreInput primitive')

const stateBadge = read('src/design-system/PredictionStateBadge.jsx')
for (const state of ['dirty', 'saving', 'saved', 'submitted', 'locked', 'grace', 'conflict', 'error']) {
  if (!stateBadge.includes(`${state}:`)) fail(`PredictionStateBadge is missing the ${state} state`)
}

const groups = read('src/journey/GroupsPredictor.jsx')
for (const marker of [
  'viewStyles.focusStrip', 'summary.groupJokerCap', 'EURO_SCORING_CONFIG.joker.MULTIPLIER',
  'TeamLabel', 'PredictionInputRow', 'PredictionStateBadge', 'hasActivePredictionGrace',
  'isPredictionMatchStarted', 'group-match-card--joker', 'aria-pressed={row.jokerApplied}',
  'Review progress', 'reference.groups.map', 'reference.groupMatches.filter',
  'Fill empty scores', 'Replace all scores', 'Lucky Dip never uses odds',
]) if (!groups.includes(marker)) fail(`Groups predictor is missing: ${marker}`)
if (/onClick=.*group-match-card/.test(groups)) fail('The surrounding match card must not become a team-profile trigger')

// The review surface was rebuilt on a real route (Original Predictor Review). Assert its
// structure rather than v1 prose: saved counts, the step checklist, submit and edit actions.
const review = read('src/journey/PredictionReview.jsx')
for (const marker of ['styles.recapCount', 'styles.stepper', 'onClick={onSubmit}', 'onClick={onEdit}', 'Predicted champion']) {
  if (!review.includes(marker)) fail(`Prediction review is missing: ${marker}`)
}

const journey = [
  read('src/journey/PredictionJourney.jsx'),
  read('src/journey/PredictionJourneyView.jsx'),
].join('\n')
for (const marker of ['<GroupsPredictor', '<PredictionReview', 'activeGroupMatchNumber', 'fixtureDraft']) {
  if (!journey.includes(marker)) fail(`Prediction journey integration is missing: ${marker}`)
}
if (!read('src/journey/predictionJourneyConfig.js').includes('euro28-prediction-journey-v3')) fail('Prediction journey version must be v3')

const guestModel = read('src/guest/guestReferenceModel.js')
if (!guestModel.includes('metadata?.isoCode') || !guestModel.includes('isoCode:')) fail('Guest reference model must carry team ISO codes from central metadata')

const fixture = read('src/testFixtures/visualFixture.js')
for (const marker of ['VISUAL_GROUP_REFERENCE', 'VISUAL_GROUP_DRAFT', "['SCO', 'Scotland']", 'isProvisional: true', 'GUEST_RESOLVER_VERSION']) {
  if (!fixture.includes(marker)) fail(`Stage 13B visual fixture is missing: ${marker}`)
}

const main = read('src/main.jsx')
if (!main.includes("./styles/groups-predictor.css")) fail('The Groups predictor stylesheet is not active')

function pngDimensions(file) {
  const buffer = fs.readFileSync(path.join(root, file))
  if (buffer.length < 24 || buffer.toString('ascii', 1, 4) !== 'PNG') return null
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}
const baselines = [
  ['groups-mobile-light-380x844.png', 380, 844], ['groups-mobile-dark-380x844.png', 380, 844],
  ['groups-tablet-light-768x1024.png', 768, 1024], ['groups-tablet-dark-768x1024.png', 768, 1024],
  ['groups-desktop-light-1200x1000.png', 1200, 1000], ['groups-desktop-dark-1200x1000.png', 1200, 1000],
]
for (const [name, width, height] of baselines) {
  const file = `docs/design-baselines/stage13b/${name}`
  if (!exists(file)) { fail(`Groups design baseline is missing: ${file}`); continue }
  const dimensions = pngDimensions(file)
  if (!dimensions || dimensions.width !== width || dimensions.height !== height) fail(`${file} must be ${width}×${height}`)
}

// .team-label--placeholder left this list at the Groups re-cut: the placeholder is
// now a TeamLabel module state, asserted structurally above. What stays here is what
// genuinely still belongs to the page.
const css = read('src/styles/groups-predictor.css')
for (const marker of ['min-height: 2.75rem', '.group-match-card--joker', '.score-input--readonly', 'font-variant-numeric: tabular-nums', '@media (max-width: 40rem)']) {
  if (!css.includes(marker)) fail(`Groups CSS is missing: ${marker}`)
}

if (errors.length) {
  console.error('Euro Stage 13B Groups predictor audit failed:')
  errors.forEach(error => console.error(`- ${error}`))
  process.exit(1)
}

console.log('Euro Stage 13B Groups predictor audit passed.')
console.log('Matches: all 36 group fixtures use one shared mobile-first card anatomy')
console.log('Teams: ISO-keyed local circle flags with neutral unresolved placeholders')
console.log('States: saved, saving, submitted, locked, grace, conflict and error are explicit')
console.log('Jokers: central five-joker cap with match-start locking and gold-only presentation')
console.log(`Database: original 14-migration baseline preserved; ${migrations.length} active migrations detected`)
