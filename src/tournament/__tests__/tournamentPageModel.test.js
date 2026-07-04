import { describe, expect, it } from 'vitest'
import { buildGuestReference } from '../../guest/__tests__/fixtures.js'
import { buildHowToPlayPageModel, buildTournamentPageModel } from '../tournamentPageModel.js'

function foundationFixture() {
  return {
    tournament: { id: 'tournament-euro-2028', code: 'euro-2028', name: 'UEFA EURO 2028' },
    stages: [],
    groups: [],
    totals: {
      matches: 51,
      groupMatches: 36,
      knockoutMatches: 15,
      officialDateVenueMatches: 51,
    },
    guestReference: buildGuestReference(),
  }
}

describe('Tournament and How to Play page models', () => {
  it('builds the Tournament facts page from central confirmed facts and resolver slots', () => {
    const model = buildTournamentPageModel(foundationFixture())

    expect(model.summary.map(item => item.label)).toEqual(['Dates', 'Hosts', 'Venues', 'Format'])
    expect(model.summary[0].value).toBe('9 June 2028 – 9 July 2028')
    expect(model.summary[1].value).toContain('Republic of Ireland')
    expect(model.venues).toHaveLength(9)
    expect(model.venues.map(venue => venue.name)).toEqual(expect.arrayContaining(['National Stadium of Wales', 'Wembley Stadium', 'Dublin Arena']))
    expect(model.keyDates.find(item => item.label === 'Opening match')).toMatchObject({ detail: 'National Stadium of Wales, Cardiff' })
    expect(model.groups).toHaveLength(6)
    expect(model.groups[0]).toMatchObject({ code: 'A', status: 'Qualifying under way' })
    expect(model.groups[0].slots.map(slot => slot.code)).toEqual(['A1', 'A2', 'A3', 'A4'])
    expect(model.certainty.provisional).toContain('Match-specific kick-off times remain unconfirmed')
  })

  it('builds How to Play mechanics without combining competitions', () => {
    const model = buildHowToPlayPageModel(foundationFixture())

    expect(model.competitions.map(competition => competition.title)).toEqual(['Original Predictor', 'KO Predictor'])
    expect(model.competitions[0].bullets.join(' ')).toContain('36 group-stage scores')
    expect(model.competitions[0].points).toContainEqual({ label: 'Original bracket jokers', value: '0' })
    expect(model.competitions[1].bullets).toContain('Everyone starts the knockouts on zero.')
    expect(model.faqs.map(item => item.answer).join(' ')).toContain('separate competitions')
  })
})
