import { describe, expect, it } from 'vitest'
import { buildGuestReference } from '../../guest/__tests__/fixtures.js'
import { buildHowToPlayPageModel, buildTournamentPageModel } from '../tournamentPageModel.js'

function venueFixture(name, city, hostNation, tags = []) {
  return { venueId: `venue-${name}`, name, city, hostNation, isProvisional: false, tags }
}

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
      venues: 9,
      confirmedVenues: 9,
    },
    // Database-driven venue and key-fixture facts, as built by summariseFoundationData.
    venues: [
      venueFixture('Wembley Stadium', 'London', 'England', ['Semi-finals', 'Final']),
      venueFixture('Tottenham Hotspur Stadium', 'London', 'England'),
      venueFixture('National Stadium of Wales', 'Cardiff', 'Wales', ['Opening match']),
      venueFixture('Manchester City Stadium', 'Manchester', 'England'),
      venueFixture('Everton Stadium', 'Liverpool', 'England'),
      venueFixture("St James' Park", 'Newcastle', 'England'),
      venueFixture('Villa Park', 'Birmingham', 'England'),
      venueFixture('Hampden Park', 'Glasgow', 'Scotland'),
      venueFixture('Dublin Arena', 'Dublin', 'Republic of Ireland'),
    ],
    keyFixtures: [
      { label: 'Opening match', date: '2028-06-09', venueName: 'National Stadium of Wales', city: 'Cardiff' },
      { label: 'Semi-final 1', date: '2028-07-04', venueName: 'Wembley Stadium', city: 'London' },
      { label: 'Semi-final 2', date: '2028-07-05', venueName: 'Wembley Stadium', city: 'London' },
      { label: 'Final', date: '2028-07-09', venueName: 'Wembley Stadium', city: 'London' },
    ],
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

  it('labels a venue with no recorded host nation instead of inventing one', () => {
    const foundation = foundationFixture()
    foundation.venues = [venueFixture('Mystery Ground', 'Nowhere', null)]
    foundation.totals = { ...foundation.totals, venues: 1, confirmedVenues: 0 }
    const model = buildTournamentPageModel(foundation)
    expect(model.venues[0].hostNation).toBe('Host nation not recorded')
    expect(model.summary.find(item => item.label === 'Venues').value).toBe('0 of 1 confirmed')
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
