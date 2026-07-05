import { describe, expect, it } from 'vitest'
import { buildGuestReference } from '../../guest/__tests__/fixtures.js'
import { createGuestPredictionState, updateGuestGroupPrediction } from '../../guest/index.js'
import {
  GROUPS_TABLE_KEY,
  buildGroupDateSections,
  buildGroupProgress,
  buildGroupsTablesSheetModel,
  deriveGroupMatchState,
  jokerControlLabel,
} from '../groupsPresentationModel.js'

describe('groups presentation model', () => {
  it('summarises each group independently', () => {
    const reference = buildGuestReference()
    let draft = createGuestPredictionState(reference)
    draft = updateGuestGroupPrediction(draft, { matchNumber: 1, homeScore: 2, awayScore: 0 })
    draft = updateGuestGroupPrediction(draft, { matchNumber: 2, homeScore: 1, awayScore: 1 })
    expect(buildGroupProgress(reference, draft)[0]).toEqual({ code: 'A', complete: 2, total: 6, isComplete: false })
    expect(buildGroupProgress(reference, draft)[1]).toEqual({ code: 'B', complete: 0, total: 6, isComplete: false })
  })



  it('groups matches into by-date sections while preserving group context', () => {
    const reference = buildGuestReference()
    const sections = buildGroupDateSections(reference)
    expect(sections[0].matches[0]).toMatchObject({ groupCode: 'A' })
    expect(sections.flatMap(section => section.matches)).toHaveLength(36)
  })

  it('builds the groups table sheet model with group and third-place rails', () => {
    const reference = buildGuestReference()
    let draft = createGuestPredictionState(reference)
    for (const match of reference.groupMatches) {
      draft = updateGuestGroupPrediction(draft, { matchNumber: match.matchNumber, homeScore: match.matchNumber % 3, awayScore: match.matchNumber % 2 })
    }
    const model = buildGroupsTablesSheetModel(reference, draft)
    expect(model.groups.map(group => group.code)).toEqual(['A', 'B', 'C', 'D', 'E', 'F'])
    expect(model.groups[0].table.rows).toHaveLength(4)
    expect(model.bestThird.ranking).toHaveLength(6)
    expect(GROUPS_TABLE_KEY.THIRD_PLACE).toBe('third-place')
  })


  it('treats one-sided partial score drafts as incomplete for predicted tables', () => {
    const reference = buildGuestReference()
    let draft = createGuestPredictionState(reference)
    draft = updateGuestGroupPrediction(draft, { matchNumber: 1, homeScore: null, awayScore: 1 })
    const model = buildGroupsTablesSheetModel(reference, draft)
    const groupA = model.groups.find(group => group.code === 'A')
    expect(groupA.table.completedMatchCount).toBe(0)
    expect(groupA.table.incompleteMatchCount).toBe(6)
  })

  it('gives grace and locks precedence over save presentation', () => {
    expect(deriveGroupMatchState({ reviewMode: false, locked: true, hasGrace: true, active: true, autosaveStatus: 'saving', context: 'account', complete: true })).toBe('grace')
    expect(deriveGroupMatchState({ reviewMode: false, locked: true, hasGrace: false, active: true, autosaveStatus: 'saving', context: 'account', complete: true })).toBe('locked')
  })

  it('shows active autosave state and otherwise falls back to completion', () => {
    expect(deriveGroupMatchState({ reviewMode: false, locked: false, hasGrace: false, active: true, autosaveStatus: 'saving', context: 'account', complete: true })).toBe('saving')
    expect(deriveGroupMatchState({ reviewMode: false, locked: false, hasGrace: false, active: false, autosaveStatus: 'saving', context: 'account', complete: true })).toBe('complete')
    expect(deriveGroupMatchState({ reviewMode: false, locked: false, hasGrace: false, active: true, autosaveStatus: 'idle', context: 'guest', complete: true })).toBe('local')
  })

  it('explains every disabled joker state', () => {
    expect(jokerControlLabel({ applied: true, disabled: true, capReached: true, started: true, reviewMode: true })).toBe('Joker applied')
    expect(jokerControlLabel({ applied: false, disabled: true, capReached: false, started: true, reviewMode: false })).toBe('Joker locked')
    expect(jokerControlLabel({ applied: false, disabled: true, capReached: true, started: false, reviewMode: false })).toBe('Joker limit reached')
    expect(jokerControlLabel({ applied: false, disabled: false, capReached: false, started: false, reviewMode: false })).toBe('Add joker')
  })
})
