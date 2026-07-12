// @vitest-environment jsdom
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import SelectField from '../SelectField.jsx'

// The DP-PRIMITIVES listbox, driven by REAL events.
//
// selectFieldNav.test.js already proves the pure keyboard contract — given a key
// and an active index, which action comes back. It cannot prove that the
// component is wired to that contract: that the trigger is what receives the
// open key, that the popover takes focus so the arrows reach it at all, that
// Escape puts focus back on the trigger, or that the type-ahead buffer really
// accumulates across two keypresses inside its 500ms window. Every assertion
// below presses a key or moves a pointer for real.

const OPTIONS = [
  { value: 'group', label: 'Group stage' },
  { value: 'bracket', label: 'Bracket', disabled: true },
  { value: 'knockout', label: 'Knockout Predictor' },
  { value: 'overall', label: 'Overall standings' },
  { value: 'original', label: 'Original Bracket' },
]

// SelectField is controlled, so a selection is only visible if the caller feeds
// the new value back in. The harness is that caller.
//
// Note the placeholder: it is not chrome, it is a real selectable option that the
// component prepends at index 0 with the empty value. So with nothing chosen yet,
// the empty option IS the current selection, and it is where the popover opens.
// The tests below hold the component to that, including choosing it to clear.
function Harness({ onChange = () => {}, initialValue = '', ...props }) {
  const [value, setValue] = useState(initialValue)
  return (
    <SelectField
      label="Competition"
      placeholder="Choose a competition"
      options={OPTIONS}
      value={value}
      onChange={next => { setValue(next); onChange(next) }}
      {...props}
    />
  )
}

const trigger = () => screen.getByRole('combobox', { name: /competition/i })
const activeOptionLabel = () => {
  const id = screen.getByRole('listbox').getAttribute('aria-activedescendant')
  return document.getElementById(id).textContent
}

describe('SelectField — real keyboard and pointer interaction', () => {
  it('opens from the trigger on a real Enter keypress and moves focus into the popover', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    expect(screen.queryByRole('listbox')).toBeNull()
    expect(trigger().getAttribute('aria-expanded')).toBe('false')

    await user.tab() // the trigger is the first focusable thing in the tree
    expect(document.activeElement).toBe(trigger())
    await user.keyboard('{Enter}')

    const listbox = screen.getByRole('listbox')
    expect(trigger().getAttribute('aria-expanded')).toBe('true')
    // The popover must hold focus, or none of the arrow keys below would land.
    expect(document.activeElement).toBe(listbox)
    // Nothing chosen yet, so the empty placeholder option is the current selection
    // and the popover opens on it; the first real option is one step away.
    expect(activeOptionLabel()).toBe('Choose a competition')
    await user.keyboard('{ArrowDown}')
    expect(activeOptionLabel()).toBe('Group stage')
  })

  it('opens on ArrowDown and Space too, and starts on the currently selected option', async () => {
    const user = userEvent.setup()
    render(<Harness initialValue="overall" />)

    await user.tab()
    await user.keyboard('{ArrowDown}')
    expect(activeOptionLabel()).toBe('Overall standings')

    await user.keyboard('{Escape}')
    await user.keyboard(' ')
    expect(screen.getByRole('listbox')).toBeTruthy()
  })

  it('arrows through the options, skipping the disabled one and wrapping at the ends', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.tab()
    await user.keyboard('{Enter}')
    expect(activeOptionLabel()).toBe('Choose a competition')

    await user.keyboard('{ArrowDown}')
    expect(activeOptionLabel()).toBe('Group stage')

    // Bracket is disabled: the next ArrowDown must step straight over it.
    await user.keyboard('{ArrowDown}')
    expect(activeOptionLabel()).toBe('Knockout Predictor')

    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(activeOptionLabel()).toBe('Original Bracket') // the last option

    await user.keyboard('{ArrowDown}') // wraps to the top
    expect(activeOptionLabel()).toBe('Choose a competition')

    await user.keyboard('{ArrowUp}') // wraps back to the bottom
    expect(activeOptionLabel()).toBe('Original Bracket')

    await user.keyboard('{Home}')
    expect(activeOptionLabel()).toBe('Choose a competition')
    await user.keyboard('{End}')
    expect(activeOptionLabel()).toBe('Original Bracket')
  })

  it('commits the active option on Enter, closes, and shows it on the trigger', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)

    await user.tab()
    // Open, step off the placeholder, step over the disabled Bracket, select.
    await user.keyboard('{Enter}{ArrowDown}{ArrowDown}{Enter}')

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('knockout')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(trigger().textContent).toContain('Knockout Predictor')
    // Committing returns focus to the trigger, so tabbing on continues sanely.
    expect(document.activeElement).toBe(trigger())
  })

  it('lets the player choose the placeholder itself to clear a selection', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} initialValue="overall" />)

    expect(trigger().textContent).toContain('Overall standings')

    await user.click(trigger())
    await user.click(screen.getByRole('option', { name: 'Choose a competition' }))

    expect(onChange).toHaveBeenCalledExactlyOnceWith('') // the empty option commits like any other
    expect(trigger().textContent).toContain('Choose a competition')
  })

  it('will not make the disabled option active, and will not commit it when clicked', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)

    await user.tab()
    await user.keyboard('{Enter}')
    const disabledOption = screen.getByRole('option', { name: 'Bracket' })
    expect(disabledOption.getAttribute('aria-disabled')).toBe('true')

    // No route reaches it: not hover, not type-ahead on its own initial letter.
    await user.hover(disabledOption)
    expect(activeOptionLabel()).toBe('Choose a competition')
    await user.keyboard('b')
    expect(activeOptionLabel()).toBe('Choose a competition')

    // And a real click on it is swallowed — no selection, popover stays open.
    await user.click(disabledOption)
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('listbox')).toBeTruthy()
  })

  it('closes on Escape and returns focus to the trigger', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)

    await user.tab()
    await user.keyboard('{Enter}{ArrowDown}')
    expect(screen.getByRole('listbox')).toBeTruthy()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('listbox')).toBeNull()
    expect(onChange).not.toHaveBeenCalled() // Escape abandons; it does not select the active option
    expect(document.activeElement).toBe(trigger())
    expect(trigger().getAttribute('aria-expanded')).toBe('false')
  })

  it('closes on Tab WITHOUT stealing focus back, so the tab order carries on', async () => {
    const user = userEvent.setup()
    render(<><Harness /><button type="button">Next field</button></>)

    await user.tab()
    await user.keyboard('{Enter}')
    await user.tab()

    expect(screen.queryByRole('listbox')).toBeNull()
    // The refocus:false branch of close() — Escape and Tab close by different rules.
    expect(document.activeElement).not.toBe(trigger())
  })

  it('type-ahead accumulates real keystrokes: "o" finds Overall, then "or" finds Original', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.tab()
    await user.keyboard('{Enter}')

    await user.keyboard('o')
    expect(activeOptionLabel()).toBe('Overall standings') // first enabled label starting "o"

    // The second key lands inside the 500ms window, so the buffer is "or", not "r".
    // Only a real, real-time keypress can prove that; the pure test cannot.
    await user.keyboard('r')
    expect(activeOptionLabel()).toBe('Original Bracket')

    await user.keyboard('{Enter}')
    expect(trigger().textContent).toContain('Original Bracket')
  })

  it('selects on a real click and dismisses on a click outside', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)

    await user.click(trigger())
    await user.click(screen.getByRole('option', { name: 'Overall standings' }))
    expect(onChange).toHaveBeenCalledWith('overall')
    expect(screen.queryByRole('listbox')).toBeNull()

    await user.click(trigger())
    expect(screen.getByRole('listbox')).toBeTruthy()
    await user.click(document.body) // the outside-pointerdown dismissal
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('stays shut when disabled', async () => {
    const user = userEvent.setup()
    render(<Harness disabled />)

    await user.click(trigger())
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(trigger()).toHaveProperty('disabled', true)
  })

  it('puts no native select in the document — the OS wheel picker cannot appear', async () => {
    const user = userEvent.setup()
    const { container } = render(<Harness />)

    await user.click(trigger())

    // The native-controls ratchet (PRIMITIVE_SOURCES is empty) is a source-level
    // grep. This is the same ruling proved at runtime, with the popover OPEN:
    // there is no <select> under the custom listbox.
    expect(container.querySelector('select')).toBeNull()
    expect(document.querySelector('select')).toBeNull()
    expect(screen.getByRole('listbox').tagName).toBe('UL')
  })
})
