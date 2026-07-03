import React from 'react' // eslint-disable-line no-unused-vars
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import OriginalBracket from '../OriginalBracket.jsx'
import { TeamProfileContext } from '../../design-system/teamProfileContext.js'
import { VISUAL_BRACKET_DRAFT, VISUAL_GROUP_REFERENCE } from '../../testFixtures/visualFixture.js'
import { resolveGuestTournamentPreview } from '../../guest/index.js'

describe('OriginalBracket', () => {
  it('renders a predicted winner-only bracket without score, method or joker controls', () => {
    const preview = resolveGuestTournamentPreview(VISUAL_GROUP_REFERENCE, VISUAL_BRACKET_DRAFT)
    const html = renderToStaticMarkup(
      <TeamProfileContext.Provider value={{ openTeamProfile: () => {} }}>
        <OriginalBracket reference={VISUAL_GROUP_REFERENCE} draft={VISUAL_BRACKET_DRAFT} preview={preview} contentLocked={false} reviewMode={false} graceWindows={[]} onChange={() => {}} />
      </TeamProfileContext.Provider>,
    )
    expect(html).toContain('Predicted context')
    expect(html).toContain('Your permanent pre-tournament bracket')
    expect(html).toContain('0 bracket jokers')
    expect(html).not.toContain('90-minute score')
    expect(html).toContain('data-team-profile-trigger="true"')
    expect(html).not.toMatch(/<button[^>]*class="[^"]*bracket-team-choice(?: |")/)
    expect(html).toContain('class="bracket-team-choice__action"')
  })
})
