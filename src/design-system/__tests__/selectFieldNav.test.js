import { describe, expect, it } from 'vitest'
import {
  edgeIndex,
  initialActiveIndex,
  isOpenKey,
  listKeyAction,
  nextActiveIndex,
  typeAheadIndex,
} from '../selectFieldNav.js'

// The SelectField's keyboard contract, enumerated through its pure helpers:
// arrow movement with wrap and disabled-skipping, Home/End edges, type-ahead
// matching, and the trigger open-keys. Real key events are dispatched against
// the mounted component in SelectField.interaction.test.jsx (jsdom); this file
// stays as the exhaustive decision table behind it.

const items = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Bravo', disabled: true },
  { value: 'c', label: 'Charlie' },
  { value: 'd', label: 'Delta' },
]

describe('SelectField keyboard navigation', () => {
  it('moves down to the next enabled option, skipping disabled', () => {
    expect(nextActiveIndex(items, 0, 1)).toBe(2) // skips disabled Bravo
    expect(nextActiveIndex(items, 2, 1)).toBe(3)
  })

  it('wraps from the last option back to the first enabled', () => {
    expect(nextActiveIndex(items, 3, 1)).toBe(0)
  })

  it('moves up and wraps, skipping disabled', () => {
    expect(nextActiveIndex(items, 2, -1)).toBe(0) // skips disabled Bravo
    expect(nextActiveIndex(items, 0, -1)).toBe(3) // wraps to last enabled
  })

  it('resolves Home and End to the first and last enabled options', () => {
    expect(edgeIndex(items, 0, 1)).toBe(0)
    expect(edgeIndex(items, items.length - 1, -1)).toBe(3)
    // If the first item were disabled, Home lands on the next enabled one.
    const leadingDisabled = [{ value: 'x', label: 'X', disabled: true }, ...items]
    expect(edgeIndex(leadingDisabled, 0, 1)).toBe(1)
  })

  it('type-ahead jumps to the first enabled label starting with the buffer', () => {
    expect(typeAheadIndex(items, 'c')).toBe(2)
    expect(typeAheadIndex(items, 'de')).toBe(3)
    expect(typeAheadIndex(items, 'b')).toBe(-1) // Bravo is disabled, so no match
    expect(typeAheadIndex(items, 'z')).toBe(-1)
  })

  it('opens the popover on Down/Up/Enter/Space only', () => {
    expect(isOpenKey('ArrowDown')).toBe(true)
    expect(isOpenKey('ArrowUp')).toBe(true)
    expect(isOpenKey('Enter')).toBe(true)
    expect(isOpenKey(' ')).toBe(true)
    expect(isOpenKey('a')).toBe(false)
    expect(isOpenKey('Escape')).toBe(false)
  })

  it('opens onto the selected option, or the first enabled one when nothing is selected', () => {
    expect(initialActiveIndex(items, 2)).toBe(2)
    expect(initialActiveIndex(items, -1)).toBe(0)
  })
})

describe('SelectField open-listbox key contract', () => {
  it('moves the active option with the arrows', () => {
    expect(listKeyAction('ArrowDown', items, 0)).toEqual({ type: 'active', index: 2, prevent: true })
    expect(listKeyAction('ArrowUp', items, 2)).toEqual({ type: 'active', index: 0, prevent: true })
  })

  it('jumps to the ends with Home and End', () => {
    expect(listKeyAction('Home', items, 3)).toEqual({ type: 'active', index: 0, prevent: true })
    expect(listKeyAction('End', items, 0)).toEqual({ type: 'active', index: 3, prevent: true })
  })

  it('commits the active option on Enter and Space', () => {
    expect(listKeyAction('Enter', items, 2)).toEqual({ type: 'commit', index: 2, prevent: true })
    expect(listKeyAction(' ', items, 3)).toEqual({ type: 'commit', index: 3, prevent: true })
  })

  it('closes on Escape and returns focus to the trigger', () => {
    expect(listKeyAction('Escape', items, 1)).toEqual({ type: 'close', refocus: true, prevent: true })
  })

  it('closes on Tab without stealing focus back, letting the tab land naturally', () => {
    expect(listKeyAction('Tab', items, 1)).toEqual({ type: 'close', refocus: false, prevent: false })
  })

  it('routes printable characters to type-ahead and ignores other keys', () => {
    expect(listKeyAction('c', items, 0)).toEqual({ type: 'typeahead', char: 'c', prevent: true })
    expect(listKeyAction('F2', items, 0)).toEqual({ type: 'none', prevent: false })
  })
})
