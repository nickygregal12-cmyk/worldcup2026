import { describe, expect, it } from 'vitest'
import {
  buildOriginalBracketRoundProgress,
  buildOriginalBracketSurface,
  buildOriginalBracketWallPlacement,
  deriveOriginalBracketMatchState,
  describeBracketSlot,
  predictedChampion,
  sourceCodeForBracketSlot,
} from '../originalBracketPresentationModel.js'
import { VISUAL_BRACKET_DRAFT, VISUAL_GROUP_REFERENCE } from '../../testFixtures/visualFixture.js'
import { resolveGuestTournamentPreview } from '../../guest/index.js'

describe('original bracket presentation model', () => {
  it('describes unresolved canonical slots and compact source codes', () => {
    expect(describeBracketSlot({ sourceType: 'group_position', groupCode: 'A', position: 1 })).toBe('Winner Group A')
    expect(sourceCodeForBracketSlot({ sourceType: 'group_position', groupCode: 'B', position: 2 })).toBe('2B')
    expect(sourceCodeForBracketSlot({ sourceType: 'best_third' }, { resolution: { bestThird: { combinationKey: 'CDEF' } } }, 44)).toBe('3CDEF')
    expect(describeBracketSlot({ sourceType: 'best_third' }, { preview: { resolution: { bestThird: { combinationKey: 'CDEF' } } }, matchNumber: 44 })).toBe('3rd C/D/E/F')
    expect(describeBracketSlot({ sourceType: 'match_winner', matchNumber: 37 })).toBe('Winner Match 37')
    expect(sourceCodeForBracketSlot({ sourceType: 'match_winner', matchNumber: 37 })).toBe('W37')
  })

  it('distinguishes blocked, locked, grace, stale re-pick and completed matches', () => {
    expect(deriveOriginalBracketMatchState({ participantsResolved: false })).toBe('blocked')
    expect(deriveOriginalBracketMatchState({ participantsResolved: true, disabled: true })).toBe('locked')
    expect(deriveOriginalBracketMatchState({ participantsResolved: true, hasGrace: true })).toBe('grace')
    expect(deriveOriginalBracketMatchState({ participantsResolved: true, stale: true })).toBe('repick')
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

  it('builds one shared bracket surface for mobile stack and desktop wall chart arrangement', () => {
    const preview = resolveGuestTournamentPreview(VISUAL_GROUP_REFERENCE, VISUAL_BRACKET_DRAFT)
    const surface = buildOriginalBracketSurface({ reference: VISUAL_GROUP_REFERENCE, draft: VISUAL_BRACKET_DRAFT, preview })

    expect(surface.ties).toHaveLength(15)
    expect(surface.rounds.map(round => round.total)).toEqual([8, 4, 2, 1])
    expect(surface.wallColumns).toHaveLength(7)
    expect(buildOriginalBracketWallPlacement(37)).toEqual({ column: 1, row: 2 })
    expect(buildOriginalBracketWallPlacement(51)).toEqual({ column: 4, row: 5 })
    expect(surface.tiesByMatchNumber[39].slots[1].sourceCode).toBe('3ABCD')
    expect(surface.tiesByMatchNumber[45].slots.map(slot => slot.sourceCode)).toEqual(['W39', 'W37'])
  })

  /*
   * The resolver's knockout definitions carry a match number, a stage and two slot sources —
   * no schedule, no venue. Everything a tie says about WHEN and WHERE it is played has to be
   * lifted off the reference row, and the venue was while the schedule was not. That single
   * omission is the whole of "Date to be confirmed" on a bracket whose kick-offs staging has
   * known all along, and nothing failed: the fallbacks did their job on data that never came.
   */
  it('sources schedule and venue for a knockout tie from the reference row', () => {
    const reference = {
      ...VISUAL_GROUP_REFERENCE,
      knockoutMatches: VISUAL_GROUP_REFERENCE.knockoutMatches.map(match => ({
        ...match,
        scheduledDate: '2028-06-24',
        kickoffAt: '2028-06-24T16:00:00Z',
        venueName: 'National Stadium of Wales',
        venueCity: 'Cardiff',
      })),
    }
    const preview = resolveGuestTournamentPreview(reference, VISUAL_BRACKET_DRAFT)
    const tie = buildOriginalBracketSurface({ reference, draft: VISUAL_BRACKET_DRAFT, preview }).tiesByMatchNumber[37]

    expect(tie.scheduledDate).toBe('2028-06-24')
    expect(tie.kickoffAt).toBe('2028-06-24T16:00:00Z')
    expect(tie.venueName).toBe('National Stadium of Wales')
  })

  /* An absent kick-off still reads as absent. §5: the provisional indicators are a FEATURE, and
     they must appear when — and only when — the database genuinely lacks the data. */
  it('leaves schedule fields null when the reference genuinely has no kick-off', () => {
    const preview = resolveGuestTournamentPreview(VISUAL_GROUP_REFERENCE, VISUAL_BRACKET_DRAFT)
    const tie = buildOriginalBracketSurface({ reference: VISUAL_GROUP_REFERENCE, draft: VISUAL_BRACKET_DRAFT, preview }).tiesByMatchNumber[37]

    expect(tie.scheduledDate).toBeNull()
    expect(tie.kickoffAt).toBeNull()
  })

  it('fails loudly when a knockout match has no wall placement', () => {
    expect(() => buildOriginalBracketWallPlacement(999)).toThrow('Unknown Original Bracket wall placement for match 999')
  })

  it('marks stale stored picks without silently keeping or dropping them', () => {
    const staleDraft = {
      ...VISUAL_BRACKET_DRAFT,
      bracketPredictions: {
        ...VISUAL_BRACKET_DRAFT.bracketPredictions,
        45: { ...VISUAL_BRACKET_DRAFT.bracketPredictions['45'], advancingTeamId: 'visual-team-24' },
      },
    }
    const preview = resolveGuestTournamentPreview(VISUAL_GROUP_REFERENCE, staleDraft)
    const surface = buildOriginalBracketSurface({ reference: VISUAL_GROUP_REFERENCE, draft: staleDraft, preview })

    expect(preview.diagnostics).toContainEqual(expect.objectContaining({ code: 'GUEST_BRACKET_STALE_ADVANCING_TEAM', matchNumber: 45 }))
    expect(surface.tiesByMatchNumber[45]).toMatchObject({ stale: true, selectedTeamId: 'visual-team-24' })
    expect(surface.tiesByMatchNumber[45].slots.some(slot => slot.selected)).toBe(false)
  })
})
