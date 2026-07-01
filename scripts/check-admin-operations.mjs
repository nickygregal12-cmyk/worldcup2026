import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const errors = []
const fail = message => errors.push(message)
const migrationName = '202607010012_euro28_admin_results_operations.sql'
const migrationPath = path.join(root, 'supabase/migrations', migrationName)
const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(name => name.endsWith('.sql')).sort()

if (migrations.length !== 12) fail(`Stage 10 requires twelve active migrations, found ${migrations.length}`)
if (!fs.existsSync(migrationPath)) fail(`Migration 012 is missing: ${migrationName}`)
else {
  const sql = fs.readFileSync(migrationPath, 'utf8').toLowerCase()
  for (const snippet of [
    'create table private.tournament_admins',
    'create table public.admin_operation_events',
    'admin operation events are append-only',
    'private.euro28_set_tournament_admin',
    'private.euro28_require_tournament_admin',
    'public.get_my_tournament_admin_access',
    'public.admin_list_tournament_matches',
    'public.admin_get_match_result_history',
    'public.admin_list_scoring_runs',
    'public.admin_record_match_result',
    'public.admin_update_match_status',
    'public.admin_recalculate_match_points',
    "errcode = '40001'",
    'expected result revision',
    'grant execute on function private.euro28_set_tournament_admin',
    'to service_role',
    'revoke all on table private.tournament_admins from public, anon, authenticated',
    'revoke all on table public.admin_operation_events from public, anon, authenticated',
  ]) if (!sql.includes(snippet)) fail(`Migration 012 is missing: ${snippet}`)

  if (sql.includes('grant execute on function private.euro28_set_tournament_admin(uuid, uuid, text, boolean, uuid, text) to authenticated')) {
    fail('authenticated browser users must never grant administrator access')
  }
  if (/grant\s+(?:all|insert|update|delete)[^;]*to\s+(?:anon|authenticated)/i.test(sql)) {
    fail('Migration 012 grants direct browser table writes')
  }
  if (sql.includes('api-football') || sql.includes('football-data.org') || sql.includes('api_sports')) {
    fail('Stage 10 must not add an external score provider')
  }
}

for (const file of [
  'src/admin/adminOperationsModel.js',
  'src/admin/adminOperationsService.js',
  'src/admin/AdminOperationsFoundation.jsx',
  'src/admin/__tests__/adminOperationsModel.test.js',
  'src/admin/__tests__/adminOperationsService.test.js',
  'docs/STAGE-10-ADMIN-RESULTS-AND-TOURNAMENT-OPERATIONS.md',
  'supabase/tests/database/012_admin_results_operations.test.sql',
]) if (!fs.existsSync(path.join(root, file))) fail(`Stage 10 file is missing: ${file}`)

const app = fs.readFileSync(path.join(root, 'src/foundation/EuroFoundationApp.jsx'), 'utf8')
if (!app.includes('AdminOperationsFoundation')) fail('the active foundation does not expose Stage 10 admin operations')
if (!app.includes('Secure manual result entry now sits above')) fail('Stage 10 public branding is missing')

const service = fs.existsSync(path.join(root, 'src/admin/adminOperationsService.js'))
  ? fs.readFileSync(path.join(root, 'src/admin/adminOperationsService.js'), 'utf8')
  : ''
for (const rpc of [
  'get_my_tournament_admin_access',
  'admin_list_tournament_matches',
  'admin_get_match_result_history',
  'admin_list_scoring_runs',
  'admin_record_match_result',
  'admin_update_match_status',
  'admin_recalculate_match_points',
]) if (!service.includes(rpc)) fail(`admin service is missing RPC: ${rpc}`)

if (errors.length) {
  console.error('Euro admin operations audit failed:')
  errors.forEach(error => console.error(`- ${error}`))
  process.exit(1)
}

console.log('Euro admin operations audit passed.')
console.log('Access: service-managed tournament admins; browser self-grant impossible')
console.log('Result writes: authenticated admin RPCs with optimistic revision checks')
console.log('Operations: status control, correction history and explicit recalculation')
console.log('Audit: required notes and append-only operation events')
console.log('External result APIs: deferred')
console.log('Active migrations: 12')
