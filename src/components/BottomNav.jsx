import { Link, useLocation } from 'react-router-dom'
import { useAuthStore, useAppStore } from '../store/index.js'

const KO_OPEN_DATE = new Date('2026-06-27T22:00:00Z')

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
  const navItems = koLive ? [
    { to: '/',             icon: '🏠', label: 'Home' },
    { to: '/ko-predictor', icon: '🔥', label: 'KO Pred', highlight: true },
    { to: '/knockout',     icon: '🏆', label: 'Knockout' },
    { to: '/awards',       icon: '🏅', label: 'Awards' },
    { to: '/leagues',      icon: '👥', label: 'Leagues', protected: true },
  ] : [
    { to: '/',             icon: '🏠', label: 'Home' },
    { to: '/predictions',  icon: '⚽', label: 'Groups' },
    { to: '/knockout',     icon: '🏆', label: 'Knockout' },
    { to: '/awards',       icon: '🏅', label: 'Awards' },
    { to: '/leagues',      icon: '👥', label: 'Leagues', protected: true },
  ]

  return (
    <nav className="hide-desktop" style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      background: 'var(--bg-card)',
      borderTop: '1px solid var(--border-light)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      padding: '0 4px',
      paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)',
      zIndex: 100,
      boxShadow: '0 -4px 12px rgba(0,0,0,0.06)',
      minHeight: 'calc(56px + env(safe-area-inset-bottom, 0px))',
    }}>
      {navItems.map(({ to, icon, label, protected: prot, highlight }) => {
        const isActive = to === '/'
          ? location.pathname === '/'
          : location.pathname.startsWith(to)
        const href = prot && !user ? '/login' : to

        return (
          <Link key={to} to={href} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            padding: '6px 8px',
            borderRadius: 'var(--radius-md)',
            background: isActive
              ? (highlight ? 'rgba(230,81,0,0.1)' : 'var(--bg-tertiary)')
              : 'transparent',
            minWidth: '52px',
            transition: 'all 0.15s',
          }}>
            <span style={{ fontSize: '18px', lineHeight: 1 }}>{icon}</span>
            <span style={{
              fontSize: '9px',
              fontWeight: isActive ? '700' : '400',
              color: isActive
                ? (highlight ? '#e65100' : 'var(--text-primary)')
                : 'var(--text-muted)',
              letterSpacing: '0.02em',
            }}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
