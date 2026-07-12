// @vitest-environment jsdom
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { JokerMeter, JokerPill } from '../JokerControl.jsx'

// The joker pill, driven by REAL taps.
//
// A joker toggle with a cap is pure interaction: what it renders matters far less
// than whether pressing it arms the joker, whether pressing it again disarms it,
// and whether a capped pill genuinely refuses the press. The old file asserted
// markup with onClick set to a noop, so it could not have caught a pill wired to
// nothing. Every assertion below clicks, or proves a click is refused.

function Harness({ onToggle = () => {}, ...props }) {
  const [active, setActive] = useState(false)
  return (
    <JokerPill
      matchLabel="match 1"
      multiplier={2}
      active={active}
      onClick={() => { setActive(previous => !previous); onToggle() }}
      {...props}
    />
  )
}

// Queried without a name, deliberately: the accessible name CHANGES when the
// joker arms, and a helper pinned to one label would quietly stop finding the
// button it is meant to be pressing.
const pill = () => screen.getByRole('button')

describe('JokerControl', () => {
  it('renders the approved pill and arms the joker on a real tap', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    expect(pill().getAttribute('data-joker-pill')).toBe('true')
    expect(pill().getAttribute('aria-pressed')).toBe('false')
    expect(pill().getAttribute('aria-label')).toBe('Add joker for match 1')
    // The multiplier is the "armed" signal: it must not show before the tap.
    expect(pill().textContent).not.toContain('2×')

    await user.click(pill())

    expect(pill().getAttribute('aria-pressed')).toBe('true')
    expect(pill().textContent).toContain('2×')
    // A screen-reader user must be told the joker is on, not just shown gold.
    expect(pill().getAttribute('aria-label')).toBe('Joker applied for match 1')
  })

  it('disarms on a second tap, so the joker can be taken back', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(<Harness onToggle={onToggle} />)

    await user.click(pill())
    await user.click(pill())

    expect(onToggle).toHaveBeenCalledTimes(2)
    expect(pill().getAttribute('aria-pressed')).toBe('false')
    expect(pill().textContent).not.toContain('2×')
    expect(pill().getAttribute('aria-label')).toBe('Add joker for match 1')
  })

  it('refuses the press once the cap is reached — the Joker limit reached treatment', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<JokerPill disabled statusLabel="Joker limit reached" matchLabel="match 2" onClick={onClick} />)

    const capped = screen.getByRole('button', { name: 'Joker limit reached for match 2' })
    expect(capped).toHaveProperty('disabled', true)

    await user.click(capped)

    // The cap is only real if the press does nothing. A styled-but-live pill
    // would let a sixth joker through.
    expect(onClick).not.toHaveBeenCalled()
  })

  it('renders a five-dot joker meter whose filled count tracks the jokers used', () => {
    const { container } = render(<JokerMeter value={3} max={5} multiplier={2} label="group jokers selected" />)

    const meter = container.querySelector('[data-joker-meter="true"]')
    expect(meter.getAttribute('aria-label')).toBe('3 of 5 group jokers selected')
    expect(meter.textContent).toContain('JOKER METER')
    expect(meter.textContent).toContain('2× points')

    expect(container.querySelectorAll('[data-joker-dot]')).toHaveLength(5)
    expect(container.querySelectorAll('[data-joker-dot="filled"]')).toHaveLength(3)
    expect(container.querySelectorAll('[data-joker-dot="empty"]')).toHaveLength(2)
  })

  it('never renders more filled dots than the cap, however the count arrives', () => {
    const { container } = render(<JokerMeter value={99} max={5} />)

    expect(container.querySelectorAll('[data-joker-dot="filled"]')).toHaveLength(5)
    expect(container.querySelectorAll('[data-joker-dot]')).toHaveLength(5)
  })
})
