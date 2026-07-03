import { describe, expect, it } from 'vitest'
import {
  scoreTotalGoalsPick,
  scoreWinnerSetPick,
  TOURNAMENT_PICK_CONTRACT_VERSION,
  TOURNAMENT_PICK_KEYS,
  TOURNAMENT_PICK_POINTS,
  TOURNAMENT_PICK_RULES,
} from '../tournamentPickContract.js'

describe('Euro tournament-pick contract', () => {
  it('is versioned and belongs only to the Original Predictor', () => {
    expect(TOURNAMENT_PICK_CONTRACT_VERSION).toBe('euro28-tournament-picks-v1')
    expect(TOURNAMENT_PICK_RULES).toMatchObject({
      competition: 'original',
      lock: 'global_tournament_lock',
      jokerAllowed: false,
      standaloneAwardsRoute: false,
      playerSelectorActivationStage: '17A',
    })
  })

  it('uses one uniform 20-point value for all three approved picks', () => {
    expect(TOURNAMENT_PICK_POINTS).toEqual({
      total_goals: 20,
      top_scorer: 20,
      highest_scoring_team: 20,
    })
  })

  it('awards every equally nearest total-goals prediction', () => {
    expect(scoreTotalGoalsPick(142, 144, 2)).toBe(20)
    expect(scoreTotalGoalsPick(146, 144, 2)).toBe(20)
    expect(scoreTotalGoalsPick(141, 144, 2)).toBe(0)
  })

  it('accepts any official joint winner for scorer and team picks', () => {
    expect(scoreWinnerSetPick('player-b', ['player-a', 'player-b'], TOURNAMENT_PICK_KEYS.TOP_SCORER)).toBe(20)
    expect(scoreWinnerSetPick('team-b', ['team-a', 'team-b'], TOURNAMENT_PICK_KEYS.HIGHEST_SCORING_TEAM)).toBe(20)
    expect(scoreWinnerSetPick('player-c', ['player-a', 'player-b'], TOURNAMENT_PICK_KEYS.TOP_SCORER)).toBe(0)
  })
})
