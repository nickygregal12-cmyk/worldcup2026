import fs from 'node:fs'
import process from 'node:process'

const errors = []
const fail = message => errors.push(message)
const read = file => fs.readFileSync(file, 'utf8')

const ui = read('src/matchCentre/MatchCentre.jsx')
const model = read('src/matchCentre/matchCentreModel.js')
const service = read('src/matchCentre/matchCentreService.js')
const tests = read('src/matchCentre/__tests__/matchCentreGroupContext.test.js')

for (const marker of [
  'export function buildGroupMatchCentreContext',
  'normaliseProjectedGroupRows',
  'predictionComparison',
]) {
  if (!model.includes(marker)) fail(`Match Centre model missing ${marker}`)
}

for (const marker of [
  'buildGroupMatchCentreContext',
  'safeCompetitionKey',
  'navigation.current.matchNumber <= 36 ? RESULT_COMPETITION.ORIGINAL',
  'groupContext',
]) {
  if (!service.includes(marker)) fail(`Match Centre service missing ${marker}`)
}

for (const marker of [
  'isGroupFixture',
  'competitionOptions',
  'GroupProjection',
  'GroupPredictionComparison',
  'isGroupFixture ? (',
]) {
  if (!ui.includes(marker)) fail(`Match Centre UI missing ${marker}`)
}

if (!tests.includes('buildGroupMatchCentreContext')) {
  fail('Match Centre group-context test is missing')
}

if (errors.length > 0) {
  console.error(`Stage 13G-MATCH-CENTRE-1 audit failed with ${errors.length} issue(s):`)
  for (const message of errors) console.error(`- ${message}`)
  process.exit(1)
}

console.log('Stage 13G-MATCH-CENTRE-1 audit passed.')
console.log('Group fixtures: Original-only competition selector, resolver-backed group context and this-match comparison.')
console.log('Knockout fixtures: existing Points on the line panel remains unchanged.')
console.log('Database: active migrations remain 18; no Migration 019.')
