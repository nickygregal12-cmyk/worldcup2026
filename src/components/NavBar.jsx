import { Link, useLocation } from 'react-router-dom'
import { useAuthStore, useAppStore } from '../store/index.js'

export default function NavBar() {
  const { user, profile, isAdmin, logout } = useAuthStore()
  const { darkMode, toggleDarkMode } = useAppStore()
  const location = useLocation()

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/predictions', label: 'Groups' },
    { to: '/knockout', label: 'Knockout' },
    { to: '/awards', label: 'Awards' },
    { to: '/leaderboard', label: 'Leaderboard' },
    { to: '/leagues', label: 'Leagues' },
  ]

  const isActive = (to) => to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)

  return (
    <>
      {/* Desktop nav only */}
      <nav className="hide-mobile" style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: 'var(--nav-height)',
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-light)',
        zIndex: 100, display: 'flex', alignItems: 'center',
        padding: '0 24px', gap: '8px',
        boxShadow: 'var(--shadow-sm)',
      }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', flexShrink: 0, marginRight: '16px' }}>
          <span style={{ fontSize: '20px' }}>⚽</span>
          <span style={{ fontWeight: '800', fontSize: '16px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            WC26 <span style={{ color: 'var(--accent-green)' }}>Predictor</span>
          </span>
        </Link>

        {/* Nav links */}
        <div style={{ display: 'flex', gap: '2px', flex: 1 }}>
          {navLinks.map(({ to, label }) => (
            <Link key={to} to={to} style={{
              padding: '6px 14px', borderRadius: 'var(--radius-md)',
              fontSize: '14px',
              fontWeight: isActive(to) ? '600' : '400',
              color: isActive(to) ? 'var(--text-primary)' : 'var(--text-muted)',
              background: isActive(to) ? 'var(--bg-tertiary)' : 'transparent',
              transition: 'all 0.15s', textDecoration: 'none',
            }}>
              {label}
            </Link>
          ))}
          {isAdmin && (
            <Link to="/admin" style={{
              padding: '6px 14px', borderRadius: 'var(--radius-md)',
              fontSize: '14px', fontWeight: '400',
              color: 'var(--accent-orange)', textDecoration: 'none',
            }}>Admin</Link>
          )}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Dark mode toggle */}
          <button onClick={toggleDarkMode} style={{
            width: '34px', height: '34px', borderRadius: 'var(--radius-md)',
            background: 'var(--bg-tertiary)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px',
          }}>
            {darkMode ? '☀️' : '🌙'}
          </button>

          {user ? (
            <>
              <Link to="/profile" style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '6px 12px', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-tertiary)', textDecoration: 'none',
                fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)',
              }}>
                <div style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: 'var(--primary)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: '800',
                }}>
                  {(profile?.username || 'U')[0].toUpperCase()}
                </div>
                <span>{profile?.username || 'Profile'}</span>
              </Link>
              <button onClick={logout} className="btn btn-secondary btn-sm">Sign out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary btn-sm">Sign in</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
            </>
          )}
        </div>
      </nav>

      {/* Mobile header — logo + dark mode + profile only, no nav links */}
      <nav className="hide-desktop pwa-nav" style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: 'var(--nav-height)',
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-light)',
        zIndex: 100, display: 'flex', alignItems: 'center',
        padding: '0 16px', justifyContent: 'space-between',
        boxShadow: 'var(--shadow-sm)',
      }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <span style={{ fontSize: '18px' }}>⚽</span>
          <span style={{ fontWeight: '800', fontSize: '15px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            WC26 <span style={{ color: 'var(--accent-green)' }}>Predictor</span>
          </span>
        </Link>

        {/* Right: dark mode + profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={toggleDarkMode} style={{
            width: '32px', height: '32px', borderRadius: 'var(--radius-full)',
            background: 'var(--bg-tertiary)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px',
          }}>
            {darkMode ? '☀️' : '🌙'}
          </button>

          {user ? (
            <Link to="/profile" style={{ textDecoration: 'none' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'var(--primary)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: '800',
              }}>
                {(profile?.username || 'U')[0].toUpperCase()}
              </div>
            </Link>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">Sign in</Link>
          )}
        </div>
      </nav>
    </>
  )
}
