// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ScoreInput from '../ScoreInput.jsx'

// ScoreInput's own DOM contract — pruned, not duplicated.
//
// This file used to carry three markup snapshots AND twelve pure-model asserts.
// Both halves now live where they belong:
//
//   the DECISIONS (step by one, ask once at seven)  -> scoreInputModel.test.js
//   the WIRING (a tap steps, a typed 7 is held)     -> PredictionInputRow.interaction.test.jsx
//
// What is left is the part neither of those proves and only ScoreInput can: that a
// locked score is a structurally different thing from an editable one, and that
// the mobile keypad contract survives. Asserted against a real DOM, so a read-only
// state that still shipped a live <input> would fail rather than pass a string match.

describe('ScoreInput', () => {
  it('uses the mobile numeric keypad contract and offers both steppers', () => {
    render(<ScoreInput value={2} label="Scotland score" onChange={() => {}} />)

    const field = screen.getByRole('spinbutton', { name: 'Scotland score' })
    expect(field.getAttribute('inputMode')).toBe('numeric')
    expect(field.getAttribute('pattern')).toBe('[0-9]*')
    expect(field).toHaveProperty('value', '2')

    // Steppers AND direct entry, both (CLAUDE.md §5).
    expect(screen.getByRole('button', { name: 'Increase Scotland score' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Decrease Scotland score' })).toBeTruthy()
  })

  it('renders a locked prediction as a read-only value, never an input', () => {
    const { container } = render(<ScoreInput value={1} label="Scotland score" readOnly onChange={() => {}} />)

    expect(container.querySelector('[data-score-input="readonly"]')).toBeTruthy()
    // The point of the read-only state: there is nothing to type into and nothing
    // to press. A locked score that still rendered a live control would let a
    // player edit a prediction after kick-off.
    expect(screen.queryByRole('spinbutton')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
    expect(container.textContent).toContain('1')
  })

  it('shows a distinct grace state while remaining read-only', () => {
    const { container } = render(<ScoreInput value={3} label="Scotland score" readOnly grace onChange={() => {}} />)

    expect(container.querySelector('[data-score-input="readonly"]').getAttribute('data-grace')).toBe('true')
    expect(screen.queryByRole('spinbutton')).toBeNull()
  })

  it('shows an empty prediction as unset rather than as a zero', () => {
    render(<ScoreInput value={null} label="Scotland score" onChange={() => {}} />)

    // A blank field and a predicted 0–0 are different claims; they must not look alike.
    expect(screen.getByRole('spinbutton', { name: 'Scotland score' })).toHaveProperty('value', '')
  })
})
