import { describe, expect, it } from 'vitest'
import { buildOriginalBracketRoundProgress, deriveOriginalBracketMatchState, describeBracketSlot, predictedChampion } from '../originalBracketPresentationModel.js'

describe('original bracket presentation model', () => {
  it('describes unresolved canonical slots', () => {
    expect(describeBracketSlot({ sourceType: 'group_position', groupCode: 'A', position: 1 })).toBe('Winner Group A')
    expect(describeBracketSlot({ sourceType: 'best_third' })).toBe('Best third-placed team')
    expect(describeBracketSlot({ sourceType: 'match_winner', matchNumber: 37 })).toBe('Winner Match 37')
  })

  it('distinguishes blocked, locked, grace and completed matches', () => {
    expect(deriveOriginalBracketMatchState({ participantsResolved: false })).toBe('blocked')
    expect(deriveOriginalBracketMatchState({ participantsResolved: true, disabled: true })).toBe('locked')
    expect(deriveOriginalBracketMatchState({ participantsResolved: true, hasGrace: true })).toBe('grace')
    expect(deriveOriginalBracketMatchState({ participantsResolved: true, selectedTeamId: 'a' })).toBe('complete')
  })

  it('summarises rounds and champion from the canonical preview', () => {
    const matches = [
      { stage: 'round_of_16', decisionResolved: true },
      { stage: 'round_of_16', decisionResolved: false },
      { stage: 'quarter_final', decisionResolved: false },
      { stage: 'semi_final', decisionResolved: false },
      { stage: 'final', decisionResolved: true },
    ]
    const preview = { resolution: { knockout: { matches, championTeamId: 'team-1' } } }
    expect(buildOriginalBracketRoundProgress(preview)[0]).toMatchObject({ complete: 1, total: 2 })
    expect(predictedChampion(preview, { teamsById: { 'team-1': { label: 'Scotland' } } })).toEqual({ label: 'Scotland' })
  })
})
