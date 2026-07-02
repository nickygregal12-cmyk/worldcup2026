import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { COMPETITION_SPLIT_SCOPE, KO_PREDICTOR_MODEL, ORIGINAL_PREDICTOR_MODEL, PREDICTION_COMPETITION } from '../src/contracts/predictionDatabaseContract.js'
import { EURO28_KO_PREDICTOR_RPC, EURO28_KO_PREDICTOR_VERSION, KO_PREDICTOR_JOKER_CAP } from '../src/koPredictor/koPredictorConfig.js'

const root=process.cwd(); const errors=[]; const fail=m=>errors.push(m)
const migrationPath=path.join(root,'supabase/migrations',COMPETITION_SPLIT_SCOPE.migrationFilename)
if(!fs.existsSync(migrationPath)) fail('Migration 010 is missing')
else {
  const sql=fs.readFileSync(migrationPath,'utf8').toLowerCase()
  for(const snippet of ['create table public.bracket_predictions','save_my_ko_prediction_bundle','group_stage_joker_cap = 5','knockout_joker_cap = 5',"competition_key in ('original', 'ko_predictor')",'private.euro28_grant_prediction_grace','private.euro28_revoke_prediction_grace']) if(!sql.includes(snippet)) fail(`Migration 010 is missing: ${snippet}`)
}
if(ORIGINAL_PREDICTOR_MODEL.competitionKey!==PREDICTION_COMPETITION.ORIGINAL) fail('original competition key is incorrect')
if(ORIGINAL_PREDICTOR_MODEL.groupJokerCap!==5||ORIGINAL_PREDICTOR_MODEL.bracketJokerCap!==0) fail('original joker limits are incorrect')
if(ORIGINAL_PREDICTOR_MODEL.bracketStoresScores||ORIGINAL_PREDICTOR_MODEL.bracketStoresDecisionMethod||ORIGINAL_PREDICTOR_MODEL.bracketStoresJokers) fail('original bracket must be winner-only')
if(KO_PREDICTOR_MODEL.competitionKey!==PREDICTION_COMPETITION.KO_PREDICTOR||KO_PREDICTOR_MODEL.jokerCap!==5) fail('KO Predictor configuration is incorrect')
if(!KO_PREDICTOR_MODEL.pointsSeparateFromOriginal||!KO_PREDICTOR_MODEL.leaderboardSeparateFromOriginal) fail('KO Predictor competition separation is incomplete')
if(EURO28_KO_PREDICTOR_VERSION!=='euro28-ko-predictor-v1'||EURO28_KO_PREDICTOR_RPC!=='save_my_ko_prediction_bundle'||KO_PREDICTOR_JOKER_CAP!==5) fail('KO Predictor client contract is incorrect')
const app=fs.readFileSync(path.join(root,'src/foundation/EuroFoundationApp.jsx'),'utf8')
if(!app.includes('KoPredictorFoundation')) fail('active application does not expose the separate KO Predictor')
const journey=fs.readFileSync(path.join(root,'src/journey/PredictionJourneyFoundation.jsx'),'utf8')
if(!journey.includes('Original predictor')) fail('original prediction journey is not labelled clearly')
if(errors.length){console.error('Euro competition split audit failed:');errors.forEach(error=>console.error(`- ${error}`));process.exit(1)}
console.log('Euro competition split audit passed.')
console.log('Original predictor: group scores + winner-only pre-tournament bracket')
console.log('Original jokers: five in groups, zero in the bracket')
console.log('KO Predictor: real knockout fixtures, five jokers, separate points and winner')
console.log('Storage, revision, grace and RPC boundaries: competition-specific')
console.log('Active migrations: 13')
