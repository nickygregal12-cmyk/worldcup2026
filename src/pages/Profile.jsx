import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore, useAppStore } from '../store/index.js'

export default function Profile() {
  const { user, profile, loadProfile, setProfile, logout, isAdmin } = useAuthStore()
  const { darkMode, toggleDarkMode } = useAppStore()
  const navigate = useNavigate()
  const [badges, setBadges] = useState([])
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [clearDone, setClearDone] = useState(false)

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    loadBadges()
    setDisplayName(profile?.display_name || profile?.username || '')
  }, [user, profile])

  const loadBadges = async () => {
    const { data } = await supabase
      .from('user_badges')
      .select('*, badge:badge_code(code, name, description, icon)')
      .eq('user_id', user.id)
    setBadges(data || [])
  }

  const saveProfile = async () => {
    setSaving(true)
    await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', user.id)
    await loadProfile(user.id)
    setEditing(false)
    setSaving(false)
  }

  const toggleFuturePredictions = async () => {
    const newVal = !profile.show_future_predictions
    // Optimistic update — update store immediately so toggle feels instant
    setProfile({ ...profile, show_future_predictions: newVal })
    // Save to DB
    await supabase.from('profiles').update({ show_future_predictions: newVal }).eq('id', user.id)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const handleClearAll = async () => {
    if (!user || clearing) return
    setClearing(true)
    await Promise.all([
      supabase.from('predictions').delete().eq('user_id', user.id),
      supabase.from('award_predictions').delete().eq('user_id', user.id),
      supabase.from('tournament_predictions').delete().eq('user_id', user.id),
    ])
    setClearing(false)
    setShowClearConfirm(false)
    setClearDone(true)
    setTimeout(() => setClearDone(false), 3000)
  }

  if (!profile) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0a0a0a, #1a2a1a)',
        padding: '32px 20px',
        color: 'white',
        textAlign: 'center',
      }}>
        <div style={{
          width: '72px', height: '72px',
          borderRadius: '50%',
          background: 'var(--accent-green)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '28px', fontWeight: '800',
          margin: '0 auto 12px',
          color: 'white',
        }}>
          {profile.username?.[0]?.toUpperCase()}
        </div>
        <div style={{ fontWeight: '800', fontSize: '22px' }}>{profile.display_name || profile.username}</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginTop: '4px' }}>@{profile.username}</div>

      </div>

      <div className="container" style={{ padding: '16px' }}>
        {/* Stats */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '14px' }}>📊 Your Stats</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            {[
              { label: 'Total Points', value: profile.total_points || 0, icon: '🏅' },
              { label: 'Current Streak', value: profile.streak_current || 0, icon: '🔥', desc: 'Correct results in a row' },
              { label: 'Best Streak', value: profile.streak_best || 0, icon: '⚡', desc: 'Personal best streak' },
              { label: 'Exact Scores', value: profile.exact_scores || 0, icon: '🎯', desc: 'Perfect score predictions' },
            ].map(({ label, value, icon, desc }) => (
              <div key={label} style={{
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '22px', marginBottom: '4px' }}>{icon}</div>
                <div style={{ fontWeight: '800', fontSize: '24px', fontFamily: 'var(--font-mono)' }}>{value}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>{label}</div>
                {desc && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', opacity: 0.7, lineHeight: '1.3' }}>{desc}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Badges */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '14px' }}>🏆 Badges</div>
          {badges.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px' }}>
              <div className="empty-state-icon">🎖️</div>
              <div className="empty-state-title">No badges yet</div>
              <div className="empty-state-desc">Start predicting to earn badges!</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {badges.map(({ badge }) => (
                <div key={badge.code} style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 8px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '28px', marginBottom: '4px' }}>{badge.icon}</div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-primary)' }}>{badge.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '14px' }}>⚙️ Settings</div>

          <div style={{ marginBottom: '16px' }}>
            <label className="label">Display Name</label>
            {editing ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  className="input"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                />
                <button onClick={saveProfile} disabled={saving} className="btn btn-primary btn-sm">
                  {saving ? '...' : 'Save'}
                </button>
                <button onClick={() => setEditing(false)} className="btn btn-secondary btn-sm">Cancel</button>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px' }}>{profile.display_name || profile.username}</span>
                <button onClick={() => setEditing(true)} className="btn btn-secondary btn-sm">Edit</button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px', borderTop: '1px solid var(--border-light)' }}>
            <div>
              <div style={{ fontWeight: '600', fontSize: '14px' }}>Dark Mode</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{darkMode ? 'On' : 'Off'}</div>
            </div>
            <button onClick={toggleDarkMode} style={{ width: '48px', height: '28px', borderRadius: 'var(--radius-full)', background: darkMode ? 'var(--accent-green)' : 'var(--border-medium)', position: 'relative', transition: 'background 0.2s', border: 'none', cursor: 'pointer' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'white', position: 'absolute', top: '4px', left: darkMode ? '24px' : '4px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px', borderTop: '1px solid var(--border-light)' }}>
            <div>
              <div style={{ fontWeight: '600', fontSize: '14px' }}>🔮 Show Future Predictions</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {profile.show_future_predictions ? 'Others can see your upcoming picks' : 'Future picks are private'}
              </div>
            </div>
            <button onClick={toggleFuturePredictions} style={{ width: '48px', height: '28px', borderRadius: 'var(--radius-full)', background: profile.show_future_predictions ? 'var(--accent-green)' : 'var(--border-medium)', position: 'relative', transition: 'background 0.2s', border: 'none', cursor: 'pointer' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'white', position: 'absolute', top: '4px', left: profile.show_future_predictions ? '24px' : '4px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </button>
          </div>
        </div>

        {isAdmin && (
          <Link to="/admin" className="btn btn-full" style={{
            marginBottom: '12px', display: 'block', textAlign: 'center',
            background: 'var(--accent-orange)', color: 'white',
            padding: '12px', borderRadius: 'var(--radius-lg)',
            fontWeight: '700', fontSize: '14px', textDecoration: 'none',
          }}>
            ⚙️ Admin Panel
          </Link>
        )}

        {/* Danger zone */}
        <div className="card" style={{ marginBottom: '12px', border: '1px solid rgba(229,57,53,0.2)' }}>
          <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Danger Zone
          </div>
          {clearDone ? (
            <div style={{ padding: '10px 14px', background: 'var(--accent-green-light)', borderRadius: 'var(--radius-md)', fontSize: '13px', color: 'var(--accent-green)', fontWeight: '600' }}>
              ✓ All predictions cleared — you can start fresh!
            </div>
          ) : (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="btn btn-full"
              style={{ background: 'none', border: '1px solid #e53935', color: '#e53935', fontWeight: '600' }}
            >
              🗑️ Clear all predictions & start again
            </button>
          )}
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
            Removes all group, award and goals predictions
          </div>
        </div>

        <button onClick={handleLogout} className="btn btn-secondary btn-full" style={{ marginBottom: '24px' }}>
          Sign out
        </button>

        {/* Clear All confirm modal */}
        {showClearConfirm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div className="card" style={{ maxWidth: '340px', width: '100%' }}>
              <div style={{ fontWeight: '800', fontSize: '16px', marginBottom: '8px' }}>🗑️ Clear everything?</div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                This will delete all your group predictions, award picks and goals predictions. This cannot be undone.
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleClearAll} disabled={clearing}
                  className="btn btn-primary" style={{ background: '#e53935', flex: 1 }}>
                  {clearing ? 'Clearing...' : 'Yes, clear everything'}
                </button>
                <button onClick={() => setShowClearConfirm(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Share modal */}

    </div>
  )
}
