import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/index.js'

const navItems = [
  { to: '/', icon: '🏠', label: 'Home' },
  { to: '/predictions', icon: '⚽', label: 'Groups' },
  { to: '/knockout', icon: '🏆', label: 'Knockout' },
  { to: '/awards', icon: '🏅', label: 'Awards' },
  { to: '/leagues', icon: '👥', label: 'Leagues' },
]

export default function BottomNav() {
  const location = useLocation()
  const { user } = useAuthStore()

  return (
    <nav className="hide-desktop" style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      height: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px))',
      background: 'var(--bg-card)',
      borderTop: '1px solid var(--border-light)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-around',
      padding: '0 4px',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      zIndex: 100,
      boxShadow: '0 -4px 12px rgba(0,0,0,0.06)',
    }}>
      {navItems.map(({ to, icon, label }) => {
        const isActive = location.pathname === to
        const isProtected = ['/leagues'].includes(to)
        const href = isProtected && !user ? '/login' : to

        return (
          <Link key={to} to={href} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            padding: '6px 8px',
            borderRadius: 'var(--radius-md)',
            background: isActive ? 'var(--bg-tertiary)' : 'transparent',
            minWidth: '52px',
            transition: 'all 0.15s',
          }}>
            <span style={{ fontSize: '18px', lineHeight: 1 }}>{icon}</span>
            <span style={{
              fontSize: '9px',
              fontWeight: isActive ? '700' : '400',
              color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
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
