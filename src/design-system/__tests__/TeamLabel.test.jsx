import React from 'react' // eslint-disable-line no-unused-vars
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import TeamLabel from '../TeamLabel.jsx'
import { resolveTeamProfileActivation } from '../teamProfileActivation.js'
import { TeamProfileContext } from '../teamProfileContext.js'
import ScoreInput from '../ScoreInput.jsx'
import { flagAssetForTeamIso, UEFA_TEAM_FLAG_CODES } from '../teamFlagRegistry.js'

describe('TeamLabel', () => {
  it('renders a locally bundled circular flag for a supported UEFA team code', () => {
    const html = renderToStaticMarkup(<TeamLabel team={{ label: 'Scotland', isoCode: 'SCO', isProvisional: false }} />)
    expect(flagAssetForTeamIso('sco')).toBe(UEFA_TEAM_FLAG_CODES.SCO)
    expect(html).toContain('Scotland')
    expect(html).toContain('<img')
    expect(html).not.toContain('team-label--placeholder')
  })

  it('renders unresolved slots as neutral placeholders that cannot open a profile', () => {
    const html = renderToStaticMarkup(
      <TeamProfileContext.Provider value={{ openTeamProfile: () => {} }}>
        <TeamLabel label="Winner Group A" unresolved />
      </TeamProfileContext.Provider>,
    )
    expect(html).toContain('Winner Group A')
    expect(html).toContain('team-label--placeholder')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('data-team-profile-trigger')
  })

  it('marks provisional sample teams visibly', () => {
    const html = renderToStaticMarkup(<TeamLabel team={{ label: 'Scotland', isoCode: 'SCO', isProvisional: true }} />)
    expect(html).toContain('Provisional')
    expect(html).toContain('team-label--provisional')
  })

  it('makes the shared team identity interactive when the profile provider is available', () => {
    const html = renderToStaticMarkup(
      <TeamProfileContext.Provider value={{ openTeamProfile: () => {} }}>
        <TeamLabel team={{ teamId: 'scotland', label: 'Scotland', isoCode: 'SCO' }} />
      </TeamProfileContext.Provider>,
    )
    expect(html).toContain('<button')
    expect(html).toContain('Open Scotland team profile')
    expect(html).toContain('data-team-profile-trigger="true"')
  })

  it('keeps score-entry controls outside the profile activation target', () => {
    const html = renderToStaticMarkup(
      <TeamProfileContext.Provider value={{ openTeamProfile: () => {} }}>
        <div>
          <TeamLabel team={{ teamId: 'scotland', label: 'Scotland', isoCode: 'SCO' }} />
          <ScoreInput value={1} onChange={() => {}} label="Scotland score" />
        </div>
      </TeamProfileContext.Provider>,
    )
    const triggerStart = html.indexOf('data-team-profile-trigger="true"')
    const triggerEnd = html.indexOf('</button>', triggerStart)
    const scoreInput = html.indexOf('aria-label="Scotland score"')
    expect(triggerStart).toBeGreaterThan(-1)
    expect(triggerEnd).toBeGreaterThan(triggerStart)
    expect(scoreInput).toBeGreaterThan(triggerEnd)
  })

  it('routes activation through the team identity only', () => {
    const contextHandler = vi.fn()
    const team = { teamId: 'scotland', label: 'Scotland' }
    const activation = resolveTeamProfileActivation({ unresolved: false, team, explicitHandler: null, contextHandler })
    activation()
    expect(contextHandler).toHaveBeenCalledWith(team)
    expect(resolveTeamProfileActivation({ unresolved: true, team, explicitHandler: null, contextHandler })).toBeNull()
  })
})
