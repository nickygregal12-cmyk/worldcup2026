import { describe, expect, it } from 'vitest'
import {
  buildAdminFixturePayload,
  createAdminFixtureDraft,
  fixtureEditBlockReason,
  isoToVenueLocalInput,
  normaliseAdminVenues,
  validateAdminFixtureDraft,
  venueLocalInputToIso,
} from '../adminFixtureModel.js'

const match = Object.freeze({
  matchId: 'match-1',
  fixtureRevision: 2,
  matchStatus: 'scheduled',
  resultStatus: 'pending',
  resultRevision: 0,
  scheduledDate: '2028-06-09',
  kickoffAt: '2028-06-09T19:00:00.000Z',
  venueId: 'venue-1',
  venueTimezone: 'Europe/London',
  scheduleStatus: 'official_datetime',
})
const venues = Object.freeze([{ venueId: 'venue-1', venueName: 'Hampden Park', venueTimezone: 'Europe/London' }])

describe('admin fixture model', () => {
  it('normalises active tournament venues', () => {
    expect(normaliseAdminVenues([{ venue_id: 'v', venue_name: 'Hampden Park', venue_city: 'Glasgow', venue_timezone: 'Europe/London', capacity: 52000, is_provisional: false }])[0]).toEqual({
      venueId: 'v', venueName: 'Hampden Park', venueCity: 'Glasgow', countryCode: undefined,
      venueTimezone: 'Europe/London', capacity: 52000, isProvisional: false, displayOrder: null,
    })
  })

  it('round-trips a venue-local summer kick-off without using the browser timezone', () => {
    expect(venueLocalInputToIso('2028-06-09T20:00', 'Europe/London')).toBe('2028-06-09T19:00:00.000Z')
    expect(isoToVenueLocalInput('2028-06-09T19:00:00.000Z', 'Europe/London')).toBe('2028-06-09T20:00')
  })

  it('builds a valid revision-safe official fixture payload', () => {
    const draft = createAdminFixtureDraft(match, venues)
    const payload = buildAdminFixturePayload(match, { ...draft, note: 'Official UEFA schedule confirmed' }, venues)
    expect(payload).toMatchObject({
      expectedFixtureRevision: 2,
      scheduledDate: '2028-06-09',
      kickoffAt: '2028-06-09T19:00:00.000Z',
      venueId: 'venue-1',
      scheduleStatus: 'official_datetime',
    })
  })

  it('rejects a venue-local date mismatch and an incomplete audit note', () => {
    const validation = validateAdminFixtureDraft(match, {
      scheduledDate: '2028-06-10', kickoffLocal: '2028-06-09T20:00', venueId: 'venue-1',
      scheduleStatus: 'official_datetime', note: 'x',
    }, venues)
    expect(validation.valid).toBe(false)
    expect(validation.errors.join(' ')).toContain('venue-local date')
    expect(validation.errors.join(' ')).toContain('audit note')
  })

  it('blocks fixture editing after result processing begins', () => {
    const processed = { ...match, resultRevision: 1 }
    expect(fixtureEditBlockReason(processed)).toContain('result processing')
    expect(validateAdminFixtureDraft(processed, { ...createAdminFixtureDraft(processed, venues), note: 'Attempt after result entry' }, venues).valid).toBe(false)
  })
})
