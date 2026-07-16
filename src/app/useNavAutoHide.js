import { useEffect, useRef, useState } from 'react'
import { initialNavAutoHideState, navStateAfterScroll } from './navAutoHideModel.js'

// What counts as "an input is focused" for §5's never-hide rule. Text entry is the
// case that matters — the on-screen keyboard is up and the player is mid-thought.
//
// The native dropdown tag is listed for completeness even though the native-controls
// ratchet means the product ships none (SelectField is a custom listbox whose trigger
// is a button, and a button is NOT an input: tapping a dropdown open should not pin
// the nav). contenteditable counts, because it is text entry by any other name.
// (Spelling that tag out in prose here would itself trip the ratchet's grep — which
// is the ratchet working, not failing.)
const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

export function isEditableElement(element) {
  if (!element || element === document.body) return false
  if (element.isContentEditable) return true
  return EDITABLE_TAGS.has(element.tagName)
}

/**
 * Drives the mobile bottom nav's auto-hide from real scroll position and real focus.
 *
 * Returns a single boolean. The nav element itself carries it as a data attribute and
 * the CSS Module does the translating, so the bar and its aligned Home circle move as
 * one element — the circle remains a child of the nav.
 */
export default function useNavAutoHide() {
  const [hidden, setHidden] = useState(false)
  const stateRef = useRef(initialNavAutoHideState)

  useEffect(() => {
    const read = () => {
      const y = window.scrollY ?? window.pageYOffset ?? 0
      const next = navStateAfterScroll(stateRef.current, y, isEditableElement(document.activeElement))
      stateRef.current = next
      setHidden(next.hidden)
    }

    // Passive: this never calls preventDefault, and saying so keeps scrolling smooth.
    window.addEventListener('scroll', read, { passive: true })
    return () => window.removeEventListener('scroll', read)
  }, [])

  return hidden
}
