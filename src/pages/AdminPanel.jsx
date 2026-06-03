import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/index.js'

const TABS = [
  { key: 'health',   label: '🩺 Health' },
  { key: 'matches',  label: '⚽ Matches' },
  { key: 'awards',   label: '🥇 Awards' },
  { key: 'users',    label: '👥 Users' },
  { key: 'leagues',  label: '🏆 Leagues' },
  { key: 'points',   label: '🎯 Points' },
  { key: 'audit',    label: '📋 Audit Log' },
  { key: 'settings', label: '⚙️ Settings' },
]

const AWARD_DEFS = [
  { key: 'golden_boot', label: '👟 Golden Boot', desc: 'Top scorer of the tournament', pts: 15, placeholder: 'e.g. Kylian Mbappé' },
  { key: 'golden_glove', label: '🧤 Golden Glove', desc: 'Best goalkeeper', pts: 10, placeholder: 'e.g. Yann Sommer' },
  { key: 'player_of_tournament', label: '🏅 Player of the Tournament', desc: 'Best overall player', pts: 10, placeholder: 'e.g. Jude Bellingham' },
  { key: 'total_goals', label: '⚽ Total Goals', desc: 'Total goals scored in tournament', pts: 15, placeholder: 'e.g. 142' },
]

function AwardsTab({ awardResults, awardSaving, saveAwardResult }) {
  const [inputs, setInputs] = useState(() => {
    const init = {}
    AWARD_DEFS.forEach(a => { init[a.key] = awardResults[a.key]?.winner_name || '' })
    return init
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="card" style={{ background: 'var(--accent-blue-light)', border: '1px solid var(--accent-blue)' }}>
        <div style={{ fontSize: '13px', color: 'var(--accent-blue)', fontWeight: '600' }}>
          ℹ️ Enter the actual tournament award winners after they are announced. Points will be automatically awarded to users who picked correctly.
        </div>
      </div>
      {AWARD_DEFS.map(award => {
        const existing = awardResults[award.key]
        return (
          <div key={award.key} className="card">
            <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '4px' }}>{award.label}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>{award.desc} · {award.pts}pts for correct pick</div>
            {existing && (
              <div style={{ padding: '8px 12px', background: 'var(--accent-green-light)', borderRadius: 'var(--radius-sm)', marginBottom: '10px', fontSize: '13px', color: 'var(--accent-green)', fontWeight: '600' }}>
                ✓ Result recorded: {existing.winner_name}
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                className="input" style={{ flex: 1 }}
                placeholder={award.placeholder}
                value={inputs[award.key] || ''}
                onChange={e => setInputs(prev => ({ ...prev, [award.key]: e.target.value }))}
              />
              <button
                onClick={() => saveAwardResult(award.key, inputs[award.key], award.pts)}
                disabled={!inputs[award.key] || awardSaving[award.key]}
                className="btn btn-primary btn-sm"
              >
                {awardSaving[award.key] ? '...' : existing ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function AdminPanel() {
  const { user, isAdmin } = useAuthStore()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('health')
  const [loading, setLoading] = useState(true)

  // Data
  const [matches, setMatches] = useState([])
  const [users, setUsers] = useState([])
  const [leagues, setLeagues] = useState([])
  const [auditLog, setAuditLog] = useState([])
  const [settings, setSettings] = useState({})
  const [health, setHealth] = useState({})

  // UI state
  const [stageFilter, setStageFilter] = useState('group')
  const [editingMatch, setEditingMatch] = useState(null)
  const [scores, setScores] = useState({})
  const [saving, setSaving] = useState({})
  const [userSearch, setUserSearch] = useState('')
  const [pointAdjUser, setPointAdjUser] = useState(null)
  const [pointAdjAmount, setPointAdjAmount] = useState('')
  const [pointAdjReason, setPointAdjReason] = useState('')
  const [confirmAction, setConfirmAction] = useState(null)
  const [actionResult, setActionResult] = useState('')
  const [awardResults, setAwardResults] = useState({})
  const [awardSaving, setAwardSaving] = useState({})

  useEffect(() => {
    if (!user || !isAdmin) { navigate('/'); return }
    loadAll()
  }, [user, isAdmin])

  const loadAll = async () => {
    setLoading(true)
    await Promise.all([loadHealth(), loadMatches(), loadUsers(), loadLeagues(), loadAudit(), loadSettings(), loadAwardResults()])
    setLoading(false)
  }

  const loadHealth = async () => {
    const now = new Date()
    const [matchRes, liveRes, syncRes, userCountRes] = await Promise.all([
      supabase.from('matches').select('status', { count: 'exact' }),
      supabase.from('matches').select('id', { count: 'exact' }).eq('status', 'live'),
      supabase.from('app_settings').select('*').eq('key', 'last_sync_at').single(),
      supabase.from('profiles').select('id', { count: 'exact' }),
    ])

    const completedRes = await supabase.from('matches').select('id', { count: 'exact' }).eq('status', 'completed')
    const scheduledRes = await supabase.from('matches').select('id', { count: 'exact' }).eq('status', 'scheduled')

    const lastSync = syncRes.data?.value ? new Date(syncRes.data.value) : null
    const syncAge = lastSync ? Math.round((now - lastSync) / 60000) : null

    setHealth({
      totalMatches: matchRes.count || 0,
      liveMatches: liveRes.count || 0,
      completedMatches: completedRes.count || 0,
      scheduledMatches: scheduledRes.count || 0,
      totalUsers: userCountRes.count || 0,
      lastSync,
      syncAge,
      syncOk: syncAge !== null && syncAge < 10,
      dbOk: !matchRes.error,
    })
  }

  const loadMatches = async () => {
    const { data } = await supabase
      .from('matches')
      .select('*, home_team:home_team_id(name,flag_emoji,short_code), away_team:away_team_id(name,flag_emoji,short_code)')
      .order('kickoff_time', { ascending: true })
    setMatches(data || [])
  }

  const loadUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('total_points', { ascending: false })
      .limit(100)
    setUsers(data || [])
  }

  const loadLeagues = async () => {
    const { data } = await supabase
      .from('leagues')
      .select('*, creator:created_by(username), members:league_members(user_id, profile:user_id(username))')
      .order('created_at', { ascending: false })
    setLeagues(data || [])
  }

  const loadAudit = async () => {
    const { data } = await supabase
      .from('admin_audit_log')
      .select('*, admin:admin_user_id(username)')
      .order('created_at', { ascending: false })
      .limit(50)
    setAuditLog(data || [])
  }

  const loadSettings = async () => {
    const { data } = await supabase.from('app_settings').select('*')
    const sMap = {}
    data?.forEach(s => { sMap[s.key] = s.value })
    setSettings(sMap)
  }

  const loadAwardResults = async () => {
    const { data } = await supabase.from('award_results').select('*')
    const map = {}
    data?.forEach(r => { map[r.award_type] = r })
    setAwardResults(map)
  }

  const syncScoresNow = async () => {
    setSaving(prev => ({ ...prev, sync: true }))
    try {
      const res = await fetch('/.netlify/functions/sync-scores', { method: 'POST' })
      const data = await res.json()
      setActionResult(`Sync complete — ${data.updated || 0} matches updated, ${data.pointsCalculated || 0} points calculated`)
      await logAudit('MANUAL_SYNC', { updated: data.updated, pointsCalculated: data.pointsCalculated })
      loadHealth()
    } catch (e) {
      setActionResult(`Sync error: ${e.message}`)
    }
    setSaving(prev => ({ ...prev, sync: false }))
  }

  const prepopulateMatchIds = async () => {
    setSaving(prev => ({ ...prev, prepopulate: true }))
    try {
      const res = await fetch('https://api.football-data.org/v4/competitions/WC/matches?season=2026', {
        headers: { 'X-Auth-Token': '' } // Runs via proxy — actual key is server-side
      })
      // Trigger via sync-scores which handles the API key server-side
      const syncRes = await fetch('/.netlify/functions/sync-scores', { method: 'POST' })
      const data = await syncRes.json()
      setActionResult(`Pre-populate complete — ${data.updated || 0} match IDs stored`)
      await logAudit('PREPOPULATE_MATCH_IDS', { result: data })
    } catch (e) {
      setActionResult(`Pre-populate error: ${e.message}`)
    }
    setSaving(prev => ({ ...prev, prepopulate: false }))
  }

  const saveAwardResult = async (awardType, winner, pts) => {
    setAwardSaving(prev => ({ ...prev, [awardType]: true }))
    await supabase.from('award_results').upsert(
      { award_type: awardType, winner_name: winner, points_value: parseInt(pts) },
      { onConflict: 'award_type' }
    )
    await supabase.rpc('calculate_award_points', { p_award_type: awardType }).catch(() => {})
    await logAudit('AWARD_RESULT', { award_type: awardType, winner })
    setActionResult(`${awardType} result saved — points being awarded`)
    loadAwardResults()
    setAwardSaving(prev => ({ ...prev, [awardType]: false }))
  }

  const logAudit = async (action, details) => {
    await supabase.from('admin_audit_log').insert({
      admin_user_id: user.id,
      action,
      details: JSON.stringify(details),
    })
  }

  const saveMatchResult = async (match) => {
    const s = scores[match.id] || {}
    if (s.home === undefined || s.away === undefined) return
    setSaving(prev => ({ ...prev, [match.id]: true }))
    const homeScore = parseInt(s.home)
    const awayScore = parseInt(s.away)
    const winnerId = homeScore > awayScore ? match.home_team_id : awayScore > homeScore ? match.away_team_id : null

    const { error } = await supabase.from('matches').update({
      home_score: homeScore, away_score: awayScore,
      winner_team_id: winnerId, status: 'completed', use_manual_override: true,
    }).eq('id', match.id)

    if (error) { setActionResult(`Error saving score: ${error.message}`); setSaving(prev => ({ ...prev, [match.id]: false })); return }

    const { error: rpcErr } = await supabase.rpc('calculate_prediction_points', { p_match_id: match.id })
    if (rpcErr) setActionResult(`Score saved but points calc failed: ${rpcErr.message}`)
    else setActionResult(`Score saved — points calculated for match #${match.match_number}`)

    await logAudit('SCORE_OVERRIDE', { match_id: match.id, match_number: match.match_number, home: homeScore, away: awayScore })
    setEditingMatch(null)
    loadMatches()
    setSaving(prev => ({ ...prev, [match.id]: false }))
  }

  const setMatchLive = async (matchId) => {
    const { error } = await supabase.from('matches').update({ status: 'live' }).eq('id', matchId)
    if (error) { setActionResult(`Error: ${error.message}`); return }
    await logAudit('SET_LIVE', { match_id: matchId })
    setActionResult('Match set to live')
    loadMatches()
  }

  const resetMatchOverride = async (matchId) => {
    const { error } = await supabase.from('matches').update({ use_manual_override: false, status: 'scheduled' }).eq('id', matchId)
    if (error) { setActionResult(`Error: ${error.message}`); return }
    await logAudit('RESET_OVERRIDE', { match_id: matchId })
    setActionResult('Match override reset')
    loadMatches()
  }

  const banUser = async (userId, username) => {
    const { error } = await supabase.from('profiles').update({ is_banned: true }).eq('id', userId)
    if (error) { setActionResult(`Error banning user: ${error.message}`); return }
    await logAudit('BAN_USER', { user_id: userId, username })
    setActionResult(`Banned ${username}`)
    loadUsers()
  }

  const unbanUser = async (userId, username) => {
    const { error } = await supabase.from('profiles').update({ is_banned: false }).eq('id', userId)
    if (error) { setActionResult(`Error unbanning user: ${error.message}`); return }
    await logAudit('UNBAN_USER', { user_id: userId, username })
    setActionResult(`Unbanned ${username}`)
    loadUsers()
  }

  const resetUserPredictions = async (userId, username) => {
    const { error: predErr } = await supabase.from('predictions').delete().eq('user_id', userId)
    if (predErr) { setActionResult(`Error resetting predictions: ${predErr.message}`); return }
    await supabase.from('profiles').update({ total_points: 0, streak_current: 0 }).eq('id', userId)
    await logAudit('RESET_PREDICTIONS', { user_id: userId, username })
    setActionResult(`Reset predictions for ${username}`)
    loadUsers()
  }

  const makeAdmin = async (userId, username) => {
    const { error } = await supabase.from('profiles').update({ is_admin: true }).eq('id', userId)
    if (error) { setActionResult(`Error: ${error.message}`); return }
    await logAudit('MAKE_ADMIN', { user_id: userId, username })
    setActionResult(`Made ${username} an admin`)
    loadUsers()
  }

  const applyPointAdjustment = async () => {
    if (!pointAdjUser || !pointAdjAmount || !pointAdjReason) {
      setActionResult('Please fill in amount and reason'); return
    }
    const amount = parseInt(pointAdjAmount)
    if (isNaN(amount)) { setActionResult('Amount must be a number'); return }
    const u = users.find(u => u.id === pointAdjUser)
    const newPoints = (u?.total_points || 0) + amount
    const { error } = await supabase.from('profiles').update({ total_points: newPoints }).eq('id', pointAdjUser)
    if (error) { setActionResult(`Error adjusting points: ${error.message}`); return }
    await logAudit('POINT_ADJUSTMENT', { user_id: pointAdjUser, username: u?.username, amount, reason: pointAdjReason, new_total: newPoints })
    setActionResult(`Adjusted ${u?.username} points by ${amount > 0 ? '+' : ''}${amount} — new total: ${newPoints}`)
    setPointAdjUser(null); setPointAdjAmount(''); setPointAdjReason('')
    loadUsers()
  }

  // League actions
  const deleteLeague = async (leagueId, leagueName) => {
    // Delete members first to avoid FK constraint error
    const { error: membErr } = await supabase.from('league_members').delete().eq('league_id', leagueId)
    if (membErr) { setActionResult(`Error removing members: ${membErr.message}`); return }
    const { error: leagErr } = await supabase.from('leagues').delete().eq('id', leagueId)
    if (leagErr) { setActionResult(`Error deleting league: ${leagErr.message}`); return }
    await logAudit('DELETE_LEAGUE', { league_id: leagueId, name: leagueName })
    setActionResult(`Deleted league: ${leagueName}`)
    loadLeagues()
  }

  // Settings
  const updateSetting = async (key, value) => {
    await supabase.from('app_settings').upsert({ key, value, updated_by: user.id }, { onConflict: 'key' })
    setSettings(prev => ({ ...prev, [key]: value }))
    await logAudit('SETTING_CHANGE', { key, value })
  }

  const recalcAllPoints = async () => {
    setSaving(prev => ({ ...prev, recalc: true }))
    const { data: userList, error } = await supabase.from('profiles').select('id')
    if (error) { setActionResult(`Error: ${error.message}`); setSaving(prev => ({ ...prev, recalc: false })); return }
    let failed = 0
    for (const u of userList || []) {
      const { error: rpcErr } = await supabase.rpc('recalculate_user_total_points', { p_user_id: u.id })
      if (rpcErr) failed++
    }
    await logAudit('RECALC_ALL_POINTS', { user_count: userList?.length, failed })
    setSaving(prev => ({ ...prev, recalc: false }))
    setActionResult(`Points recalculated for ${userList?.length} users${failed > 0 ? ` (${failed} failed)` : ''}`)
    loadUsers()
  }

  const removeMemberFromLeague = async (leagueId, userId, username, leagueName) => {
    const { error } = await supabase.from('league_members').delete().eq('league_id', leagueId).eq('user_id', userId)
    if (error) { setActionResult(`Error removing member: ${error.message}`); return }
    await logAudit('REMOVE_LEAGUE_MEMBER', { league_id: leagueId, user_id: userId, username, league: leagueName })
    setActionResult(`Removed ${username} from ${leagueName}`)
    loadLeagues()
  }

  const filteredUsers = users.filter(u =>
    !userSearch || u.username?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase())
  )
  const filteredMatches = matches.filter(m => m.stage === stageFilter)

  const fmt = (t) => t ? new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1a0a00, #2a1500)', padding: '20px', color: 'white' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: '800' }}>⚙️ Admin Panel</h1>
            <span style={{ background: 'var(--accent-orange)', color: 'white', padding: '2px 10px', borderRadius: 'var(--radius-full)', fontSize: '11px', fontWeight: '700' }}>ADMIN</span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>WC26 Predictor Management · {health.totalUsers} users</p>
          {actionResult && (
            <div style={{ marginTop: '8px', background: 'rgba(0,255,0,0.15)', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', color: '#00ff88' }}>
              ✓ {actionResult}
              <button onClick={() => setActionResult('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: '8px' }}>×</button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)', overflowX: 'auto' }}>
        <div className="container">
          <div style={{ display: 'flex' }}>
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                padding: '12px 16px', fontSize: '13px', whiteSpace: 'nowrap',
                fontWeight: activeTab === tab.key ? '700' : '400',
                color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
                borderBottom: activeTab === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
                background: 'none', border: 'none',
                borderBottom: activeTab === tab.key ? '2px solid var(--accent-orange)' : '2px solid transparent',
                cursor: 'pointer',
              }}>{tab.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '16px' }}>

        {/* ── HEALTH ── */}
        {activeTab === 'health' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Status cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {[
                { label: 'Database', ok: health.dbOk, detail: 'Supabase connection' },
                { label: 'Score Sync', ok: health.syncOk, detail: health.syncAge !== null ? `Last sync ${health.syncAge}m ago` : 'Never synced' },
                { label: 'Live Matches', ok: true, detail: `${health.liveMatches} in progress`, neutral: true },
                { label: 'Users', ok: true, detail: `${health.totalUsers} registered`, neutral: true },
              ].map(item => (
                <div key={item.label} className="card" style={{ border: `1px solid ${item.neutral ? 'var(--border-light)' : item.ok ? 'var(--accent-green)' : '#e53935'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: '700', fontSize: '14px' }}>{item.label}</span>
                    <span style={{ fontSize: '18px' }}>{item.neutral ? '📊' : item.ok ? '✅' : '🔴'}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.detail}</div>
                </div>
              ))}
            </div>

            {/* Match stats */}
            <div className="card">
              <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '12px' }}>Match Status</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { label: 'Scheduled', count: health.scheduledMatches, color: 'var(--accent-blue)' },
                  { label: 'Live', count: health.liveMatches, color: '#e53935' },
                  { label: 'Completed', count: health.completedMatches, color: 'var(--accent-green)' },
                  { label: 'Total', count: health.totalMatches, color: 'var(--text-primary)' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{row.label}</span>
                    <span style={{ fontWeight: '800', fontSize: '16px', color: row.color, fontFamily: 'var(--font-mono)' }}>{row.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div className="card">
              <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '12px' }}>Quick Actions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button onClick={syncScoresNow} disabled={saving.sync} className="btn btn-primary" style={{ background: '#e53935' }}>
                  {saving.sync ? '⏳ Syncing...' : '🔄 Sync Scores Now'}
                </button>
                <button onClick={prepopulateMatchIds} disabled={saving.prepopulate} className="btn btn-primary" style={{ background: 'var(--accent-orange)' }}>
                  {saving.prepopulate ? '⏳ Running...' : '🔗 Pre-populate Match IDs'}
                </button>
                <button onClick={recalcAllPoints} disabled={saving.recalc} className="btn btn-secondary">
                  {saving.recalc ? 'Recalculating...' : '🔄 Recalculate All Points'}
                </button>
                <button onClick={loadAll} className="btn btn-secondary">🔃 Refresh All Data</button>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                ⚠️ Run "Pre-populate Match IDs" once before 11 Jun to ensure score sync works reliably
              </div>
            </div>

            {/* Last sync time */}
            <div className="card">
              <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '8px' }}>Score Sync Status</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Last sync: {health.lastSync ? fmt(health.lastSync) : 'Never'}
                {health.syncAge !== null && <span style={{ marginLeft: '8px', color: health.syncOk ? 'var(--accent-green)' : '#e53935', fontWeight: '700' }}>
                  ({health.syncAge}m ago)
                </span>}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Free tier: trigger sync manually using "Sync Scores Now" above. Run after each match finishes.
              </div>
            </div>
          </div>
        )}

        {/* ── MATCHES ── */}
        {activeTab === 'matches' && (
          <div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {['group', 'r32', 'r16', 'qf', 'sf', '3rd', 'final'].map(stage => (
                <button key={stage} onClick={() => setStageFilter(stage)} className="btn btn-sm" style={{
                  background: stageFilter === stage ? 'var(--primary)' : 'var(--bg-card)',
                  color: stageFilter === stage ? 'white' : 'var(--text-secondary)',
                  border: '1px solid var(--border-light)',
                }}>
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
                        #{match.match_number} · {fmt(match.kickoff_time)}
                        {match.use_manual_override && <span style={{ marginLeft: '6px', color: 'var(--accent-orange)', fontWeight: '700' }}>MANUAL</span>}
                      </div>
                      <span className={`badge ${match.status === 'completed' ? 'badge-green' : match.status === 'live' ? 'badge-red' : 'badge-gray'}`}>
                        {match.status}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '24px' }}>{match.home_team?.flag_emoji}</div>
                        <div style={{ fontSize: '12px', fontWeight: '700' }}>{match.home_team?.short_code}</div>
                      </div>
                      <div style={{ textAlign: 'center', fontSize: '20px', fontWeight: '800', fontFamily: 'var(--font-mono)' }}>
                        {match.status === 'completed' || match.status === 'live'
                          ? `${match.home_score ?? '?'} – ${match.away_score ?? '?'}`
                          : 'vs'}
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '24px' }}>{match.away_team?.flag_emoji}</div>
                        <div style={{ fontSize: '12px', fontWeight: '700' }}>{match.away_team?.short_code}</div>
                      </div>
                    </div>
                    {isEditing && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                        <input type="number" min="0" max="20" value={s.home} onChange={e => setScores(prev => ({ ...prev, [match.id]: { ...s, home: e.target.value } }))}
                          className="score-input" style={{ width: '52px', height: '40px', fontSize: '18px', fontWeight: '700', textAlign: 'center', border: '2px solid var(--border-medium)', borderRadius: 'var(--radius-sm)' }} />
                        <span style={{ fontWeight: '800', color: 'var(--text-muted)' }}>–</span>
                        <input type="number" min="0" max="20" value={s.away} onChange={e => setScores(prev => ({ ...prev, [match.id]: { ...s, away: e.target.value } }))}
                          className="score-input" style={{ width: '52px', height: '40px', fontSize: '18px', fontWeight: '700', textAlign: 'center', border: '2px solid var(--border-medium)', borderRadius: 'var(--radius-sm)' }} />
                        <button onClick={() => saveMatchResult(match)} disabled={saving[match.id]} className="btn btn-primary btn-sm">
                          {saving[match.id] ? '...' : 'Save'}
                        </button>
                        <button onClick={() => setEditingMatch(null)} className="btn btn-secondary btn-sm">Cancel</button>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button onClick={() => { setEditingMatch(match.id); setScores(prev => ({ ...prev, [match.id]: { home: match.home_score ?? 0, away: match.away_score ?? 0 } })) }}
                        className="btn btn-secondary btn-sm">✏️ Set Score</button>
                      {match.status !== 'live' && <button onClick={() => setMatchLive(match.id)} className="btn btn-sm" style={{ background: '#e53935', color: 'white', border: 'none' }}>🔴 Set Live</button>}
                      {match.use_manual_override && <button onClick={() => resetMatchOverride(match.id)} className="btn btn-sm" style={{ background: 'var(--accent-gold-light)', color: 'var(--accent-gold)', border: '1px solid var(--accent-gold)' }}>↺ Reset Override</button>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── AWARDS ── */}
        {activeTab === 'awards' && (
          <AwardsTab
            awardResults={awardResults}
            awardSaving={awardSaving}
            saveAwardResult={saveAwardResult}
          />
        )}

        {/* ── USERS ── */}
        {activeTab === 'users' && (
          <div>
            <input className="input" placeholder="Search by username or email..." value={userSearch} onChange={e => setUserSearch(e.target.value)} style={{ marginBottom: '16px' }} />
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>{filteredUsers.length} users</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredUsers.map(u => (
                <div key={u.id} className="card" style={{ opacity: u.is_banned ? 0.6 : 1, border: u.is_banned ? '1px solid #e53935' : '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '800' }}>
                        {(u.username || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '14px' }}>
                          {u.username}
                          {u.is_admin && <span style={{ marginLeft: '6px', fontSize: '10px', background: 'var(--accent-orange)', color: 'white', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>ADMIN</span>}
                          {u.is_banned && <span style={{ marginLeft: '6px', fontSize: '10px', background: '#e53935', color: 'white', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>BANNED</span>}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{u.email}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '800', fontSize: '16px', color: 'var(--accent-green)', fontFamily: 'var(--font-mono)' }}>{u.total_points || 0} pts</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Joined {fmt(u.created_at)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {u.is_banned
                      ? <button onClick={() => unbanUser(u.id, u.username)} className="btn btn-sm" style={{ background: 'var(--accent-green)', color: 'white', border: 'none' }}>✓ Unban</button>
                      : <button onClick={() => setConfirmAction({ type: 'ban', userId: u.id, username: u.username })} className="btn btn-sm" style={{ background: '#e53935', color: 'white', border: 'none' }}>🚫 Ban</button>
                    }
                    <button onClick={() => setConfirmAction({ type: 'reset', userId: u.id, username: u.username })} className="btn btn-secondary btn-sm">↺ Reset Predictions</button>
                    {!u.is_admin && <button onClick={() => setConfirmAction({ type: 'makeAdmin', userId: u.id, username: u.username })} className="btn btn-sm" style={{ border: '1px solid var(--accent-orange)', color: 'var(--accent-orange)', background: 'none' }}>⭐ Make Admin</button>}
                    <button onClick={() => setPointAdjUser(u.id)} className="btn btn-sm" style={{ border: '1px solid var(--accent-blue)', color: 'var(--accent-blue)', background: 'none' }}>🎯 Adjust Points</button>
                  </div>
                  {pointAdjUser === u.id && (
                    <div style={{ marginTop: '10px', padding: '12px', background: 'var(--accent-blue-light)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600' }}>Adjust points for {u.username}</div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input type="number" placeholder="+10 or -5" value={pointAdjAmount} onChange={e => setPointAdjAmount(e.target.value)}
                          className="input" style={{ width: '100px' }} />
                        <input type="text" placeholder="Reason..." value={pointAdjReason} onChange={e => setPointAdjReason(e.target.value)}
                          className="input" style={{ flex: 1 }} />
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={applyPointAdjustment} className="btn btn-primary btn-sm">Apply</button>
                        <button onClick={() => setPointAdjUser(null)} className="btn btn-secondary btn-sm">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── LEAGUES ── */}
        {activeTab === 'leagues' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>{leagues.length} leagues total</div>
            {leagues.map(league => (
              <div key={league.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '15px' }}>{league.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Created by {league.creator?.username || '?'} · {fmt(league.created_at)}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Code: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: 'var(--text-primary)' }}>{league.invite_code}</span>
                      {league.is_private && <span style={{ marginLeft: '6px' }}>🔒 Private</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '800', fontSize: '16px', fontFamily: 'var(--font-mono)' }}>
                      {league.members?.length ?? 0} members
                    </div>
                  </div>
                </div>

                {/* Member list with remove buttons */}
                {league.members?.length > 0 && (
                  <div style={{ marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {league.members.map(m => (
                      <div key={m.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600' }}>{m.profile?.username || 'Unknown'}</span>
                        <button
                          onClick={() => setConfirmAction({ type: 'removeMember', leagueId: league.id, userId: m.user_id, username: m.profile?.username, leagueName: league.name })}
                          style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', border: '1px solid #e53935', color: '#e53935', background: 'none', cursor: 'pointer' }}
                        >Remove</button>
                      </div>
                    ))}
                  </div>
                )}

                <button onClick={() => setConfirmAction({ type: 'deleteLeague', leagueId: league.id, leagueName: league.name })}
                  className="btn btn-sm" style={{ background: '#e53935', color: 'white', border: 'none' }}>
                  🗑️ Delete League
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── POINTS ── */}
        {activeTab === 'points' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="card">
              <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '12px' }}>Leaderboard Overview</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {users.slice(0, 20).map((u, i) => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', width: '24px' }}>#{i + 1}</span>
                    <span style={{ flex: 1, fontSize: '13px', fontWeight: '600' }}>{u.username}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '800', fontSize: '14px', color: 'var(--accent-green)' }}>{u.total_points || 0}</span>
                    <button onClick={() => setPointAdjUser(u.id)} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--accent-blue)', color: 'var(--accent-blue)', background: 'none', cursor: 'pointer' }}>
                      Adjust
                    </button>
                    {pointAdjUser === u.id && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <input type="number" placeholder="±pts" value={pointAdjAmount} onChange={e => setPointAdjAmount(e.target.value)}
                          style={{ width: '70px', padding: '3px 6px', border: '1px solid var(--border-medium)', borderRadius: '4px', fontSize: '12px' }} />
                        <input type="text" placeholder="reason" value={pointAdjReason} onChange={e => setPointAdjReason(e.target.value)}
                          style={{ width: '100px', padding: '3px 6px', border: '1px solid var(--border-medium)', borderRadius: '4px', fontSize: '12px' }} />
                        <button onClick={applyPointAdjustment} style={{ padding: '3px 8px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>✓</button>
                        <button onClick={() => setPointAdjUser(null)} style={{ padding: '3px 8px', background: 'var(--bg-tertiary)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>×</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <button onClick={recalcAllPoints} disabled={saving.recalc} className="btn btn-primary">
              {saving.recalc ? '⏳ Recalculating...' : '🔄 Recalculate All Points'}
            </button>
          </div>
        )}

        {/* ── AUDIT LOG ── */}
        {activeTab === 'audit' && (
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>Last 50 admin actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {auditLog.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No admin actions yet</div>
              ) : auditLog.map(log => (
                <div key={log.id} style={{ padding: '10px 14px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{log.action}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0, marginLeft: '8px' }}>{fmt(log.created_at)}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    By {log.admin?.username || 'unknown'} · {log.details}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SETTINGS ── */}
        {activeTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { section: '🏆 Tournament State' },
              { key: 'tournament_phase', label: 'Tournament Phase', desc: 'pre_tournament → group_stage → knockout → complete', type: 'text' },
              { key: 'group_stage_complete', label: 'Group Stage Complete', desc: 'Override: marks group stage as done, unlocks knockout bracket', type: 'toggle' },
              { key: 'knockout_picks_open', label: 'Knockout Picks Open', desc: 'Allow users to make/edit knockout picks', type: 'toggle' },
              { key: 'last32_banner_visible', label: 'Last 32 Banner Visible', desc: 'Show "Last 32 is coming" banner on home page', type: 'toggle' },
              { key: 'last32_predictions_open', label: 'Last 32 Predictions Open', desc: 'Unlock Last 32 mini-game predictions', type: 'toggle' },
              { section: '⚽ Predictions' },
              { key: 'predictions_open', label: 'Group Predictions Open', desc: 'Allow users to make/edit group stage predictions', type: 'toggle' },
              { key: 'awards_locked', label: 'Awards Locked', desc: 'Override: lock award predictions early', type: 'toggle' },
              { section: '🔄 Live Data' },
              { key: 'live_api_enabled', label: 'Live Score Sync', desc: 'Enable automatic score syncing from football-data.org', type: 'toggle' },
              { key: 'show_odds', label: 'Show Betting Odds', desc: 'Display odds on prediction cards', type: 'toggle' },
              { section: '🔧 Platform' },
              { key: 'maintenance_mode', label: 'Maintenance Mode', desc: 'Show maintenance message to all non-admin users', type: 'toggle' },
              { key: 'registration_open', label: 'Registration Open', desc: 'Allow new user registrations', type: 'toggle' },
            ].map((setting, idx) => (
              setting.section ? (
                <div key={idx} style={{ fontWeight: '800', fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: idx > 0 ? '8px' : 0 }}>
                  {setting.section}
                </div>
              ) :
              <div key={setting.key} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '2px' }}>{setting.label}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{setting.desc}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>key: {setting.key}</div>
                  </div>
                  {setting.type === 'toggle' ? (
                    <button
                      onClick={() => updateSetting(setting.key, settings[setting.key] === 'true' ? 'false' : 'true')}
                      style={{
                        width: '48px', height: '26px', borderRadius: '13px', border: 'none', cursor: 'pointer', flexShrink: 0,
                        background: settings[setting.key] === 'true' ? 'var(--accent-green)' : 'var(--bg-tertiary)',
                        position: 'relative', transition: 'background 0.2s',
                      }}
                    >
                      <span style={{
                        position: 'absolute', top: '3px',
                        left: settings[setting.key] === 'true' ? '25px' : '3px',
                        width: '20px', height: '20px', borderRadius: '50%',
                        background: 'white', transition: 'left 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }} />
                    </button>
                  ) : (
                    <input
                      type="text"
                      value={settings[setting.key] || ''}
                      onChange={e => setSettings(prev => ({ ...prev, [setting.key]: e.target.value }))}
                      onBlur={e => updateSetting(setting.key, e.target.value)}
                      className="input"
                      style={{ width: '160px' }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm dialog */}
      {confirmAction && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ maxWidth: '360px', width: '100%' }}>
            <div style={{ fontWeight: '800', fontSize: '16px', marginBottom: '8px' }}>
              {confirmAction.type === 'ban' ? '🚫 Ban User' :
               confirmAction.type === 'reset' ? '↺ Reset Predictions' :
               confirmAction.type === 'makeAdmin' ? '⭐ Make Admin' :
               confirmAction.type === 'removeMember' ? '👤 Remove Member' :
               '🗑️ Delete League'}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              {confirmAction.type === 'ban' ? `Ban ${confirmAction.username}? They won't be able to sign in.` :
               confirmAction.type === 'reset' ? `Delete all predictions for ${confirmAction.username}? This cannot be undone.` :
               confirmAction.type === 'makeAdmin' ? `Give ${confirmAction.username} admin access?` :
               confirmAction.type === 'removeMember' ? `Remove ${confirmAction.username} from "${confirmAction.leagueName}"?` :
               `Delete league "${confirmAction.leagueName}"? All members will be removed.`}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => {
                if (confirmAction.type === 'ban') banUser(confirmAction.userId, confirmAction.username)
                else if (confirmAction.type === 'reset') resetUserPredictions(confirmAction.userId, confirmAction.username)
                else if (confirmAction.type === 'makeAdmin') makeAdmin(confirmAction.userId, confirmAction.username)
                else if (confirmAction.type === 'removeMember') removeMemberFromLeague(confirmAction.leagueId, confirmAction.userId, confirmAction.username, confirmAction.leagueName)
                else if (confirmAction.type === 'deleteLeague') deleteLeague(confirmAction.leagueId, confirmAction.leagueName)
                setConfirmAction(null)
              }} className="btn btn-primary" style={{ background: '#e53935', flex: 1 }}>Confirm</button>
              <button onClick={() => setConfirmAction(null)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
