import React from 'react' // eslint-disable-line no-unused-vars -- React is required for JSX under the current lint config
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import PlayerIdentity from '../PlayerIdentity.jsx'

describe('PlayerIdentity', () => {
  it('renders current-user identity without an activation button', () => {
    const html = renderToStaticMarkup(<PlayerIdentity player={{ displayName: 'Nicky Gregal' }} isCurrentUser />)
    expect(html).toContain('NG')
    expect(html).toContain('Nicky Gregal')
    expect(html).toContain('You')
    expect(html).not.toContain('<button')
  })

  it('uses one accessible comparison trigger for another player', () => {
    const html = renderToStaticMarkup(<PlayerIdentity player={{ displayName: 'Amy Fraser' }} onActivate={() => {}} />)
    expect(html).toContain('<button')
    expect(html).toContain('Compare predictions with Amy Fraser')
    expect(html).toContain('data-player-identity-trigger="true"')
  })
})
