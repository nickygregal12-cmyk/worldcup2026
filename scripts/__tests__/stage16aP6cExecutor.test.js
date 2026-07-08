import { describe, it, expect } from 'vitest'
import { deriveMatchState, syntheticScore, effectiveKickoff } from '../stage16a-p6c-executor.mjs'

describe('Stage 16A-P6C clock-derived match state', () => {
  const kickoff = new Date('2028-06-15T16:00:00.000Z')

  it('is scheduled before kickoff', () => {
    expect(deriveMatchState(new Date('2028-06-15T15:59:00Z'), kickoff)).toBe('scheduled')
  })
  it('is live within the in-progress window', () => {
    expect(deriveMatchState(new Date('2028-06-15T16:00:00Z'), kickoff)).toBe('live')
    expect(deriveMatchState(new Date('2028-06-15T17:30:00Z'), kickoff)).toBe('live')
  })
  it('is final after the plausible finish time', () => {
    expect(deriveMatchState(new Date('2028-06-15T18:30:00Z'), kickoff)).toBe('final')
  })

  it('is idempotent and bidirectional: the same T always yields the same state', () => {
    for (const iso of ['2028-06-15T15:00:00Z', '2028-06-15T16:30:00Z', '2028-06-16T00:00:00Z']) {
      const once = deriveMatchState(new Date(iso), kickoff)
      const again = deriveMatchState(new Date(iso), kickoff)
      expect(once).toBe(again)
    }
    // moving backward reduces a finished match back to scheduled
    expect(deriveMatchState(new Date('2028-06-20T00:00:00Z'), kickoff)).toBe('final')
    expect(deriveMatchState(new Date('2028-06-01T00:00:00Z'), kickoff)).toBe('scheduled')
  })
})

describe('Stage 16A-P6C deterministic score oracle', () => {
  it('produces the same plausible scoreline for a match every time', () => {
    for (let n = 1; n <= 51; n += 1) {
      const a = syntheticScore(n)
      const b = syntheticScore(n)
      expect(a).toEqual(b)
      expect(a.home).toBeGreaterThanOrEqual(0)
      expect(a.home).toBeLessThanOrEqual(4)
      expect(a.away).toBeGreaterThanOrEqual(0)
      expect(a.away).toBeLessThanOrEqual(4)
    }
  })
  it('varies scorelines across matches (not a constant)', () => {
    const set = new Set(Array.from({ length: 36 }, (_, i) => JSON.stringify(syntheticScore(i + 1))))
    expect(set.size).toBeGreaterThan(3)
  })
})

describe('Stage 16A-P6C effective kickoff', () => {
  it('derives a deterministic timestamp from the seeded scheduled_date', () => {
    expect(effectiveKickoff('2028-06-09', 1).toISOString()).toBe('2028-06-09T13:00:00.000Z')
    expect(effectiveKickoff('2028-06-09', 2).toISOString()).toBe('2028-06-09T16:00:00.000Z')
    expect(effectiveKickoff('2028-06-09', 3).toISOString()).toBe('2028-06-09T19:00:00.000Z')
  })
})
