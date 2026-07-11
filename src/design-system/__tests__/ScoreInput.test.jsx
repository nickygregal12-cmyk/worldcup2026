import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ScoreInput from '../ScoreInput.jsx'
import {
  HIGH_SCORE_THRESHOLD,
  clamp,
  needsHighScoreConfirm,
  parseScore,
  rememberConfirmed,
  stepScore,
} from '../scoreInputModel.js'

describe('ScoreInput', () => {
  it('uses the mobile numeric keypad contract and vertical ▲/▼ steppers', () => {
    const html = renderToStaticMarkup(<ScoreInput value={2} label="Scotland score" onChange={() => {}} />)
    expect(html).toContain('inputMode="numeric"')
    expect(html).toContain('pattern="[0-9]*"')
    expect(html).toContain('data-score-input="editable"')
    expect(html).toContain('Increase Scotland score') // ▲ stepper
    expect(html).toContain('Decrease Scotland score') // ▼ stepper
    expect(html).toContain('▲')
    expect(html).toContain('▼')
  })

  it('renders locked predictions as a structurally different read-only value, never an input', () => {
    const html = renderToStaticMarkup(<ScoreInput value={1} label="Scotland score" readOnly onChange={() => {}} />)
    expect(html).toContain('data-score-input="readonly"')
    expect(html).toContain('read only')
    expect(html).not.toContain('<input')
    expect(html).not.toContain('▲')
  })

  it('shows a distinct grace state while remaining read-only', () => {
    const html = renderToStaticMarkup(<ScoreInput value={3} label="Scotland score" readOnly grace onChange={() => {}} />)
    expect(html).toContain('data-grace="true"')
    expect(html).toContain('read only')
  })
})

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
