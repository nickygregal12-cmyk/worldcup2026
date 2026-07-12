// Keyboard-navigation logic for the custom SelectField listbox.
//
// These live outside SelectField.jsx because the component file may only export
// components (react-refresh), and because a pure decision table is the cheapest
// place to enumerate every key against every list shape.
//
// They are no longer the ONLY way to test the keyboard: since the jsdom stage,
// SelectField.interaction.test.jsx presses these keys for real against a mounted
// component. The two are complements — the pure tests cover the contract
// exhaustively, the interaction tests prove the component is wired to it.

// First enabled index scanning from `from` in `direction`, or `from` if none.
export function edgeIndex(items, from, direction) {
  let index = from
  for (let step = 0; step < items.length; step += 1) {
    if (index >= 0 && index < items.length && !items[index].disabled) return index
    index += direction
  }
  return from
}

// Next enabled index from `current` in `direction`, wrapping past the ends.
export function nextActiveIndex(items, current, direction) {
  let index = current
  for (let step = 0; step < items.length; step += 1) {
    index += direction
    if (index < 0) index = items.length - 1
    if (index >= items.length) index = 0
    if (!items[index].disabled) return index
  }
  return current
}

// First enabled option whose label starts with the type-ahead buffer, or -1.
export function typeAheadIndex(items, buffer) {
  const needle = buffer.toLowerCase()
  return items.findIndex(item => !item.disabled && item.label.toLowerCase().startsWith(needle))
}

// Keys that open the popover from the trigger.
export function isOpenKey(key) {
  return key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === ' '
}

// Where the active option sits when the popover opens: on the current selection,
// or the first enabled option when nothing is selected yet.
export function initialActiveIndex(items, selectedIndex) {
  return selectedIndex >= 0 ? selectedIndex : edgeIndex(items, 0, 1)
}

const PRINTABLE = /^\S$/

// The whole open-listbox keyboard contract as one pure decision, so it can be
// tested without a DOM. The component only has to apply the action it returns
// and call preventDefault when `prevent` is set.
export function listKeyAction(key, items, activeIndex) {
  switch (key) {
    case 'ArrowDown': return { type: 'active', index: nextActiveIndex(items, activeIndex, 1), prevent: true }
    case 'ArrowUp': return { type: 'active', index: nextActiveIndex(items, activeIndex, -1), prevent: true }
    case 'Home': return { type: 'active', index: edgeIndex(items, 0, 1), prevent: true }
    case 'End': return { type: 'active', index: edgeIndex(items, items.length - 1, -1), prevent: true }
    case 'Enter':
    case ' ': return { type: 'commit', index: activeIndex, prevent: true }
    case 'Escape': return { type: 'close', refocus: true, prevent: true }
    case 'Tab': return { type: 'close', refocus: false, prevent: false }
    default:
      if (PRINTABLE.test(key)) return { type: 'typeahead', char: key, prevent: true }
      return { type: 'none', prevent: false }
  }
}
