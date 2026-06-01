import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/index.js'

const navItems = [
  { to: '/', icon: '🏠', label: 'Home' },
  { to: '/predictions', icon: '⚽', label: 'Predict' },
  { to: '/leaderboard', icon: '🏆', label: 'Standings' },
  { to: '/leagues', icon: '👥', label: 'Leagues' },
  { to: '/profile', icon: '👤', label: 'Profile' },
]

export default function BottomNav() {
  const location = useLocation()
  const { user } = useAuthStore()

  // Hide on desktop
  return (
    <nav className="hide-desktop" style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 'var(--bottom-nav-height)',
      background: 'var(--bg-card)',
      borderTop: '1px solid var(--border-light)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      padding: '0 8px',
      zIndex: 100,
      boxShadow: '0 -4px 12px rgba(0,0,0,0.06)',
    }}>
      {navItems.map(({ to, icon, label }) => {
        const isActive = location.pathname === to
        const isProtected = ['/predictions', '/leagues', '/profile'].includes(to)
        const href = isProtected && !user ? '/login' : to

        return (
          <Link key={to} to={href} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            background: isActive ? 'var(--bg-tertiary)' : 'transparent',
            minWidth: '56px',
            transition: 'all 0.15s',
          }}>
            <span style={{ fontSize: '20px', lineHeight: 1 }}>{icon}</span>
            <span style={{
              fontSize: '10px',
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
