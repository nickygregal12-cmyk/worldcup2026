import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const scriptPath = fileURLToPath(import.meta.url)
const projectRoot = path.resolve(path.dirname(scriptPath), '..')
const envPath = path.join(projectRoot, '.env.local')

const EURO28_STAGING_REF = 'gcfdwobpnanjchcnvdco'
const WC26_PRODUCTION_REF = 'ouhxawizadnwrhrjppld'

function loadLocalEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error('.env.local is missing. Add the Euro staging URL and anon key first.')
  }

  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const separatorIndex = line.indexOf('=')
    if (separatorIndex < 1) continue

    const key = line.slice(0, separatorIndex).trim()
    let value = line.slice(separatorIndex + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (!process.env[key]) process.env[key] = value
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function sortForComparison(value) {
  if (Array.isArray(value)) return value.map(sortForComparison)
  if (value === null || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nestedValue]) => [key, sortForComparison(nestedValue)]),
  )
}

function normalise(value) {
  return JSON.stringify(sortForComparison(value))
}

function compareObject(actual, expected, message) {
  assert(normalise(actual) === normalise(expected), message)
}

async function queryOrThrow(query, label) {
  const { data, error } = await query
  if (error) throw new Error(`${label}: ${error.message}`)
  return data
}

loadLocalEnv(envPath)

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

assert(supabaseUrl, 'VITE_SUPABASE_URL is missing from .env.local.')
assert(supabaseAnonKey, 'VITE_SUPABASE_ANON_KEY is missing from .env.local.')

const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
assert(projectRef !== WC26_PRODUCTION_REF, 'Refusing to verify the WC26 production project.')
assert(
  projectRef === EURO28_STAGING_REF,
  `Expected Euro staging project ${EURO28_STAGING_REF}, found ${projectRef}.`,
)

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
})

const tournament = await queryOrThrow(
  supabase
    .from('tournaments')
    .select('id, code, name')
    .eq('code', 'euro-2028')
    .single(),
  'Tournament query failed',
)

const [stages, venues, groups, matches] = await Promise.all([
  queryOrThrow(
    supabase
      .from('tournament_stages')
      .select('id, code')
      .eq('tournament_id', tournament.id),
    'Stage query failed',
  ),
  queryOrThrow(
    supabase
      .from('venues')
      .select('id, slug'),
    'Venue query failed',
  ),
  queryOrThrow(
    supabase
      .from('groups')
      .select('id, code')
      .eq('tournament_id', tournament.id),
    'Group query failed',
  ),
  queryOrThrow(
    supabase
      .from('matches')
      .select([
        'id',
        'stage_id',
        'group_id',
        'venue_id',
        'match_number',
        'fixture_code',
        'matchday',
        'scheduled_date',
        'kickoff_at',
        'status',
        'schedule_status',
        'participants_status',
        'winner_tournament_team_id',
      ].join(', '))
      .eq('tournament_id', tournament.id)
      .gte('match_number', 37)
      .lte('match_number', 51)
      .order('match_number'),
    'Knockout match query failed',
  ),
])

assert(matches.length === 15, `Expected 15 knockout matches, found ${matches.length}.`)

const matchIds = matches.map((match) => match.id)
const slots = await queryOrThrow(
  supabase
    .from('match_slots')
    .select([
      'id',
      'match_id',
      'side',
      'source_type',
      'source_tournament_team_id',
      'source_group_id',
      'source_match_id',
      'source_position',
      'rule_code',
      'rule_data',
      'resolved_tournament_team_id',
      'resolved_at',
    ].join(', '))
    .eq('tournament_id', tournament.id)
    .in('match_id', matchIds),
  'Knockout slot query failed',
)

assert(slots.length === 30, `Expected 30 knockout match slots, found ${slots.length}.`)

const stageById = new Map(stages.map((stage) => [stage.id, stage.code]))
const venueById = new Map(venues.map((venue) => [venue.id, venue.slug]))
const groupById = new Map(groups.map((group) => [group.id, group.code]))
const matchById = new Map(matches.map((match) => [match.id, match]))
const matchByNumber = new Map(matches.map((match) => [match.match_number, match]))
const slotsByMatchNumber = new Map()

for (const slot of slots) {
  const matchNumber = matchById.get(slot.match_id)?.match_number
  assert(matchNumber, `Slot ${slot.id} refers to an unexpected match.`)

  const matchSlots = slotsByMatchNumber.get(matchNumber) ?? {}
  matchSlots[slot.side] = slot
  slotsByMatchNumber.set(matchNumber, matchSlots)
}

const expectedMatches = [
  [37, 'R16-1A-2C', 'round_of_16', '2028-06-24', 'national-stadium-of-wales'],
  [38, 'R16-2A-2B', 'round_of_16', '2028-06-24', 'everton-stadium'],
  [39, 'R16-1B-BT3', 'round_of_16', '2028-06-25', 'st-james-park'],
  [40, 'R16-1C-BT3', 'round_of_16', '2028-06-25', 'manchester-city-stadium'],
  [41, 'R16-1F-BT3', 'round_of_16', '2028-06-26', 'hampden-park'],
  [42, 'R16-2D-2E', 'round_of_16', '2028-06-26', 'tottenham-hotspur-stadium'],
  [43, 'R16-1D-2F', 'round_of_16', '2028-06-27', 'villa-park'],
  [44, 'R16-1E-BT3', 'round_of_16', '2028-06-27', 'dublin-arena'],
  [45, 'QF-W39-W37', 'quarter_final', '2028-06-30', 'wembley-stadium'],
  [46, 'QF-W41-W42', 'quarter_final', '2028-06-30', 'dublin-arena'],
  [47, 'QF-W44-W43', 'quarter_final', '2028-07-01', 'hampden-park'],
  [48, 'QF-W40-W38', 'quarter_final', '2028-07-01', 'national-stadium-of-wales'],
  [49, 'SF-W45-W46', 'semi_final', '2028-07-04', 'wembley-stadium'],
  [50, 'SF-W47-W48', 'semi_final', '2028-07-05', 'wembley-stadium'],
  [51, 'F-W49-W50', 'final', '2028-07-09', 'wembley-stadium'],
]

for (const [matchNumber, fixtureCode, stageCode, scheduledDate, venueSlug] of expectedMatches) {
  const match = matchByNumber.get(matchNumber)
  assert(match, `Match ${matchNumber} is missing.`)
  assert(match.fixture_code === fixtureCode, `Match ${matchNumber} has the wrong fixture code.`)
  assert(stageById.get(match.stage_id) === stageCode, `Match ${matchNumber} has the wrong stage.`)
  assert(match.scheduled_date === scheduledDate, `Match ${matchNumber} has the wrong date.`)
  assert(venueById.get(match.venue_id) === venueSlug, `Match ${matchNumber} has the wrong venue.`)
  assert(match.group_id === null, `Match ${matchNumber} must not belong to a group.`)
  assert(match.matchday === null, `Match ${matchNumber} must not invent a knockout matchday.`)
  assert(match.kickoff_at === null, `Match ${matchNumber} must not invent a kick-off time.`)
  assert(match.status === 'scheduled', `Match ${matchNumber} must remain scheduled.`)
  assert(
    match.schedule_status === 'official_date_venue',
    `Match ${matchNumber} must have official date/venue status.`,
  )
  assert(
    match.participants_status === 'provisional',
    `Match ${matchNumber} participants must remain provisional.`,
  )
  assert(
    match.winner_tournament_team_id === null,
    `Match ${matchNumber} must not have a resolved winner.`,
  )

  const matchSlots = slotsByMatchNumber.get(matchNumber)
  assert(matchSlots?.home && matchSlots?.away, `Match ${matchNumber} must have home and away slots.`)
}

const bestThirdAssignments = {
  39: {
    eligibleGroupCodes: ['A', 'D', 'E', 'F'],
    regulationMatch: 1,
    targetGroupWinner: 'B',
    assignmentByCombination: {
      ABCD: 'A', ABCE: 'A', ABCF: 'A', ABDE: 'D', ABDF: 'D', ABEF: 'E',
      ACDE: 'E', ACDF: 'F', ACEF: 'E', ADEF: 'E', BCDE: 'E', BCDF: 'F',
      BCEF: 'F', BDEF: 'F', CDEF: 'F',
    },
  },
  40: {
    eligibleGroupCodes: ['D', 'E', 'F'],
    regulationMatch: 7,
    targetGroupWinner: 'C',
    assignmentByCombination: {
      ABCD: 'D', ABCE: 'E', ABCF: 'F', ABDE: 'E', ABDF: 'F', ABEF: 'F',
      ACDE: 'D', ACDF: 'D', ACEF: 'F', ADEF: 'F', BCDE: 'D', BCDF: 'D',
      BCEF: 'E', BDEF: 'E', CDEF: 'E',
    },
  },
  41: {
    eligibleGroupCodes: ['A', 'B', 'C'],
    regulationMatch: 3,
    targetGroupWinner: 'F',
    assignmentByCombination: {
      ABCD: 'C', ABCE: 'C', ABCF: 'C', ABDE: 'B', ABDF: 'B', ABEF: 'A',
      ACDE: 'A', ACDF: 'A', ACEF: 'A', ADEF: 'A', BCDE: 'C', BCDF: 'B',
      BCEF: 'B', BDEF: 'B', CDEF: 'C',
    },
  },
  44: {
    eligibleGroupCodes: ['A', 'B', 'C', 'D'],
    regulationMatch: 5,
    targetGroupWinner: 'E',
    assignmentByCombination: {
      ABCD: 'B', ABCE: 'B', ABCF: 'B', ABDE: 'A', ABDF: 'A', ABEF: 'B',
      ACDE: 'C', ACDF: 'C', ACEF: 'C', ADEF: 'D', BCDE: 'B', BCDF: 'C',
      BCEF: 'C', BDEF: 'D', CDEF: 'D',
    },
  },
}

const expectedGroupPositions = {
  37: { home: ['A', 1], away: ['C', 2] },
  38: { home: ['A', 2], away: ['B', 2] },
  39: { home: ['B', 1] },
  40: { home: ['C', 1] },
  41: { home: ['F', 1] },
  42: { home: ['D', 2], away: ['E', 2] },
  43: { home: ['D', 1], away: ['F', 2] },
  44: { home: ['E', 1] },
}

for (const [matchNumberText, sides] of Object.entries(expectedGroupPositions)) {
  const matchNumber = Number(matchNumberText)
  const matchSlots = slotsByMatchNumber.get(matchNumber)

  for (const [side, [groupCode, position]] of Object.entries(sides)) {
    const slot = matchSlots[side]
    assert(slot.source_type === 'group_position', `Match ${matchNumber} ${side} has the wrong source type.`)
    assert(groupById.get(slot.source_group_id) === groupCode, `Match ${matchNumber} ${side} has the wrong group source.`)
    assert(slot.source_position === position, `Match ${matchNumber} ${side} has the wrong group position.`)
    assert(slot.rule_code === 'official_group_finish_v1', `Match ${matchNumber} ${side} has the wrong rule code.`)
    assert(slot.source_match_id === null, `Match ${matchNumber} ${side} group source must not reference a prior match.`)
  }
}

for (const [matchNumberText, expected] of Object.entries(bestThirdAssignments)) {
  const matchNumber = Number(matchNumberText)
  const slot = slotsByMatchNumber.get(matchNumber).away

  assert(slot.source_type === 'best_third', `Match ${matchNumber} must use a best-third away source.`)
  assert(slot.source_position === 3, `Match ${matchNumber} best-third source must use position 3.`)
  assert(slot.rule_code === 'official_best_third_matrix_v1', `Match ${matchNumber} has the wrong best-third rule code.`)
  compareObject(
    slot.rule_data.assignmentByCombination,
    expected.assignmentByCombination,
    `Match ${matchNumber} has the wrong best-third assignment matrix.`,
  )
  compareObject(
    slot.rule_data.eligibleGroupCodes,
    expected.eligibleGroupCodes,
    `Match ${matchNumber} has the wrong eligible best-third groups.`,
  )
  assert(
    slot.rule_data.targetGroupWinner === expected.targetGroupWinner,
    `Match ${matchNumber} has the wrong target group winner.`,
  )
  assert(
    slot.rule_data.regulationMatch === expected.regulationMatch,
    `Match ${matchNumber} has the wrong UEFA regulation match reference.`,
  )
  assert(slot.source_group_id === null, `Match ${matchNumber} best-third source must not preselect a group.`)
  assert(slot.source_match_id === null, `Match ${matchNumber} best-third source must not reference a prior match.`)
}

const expectedWinnerSources = {
  45: { home: 39, away: 37 },
  46: { home: 41, away: 42 },
  47: { home: 44, away: 43 },
  48: { home: 40, away: 38 },
  49: { home: 45, away: 46 },
  50: { home: 47, away: 48 },
  51: { home: 49, away: 50 },
}

for (const [matchNumberText, sides] of Object.entries(expectedWinnerSources)) {
  const matchNumber = Number(matchNumberText)
  const matchSlots = slotsByMatchNumber.get(matchNumber)

  for (const [side, sourceMatchNumber] of Object.entries(sides)) {
    const slot = matchSlots[side]
    const sourceMatch = matchById.get(slot.source_match_id)

    assert(slot.source_type === 'match_winner', `Match ${matchNumber} ${side} must use a match winner source.`)
    assert(sourceMatch?.match_number === sourceMatchNumber, `Match ${matchNumber} ${side} has the wrong source match.`)
    assert(slot.rule_code === 'official_knockout_winner_v1', `Match ${matchNumber} ${side} has the wrong winner rule code.`)
    assert(slot.source_group_id === null, `Match ${matchNumber} ${side} winner source must not reference a group.`)
    assert(slot.source_position === null, `Match ${matchNumber} ${side} winner source must not contain a group position.`)
  }
}

for (const slot of slots) {
  assert(slot.source_tournament_team_id === null, 'A knockout source slot contains a direct tournament team.')
  assert(slot.resolved_tournament_team_id === null, 'A knockout source slot has already resolved a team.')
  assert(slot.resolved_at === null, 'A knockout source slot has an unexpected resolution timestamp.')
}

const sourceCounts = slots.reduce((counts, slot) => {
  counts[slot.source_type] = (counts[slot.source_type] ?? 0) + 1
  return counts
}, {})

assert(sourceCounts.group_position === 12, 'Expected 12 group-position source slots.')
assert(sourceCounts.best_third === 4, 'Expected 4 best-third source slots.')
assert(sourceCounts.match_winner === 14, 'Expected 14 prior-match-winner source slots.')

console.log('Euro 2028 hosted knockout verification passed.')
console.log(`Project: ${projectRef}`)
console.log(`Tournament: ${tournament.name}`)
console.log('Knockout matches: 15')
console.log('Knockout match slots: 30')
console.log('Round of 16 group-position sources: 12')
console.log('Round of 16 best-third sources: 4')
console.log('Prior-match-winner sources: 14')
console.log('Invented kick-off times: 0')
console.log('Resolved knockout teams: 0')
