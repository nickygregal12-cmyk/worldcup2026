// Mobile bottom-nav auto-hide — the approved amendment in CLAUDE.md §5:
//
//   "hides after ~40–60px sustained downward scroll, reveals instantly on any
//    upward scroll, never hides while an input is focused, translates as one unit
//    with the raised Home circle"
//
// The decision is kept pure here so every rule can be stated once and exercised
// directly; useNavAutoHide.js does nothing but feed it real scroll positions and
// apply the answer. The component behaviour — that a real wheel/scroll event moves
// it, that a real focused input pins it open — is proved against a mounted shell in
// navAutoHide.interaction.test.jsx.

// 48px sits in the middle of the §5 band (~40–60px). "Sustained" is the point: this
// is cumulative downward travel since the last upward move, not a single jump, so a
// rubber-band twitch cannot hide the nav.
export const NAV_HIDE_THRESHOLD = 48

export const initialNavAutoHideState = Object.freeze({
  hidden: false,
  downwardTravel: 0,
  lastY: 0,
})

/**
 * The whole contract as one pure step.
 *
 * `inputFocused` is passed in rather than read here, so the model stays free of the
 * DOM. It only ever BLOCKS a hide: a nav already hidden when focus lands in a field
 * stays hidden (nothing in §5 asks for a reveal, and revealing would drop the bar on
 * top of the field the player just tapped), and an upward scroll still reveals.
 */
export function navStateAfterScroll(state, rawY, inputFocused = false) {
  const y = Math.max(0, Number.isFinite(rawY) ? rawY : 0)
  const delta = y - state.lastY

  // Near the top there is nothing to get out of the way of, so the nav is always up.
  if (y <= NAV_HIDE_THRESHOLD) return { hidden: false, downwardTravel: 0, lastY: y }

  // ANY upward movement reveals, immediately — no threshold, no debounce. Reaching
  // for the nav is the whole reason a player scrolls back up.
  if (delta < 0) return { hidden: false, downwardTravel: 0, lastY: y }

  if (delta === 0) return { ...state, lastY: y }

  const downwardTravel = state.downwardTravel + delta
  const wantsHide = downwardTravel >= NAV_HIDE_THRESHOLD
  // Never hide while an input is focused: the keyboard is up and the player is
  // typing, and a bar sliding away under their thumb is a distraction, not a help.
  const hidden = inputFocused ? state.hidden : state.hidden || wantsHide

  return { hidden, downwardTravel, lastY: y }
}
