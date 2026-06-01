import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/index.js'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { loadProfile } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await loadProfile(session.user.id)
        navigate('/')
      } else {
        navigate('/login')
      }
    })
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
