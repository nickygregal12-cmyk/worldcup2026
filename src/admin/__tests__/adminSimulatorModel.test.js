import { describe, expect, it } from 'vitest'
import {
  EMPTY_SIMULATOR_STATUS,
  SIMULATOR_TEARDOWN_CONFIRMATION,
  isValidScriptedGoals,
  normaliseSimulatorStatus,
  parseUtcInstant,
} from '../adminSimulatorModel.js'

describe('normaliseSimulatorStatus', () => {
  it('normalises a full status payload', () => {
    const status = normaliseSimulatorStatus({
      is_provisional: true,
      clock: {
        is_enabled: true,
        simulated_at: '2028-06-14T20:00:00Z',
        phase_key: 'custom',
        revision: 11,
        updated_at: '2026-07-18T12:00:00Z',
      },
      counts: {
        synthetic_users: 19,
        prediction_sets: 27,
        match_predictions: 474,
        bracket_predictions: 195,
        leagues: 3,
        league_members: 19,
        total_points_original: 2500,
        total_points_ko: 0,
        confirmed_results: 14,
        live_matches: 1,
        score_scripts: 1,
      },
      score_scripts: [
        { match_id: 'match-1', match_number: 1, home_goals: 2, away_goals: 2, updated_at: '2026-07-18T12:01:00Z' },
      ],
    })

    expect(status.isProvisional).toBe(true)
    expect(status.worldSeeded).toBe(true)
    expect(status.clock.isEnabled).toBe(true)
    expect(status.clock.revision).toBe(11)
    expect(status.counts.syntheticUsers).toBe(19)
    expect(status.counts.matchPredictions).toBe(474)
    expect(status.counts.bracketPredictions).toBe(195)
    expect(status.counts.totalPointsOriginal).toBe(2500)
    expect(status.counts.confirmedResults).toBe(14)
    expect(status.counts.liveMatches).toBe(1)
    expect(status.scoreScripts).toHaveLength(1)
    expect(status.scoreScripts[0]).toEqual({
      matchId: 'match-1', matchNumber: 1, homeGoals: 2, awayGoals: 2, updatedAt: '2026-07-18T12:01:00Z',
    })
  })

  it('fails safe on an empty payload', () => {
    expect(EMPTY_SIMULATOR_STATUS.isProvisional).toBe(false)
    expect(EMPTY_SIMULATOR_STATUS.worldSeeded).toBe(false)
    expect(EMPTY_SIMULATOR_STATUS.clock.isEnabled).toBe(false)
    expect(EMPTY_SIMULATOR_STATUS.clock.revision).toBe(1)
    expect(EMPTY_SIMULATOR_STATUS.counts.syntheticUsers).toBe(0)
    expect(EMPTY_SIMULATOR_STATUS.scoreScripts).toEqual([])
  })

  it('treats non-numeric counts as zero rather than NaN', () => {
    const status = normaliseSimulatorStatus({ counts: { synthetic_users: 'not-a-number' } })
    expect(status.counts.syntheticUsers).toBe(0)
    expect(status.worldSeeded).toBe(false)
  })
})

describe('isValidScriptedGoals', () => {
  it('accepts whole goals from 0 to 20', () => {
    expect(isValidScriptedGoals(0)).toBe(true)
    expect(isValidScriptedGoals('4')).toBe(true)
    expect(isValidScriptedGoals(20)).toBe(true)
  })

  it('rejects out-of-range, fractional and empty values', () => {
    expect(isValidScriptedGoals(-1)).toBe(false)
    expect(isValidScriptedGoals(21)).toBe(false)
    expect(isValidScriptedGoals(1.5)).toBe(false)
    expect(isValidScriptedGoals('')).toBe(false)
    expect(isValidScriptedGoals(null)).toBe(false)
  })
})

describe('parseUtcInstant', () => {
  it('parses minute-precision UTC instants', () => {
    expect(parseUtcInstant('2028-06-14T20:00')?.toISOString()).toBe('2028-06-14T20:00:00.000Z')
    expect(parseUtcInstant('2028-06-09T19:00:00Z')?.toISOString()).toBe('2028-06-09T19:00:00.000Z')
    expect(parseUtcInstant(' 2028-07-09T22:00 ')?.toISOString()).toBe('2028-07-09T22:00:00.000Z')
  })

  it('rejects malformed or impossible instants', () => {
    expect(parseUtcInstant('')).toBeNull()
    expect(parseUtcInstant('2028-06-14')).toBeNull()
    expect(parseUtcInstant('14/06/2028 20:00')).toBeNull()
    expect(parseUtcInstant('2028-13-40T99:99')).toBeNull()
    expect(parseUtcInstant(null)).toBeNull()
  })
})

describe('teardown confirmation contract', () => {
  it('matches the database confirmation phrase exactly', () => {
    expect(SIMULATOR_TEARDOWN_CONFIRMATION).toBe('TEARDOWN-SYNTHETIC-WORLD')
  })
})
