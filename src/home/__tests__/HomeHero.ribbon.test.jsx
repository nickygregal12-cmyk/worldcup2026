// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import CountdownHero from '../HomeHero.jsx'

// The hero's corner ribbon, after the DP-HOME eye test caught "MATCH 1 · GROUP A"
// with the final letter sheared off by the corner clip.
//
// An honest note on what this file can and cannot prove. jsdom has no layout engine:
// it does not apply the CSS Module stylesheet, does not evaluate the `min-width:
// 64rem` media query, and cannot measure a glyph. So this does NOT re-measure the
// ribbon. Fit was settled empirically — by the owner's eye test on the BUILT app at
// a real phone width, which is the only place that question can actually be answered,
// and it answered "does not fit". What these tests hold is the copy contract that
// ruling produced, and they will fail the moment anyone puts the long copy back into
// the clipped band:
//
//   the CLIPPED corner ribbon (the variant a 390px phone sees, below 64rem)
//       -> carries the match number ALONE. Nothing to truncate.
//   the FLAT chip (from 64rem, unrotated, unclipped, room to spare)
//       -> keeps the group, so no information is lost anywhere.

const openingMatch = {
  matchNumber: 1,
  stageLabel: 'Group A',
  venueName: 'National Stadium of Wales',
}

const countdown = { days: 702, hours: 6, minutes: 30 }
const lockAt = '2028-06-09T19:00:00Z'

// The ribbon and the chip are distinguished by their CSS Module class. The bundler
// hashes those class names (_countRibbon_3c050d), so match on the stable stem.
const ribbon = () => document.querySelector('[class*="countRibbon"]')
const tag = () => document.querySelector('[class*="countTag"]')

function renderAt(width, props = {}) {
  window.innerWidth = width
  window.dispatchEvent(new Event('resize'))
  return render(<CountdownHero lockAt={lockAt} countdown={countdown} openingMatch={openingMatch} {...props} />)
}

afterEach(() => { window.innerWidth = 1024 })

describe('Home hero corner ribbon — no truncated text ships', () => {
  it('carries the match number ALONE at a 390px phone viewport', () => {
    renderAt(390)

    // The exact rendered text, not the markup shape.
    expect(ribbon().textContent).toBe('Match 1')

    // The two things that got sheared are gone: the separator and the group letter.
    expect(ribbon().textContent).not.toContain('·')
    expect(ribbon().textContent).not.toContain('Group')
    expect(ribbon().textContent).not.toMatch(/\bA\b/)
  })

  it('does not smuggle the long copy back in at any width', () => {
    // The ribbon element is width-independent — it is the CSS that swaps the two
    // variants, not JS — so a width-conditional branch reintroducing "Group A" into
    // the clipped band would be caught here.
    for (const width of [320, 390, 414, 768, 1024, 1440]) {
      const { unmount } = renderAt(width)
      expect(ribbon().textContent).toBe('Match 1')
      unmount()
    }
  })

  it('keeps the group on the flat chip, which has the room for it', () => {
    renderAt(1440)

    // Nothing is lost: the unclipped chip still names the group in full.
    expect(tag().textContent).toBe('Match 1 · Group A')
    expect(tag().textContent).toContain('Group A')
  })

  it('gives the ribbon and the chip DIFFERENT copy — that is the fix', () => {
    renderAt(390)

    // Before the fix both rendered the same string, so the band inherited copy sized
    // for a chip. They are now sized to their own geometry.
    expect(ribbon().textContent).not.toBe(tag().textContent)
    expect(ribbon().textContent).toBe('Match 1')
    expect(tag().textContent).toBe('Match 1 · Group A')
  })

  it('renders no ribbon at all when there is no opening match', () => {
    renderAt(390, { openingMatch: null })

    expect(ribbon()).toBeNull()
    expect(tag()).toBeNull()
  })

  it('keeps the fail-loud provisional line, which the ribbon change must not disturb', () => {
    renderAt(390, { provisional: true })

    expect(screen.getByText('Provisional — kick-off time not confirmed')).toBeTruthy()
  })
})
