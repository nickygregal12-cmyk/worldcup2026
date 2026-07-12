// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import TeamLabel from '../TeamLabel.jsx'
import { resolveTeamProfileActivation } from '../teamProfileActivation.js'
import { TeamProfileContext } from '../teamProfileContext.js'
import { flagAssetForTeamIso, UEFA_TEAM_FLAG_CODES } from '../teamFlagRegistry.js'

// TeamLabel's three identity states, and the two questions they must never
// confuse. See TeamBadge.flags.test.jsx — this is the same law on the other
// primitive, and TeamLabel was the one still carrying the unfixed version.

const chip = () => document.querySelector('[data-team-label]')
const withProfile = ui => (
  <TeamProfileContext.Provider value={{ openTeamProfile: () => {} }}>{ui}</TeamProfileContext.Provider>
)

describe('TeamLabel — the three identity states', () => {
  it('renders a locally bundled circular flag for a resolved team', () => {
    render(<TeamLabel team={{ actualTeamId: 'scotland', label: 'Scotland', isoCode: 'SCO' }} />)

    expect(flagAssetForTeamIso('sco')).toBe(UEFA_TEAM_FLAG_CODES.SCO)
    expect(screen.getByText('Scotland')).toBeTruthy()
    expect(chip().getAttribute('data-team-label')).toBe('flag')
    expect(chip().querySelector('img')).toBeTruthy()
  })

  it('renders an unresolved slot as a neutral placeholder — no flag, no letters', () => {
    render(withProfile(<TeamLabel label="Winner Group A" unresolved />))

    expect(screen.getByText('Winner Group A')).toBeTruthy()
    expect(chip().getAttribute('data-team-label')).toBe('placeholder')
    expect(chip().querySelector('img')).toBeNull()
    // The dashed chip must not resemble a team: never a guessed flag, and never
    // the two-letter initials avatar it used to fall back to.
    expect(chip().textContent).toBe('')
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('makes a resolved team with a MISSING flag loud, not an empty slot', () => {
    // The defect this stage fixes. A registry miss used to fall through to the
    // same `!flagUrl` branch as an empty slot, so a real team silently wore the
    // empty-slot treatment and the bug looked like a design.
    render(<TeamLabel team={{ actualTeamId: 'atlantis', label: 'Atlantis', isoCode: 'ZZZ' }} />)

    expect(chip().getAttribute('data-team-label')).toBe('missing-flag')
    expect(screen.getByRole('img', { name: 'Flag missing for Atlantis' })).toBeTruthy()
    expect(screen.getByText('Atlantis')).toBeTruthy()
  })

  it('treats a slot with NO team record as empty, not as a flag that failed to load', () => {
    // The mirror image of the defect above, and the one that shipped: the KO
    // reference lookups return null for every fixture the group stage has not
    // filled yet, so `team` is absent entirely. Reading that as a resolved team
    // put a red "Flag missing for To be confirmed" chip on every unresolved KO
    // slot. No record means nobody is in the slot.
    render(<TeamLabel team={null} />)

    expect(chip().getAttribute('data-team-label')).toBe('placeholder')
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.getByText('To be confirmed')).toBeTruthy()
  })

  it('still resolves a team named only by isoCode, with no record', () => {
    // The other side of the same branch: absent a record, an isoCode is the only
    // way a caller names a team, so it must not be mistaken for an empty slot.
    render(<TeamLabel label="Scotland" isoCode="SCO" />)

    expect(chip().getAttribute('data-team-label')).toBe('flag')
    expect(chip().querySelector('img')).toBeTruthy()
  })
})

describe('TeamLabel — provisional is not unresolved', () => {
  it('keeps the flag on a provisional team and marks it visibly', () => {
    // The DP-HOME conflation (fixed on TeamBadge in 8f4ea93). Every one of
    // staging's 24 tournament_teams rows carries is_provisional = true, because
    // the draw has not been made. If provisional implied unresolved, every team
    // on the board would lose its flag.
    render(<TeamLabel team={{ actualTeamId: 'scotland', label: 'Scotland', isoCode: 'SCO', isProvisional: true }} />)

    expect(chip().getAttribute('data-team-label')).toBe('flag')
    expect(chip().querySelector('img')).toBeTruthy()
    expect(screen.getByText('Provisional')).toBeTruthy()
  })

  it('treats a slot with no team behind it as unresolved, from actualTeamId alone', () => {
    render(<TeamLabel team={{ actualTeamId: null, label: 'A1', isoCode: null, isProvisional: true }} />)

    expect(chip().getAttribute('data-team-label')).toBe('placeholder')
  })
})

describe('TeamLabel — profile activation', () => {
  it('makes the identity interactive when a profile provider is available', () => {
    render(withProfile(<TeamLabel team={{ teamId: 'scotland', actualTeamId: 'scotland', label: 'Scotland', isoCode: 'SCO' }} />))

    const trigger = screen.getByRole('button', { name: 'Open Scotland team profile' })
    expect(trigger.getAttribute('data-team-profile-trigger')).toBe('true')
  })

  it('routes activation through the team identity only', () => {
    const contextHandler = vi.fn()
    const team = { teamId: 'scotland', label: 'Scotland' }
    const activation = resolveTeamProfileActivation({ unresolved: false, team, explicitHandler: null, contextHandler })

    activation()

    expect(contextHandler).toHaveBeenCalledWith(team)
    // An empty slot has no profile to open.
    expect(resolveTeamProfileActivation({ unresolved: true, team, explicitHandler: null, contextHandler })).toBeNull()
  })
})
