import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/index.js'

export default function AdminPanel() {
  const { user, isAdmin } = useAuthStore()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('matches')
  const [matches, setMatches] = useState([])
  const [users, setUsers] = useState([])
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState({})
  const [editingMatch, setEditingMatch] = useState(null)
  const [scores, setScores] = useState({})
  const [stageFilter, setStageFilter] = useState('group')

  useEffect(() => {
    if (!user || !isAdmin) { navigate('/'); return }
    loadData()
  }, [user, isAdmin])

  const loadData = async () => {
    setLoading(true)
    const [matchRes, userRes, settingsRes] = await Promise.all([
      supabase.from('matches').select(`
        *,
        home_team:home_team_id(name,flag_emoji,short_code),
        away_team:away_team_id(name,flag_emoji,short_code)
      `).order('kickoff_time', { ascending: true }),
      supabase.from('profiles').select('*').order('total_points', { ascending: false }).limit(50),
      supabase.from('app_settings').select('*'),
    ])

    setMatches(matchRes.data || [])
    setUsers(userRes.data || [])
    const sMap = {}
    settingsRes.data?.forEach(s => { sMap[s.key] = s.value })
    setSettings(sMap)
    setLoading(false)
  }

  const saveMatchResult = async (match) => {
    const s = scores[match.id] || {}
    if (s.home === undefined || s.away === undefined) return

    setSaving(prev => ({ ...prev, [match.id]: true }))
    const homeScore = parseInt(s.home)
    const awayScore = parseInt(s.away)
    const winnerId = homeScore > awayScore ? match.home_team_id :
                     awayScore > homeScore ? match.away_team_id : null

    const { error } = await supabase
      .from('matches')
      .update({
        home_score: homeScore,
        away_score: awayScore,
        winner_team_id: winnerId,
        status: 'completed',
        use_manual_override: true,
      })
      .eq('id', match.id)

    if (!error) {
      // Trigger points calculation
      await supabase.rpc('calculate_prediction_points', { p_match_id: match.id })
      setEditingMatch(null)
      loadData()
    }
    setSaving(prev => ({ ...prev, [match.id]: false }))
  }

  const updateSetting = async (key, value) => {
    await supabase
      .from('app_settings')
      .update({ value, updated_by: user.id })
      .eq('key', key)
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const recalculateAllPoints = async () => {
    const { data: userList } = await supabase.from('profiles').select('id')
    for (const u of userList || []) {
      await supabase.rpc('recalculate_user_total_points', { p_user_id: u.id })
    }
    alert('Points recalculated for all users!')
    loadData()
  }

  const filteredMatches = matches.filter(m => m.stage === stageFilter)

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a0a00, #2a1500)',
        padding: '20px',
        color: 'white',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <span style={{ fontSize: '24px' }}>⚙️</span>
            <h1 style={{ fontSize: '22px', fontWeight: '800' }}>Admin Panel</h1>
            <span style={{ background: 'var(--accent-orange)', color: 'white', padding: '2px 10px', borderRadius: 'var(--radius-full)', fontSize: '11px', fontWeight: '700' }}>
              ADMIN
            </span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>WorldCup26 Predictor Management</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)' }}>
        <div className="container">
          <div className="tabs">
            {['matches', 'users', 'settings'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`tab ${activeTab === tab ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', textTransform: 'capitalize' }}
              >
                {tab === 'matches' ? '⚽ Matches' : tab === 'users' ? '👥 Users' : '⚙️ Settings'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '16px' }}>
        {/* Matches Tab */}
        {activeTab === 'matches' && (
          <div>
            {/* Stage filter */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {['group', 'r32', 'r16', 'qf', 'sf', '3rd', 'final'].map(stage => (
                <button
                  key={stage}
                  onClick={() => setStageFilter(stage)}
                  className="btn btn-sm"
                  style={{
                    background: stageFilter === stage ? 'var(--primary)' : 'var(--bg-card)',
                    color: stageFilter === stage ? 'var(--text-inverse)' : 'var(--text-secondary)',
                    border: '1px solid var(--border-light)',
                  }}
                >
                  {stage.toUpperCase()}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredMatches.map(match => {
                const isEditing = editingMatch === match.id
                const s = scores[match.id] || { home: match.home_score ?? '', away: match.away_score ?? '' }

                return (
                  <div key={match.id} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                        Match #{match.match_number} · {new Date(match.kickoff_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </div>
                      <span className={`badge ${match.status === 'completed' ? 'badge-green' : match.status === 'live' ? 'badge-red' : 'badge-gray'}`}>
                        {match.status}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '24px' }}>{match.home_team?.flag_emoji || '🏳️'}</div>
                        <div style={{ fontSize: '12px', fontWeight: '700' }}>{match.home_team?.short_code || match.home_team_placeholder || '?'}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isEditing ? (
                          <>
                            <input
                              type="number" min="0" max="99"
                              className="score-input"
                              value={s.home}
                              onChange={e => setScores(prev => ({ ...prev, [match.id]: { ...s, home: e.target.value } }))}
                            />
                            <span className="score-divider">–</span>
                            <input
                              type="number" min="0" max="99"
                              className="score-input"
                              value={s.away}
                              onChange={e => setScores(prev => ({ ...prev, [match.id]: { ...s, away: e.target.value } }))}
                            />
                          </>
                        ) : (
                          <div style={{ fontWeight: '800', fontSize: '20px', fontFamily: 'var(--font-mono)' }}>
                            {match.home_score ?? '–'} – {match.away_score ?? '–'}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '24px' }}>{match.away_team?.flag_emoji || '🏳️'}</div>
                        <div style={{ fontSize: '12px', fontWeight: '700' }}>{match.away_team?.short_code || match.away_team_placeholder || '?'}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => saveMatchResult(match)}
                            disabled={saving[match.id]}
                            className="btn btn-green btn-sm"
                          >
                            {saving[match.id] ? '...' : '✓ Save Result'}
                          </button>
                          <button onClick={() => setEditingMatch(null)} className="btn btn-secondary btn-sm">Cancel</button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingMatch(match.id)
                            setScores(prev => ({ ...prev, [match.id]: { home: match.home_score ?? '', away: match.away_score ?? '' } }))
                          }}
                          className="btn btn-secondary btn-sm"
                        >
                          ✏️ Enter Result
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="card" style={{ padding: '8px' }}>
            <div style={{ padding: '12px 16px', marginBottom: '8px' }}>
              <button onClick={recalculateAllPoints} className="btn btn-primary btn-sm">
                🔄 Recalculate All Points
              </button>
            </div>
            {users.map((u, i) => (
              <div key={u.id} className="leaderboard-row">
                <div className="rank-number">#{i + 1}</div>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>{u.username}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {u.is_admin && <span style={{ color: 'var(--accent-orange)' }}>ADMIN · </span>}
                    Streak: {u.streak_current || 0}
                  </div>
                </div>
                <div style={{ fontWeight: '800', fontSize: '16px', fontFamily: 'var(--font-mono)', color: 'var(--accent-green)' }}>
                  {u.total_points || 0} pts
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { key: 'maintenance_mode', label: '🔧 Maintenance Mode', desc: 'Put the app in read-only mode' },
              { key: 'predictions_enabled', label: '⚽ Predictions Enabled', desc: 'Allow users to submit predictions' },
              { key: 'live_api_enabled', label: '📡 Live API Enabled', desc: 'Sync scores from football-data.org' },
              { key: 'knockout_restart_unlocked', label: '🔄 Knockout Restart Unlocked', desc: 'Allow users to start a fresh knockout bracket' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>{label}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{desc}</div>
                    <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Current: <strong>{settings[key]}</strong>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => updateSetting(key, 'true')}
                      className="btn btn-sm"
                      style={{ background: settings[key] === 'true' ? 'var(--accent-green)' : 'var(--bg-tertiary)', color: settings[key] === 'true' ? 'white' : 'var(--text-secondary)' }}
                    >
                      On
                    </button>
                    <button
                      onClick={() => updateSetting(key, 'false')}
                      className="btn btn-sm"
                      style={{ background: settings[key] === 'false' ? 'var(--accent-red)' : 'var(--bg-tertiary)', color: settings[key] === 'false' ? 'white' : 'var(--text-secondary)' }}
                    >
                      Off
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
