import { describe, expect, it } from 'vitest'
import { buildGuestReference } from '../../guest/__tests__/fixtures.js'
import { createGuestPredictionState, updateGuestGroupPrediction } from '../../guest/index.js'
import { buildGroupProgress, deriveGroupMatchState, jokerControlLabel } from '../groupsPresentationModel.js'

describe('groups presentation model', () => {
  it('summarises each group independently', () => {
    const reference = buildGuestReference()
    let draft = createGuestPredictionState(reference)
    draft = updateGuestGroupPrediction(draft, { matchNumber: 1, homeScore: 2, awayScore: 0 })
    draft = updateGuestGroupPrediction(draft, { matchNumber: 2, homeScore: 1, awayScore: 1 })
    expect(buildGroupProgress(reference, draft)[0]).toEqual({ code: 'A', complete: 2, total: 6, isComplete: false })
    expect(buildGroupProgress(reference, draft)[1]).toEqual({ code: 'B', complete: 0, total: 6, isComplete: false })
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
