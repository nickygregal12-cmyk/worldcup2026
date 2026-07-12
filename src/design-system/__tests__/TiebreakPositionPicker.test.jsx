// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import TiebreakPositionPicker from '../TiebreakPositionPicker.jsx'

// The picker's STATES, against a real DOM.
//
// TiebreakPositionPicker.interaction.test.jsx drives the ▲/▼ controls and the
// save. tiebreakModel.test.js proves the detection and the reset-on-edit rule.
// This file proves what the player is actually shown in each state — and, above
// all, when they are shown nothing at all.

const tie = {
  groupCode: 'A',
  signature: '1:2-1',
  reason: 'both level on points, goal difference and goals scored',
  teams: [
    { teamId: 'wal', label: 'Wales' },
    { teamId: 'ger', label: 'Germany' },
  ],
}

const picker = () => document.querySelector('[data-tiebreak-picker="true"]')
const control = name => screen.getByRole('button', { name })

describe('TiebreakPositionPicker (item 64 — states)', () => {
  it('renders nothing when there is no tie', () => {
    render(<TiebreakPositionPicker tie={null} />)
    expect(picker()).toBeNull()
  })

  it('renders nothing for a single team, which is not a tie', () => {
    // A one-team partition is a team the resolver ranked cleanly. Raising the
    // amber "we can't decide this" banner over it — and asking the player to
    // order a list of one — was the hasUnresolvedTie truthy-length bug.
    render(<TiebreakPositionPicker tie={{ groupCode: 'A', teams: [{ teamId: 'wal', label: 'Wales' }] }} />)

    expect(picker()).toBeNull()
    expect(screen.queryByText(/can’t be decided automatically/)).toBeNull()
  })

  it('warns and offers a ranked picker when teams are genuinely tied', () => {
    render(<TiebreakPositionPicker tie={tie} />)

    expect(picker()).toBeTruthy()
    expect(document.querySelector('[data-tiebreak-warning="true"]')).toBeTruthy()
    expect(picker().textContent).toContain('can’t be decided automatically')
    expect(picker().textContent).toContain(tie.reason)

    // Every tied team gets a row and a working pair of ordering controls.
    expect(control('Move Wales down')).toHaveProperty('disabled', false)
    expect(control('Move Germany up')).toHaveProperty('disabled', false)
    // The ends are dead: first cannot go up, last cannot go down.
    expect(control('Move Wales up')).toHaveProperty('disabled', true)
    expect(control('Move Germany down')).toHaveProperty('disabled', true)

    expect(document.querySelector('[data-tiebreak-reset="true"]')).toBeNull()
  })

  it('starts from a previously saved ordering rather than the default one', () => {
    render(<TiebreakPositionPicker tie={tie} initialOrder={['ger', 'wal']} />)

    // Germany is first now, so it is Germany that cannot move up.
    expect(control('Move Germany up')).toHaveProperty('disabled', true)
    expect(control('Move Wales down')).toHaveProperty('disabled', true)
  })

  it('says out loud when a score edit has reset the positions', () => {
    render(<TiebreakPositionPicker tie={tie} resetNotice />)

    const notice = document.querySelector('[data-tiebreak-reset="true"]')
    expect(notice).toBeTruthy()
    expect(notice.textContent).toContain('reset these positions')
    // The picker stays usable — the notice asks for a decision, it does not block one.
    expect(control('Move Germany up')).toHaveProperty('disabled', false)
  })
})
