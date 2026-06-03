import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/index.js'

const navItems = [
  {
    to: '/',
    label: 'Home',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    to: '/predictions',
    label: 'Groups',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    to: '/knockout',
    label: 'Knockout',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6h4v4H4z"/>
        <path d="M4 14h4v4H4z"/>
        <path d="M16 9h4v4h-4z"/>
        <path d="M8 8h4"/>
        <path d="M8 16h4"/>
        <path d="M12 8v8"/>
        <path d="M16 11h-4"/>
      </svg>
    ),
  },
  {
    to: '/awards',
    label: 'Awards',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="6"/>
        <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
      </svg>
    ),
  },
  {
    to: '/leagues',
    label: 'Leagues',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87"/>
        <path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
  },
]

export default function BottomNav() {
  const location = useLocation()
  const { user } = useAuthStore()

  return (
    <nav className="hide-desktop" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      height: 'var(--bottom-nav-height)',
      background: 'var(--bg-card)',
      borderTop: '1px solid var(--border-light)',
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-around',
      padding: '0 4px env(safe-area-inset-bottom)',
      zIndex: 100,
      boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
    }}>
      {navItems.map(({ to, icon, label }) => {
        const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
        const href = ['/leagues'].includes(to) && !user ? '/login' : to

        return (
          <Link key={to} to={href} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
            padding: '6px 12px', borderRadius: 'var(--radius-md)',
            minWidth: '52px', transition: 'all 0.15s', textDecoration: 'none',
            color: isActive ? 'var(--primary)' : 'var(--text-muted)',
          }}>
            {icon(isActive)}
            <span style={{
              fontSize: '9px', fontWeight: isActive ? '700' : '500',
              letterSpacing: '0.02em', textTransform: 'uppercase',
            }}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
