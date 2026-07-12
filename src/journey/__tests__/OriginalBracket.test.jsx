import React from 'react' // eslint-disable-line no-unused-vars -- React is required for JSX under the current lint config
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import OriginalBracket from '../OriginalBracket.jsx'
import { TeamProfileContext } from '../../design-system/teamProfileContext.js'
import { VISUAL_BRACKET_DRAFT, VISUAL_GROUP_REFERENCE } from '../../testFixtures/visualFixture.js'
import { resolveGuestTournamentPreview } from '../../guest/index.js'

function renderBracket(draft = VISUAL_BRACKET_DRAFT) {
  const preview = resolveGuestTournamentPreview(VISUAL_GROUP_REFERENCE, draft)
  return renderToStaticMarkup(
    <TeamProfileContext.Provider value={{ openTeamProfile: () => {} }}>
      <OriginalBracket reference={VISUAL_GROUP_REFERENCE} draft={draft} preview={preview} contentLocked={false} reviewMode={false} graceWindows={[]} onChange={() => {}} />
    </TeamProfileContext.Provider>,
  )
}

describe('OriginalBracket', () => {
  it('renders a predicted winner-only bracket without score, method or joker controls', () => {
    const html = renderBracket()
    expect(html).toContain('data-contract="original-bracket-g"')
    expect(html).toContain('Your bracket')
    expect(html).toContain('Your pre-tournament bracket')
    expect(html).toContain('Your group predictions decide this bracket. Live results will not change your saved picks.')
    expect(html).toContain('This bracket is winner picks only. Scores and jokers are handled in KO Predictor.')
    expect(html).toContain('Pick every knockout winner before the tournament starts')
    expect((html.match(/KO Predictor/g) ?? [])).toHaveLength(1)
    expect(html).toContain('No bracket jokers')
    expect(html).toContain('Pick the team that goes through')
    expect(html).not.toContain('90-minute score')
    expect(html).not.toContain('How the tie is decided')
    expect(html).not.toContain('KO jokers')
    expect(html).not.toContain('<input')
    expect(html).toContain('data-team-profile-trigger="true"')
    expect(html).toContain('bracket-team-choice__action')
  })

  it('shows source references and the single wall-chart surface contract', () => {
    const html = renderBracket()
    expect(html).toContain('data-wall-chart="seven-lanes"')
    expect(html).toContain('data-wall-lanes="7"')
    expect(html).toContain('data-final-position="centre"')
    expect(html).toContain('aria-label="Seven-lane bracket"')
    expect(html).toContain('data-wall-lane="r16-left"')
    expect(html).toContain('data-wall-lane="final-centre"')
    expect(html).toContain('data-wall-lane="r16-right"')
    expect(html).toContain('data-slot-source="1A"')
    expect(html).toContain('data-slot-source="3ABCD"')
    expect(html).toContain('data-slot-source="W39"')
    expect(html).toContain('Kick-off TBC')
    expect(html).toContain('Venue to be confirmed')
    expect(html).toContain('Champion')

    const emptyBracketDraft = {
      ...VISUAL_BRACKET_DRAFT,
      bracketPredictions: Object.fromEntries(Object.values(VISUAL_BRACKET_DRAFT.bracketPredictions).map(row => [String(row.matchNumber), { ...row, advancingTeamId: null }])),
    }
    expect(renderBracket(emptyBracketDraft)).toContain('Pick through to the final')
  })

  /*
   * The reference row carried scheduled_date and kickoff_at all along — guestReferenceModel puts
   * them on every knockout row — but buildOriginalBracketSurface backfilled only the venue off
   * it. So a KO tie printed a real, confirmed stadium beside "Date to be confirmed / Kick-off
   * TBC", which is what the owner saw on the phone: the venue was proof the data had arrived.
   *
   * The date is asserted in the language Groups and Home speak, because it used to be a third
   * one: 24-hour, UTC, "20:00". Same fixture, same product, one voice.
   */
  it('renders the confirmed kick-off date and time when the reference carries them', () => {
    const reference = {
      ...VISUAL_GROUP_REFERENCE,
      knockoutMatches: VISUAL_GROUP_REFERENCE.knockoutMatches.map(match => ({
        ...match,
        scheduledDate: '2028-06-24',
        kickoffAt: '2028-06-24T19:00:00Z',
      })),
    }
    const preview = resolveGuestTournamentPreview(reference, VISUAL_BRACKET_DRAFT)
    const html = renderToStaticMarkup(
      <TeamProfileContext.Provider value={{ openTeamProfile: () => {} }}>
        <OriginalBracket reference={reference} draft={VISUAL_BRACKET_DRAFT} preview={preview} contentLocked={false} reviewMode={false} graceWindows={[]} onChange={() => {}} />
      </TeamProfileContext.Provider>,
    )
    expect(html).toContain('Sat 24 June')
    expect(html).toContain('8:00pm') // 19:00Z is 8:00pm in June — BST, and the same clock Groups prints
    expect(html).not.toContain('Date to be confirmed')
    expect(html).not.toContain('Kick-off TBC')
  })

  /*
   * The chart is one rule set reached two ways, and the tie stylesheet reads it off this
   * attribute. It used to reach for `:global(.wallMode)` — a CSS Module class, therefore hashed,
   * therefore a selector that matched no element that has ever existed — so the phone's wall
   * chart silently kept the list card inside the chart grid and the names collided with the
   * labels. If this attribute stops being emitted, that failure comes straight back.
   */
  it('publishes the chart-reading state as an unhashed attribute the stylesheets can reach', () => {
    expect(renderBracket()).toContain('data-wall-mode="off"')
  })

  it('renders the confirmed venue name when the reference carries it', () => {
    const reference = {
      ...VISUAL_GROUP_REFERENCE,
      knockoutMatches: VISUAL_GROUP_REFERENCE.knockoutMatches.map(match => ({
        ...match,
        venueName: 'Wembley Stadium',
        venueCity: 'London',
      })),
    }
    const preview = resolveGuestTournamentPreview(reference, VISUAL_BRACKET_DRAFT)
    const html = renderToStaticMarkup(
      <TeamProfileContext.Provider value={{ openTeamProfile: () => {} }}>
        <OriginalBracket reference={reference} draft={VISUAL_BRACKET_DRAFT} preview={preview} contentLocked={false} reviewMode={false} graceWindows={[]} onChange={() => {}} />
      </TeamProfileContext.Provider>,
    )
    expect(html).toContain('Wembley Stadium, London')
    expect(html).not.toContain('Venue to be confirmed')
  })

  it('renders the exact amber re-pick flag for stale bracket selections', () => {
    const staleDraft = {
      ...VISUAL_BRACKET_DRAFT,
      bracketPredictions: {
        ...VISUAL_BRACKET_DRAFT.bracketPredictions,
        45: { ...VISUAL_BRACKET_DRAFT.bracketPredictions['45'], advancingTeamId: 'visual-team-24' },
      },
    }
    const html = renderBracket(staleDraft)
    expect(html).toContain('Re-pick — your tables changed this tie')
    expect(html).toContain('Previous pick: Romania')
  })
})
