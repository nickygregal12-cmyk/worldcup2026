import React, { useEffect, useMemo, useState } from 'react' // eslint-disable-line no-unused-vars -- React is required for JSX under the current lint config
import { APP_ROUTE, destinationForRoute } from './appRoutes.js'
import { buildNavigationDestinations } from './navigationLifecycle.js'
import MobileNav from './MobileNav.jsx'
import { Icon } from '../design-system/index.jsx'
import MoreMenu from './MoreMenu.jsx'
import masthead from './Masthead.module.css'

function initials(value) {
  const words = String(value ?? '').trim().split(/\s+/).filter(Boolean)
  return words.slice(0, 2).map(word => word[0]).join('').toUpperCase() || 'U'
}

// The desktop nav link. MobileNav owns the five-position phone bar and its aligned
// centre Home treatment.
function NavLink({ destination, route, onClick }) {
  const active = destination.key === route
  return (
    <a
      href={destination.hash}
      className={active ? `app-nav-link is-active ${masthead.navLink} ${masthead.isActive}` : `app-nav-link ${masthead.navLink}`}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
    >
      <Icon name={destination.icon} size={18} />
      <span>{destination.label}</span>
    </a>
  )
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

  // Home sits third of five (the fifth is the More button MobileNav renders itself),
  // so its larger circular background lands dead centre without raising the control.
  const mobileDestinations = useMemo(() => [
    primaryDestination,
    bracketDestination,
    { ...homeDestination, home: true },
    leaguesDestination,
  ], [primaryDestination, bracketDestination, homeDestination, leaguesDestination])

  const moreGroups = useMemo(() => {
    const groups = [
      { key: 'follow', label: 'Follow the tournament', destinations: [resultsDestination, leaderboardsDestination] },
      { key: 'predictor', label: 'Your predictor', destinations: navigationDestinations.phaseMoreDestinations },
      {
        key: 'account-info',
        label: 'Account and information',
        destinations: [
          destinationForRoute(APP_ROUTE.ACCOUNT),
          destinationForRoute(APP_ROUTE.TOURNAMENT),
          destinationForRoute(APP_ROUTE.HOW_TO_PLAY),
        ],
      },
    ]
    if (adminVisibility?.isAdmin) {
      groups.push({ key: 'admin', label: 'Administration', destinations: [destinationForRoute(APP_ROUTE.ADMIN)] })
    }
    return groups
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
      <header className={`app-header ${masthead.header}`}>
        <div className={`app-header__inner ${masthead.inner}`}>
          <a href="#/" className={`app-brand ${masthead.brand}`} aria-label="Euro 2028 Predictor home">
            <span className={`app-brand__mark ${masthead.brandMark}`} aria-hidden="true">28</span>
            <span><strong>Euro 2028</strong><small>Predictor</small></span>
          </a>

          <nav className={`app-desktop-nav ${masthead.desktopNav}`} aria-label="Main navigation">
            {desktopDestinations.map(item => <NavLink key={item.key} destination={item} route={route} />)}
          </nav>

          <div className={`app-header__actions ${masthead.actions}`}>
            <button
              type="button"
              className={`ui-icon-button ${masthead.chromeIconButton}`}
              onClick={theme.toggleTheme}
              aria-label={`Switch to ${theme.resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme.resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
            >
              <Icon name={theme.resolvedTheme === 'dark' ? 'sun' : 'moon'} />
            </button>
            <a href="#/account" className={route === APP_ROUTE.ACCOUNT ? `app-account-link ${masthead.accountLink} ${masthead.isActive}` : `app-account-link ${masthead.accountLink}`} aria-label={sessionState.session ? `Account: ${displayName}` : 'Sign in or create an account'}>
              <span className={`app-avatar ${masthead.avatar}`}>{sessionState.session ? initials(displayName) : <Icon name="account" size={19} />}</span>
              <span>{sessionState.session ? sessionState.profile?.display_name ?? 'Account' : 'Sign in'}</span>
            </a>
            <button
              type="button"
              className={moreActive
                ? `ui-icon-button app-more-button ${masthead.chromeIconButton} ${masthead.moreButton} ${masthead.isActive}`
                : `ui-icon-button app-more-button ${masthead.chromeIconButton} ${masthead.moreButton}`}
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
        <nav aria-label="Footer navigation"><a href="#/tournament">Tournament</a><a href="#/how-to-play">How to play</a><a href="#/account">Account</a></nav>
      </footer>

      <MobileNav
        destinations={mobileDestinations}
        route={route}
        moreActive={moreActive}
        moreOpen={moreOpen}
        onMoreOpen={() => setMoreOpen(true)}
      />

      <MoreMenu open={moreOpen} onClose={() => setMoreOpen(false)} route={route} groups={moreGroups} theme={theme} />
    </div>
  )
}
