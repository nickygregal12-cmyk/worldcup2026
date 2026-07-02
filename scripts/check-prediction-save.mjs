import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { COMPETITION_SPLIT_SCOPE, GUEST_PREDICTION_MODEL, PREDICTION_WRITE_MODEL } from '../src/contracts/predictionDatabaseContract.js'
import { EURO28_PREDICTION_SAVE_RPC, EURO28_PREDICTION_SAVE_VERSION, PREDICTION_SAVE_LIMITS, PREDICTION_SAVE_SOURCE } from '../src/predictions/predictionSaveConfig.js'

const root = process.cwd()
const errors=[]
const fail=message=>errors.push(message)
const migrations=fs.readdirSync(path.join(root,'supabase/migrations')).filter(name=>name.endsWith('.sql')).sort()
if (migrations.length!==14) fail(`Stage 12 requires fourteen migrations, found ${migrations.length}`)
for (const name of ['202607010009_euro28_atomic_prediction_save.sql',COMPETITION_SPLIT_SCOPE.migrationFilename]) if(!migrations.includes(name)) fail(`missing migration: ${name}`)
const sql=fs.readFileSync(path.join(root,'supabase/migrations',COMPETITION_SPLIT_SCOPE.migrationFilename),'utf8').toLowerCase()
for (const snippet of [
  'create or replace function public.save_my_prediction_bundle',
  'create or replace function public.save_my_ko_prediction_bundle',
  'prediction revision is stale',
  'original predictor content is globally locked',
  'group_stage_joker_cap',
  'knockout_joker_cap',
  'bracket_predictions',
  "competition_key = 'original'",
  "competition_key = 'ko_predictor'",
]) if(!sql.includes(snippet)) fail(`Migration 010 save implementation is missing: ${snippet}`)
if (/for\s+(insert|update|delete|all)\s+to\s+(anon|authenticated)/i.test(sql)) fail('Migration 010 creates direct browser write policies')

const predictionFiles=[]
const walk=directory=>{for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);if(entry.isDirectory()){if(entry.name!=='__tests__')walk(file)}else if(/\.(?:js|jsx|mjs)$/.test(entry.name))predictionFiles.push(file)}}
walk(path.join(root,'src/predictions'))
const source=predictionFiles.map(file=>fs.readFileSync(file,'utf8')).join('\n')
for(const forbidden of ['.insert(','.update(','.upsert(','.delete(','service_role']) if(source.includes(forbidden)) fail(`prediction browser code contains forbidden behaviour: ${forbidden}`)
for(const required of ['rpc(EURO28_PREDICTION_SAVE_RPC',".from('prediction_sets')",".from('match_predictions')",".from('bracket_predictions')",'buildCompleteGuestImportRows','expectedRevision','GUEST_IMPORT']) if(!source.includes(required)) fail(`prediction browser code is missing: ${required}`)

if(EURO28_PREDICTION_SAVE_VERSION!=='euro28-original-predictor-save-v2') fail('unexpected original save version')
if(EURO28_PREDICTION_SAVE_RPC!=='save_my_prediction_bundle') fail('unexpected original save RPC')
if(PREDICTION_SAVE_LIMITS.groupMatches!==36||PREDICTION_SAVE_LIMITS.bracketMatches!==15||PREDICTION_SAVE_LIMITS.groupJokers!==5||PREDICTION_SAVE_LIMITS.bracketJokers!==0) fail('original save limits do not match confirmed rules')
if(PREDICTION_SAVE_SOURCE.GUEST_IMPORT!=='guest_import') fail('guest import source is incorrect')
if(PREDICTION_WRITE_MODEL.mode!=='separate_atomic_bundles'||PREDICTION_WRITE_MODEL.directBrowserTableWrites) fail('save model must use separate trusted atomic bundles')
if(!PREDICTION_WRITE_MODEL.validatesWholeBracketPath||!PREDICTION_WRITE_MODEL.validatesGraceScope) fail('server validation is incomplete')
if(!GUEST_PREDICTION_MODEL.explicitImportOnly||GUEST_PREDICTION_MODEL.accountOverwriteAllowed) fail('guest import boundary is incorrect')

if(errors.length){console.error('Euro atomic prediction save audit failed:');errors.forEach(error=>console.error(`- ${error}`));process.exit(1)}
console.log('Euro atomic prediction save audit passed.')
console.log(`Original save contract: ${EURO28_PREDICTION_SAVE_VERSION}`)
console.log(`Original RPC: ${EURO28_PREDICTION_SAVE_RPC}`)
console.log('Original rows: 36 group scores + 15 winner-only bracket picks')
console.log('Group jokers: five; original bracket jokers: zero')
console.log('KO Predictor: separate atomic RPC, points and revision')
console.log('Competition-scoped grace and direct-browser-write prohibition: enforced')
console.log('Active migrations: 14')
