import React from 'react' // eslint-disable-line no-unused-vars
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import KoPredictorMatchCentre from '../KoPredictorMatchCentre.jsx'
import { TeamProfileContext } from '../../design-system/teamProfileContext.js'
import { createKoPredictorDraft, summariseKoPredictor } from '../koPredictorModel.js'
import { VISUAL_KO_BUNDLE, VISUAL_KO_REFERENCE, VISUAL_KO_STANDING } from '../../testFixtures/visualFixture.js'

describe('KoPredictorMatchCentre', () => {
  it('renders the real-fixture competition with separate prediction controls', () => {
    const draft = createKoPredictorDraft(VISUAL_KO_REFERENCE, VISUAL_KO_BUNDLE)
    const html = renderToStaticMarkup(
      <TeamProfileContext.Provider value={{ openTeamProfile: () => {} }}>
        <KoPredictorMatchCentre reference={VISUAL_KO_REFERENCE} draft={draft} summary={summariseKoPredictor(VISUAL_KO_REFERENCE, draft)} standing={VISUAL_KO_STANDING} signedIn saveState="dirty" onChange={() => {}} onSave={() => {}} />
      </TeamProfileContext.Provider>,
    )
    expect(html).toContain('Real fixture context')
    expect(html).toContain('90-minute score')
    expect(html).toContain('Team to advance')
    expect(html).toContain('How the tie is decided')
    expect(html).toContain('Your KO points')
    expect(html).toContain('data-team-profile-trigger="true"')
    expect(html).toContain('class="ko-team-choice')
    expect(html).not.toMatch(/<button[^>]*class="[^"]*ko-team-choice(?: |")/)
    expect(html).toContain('class="ko-team-choice__action"')
  })
})
