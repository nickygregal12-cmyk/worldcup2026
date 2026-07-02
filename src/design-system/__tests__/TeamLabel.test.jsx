import React from 'react' // eslint-disable-line no-unused-vars
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import TeamLabel from '../TeamLabel.jsx'
import { flagAssetForTeamIso, UEFA_TEAM_FLAG_CODES } from '../teamFlagRegistry.js'

describe('TeamLabel', () => {
  it('renders a locally bundled circular flag for a supported UEFA team code', () => {
    const html = renderToStaticMarkup(<TeamLabel team={{ label: 'Scotland', isoCode: 'SCO', isProvisional: false }} />)
    expect(flagAssetForTeamIso('sco')).toBe(UEFA_TEAM_FLAG_CODES.SCO)
    expect(html).toContain('Scotland')
    expect(html).toContain('<img')
    expect(html).not.toContain('team-label--placeholder')
  })

  it('renders unresolved slots as neutral placeholders', () => {
    const html = renderToStaticMarkup(<TeamLabel label="Winner Group A" unresolved />)
    expect(html).toContain('Winner Group A')
    expect(html).toContain('team-label--placeholder')
    expect(html).not.toContain('<img')
  })

  it('marks provisional sample teams visibly', () => {
    const html = renderToStaticMarkup(<TeamLabel team={{ label: 'Scotland', isoCode: 'SCO', isProvisional: true }} />)
    expect(html).toContain('Provisional')
    expect(html).toContain('team-label--provisional')
  })

  it('makes only the team identity interactive when an activation handler is supplied', () => {
    const html = renderToStaticMarkup(<TeamLabel team={{ label: 'Scotland', isoCode: 'SCO' }} onActivate={() => {}} />)
    expect(html).toContain('<button')
    expect(html).toContain('Open Scotland team profile')
  })
})
