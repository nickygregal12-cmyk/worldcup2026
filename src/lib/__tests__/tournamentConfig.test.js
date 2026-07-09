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
    expect(DATES.TOURNAMENT_START.toISOString()).toBe('2028-06-09T19:00:00.000Z')
  })

  it('records confirmed Euro 2028 dates, hosts and venues centrally', () => {
    expect(TOURNAMENT_CONFIG.dates.tournamentEndAt).toBe('2028-07-09T22:59:59.000Z')
    expect(TOURNAMENT_CONFIG.confirmedFacts.hostNations).toEqual(['England', 'Scotland', 'Wales', 'Republic of Ireland'])
    expect(TOURNAMENT_CONFIG.confirmedFacts.venues.map(venue => venue.name)).toEqual(expect.arrayContaining(['National Stadium of Wales', 'Wembley Stadium', 'Dublin Arena']))
    expect(TOURNAMENT_CONFIG.confirmedFacts.unconfirmed.join(' ')).toContain('Match-specific kick-off times remain unconfirmed')
  })
})
