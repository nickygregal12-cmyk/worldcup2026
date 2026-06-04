import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/index.js'

export default function ClaimAccount() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [status, setStatus] = useState('loading') // loading | valid | invalid | expired | claiming | success | error
  const [offlinePlayer, setOfflinePlayer] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => { validateToken() }, [token])
  // Don't auto-claim — always require explicit button press
  // useEffect removed to prevent accidental claims by wrong account

  const validateToken = async () => {
    const { data, error } = await supabase
      .from('offline_players')
      .select('id, display_name, league_id, claim_token_expires, leagues:league_id(name)')
      .eq('claim_token', token)
      .maybeSingle()

    if (error || !data) { setStatus('invalid'); return }
    if (new Date(data.claim_token_expires) < new Date()) { setStatus('expired'); return }
    setOfflinePlayer(data)
    setStatus('valid')
  }

  const claimPredictions = async () => {
    if (!user || !offlinePlayer) return
    setStatus('claiming')
    try {
      // Transfer offline predictions to real user
      const { data: preds } = await supabase
        .from('offline_predictions')
        .select('match_id, home_score, away_score, is_confident')
        .eq('offline_player_id', offlinePlayer.id)

      if (preds && preds.length > 0) {
        const toInsert = preds.map(p => ({
          user_id: user.id,
          match_id: p.match_id,
          home_score: p.home_score,
          away_score: p.away_score,
          is_confident: p.is_confident || false,
          bracket_type: 'main',
        }))
        await supabase.from('predictions')
          .upsert(toInsert, { onConflict: 'user_id,match_id,bracket_type' })
      }

      // Add user to the league
      await supabase.from('league_members')
        .upsert({ league_id: offlinePlayer.league_id, user_id: user.id }, { onConflict: 'league_id,user_id' })

      // Delete offline player (cleanup)
      await supabase.from('offline_predictions').delete().eq('offline_player_id', offlinePlayer.id)
      await supabase.from('offline_players').delete().eq('id', offlinePlayer.id)

      setStatus('success')
      setTimeout(() => navigate('/predictions'), 3000)
    } catch (e) {
      setError(e.message)
      setStatus('error')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ maxWidth: '400px', width: '100%' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>🏴󠁧󠁢󠁳󠁣󠁴󠁥󠁢</div>
          <div style={{ fontWeight: '900', fontSize: '24px', color: 'var(--scottish-navy)', letterSpacing: '-0.02em' }}>WC26 Predictor</div>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: '32px 24px' }}>

          {status === 'loading' && (
            <>
              <div className="spinner" style={{ margin: '0 auto 16px' }} />
              <div style={{ color: 'var(--text-muted)' }}>Checking your invite link...</div>
            </>
          )}

          {status === 'invalid' && (
            <>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>❌</div>
              <div style={{ fontWeight: '800', fontSize: '18px', marginBottom: '8px' }}>Invalid link</div>
              <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>This invite link doesn't exist or has already been used.</div>
              <Link to="/" className="btn btn-primary btn-full">Go to home</Link>
            </>
          )}

          {status === 'expired' && (
            <>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>⏰</div>
              <div style={{ fontWeight: '800', fontSize: '18px', marginBottom: '8px' }}>Link expired</div>
              <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>This invite link has expired. Ask the league admin to generate a new one.</div>
              <Link to="/" className="btn btn-primary btn-full">Go to home</Link>
            </>
          )}

          {status === 'valid' && offlinePlayer && (
            <>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎉</div>
              <div style={{ fontWeight: '800', fontSize: '20px', marginBottom: '8px' }}>You've been invited!</div>
              <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px', lineHeight: 1.6 }}>
                Predictions for <strong>{offlinePlayer.display_name}</strong> in{' '}
                <strong>{offlinePlayer.leagues?.name}</strong> are ready to be claimed.
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', padding: '10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                Sign up or sign in to transfer these predictions to your account. Your picks, jokers and league membership will all carry over.
              </div>
              {user ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ padding: '10px', background: 'rgba(184,134,11,0.1)', borderRadius: 'var(--radius-md)', fontSize: '13px', color: '#b8860b', border: '1px solid rgba(184,134,11,0.3)' }}>
                    ⚠️ You're signed in as <strong>{user.email}</strong>. These predictions will be claimed by this account. If this isn't you, sign out first.
                  </div>
                  <button onClick={claimPredictions} className="btn btn-primary btn-full">
                    ✅ Claim as {user.email}
                  </button>
                  <button onClick={async () => { await supabase.auth.signOut(); window.location.reload() }}
                    className="btn btn-secondary btn-full">
                    Sign out & use different account
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <Link to={`/register?claim=${token}`} className="btn btn-primary btn-full">🚀 Join free & claim predictions</Link>
                  <Link to={`/login?claim=${token}`} className="btn btn-secondary btn-full">Already have an account? Sign in</Link>
                </div>
              )}
            </>
          )}

          {status === 'claiming' && (
            <>
              <div className="spinner" style={{ margin: '0 auto 16px' }} />
              <div style={{ fontWeight: '700', marginBottom: '8px' }}>Transferring your predictions...</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Just a moment</div>
            </>
          )}

          {status === 'success' && (
            <>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏆</div>
              <div style={{ fontWeight: '800', fontSize: '20px', marginBottom: '8px', color: 'var(--accent-green)' }}>Predictions claimed!</div>
              <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Your predictions have been transferred successfully. Redirecting you to predictions...
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>❌</div>
              <div style={{ fontWeight: '800', fontSize: '18px', marginBottom: '8px' }}>Something went wrong</div>
              <div style={{ fontSize: '13px', color: 'var(--accent-red)', marginBottom: '20px' }}>{error}</div>
              <Link to="/" className="btn btn-primary btn-full">Go to home</Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
