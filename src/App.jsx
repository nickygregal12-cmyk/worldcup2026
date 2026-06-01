import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore, useAppStore } from './store/index.js'

// Layout
import NavBar from './components/NavBar.jsx'
import BottomNav from './components/BottomNav.jsx'
import PWAInstall from './components/PWAInstall.jsx'

// Pages
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Predictions from './pages/Predictions.jsx'
import Leagues from './pages/Leagues.jsx'
import Leaderboard from './pages/Leaderboard.jsx'
import Profile from './pages/Profile.jsx'
import AdminPanel from './pages/AdminPanel.jsx'
import AuthCallback from './pages/AuthCallback.jsx'

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
  const { initialize, isLoading } = useAuthStore()
  const { darkMode } = useAppStore()

  useEffect(() => {
    initialize()
  }, [])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="app-container">
      <NavBar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/predictions" element={<Predictions />} />
          <Route path="/leagues" element={<ProtectedRoute><Leagues /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
      <PWAInstall />
    </div>
  )
}
