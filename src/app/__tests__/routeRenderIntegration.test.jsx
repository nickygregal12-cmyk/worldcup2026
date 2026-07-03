import React from 'react' // eslint-disable-line no-unused-vars -- React is required for JSX under the current lint config
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import EuroAppShell from '../EuroAppShell.jsx'
import { ADMIN_SECTIONS, APP_DESTINATIONS, APP_ROUTE, adminSectionDestination, adminSectionFromHash, hasInvalidAdminSection, knownInternalHashes, routeFromHash } from '../appRoutes.js'

function renderShellAtHash(hash) {
  const route = routeFromHash(hash)
  const content = route === APP_ROUTE.ADMIN
    ? <section aria-label="Admin route render fixture"><h1>{adminSectionDestination(adminSectionFromHash(hash)).heading}</h1>{hasInvalidAdminSection(hash) && <p>Unknown admin section requested</p>}</section>
    : <section aria-label="Route render fixture"><h1>{APP_DESTINATIONS.find(destination => destination.key === route)?.label ?? 'Home'}</h1></section>

  return renderToStaticMarkup(
    <EuroAppShell
      route={route}
      theme={{ mode: 'light', toggleTheme: () => {} }}
      sessionState={{ status: 'ready', session: null }}
      navigation={{}}
      adminVisibility={{ status: 'hidden' }}
    >{content}</EuroAppShell>,
  )
}

describe('route-render integration coverage', () => {
  it('renders a real shell surface for every current application destination', () => {
    for (const destination of APP_DESTINATIONS) {
      const html = renderShellAtHash(destination.hash)
      expect(html).toContain(destination.label)
      expect(html).not.toContain('Loading Euro 2028 Predictor')
    }
  })

  it('renders every protected admin section hash inside the Admin route instead of falling through to Home', () => {
    for (const section of ADMIN_SECTIONS) {
      const html = renderShellAtHash(section.hash)
      expect(routeFromHash(section.hash)).toBe(APP_ROUTE.ADMIN)
      expect(html.replaceAll('&amp;', '&')).toContain(section.heading)
      expect(html).toContain('Admin route render fixture')
      expect(html).not.toContain('<h1>Home</h1>')
    }
  })

  it('recovers invalid admin sections inside the protected Admin route', () => {
    const html = renderShellAtHash('#/admin?section=not-real')
    expect(routeFromHash('#/admin?section=not-real')).toBe(APP_ROUTE.ADMIN)
    expect(adminSectionFromHash('#/admin?section=not-real')).toBe('overview')
    expect(hasInvalidAdminSection('#/admin?section=not-real')).toBe(true)
    expect(html).toContain('Operational overview')
    expect(html).toContain('Unknown admin section requested')
    expect(html).not.toContain('<h1>Home</h1>')
  })

  it('publishes no dead internal destination hashes', () => {
    expect(knownInternalHashes()).toEqual(expect.arrayContaining(APP_DESTINATIONS.map(destination => destination.hash)))
    for (const hash of knownInternalHashes()) {
      expect(routeFromHash(hash)).not.toBeUndefined()
      expect(routeFromHash(hash)).not.toBe(null)
      if (hash.startsWith('#/admin?')) expect(routeFromHash(hash)).toBe(APP_ROUTE.ADMIN)
    }
  })
})
