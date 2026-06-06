import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/index.js'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { loadProfile, setUser } = useAuthStore()

  const markSessionOnlyActive = () => {
    if (typeof window === 'undefined') return
    if (window.localStorage.getItem('wc26-session-only') === 'true') {
      window.sessionStorage.setItem('wc26-session-active', 'true')
    }
  }

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // PKCE: exchange the code in the URL for a session
        const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(
          window.location.href
        )

        if (session?.user) {
          markSessionOnlyActive()
          setUser(session.user)
          await loadProfile(session.user.id)
          navigate('/', { replace: true })
          return
        }

        if (error) {
          console.error('Auth callback error:', error)
        }

        // Fallback: check if session already exists (e.g. implicit flow)
        const { data: { session: existingSession } } = await supabase.auth.getSession()
        if (existingSession?.user) {
          markSessionOnlyActive()
          setUser(existingSession.user)
          await loadProfile(existingSession.user.id)
          navigate('/', { replace: true })
        } else {
          navigate('/login', { replace: true })
        }
      } catch (e) {
        console.error('Auth callback exception:', e)
        navigate('/login', { replace: true })
      }
    }

    handleCallback()
  }, [])

  return (
    <div className="loading-screen">
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Signing you in...</p>
      </div>
    </div>
  )
}
