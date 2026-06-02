import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore, useAppStore } from '../store/index.js'
import ShareBracket from '../components/ShareBracket.jsx'

export default function Profile() {
  const { user, profile, loadProfile, logout, isAdmin } = useAuthStore()
  const { darkMode, toggleDarkMode } = useAppStore()
  const navigate = useNavigate()
  const [badges, setBadges] = useState([])
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const [showShare, setShowShare] = useState(false)

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

  const handleLogout = async () => {
    await logout()
    navigate('/')
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

        {/* Share button */}
        <button
          onClick={() => setShowShare(true)}
          style={{
            marginTop: '16px',
            background: 'rgba(255,255,255,0.15)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: 'var(--radius-full)',
            padding: '8px 20px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          📤 Share my predictions
        </button>
      </div>

      <div className="container" style={{ padding: '16px' }}>
        {/* Stats */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '14px' }}>📊 Your Stats</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            {[
              { label: 'Total Points', value: profile.total_points || 0, icon: '🏅' },
              { label: 'Current Streak', value: profile.streak_current || 0, icon: '🔥' },
              { label: 'Best Streak', value: profile.streak_best || 0, icon: '⚡' },
              { label: 'Perfect Rounds', value: profile.perfect_rounds || 0, icon: '🎯' },
            ].map(({ label, value, icon }) => (
              <div key={label} style={{
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '22px', marginBottom: '4px' }}>{icon}</div>
                <div style={{ fontWeight: '800', fontSize: '24px', fontFamily: 'var(--font-mono)' }}>{value}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>{label}</div>
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
            <button
              onClick={toggleDarkMode}
              style={{
                width: '48px', height: '28px',
                borderRadius: 'var(--radius-full)',
                background: darkMode ? 'var(--accent-green)' : 'var(--border-medium)',
                position: 'relative',
                transition: 'background 0.2s',
                border: 'none', cursor: 'pointer',
              }}
            >
              <div style={{
                width: '20px', height: '20px',
                borderRadius: '50%', background: 'white',
                position: 'absolute', top: '4px',
                left: darkMode ? '24px' : '4px',
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
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
        <button onClick={handleLogout} className="btn btn-secondary btn-full" style={{ marginBottom: '24px' }}>
          Sign out
        </button>
      </div>

      {/* Share modal */}
      {showShare && <ShareBracket onClose={() => setShowShare(false)} />}
    </div>
  )
}
