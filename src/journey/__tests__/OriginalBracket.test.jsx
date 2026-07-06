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
    expect(html).toContain('Your bracket')
    expect(html).toContain('Your pre-tournament bracket')
    expect(html).toContain('Your group predictions decide this bracket. Live results will not change your saved picks.')
    expect(html).toContain('This bracket is winner picks only. Scores and jokers are handled in KO Predictor.')
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
    expect(html).toContain('aria-label="Wall chart bracket"')
    expect(html).toContain('data-slot-source="1A"')
    expect(html).toContain('data-slot-source="3ABCD"')
    expect(html).toContain('data-slot-source="W39"')
    expect(html).toContain('Champion')

    const emptyBracketDraft = {
      ...VISUAL_BRACKET_DRAFT,
      bracketPredictions: Object.fromEntries(Object.values(VISUAL_BRACKET_DRAFT.bracketPredictions).map(row => [String(row.matchNumber), { ...row, advancingTeamId: null }])),
    }
    expect(renderBracket(emptyBracketDraft)).toContain('Pick through to the final')
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
