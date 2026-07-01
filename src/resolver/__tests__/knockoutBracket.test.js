import { describe, expect, it } from 'vitest'
import { resolveBestThirdAssignments } from '../bestThird.js'
import { resolveKnockoutBracket } from '../knockoutBracket.js'
import { buildManualGroupTables } from './fixtures.js'

const groupTables = buildManualGroupTables()
const bestThirdAssignments = resolveBestThirdAssignments([
  { groupCode: 'A', teamId: 'A3' },
  { groupCode: 'B', teamId: 'B3' },
  { groupCode: 'C', teamId: 'C3' },
  { groupCode: 'D', teamId: 'D3' },
])

const completeDecisions = [
  [37, 'A1'], [38, 'A2'], [39, 'B1'], [40, 'C1'],
  [41, 'F1'], [42, 'D2'], [43, 'D1'], [44, 'E1'],
  [45, 'B1'], [46, 'F1'], [47, 'E1'], [48, 'C1'],
  [49, 'B1'], [50, 'E1'], [51, 'B1'],
].map(([matchNumber, advancingTeamId]) => ({ matchNumber, advancingTeamId }))

describe('canonical knockout progression', () => {
  it('resolves the official round-of-16 group-position and best-third slots', () => {
    const bracket = resolveKnockoutBracket({
      groupTables,
      bestThirdAssignments,
      knockoutDecisions: [],
    })

    expect(bracket.byMatchNumber[37]).toMatchObject({ homeTeamId: 'A1', awayTeamId: 'C2' })
    expect(bracket.byMatchNumber[38]).toMatchObject({ homeTeamId: 'A2', awayTeamId: 'B2' })
    expect(bracket.byMatchNumber[39]).toMatchObject({ homeTeamId: 'B1', awayTeamId: 'A3' })
    expect(bracket.byMatchNumber[40]).toMatchObject({ homeTeamId: 'C1', awayTeamId: 'D3' })
    expect(bracket.byMatchNumber[41]).toMatchObject({ homeTeamId: 'F1', awayTeamId: 'C3' })
    expect(bracket.byMatchNumber[44]).toMatchObject({ homeTeamId: 'E1', awayTeamId: 'B3' })
    expect(bracket.milestones.round_of_16).toHaveLength(16)
  })

  it('propagates advancing-team decisions through all 15 knockout matches', () => {
    const bracket = resolveKnockoutBracket({
      groupTables,
      bestThirdAssignments,
      knockoutDecisions: completeDecisions,
    })

    expect(bracket.byMatchNumber[45]).toMatchObject({ homeTeamId: 'B1', awayTeamId: 'A1', winnerTeamId: 'B1' })
    expect(bracket.byMatchNumber[49]).toMatchObject({ homeTeamId: 'B1', awayTeamId: 'F1', winnerTeamId: 'B1' })
    expect(bracket.byMatchNumber[51]).toMatchObject({ homeTeamId: 'B1', awayTeamId: 'E1', winnerTeamId: 'B1' })
    expect(bracket.championTeamId).toBe('B1')
    expect(bracket.milestones.quarter_final).toHaveLength(8)
    expect(bracket.milestones.semi_final).toHaveLength(4)
    expect(bracket.milestones.final).toEqual(['B1', 'E1'])
    expect(bracket.milestones.champion).toEqual(['B1'])
  })

  it('leaves later rounds unresolved until the required earlier winners exist', () => {
    const firstRoundDecisions = completeDecisions.filter(decision => decision.matchNumber <= 44)
    const bracket = resolveKnockoutBracket({
      groupTables,
      bestThirdAssignments,
      knockoutDecisions: firstRoundDecisions,
    })

    expect(bracket.byMatchNumber[45].participantsResolved).toBe(true)
    expect(bracket.byMatchNumber[45].winnerTeamId).toBeNull()
    expect(bracket.byMatchNumber[49].participantsResolved).toBe(false)
    expect(bracket.championTeamId).toBeNull()
  })

  it('rejects an advancing team that is not one of the resolved participants', () => {
    expect(() => resolveKnockoutBracket({
      groupTables,
      bestThirdAssignments,
      knockoutDecisions: [{ matchNumber: 37, advancingTeamId: 'B4' }],
    })).toThrow('not a participant')
  })

  it('does not apply a future decision before its participants resolve', () => {
    const bracket = resolveKnockoutBracket({
      groupTables,
      bestThirdAssignments,
      knockoutDecisions: [{ matchNumber: 45, advancingTeamId: 'B1' }],
    })

    expect(bracket.byMatchNumber[45].winnerTeamId).toBeNull()
    expect(bracket.issues).toEqual([
      expect.objectContaining({ code: 'DECISION_BEFORE_PARTICIPANTS', matchNumber: 45 }),
    ])
  })

  it('rejects duplicate knockout decisions', () => {
    expect(() => resolveKnockoutBracket({
      groupTables,
      bestThirdAssignments,
      knockoutDecisions: [
        { matchNumber: 37, advancingTeamId: 'A1' },
        { matchNumber: 37, advancingTeamId: 'C2' },
      ],
    })).toThrow('Duplicate knockout decision')
  })
})
