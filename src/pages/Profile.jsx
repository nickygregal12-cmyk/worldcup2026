import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore, useAppStore } from '../store/index.js'

const AVATARS = ['⚽','🏆','🥅','🧤','👟','🎯','🔥','⚡','🦁','🐯','🦅','🏴󠁧󠁢󠁳󠁣󠁴󠁿']

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
  const [activeTab, setActiveTab] = useState('stats') // stats | history
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [selectedAvatar, setSelectedAvatar] = useState('')

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    loadBadges()
    setDisplayName(profile?.display_name || profile?.username || '')
    setSelectedAvatar(profile?.avatar_emoji || '⚽')
  }, [user, profile])

  const loadBadges = async () => {
    const { data } = await supabase
      .from('user_badges')
      .select('*, badge:badge_code(code, name, description, icon)')
      .eq('user_id', user.id)
    setBadges(data || [])
  }

  const loadHistory = async () => {
    if (history.length > 0) return
    setHistoryLoading(true)
    const { data } = await supabase
      .from('predictions')
      .select(`
        id, home_score, away_score, points_awarded, is_joker,
        match:match_id(id, kickoff_time, home_score, away_score, status,
          home_team:home_team_id(name, flag_emoji, short_code),
          away_team:away_team_id(name, flag_emoji, short_code))
      `)
      .eq('user_id', user.id)
      .eq('match.status', 'completed')
      .order('created_at', { ascending: false })
      .limit(50)
    setHistory((data || []).filter(p => p.match?.status === 'completed'))
    setHistoryLoading(false)
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    if (tab === 'history') loadHistory()
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

  const saveAvatar = async (emoji) => {
    setSelectedAvatar(emoji)
    setShowAvatarPicker(false)
    setProfile({ ...profile, avatar_emoji: emoji })
    await supabase.from('profiles').update({ avatar_emoji: emoji }).eq('id', user.id)
  }

  const toggleFuturePredictions = async () => {
    const newVal = !profile.show_future_predictions
    setProfile({ ...profile, show_future_predictions: newVal })
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

  const getResultColour = (pred, match) => {
    if (!match || match.status !== 'completed') return 'var(--text-muted)'
    const predResult = pred.home_score > pred.away_score ? 'H' : pred.home_score < pred.away_score ? 'A' : 'D'
    const actualResult = match.home_score > match.away_score ? 'H' : match.home_score < match.away_score ? 'A' : 'D'
    if (pred.home_score === match.home_score && pred.away_score === match.away_score) return 'var(--accent-green)'
    if (predResult === actualResult) return 'var(--accent-orange)'
    return '#e53935'
  }

  const accuracy = profile?.prediction_accuracy || 0

  if (!profile) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #003087, #005eb8)',
        padding: '32px 20px 24px',
        color: 'white',
        textAlign: 'center',
      }}>
        {/* Avatar */}
        <div
          onClick={() => setShowAvatarPicker(true)}
          style={{
            width: '72px', height: '72px',
            borderRadius: '50%',
            background: 'var(--accent-green)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '32px',
            margin: '0 auto 12px',
            cursor: 'pointer',
            position: 'relative',
          }}
        >
          {selectedAvatar || profile.username?.[0]?.toUpperCase()}
          <div style={{
            position: 'absolute', bottom: 0, right: 0,
            background: 'white', borderRadius: '50%',
            width: '20px', height: '20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '10px',
          }}>✏️</div>
        </div>

        <div style={{ fontWeight: '800', fontSize: '22px' }}>{profile.display_name || profile.username}</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginTop: '4px' }}>@{profile.username}</div>

        {/* Accuracy bar */}
        {accuracy > 0 && (
          <div style={{ marginTop: '12px', maxWidth: '200px', margin: '12px auto 0' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
              Prediction accuracy: {accuracy}%
            </div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.15)', borderRadius: '2px' }}>
              <div style={{ height: '100%', width: `${accuracy}%`, background: 'var(--accent-green)', borderRadius: '2px', transition: 'width 0.5s' }} />
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-light)',
        display: 'flex',
      }}>
        {['stats', 'history'].map(tab => (
          <button key={tab} onClick={() => handleTabChange(tab)} style={{
            flex: 1, padding: '12px',
            fontSize: '13px', fontWeight: activeTab === tab ? '700' : '500',
            color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === tab ? '2px solid var(--accent-green)' : '2px solid transparent',
            background: 'none', border: 'none', cursor: 'pointer',
            textTransform: 'capitalize',
          }}>
            {tab === 'stats' ? '📊 Stats' : '📋 History'}
          </button>
        ))}
      </div>

      <div className="container" style={{ padding: '16px' }}>

        {activeTab === 'stats' && (
          <>
            {/* Stats grid */}
            <div className="card" style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--scottish-navy)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                🌍 Tournament Predictor
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {[
                  { label: 'Total Points', value: profile.total_points || 0, icon: '🏅' },
                  { label: 'Accuracy', value: `${accuracy}%`, icon: '🎯', desc: 'Correct results' },
                  { label: 'Current Streak', value: profile.streak_current || 0, icon: '🔥', desc: 'Correct in a row' },
                  { label: 'Best Streak', value: profile.streak_best || 0, icon: '⚡', desc: 'Personal best' },
                  { label: 'Exact Scores', value: profile.exact_scores || 0, icon: '💎', desc: 'Perfect predictions' },
                  { label: 'Jokers Left', value: profile.jokers_group_remaining ?? 8, icon: '🃏', desc: 'Double points remaining' },
                ].map(({ label, value, icon, desc }) => (
                  <div key={label} style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '14px', textAlign: 'center' }}>
                    <div style={{ fontSize: '22px', marginBottom: '4px' }}>{icon}</div>
                    <div style={{ fontWeight: '800', fontSize: '24px', fontFamily: 'var(--font-mono)' }}>{value}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>{label}</div>
                    {desc && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', opacity: 0.7, lineHeight: '1.3' }}>{desc}</div>}
                  </div>
                ))}
              </div>

              {/* KO stats */}
              {(profile.ko_points > 0 || profile.ko_jokers_remaining !== undefined) && (
                <>
                  <div style={{ height: '1px', background: 'var(--border-light)', margin: '14px 0 12px' }} />
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#e65100', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                    🔥 KO Predictor
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {[
                      { label: 'KO Points', value: profile.ko_points || 0, icon: '🔥' },
                      { label: 'KO Exact', value: profile.ko_exact_scores || 0, icon: '🎯', desc: 'Perfect KO scores' },
                      { label: 'KO Streak', value: profile.ko_streak_current || 0, icon: '⚡', desc: 'Current KO streak' },
                      { label: 'KO Jokers', value: profile.ko_jokers_remaining ?? 5, icon: '🃏', desc: 'KO jokers left' },
                    ].map(({ label, value, icon, desc }) => (
                      <div key={label} style={{ background: '#fff3e0', borderRadius: 'var(--radius-md)', padding: '14px', textAlign: 'center', border: '1px solid rgba(230,81,0,0.15)' }}>
                        <div style={{ fontSize: '22px', marginBottom: '4px' }}>{icon}</div>
                        <div style={{ fontWeight: '800', fontSize: '24px', fontFamily: 'var(--font-mono)', color: '#e65100' }}>{value}</div>
                        <div style={{ fontSize: '11px', color: '#e65100', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px', opacity: 0.8 }}>{label}</div>
                        {desc && <div style={{ fontSize: '10px', color: '#e65100', marginTop: '2px', opacity: 0.6, lineHeight: '1.3' }}>{desc}</div>}
                      </div>
                    ))}
                  </div>
                </>
              )}
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
                      <div style={{ fontSize: '11px', fontWeight: '700' }}>{badge.name}</div>
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
                    <input className="input" value={displayName} onChange={e => setDisplayName(e.target.value)} />
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
                <button onClick={toggleDarkMode} style={{ width: '48px', height: '28px', borderRadius: 'var(--radius-full)', background: darkMode ? 'var(--accent-green)' : 'var(--border-medium)', position: 'relative', border: 'none', cursor: 'pointer' }}>
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
                <button onClick={toggleFuturePredictions} style={{ width: '48px', height: '28px', borderRadius: 'var(--radius-full)', background: profile.show_future_predictions ? 'var(--accent-green)' : 'var(--border-medium)', position: 'relative', border: 'none', cursor: 'pointer' }}>
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
                <button onClick={() => setShowClearConfirm(true)} className="btn btn-full"
                  style={{ background: 'none', border: '1px solid #e53935', color: '#e53935', fontWeight: '600' }}>
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
          </>
        )}

        {activeTab === 'history' && (
          <div className="card" style={{ padding: '8px' }}>
            {historyLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
                <div className="spinner" />
              </div>
            ) : history.length === 0 ? (
              <div className="empty-state" style={{ padding: '48px 24px' }}>
                <div className="empty-state-icon">📋</div>
                <div className="empty-state-title">No completed matches yet</div>
                <div className="empty-state-desc">Your prediction results will appear here once matches are played</div>
              </div>
            ) : (
              history.map(pred => {
                const match = pred.match
                if (!match) return null
                const colour = getResultColour(pred, match)
                const isExact = pred.home_score === match.home_score && pred.away_score === match.away_score
                return (
                  <div key={pred.id} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 8px', borderBottom: '1px solid var(--border-light)',
                    borderLeft: `3px solid ${colour}`,
                    paddingLeft: '12px', marginBottom: '2px',
                    borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '2px' }}>
                        {match.home_team?.flag_emoji} {match.home_team?.short_code} vs {match.away_team?.short_code} {match.away_team?.flag_emoji}
                        {pred.is_joker && <span style={{ marginLeft: '4px', fontSize: '10px' }}>🃏</span>}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Your pick: {pred.home_score}–{pred.away_score} · Actual: {match.home_score}–{match.away_score}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '800', fontSize: '16px', fontFamily: 'var(--font-mono)', color: colour }}>
                        +{pred.points_awarded || 0}
                      </div>
                      {isExact && <div style={{ fontSize: '9px', color: 'var(--accent-green)', fontWeight: '700' }}>EXACT</div>}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Avatar picker modal */}
      {showAvatarPicker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ maxWidth: '320px', width: '100%' }}>
            <div style={{ fontWeight: '800', fontSize: '16px', marginBottom: '16px' }}>Choose your avatar</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
              {AVATARS.map(emoji => (
                <button key={emoji} onClick={() => saveAvatar(emoji)} style={{
                  fontSize: '28px', padding: '10px',
                  background: selectedAvatar === emoji ? 'var(--accent-green-light)' : 'var(--bg-secondary)',
                  border: selectedAvatar === emoji ? '2px solid var(--accent-green)' : '2px solid transparent',
                  borderRadius: 'var(--radius-md)', cursor: 'pointer',
                }}>
                  {emoji}
                </button>
              ))}
            </div>
            <button onClick={() => setShowAvatarPicker(false)} className="btn btn-secondary btn-full">Cancel</button>
          </div>
        </div>
      )}

      {/* Clear all confirm modal */}
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
  )
}
