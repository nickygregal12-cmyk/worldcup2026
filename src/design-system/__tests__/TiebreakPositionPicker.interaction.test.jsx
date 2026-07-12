// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import TiebreakPositionPicker from '../TiebreakPositionPicker.jsx'

// The item-64 picker's three states, driven through REAL clicks.
//
// The picker is still the COMPONENT half: `tie` is a supplied stub descriptor and
// `resetNotice` a supplied flag — detecting a genuinely undecidable tie is the
// MODEL half, scheduled with the Groups re-cut. What the stub CAN prove, once a
// DOM exists, is that the ▲/▼ idiom is wired to the ordering: that a click really
// reorders the list, that the ranks and the edge-disabled controls follow the new
// order, and that Save hands the caller the order the player actually built.

const tie = {
  groupCode: 'A',
  reason: 'level on points, goal difference and goals scored',
  teams: [
    { teamId: 'wales', label: 'Wales' },
    { teamId: 'germany', label: 'Germany' },
    { teamId: 'scotland', label: 'Scotland' },
  ],
}

const rows = () => screen.getAllByRole('listitem').map(row => row.textContent)
const teamOrder = () => rows().map(text => text.replace(/[\d▲▼]/g, '').trim())
const moveUp = name => screen.getByRole('button', { name: `Move ${name} up` })
const moveDown = name => screen.getByRole('button', { name: `Move ${name} down` })

describe('TiebreakPositionPicker — real reordering interaction', () => {
  it('warns in the amber provisional state and opens on the tie order from the stub', () => {
    render(<TiebreakPositionPicker tie={tie} />)

    const warning = screen.getByRole('status')
    expect(warning.textContent).toContain('Group A can’t be decided automatically')
    expect(warning.textContent).toContain('level on points, goal difference and goals scored')
    expect(teamOrder()).toEqual(['Wales', 'Germany', 'Scotland'])
  })

  it('reorders on a real ▼ click, and the rank numbers follow', async () => {
    const user = userEvent.setup()
    render(<TiebreakPositionPicker tie={tie} />)

    await user.click(moveDown('Wales'))

    expect(teamOrder()).toEqual(['Germany', 'Wales', 'Scotland'])
    expect(rows()[0]).toContain('1') // Germany is now first
    expect(rows()[0]).toContain('Germany')

    // And back up again: the ▲ of the team that moved down restores the order.
    await user.click(moveUp('Wales'))
    expect(teamOrder()).toEqual(['Wales', 'Germany', 'Scotland'])
  })

  it('moves a team the whole way down the list, one click at a time', async () => {
    const user = userEvent.setup()
    render(<TiebreakPositionPicker tie={tie} />)

    await user.click(moveDown('Wales'))
    await user.click(moveDown('Wales'))

    expect(teamOrder()).toEqual(['Germany', 'Scotland', 'Wales'])
  })

  it('disables the controls at the ends, and the disabled ones move with the teams', async () => {
    const user = userEvent.setup()
    render(<TiebreakPositionPicker tie={tie} />)

    expect(moveUp('Wales')).toHaveProperty('disabled', true) // top team cannot go up
    expect(moveDown('Scotland')).toHaveProperty('disabled', true) // bottom team cannot go down
    expect(moveDown('Wales')).toHaveProperty('disabled', false)

    await user.click(moveDown('Wales'))

    // Germany is top now, so Germany's ▲ is the disabled one and Wales's is live.
    expect(moveUp('Germany')).toHaveProperty('disabled', true)
    expect(moveUp('Wales')).toHaveProperty('disabled', false)
  })

  it('hands Save the order the player actually built', async () => {
    const onResolve = vi.fn()
    const user = userEvent.setup()
    render(<TiebreakPositionPicker tie={tie} onResolve={onResolve} />)

    await user.click(moveDown('Wales'))
    await user.click(moveUp('Scotland'))
    expect(teamOrder()).toEqual(['Germany', 'Scotland', 'Wales'])

    await user.click(screen.getByRole('button', { name: 'Save these positions' }))

    expect(onResolve).toHaveBeenCalledExactlyOnceWith(['germany', 'scotland', 'wales'])
  })

  it('shows the reset notice, and reordering still works underneath it', async () => {
    const user = userEvent.setup()
    render(<TiebreakPositionPicker tie={tie} resetNotice />)

    expect(screen.getByText('Your score edit reset these positions — please set them again.')).toBeTruthy()

    await user.click(moveDown('Wales'))
    expect(teamOrder()).toEqual(['Germany', 'Wales', 'Scotland'])
  })

  it('uses the ▲/▼ stepper idiom and no native control', () => {
    const { container } = render(<TiebreakPositionPicker tie={tie} />)

    expect(container.querySelector('select')).toBeNull()
    expect(container.querySelector('input')).toBeNull()
    expect(moveUp('Wales').textContent).toBe('▲')
    expect(moveDown('Wales').textContent).toBe('▼')
  })
})
