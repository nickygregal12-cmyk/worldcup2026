export const EURO28_RESOLVER_VERSION = 'euro28-canonical-resolver-v1'

export const RESOLVER_CONTEXT = Object.freeze({
  GUEST: 'guest',
  PREDICTED: 'predicted',
  LIVE: 'live',
})

export const EURO28_GROUP_CODES = Object.freeze(['A', 'B', 'C', 'D', 'E', 'F'])

export const EURO28_TIE_BREAK_CONFIG = Object.freeze({
  version: 'euro28-provisional-tiebreak-v1',
  status: 'provisional',
  groupCriteria: Object.freeze([
    'points',
    'head_to_head_points',
    'head_to_head_goal_difference',
    'head_to_head_goals_for',
    'overall_goal_difference',
    'overall_goals_for',
    'overall_wins',
    'fair_play_points',
    'qualifier_ranking',
    'stable_preview_fallback',
  ]),
  bestThirdCriteria: Object.freeze([
    'points',
    'overall_goal_difference',
    'overall_goals_for',
    'overall_wins',
    'fair_play_points',
    'qualifier_ranking',
    'stable_preview_fallback',
  ]),
  unresolvedItems: Object.freeze([
    'UEFA EURO 2028 final tie-break wording must be rechecked before launch.',
    'Any special final-match penalty-shootout tie-break remains deliberately unimplemented.',
    'Fair-play points and qualifier ranking must be supplied before they can resolve a tie.',
    'The stable preview fallback is deterministic only and is never represented as an official tie-break.',
  ]),
})

export const EURO28_BEST_THIRD_COMBINATIONS = Object.freeze([
  'ABCD',
  'ABCE',
  'ABCF',
  'ABDE',
  'ABDF',
  'ABEF',
  'ACDE',
  'ACDF',
  'ACEF',
  'ADEF',
  'BCDE',
  'BCDF',
  'BCEF',
  'BDEF',
  'CDEF',
])

export const EURO28_BEST_THIRD_MATRIX = Object.freeze({
  B: Object.freeze({
    ABCD: 'A', ABCE: 'A', ABCF: 'A', ABDE: 'D', ABDF: 'D',
    ABEF: 'E', ACDE: 'E', ACDF: 'F', ACEF: 'E', ADEF: 'E',
    BCDE: 'E', BCDF: 'F', BCEF: 'F', BDEF: 'F', CDEF: 'F',
  }),
  C: Object.freeze({
    ABCD: 'D', ABCE: 'E', ABCF: 'F', ABDE: 'E', ABDF: 'F',
    ABEF: 'F', ACDE: 'D', ACDF: 'D', ACEF: 'F', ADEF: 'F',
    BCDE: 'D', BCDF: 'D', BCEF: 'E', BDEF: 'E', CDEF: 'E',
  }),
  F: Object.freeze({
    ABCD: 'C', ABCE: 'C', ABCF: 'C', ABDE: 'B', ABDF: 'B',
    ABEF: 'A', ACDE: 'A', ACDF: 'A', ACEF: 'A', ADEF: 'A',
    BCDE: 'C', BCDF: 'B', BCEF: 'B', BDEF: 'B', CDEF: 'C',
  }),
  E: Object.freeze({
    ABCD: 'B', ABCE: 'B', ABCF: 'B', ABDE: 'A', ABDF: 'A',
    ABEF: 'B', ACDE: 'C', ACDF: 'C', ACEF: 'C', ADEF: 'D',
    BCDE: 'B', BCDF: 'C', BCEF: 'C', BDEF: 'D', CDEF: 'D',
  }),
})

export const EURO28_BEST_THIRD_TARGET_MATCHES = Object.freeze({
  B: 39,
  C: 40,
  F: 41,
  E: 44,
})

const groupPosition = (groupCode, position) => Object.freeze({
  sourceType: 'group_position',
  groupCode,
  position,
})

const bestThird = targetGroupWinner => Object.freeze({
  sourceType: 'best_third',
  targetGroupWinner,
})

const matchWinner = matchNumber => Object.freeze({
  sourceType: 'match_winner',
  matchNumber,
})

export const EURO28_KNOCKOUT_MATCHES = Object.freeze([
  Object.freeze({ matchNumber: 37, stage: 'round_of_16', home: groupPosition('A', 1), away: groupPosition('C', 2) }),
  Object.freeze({ matchNumber: 38, stage: 'round_of_16', home: groupPosition('A', 2), away: groupPosition('B', 2) }),
  Object.freeze({ matchNumber: 39, stage: 'round_of_16', home: groupPosition('B', 1), away: bestThird('B') }),
  Object.freeze({ matchNumber: 40, stage: 'round_of_16', home: groupPosition('C', 1), away: bestThird('C') }),
  Object.freeze({ matchNumber: 41, stage: 'round_of_16', home: groupPosition('F', 1), away: bestThird('F') }),
  Object.freeze({ matchNumber: 42, stage: 'round_of_16', home: groupPosition('D', 2), away: groupPosition('E', 2) }),
  Object.freeze({ matchNumber: 43, stage: 'round_of_16', home: groupPosition('D', 1), away: groupPosition('F', 2) }),
  Object.freeze({ matchNumber: 44, stage: 'round_of_16', home: groupPosition('E', 1), away: bestThird('E') }),
  Object.freeze({ matchNumber: 45, stage: 'quarter_final', home: matchWinner(39), away: matchWinner(37) }),
  Object.freeze({ matchNumber: 46, stage: 'quarter_final', home: matchWinner(41), away: matchWinner(42) }),
  Object.freeze({ matchNumber: 47, stage: 'quarter_final', home: matchWinner(44), away: matchWinner(43) }),
  Object.freeze({ matchNumber: 48, stage: 'quarter_final', home: matchWinner(40), away: matchWinner(38) }),
  Object.freeze({ matchNumber: 49, stage: 'semi_final', home: matchWinner(45), away: matchWinner(46) }),
  Object.freeze({ matchNumber: 50, stage: 'semi_final', home: matchWinner(47), away: matchWinner(48) }),
  Object.freeze({ matchNumber: 51, stage: 'final', home: matchWinner(49), away: matchWinner(50) }),
])
