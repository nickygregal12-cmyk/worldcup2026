import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const errors = []
const fail = message => errors.push(message)
const migrationName = '202607010013_euro28_leagues_and_shared_predictions.sql'
const migrationPath = path.join(root, 'supabase/migrations', migrationName)
const singleCompetitionMigrationName = '202607070019_euro28_league_single_competition.sql'
const singleCompetitionMigrationPath = path.join(root, 'supabase/migrations', singleCompetitionMigrationName)
const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(name => name.endsWith('.sql')).sort()

if (migrations.length < 14) fail(`Stage 12 requires the original fourteen-migration baseline, found ${migrations.length}`)
if (!fs.existsSync(migrationPath)) fail(`Migration 013 is missing: ${migrationName}`)
else {
  const sql = fs.readFileSync(migrationPath, 'utf8').toLowerCase()
  for (const snippet of [
    'create table public.leagues',
    'create table public.league_members',
    'one membership list supports separate original predictor and ko predictor standings',
    'public.create_my_league',
    'public.join_league_by_code',
    'public.leave_my_league',
    'public.delete_my_league',
    'public.get_my_leagues',
    'public.get_league_standings',
    'public.get_member_predictions_after_lock',
    'public.get_league_member_predictions',
    "p_competition_key not in ('original', 'ko_predictor')",
    'global_original_lock',
    'started_ko_matches_only',
    'prediction_locked_at',
    "match_row.status in ('live', 'paused', 'completed', 'abandoned')",
    'revoke all on table public.leagues, public.league_members from public, anon, authenticated',
  ]) if (!sql.includes(snippet)) fail(`Migration 013 is missing: ${snippet}`)

  if (/grant\s+(?:all|insert|update|delete)[^;]*to\s+(?:anon|authenticated)/i.test(sql)) {
    fail('Migration 013 grants direct browser table writes')
  }
  if (sql.includes('total_points +') || sql.includes('original_points + ko')) {
    fail('league logic appears to combine competition totals')
  }
}

if (!fs.existsSync(singleCompetitionMigrationPath)) fail(`Single-competition migration is missing: ${singleCompetitionMigrationName}`)
else {
  const sql = fs.readFileSync(singleCompetitionMigrationPath, 'utf8').toLowerCase()
  for (const snippet of [
    "add column competition text not null default 'original'",
    'p_competition text',
    "p_competition not in ('original', 'ko_predictor')",
    "'competition', league_row.competition",
  ]) if (!sql.includes(snippet)) fail(`Migration 019 is missing: ${snippet}`)
}

for (const file of [
  'src/leagues/leagueModel.js',
  'src/leagues/leagueService.js',
  'src/leagues/Leagues.jsx',
  'src/leagues/__tests__/leagueModel.test.js',
  'src/leagues/__tests__/leagueService.test.js',
  'docs/archive/STAGE-11-LEAGUES-AND-SHARED-PREDICTIONS.md',
  'supabase/tests/database/013_leagues_and_shared_predictions.test.sql',
]) if (!fs.existsSync(path.join(root, file))) fail(`Stage 11 file is missing: ${file}`)

const app = fs.readFileSync(path.join(root, 'src/App.jsx'), 'utf8')
if (!app.includes('Leagues')) fail('the active foundation does not expose Stage 11 leagues')
if (!app.includes('APP_ROUTE.LEAGUES')) fail('the active app shell no longer routes this feature')

const service = fs.existsSync(path.join(root, 'src/leagues/leagueService.js'))
  ? fs.readFileSync(path.join(root, 'src/leagues/leagueService.js'), 'utf8')
  : ''
for (const rpc of [
  'get_my_leagues',
  'create_my_league',
  'join_league_by_code',
  'leave_my_league',
  'delete_my_league',
  'get_league_standings',
  'get_league_member_predictions',
]) if (!service.includes(rpc)) fail(`league service is missing RPC: ${rpc}`)

const resultService = fs.readFileSync(path.join(root, 'src/results/resultService.js'), 'utf8')
if (!resultService.includes('get_member_predictions_after_lock')) {
  fail('overall leaderboard sharing is missing the controlled post-lock RPC')
}
const resultsView = [
  fs.readFileSync(path.join(root, 'src/results/ResultsAndLeaderboards.jsx'), 'utf8'),
  fs.readFileSync(path.join(root, 'src/results/ResultsPresentation.jsx'), 'utf8'),
  fs.readFileSync(path.join(root, 'src/player/PlayerHeadToHead.jsx'), 'utf8'),
].join('\n')
if (!resultsView.includes('Overall head to head')) fail('overall leaderboard names are not clickable comparison entry points')

const model = fs.existsSync(path.join(root, 'src/leagues/leagueModel.js'))
  ? fs.readFileSync(path.join(root, 'src/leagues/leagueModel.js'), 'utf8')
  : ''
if (!model.includes("ORIGINAL: 'original'")) fail('original league competition key is missing')
if (!model.includes("KO_PREDICTOR: 'ko_predictor'")) fail('KO Predictor league competition key is missing')

const leaguesUi = fs.readFileSync(path.join(root, 'src/leagues/Leagues.jsx'), 'utf8')
const collectionModel = fs.readFileSync(path.join(root, 'src/leagues/leagueCollections.js'), 'utf8')
if (!leaguesUi.includes('LeagueCollectionTabs') || !leaguesUi.includes('visibleLeagues')) {
  fail('league UI does not expose independent Original and KO collections')
}
if (!collectionModel.includes('buildLeagueCollections') || !collectionModel.includes('reconcileLeagueSelections')) {
  fail('league collection model does not preserve independent selections')
}
if (!service.includes('loadLeagueOverview(client, { leagueId, competitionKey })')) {
  fail('league overview does not load the fixed competition explicitly')
}

if (errors.length) {
  console.error('Euro leagues and shared prediction audit failed:')
  errors.forEach(error => console.error(`- ${error}`))
  process.exit(1)
}

console.log('Euro leagues and shared prediction audit passed.')
console.log('Membership: each private league belongs to one fixed competition')
console.log('Collections: Original Predictor and KO Predictor leagues remain independent')
console.log('Original sharing: hidden until the global tournament lock')
console.log('KO sharing: only fixtures that have individually started')
console.log('Direct browser league table writes: none')
console.log(`Active migrations: ${migrations.length}`)
