import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, signInWithEmail, signInWithGoogle } from '../lib/supabase.js'
import { useAuthStore } from '../store/index.js'

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18">
    <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
    <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.04a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
    <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
    <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
  </svg>
)

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const claimToken = searchParams.get('claim')
  const joinCode = searchParams.get('join')
  const { loadProfile } = useAuthStore()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { data, error } = await signInWithEmail(email, password)
    if (error) {
      setError(error.message)
    } else {
      await loadProfile(data.user.id)
      if (joinCode) {
        const { data: league } = await supabase.from('leagues').select('id').eq('invite_code', joinCode.toUpperCase()).single()
        if (league) await supabase.from('league_members').insert({ league_id: league.id, user_id: data.user.id }).catch(() => {})
      }
      navigate(claimToken ? `/claim/${claimToken}` : joinCode ? `/league/${joinCode}` : '/')
    }
    setLoading(false)
  }

  const handleGoogle = async () => {
    setError('')
    const { error } = await signInWithGoogle()
    if (error) setError(error.message)
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setForgotLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setForgotLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setForgotSent(true)
    }
  }

  // Forgot password view
  if (showForgot) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', background: 'linear-gradient(135deg, rgba(0,30,80,0.88) 0%, rgba(0,60,140,0.85) 100%), url(/hero-bg.jpg) center/cover no-repeat' }}>
        <div style={{ width: '100%', maxWidth: '400px' }} className="fade-in">
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔑</div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.03em' }}>Reset password</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '6px', fontSize: '15px' }}>
              We'll send you a link to reset your password
            </p>
          </div>

          <div className="card" style={{ padding: '28px' }}>
            {forgotSent ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📬</div>
                <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '8px' }}>Check your inbox</div>
                <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                  We sent a password reset link to <strong>{forgotEmail}</strong>
                </div>
                <div style={{ padding: '12px', background: 'var(--accent-gold-light)', borderRadius: 'var(--radius-md)', fontSize: '13px', color: 'var(--accent-gold)', fontWeight: '600', marginBottom: '20px' }}>
                  ⚠️ Check your spam folder if it doesn't arrive within a minute
                </div>
                <button onClick={() => setShowForgot(false)} className="btn btn-primary btn-full">
                  ← Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword}>
                <div className="form-group">
                  <label className="label">Email address</label>
                  <input className="input" type="email" placeholder="you@example.com" value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)} required autoFocus />
                </div>
                {error && (
                  <div style={{ padding: '10px 14px', background: 'var(--accent-red-light)', color: 'var(--accent-red)', borderRadius: 'var(--radius-md)', fontSize: '13px', marginBottom: '16px' }}>
                    {error}
                  </div>
                )}
                <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={forgotLoading}>
                  {forgotLoading ? <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} /> : 'Send reset link'}
                </button>
                <button type="button" onClick={() => setShowForgot(false)} className="btn btn-secondary btn-full" style={{ marginTop: '10px' }}>
                  ← Back to sign in
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', background: 'linear-gradient(135deg, rgba(0,30,80,0.88) 0%, rgba(0,60,140,0.85) 100%), url(/hero-bg.jpg) center/cover no-repeat' }}>
      <div style={{ width: '100%', maxWidth: '400px' }} className="fade-in">
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>⚽</div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.03em' }}>Welcome back</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '6px', fontSize: '15px' }}>Sign in to edit your predictions, check leagues and follow your points.</p>
        </div>

        <div className="card" style={{ padding: '28px' }}>
          <button onClick={handleGoogle} className="btn btn-secondary btn-full" style={{ marginBottom: '20px', padding: '12px', fontSize: '15px', gap: '10px' }}>
            <GoogleIcon /> Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-light)' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-light)' }} />
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="you@example.com" value={email}
                onChange={e => setEmail(e.target.value)} required autoFocus />
            </div>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="label" style={{ margin: 0 }}>Password</label>
                <button type="button" onClick={() => { setShowForgot(true); setForgotEmail(email); setError('') }}
                  style={{ fontSize: '13px', color: 'var(--accent-blue)', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  Forgot password?
                </button>
              </div>
              <input className="input" type="password" placeholder="••••••••" value={password}
                onChange={e => setPassword(e.target.value)} required />
            </div>

            {error && (
              <div style={{ padding: '10px 14px', background: 'var(--accent-red-light)', color: 'var(--accent-red)', borderRadius: 'var(--radius-md)', fontSize: '13px', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} /> : 'Sign in'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: 'var(--text-muted)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--text-primary)', fontWeight: '600' }}>Register free</Link>
        </p>
      </div>
    </div>
  )
}
