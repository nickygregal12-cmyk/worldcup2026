import { describe, expect, it } from 'vitest'
import { buildGuestReference } from '../../guest/__tests__/fixtures.js'
import { buildCanonicalResultFeed, buildLiveTournamentSnapshot } from '../resultModel.js'
import { buildResultsHubModel } from '../resultsHubModel.js'

function resultRow(match, overrides = {}) {
  return {
    id: match.matchId,
    match_number: match.matchNumber,
    status: 'completed',
    result_status: 'confirmed',
    result_revision: 1,
    home_score_90: 1,
    away_score_90: 0,
    result_method: 'regulation',
    ...overrides,
  }
}

function modelFor(resultRows, lifecycle = { started: resultRows.length > 0, locked: resultRows.length > 0 }) {
  const reference = buildGuestReference()
  const liveSnapshot = buildLiveTournamentSnapshot({ reference, resultRows })
  const feed = buildCanonicalResultFeed({ reference, liveSnapshot })
  return buildResultsHubModel({ lifecycle, feed })
}

describe('Results hub phase model', () => {
  it('keeps the pre-tournament page focused on four opening fixtures', () => {
    const model = modelFor([], { started: false, locked: false })

    expect(model.phase.key).toBe('pre_tournament')
    expect(model.spotlightRows).toHaveLength(4)
    expect(model.nextRows).toHaveLength(0)
    expect(model.showQualification).toBe(false)
    expect(model.showBracket).toBe(false)
  })

  it('prioritises a live match and reveals the live qualification picture', () => {
    const reference = buildGuestReference()
    const liveMatch = reference.groupMatches[0]
    const model = modelFor([resultRow(liveMatch, {
      status: 'live',
      result_status: 'pending',
      home_score_90: 2,
      away_score_90: 1,
    })])

    expect(model.phase.key).toBe('live')
    expect(model.spotlightRows[0]).toMatchObject({ matchNumber: 1, state: 'live', score: '2–1' })
    expect(model.showQualification).toBe(true)
    expect(model.showBracket).toBe(false)
  })

  it('introduces the real bracket only once the groups are nearing completion', () => {
    const reference = buildGuestReference()
    const resultRows = reference.groupMatches.slice(0, 24).map(match => resultRow(match))
    const model = modelFor(resultRows)

    expect(model.showQualification).toBe(true)
    expect(model.showBracket).toBe(true)
    expect(model.counts.completed).toBe(24)
  })
})
