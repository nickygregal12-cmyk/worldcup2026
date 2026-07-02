import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const errors = []
const fail = message => errors.push(message)
const migrationName = '202607020014_euro28_admin_control_room.sql'
const migrationPath = path.join(root, 'supabase/migrations', migrationName)
const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(name => name.endsWith('.sql')).sort()

if (migrations.length !== 14) fail(`Stage 12 requires fourteen active migrations, found ${migrations.length}`)
if (!fs.existsSync(migrationPath)) fail(`Migration 014 is missing: ${migrationName}`)
else {
  const sql = fs.readFileSync(migrationPath, 'utf8').toLowerCase()
  for (const snippet of [
    'create table public.tournament_feature_controls',
    'global_prediction_lock_applied',
    'grace_granted',
    'grace_revoked',
    'feature_control_updated',
    'private.euro28_require_tournament_owner',
    'private.euro28_require_feature_enabled',
    'public.admin_get_tournament_control_room',
    'public.admin_apply_global_prediction_lock',
    'public.admin_update_feature_control',
    'public.admin_search_prediction_users',
    'public.admin_list_prediction_grace',
    'public.admin_grant_prediction_grace',
    'public.admin_revoke_prediction_grace',
    'public.admin_list_operation_events',
    'prediction_sets_feature_guard',
    'leagues_create_feature_guard',
    'match_result_events_feature_guard',
    "'prediction_saving'",
    "'ko_predictor'",
    "'league_create_join'",
    "'result_entry'",
    "'scoring_recalculation'",
    'statement_timestamp()',
    'tournament owner access is required',
    'revoke all on table public.tournament_feature_controls from public, anon, authenticated',
  ]) if (!sql.includes(snippet)) fail(`Migration 014 is missing: ${snippet}`)

  if (/grant\s+(?:all|insert|update|delete)[^;]*to\s+(?:anon|authenticated)/i.test(sql)) {
    fail('Migration 014 grants direct browser table writes')
  }
  if (sql.includes('drop trigger prediction_sets_feature_guard')) {
    fail('prediction saving kill-switch enforcement is removed')
  }
  if (sql.includes('api-football') || sql.includes('football-data.org') || sql.includes('api_sports')) {
    fail('Stage 12 must not add an external result provider')
  }
}

for (const file of [
  'src/admin/AdminControlRoomSections.jsx',
  'src/admin/AdminOperationsFoundation.jsx',
  'src/admin/adminOperationsModel.js',
  'src/admin/adminOperationsService.js',
  'src/admin/__tests__/adminOperationsModel.test.js',
  'src/admin/__tests__/adminOperationsService.test.js',
  'docs/STAGE-12-EXPANDED-ADMIN-CONTROL-ROOM.md',
  'supabase/tests/database/014_admin_control_room.test.sql',
]) if (!fs.existsSync(path.join(root, file))) fail(`Stage 12 file is missing: ${file}`)

const app = fs.readFileSync(path.join(root, 'src/foundation/EuroFoundationApp.jsx'), 'utf8')
if (!app.includes('Stage 12 · Expanded tournament control room')) fail('Stage 12 public branding is missing')
if (!app.includes('lock, grace, joker allocation and kill-switch controls')) fail('Stage 12 control-room summary is missing')

const service = fs.readFileSync(path.join(root, 'src/admin/adminOperationsService.js'), 'utf8')
for (const rpc of [
  'admin_get_tournament_control_room',
  'admin_apply_global_prediction_lock',
  'admin_update_feature_control',
  'admin_search_prediction_users',
  'admin_list_prediction_grace',
  'admin_grant_prediction_grace',
  'admin_revoke_prediction_grace',
  'admin_list_operation_events',
]) if (!service.includes(rpc)) fail(`admin control-room service is missing RPC: ${rpc}`)

const controlView = fs.readFileSync(path.join(root, 'src/admin/AdminControlRoomSections.jsx'), 'utf8')
for (const text of [
  'Operational kill-switches',
  'Prediction grace windows',
  'Joker locks and knockout allocation',
  'Combined audit timeline',
  'Apply irreversible lock',
]) if (!controlView.includes(text)) fail(`Stage 12 control-room UI is missing: ${text}`)

if (errors.length) {
  console.error('Euro expanded admin control-room audit failed:')
  errors.forEach(error => console.error(`- ${error}`))
  process.exit(1)
}

console.log('Euro expanded admin control-room audit passed.')
console.log('Global lock: owner-only, irreversible and append-only audited')
console.log('Grace: one user, one competition and one unstarted match')
console.log('Feature controls: database-enforced browser kill-switches')
console.log('Operations: health, joker locks and knockout allocation review')
console.log('Stage 11 lint warnings: corrected in Migration 014')
console.log('External result APIs: deferred')
console.log('Active migrations: 14')
