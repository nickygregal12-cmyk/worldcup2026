import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/index.js'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { loadProfile, setUser } = useAuthStore()

  useEffect(() => {
    const handleCallback = async () => {
      // Wait a moment for Supabase to process the hash/token
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (session?.user) {
        setUser(session.user)
        await loadProfile(session.user.id)
        navigate('/', { replace: true })
      } else {
        console.error('Auth callback error:', error)
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
