import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {
  EURO_SCORING_CONFIG,
  SCORING_CONFIG_STATUS,
  validateScoringConfig,
} from '../src/config/scoringConfig.js'

const root = process.cwd()
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const fail = message => {
  console.error(`Prediction contract check failed: ${message}`)
  process.exitCode = 1
}

const prediction = read('src/contracts/predictionContract.js')
const database = read('src/contracts/predictionDatabaseContract.js')
const lock = read('src/contracts/lockContract.js')
const result = read('src/contracts/resultContract.js')
const scoring = read('src/lib/scoring.js')

const validation = validateScoringConfig(EURO_SCORING_CONFIG)
if (!validation.valid) validation.errors.forEach(error => fail(`invalid central scoring config: ${error}`))
if (EURO_SCORING_CONFIG.status !== SCORING_CONFIG_STATUS.PROVISIONAL) fail('scoring values must remain provisional until formally approved')

for (const [source, snippet, message] of [
  [prediction, 'EURO_SCORING_CONFIG.match', 'match points must use the central scoring config'],
  [prediction, 'EURO_SCORING_CONFIG.koPredictor', 'KO Predictor points must use the separate central config'],
  [prediction, 'EURO_SCORING_CONFIG.bracket', 'original bracket points must use the central config'],
  [prediction, 'EURO_SCORING_CONFIG.joker', 'joker values must use the central config'],
  [database, "KO_PREDICTOR: 'ko_predictor'", 'the separate KO Predictor competition key is missing'],
  [database, "BRACKET_PICK: 'bracket_pick'", 'winner-only bracket rows are missing'],
  [database, "KO_MATCH_SCORE: 'ko_match_score'", 'real KO match-score rows are missing'],
  [lock, 'canEditJoker', 'joker placement must have a match-kick-off lock'],
  [lock, 'canUsePredictionGrace', 'scoped grace timing must remain explicit'],
  [result, "PENALTIES: 'penalties'", 'penalty decisions must remain explicit'],
  [result, 'penalty_home_goals', 'shoot-out scores must remain separate from predictions'],
]) if (!source.includes(snippet)) fail(message)

const copiedPointDefinitionPattern = /(?:^|[\n,{])\s*(?:EXACT_SCORE|CORRECT_OUTCOME|CORRECT_ADVANCING_TEAM|CORRECT_DECISION_METHOD|MULTIPLIER)\s*:\s*\d+/m
if (copiedPointDefinitionPattern.test(prediction) || copiedPointDefinitionPattern.test(scoring)) fail('scoring values were copied outside src/config/scoringConfig.js')

if (!process.exitCode) {
  console.log('Euro prediction contract checks passed.')
  console.log('Original predictor: 36 group scores + winner-only pre-tournament bracket')
  console.log('KO Predictor: separate real-match competition with separate totals and winner')
  console.log('Prediction content locks: one global original-predictor lock')
  console.log('Joker placement locks: each relevant match kick-off')
  console.log('Grace: audited competition + user + match exception for unstarted matches only')
  console.log(`Match score: exact ${EURO_SCORING_CONFIG.match.EXACT_SCORE}, correct outcome ${EURO_SCORING_CONFIG.match.CORRECT_OUTCOME}`)
  console.log(`KO Predictor: advancing team ${EURO_SCORING_CONFIG.koPredictor.CORRECT_ADVANCING_TEAM}, method ${EURO_SCORING_CONFIG.koPredictor.CORRECT_DECISION_METHOD}`)
  console.log(`Jokers: 5 group, 0 original bracket, 5 KO Predictor; ${EURO_SCORING_CONFIG.joker.MULTIPLIER}x multiplier`)
}
