import { useEffect, useState, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore, useAppStore } from './store/index.js'
import { supabase } from './lib/supabase.js'

import NavBar from './components/NavBar.jsx'
import BottomNav from './components/BottomNav.jsx'
import PushNotifications from './components/PushNotifications.jsx'
import PWAInstall from './components/PWAInstall.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import RouteMeta from './components/RouteMeta.jsx'

const Home = lazy(() => import('./pages/Home.jsx'))
const Login = lazy(() => import('./pages/Login.jsx'))
const ClaimAccount = lazy(() => import('./pages/ClaimAccount.jsx'))
const Register = lazy(() => import('./pages/Register.jsx'))
const Predictions = lazy(() => import('./pages/Predictions.jsx'))
const PointsSummary = lazy(() => import('./pages/PointsSummary.jsx'))
const HeadToHead = lazy(() => import('./pages/HeadToHead.jsx'))
const Knockout = lazy(() => import('./pages/Knockout.jsx'))
const Awards = lazy(() => import('./pages/Awards.jsx'))
const Leagues = lazy(() => import('./pages/Leagues.jsx'))
const Leaderboard = lazy(() => import('./pages/Leaderboard.jsx'))
const Profile = lazy(() => import('./pages/Profile.jsx'))
const AdminPanel = lazy(() => import('./pages/AdminPanel.jsx'))
const AuthCallback = lazy(() => import('./pages/AuthCallback.jsx'))
const HowToPlay = lazy(() => import('./pages/HowToPlay.jsx'))
const KOPredictor = lazy(() => import('./pages/KOPredictor.jsx'))
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'))
const PublicLeague = lazy(() => import('./pages/PublicLeague.jsx'))
const GlobalStats = lazy(() => import('./pages/GlobalStats.jsx'))
const MatchStats = lazy(() => import('./pages/MatchStats.jsx'))
const NotFound = lazy(() => import('./pages/NotFound.jsx'))

function PageLoader() {
  return (
    <div className="loading-screen" role="status" aria-live="polite" aria-label="Loading page">
      <div className="spinner" aria-hidden="true" />
      <span className="sr-only">Loading page…</span>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user, isLoading, initialized, authStatus } = useAuthStore()
  const location = useLocation()

  if (isLoading || !initialized || authStatus === 'checking') return <PageLoader />
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return children
}

function AdminRoute({ children }) {
  const { user, isAdmin, isLeagueAdmin, isLoading, initialized, authStatus } = useAuthStore()

  if (isLoading || !initialized || authStatus === 'checking') return <PageLoader />
  if (!user || (!isAdmin && !isLeagueAdmin)) {
    return <Navigate to="/" replace />
  }
  return children
}

export default function App() {
  const { initialize, isLoading, initialized, authStatus, profile, user } = useAuthStore()
  const { darkMode, loadAppSettings } = useAppStore()
  const [showAdminMsg, setShowAdminMsg] = useState(true)
  const location = useLocation()
  const isAuthPage = ['/login', '/register', '/reset-password', '/auth/callback', '/claim'].some(
    route => location.pathname === route || location.pathname.startsWith(`${route}/`)
  )

  useEffect(() => {
    const persistApi = useAuthStore.persist
    let unsubscribe

    const beginInitialization = () => {
      initialize().catch(error => {
        console.error('Auth initialization failed:', error)
      })
    }

    if (!persistApi?.hasHydrated || persistApi.hasHydrated()) {
      beginInitialization()
    } else {
      unsubscribe = persistApi.onFinishHydration(beginInitialization)
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe()
    }
  }, [initialize])
  useEffect(() => { loadAppSettings() }, [loadAppSettings])

  // Settings change rarely. Refresh only every five minutes and only while visible.
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') loadAppSettings()
    }, 300000)
    return () => clearInterval(interval)
  }, [loadAppSettings])

  // The store has already restored and verified the session. This effect only
  // updates presence; a second refresh here caused competing auth events.
  useEffect(() => {
    if (!user) return

    const storageKey = `wc26-last-seen-${user.id}`
    const lastUpdate = Number(localStorage.getItem(storageKey) || 0)
    const now = Date.now()
    if (now - lastUpdate < 60 * 60 * 1000) return

    localStorage.setItem(storageKey, String(now))
    supabase.from('profiles')
      .update({ last_seen_at: new Date(now).toISOString() })
      .eq('id', user.id)
      .then(({ error }) => {
        if (error) localStorage.removeItem(storageKey)
      })
  }, [user?.id])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', Boolean(darkMode))
  }, [darkMode])

  if (isLoading || !initialized || authStatus === 'checking') return <PageLoader />

  return (
    <ErrorBoundary>
      <div className="app-container">
        <RouteMeta />
        {profile?.admin_message && !profile?.admin_message_read && showAdminMsg && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999,
            background: '#e65100', color: 'white',
            padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontSize: '13px', fontWeight: '600',
          }}>
            <span>⚠️ Admin update: {profile.admin_message}</span>
            <button
              aria-label="Dismiss admin update"
              onClick={async () => {
                setShowAdminMsg(false)
                await supabase.from('profiles').update({ admin_message_read: true }).eq('id', profile.id)
              }}
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '18px', marginLeft: '12px' }}
            >×</button>
          </div>
        )}
        <NavBar />
        <main className={`main-content${isAuthPage ? ' auth-page' : ''}`}>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/claim/:token" element={<ClaimAccount />} />
              <Route path="/league/:code" element={<PublicLeague />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/predictions" element={<Predictions />} />
              <Route path="/points" element={<ProtectedRoute><PointsSummary /></ProtectedRoute>} />
              <Route path="/points/:userId" element={<PointsSummary />} />
              <Route path="/h2h/:userId" element={<ProtectedRoute><HeadToHead /></ProtectedRoute>} />
              <Route path="/knockout" element={<Knockout />} />
              <Route path="/awards" element={<Awards />} />
              <Route path="/leagues" element={<ProtectedRoute><Leagues /></ProtectedRoute>} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
              <Route path="/how-to-play" element={<HowToPlay />} />
              <Route path="/stats" element={<GlobalStats />} />
              <Route path="/match/:matchId/stats" element={<MatchStats />} />
              <Route path="/ko-predictor" element={<KOPredictor />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
        <BottomNav />
        <PushNotifications />
        <PWAInstall />
      </div>
    </ErrorBoundary>
  )
}
