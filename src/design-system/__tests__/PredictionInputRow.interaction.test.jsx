// @vitest-environment jsdom
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import PredictionInputRow from '../PredictionInputRow.jsx'

// The shared prediction row, driven by REAL taps and real typing.
//
// scoreInputModel.test.js proves the decisions (step by one, floor at zero, ask
// once at seven). The static PredictionInputRow test proves the markup. Neither
// proves the WIRING, which is where item 63's rule actually lives: that ▲ and ▼
// are bound to the stepper and not the confirm, that a TYPED seven is held back
// until the player says yes while a TAPPED seven is committed on the spot, and
// that the confirmed-values Set survives further edits so the same number is
// never queried twice. Every assertion below clicks a button or types a digit.

// Groups and KO both own the score state and feed it back down; the harness is
// that owner. It is one component instance across a whole test, so the ScoreInput's
// internal confirmed-values Set persists exactly as it does on a real page.
function Harness({ onHomeChange = () => {}, ...props }) {
  const [home, setHome] = useState(0)
  const [away, setAway] = useState(0)
  return (
    <PredictionInputRow
      homeLabel="Wales score"
      awayLabel="Germany score"
      homeValue={home}
      awayValue={away}
      onHomeChange={next => { setHome(next); onHomeChange(next) }}
      onAwayChange={setAway}
      {...props}
    />
  )
}

const homeBox = () => screen.getByRole('spinbutton', { name: 'Wales score' })
const awayBox = () => screen.getByRole('spinbutton', { name: 'Germany score' })
const up = name => screen.getByRole('button', { name: `Increase ${name}` })
const down = name => screen.getByRole('button', { name: `Decrease ${name}` })
const confirmPrompt = () => screen.queryByText(/goals — is that right\?/)

describe('PredictionInputRow — real stepper taps and typed entry', () => {
  it('steps one goal per tap and never below the floor of zero', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    expect(homeBox()).toHaveProperty('value', '0')
    expect(down('Wales score')).toHaveProperty('disabled', true) // already on the floor

    await user.click(up('Wales score'))
    await user.click(up('Wales score'))
    await user.click(up('Wales score'))
    expect(homeBox()).toHaveProperty('value', '3') // three taps, three goals — one each

    await user.click(down('Wales score'))
    expect(homeBox()).toHaveProperty('value', '2')

    await user.click(down('Wales score'))
    await user.click(down('Wales score'))
    expect(homeBox()).toHaveProperty('value', '0')
    // The floor is enforced by the control itself, not by hoping nobody clicks.
    expect(down('Wales score')).toHaveProperty('disabled', true)
    await user.click(down('Wales score'))
    expect(homeBox()).toHaveProperty('value', '0')
  })

  it('holds a TYPED seven behind the confirm and only commits it on Yes', async () => {
    const onHomeChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onHomeChange={onHomeChange} />)

    await user.clear(homeBox())
    onHomeChange.mockClear() // clearing legitimately commits null; the seven is what matters
    await user.type(homeBox(), '7')

    // The prompt is up, and the value is NOT yet the caller's.
    expect(confirmPrompt().textContent).toBe('7 goals — is that right?')
    expect(onHomeChange).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Yes' }))

    expect(onHomeChange).toHaveBeenCalledExactlyOnceWith(7)
    expect(confirmPrompt()).toBeNull()
    expect(homeBox()).toHaveProperty('value', '7')
  })

  it('abandons a typed seven when the player chooses Edit', async () => {
    const onHomeChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onHomeChange={onHomeChange} />)

    await user.clear(homeBox())
    onHomeChange.mockClear()
    await user.type(homeBox(), '7')
    await user.click(screen.getByRole('button', { name: 'Edit' }))

    expect(confirmPrompt()).toBeNull()
    expect(onHomeChange).not.toHaveBeenCalled() // nothing was ever committed
  })

  it('does NOT ask when the player TAPS their way to seven — deliberate is deliberate', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    for (let tap = 0; tap < 7; tap += 1) {
      await user.click(up('Wales score'))
      expect(confirmPrompt()).toBeNull() // not at six, not at seven, not at any point
    }

    expect(homeBox()).toHaveProperty('value', '7')
    expect(confirmPrompt()).toBeNull()
  })

  it('asks once per value: after confirming seven, retyping seven never asks again', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.clear(homeBox())
    await user.type(homeBox(), '7')
    await user.click(screen.getByRole('button', { name: 'Yes' })) // asked, answered

    // Away and back again to the very same number.
    await user.clear(homeBox())
    await user.type(homeBox(), '7')

    expect(confirmPrompt()).toBeNull() // no second interrogation
    expect(homeBox()).toHaveProperty('value', '7')

    // But an unseen high value is still queried — the Set remembers 7, not "high scores".
    await user.clear(homeBox())
    await user.type(homeBox(), '8')
    expect(confirmPrompt().textContent).toBe('8 goals — is that right?')
  })

  it('a TAPPED seven also counts as confirmed, so typing it later does not ask', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    for (let tap = 0; tap < 7; tap += 1) await user.click(up('Wales score'))

    await user.clear(homeBox())
    await user.type(homeBox(), '7')
    expect(confirmPrompt()).toBeNull()
  })

  it('keeps the two sides independent — home taps and confirms never touch away', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(up('Wales score'))
    await user.click(up('Wales score'))
    expect(homeBox()).toHaveProperty('value', '2')
    expect(awayBox()).toHaveProperty('value', '0')

    // Home's confirmed-values Set is home's alone: away must still be asked about 7.
    await user.clear(homeBox())
    await user.type(homeBox(), '7')
    await user.click(screen.getByRole('button', { name: 'Yes' }))

    await user.clear(awayBox())
    await user.type(awayBox(), '7')
    expect(confirmPrompt().textContent).toBe('7 goals — is that right?')
  })

  it('offers no editable control at all once the row is locked', async () => {
    const user = userEvent.setup()
    render(<Harness readOnly />)

    expect(screen.queryByRole('spinbutton')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
    await user.keyboard('{ArrowUp}') // nothing to type into, nothing to step
    expect(screen.getByLabelText('Wales score: 0, read only')).toBeTruthy()
  })
})
