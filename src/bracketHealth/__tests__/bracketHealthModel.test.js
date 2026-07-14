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

// A snapshot mid-groups: real group tables with `played` counts, and knockout slots the
// resolver has projected from them but which buildLiveBracketRounds still withholds.
function midGroupSnapshot({ played = {}, bestThird = null } = {}) {
  const groups = Object.fromEntries(['A', 'B', 'C', 'D', 'E', 'F'].map(code => {
    const teamsPlayed = played[code] ?? 0
    return [code, {
      groupCode: code,
      completedMatchCount: teamsPlayed * 2,
      rows: [1, 2, 3, 4].map(rank => ({ teamId: rank === 1 && code === 'A' ? 'A' : `${code}${rank}`, rank, played: teamsPlayed })),
    }]
  }))
  return {
    groups,
    bestThird,
    results: [],
    knockout: {
      matches: [
        {
          matchNumber: 37,
          stage: 'round_of_16',
          home: { sourceType: 'group_position', groupCode: 'A', position: 1 },
          away: { sourceType: 'group_position', groupCode: 'C', position: 2 },
          homeTeamId: 'A', awayTeamId: 'C2', winnerTeamId: null,
        },
        {
          matchNumber: 45,
          stage: 'quarter_final',
          home: { sourceType: 'match_winner', matchNumber: 39 },
          away: { sourceType: 'match_winner', matchNumber: 37 },
          homeTeamId: null, awayTeamId: null, winnerTeamId: null,
        },
      ],
    },
  }
}

describe('buildOriginalBracketHealth — reveal timing (owner ruling 2026-07-14)', () => {
  it('is pending before any group match is played', () => {
    const model = buildOriginalBracketHealth({
      reference, preview: preview(), liveSnapshot: midGroupSnapshot(),
    })
    expect(model.status).toBe('pending')
    expect(model.cards).toHaveLength(0)
    expect(model.projection.tournamentUnderway).toBe(false)
  })

  it('is still pending mid-groups while no group has reached its second round', () => {
    const played = Object.fromEntries(['A', 'B', 'C', 'D', 'E', 'F'].map(code => [code, 1]))
    const model = buildOriginalBracketHealth({
      reference, preview: preview(), liveSnapshot: midGroupSnapshot({ played }),
    })
    expect(model.status).toBe('pending')
    expect(model.projection.tournamentUnderway).toBe(true)
  })

  it('becomes ready and projects an occupant once the sourcing groups reach the threshold', () => {
    // Match 37 is A1 v C2 — it needs BOTH group A and group C at the threshold.
    const played = { A: 2, B: 1, C: 2, D: 1, E: 1, F: 1 }
    const model = buildOriginalBracketHealth({
      reference, preview: preview(), liveSnapshot: midGroupSnapshot({ played }),
    })
    expect(model.status).toBe('ready')
    expect(model.provisional).toBe(true)

    const card = model.cards.find(item => item.matchNumber === 37)
    expect(card.liveParticipantsKnown).toBe(true)
    expect(card.liveParticipantsProjected).toBe(true)
    expect(card.liveHomeTeamId).toBe('A')
    // A projected tie is not a real fixture, so it must not offer Match Centre.
    expect(card.matchCentreHref).toBeNull()
  })

  it('leaves a slot a placeholder while only one of its two groups is ready', () => {
    // Group A is ready, group C is not — so match 37 cannot be compared at all.
    const played = { A: 2, B: 1, C: 1, D: 1, E: 1, F: 1 }
    const model = buildOriginalBracketHealth({
      reference, preview: preview(), liveSnapshot: midGroupSnapshot({ played }),
    })
    expect(model.status).toBe('ready')
    const card = model.cards.find(item => item.matchNumber === 37)
    expect(card.liveParticipantsKnown).toBe(false)
    expect(card.liveParticipantsProjected).toBe(false)
    expect(card.state).toBe(BRACKET_HEALTH_STATE.ORIGINAL_ONLY)
  })

  it('never counts a projected occupant as eliminated or as points secured', () => {
    const played = { A: 2, B: 1, C: 2, D: 1, E: 1, F: 1 }
    const model = buildOriginalBracketHealth({
      reference, preview: preview(), liveSnapshot: midGroupSnapshot({ played }),
    })
    const r16 = model.rounds.find(round => round.key === 'round_of_16')
    // Projection can say who leads a group. It can never say a team is out, nor that
    // points are in the bank.
    expect(r16.out).toBe(0)
    expect(r16.secured).toBe(0)
    expect(model.cards.every(card => card.pointsSecured === 0)).toBe(true)
  })

  it('is not provisional once the groups are complete and the fixtures are real', () => {
    const model = buildOriginalBracketHealth({ reference, preview: preview(), liveSnapshot: snapshot() })
    expect(model.status).toBe('ready')
    expect(model.provisional).toBe(false)
    expect(model.cards.find(item => item.matchNumber === 37).liveParticipantsProjected).toBe(false)
  })
})

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
