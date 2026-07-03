import React from 'react' // eslint-disable-line no-unused-vars
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LEADERBOARD_COMPETITION } from '../../app/appRoutes.js'
import ResultsAndLeaderboards from '../ResultsAndLeaderboards.jsx'
import { RESULTS_PAGE_VIEW } from '../resultsAccess.js'

const client = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
  },
}

const reference = {
  tournamentId: 'euro28',
  groupMatches: [],
  knockoutMatches: [],
  teamsById: {},
}

describe('Results and Leaderboards access surface', () => {
  it('renders dedicated route links for Results and Leaderboards', () => {
    const html = renderToStaticMarkup(
      <ResultsAndLeaderboards
        client={client}
        reference={reference}
        view={RESULTS_PAGE_VIEW.LEADERBOARDS}
        initialCompetition={LEADERBOARD_COMPETITION.KO_PREDICTOR}
      />,
    )

    expect(html).toContain('href="#/results"')
    expect(html).toContain('href="#/leaderboards"')
    expect(html).toContain('Full competition leaderboards')
    expect(html).not.toContain('combined leaderboard')
  })
})
