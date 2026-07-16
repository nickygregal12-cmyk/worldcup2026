import { describe, expect, it } from 'vitest'
import { buildLeagueCollections, reconcileLeagueSelections } from '../leagueCollections.js'

const leagues = [
  { id: 'original-1', competition: 'original' },
  { id: 'ko-1', competition: 'ko_predictor' },
  { id: 'original-2', competition: 'original' },
]

describe('league collections', () => {
  it('keeps Original and KO league memberships in independent collections', () => {
    const collections = buildLeagueCollections(leagues)
    expect(collections.original.map(league => league.id)).toEqual(['original-1', 'original-2'])
    expect(collections.ko_predictor.map(league => league.id)).toEqual(['ko-1'])
  })

  it('remembers a different selected league in each collection', () => {
    const result = reconcileLeagueSelections(leagues, {
      original: 'original-2',
      ko_predictor: 'ko-1',
    })
    expect(result.selectedIds).toEqual({ original: 'original-2', ko_predictor: 'ko-1' })
  })

  it('selects and identifies the collection of a newly joined league', () => {
    const result = reconcileLeagueSelections(leagues, {}, 'ko-1')
    expect(result.preferredCompetition).toBe('ko_predictor')
    expect(result.selectedIds.ko_predictor).toBe('ko-1')
  })
})
