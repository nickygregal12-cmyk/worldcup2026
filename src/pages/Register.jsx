import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, signUpWithEmail, signInWithGoogle } from '../lib/supabase.js'
import { validateDisplayName } from '../lib/validateDisplayName.js'
import { DATES } from '../lib/tournamentDates.js'
import WorldCupLogo from '../components/WorldCupLogo.jsx'

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18">
    <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
    <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.04a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
    <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
    <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
  </svg>
)

export default function Register() {
  const [step, setStep] = useState(1) // 1 = name+pass, 2 = email
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const claimToken = searchParams.get('claim')
  const joinCode = searchParams.get('join')

  const handleStep1 = (e) => {
    e.preventDefault()
    setError('')
    if (username.trim().length < 3) { setError('Display name must be at least 3 characters'); return }
    const check = validateDisplayName(username)
    if (!check.ok) { setError(check.reason); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setStep(2)
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    if (!email.includes('@')) { setError('Please enter a valid email'); return }
    setLoading(true)
    const { data, error } = await signUpWithEmail(email, password, username)
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // Signed in immediately — navigate to predictions
      // Auto-join league if came from league invite link
      if (joinCode) {
        const { data: league } = await supabase.from('leagues').select('id').eq('invite_code', joinCode.toUpperCase()).single()
        if (league && data?.user?.id) await supabase.from('league_members').insert({ league_id: league.id, user_id: data.user.id }).catch(() => {})
      }
      navigate(claimToken ? `/claim/${claimToken}` : joinCode ? `/league/${joinCode}` : '/predictions')
    }
  }

  const handleGoogle = async () => {
    const { error } = await signInWithGoogle()
    if (error) setError(error.message)
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'linear-gradient(135deg, rgba(0,30,80,0.88) 0%, rgba(0,60,140,0.85) 100%), url(/hero-bg.jpg) center/cover no-repeat' }}>
        <div style={{ textAlign: 'center', maxWidth: '380px' }} className="fade-in">
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>You're in!</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginBottom: '28px' }}>
            Welcome to WC26 Predictor, <strong>{username}</strong>! {new Date() < DATES.TOURNAMENT_START ? 'The tournament starts 11 Jun — get your predictions in!' : 'The tournament is underway — get your predictions in!'}
          </p>

          <button onClick={() => navigate('/predictions')} className="btn btn-primary btn-full btn-lg">
            ⚽ Start predicting
          </button>

          <p style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
            <Link to="/how-to-play" style={{ color: 'var(--accent-blue)', fontWeight: '600' }}>How does it work?</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', background: 'linear-gradient(135deg, rgba(0,30,80,0.88) 0%, rgba(0,60,140,0.85) 100%), url(/hero-bg.jpg) center/cover no-repeat' }}>
      <div style={{ width: '100%', maxWidth: '400px' }} className="fade-in">
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <WorldCupLogo variant="hero" size={104} />
          <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.03em', color: 'white' }}>Join WC26 Predictor</h1>
          <p style={{ color: 'rgba(255,255,255,0.86)', marginTop: '6px', fontSize: '15px' }}>
            Predict all 104 matches, build your bracket and compete with friends.
          </p>
          <div style={{ display: 'grid', gap: '6px', marginTop: '14px', textAlign: 'left' }}>
            {[
              '⚽ Predict group scores',
              '🏆 Build your knockout bracket',
              '🏅 Pick awards and total goals',
              '👥 Join mini leagues with friends',
            ].map(item => (
              <div key={item} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.86)', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 'var(--radius-full)', padding: '7px 12px' }}>
                {item}
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.52)', margin: '-14px 0 18px' }}>Unofficial fan predictor · not affiliated with or endorsed by FIFA</div>

        {/* Step indicator */}
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.9)', fontSize: '12px', fontWeight: '700', marginBottom: '8px' }}>Step {step} of 2 · {step === 1 ? 'Create your profile' : 'Add your email'}</div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', justifyContent: 'center' }}>
          {[1, 2].map(s => (
            <div key={s} style={{
              width: '32px', height: '4px', borderRadius: '2px',
              background: s <= step ? 'var(--primary)' : 'var(--border-medium)',
              transition: 'background 0.2s',
            }} />
          ))}
        </div>

        <div className="card" style={{ padding: '28px' }}>
          {step === 1 ? (
            <>
              <button onClick={handleGoogle} className="btn btn-secondary btn-full" style={{ marginBottom: '20px', padding: '12px', fontSize: '15px', gap: '10px' }}>
                <GoogleIcon /> Sign up with Google
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-light)' }} />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>or</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-light)' }} />
              </div>

              <form onSubmit={handleStep1}>
                <div className="form-group">
                  <label className="label">Display name</label>
                  <input className="input" type="text" placeholder="e.g. Jimmy Anderson"
                    value={username} onChange={e => setUsername(e.target.value)}
                    required autoFocus maxLength={30} />
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    This is how you'll appear on the leaderboard — spaces and capitals allowed
                  </div>
                </div>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="label" htmlFor="register-password">Password</label>
                    <button type="button" className="password-toggle" onClick={() => setShowPassword(v => !v)} aria-pressed={showPassword}>{showPassword ? 'Hide' : 'Show'}</button>
                  </div>
                  <input id="register-password" className="input" type={showPassword ? 'text' : 'password'} placeholder="At least 6 characters"
                    value={password} onChange={e => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
                  <div className="password-requirement" data-met={password.length >= 6}>✓ At least 6 characters</div>
                </div>

                {error && (
                  <div style={{ padding: '10px 14px', background: 'var(--accent-red-light)', color: 'var(--accent-red)', borderRadius: 'var(--radius-md)', fontSize: '13px', marginBottom: '16px' }}>
                    {error}
                  </div>
                )}

                <button type="submit" className="btn btn-primary btn-full btn-lg">
                  Continue →
                </button>
              </form>
            </>
          ) : (
            <form onSubmit={handleRegister}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', padding: '12px', background: 'var(--accent-green-light)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '800', flexShrink: 0 }}>
                  {username[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '14px' }}>{username}</div>
                  <button type="button" onClick={() => { setStep(1); setError('') }} style={{ fontSize: '12px', color: 'var(--accent-blue)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    Change name
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="label">Email address</label>
                <input className="input" type="email" placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Used to sign in and recover your account
                </div>
              </div>

              {error && (
                <div style={{ padding: '10px 14px', background: 'var(--accent-red-light)', color: 'var(--accent-red)', borderRadius: 'var(--radius-md)', fontSize: '13px', marginBottom: '16px' }}>
                  {error}
                </div>
              )}

              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                {loading
                  ? <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                  : '🏆 Create account'}
              </button>

              <button type="button" onClick={() => { setStep(1); setError('') }} className="btn btn-secondary btn-full" style={{ marginTop: '10px' }}>
                ← Back
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: 'rgba(255,255,255,0.82)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'white', fontWeight: '700' }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
