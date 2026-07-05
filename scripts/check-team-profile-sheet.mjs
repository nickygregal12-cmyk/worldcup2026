import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const errors = []
const fail = message => errors.push(message)
const exists = relativePath => fs.existsSync(path.join(root, relativePath))
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')

for (const file of [
  'docs/STAGE-13E-TEAM-PROFILE-SHEET.md',
  'scripts/check-team-profile-sheet.mjs',
  'src/teamProfile/TeamProfileProvider.jsx',
  'src/teamProfile/TeamProfileSheet.jsx',
  'src/teamProfile/teamProfileModel.js',
  'src/teamProfile/teamProfileService.js',
  'src/teamProfile/__tests__/teamProfileModel.test.js',
  'src/teamProfile/__tests__/teamProfileService.test.js',
  'src/teamProfile/__tests__/TeamProfileSheet.test.jsx',
  'src/design-system/teamProfileContext.js',
  'src/design-system/teamProfileActivation.js',
  'supabase/migrations/202607020015_euro28_team_profile_sheet.sql',
  'supabase/tests/database/015_team_profile_sheet.test.sql',
  'docs/design-baselines/stage13e/README.md',
]) if (!exists(file)) fail(`Team Profile Sheet file is missing: ${file}`)

const migration = read('supabase/migrations/202607020015_euro28_team_profile_sheet.sql')
for (const marker of [
  'create table public.tournament_team_profiles',
  'get_team_profile_sheet',
  'admin_list_team_profiles',
  'admin_upsert_team_profile',
  'prediction_locked_at',
  "'aggregates', aggregate_payload",
  "'team_profile_updated'",
  'private.euro28_require_tournament_owner',
]) if (!migration.includes(marker)) fail(`Migration 015 is missing: ${marker}`)
if (migration.includes('http://') || migration.includes('https://')) fail('Team profiles must not introduce an external football-data source')

const teamLabel = read('src/design-system/TeamLabel.jsx')
for (const marker of ['useTeamProfileActivation', 'data-team-profile-trigger', 'teamProfileActivation']) {
  if (!teamLabel.includes(marker)) fail(`TeamLabel integration is missing: ${marker}`)
}

const originalBracket = read('src/journey/OriginalBracket.jsx')
const koMatchCentre = read('src/koPredictor/KoPredictorMatchCentre.jsx')
if (!originalBracket.includes('bracket-team-choice__action')) fail('Original Bracket must keep profile and progression actions separate')
if (!koMatchCentre.includes('ko-team-choice__action')) fail('KO Predictor must keep profile and advancing-team actions separate')

const sheet = read('src/teamProfile/TeamProfileSheet.jsx')
for (const marker of ['Community percentages are private', 'Your prediction', 'Tournament so far', 'Provisional data']) {
  if (!sheet.includes(marker)) fail(`Team profile presentation is missing: ${marker}`)
}

const service = read('src/teamProfile/teamProfileService.js')
if (!service.includes("client.rpc('get_team_profile_sheet'")) fail('Team profile content must use the privacy-safe RPC')
if (!service.includes('loadCanonicalTournamentSnapshot')) fail('Team tournament form must use app-owned official results')

const admin = read('src/admin/AdminTeamProfiles.jsx')
for (const marker of ['Curated team facts', 'only the tournament owner can edit it', 'saveAdminTeamProfile']) {
  if (!admin.includes(marker)) fail(`Admin team profile control is missing: ${marker}`)
}


function pngDimensions(relativePath) {
  const buffer = fs.readFileSync(path.join(root, relativePath))
  if (buffer.length < 24 || buffer.toString('ascii', 1, 4) !== 'PNG') return null
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}

for (const [name, width, height] of [
  ['team-profile-mobile-light-380x844.png', 380, 844],
  ['team-profile-mobile-dark-380x844.png', 380, 844],
  ['team-profile-tablet-light-768x1024.png', 768, 1024],
  ['team-profile-tablet-dark-768x1024.png', 768, 1024],
  ['team-profile-desktop-light-1200x1000.png', 1200, 1000],
  ['team-profile-desktop-dark-1200x1000.png', 1200, 1000],
]) {
  const relativePath = `docs/design-baselines/stage13e/${name}`
  if (!exists(relativePath)) {
    fail(`Team Profile Sheet baseline is missing: ${relativePath}`)
    continue
  }
  const dimensions = pngDimensions(relativePath)
  if (!dimensions || dimensions.width !== width || dimensions.height !== height) {
    fail(`${relativePath} must be ${width}×${height}`)
  }
}

const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(name => name.endsWith('.sql'))
if (migrations.length < 16) fail(`Stage 13E must retain Migration 016 and later approved migrations, found ${migrations.length}`)

const packageJson = JSON.parse(read('package.json'))
if (packageJson.scripts?.['audit:team-profile'] !== 'node scripts/check-team-profile-sheet.mjs') fail('audit:team-profile is not wired correctly')
if (!packageJson.scripts?.check?.includes('npm run audit:team-profile')) fail('npm run check does not include audit:team-profile')
if (!packageJson.scripts?.['lint:foundation']?.includes('src/teamProfile')) fail('Team profile source is not included in the foundation lint gate')

if (errors.length) {
  console.error('Euro Stage 13E Team Profile Sheet audit failed:')
  errors.forEach(error => console.error(`- ${error}`))
  process.exit(1)
}

console.log('Euro Stage 13E Team Profile Sheet audit passed.')
console.log('Interaction: the shared TeamLabel identity is the only profile trigger.')
console.log('Sources: curated admin content, app-owned tournament data and privacy-gated Original Predictor aggregates only.')
console.log('Privacy: aggregate payload is absent before the persisted global lock.')
console.log('Visual references: Team Profile Sheet at 380, 768 and 1200 pixels in light and dark appearance.')
console.log('Database: Migration 015 adds revision-safe curated content and protected RPCs.')
