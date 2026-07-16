import { describe, expect, it } from 'vitest'
import { relevantGroupMatch } from '../groupsLandingModel.js'

const reference = matches => ({ groupMatches: matches })

describe('Groups relevant-match landing', () => {
  it('prioritises a live match over later fixtures', () => {
    const match = relevantGroupMatch(reference([
      { matchNumber: 1, status: 'scheduled', kickoffAt: '2028-06-09T19:00:00Z' },
      { matchNumber: 2, status: 'live', kickoffAt: '2028-06-09T16:00:00Z' },
    ]), new Date('2028-06-09T15:00:00Z'))

    expect(match.matchNumber).toBe(2)
  })

  it('chooses the next chronological fixture before play', () => {
    const match = relevantGroupMatch(reference([
      { matchNumber: 2, status: 'scheduled', kickoffAt: '2028-06-10T16:00:00Z' },
      { matchNumber: 1, status: 'scheduled', kickoffAt: '2028-06-09T19:00:00Z' },
    ]), new Date('2028-06-08T12:00:00Z'))

    expect(match.matchNumber).toBe(1)
  })

  it('falls back to the latest completed match after the group stage', () => {
    const match = relevantGroupMatch(reference([
      { matchNumber: 1, status: 'completed', kickoffAt: '2028-06-09T19:00:00Z' },
      { matchNumber: 2, status: 'completed', kickoffAt: '2028-06-10T16:00:00Z' },
    ]), new Date('2028-06-11T12:00:00Z'))

    expect(match.matchNumber).toBe(2)
  })
})
