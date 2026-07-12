// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import TeamBadge from '../TeamBadge.jsx'
import { UEFA_TEAM_FLAG_CODES, flagAssetForTeamIso } from '../teamFlagRegistry.js'

// The flags are imported HERE, directly from circle-flags, and compared against
// what the component actually renders. That is the point: it proves Wales gets the
// WELSH flag file, not merely "a flag" — a registry that mapped every home nation
// to the same asset would pass a "renders an img" test and fail this one.
import flagDe from 'circle-flags/flags/de.svg?url'
import flagGbEng from 'circle-flags/flags/gb-eng.svg?url'
import flagGbNir from 'circle-flags/flags/gb-nir.svg?url'
import flagGbSct from 'circle-flags/flags/gb-sct.svg?url'
import flagGbWls from 'circle-flags/flags/gb-wls.svg?url'
import flagIe from 'circle-flags/flags/ie.svg?url'

// Exactly the 24 candidate teams staging holds, in slot order. Read from the Euro
// staging tournament_teams rows on 2026-07-12; every one carries metadata.isoCode.
const STAGING_CANDIDATE_CODES = Object.freeze([
  'WAL', 'GER', 'HUN', 'SUI', 'ENG', 'FRA', 'AUT', 'UKR', 'NED', 'ESP', 'CRO', 'ALB',
  'NIR', 'ITA', 'DEN', 'GEO', 'IRL', 'POR', 'POL', 'SVN', 'SCO', 'BEL', 'TUR', 'CZE',
])

// Staging's real row shape: is_provisional is TRUE on all 24 (the draw has not been
// made) while team_id IS set. A team in this state is RESOLVED — we can name it —
// so it must wear its flag. This is precisely the shape that used to produce the
// dashed empty-slot ring.
const resolved = (isoCode, label) => ({ id: `tt-${isoCode}`, label, isoCode, unresolved: false })

const badge = () => document.querySelector('[data-team-badge]')

describe('TeamBadge — the flag actually renders, and a miss is never silent', () => {
  // The four the owner named for spot-verification, plus the other two home nations
  // — the home nations are the trap, since circle-flags keys them gb-wls / gb-eng /
  // gb-sct / gb-nir rather than by plain two-letter ISO.
  it.each([
    ['WAL', 'Wales', flagGbWls],
    ['GER', 'Germany', flagDe],
    ['SCO', 'Scotland', flagGbSct],
    ['IRL', 'Republic of Ireland', flagIe],
    ['ENG', 'England', flagGbEng],
    ['NIR', 'Northern Ireland', flagGbNir],
  ])('renders the real flag asset for %s', (isoCode, label, expectedAsset) => {
    render(<TeamBadge team={resolved(isoCode, label)} />)

    // The flag carries alt="" and aria-hidden: it is decorative, because the team
    // NAME sits right beside it and would otherwise be announced twice. So it is
    // correctly presentational and has no img role — query it as the element it is.
    const img = document.querySelector('img[data-team-badge="flag"]')
    expect(img).not.toBeNull()
    expect(img.getAttribute('alt')).toBe('')

    // The rendered src IS the circle-flags asset this test imported by name.
    expect(img.getAttribute('src')).toBe(expectedAsset)
    // And it is a real, non-empty asset — proof the import resolved through the
    // bundler rather than silently becoming an empty string.
    expect(img.getAttribute('src')).toMatch(/^data:image\/svg\+xml/)
    expect(decodeURIComponent(img.getAttribute('src'))).toContain('<svg')

    // Whatever else happens, a resolved team never wears the empty-slot ring.
    expect(img.className).not.toContain('placeholder')
  })

  it('has a working asset for every one of the 24 candidate teams in staging', () => {
    // The home nations are the trap: they are gb-wls / gb-eng / gb-sct / gb-nir in
    // circle-flags, not plain two-letter ISO. A miss here would previously have
    // degraded silently to the empty-slot ring on a real fixture card.
    const missing = STAGING_CANDIDATE_CODES.filter(code => !flagAssetForTeamIso(code))
    expect(missing).toEqual([])

    // Distinct teams get distinct flags — a registry that collapsed the four home
    // nations onto one asset would otherwise pass everything above.
    const assets = STAGING_CANDIDATE_CODES.map(code => flagAssetForTeamIso(code))
    expect(new Set(assets).size).toBe(STAGING_CANDIDATE_CODES.length)
  })

  it('has a working asset for every code in the registry — a missing one fails the suite', () => {
    // This is the audit half of "never degrade silently": if anyone adds a code
    // without an asset, or an upstream rename breaks one, the check chain goes red
    // instead of the app quietly showing a dashed ring.
    const broken = Object.entries(UEFA_TEAM_FLAG_CODES)
      .filter(([, asset]) => typeof asset !== 'string' || !asset.startsWith('data:image/svg+xml'))
      .map(([code]) => code)
    expect(broken).toEqual([])
    expect(Object.keys(UEFA_TEAM_FLAG_CODES)).toHaveLength(55)
  })

  it('gives an UNRESOLVED slot the dashed placeholder ring, and no flag', () => {
    render(<TeamBadge team={{ id: null, label: 'Home team TBC', isoCode: null, unresolved: true }} />)

    const chip = badge()
    expect(chip.getAttribute('data-team-badge')).toBe('placeholder')
    expect(chip.tagName).toBe('SPAN')
    expect(chip.className).toContain('placeholder')
    expect(chip.getAttribute('aria-hidden')).toBe('true') // decorative: the name beside it carries the meaning
    expect(document.querySelector('img')).toBeNull()
  })

  it('surfaces a MISSING asset loudly — never as the empty-slot ring', () => {
    // A resolved team whose code is not in the registry. This is a defect, and the
    // whole point of the fix: before it, this rendered identically to an empty slot
    // and the bug was indistinguishable from a design decision.
    render(<TeamBadge team={resolved('ZZZ', 'Atlantis')} />)

    const chip = badge()
    expect(chip.getAttribute('data-team-badge')).toBe('missing-flag')
    expect(chip.className).toContain('missingFlag')

    // The dashed ring means exactly one thing, and this is not it.
    expect(chip.className).not.toContain('placeholder')

    // It is visible, it is announced, and it names the code that failed.
    expect(chip.textContent).toBe('!')
    expect(chip.getAttribute('aria-hidden')).toBeNull()
    expect(screen.getByRole('img', { name: 'Flag missing for Atlantis' })).toBe(chip)
    expect(chip.getAttribute('data-missing-iso')).toBe('ZZZ')
  })

  it('treats a resolved team with NO code as a missing flag, not an empty slot', () => {
    render(<TeamBadge team={{ id: 'tt-x', label: 'Nowhere', isoCode: null, unresolved: false }} />)

    const chip = badge()
    expect(chip.getAttribute('data-team-badge')).toBe('missing-flag')
    expect(chip.className).not.toContain('placeholder')
    expect(chip.getAttribute('data-missing-iso')).toBe('none')
  })
})
