import { describe, expect, it } from 'vitest'
import { calculateGroupStats, resolveGroupTable } from '../groupStandings.js'

const teams = ['A1', 'A2', 'A3', 'A4']

function match(matchNumber, homeTeamId, awayTeamId, homeScore, awayScore) {
  return { matchNumber, homeTeamId, awayTeamId, homeScore, awayScore }
}

describe('group-table calculation', () => {
  it('calculates the complete table from six group matches', () => {
    const table = resolveGroupTable({
      groupCode: 'A',
      teams,
      matches: [
        match(1, 'A1', 'A2', 3, 0),
        match(2, 'A3', 'A4', 2, 0),
        match(3, 'A1', 'A3', 2, 0),
        match(4, 'A2', 'A4', 1, 0),
        match(5, 'A4', 'A1', 0, 1),
        match(6, 'A2', 'A3', 1, 0),
      ],
    })

    expect(table.rows.map(row => row.teamId)).toEqual(['A1', 'A2', 'A3', 'A4'])
    expect(table.rows[0]).toMatchObject({ played: 3, wins: 3, points: 9, goalsFor: 6, goalsAgainst: 0 })
    expect(table.rows[1]).toMatchObject({ played: 3, wins: 2, losses: 1, points: 6 })
    expect(table.completedMatchCount).toBe(6)
    expect(table.incompleteMatchCount).toBe(0)
  })

  it('keeps unresolved fixtures in the table without inventing results', () => {
    const table = resolveGroupTable({
      groupCode: 'A',
      teams,
      matches: [
        match(1, 'A1', 'A2', 1, 0),
        match(2, 'A3', 'A4', null, null),
      ],
    })

    expect(table.completedMatchCount).toBe(1)
    expect(table.incompleteMatchCount).toBe(1)
    expect(table.rows.find(row => row.teamId === 'A3').played).toBe(0)
  })

  it('uses the three-team head-to-head mini-table before overall goal difference', () => {
    const table = resolveGroupTable({
      groupCode: 'A',
      teams,
      matches: [
        match(1, 'A1', 'A2', 1, 0),
        match(2, 'A3', 'A1', 1, 0),
        match(3, 'A2', 'A3', 3, 0),
        match(4, 'A1', 'A4', 10, 0),
        match(5, 'A2', 'A4', 1, 0),
        match(6, 'A3', 'A4', 1, 0),
      ],
    })

    expect(table.rows.slice(0, 3).map(row => row.teamId)).toEqual(['A2', 'A1', 'A3'])
    expect(table.rows.find(row => row.teamId === 'A1').goalDifference).toBeGreaterThan(
      table.rows.find(row => row.teamId === 'A2').goalDifference,
    )
  })

  it('uses fair-play points only when every remaining tied team has a value', () => {
    const table = resolveGroupTable({
      groupCode: 'A',
      teams: [
        { teamId: 'A1', fairPlayPoints: 4 },
        { teamId: 'A2', fairPlayPoints: 2 },
        { teamId: 'A3', fairPlayPoints: 6 },
        { teamId: 'A4', fairPlayPoints: 8 },
      ],
      matches: [
        match(1, 'A1', 'A2', 0, 0),
        match(2, 'A3', 'A4', 0, 0),
        match(3, 'A1', 'A3', 0, 0),
        match(4, 'A2', 'A4', 0, 0),
        match(5, 'A4', 'A1', 0, 0),
        match(6, 'A2', 'A3', 0, 0),
      ],
    })

    expect(table.rows.map(row => row.teamId)).toEqual(['A2', 'A1', 'A3', 'A4'])
    expect(table.unresolvedTieGroups).toEqual([])
  })

  it('uses qualifier ranking after the earlier provisional criteria remain tied', () => {
    const table = resolveGroupTable({
      groupCode: 'A',
      teams: [
        { teamId: 'A1', qualifierRank: 2 },
        { teamId: 'A2', qualifierRank: 1 },
        { teamId: 'A3', qualifierRank: 3 },
        { teamId: 'A4', qualifierRank: 4 },
      ],
      matches: [
        match(1, 'A1', 'A2', 0, 0),
        match(2, 'A3', 'A4', 0, 0),
        match(3, 'A1', 'A3', 0, 0),
        match(4, 'A2', 'A4', 0, 0),
        match(5, 'A4', 'A1', 0, 0),
        match(6, 'A2', 'A3', 0, 0),
      ],
    })

    expect(table.rows.map(row => row.teamId)).toEqual(['A2', 'A1', 'A3', 'A4'])
    expect(table.unresolvedTieGroups).toEqual([])
  })

  it('marks the stable preview fallback as non-official', () => {
    const table = resolveGroupTable({
      groupCode: 'A',
      teams,
      matches: [
        match(1, 'A1', 'A2', 0, 0),
        match(2, 'A3', 'A4', 0, 0),
        match(3, 'A1', 'A3', 0, 0),
        match(4, 'A2', 'A4', 0, 0),
        match(5, 'A4', 'A1', 0, 0),
        match(6, 'A2', 'A3', 0, 0),
      ],
    })

    expect(table.rows.map(row => row.teamId)).toEqual(['A1', 'A2', 'A3', 'A4'])
    expect(table.unresolvedTieGroups).toEqual([['A1', 'A2', 'A3', 'A4']])
    expect(table.rows.every(row => row.previewFallbackUsed)).toBe(true)
    expect(table.issues[0].code).toBe('PROVISIONAL_TIE_FALLBACK')
  })

  it('rejects half-entered scores and invalid score values', () => {
    expect(() => calculateGroupStats({
      groupCode: 'A',
      teams,
      matches: [match(1, 'A1', 'A2', 1, null)],
    })).toThrow('both scores or neither')

    expect(() => calculateGroupStats({
      groupCode: 'A',
      teams,
      matches: [match(1, 'A1', 'A2', -1, 0)],
    })).toThrow('non-negative integers')
  })

  it('rejects duplicate teams, duplicate matches and out-of-group participants', () => {
    expect(() => calculateGroupStats({
      groupCode: 'A',
      teams: ['A1', 'A1'],
      matches: [],
    })).toThrow('duplicate teams')

    expect(() => calculateGroupStats({
      groupCode: 'A',
      teams,
      matches: [
        match(1, 'A1', 'A2', 1, 0),
        match(1, 'A3', 'A4', 1, 0),
      ],
    })).toThrow('duplicate match')

    expect(() => calculateGroupStats({
      groupCode: 'A',
      teams,
      matches: [match(1, 'A1', 'B1', 1, 0)],
    })).toThrow('outside the group')
  })
})
