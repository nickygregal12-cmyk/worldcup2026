// @vitest-environment jsdom
import { useState } from 'react'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import MobileNav from '../MobileNav.jsx'
import { NAV_HIDE_THRESHOLD } from '../navAutoHideModel.js'

// The mobile bottom-nav auto-hide (CLAUDE.md §5), driven by REAL scroll and REAL focus.
//
// The DP-JSDOM report ranked this the single highest-value upgrade on its list, because
// it had zero test coverage of any kind and could not have had any: there was no DOM to
// scroll and no focus to move. Every assertion below moves the real window and dispatches
// a real scroll event, or puts the caret in a real input with a real keyboard.
//
// jsdom does not lay out or scroll by itself, so `scrollTo` sets window.scrollY and fires
// the event the listener is actually bound to — which is exactly what a browser does. What
// is under test is the component's REACTION, and that is genuine.

const DESTINATIONS = [
  { key: 'predict', hash: '#/predict', icon: 'pitch', label: 'Predict', shortLabel: 'Predict' },
  { key: 'bracket', hash: '#/bracket', icon: 'bracket', label: 'Bracket', shortLabel: 'Bracket' },
  { key: 'home', hash: '#/', icon: 'home', label: 'Home', shortLabel: 'Home', home: true },
  { key: 'leagues', hash: '#/leagues', icon: 'leagues', label: 'Leagues', shortLabel: 'Leagues' },
]

const nav = () => screen.getByRole('navigation', { name: 'Mobile navigation' })
const isHidden = () => nav().getAttribute('data-nav-hidden') === 'true'

/** A real scroll: move the window, then fire the event the browser would fire. */
function scrollTo(y) {
  act(() => {
    window.scrollY = y
    window.dispatchEvent(new Event('scroll'))
  })
}

// The shell always renders the nav with a page under it; the input is what §5's
// never-hide-while-focused rule is about, so it is real and focusable.
function Harness() {
  const [value, setValue] = useState('')
  return (
    <>
      <MobileNav destinations={DESTINATIONS} route="home" moreActive={false} moreOpen={false} onMoreOpen={() => {}} />
      <input aria-label="Wales score" value={value} onChange={event => setValue(event.target.value)} />
      <button type="button">Not an input</button>
    </>
  )
}

/**
 * Park the viewport partway down the page with the travel budget SPENT and the nav up.
 *
 * Needed because scrolling straight from 0 to 200 is not a neutral setup move — it is a
 * genuine 200px downward scroll, and it correctly hides the nav (see the fling test).
 * A 1px nudge back up reveals and zeroes the budget, so a test can then measure downward
 * travel from a known-clean baseline.
 */
function parkAt(y) {
  scrollTo(y)
  scrollTo(y - 1)
}

afterEach(() => { window.scrollY = 0 })

describe('Mobile bottom nav auto-hide — real scroll, real focus', () => {
  it('starts visible, and one big flick down hides it — that IS sustained downward scroll', () => {
    render(<Harness />)
    expect(isHidden()).toBe(false)

    // A fling from the top clears the threshold in a single event. Nothing about §5 says
    // the travel has to arrive in small pieces — 200px down is 200px down.
    scrollTo(200)
    expect(isHidden()).toBe(true)
  })

  it('stays up while downward travel is short of the threshold', () => {
    render(<Harness />)
    parkAt(200)
    expect(isHidden()).toBe(false)

    // One pixel short. A twitch is not an intent.
    scrollTo(199 + NAV_HIDE_THRESHOLD - 1)
    expect(isHidden()).toBe(false)
  })

  it('hides the moment downward travel reaches the threshold — not before', () => {
    render(<Harness />)
    parkAt(200)

    scrollTo(199 + NAV_HIDE_THRESHOLD - 1)
    expect(isHidden()).toBe(false)

    scrollTo(199 + NAV_HIDE_THRESHOLD) // the 48th pixel
    expect(isHidden()).toBe(true)
  })

  it('accumulates SUSTAINED travel — many small downward scrolls hide it, one nudge at a time', () => {
    render(<Harness />)
    parkAt(300)
    const base = 299

    // 4px nudges: no single one crosses the threshold, but together they do. This is what
    // "sustained" buys — it is cumulative travel, not one big delta.
    for (let step = 1; step <= 12; step += 1) {
      scrollTo(base + step * 4)
      expect(isHidden()).toBe(step * 4 >= NAV_HIDE_THRESHOLD)
    }
  })

  it('reveals INSTANTLY on any upward scroll — one pixel is enough, no threshold', () => {
    render(<Harness />)
    parkAt(400)
    scrollTo(400 - 1 + NAV_HIDE_THRESHOLD)
    expect(isHidden()).toBe(true)

    // A single pixel back up. Reaching for the nav is why a player scrolls up at all.
    scrollTo(400 - 2 + NAV_HIDE_THRESHOLD)
    expect(isHidden()).toBe(false)
  })

  it('resets the travel budget on reversal, so a jiggle never hides it', () => {
    render(<Harness />)
    parkAt(500)
    expect(isHidden()).toBe(false)

    // Down 41, up 1, down 40: 81px of gross downward movement, but the reversal zeroes
    // the budget, so it is never 48 SUSTAINED — and the nav stays up throughout.
    scrollTo(540)
    expect(isHidden()).toBe(false)
    scrollTo(539)
    scrollTo(579)
    expect(isHidden()).toBe(false)
  })

  it('is always up near the top of the page, where there is nothing to get out of the way of', () => {
    render(<Harness />)
    parkAt(600)
    scrollTo(600 - 1 + NAV_HIDE_THRESHOLD)
    expect(isHidden()).toBe(true)

    scrollTo(0)
    expect(isHidden()).toBe(false)

    // And it cannot hide again while still at the top, however much scroll fires.
    scrollTo(NAV_HIDE_THRESHOLD)
    expect(isHidden()).toBe(false)
  })

  it('NEVER hides while an input is focused — the keyboard is up and the player is typing', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    // A real click into a real input, then real typing.
    await user.click(screen.getByRole('textbox', { name: 'Wales score' }))
    await user.keyboard('3')
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Wales score' }))

    // Now scroll far past the threshold. The page moves; the nav must not.
    parkAt(700)
    scrollTo(700 - 1 + NAV_HIDE_THRESHOLD * 4)
    expect(isHidden()).toBe(false)
  })

  it('hides again once focus LEAVES the input — the rule is about focus, not about ever having typed', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('textbox', { name: 'Wales score' }))
    parkAt(800)
    scrollTo(800 - 1 + NAV_HIDE_THRESHOLD * 2)
    expect(isHidden()).toBe(false) // pinned open by the focused input

    // Focus a button instead. A button is not an input — it does not pin the nav.
    await user.click(screen.getByRole('button', { name: 'Not an input' }))
    parkAt(900)
    scrollTo(899 + NAV_HIDE_THRESHOLD)
    expect(isHidden()).toBe(true)
  })

  it('keeps the aligned Home circle inside the nav that moves as one unit', () => {
    const { container } = render(<Harness />)

    // The bar translates as one unit with the Home treatment, so the circle stays a
    // child of the transformed element. jsdom cannot measure its visual overlap.
    const circle = container.querySelector('[class*="circle"]')
    expect(circle).not.toBeNull()
    expect(nav().contains(circle)).toBe(true)

    const home = circle.closest('a')
    expect(home.getAttribute('href')).toBe('#/')

    // Every destination has the same icon slot. The circle is centred inside that
    // shared slot; the button itself is not raised.
    const slots = container.querySelectorAll('[class*="iconSlot"]')
    expect(slots).toHaveLength(5)
    expect(circle.parentElement).toBe(slots[2])

    // And the hidden state is carried on the nav itself — the single element that moves.
    parkAt(1000)
    scrollTo(1000 - 1 + NAV_HIDE_THRESHOLD)
    expect(isHidden()).toBe(true)
    expect(nav().contains(circle)).toBe(true) // still one unit, mid-hide
    expect(circle.getAttribute('data-nav-hidden')).toBeNull() // the circle never moves alone
  })

  it('marks the active destination, and keeps doing so while hidden', () => {
    render(<Harness />)

    const home = screen.getByRole('link', { name: /home/i })
    expect(home.getAttribute('aria-current')).toBe('page')

    parkAt(1100)
    scrollTo(1100 - 1 + NAV_HIDE_THRESHOLD)
    expect(isHidden()).toBe(true)
    expect(home.getAttribute('aria-current')).toBe('page')
  })
})
