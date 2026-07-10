import { describe, expect, it } from 'vitest'
import {
  GROUP_GOALS_TIERS,
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

  it('scores Top Scorer at 30 and has dropped Highest-Scoring Team entirely', () => {
    expect(TOURNAMENT_PICK_POINTS).toEqual({ top_scorer: 30 })
    expect(TOURNAMENT_PICK_KEYS).toEqual({ TOTAL_GOALS: 'total_goals', TOP_SCORER: 'top_scorer' })
    expect(TOURNAMENT_PICK_KEYS).not.toHaveProperty('HIGHEST_SCORING_TEAM')
  })

  it('scores group-goals total in tiers of 25 / 15 / 5', () => {
    expect(GROUP_GOALS_TIERS).toEqual({ EXACT: 25, WITHIN_5: 15, WITHIN_10: 5 })
    expect(scoreTotalGoalsPick(144, 144)).toBe(25)
    expect(scoreTotalGoalsPick(144, 149)).toBe(15) // exactly 5 off
    expect(scoreTotalGoalsPick(144, 134)).toBe(5) // exactly 10 off
    expect(scoreTotalGoalsPick(144, 133)).toBe(0) // 11 off
  })

  it('pays Top Scorer in full to any picker of a joint winner', () => {
    expect(scoreWinnerSetPick('player-b', ['player-a', 'player-b'], TOURNAMENT_PICK_KEYS.TOP_SCORER)).toBe(30)
    expect(scoreWinnerSetPick('player-a', ['player-a', 'player-b'])).toBe(30) // defaults to top scorer
    expect(scoreWinnerSetPick('player-c', ['player-a', 'player-b'], TOURNAMENT_PICK_KEYS.TOP_SCORER)).toBe(0)
  })
})
