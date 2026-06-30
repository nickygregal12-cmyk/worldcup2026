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
const lock = read('src/contracts/lockContract.js')
const result = read('src/contracts/resultContract.js')
const scoring = read('src/lib/scoring.js')
const combined = [prediction, lock, result, scoring].join('\n')

const configValidation = validateScoringConfig(EURO_SCORING_CONFIG)
if (!configValidation.valid) {
  configValidation.errors.forEach(error => fail(`invalid central scoring config: ${error}`))
}
if (EURO_SCORING_CONFIG.status !== SCORING_CONFIG_STATUS.PROVISIONAL) {
  fail('scoring values must remain provisional until formally approved')
}

const requiredSnippets = [
  [prediction, "from '../config/scoringConfig.js'", 'prediction calculations must import the central scoring config'],
  [prediction, 'EURO_SCORING_CONFIG.match', 'match points must come from the central scoring config'],
  [prediction, 'EURO_SCORING_CONFIG.knockout', 'knockout points must come from the central scoring config'],
  [prediction, 'EURO_SCORING_CONFIG.bracket', 'bracket points must come from the central scoring config'],
  [lock, "UNCONFIGURED: 'unconfigured'", 'lock must fail closed when unconfigured'],
  [lock, 'persisted_lock', 'persisted lock must remain monotonic'],
  [result, "PENALTIES: 'penalties'", 'penalty decisions must remain explicit'],
  [result, 'penalty_home_goals', 'shoot-out score must remain separate'],
]

for (const [source, snippet, message] of requiredSnippets) {
  if (!source.includes(snippet)) fail(message)
}

const copiedPointDefinitionPattern = /(?:EXACT_SCORE|CORRECT_OUTCOME|CORRECT_ADVANCING_TEAM|CORRECT_DECISION_METHOD)\s*:\s*\d+/
if (copiedPointDefinitionPattern.test(prediction) || copiedPointDefinitionPattern.test(scoring)) {
  fail('point values were copied outside src/config/scoringConfig.js')
}

const bannedActiveTerms = [
  ['JOKER_MULTIPLIER', 'joker multiplier'],
  ['league_lock', 'league-specific lock'],
  ['rolling_lock', 'rolling lock'],
  ['first_goal_time', 'first-goal prediction'],
]

for (const [term, label] of bannedActiveTerms) {
  if (combined.includes(term)) fail(`${label} has returned to the active Euro contracts`)
}

if (!process.exitCode) {
  console.log('Euro prediction contract checks passed.')
  console.log('Global locks: 1')
  console.log(`Scoring ruleset: ${EURO_SCORING_CONFIG.version} (${EURO_SCORING_CONFIG.status})`)
  console.log(`Match score: exact ${EURO_SCORING_CONFIG.match.EXACT_SCORE}, correct outcome ${EURO_SCORING_CONFIG.match.CORRECT_OUTCOME}`)
  console.log(`Knockout: advancing team ${EURO_SCORING_CONFIG.knockout.CORRECT_ADVANCING_TEAM}, decision method ${EURO_SCORING_CONFIG.knockout.CORRECT_DECISION_METHOD}`)
  console.log('All point values are read from src/config/scoringConfig.js')
  console.log('Jokers, confidence multipliers and league-specific locks: none')
  console.log('Penalty shoot-out scores: stored separately')
}
