// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import flagDe from 'circle-flags/flags/de.svg?url'
import flagGbWls from 'circle-flags/flags/gb-wls.svg?url'
import HomeMatchCard from '../HomeMatchCard.jsx'
import { buildHomeMatchHub } from '../homeDashboardModel.js'

// The DP-HOME eye-test regression, end to end and through the REAL model.
//
// The card is not hand-built here: `buildHomeMatchHub` produces it from a reference
// shaped exactly like staging's rows, so the test exercises the very code path that
// put a dashed ring on Wales. A hand-made `card` object would have proved nothing —
// the bug was in the model, not the component.
//
// Staging's shape, verified against Euro staging on 2026-07-12: all 24
// tournament_teams rows carry is_provisional = true (the draw has not been made)
// AND a real team_id. That combination is RESOLVED — we can name the team — and the
// old `isProvisional || !actualTeamId` rule wrongly called it unresolved.
const reference = {
  teamsById: {
    'tt-wal': { actualTeamId: 'team-wales', isProvisional: true, label: 'Wales', isoCode: 'WAL' },
    'tt-ger': { actualTeamId: 'team-germany', isProvisional: true, label: 'Germany', isoCode: 'GER' },
    // A genuinely empty slot: no team behind it at all.
    'tt-empty': { actualTeamId: null, isProvisional: true, label: null, slotCode: 'W45', isoCode: null },
  },
}

const openingMatch = { matchNumber: 1, groupCode: 'A', homeTeamId: 'tt-wal', awayTeamId: 'tt-ger', kickoffAt: '2028-06-09T19:00:00Z' }

function renderCard(match) {
  const card = buildHomeMatchHub({ reference, match, dataAvailable: true })
  return { card, ...render(<HomeMatchCard card={{ ...card, href: '#/x', venueName: 'National Stadium of Wales' }} />) }
}

describe('Home fixture card — resolved teams wear their flags', () => {
  it('gives provisional-but-assigned Wales and Germany their real flags, not the empty-slot ring', () => {
    const { card } = renderCard(openingMatch)

    // The model no longer calls a named team unresolved.
    expect(card.home.unresolved).toBe(false)
    expect(card.away.unresolved).toBe(false)
    expect(card.home.isoCode).toBe('WAL')
    expect(card.away.isoCode).toBe('GER')

    const badges = document.querySelectorAll('[data-team-badge]')
    expect(badges).toHaveLength(2)

    // The regression, stated exactly: no resolved team wears the dashed ring.
    for (const badge of badges) expect(badge.getAttribute('data-team-badge')).toBe('flag')
    expect(document.querySelector('[data-team-badge="placeholder"]')).toBeNull()

    // And they are the RIGHT flags — Wales flies the Welsh flag, Germany the German.
    expect(badges[0].getAttribute('src')).toBe(flagGbWls)
    expect(badges[1].getAttribute('src')).toBe(flagDe)

    // The names still render, as they always did — that was never the broken half.
    expect(screen.getByText('Wales')).toBeTruthy()
    expect(screen.getByText('Germany')).toBeTruthy()
  })

  it('still gives a genuinely empty slot the dashed placeholder ring', () => {
    // The fix must not overshoot: an unresolved knockout slot has no team behind it
    // and must keep the neutral empty-slot treatment. That ring keeps its one meaning.
    renderCard({ matchNumber: 45, homeTeamId: 'tt-empty', awayTeamId: null, kickoffAt: null })

    const badges = document.querySelectorAll('[data-team-badge]')
    expect(badges).toHaveLength(2)
    for (const badge of badges) expect(badge.getAttribute('data-team-badge')).toBe('placeholder')
    expect(document.querySelector('img[data-team-badge="flag"]')).toBeNull()
  })

  it('keeps the amber PROVISIONAL chip — the flag fix removes no honesty signal', () => {
    // Provisional-ness is still surfaced; what changed is only that it stopped being
    // spent on the badge. A fixture with no confirmed kick-off still says so.
    renderCard({ matchNumber: 1, groupCode: 'A', homeTeamId: 'tt-wal', awayTeamId: 'tt-ger', kickoffAt: null })

    expect(screen.getByText('PROVISIONAL')).toBeTruthy()
    // ...and the teams are still flagged, because the two facts are independent.
    expect(document.querySelectorAll('[data-team-badge="flag"]')).toHaveLength(2)
  })
})
