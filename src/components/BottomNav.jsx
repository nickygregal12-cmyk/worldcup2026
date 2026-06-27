import { Link, useLocation } from 'react-router-dom'
import { useAuthStore, useAppStore } from '../store/index.js'

const KO_OPEN_DATE = new Date('2026-06-27T22:00:00Z')

// ── SVG icons — one per route, sized for nav use ──────────────────────────
const Icons = {
  home: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
    </svg>
  ),
  groups: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      <path d="M2 12h20"/>
    </svg>
  ),
  knockout: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
      <path d="M4 22h16"/>
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
    </svg>
  ),
  awards: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6"/>
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>
    </svg>
  ),
  leagues: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  kopred: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
}

// Maps route → icon key
function getIcon(to) {
  if (to === '/')             return Icons.home
  if (to === '/predictions')  return Icons.groups
  if (to === '/knockout')     return Icons.knockout
  if (to === '/awards')       return Icons.awards
  if (to === '/leagues')      return Icons.leagues
  if (to === '/ko-predictor') return Icons.kopred
  return Icons.home
}

export default function BottomNav() {
  const location = useLocation()
  const { user } = useAuthStore()
  const { appSettings } = useAppStore()
  const phaseOverride = appSettings?.game_phase_override || ''
  const koLive = phaseOverride === 'ko_predictor' || phaseOverride === 'post_tournament'
    ? true
    : phaseOverride && phaseOverride !== 'ko_predictor' ? false
    : new Date() >= KO_OPEN_DATE

  // Post group stage: swap Groups tab for KO Predictor, keep Knockout
  // ── LOGIC UNCHANGED — only visual layer below is new ──
  const navItems = koLive ? [
    { to: '/',             label: 'Home' },
    { to: '/ko-predictor', label: 'KO Pred', highlight: true },
    { to: '/knockout',     label: 'Knockout' },
    { to: '/awards',       label: 'Awards' },
    { to: '/leagues',      label: 'Leagues', protected: true },
  ] : [
    { to: '/',             label: 'Home' },
    { to: '/predictions',  label: 'Groups' },
    { to: '/knockout',     label: 'Knockout' },
    { to: '/awards',       label: 'Awards' },
    { to: '/leagues',      label: 'Leagues', protected: true },
  ]

  return (
    <nav className="hide-desktop" style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      background: 'transparent',
      padding: '8px 12px',
      paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 8px), 16px)',
      zIndex: 100,
      pointerEvents: 'none', // let the pill handle clicks
    }}>
      {/* Floating glass pill */}
      <div style={{
        background: 'rgba(0,20,70,0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '28px',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '8px 4px',
        boxShadow: '0 8px 32px rgba(0,20,80,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.1)',
        pointerEvents: 'all',
      }}>
        {navItems.map(({ to, label, protected: prot, highlight }) => {
          const isActive = to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(to)
          const href = prot && !user ? '/login' : to
          const activeColor = highlight ? '#ff7043' : 'white'

          return (
            <Link
              key={to}
              to={href}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px',
                padding: '6px 10px',
                borderRadius: '18px',
                background: isActive
                  ? (highlight ? 'rgba(255,112,67,0.18)' : 'rgba(255,255,255,0.12)')
                  : 'transparent',
                minWidth: '52px',
                transition: 'all 0.18s ease',
                color: isActive ? activeColor : 'rgba(255,255,255,0.4)',
                textDecoration: 'none',
              }}
            >
              {getIcon(to)}
              <span style={{
                fontSize: '9px',
                fontWeight: isActive ? '700' : '500',
                letterSpacing: '0.02em',
                fontFamily: 'var(--font-sans)',
                whiteSpace: 'nowrap',
              }}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
