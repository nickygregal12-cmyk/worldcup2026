import { describe, expect, it } from 'vitest'
import { TOURNAMENT_CONFIG } from '../../config/tournament.js'
import { DATES } from '../tournamentDates.js'

describe('tournament configuration', () => {
  it('identifies the isolated Euro staging tournament', () => {
    expect(TOURNAMENT_CONFIG.id).toBe('euro-2028-staging')
    expect(TOURNAMENT_CONFIG.year).toBe(2028)
    expect(TOURNAMENT_CONFIG.provisionalData).toBe(true)
  })

  it('uses the central provisional Euro start date instead of the legacy WC26 fallback', () => {
    expect(DATES.TOURNAMENT_START).toBeInstanceOf(Date)
    expect(DATES.TOURNAMENT_START.toISOString()).toBe('2028-06-09T20:00:00.000Z')
  })
})
