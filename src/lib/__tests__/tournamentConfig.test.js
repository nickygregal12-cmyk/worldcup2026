import { describe, expect, it } from 'vitest'
import { TOURNAMENT_CONFIG } from '../../config/tournament.js'
import { DATES, LEGACY_WC26_DATE_ISO } from '../tournamentDates.js'

describe('tournament configuration', () => {
  it('identifies the isolated Euro staging tournament', () => {
    expect(TOURNAMENT_CONFIG.id).toBe('euro-2028-staging')
    expect(TOURNAMENT_CONFIG.year).toBe(2028)
    expect(TOURNAMENT_CONFIG.provisionalData).toBe(true)
  })

  it('keeps valid temporary compatibility dates until Euro dates are configured', () => {
    expect(DATES.TOURNAMENT_START).toBeInstanceOf(Date)
    expect(DATES.TOURNAMENT_START.getTime()).toBe(new Date(LEGACY_WC26_DATE_ISO.TOURNAMENT_START).getTime())
  })
})
