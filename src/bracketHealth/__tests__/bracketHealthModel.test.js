import { describe, expect, it } from 'vitest'
import { BRACKET_HEALTH_STATE, buildOriginalBracketHealth } from '../bracketHealthModel.js'

const teamsById = Object.fromEntries(['A', 'B', 'C', 'D'].map(id => [id, { id, label: `Team ${id}` }]))
const reference = {
  tournamentId: 'euro28',
  teamsById,
  knockoutMatches: [
    { matchId: 'm37', matchNumber: 37 },
    { matchId: 'm45', matchNumber: 45 },
  ],
}

function preview() {
  const matches = [
    { matchNumber: 37, stage: 'round_of_16', homeTeamId: 'A', awayTeamId: 'B', winnerTeamId: 'A' },
    { matchNumber: 45, stage: 'quarter_final', homeTeamId: 'A', awayTeamId: 'C', winnerTeamId: 'A' },
  ]
  return {
    resolution: {
      knockout: {
        matches,
        milestones: {
          round_of_16: ['A', 'B'],
          quarter_final: ['A', 'C'],
          semi_final: [],
          final: [],
        },
      },
    },
  }
}

function snapshot({ winnerTeamId = null } = {}) {
  return {
    groups: Object.fromEntries(['A', 'B', 'C', 'D', 'E', 'F'].map(code => [code, { completedMatchCount: 6 }])),
    results: winnerTeamId ? [{
      matchId: 'm37', matchNumber: 37, confirmed: true, winnerTeamId,
      scoreVisible: true, normalTimeHomeGoals: 2, normalTimeAwayGoals: 0,
      decisionMethod: 'normal_time', resultRevision: 1,
    }] : [],
    knockout: {
      matches: [
        {
          matchNumber: 37,
          stage: 'round_of_16',
          home: { sourceType: 'group_position', groupCode: 'A', position: 1 },
          away: { sourceType: 'group_position', groupCode: 'C', position: 2 },
          homeTeamId: 'A', awayTeamId: 'B', winnerTeamId,
        },
        {
          matchNumber: 45,
          stage: 'quarter_final',
          home: { sourceType: 'match_winner', matchNumber: 39 },
          away: { sourceType: 'match_winner', matchNumber: 37 },
          homeTeamId: null, awayTeamId: winnerTeamId, winnerTeamId: null,
        },
      ],
    },
  }
}

describe('buildOriginalBracketHealth', () => {
  it('uses a known real fixture while preserving the original pick', () => {
    const model = buildOriginalBracketHealth({ reference, preview: preview(), liveSnapshot: snapshot() })
    const card = model.cards.find(item => item.matchNumber === 37)
    expect(card.state).toBe(BRACKET_HEALTH_STATE.EXACT)
    expect(card.selectedTeamId).toBe('A')
    expect(card.matchCentreHref).toContain('match=37')
  })

  it('marks a confirmed saved winner as survived', () => {
    const model = buildOriginalBracketHealth({ reference, preview: preview(), liveSnapshot: snapshot({ winnerTeamId: 'A' }) })
    const card = model.cards.find(item => item.matchNumber === 37)
    expect(card.state).toBe(BRACKET_HEALTH_STATE.SURVIVED)
    expect(card.pointsSecured).toBeGreaterThan(0)
  })

  it('keeps unresolved future fixtures as the original matchup without Match Centre access', () => {
    const model = buildOriginalBracketHealth({ reference, preview: preview(), liveSnapshot: snapshot() })
    const card = model.cards.find(item => item.matchNumber === 45)
    expect(card.state).toBe(BRACKET_HEALTH_STATE.ORIGINAL_ONLY)
    expect(card.matchCentreHref).toBeNull()
    expect(card.originalAwayTeamId).toBe('C')
  })
})
