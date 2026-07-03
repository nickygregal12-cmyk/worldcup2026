import React from 'react' // eslint-disable-line no-unused-vars
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import AdminControlRoomVisualFixture from '../AdminControlRoomVisualFixture.jsx'

describe('Admin control-room visual fixture', () => {
  it('renders the Stage 13F-K2 readiness, fixture, recovery, picks and audit surfaces', () => {
    const html = renderToStaticMarkup(<AdminControlRoomVisualFixture />)
    for (const marker of [
      'Operational readiness',
      'Fixture schedule operations',
      'Reconcile all tournament points',
      'Tournament Picks readiness',
      'Combined audit timeline',
    ]) expect(html).toContain(marker)
  })
})
