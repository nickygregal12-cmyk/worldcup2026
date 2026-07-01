import { describe, expect, it } from 'vitest'
import {
  EURO28_BEST_THIRD_COMBINATIONS,
  EURO28_BEST_THIRD_MATRIX,
  EURO28_KNOCKOUT_MATCHES,
  EURO28_TIE_BREAK_CONFIG,
  RESOLVER_CONTEXT,
} from '../euro28ResolverConfig.js'

describe('Euro 2028 resolver configuration', () => {
  it('keeps the tie-break contract explicitly provisional', () => {
    expect(EURO28_TIE_BREAK_CONFIG.status).toBe('provisional')
    expect(EURO28_TIE_BREAK_CONFIG.unresolvedItems.length).toBeGreaterThan(0)
    expect(EURO28_TIE_BREAK_CONFIG.groupCriteria.at(-1)).toBe('stable_preview_fallback')
  })

  it('defines the three isolated resolver contexts', () => {
    expect(Object.values(RESOLVER_CONTEXT)).toEqual(['guest', 'predicted', 'live'])
  })

  it('defines exactly 15 knockout matches with the official stage counts', () => {
    expect(EURO28_KNOCKOUT_MATCHES).toHaveLength(15)
    expect(EURO28_KNOCKOUT_MATCHES.filter(match => match.stage === 'round_of_16')).toHaveLength(8)
    expect(EURO28_KNOCKOUT_MATCHES.filter(match => match.stage === 'quarter_final')).toHaveLength(4)
    expect(EURO28_KNOCKOUT_MATCHES.filter(match => match.stage === 'semi_final')).toHaveLength(2)
    expect(EURO28_KNOCKOUT_MATCHES.filter(match => match.stage === 'final')).toHaveLength(1)
    expect(EURO28_KNOCKOUT_MATCHES.map(match => match.matchNumber)).toEqual(
      Array.from({ length: 15 }, (_, index) => index + 37),
    )
  })

  it('has a complete matrix entry for every target winner and combination', () => {
    for (const targetGroupWinner of ['B', 'C', 'F', 'E']) {
      expect(Object.keys(EURO28_BEST_THIRD_MATRIX[targetGroupWinner]).sort())
        .toEqual([...EURO28_BEST_THIRD_COMBINATIONS].sort())
    }
  })
})
