import React from 'react' // eslint-disable-line no-unused-vars -- React is required for JSX under the current lint config
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import TeamProfileSheet from '../TeamProfileSheet.jsx'
import { normaliseTeamProfilePayload } from '../teamProfileModel.js'

function readyState({ aggregatesVisible = false, partial = false, tournamentError = false } = {}) {
  const profile = normaliseTeamProfilePayload({
    team: {
      tournament_team_id: 'scotland',
      name: 'Scotland',
      short_name: 'Scotland',
      iso_code: 'SCO',
      group_code: 'A',
      is_host: true,
      is_provisional: true,
    },
    curated: {
      status: 'ready',
      ranking: 44,
      qualifying_route: 'Qualified automatically as a host nation',
      best_euro_finish: 'Group stage',
      editorial_note: 'A provisional editorial summary for the Team Profile Sheet.',
      profile_revision: 1,
    },
    predictions: {
      aggregates_visible: aggregatesVisible,
      visibility_reason: aggregatesVisible ? null : 'Community prediction percentages unlock after the global Original Predictor lock.',
      eligible_prediction_count: aggregatesVisible ? 12 : null,
      aggregates: aggregatesVisible ? {
        group_winner_percentage: 25,
        round_of_16_percentage: 75,
        quarter_final_percentage: 40,
        semi_final_percentage: 20,
        final_percentage: 10,
        champion_percentage: 5,
      } : null,
      viewer_prediction: {
        has_original_prediction_set: true,
        bracket_pick_count: 15,
        predicted_group_winner: true,
        predicted_round_of_16: true,
        predicted_quarter_final: false,
        predicted_semi_final: false,
        predicted_final: false,
        predicted_champion: false,
      },
    },
  })

  return {
    status: 'ready',
    team: { teamId: 'scotland', label: 'Scotland', isoCode: 'SCO' },
    data: {
      status: partial ? 'partial' : 'ready',
      profile,
      tournament: tournamentError ? {
        status: 'error',
        group: null,
        results: [],
        nextFixture: null,
      } : {
        status: 'ready',
        group: { code: 'A', position: 2, points: 4, played: 2, goalDifference: 1, positionProvisional: true },
        results: [{ matchId: 'match-1', state: 'completed', outcome: 'W', homeLabel: 'Scotland', awayLabel: 'Team A2', score: '2–1', stageLabel: 'Group A' }],
        nextFixture: { homeLabel: 'Team A3', awayLabel: 'Scotland', scheduledDate: '2028-06-17' },
      },
      errors: partial ? ['Official result read failed'] : [],
    },
  }
}

describe('TeamProfileSheet', () => {
  it('shows curated facts, app-owned tournament form and private Original Predictor aggregates before lock', () => {
    const html = renderToStaticMarkup(
      <TeamProfileSheet open state={readyState()} lifecycle={{ locked: false }} onClose={() => {}} onRetry={() => {}} />,
    )

    expect(html).toContain('Scotland profile')
    expect(html).toContain('Qualified automatically as a host nation')
    expect(html).toContain('Tournament so far')
    expect(html).toContain('Your prediction')
    expect(html).toContain('Community percentages are private')
    expect(html).toContain('Original Predictor privacy')
    expect(html).toContain('KO Predictor data stays separate')
    expect(html).not.toContain('25%')
  })

  it('shows aggregate percentages only when the protected payload says they are visible', () => {
    const html = renderToStaticMarkup(
      <TeamProfileSheet open state={readyState({ aggregatesVisible: true })} lifecycle={{ locked: true }} onClose={() => {}} onRetry={() => {}} />,
    )

    expect(html).toContain('Based on 12 complete Original Predictor brackets')
    expect(html).toContain('Original Predictor aggregates')
    expect(html).toContain('25%')
    expect(html).toContain('Win EURO 2028')
    expect(html).not.toContain('Community percentages are private')
  })

  it('applies the Supabase-sourced team colour treatment with contrast-safe ink', () => {
    const base = readyState()
    const profile = normaliseTeamProfilePayload({
      team: {
        tournament_team_id: 'scotland',
        name: 'Scotland',
        short_name: 'Scotland',
        iso_code: 'SCO',
        group_code: 'A',
        is_host: true,
        primary_colour: '#1B3A6B',
        secondary_colour: '#FFFFFF',
      },
      curated: { status: 'ready', ranking: 44, qualifying_route: 'route', best_euro_finish: 'Group stage', profile_revision: 1 },
      predictions: { aggregates_visible: false, visibility_reason: 'private' },
    })
    const html = renderToStaticMarkup(
      <TeamProfileSheet open state={{ ...base, data: { ...base.data, profile } }} lifecycle={{ locked: false }} onClose={() => {}} onRetry={() => {}} />,
    )

    expect(html).toContain('#1B3A6B') // team primary applied from data, not hardcoded
    expect(html).toContain('SCO') // colour monogram
    expect(html).toContain('color:#ffffff') // navy → white ink for contrast
  })

  it('stays colour-neutral when a team has no colour data yet', () => {
    const html = renderToStaticMarkup(
      <TeamProfileSheet open state={readyState()} lifecycle={{ locked: false }} onClose={() => {}} onRetry={() => {}} />,
    )
    expect(html).not.toContain('team-profile-colours')
  })

  it('preserves available sections and explains a partial canonical-data failure', () => {
    const html = renderToStaticMarkup(
      <TeamProfileSheet open state={readyState({ partial: true, tournamentError: true })} onClose={() => {}} onRetry={() => {}} />,
    )

    expect(html).toContain('Some profile sections could not refresh')
    expect(html).toContain('Tournament data unavailable')
    expect(html).toContain('A provisional editorial summary')
  })
})
