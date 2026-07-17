// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { buildGuestReference } from '../../guest/__tests__/fixtures.js'
import { LinkButton } from '../../design-system/index.jsx'
import TournamentExperience from '../TournamentExperience.jsx'
import { buildTournamentPageModel } from '../tournamentPageModel.js'

function foundationFixture() {
  return {
    tournament: { id: 'tournament-euro-2028', code: 'euro-2028', name: 'UEFA EURO 2028' },
    stages: [],
    totals: { matches: 51, groupMatches: 36, knockoutMatches: 15, officialDateVenueMatches: 51 },
    guestReference: buildGuestReference(),
  }
}

describe('Tournament experience', () => {
  it('routes from tournament context into teams, qualification and the priority Match Centre', () => {
    const { container } = render(
      <TournamentExperience
        foundation={foundationFixture()}
        client={null}
        lifecycle={{ started: false, locked: false }}
        buildModel={buildTournamentPageModel}
        rulesAction={<LinkButton href="#/how-to-play">How to play</LinkButton>}
      />,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'The road to Euro 2028' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Match Centre' }).getAttribute('href')).toContain('match=1')
    expect(screen.getByRole('table', { name: 'Third-place qualification standings' }).querySelectorAll('tbody tr')).toHaveLength(6)
    expect(screen.getAllByText('Pending')).toHaveLength(6)
    expect(container.querySelectorAll('[data-team-label="flag"]').length).toBeGreaterThanOrEqual(24)
    expect(screen.getByRole('link', { name: /Groups/ }).getAttribute('href')).toBe('#/groups')
  })
})
