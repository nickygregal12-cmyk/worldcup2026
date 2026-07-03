import React, { useEffect, useMemo, useState } from 'react' // eslint-disable-line no-unused-vars -- React is required for JSX under the current lint config
import { APP_ROUTE, destinationForRoute } from './appRoutes.js'
import { buildNavigationDestinations } from './navigationLifecycle.js'
import { Dialog, Icon } from '../design-system/index.jsx'

function initials(value) {
  const words = String(value ?? '').trim().split(/\s+/).filter(Boolean)
  return words.slice(0, 2).map(word => word[0]).join('').toUpperCase() || 'U'
}

function NavLink({ destination, route, compact = false, centre = false, onClick }) {
  const active = destination.key === route
  const classes = ['app-nav-link', active ? 'is-active' : '', centre ? 'app-nav-link--home' : ''].filter(Boolean).join(' ')
  return (
    <a
      href={destination.hash}
      className={classes}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
    >
      <span className={centre ? 'app-nav-link__home-icon' : undefined}>
        <Icon name={destination.icon} size={centre ? 25 : compact ? 22 : 18} />
      </span>
      <span>{compact ? destination.shortLabel : destination.label}</span>
    </a>
  )
}

function describeMoreDestination(destination) {
  if (destination.key === APP_ROUTE.RESULTS) return 'Scores, live tables and the live bracket'
  if (destination.key === APP_ROUTE.LEADERBOARDS) return 'Full Original and KO Predictor tables'
  if (destination.key === APP_ROUTE.ACCOUNT) return 'Sign in and profile'
  if (destination.key === APP_ROUTE.TOURNAMENT) return 'Format and scoring rules'
  if (destination.key === APP_ROUTE.ADMIN) return 'Tournament operations'
  if (destination.key === APP_ROUTE.KO_PREDICTOR) return 'Only confirmed real knockout fixtures are shown'
  if (destination.key === APP_ROUTE.PREDICT) return 'Review every group-stage prediction and result'
  return ''
}

export default function EuroAppShell({ route, theme, sessionState, navigation, adminVisibility, children }) {
  const [moreOpen, setMoreOpen] = useState(false)
  const destination = destinationForRoute(route)
  const homeDestination = destinationForRoute(APP_ROUTE.HOME)
  const leaguesDestination = destinationForRoute(APP_ROUTE.LEAGUES)
  const resultsDestination = destinationForRoute(APP_ROUTE.RESULTS)
  const leaderboardsDestination = destinationForRoute(APP_ROUTE.LEADERBOARDS)
  const navigationDestinations = useMemo(() => buildNavigationDestinations(navigation), [navigation])
  const primaryDestination = navigationDestinations.primary
  const bracketDestination = navigationDestinations.bracket

  const desktopDestinations = useMemo(() => [
    homeDestination,
    primaryDestination,
    bracketDestination,
    leaguesDestination,
    resultsDestination,
  ], [homeDestination, primaryDestination, bracketDestination, leaguesDestination, resultsDestination])

  const moreDestinations = useMemo(() => {
    const destinations = [
      resultsDestination,
      leaderboardsDestination,
      ...navigationDestinations.phaseMoreDestinations,
      destinationForRoute(APP_ROUTE.ACCOUNT),
      destinationForRoute(APP_ROUTE.TOURNAMENT),
    ]
    if (adminVisibility?.isAdmin) destinations.push(destinationForRoute(APP_ROUTE.ADMIN))
    return destinations
  }, [resultsDestination, leaderboardsDestination, navigationDestinations, adminVisibility?.isAdmin])

  const visibleMobileRoutes = new Set([
    APP_ROUTE.HOME,
    primaryDestination.key,
    APP_ROUTE.BRACKET,
    APP_ROUTE.LEAGUES,
  ])
  const moreActive = !visibleMobileRoutes.has(route)
  const displayName = sessionState.profile?.display_name ?? sessionState.session?.user?.email ?? 'Account'

  useEffect(() => {
    document.title = route === APP_ROUTE.HOME
      ? 'Euro 2028 Predictor'
      : `${destination.label} · Euro 2028 Predictor`
  }, [route, destination.label])

  return (
    <div className="app-shell" data-route={route} data-navigation-phase={navigation?.phase ?? 'groups_primary'}>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="app-header">
        <div className="app-header__inner">
          <a href="#/" className="app-brand" aria-label="Euro 2028 Predictor home">
            <span className="app-brand__mark" aria-hidden="true">28</span>
            <span><strong>Euro 2028</strong><small>Predictor</small></span>
          </a>

          <nav className="app-desktop-nav" aria-label="Main navigation">
            {desktopDestinations.map(item => <NavLink key={item.key} destination={item} route={route} />)}
          </nav>

          <div className="app-header__actions">
            <button
              type="button"
              className="ui-icon-button"
              onClick={theme.toggleTheme}
              aria-label={`Switch to ${theme.resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme.resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
            >
              <Icon name={theme.resolvedTheme === 'dark' ? 'sun' : 'moon'} />
            </button>
            <a href="#/account" className={route === APP_ROUTE.ACCOUNT ? 'app-account-link is-active' : 'app-account-link'} aria-label={sessionState.session ? `Account: ${displayName}` : 'Sign in or create an account'}>
              <span className="app-avatar">{sessionState.session ? initials(displayName) : <Icon name="account" size={19} />}</span>
              <span>{sessionState.session ? sessionState.profile?.display_name ?? 'Account' : 'Sign in'}</span>
            </a>
            <button
              type="button"
              className={moreActive ? 'ui-icon-button app-more-button is-active' : 'ui-icon-button app-more-button'}
              aria-label="More destinations"
              aria-expanded={moreOpen}
              aria-haspopup="dialog"
              onClick={() => setMoreOpen(true)}
            ><Icon name="more" /></button>
          </div>
        </div>
      </header>

      <main id="main-content" className="app-main" tabIndex="-1">
        {children}
      </main>

      <footer className="app-footer">
        <span>Euro 2028 Predictor</span>
        <nav aria-label="Footer navigation"><a href="#/tournament">Tournament and rules</a><a href="#/account">Account</a></nav>
      </footer>

      <nav className="app-mobile-nav" aria-label="Mobile navigation">
        <NavLink destination={primaryDestination} route={route} compact />
        <NavLink destination={bracketDestination} route={route} compact />
        <NavLink destination={homeDestination} route={route} compact centre />
        <NavLink destination={leaguesDestination} route={route} compact />
        <button
          type="button"
          className={moreActive ? 'app-nav-link is-active' : 'app-nav-link'}
          aria-expanded={moreOpen}
          aria-haspopup="dialog"
          onClick={() => setMoreOpen(true)}
        ><Icon name="more" size={22} /><span>More</span></button>
      </nav>

      <Dialog open={moreOpen} title="More" onClose={() => setMoreOpen(false)} className="app-more-dialog">
        <nav className="app-more-grid" aria-label="More destinations">
          {moreDestinations.map(item => (
            <a key={`${item.key}-${item.label}`} href={item.hash} className={item.key === route ? 'is-active' : ''} aria-current={item.key === route ? 'page' : undefined} onClick={() => setMoreOpen(false)}>
              <Icon name={item.icon} />
              <span><strong>{item.label}</strong><small>{describeMoreDestination(item)}</small></span>
              <Icon name="chevron" size={18} />
            </a>
          ))}
        </nav>
        <button type="button" className="app-theme-row" onClick={theme.toggleTheme}>
          <Icon name={theme.resolvedTheme === 'dark' ? 'sun' : 'moon'} />
          <span><strong>{theme.resolvedTheme === 'dark' ? 'Use light mode' : 'Use dark mode'}</strong><small>Appearance is saved on this device</small></span>
        </button>
      </Dialog>
    </div>
  )
}
