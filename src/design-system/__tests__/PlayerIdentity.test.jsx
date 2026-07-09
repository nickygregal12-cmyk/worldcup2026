import React from 'react' // eslint-disable-line no-unused-vars -- React is required for JSX under the current lint config
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import PlayerIdentity from '../PlayerIdentity.jsx'

describe('PlayerIdentity', () => {
  it('renders current-user identity as plain text when no activation is offered', () => {
    const html = renderToStaticMarkup(<PlayerIdentity player={{ displayName: 'Nicky Gregal' }} isCurrentUser />)
    expect(html).toContain('NG')
    expect(html).toContain('Nicky Gregal')
    expect(html).toContain('You')
    expect(html).not.toContain('<button')
  })

  it('makes your own name an activation trigger when the caller offers one', () => {
    const html = renderToStaticMarkup(<PlayerIdentity player={{ displayName: 'Nicky Gregal' }} isCurrentUser onActivate={() => {}} />)
    expect(html).toContain('<button')
    expect(html).toContain('Open your player view')
    expect(html).toContain('data-player-identity-trigger="true"')
  })

  it('uses one accessible comparison trigger for another player', () => {
    const html = renderToStaticMarkup(<PlayerIdentity player={{ displayName: 'Amy Fraser' }} onActivate={() => {}} />)
    expect(html).toContain('<button')
    expect(html).toContain('Compare predictions with Amy Fraser')
    expect(html).toContain('data-player-identity-trigger="true"')
  })
})
