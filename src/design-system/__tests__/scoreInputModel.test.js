import { describe, expect, it } from 'vitest'
import {
  HIGH_SCORE_THRESHOLD,
  clamp,
  needsHighScoreConfirm,
  parseScore,
  rememberConfirmed,
  stepScore,
} from '../scoreInputModel.js'

// The score-entry DECISIONS, as pure functions.
//
// These asserts used to live inside ScoreInput.test.jsx, mixed in with markup
// snapshots. They are the layer PredictionInputRow.interaction.test.jsx already
// names as its foundation ("scoreInputModel.test.js proves the decisions") — a
// file that did not actually exist until the Groups re-cut. Splitting them out
// gives the DOM tests one job (wiring) and these tests another (rules), so
// neither has to duplicate the other.

describe('high-score confirm logic (item 63)', () => {
  const none = new Set()

  it('does not fire below the 7 threshold', () => {
    expect(HIGH_SCORE_THRESHOLD).toBe(7)
    expect(needsHighScoreConfirm(6, none)).toBe(false)
    expect(needsHighScoreConfirm(0, none)).toBe(false)
  })

  it('fires for a typed value at or above 7 that has not been confirmed', () => {
    expect(needsHighScoreConfirm(7, none)).toBe(true)
    expect(needsHighScoreConfirm(12, none)).toBe(true)
  })

  it('never re-asks once that exact value has been confirmed (shown once)', () => {
    const confirmedSeven = new Set([7])
    expect(needsHighScoreConfirm(7, confirmedSeven)).toBe(false)
    // A different high value still asks.
    expect(needsHighScoreConfirm(9, confirmedSeven)).toBe(true)
  })

  it('ignores non-integer / empty input', () => {
    expect(needsHighScoreConfirm(null, none)).toBe(false)
    expect(needsHighScoreConfirm(NaN, none)).toBe(false)
  })

  it('treats a stepper-reached high value as already confirmed, so typing it never asks', () => {
    // A stepper tap runs rememberConfirmed, never needsHighScoreConfirm: deliberate
    // tapping means you meant it, and it must not re-ask when the same value is typed.
    const afterTappingUpTo7 = rememberConfirmed(none, stepScore(6, 1, 0, 99))
    expect(afterTappingUpTo7.has(7)).toBe(true)
    expect(needsHighScoreConfirm(7, afterTappingUpTo7)).toBe(false)
  })

  it('does not record values below the threshold as confirmed', () => {
    expect(rememberConfirmed(none, 3).has(3)).toBe(false)
    expect(rememberConfirmed(none, null).size).toBe(0)
  })
})

describe('stepper behaviour', () => {
  it('adjusts by exactly one per tap', () => {
    expect(stepScore(2, 1, 0, 99)).toBe(3)
    expect(stepScore(2, -1, 0, 99)).toBe(1)
  })

  it('floors at zero and never goes negative', () => {
    expect(stepScore(0, -1, 0, 99)).toBe(0)
    expect(stepScore(null, -1, 0, 99)).toBe(0)
  })

  it('steps up from an empty score as if it were zero', () => {
    expect(stepScore(null, 1, 0, 99)).toBe(1)
  })

  it('clamps at the ceiling', () => {
    expect(stepScore(99, 1, 0, 99)).toBe(99)
  })
})

describe('score parsing', () => {
  it('clamps into range', () => {
    expect(clamp(5, 0, 99)).toBe(5)
    expect(clamp(-3, 0, 99)).toBe(0)
    expect(clamp(120, 0, 99)).toBe(99)
  })

  it('treats an empty field as no prediction, and rejects non-integers', () => {
    expect(parseScore('', 0, 99)).toBeNull()
    expect(parseScore('2.5', 0, 99)).toBeNull()
    expect(parseScore('abc', 0, 99)).toBeNull()
    expect(parseScore('3', 0, 99)).toBe(3)
  })
})
