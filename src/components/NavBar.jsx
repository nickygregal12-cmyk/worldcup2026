import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuthStore, useAppStore } from '../store/index.js'

export default function NavBar() {
  const { user, profile, isAdmin, isLeagueAdmin, logout } = useAuthStore()
  const { darkMode, toggleDarkMode } = useAppStore()
  const location = useLocation()
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/predictions', label: 'Groups' },
    { to: '/knockout', label: 'Knockout' },
    { to: '/ko-predictor', label: 'KO Predictor' },
    { to: '/stats', label: 'Pulse' },
    { to: '/awards', label: 'Awards' },
    { to: '/leaderboard', label: 'Leaderboard' },
    { to: '/leagues', label: 'Leagues' },
  ]

  const isActive = (to) => to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)

  return (
    <>
      <style>{`
        .desktop-main-nav {
          padding-left: 24px;
          padding-right: 24px;
          gap: 8px;
          overflow: hidden;
        }

        .desktop-main-nav__logo {
          margin-right: 16px;
        }

        .desktop-main-nav__links {
          display: flex;
          gap: 2px;
          flex: 1;
          min-width: 0;
          align-items: center;
          overflow: hidden;
        }

        .desktop-main-nav__link {
          padding: 6px 14px;
          font-size: 14px;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .desktop-main-nav__right {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .desktop-main-nav__profile-name,
        .desktop-main-nav__mode-label,
        .desktop-main-nav__signout-label {
          display: inline;
        }

        @media (max-width: 1420px) {
          .desktop-main-nav {
            padding-left: 16px;
            padding-right: 16px;
            gap: 5px;
          }

          .desktop-main-nav__logo {
            margin-right: 8px;
          }

          .desktop-main-nav__link {
            padding: 6px 10px;
            font-size: 13px;
          }

          .desktop-main-nav__right {
            gap: 6px;
          }
        }

        @media (max-width: 1260px) {
          .desktop-main-nav {
            padding-left: 12px;
            padding-right: 12px;
          }

          .desktop-main-nav__link {
            padding: 6px 8px;
            font-size: 12.5px;
          }

          .desktop-main-nav__profile-name,
          .desktop-main-nav__mode-label {
            display: none;
          }

          .desktop-main-nav__profile {
            padding-left: 7px !important;
            padding-right: 7px !important;
          }

          .desktop-main-nav__mode {
            min-width: 36px !important;
            width: 36px;
            padding: 0 !important;
          }
        }

        @media (max-width: 1120px) {
          .desktop-main-nav__logo-word {
            display: none;
          }

          .desktop-main-nav__logo {
            margin-right: 4px;
          }

          .desktop-main-nav__link {
            padding-left: 7px;
            padding-right: 7px;
            font-size: 12px;
          }

          .desktop-main-nav__signout-label {
            display: none;
          }

          .desktop-main-nav__signout {
            width: 34px;
            min-width: 34px;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
        }
      `}</style>

      {/* Desktop nav only */}
      <nav className="hide-mobile desktop-main-nav" style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: 'var(--nav-height)',
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-light)',
        zIndex: 100, display: 'flex', alignItems: 'center',
        boxShadow: 'var(--shadow-sm)',
      }}>
        {/* Logo */}
        <Link to="/" className="desktop-main-nav__logo" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', flexShrink: 0 }}>
          <span style={{ fontSize: '20px' }}>🏴󠁧󠁢󠁳󠁣󠁴󠁿</span>
          <span style={{ fontWeight: '800', fontSize: '16px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            WC26 <span className="desktop-main-nav__logo-word" style={{ color: 'var(--scottish-navy)' }}>Predictor</span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="desktop-main-nav__links">
          {navLinks.map(({ to, label }) => (
            <Link key={to} to={to} className="desktop-main-nav__link" style={{
              borderRadius: 'var(--radius-md)',
              fontWeight: isActive(to) ? '600' : '400',
              color: isActive(to) ? 'var(--text-primary)' : 'var(--text-muted)',
              background: isActive(to) ? 'var(--bg-tertiary)' : 'transparent',
              transition: 'all 0.15s', textDecoration: 'none',
            }}>
              {label}
            </Link>
          ))}
          {(isAdmin || isLeagueAdmin) && (
            <Link to="/admin" className="desktop-main-nav__link" style={{
              borderRadius: 'var(--radius-md)',
              fontWeight: '400',
              color: 'var(--accent-orange)', textDecoration: 'none',
            }}>Admin</Link>
          )}
        </div>

        {/* Right side */}
        <div className="desktop-main-nav__right">
          {/* Dark mode toggle */}
          <button
            className="desktop-main-nav__mode"
            onClick={toggleDarkMode}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              minWidth: '76px', height: '34px', borderRadius: 'var(--radius-md)',
              background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', padding: '0 10px',
            }}
          >
            <span>{darkMode ? '☀️' : '🌙'}</span>
            <span className="desktop-main-nav__mode-label">{darkMode ? 'Light' : 'Dark'}</span>
          </button>

          {user ? (
            <>
              <Link to="/profile" className="desktop-main-nav__profile" style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '6px 12px', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-tertiary)', textDecoration: 'none',
                fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)',
              }}>
                <div style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: 'var(--accent-green)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: '800',
                }}>
                  {(profile?.username || 'U')[0].toUpperCase()}
                </div>
                <span className="desktop-main-nav__profile-name">{profile?.username || 'Profile'}</span>
              </Link>
              <button
                onClick={() => setShowSignOutConfirm(true)}
                className="btn btn-secondary btn-sm desktop-main-nav__signout"
                title="Sign out"
                aria-label="Sign out"
              >
                <span aria-hidden="true">↪</span>
                <span className="desktop-main-nav__signout-label"> Sign out</span>
              </button>
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
          <span style={{ fontSize: '18px' }}>🏴󠁧󠁢󠁳󠁣󠁴󠁿</span>
          <span style={{ fontWeight: '800', fontSize: '15px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            WC26 <span style={{ color: 'var(--scottish-navy)' }}>Predictor</span>
          </span>
        </Link>

        {/* Right: dark mode + profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={toggleDarkMode}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              width: '36px', height: '32px', borderRadius: 'var(--radius-full)',
              background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px',
            }}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>

          {user ? (
            <Link to="/profile" style={{ textDecoration: 'none' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'var(--accent-green)', color: 'white',
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

      {showSignOutConfirm && (
        <div
          onClick={() => setShowSignOutConfirm(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(8,18,38,0.58)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="signout-confirm-title"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '430px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-light)',
              borderRadius: '24px',
              boxShadow: '0 24px 70px rgba(8,18,38,0.28)',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '14px',
                  background: 'rgba(198,40,40,0.10)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  flexShrink: 0,
                }}
              >
                ↪
              </div>

              <div style={{ flex: 1 }}>
                <h2
                  id="signout-confirm-title"
                  style={{
                    margin: 0,
                    fontSize: '21px',
                    lineHeight: 1.2,
                    color: 'var(--text-primary)',
                  }}
                >
                  Sign out?
                </h2>
                <p
                  style={{
                    margin: '8px 0 0',
                    color: 'var(--text-muted)',
                    fontSize: '14px',
                    lineHeight: 1.5,
                  }}
                >
                  You’ll need to sign back in to view and update your predictions.
                </p>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                marginTop: '22px',
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowSignOutConfirm(false)}
                style={{ minHeight: '46px', fontWeight: '800' }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowSignOutConfirm(false)
                  logout()
                }}
                style={{
                  minHeight: '46px',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-red, #c62828)',
                  color: 'white',
                  fontWeight: '900',
                  cursor: 'pointer',
                }}
              >
                Yes, sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
