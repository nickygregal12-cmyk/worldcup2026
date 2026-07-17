import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import PlayerView from '../PlayerView.jsx'
import { buildPlayerView } from '../playerViewModel.js'
import { buildPlayerViewTestReference } from './playerViewTestReference.js'

function loadedData({ tab = 'overview', competitionKey = 'original' } = {}) {
  const reference = buildPlayerViewTestReference()
  const view = buildPlayerView({
    memberUserId: 'player-1',
    displayName: 'Dougie',
    standingsRows: [{ userId: 'player-1', displayName: 'Dougie', rank: 1, totalPoints: 70 }],
    predictionBundle: {
      visible: true,
      releaseState: 'released',
      displayName: 'Dougie',
      match_predictions: [
        { match_number: 1, home_score_90: 1, away_score_90: 0, joker_applied: true },
        { match_number: 2, home_score_90: 2, away_score_90: 2, joker_applied: false },
      ],
      bracket_predictions: [{ match_number: 37, advancing_tournament_team_id: reference.teams[0].id }],
    },
    competitionKey,
    reference,
    lifecycle: { locked: true, tournamentStarted: true },
  })

  return {
    reference,
    props: {
      client: null,
      reference,
      lifecycle: { locked: true, tournamentStarted: true },
      initialCompetition: competitionKey,
      initialTab: tab,
      initialData: {
        signedIn: true,
        currentUserId: 'player-1',
        memberUserId: 'player-1',
        competitionKey,
        view,
      },
    },
  }
}

describe('PlayerView component markers', () => {
  it('renders the loading state before player data arrives', () => {
    const reference = buildPlayerViewTestReference()
    const html = renderToStaticMarkup(createElement(PlayerView, { client: null, reference, lifecycle: null }))
    expect(html).toContain('Loading player view')
  })

  it('renders the dedicated predictions section from a loaded view', () => {
    const { props } = loadedData({ tab: 'predictions' })
    const html = renderToStaticMarkup(createElement(PlayerView, props))

    expect(html).toContain('Dougie')
    expect(html).toContain('Original Predictor profile')
    expect(html).toContain('Match picks')
    expect(html).toContain('Original points')
    expect(html).toContain('Hidden picks')
    expect(html).toContain('Joker')
  })

  it('opens on a profile overview that links the main evidence views', () => {
    const { props } = loadedData()
    const html = renderToStaticMarkup(createElement(PlayerView, props))

    expect(html).toContain('Profile overview')
    expect(html).toContain('Points receipt')
    expect(html).toContain('Bracket health')
    expect(html).toContain('Predicted tables')
  })

  it('renders the Original bracket section from a loaded view', () => {
    const { props } = loadedData({ tab: 'bracket' })
    const html = renderToStaticMarkup(createElement(PlayerView, props))

    expect(html).toContain('Original Bracket')
    expect(html).toContain('Champion pick')
  })

  it('renders the Original predicted tables section from a loaded view', () => {
    const { props } = loadedData({ tab: 'tables' })
    const html = renderToStaticMarkup(createElement(PlayerView, props))

    expect(html).toContain('Predicted tables')
    expect(html).toContain('Group A')
  })

  it('keeps KO Predictor view away from bracket and table sections', () => {
    const { props } = loadedData({ competitionKey: 'ko_predictor', tab: 'predictions' })
    const html = renderToStaticMarkup(createElement(PlayerView, props))

    expect(html).toContain('KO Predictor')
    expect(html).toContain('KO Predictor profile')
    expect(html).toContain('Match picks')
    expect(html).not.toContain('Champion pick')
    expect(html).not.toContain('Group A')
  })
})
