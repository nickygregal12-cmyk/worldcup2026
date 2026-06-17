import { useEffect, useState, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore, useAppStore } from './store/index.js'
import { supabase } from './lib/supabase.js'

import NavBar from './components/NavBar.jsx'
import BottomNav from './components/BottomNav.jsx'
import PushNotifications from './components/PushNotifications.jsx'
import PWAInstall from './components/PWAInstall.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import ClaimAccount from './pages/ClaimAccount.jsx'
import Register from './pages/Register.jsx'
import Predictions from './pages/Predictions.jsx'
import Knockout from './pages/Knockout.jsx'
import Awards from './pages/Awards.jsx'
import Leagues from './pages/Leagues.jsx'
import Leaderboard from './pages/Leaderboard.jsx'
import Profile from './pages/Profile.jsx'
const AdminPanel = lazy(() => import('./pages/AdminPanel.jsx'))
import AuthCallback from './pages/AuthCallback.jsx'
import HowToPlay from './pages/HowToPlay.jsx'
import KOPredictor from './pages/KOPredictor.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import PublicLeague from './pages/PublicLeague.jsx'
import GlobalStats from './pages/GlobalStats.jsx'
import MatchStats from './pages/MatchStats.jsx'

function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuthStore()
  if (isLoading) return <div className="loading-screen"><div className="spinner" /></div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AdminRoute({ children }) {
  const { user, isAdmin, isLoading } = useAuthStore()
  if (isLoading) return <div className="loading-screen"><div className="spinner" /></div>
  if (!user || !isAdmin) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { initialize, isLoading, profile, user } = useAuthStore()
  const { darkMode, loadAppSettings } = useAppStore()
  const [showAdminMsg, setShowAdminMsg] = useState(true)

  useEffect(() => { initialize() }, [])
  useEffect(() => { loadAppSettings() }, [])
  // Refresh settings every 30 seconds so phase changes propagate
  useEffect(() => {
    const interval = setInterval(() => loadAppSettings(), 30000)
    return () => clearInterval(interval)
  }, [])

  // Update last_seen_at and refresh session on every app open
  useEffect(() => {
    if (!user) return
    supabase.auth.refreshSession()
    supabase.from('profiles')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', user.id)
      .then(() => {})
  }, [user?.id])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  if (isLoading) {
    return <div className="loading-screen"><div className="spinner" /></div>
  }

  return (
    <ErrorBoundary>
    <div className="app-container">
      {/* Admin message banner */}
      {profile?.admin_message && !profile?.admin_message_read && showAdminMsg && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999,
          background: '#e65100', color: 'white',
          padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: '13px', fontWeight: '600',
        }}>
          <span>⚠️ Admin update: {profile.admin_message}</span>
          <button onClick={async () => {
            setShowAdminMsg(false)
            await supabase.from('profiles').update({ admin_message_read: true }).eq('id', profile.id)
          }} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '18px', marginLeft: '12px' }}>×</button>
        </div>
      )}
      <NavBar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/claim/:token" element={<ClaimAccount />} />
          <Route path="/league/:code" element={<PublicLeague />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/predictions" element={<Predictions />} />
          <Route path="/knockout" element={<Knockout />} />
          <Route path="/awards" element={<Awards />} />
          <Route path="/leagues" element={<ProtectedRoute><Leagues /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><Suspense fallback={<div className="loading-screen"><div className="spinner" /></div>}><AdminPanel /></Suspense></AdminRoute>} />
          <Route path="/how-to-play" element={<HowToPlay />} />
          <Route path="/stats" element={<GlobalStats />} />
          <Route path="/match/:matchId/stats" element={<MatchStats />} />
          <Route path="/ko-predictor" element={<KOPredictor />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
      <PushNotifications />
      <PWAInstall />
    </div>
    </ErrorBoundary>
  )
}
