import React from 'react' // eslint-disable-line no-unused-vars -- React is required for JSX under the current lint config
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { buildGuestReference } from '../../guest/__tests__/fixtures.js'
import { LEAGUE_COMPETITION } from '../../leagues/leagueModel.js'
import PlayerHeadToHead from '../PlayerHeadToHead.jsx'
import { PLAYER_COMPARISON_CONTEXT } from '../playerComparisonModel.js'

describe('PlayerHeadToHead', () => {
  it('renders one aligned, competition-scoped comparison surface', () => {
    const state = {
      status: 'ready',
      otherName: 'Amy',
      competitionKey: LEAGUE_COMPETITION.ORIGINAL,
      standings: {
        current: { displayName: 'Nicky', rank: 2, totalPoints: 40 },
        other: { displayName: 'Amy', rank: 1, totalPoints: 50 },
      },
      data: {
        currentBundle: { visible: false, reason: 'Private until lock' },
        otherBundle: { visible: false, reason: 'Private until lock' },
      },
    }
    const html = renderToStaticMarkup(
      <PlayerHeadToHead state={state} reference={buildGuestReference()} onClose={() => {}} context={PLAYER_COMPARISON_CONTEXT.OVERALL} />,
    )
    expect(html).toContain('Overall head to head')
    expect(html).toContain('Original Predictor')
    expect(html).toContain('Comparison protected')
    expect(html).toContain('Private until lock')
    expect(html).not.toContain('combined')
  })
})
