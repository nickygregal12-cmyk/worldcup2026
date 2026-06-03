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

  const navItems = koLive ? [
    { to: '/',            icon: '🏠',  label: 'Home' },
    { to: '/predictions', icon: '⚽',  label: 'Tournament' },
    { to: '/ko-predictor',icon: '🔥',  label: 'KO Pred', highlight: true },
    { to: '/awards',      icon: '🏅',  label: 'Awards' },
    { to: '/leagues',     icon: '👥',  label: 'Leagues', protected: true },
  ] : [
    { to: '/',            icon: '🏠',  label: 'Home' },
    { to: '/predictions', icon: '⚽',  label: 'Groups' },
    { to: '/knockout',    icon: '🏆',  label: 'Knockout' },
    { to: '/awards',      icon: '🏅',  label: 'Awards' },
    { to: '/leagues',     icon: '👥',  label: 'Leagues', protected: true },
  ]

  return (
    <nav className="hide-desktop" style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      height: 'var(--bottom-nav-height)',
      background: 'var(--bg-card)',
      borderTop: '1px solid var(--border-light)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      padding: '0 4px',
      zIndex: 100,
      boxShadow: '0 -4px 12px rgba(0,0,0,0.06)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {navItems.map(({ to, icon, label, protect
cd ~/Desktop/worldcup26
git add src/components/BottomNav.jsx
git commit -m "Fix BottomNav - wire appSettings for game phase control"
git push
