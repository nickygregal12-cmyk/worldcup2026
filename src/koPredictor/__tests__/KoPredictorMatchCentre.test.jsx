import React from 'react' // eslint-disable-line no-unused-vars
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import KoPredictorMatchCentre from '../KoPredictorMatchCentre.jsx'
import { createKoPredictorDraft, summariseKoPredictor } from '../koPredictorModel.js'
import { VISUAL_KO_BUNDLE, VISUAL_KO_REFERENCE, VISUAL_KO_STANDING } from '../../app/visualFixture.js'

describe('KoPredictorMatchCentre', () => {
  it('renders the real-fixture competition with separate prediction controls', () => {
    const draft = createKoPredictorDraft(VISUAL_KO_REFERENCE, VISUAL_KO_BUNDLE)
    const html = renderToStaticMarkup(<KoPredictorMatchCentre reference={VISUAL_KO_REFERENCE} draft={draft} summary={summariseKoPredictor(VISUAL_KO_REFERENCE, draft)} standing={VISUAL_KO_STANDING} signedIn saveState="dirty" onChange={() => {}} onSave={() => {}} />)
    expect(html).toContain('Real fixture context')
    expect(html).toContain('90-minute score')
    expect(html).toContain('Team to advance')
    expect(html).toContain('How the tie is decided')
    expect(html).toContain('Your KO points')
  })
})
