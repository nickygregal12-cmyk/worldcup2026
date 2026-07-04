import { describe, expect, it } from 'vitest'
import { buildAccountLifecycle, buildAccountStats, initialForDisplayName, shouldShowGuestTransferModal } from '../accountAccessModel.js'

describe('accountAccessModel', () => {
  it('builds account stats from read-only league and prediction data', () => {
    const stats = buildAccountStats({
      leagues: [{ id: 'one' }, { id: 'two' }],
      predictionBundle: {
        predictions: [
          { prediction_kind: 'group_score', home_score_90: 1, away_score_90: 0, joker_applied: true },
          { prediction_kind: 'group_score', home_score_90: 2, away_score_90: 2, joker_applied: false },
          { prediction_kind: 'bracket_pick', advancing_tournament_team_id: 'team-a' },
        ],
      },
    })

    expect(stats).toMatchObject({
      leaguesJoined: 2,
      groupPredictionsSaved: 2,
      groupPredictionTotal: 36,
      groupJokersArmed: 1,
      groupJokerTotal: 5,
    })
  })

  it('hides clear predictions once the central lifecycle is locked', () => {
    const unlocked = buildAccountLifecycle({ prediction_locked_at: null }, new Date('2028-06-09T18:59:00.000Z'))
    const locked = buildAccountLifecycle({ prediction_locked_at: '2028-06-09T19:00:00.000Z' }, new Date('2028-06-09T19:01:00.000Z'))

    expect(unlocked.clearPredictionsAvailable).toBe(true)
    expect(locked.clearPredictionsAvailable).toBe(false)
  })

  it('only opens the guest transfer modal after a requested signed-in transition', () => {
    expect(shouldShowGuestTransferModal({ requested: true, session: { user: { id: 'u1' } }, isRecovery: false })).toBe(true)
    expect(shouldShowGuestTransferModal({ requested: false, session: { user: { id: 'u1' } }, isRecovery: false })).toBe(false)
    expect(shouldShowGuestTransferModal({ requested: true, session: { user: { id: 'u1' } }, isRecovery: true })).toBe(false)
  })

  it('derives a simple accessible initial', () => {
    expect(initialForDisplayName('Nicky', 'nicky@example.com')).toBe('N')
    expect(initialForDisplayName('', 'test@example.com')).toBe('T')
  })
})
