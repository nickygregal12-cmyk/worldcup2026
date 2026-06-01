import { Link, useLocation } from 'react-router-dom'
import { useAuthStore, useAppStore } from '../store/index.js'

export default function NavBar() {
  const { user, profile, isAdmin, logout } = useAuthStore()
  const { darkMode, toggleDarkMode } = useAppStore()
  const location = useLocation()

  return (
    <nav style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      height: 'var(--nav-height)',
      background: 'var(--bg-card)',
      borderBottom: '1px solid var(--border-light)',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      gap: '16px',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '22px' }}>⚽</span>
        <span style={{ fontWeight: '800', fontSize: '16px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          WC26 <span style={{ color: 'var(--accent-green)' }}>Predictor</span>
        </span>
      </Link>

      <div style={{ display: 'flex', gap: '4px', marginLeft: '16px', flex: 1 }} className="hide-mobile">
        {[
          { to: '/', label: 'Home' },
          { to: '/predictions', label: 'Groups' },
          { to: '/knockout', label: 'Knockout' },
          { to: '/awards', label: '🏅 Awards' },
          { to: '/leaderboard', label: 'Leaderboard' },
          { to: '/leagues', label: 'Leagues' },
        ].map(({ to, label }) => (
          <Link key={to} to={to} style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '14px',
            fontWeight: location.pathname === to ? '600' : '400',
            color: location.pathname === to ? 'var(--text-primary)' : 'var(--text-muted)',
            background: location.pathname === to ? 'var(--bg-tertiary)' : 'transparent',
            transition: 'all 0.15s',
          }}>
            {label}
          </Link>
        ))}
        {isAdmin && (
          <Link to="/admin" style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '14px',
            fontWeight: location.pathname === '/admin' ? '600' : '400',
            color: 'var(--accent-orange)',
            background: location.pathname === '/admin' ? 'var(--accent-gold-light)' : 'transparent',
          }}>Admin</Link>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
        <button onClick={toggleDarkMode} style={{
          width: '36px', height: '36px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-tertiary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '16px', border: 'none', cursor: 'pointer',
        }}>
          {darkMode ? '☀️' : '🌙'}
        </button>

        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link to="/profile" style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-tertiary)',
              fontSize: '14px', fontWeight: '500',
              color: 'var(--text-primary)',
            }}>
              <span>👤</span>
              <span className="hide-mobile">{profile?.username || 'Profile'}</span>
            </Link>
            <button onClick={logout} className="btn btn-secondary btn-sm hide-mobile">Sign out</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link to="/login" className="btn btn-secondary btn-sm">Sign in</Link>
            <Link to="/register" className="btn btn-primary btn-sm hide-mobile">Register</Link>
          </div>
        )}
      </div>
    </nav>
  )
}
