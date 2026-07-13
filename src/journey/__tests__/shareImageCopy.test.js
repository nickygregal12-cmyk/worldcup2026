import { describe, expect, it } from 'vitest'
import { SHARE_COPY, SHARE_FILE_NAME, buildShareText, joinHostFromOrigin } from '../shareImageCopy.js'

// Alternation rather than one character class: a class mixing the pictographic ranges with the
// variation selector is exactly what no-misleading-character-class exists to catch, and the lint
// suppression budget is a ratchet — it does not get raised to let a test spell itself lazily.
// Regional indicators are in here because an emoji flag is still an emoji (CLAUDE.md §7).
const EMOJI = /[\u{1F000}-\u{1FAFF}]|[\u{2600}-\u{27BF}]|[\u{1F1E6}-\u{1F1FF}]|\u{FE0F}/u

describe('share image copy', () => {
  it('carries no emoji anywhere, flags included (CLAUDE.md §7)', () => {
    for (const value of Object.values(SHARE_COPY)) {
      expect(EMOJI.test(value), `emoji in share copy: ${value}`).toBe(false)
    }
    const text = buildShareText({ champion: { label: 'Scotland' } })
    expect(EMOJI.test(text.title)).toBe(false)
    expect(EMOJI.test(text.text)).toBe(false)
  })

  it('quotes no point values in prose — the card shows picks, not scoring maths', () => {
    for (const value of Object.values(SHARE_COPY)) {
      expect(value).not.toMatch(/\d+\s*(pts|points)/i)
    }
  })

  it('names the champion in the share sheet text, and copes without one', () => {
    expect(buildShareText({ champion: { label: 'Scotland' } }).text).toContain('Scotland')
    expect(buildShareText({ champion: null }).text).toContain('Euro 2028')
  })

  it('brands the file so a saved copy still says what it is', () => {
    expect(SHARE_FILE_NAME).toBe('euro-2028-my-bracket.png')
    expect(SHARE_COPY.brand).toBe('Euro 2028 Predictor')
  })
})

describe('join host', () => {
  it('reads the host off the live origin, so the card is right in every environment', () => {
    expect(joinHostFromOrigin('https://euro28-predictor-dev.netlify.app')).toBe('euro28-predictor-dev.netlify.app')
    expect(joinHostFromOrigin('https://www.euro2028.example')).toBe('euro2028.example')
  })

  it('prints nothing for a local dev origin — it is not a place anyone can join', () => {
    expect(joinHostFromOrigin('http://localhost:5173')).toBe('')
    expect(joinHostFromOrigin('http://127.0.0.1:5173')).toBe('')
    expect(joinHostFromOrigin('')).toBe('')
    expect(joinHostFromOrigin('not-a-url')).toBe('')
  })
})
