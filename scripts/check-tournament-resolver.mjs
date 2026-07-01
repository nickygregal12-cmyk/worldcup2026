import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import {
  EURO28_BEST_THIRD_COMBINATIONS,
  EURO28_BEST_THIRD_MATRIX,
  EURO28_GROUP_CODES,
  EURO28_KNOCKOUT_MATCHES,
  EURO28_RESOLVER_VERSION,
  EURO28_TIE_BREAK_CONFIG,
  RESOLVER_CONTEXT,
} from '../src/resolver/euro28ResolverConfig.js'
import { resolveBestThirdAssignments } from '../src/resolver/bestThird.js'

const scriptPath = fileURLToPath(import.meta.url)
const root = path.resolve(path.dirname(scriptPath), '..')
const errors = []

function fail(message) {
  errors.push(message)
}

if (EURO28_RESOLVER_VERSION !== 'euro28-canonical-resolver-v1') {
  fail('unexpected canonical resolver version')
}
if (EURO28_TIE_BREAK_CONFIG.status !== 'provisional') {
  fail('Euro 2028 tie-break rules must remain explicitly provisional')
}
if (EURO28_TIE_BREAK_CONFIG.unresolvedItems.length === 0) {
  fail('provisional tie-break config must retain unresolved launch checks')
}
if (JSON.stringify(Object.values(RESOLVER_CONTEXT)) !== JSON.stringify(['guest', 'predicted', 'live'])) {
  fail('guest, predicted and live must remain separate resolver contexts')
}
if (EURO28_GROUP_CODES.join('') !== 'ABCDEF') fail('Euro 2028 resolver must contain groups A to F')
if (EURO28_BEST_THIRD_COMBINATIONS.length !== 15 || new Set(EURO28_BEST_THIRD_COMBINATIONS).size !== 15) {
  fail('best-third config must contain all 15 unique combinations')
}

for (const combinationKey of EURO28_BEST_THIRD_COMBINATIONS) {
  const qualifiedThirds = combinationKey.split('').map(groupCode => ({
    groupCode,
    teamId: `${groupCode}3`,
  }))
  const resolved = resolveBestThirdAssignments(qualifiedThirds)
  const assignedGroups = Object.values(resolved.assignmentsByMatch)
    .map(row => row.thirdPlaceGroup)
    .sort()
    .join('')
  if (assignedGroups !== combinationKey) {
    fail(`best-third combination ${combinationKey} is not allocated exactly once`)
  }
}

const expectedStageCounts = {
  round_of_16: 8,
  quarter_final: 4,
  semi_final: 2,
  final: 1,
}
if (EURO28_KNOCKOUT_MATCHES.length !== 15) fail('resolver must contain 15 knockout matches')
for (const [stage, expectedCount] of Object.entries(expectedStageCounts)) {
  const actualCount = EURO28_KNOCKOUT_MATCHES.filter(match => match.stage === stage).length
  if (actualCount !== expectedCount) fail(`${stage} must contain ${expectedCount} matches, found ${actualCount}`)
}
for (let matchNumber = 37; matchNumber <= 51; matchNumber += 1) {
  if (!EURO28_KNOCKOUT_MATCHES.some(match => match.matchNumber === matchNumber)) {
    fail(`knockout match ${matchNumber} is missing`)
  }
}
for (const match of EURO28_KNOCKOUT_MATCHES) {
  for (const slot of [match.home, match.away]) {
    if (slot.sourceType === 'match_winner' && slot.matchNumber >= match.matchNumber) {
      fail(`match ${match.matchNumber} depends on non-earlier match ${slot.matchNumber}`)
    }
  }
}

const migrationPath = path.join(root, 'supabase/migrations/202606300004_euro28_official_knockout_skeleton.sql')
const migration = fs.readFileSync(migrationPath, 'utf8')
const matrixBlockPattern = /"targetGroupWinner":"([BCEF])"[\s\S]*?"assignmentByCombination":\{([\s\S]*?)\}\s*,\s*"regulationMatch"/g
const migrationMatrices = {}
for (const block of migration.matchAll(matrixBlockPattern)) {
  const targetGroupWinner = block[1]
  const assignments = {}
  for (const assignment of block[2].matchAll(/"([A-F]{4})":"([A-F])"/g)) {
    assignments[assignment[1]] = assignment[2]
  }
  migrationMatrices[targetGroupWinner] = assignments
}

for (const targetGroupWinner of ['B', 'C', 'F', 'E']) {
  if (!migrationMatrices[targetGroupWinner]) {
    fail(`Migration 004 matrix for winner ${targetGroupWinner} was not found`)
    continue
  }
  for (const combinationKey of EURO28_BEST_THIRD_COMBINATIONS) {
    if (migrationMatrices[targetGroupWinner][combinationKey] !== EURO28_BEST_THIRD_MATRIX[targetGroupWinner][combinationKey]) {
      fail(`runtime matrix differs from Migration 004 for ${targetGroupWinner}/${combinationKey}`)
    }
  }
}

const resolverRoot = path.join(root, 'src/resolver')
const resolverSources = []
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name)
    if (entry.isDirectory() && entry.name !== '__tests__') walk(filePath)
    else if (/\.(?:js|mjs)$/.test(entry.name)) resolverSources.push(filePath)
  }
}
walk(resolverRoot)

const combinedSource = resolverSources.map(filePath => fs.readFileSync(filePath, 'utf8')).join('\n')
const bannedResolverTerms = [
  "from '../lib/bracketUtils.js'",
  'src/lib/bracketUtils.js',
  '@supabase/supabase-js',
  '.from(',
  '.insert(',
  '.update(',
  '.upsert(',
]
for (const term of bannedResolverTerms) {
  if (combinedSource.includes(term)) fail(`canonical resolver contains banned dependency or database operation: ${term}`)
}

if (errors.length > 0) {
  console.error('Euro canonical tournament resolver audit failed:')
  errors.forEach(error => console.error(`- ${error}`))
  process.exit(1)
}

console.log('Euro canonical tournament resolver audit passed.')
console.log(`Resolver: ${EURO28_RESOLVER_VERSION}`)
console.log(`Contexts: ${Object.values(RESOLVER_CONTEXT).join(', ')} (never blended)`)
console.log(`Groups: ${EURO28_GROUP_CODES.length}; group matches: 36; knockout matches: ${EURO28_KNOCKOUT_MATCHES.length}`)
console.log(`Best-third combinations verified: ${EURO28_BEST_THIRD_COMBINATIONS.length}`)
console.log('Runtime best-third matrix matches Migration 004.')
console.log(`Tie-break contract: ${EURO28_TIE_BREAK_CONFIG.status}`)
console.log('Database writes and inherited WC26 bracket imports: none')
