import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/index.js'

const TABS = [
  { key: 'health',   label: '🩺 Health' },
  { key: 'matches',  label: '⚽ Matches' },
  { key: 'awards',   label: '🥇 Awards' },
  { key: 'ko',       label: '🔥 KO Predictor' },
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

  // KO Predictor state
  const [koMatches, setKoMatches] = useState([])
  const [koLeagues, setKoLeagues] = useState([])
  const [koUsers, setKoUsers] = useState([])
  const [koEditingMatch, setKoEditingMatch] = useState(null)
  const [koScores, setKoScores] = useState({})
  const [koSaving, setKoSaving] = useState({})
  const [koStageFilter, setKoStageFilter] = useState('r32')
  const [koPointAdjUser, setKoPointAdjUser] = useState(null)
  const [koPointAdjAmount, setKoPointAdjAmount] = useState('')
  const [koPointAdjReason, setKoPointAdjReason] = useState('')

  // Test mode state
  const [testMatchId, setTestMatchId] = useState('')
  const [testHome, setTestHome] = useState('')
  const [testAway, setTestAway] = useState('')
  const [testResult, setTestResult] = useState(null)
  const [testLoading, setTestLoading] = useState(false)
  const [editingLeagueName, setEditingLeagueName] = useState(null) // leagueId
  const [editingLeagueNameVal, setEditingLeagueNameVal] = useState('')
  const [addingMemberTo, setAddingMemberTo] = useState(null) // leagueId
  const [addMemberSearch, setAddMemberSearch] = useState('')
  const [showCreateLeague, setShowCreateLeague] = useState(false)
  const [newLeagueName, setNewLeagueName] = useState('')
  const [newLeagueCreatingFor, setNewLeagueCreatingFor] = useState('')
  const [newLeagueIsGlobal, setNewLeagueIsGlobal] = useState(false)

  useEffect(() => {
    if (!user || !isAdmin) { navigate('/'); return }
    loadAll()
  }, [user, isAdmin])

  useEffect(() => {
    if (activeTab === 'ko') loadKoData()
    if (activeTab === 'settings') loadSettings()
  }, [activeTab])

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
      const res = await fetch('/.netlify/functions/prepopulate-matches', { method: 'GET' })
      const data = await res.json()
      if (data.error) {
        setActionResult(`Pre-populate error: ${data.error}`)
      } else {
        setActionResult(`Pre-populate complete — ${data.matched} IDs stored, ${data.skipped} already set, ${data.notFound?.length || 0} not found`)
      }
      await logAudit('PREPOPULATE_MATCH_IDS', { matched: data.matched, skipped: data.skipped })
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

  // ── KO Predictor functions ──────────────────────────────────

  const loadKoData = async () => {
    const [matchRes, leagueRes, userRes] = await Promise.all([
      supabase.from('matches')
        .select('*, home_team:home_team_id(name,flag_emoji,short_code), away_team:away_team_id(name,flag_emoji,short_code)')
        .in('stage', ['r32','r16','qf','sf','3rd','final'])
        .order('kickoff_time', { ascending: true }),
      supabase.from('ko_leagues')
        .select('*, creator:created_by(username), members:ko_league_members(user_id, profile:user_id(username))')
        .order('created_at', { ascending: false }),
      supabase.from('profiles')
        .select('id, username, ko_points, ko_streak_current, ko_exact_scores, ko_jokers_remaining')
        .order('ko_points', { ascending: false })
        .limit(100),
    ])
    setKoMatches(matchRes.data || [])
    setKoLeagues(leagueRes.data || [])
    setKoUsers(userRes.data || [])
  }

  const saveKoMatchResult = async (match) => {
    const s = koScores[match.id] || {}
    if (s.home === undefined || s.away === undefined) return
    setKoSaving(prev => ({ ...prev, [match.id]: true }))
    const homeScore = parseInt(s.home)
    const awayScore = parseInt(s.away)
    const outcomeType = s.outcome_type || '90mins'
    const winnerId = s.winner_id ||
      (homeScore > awayScore ? match.home_team_id :
       awayScore > homeScore ? match.away_team_id : null)

    const { error } = await supabase.from('matches').update({
      home_score: homeScore,
      away_score: awayScore,
      winner_team_id: winnerId,
      outcome_type: outcomeType,
      aet_home_score: s.aet_home ? parseInt(s.aet_home) : null,
      aet_away_score: s.aet_away ? parseInt(s.aet_away) : null,
      first_goal_band: s.first_goal_band || null,
      status: 'completed',
      use_manual_override: true,
    }).eq('id', match.id)

    if (error) { setActionResult(`❌ Error: ${error.message}`); setKoSaving(prev => ({ ...prev, [match.id]: false })); return }

    const { error: rpcErr } = await supabase.rpc('calculate_ko_prediction_points', { p_match_id: match.id })
    if (rpcErr) setActionResult(`⚠️ Score saved but KO points calc failed: ${rpcErr.message}`)
    else setActionResult(`✅ KO Match ${match.match_number} result saved — points calculated`)

    await logAudit('KO_SCORE_ENTRY', { match_id: match.id, match_number: match.match_number, home: homeScore, away: awayScore, outcome: outcomeType })
    setKoEditingMatch(null)
    loadKoData()
    setKoSaving(prev => ({ ...prev, [match.id]: false }))
  }

  const recalcAllKoPoints = async () => {
    setKoSaving(prev => ({ ...prev, recalc: true }))
    const { data: userList } = await supabase.from('profiles').select('id')
    let failed = 0
    for (const u of userList || []) {
      const { error } = await supabase.rpc('recalculate_user_ko_points', { p_user_id: u.id })
      if (error) failed++
    }
    await logAudit('KO_RECALC_ALL', { user_count: userList?.length, failed })
    setKoSaving(prev => ({ ...prev, recalc: false }))
    setActionResult(`✅ KO points recalculated for ${userList?.length} users${failed > 0 ? ` (${failed} failed)` : ''}`)
    loadKoData()
  }

  const applyKoPointAdjustment = async () => {
    if (!koPointAdjUser || !koPointAdjAmount || !koPointAdjReason) {
      setActionResult('Please fill in amount and reason'); return
    }
    const amount = parseInt(koPointAdjAmount)
    if (isNaN(amount)) { setActionResult('Amount must be a number'); return }
    const u = koUsers.find(u => u.id === koPointAdjUser)
    const newPoints = (u?.ko_points || 0) + amount
    const { error } = await supabase.from('profiles').update({ ko_points: newPoints }).eq('id', koPointAdjUser)
    if (error) { setActionResult(`❌ Error: ${error.message}`); return }
    await logAudit('KO_POINT_ADJUSTMENT', { user_id: koPointAdjUser, username: u?.username, amount, reason: koPointAdjReason, new_total: newPoints })
    setActionResult(`✅ Adjusted ${u?.username} KO points by ${amount > 0 ? '+' : ''}${amount}`)
    setKoPointAdjUser(null); setKoPointAdjAmount(''); setKoPointAdjReason('')
    loadKoData()
  }

  const deleteKoLeague = async (leagueId, leagueName) => {
    await supabase.from('ko_league_members').delete().eq('league_id', leagueId)
    const { error } = await supabase.from('ko_leagues').delete().eq('id', leagueId)
    if (error) { setActionResult(`❌ Error: ${error.message}`); return }
    await logAudit('DELETE_KO_LEAGUE', { league_id: leagueId, name: leagueName })
    setActionResult(`✅ Deleted KO league: ${leagueName}`)
    loadKoData()
  }

  const runTestPreview = async () => {
    if (!testMatchId || testHome === '' || testAway === '') return
    setTestLoading(true)
    setTestResult(null)

    const homeScore = parseInt(testHome)
    const awayScore = parseInt(testAway)
    const actualResult = homeScore > awayScore ? 'H' : awayScore > homeScore ? 'A' : 'D'

    // Get all predictions for this match
    const { data: preds } = await supabase
      .from('predictions')
      .select('user_id, home_score, away_score, is_confident, profiles:user_id(username)')
      .eq('match_id', testMatchId)

    const results = (preds || []).map(p => {
      const predResult = p.home_score > p.away_score ? 'H' : p.away_score > p.home_score ? 'A' : 'D'
      const exact = p.home_score === homeScore && p.away_score === awayScore
      const correct = predResult === actualResult
      const base = exact ? 10 : correct ? 5 : 0
      const joker = p.is_confident ? 2 : 1
      return {
        username: p.profiles?.username || 'Unknown',
        home: p.home_score,
        away: p.away_score,
        exact,
        correct,
        points: base * joker,
      }
    }).sort((a, b) => b.points - a.points)

    setTestResult(results)
    setTestLoading(false)
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
    // Step 1: delete members
    const { error: membErr } = await supabase
      .from('league_members')
      .delete()
      .eq('league_id', leagueId)
    if (membErr) {
      setActionResult(`❌ Error removing members: ${membErr.message} (code: ${membErr.code})`)
      return
    }
    // Step 2: delete league
    const { error: leagErr } = await supabase
      .from('leagues')
      .delete()
      .eq('id', leagueId)
    if (leagErr) {
      setActionResult(`❌ Error deleting league: ${leagErr.message} (code: ${leagErr.code})`)
      return
    }
    await logAudit('DELETE_LEAGUE', { league_id: leagueId, name: leagueName })
    setActionResult(`✅ Deleted league: ${leagueName}`)
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

  const renameLeague = async (leagueId, newName) => {
    if (!newName.trim()) return
    const { error } = await supabase.from('leagues').update({ name: newName.trim() }).eq('id', leagueId)
    if (error) { setActionResult(`❌ Error renaming: ${error.message}`); return }
    await logAudit('RENAME_LEAGUE', { league_id: leagueId, new_name: newName })
    setActionResult(`✅ League renamed to "${newName}"`)
    setEditingLeagueName(null)
    loadLeagues()
  }

  const addMemberToLeague = async (leagueId, leagueName, userId, username) => {
    // Check not already a member
    const { data: existing } = await supabase
      .from('league_members')
      .select('id')
      .eq('league_id', leagueId)
      .eq('user_id', userId)
      .maybeSingle()
    if (existing) { setActionResult(`${username} is already in this league`); return }
    const { error } = await supabase.from('league_members').insert({ league_id: leagueId, user_id: userId })
    if (error) { setActionResult(`❌ Error adding member: ${error.message}`); return }
    await logAudit('ADD_LEAGUE_MEMBER', { league_id: leagueId, user_id: userId, username, league: leagueName })
    setActionResult(`✅ Added ${username} to ${leagueName}`)
    setAddingMemberTo(null)
    setAddMemberSearch('')
    loadLeagues()
  }

  const createLeague = async () => {
    if (!newLeagueName.trim()) return
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    const creatorUser = users.find(u => u.username?.toLowerCase() === newLeagueCreatingFor.toLowerCase())
    const { data: league, error } = await supabase.from('leagues').insert({
      name: newLeagueName.trim(),
      invite_code: code,
      created_by: creatorUser?.id || user.id,
      is_global: newLeagueIsGlobal || false,
    }).select().single()
    if (error) { setActionResult(`❌ Error creating league: ${error.message}`); return }
    // Add creator as member
    await supabase.from('league_members').insert({ league_id: league.id, user_id: creatorUser?.id || user.id })
    await logAudit('CREATE_LEAGUE', { league_id: league.id, name: newLeagueName, code })
    setActionResult(`✅ Created league "${newLeagueName}" with code ${code}`)
    setShowCreateLeague(false)
    setNewLeagueName('')
    setNewLeagueCreatingFor('')
    setNewLeagueIsGlobal(false)
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
      <div style={{ background: 'linear-gradient(135deg, #003087, #005eb8)', padding: '20px', color: 'white' }}>
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
                      {/* Set Score */}
                      <button onClick={() => { setEditingMatch(match.id); setScores(prev => ({ ...prev, [match.id]: { home: match.home_score ?? '', away: match.away_score ?? '' } })) }}
                        className="btn btn-secondary btn-sm">✏️ Set Score</button>

                      {/* Set Live */}
                      {match.status !== 'live' && match.status !== 'completed' && (
                        <button onClick={() => setMatchLive(match.id)}
                          className="btn btn-sm" style={{ background: '#e53935', color: 'white', border: 'none' }}>
                          🔴 Set Live
                        </button>
                      )}

                      {/* Set Scheduled (revert from live) */}
                      {match.status === 'live' && (
                        <button onClick={async () => {
                          await supabase.from('matches').update({ status: 'scheduled' }).eq('id', match.id)
                          await logAudit('SET_SCHEDULED', { match_id: match.id })
                          setActionResult('Match set back to scheduled')
                          loadMatches()
                        }} className="btn btn-sm" style={{ background: 'var(--accent-blue)', color: 'white', border: 'none' }}>
                          📅 Set Scheduled
                        </button>
                      )}

                      {/* Revert to API */}
                      {match.use_manual_override && (
                        <button onClick={() => resetMatchOverride(match.id)}
                          className="btn btn-sm" style={{ background: '#fff3e0', color: '#e65100', border: '1px solid #e65100' }}>
                          🔄 Revert to API
                        </button>
                      )}

                      {/* Mark completed (for testing) */}
                      {match.status !== 'completed' && match.home_score !== null && (
                        <button onClick={async () => {
                          const winnerId = match.home_score > match.away_score ? match.home_team_id : match.away_score > match.home_score ? match.away_team_id : null
                          await supabase.from('matches').update({ status: 'completed', winner_team_id: winnerId, use_manual_override: true }).eq('id', match.id)
                          await supabase.rpc('calculate_prediction_points', { p_match_id: match.id })
                          await logAudit('MARK_COMPLETED', { match_id: match.id })
                          setActionResult(`✅ Match ${match.match_number} marked complete — points calculated`)
                          loadMatches()
                        }} className="btn btn-sm" style={{ background: 'var(--accent-green)', color: 'white', border: 'none' }}>
                          ✅ Mark Complete
                        </button>
                      )}
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

        {/* ── KO PREDICTOR ── */}
        {activeTab === 'ko' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Info banner */}
            <div className="card" style={{ background: '#fff3e0', border: '1px solid #ff9800' }}>
              <div style={{ fontSize: '13px', color: '#e65100', fontWeight: '600' }}>
                🔥 Knockout Predictor — "Your Second Chance" launches 27 Jun 23:00 BST when all teams are confirmed.
                Use this panel to enter match results, manage leagues, and adjust points.
              </div>
            </div>

            {/* Quick actions */}
            <div className="card">
              <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '12px' }}>Quick Actions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button onClick={recalcAllKoPoints} disabled={koSaving.recalc} className="btn btn-primary" style={{ background: '#e65100' }}>
                  {koSaving.recalc ? '⏳ Recalculating...' : '🔄 Recalculate All KO Points'}
                </button>
                <button onClick={loadKoData} className="btn btn-secondary">🔃 Refresh KO Data</button>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {[
                { label: 'KO Leagues', value: koLeagues.length, icon: '🏆' },
                { label: 'Players', value: koUsers.length, icon: '👥' },
                { label: 'Predictions', value: '—', icon: '🎯' },
              ].map(s => (
                <div key={s.label} className="card" style={{ textAlign: 'center', padding: '14px' }}>
                  <div style={{ fontSize: '24px' }}>{s.icon}</div>
                  <div style={{ fontWeight: '800', fontSize: '20px', fontFamily: 'var(--font-mono)' }}>{s.value}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Match results entry */}
            <div className="card">
              <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '12px' }}>🔥 KO Match Results</div>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
                {['r32','r16','qf','sf','3rd','final'].map(stage => (
                  <button key={stage} onClick={() => setKoStageFilter(stage)} className="btn btn-sm" style={{
                    background: koStageFilter === stage ? '#e65100' : 'var(--bg-card)',
                    color: koStageFilter === stage ? 'white' : 'var(--text-secondary)',
                    border: '1px solid var(--border-light)',
                  }}>
                    {stage.toUpperCase()}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {koMatches.filter(m => m.stage === koStageFilter).map(match => {
                  const isEditing = koEditingMatch === match.id
                  const s = koScores[match.id] || {}
                  const isDraw = parseInt(s.home) === parseInt(s.away) && s.home !== '' && s.away !== ''
                  return (
                    <div key={match.id} className="card" style={{ border: match.status === 'completed' ? '1px solid var(--accent-green)' : '1px solid var(--border-light)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                          Match #{match.match_number} · {fmt(match.kickoff_time)}
                          {match.use_manual_override && <span style={{ marginLeft: '6px', color: 'var(--accent-orange)' }}>MANUAL</span>}
                        </div>
                        <span className={`badge ${match.status === 'completed' ? 'badge-green' : match.status === 'live' ? 'badge-red' : 'badge-gray'}`}>
                          {match.status}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '22px' }}>{match.home_team?.flag_emoji || '🏳️'}</div>
                          <div style={{ fontSize: '12px', fontWeight: '700' }}>{match.home_team?.short_code || '?'}</div>
                        </div>
                        <div style={{ textAlign: 'center', fontSize: '18px', fontWeight: '800', fontFamily: 'var(--font-mono)' }}>
                          {match.status === 'completed' ? `${match.home_score ?? '?'} – ${match.away_score ?? '?'}` : 'vs'}
                          {match.outcome_type && match.outcome_type !== '90mins' && (
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>
                              {match.outcome_type === 'et' ? 'AET' : 'PENS'}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '22px' }}>{match.away_team?.flag_emoji || '🏳️'}</div>
                          <div style={{ fontSize: '12px', fontWeight: '700' }}>{match.away_team?.short_code || '?'}</div>
                        </div>
                      </div>

                      {isEditing && (
                        <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', marginBottom: '10px' }}>
                          {/* Score */}
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                            <input type="number" min="0" max="20" placeholder="H"
                              value={s.home || ''}
                              onChange={e => setKoScores(p => ({ ...p, [match.id]: { ...s, home: e.target.value } }))}
                              style={{ width: '52px', height: '40px', fontSize: '18px', fontWeight: '700', textAlign: 'center', border: '2px solid var(--border-medium)', borderRadius: 'var(--radius-sm)' }} />
                            <span style={{ fontWeight: '800', color: 'var(--text-muted)' }}>–</span>
                            <input type="number" min="0" max="20" placeholder="A"
                              value={s.away || ''}
                              onChange={e => setKoScores(p => ({ ...p, [match.id]: { ...s, away: e.target.value } }))}
                              style={{ width: '52px', height: '40px', fontSize: '18px', fontWeight: '700', textAlign: 'center', border: '2px solid var(--border-medium)', borderRadius: 'var(--radius-sm)' }} />
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>90 min score</span>
                          </div>

                          {/* Outcome type */}
                          <div style={{ marginBottom: '10px' }}>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>How did it end?</div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {['90mins', 'et', 'penalties'].map(ot => (
                                <button key={ot} onClick={() => setKoScores(p => ({ ...p, [match.id]: { ...s, outcome_type: ot } }))}
                                  style={{
                                    padding: '5px 10px', fontSize: '12px', fontWeight: '600', borderRadius: '6px', cursor: 'pointer',
                                    background: (s.outcome_type || '90mins') === ot ? '#e65100' : 'var(--bg-card)',
                                    color: (s.outcome_type || '90mins') === ot ? 'white' : 'var(--text-secondary)',
                                    border: '1px solid var(--border-light)',
                                  }}>
                                  {ot === '90mins' ? '90 mins' : ot === 'et' ? 'Extra Time' : 'Penalties'}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Winner picker (ET or Pens) */}
                          {(s.outcome_type === 'et' || s.outcome_type === 'penalties') && (
                            <div style={{ marginBottom: '10px' }}>
                              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>Winner</div>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                {[
                                  { id: match.home_team_id, label: match.home_team?.short_code },
                                  { id: match.away_team_id, label: match.away_team?.short_code },
                                ].map(team => (
                                  <button key={team.id} onClick={() => setKoScores(p => ({ ...p, [match.id]: { ...s, winner_id: team.id } }))}
                                    style={{
                                      padding: '5px 14px', fontSize: '13px', fontWeight: '700', borderRadius: '6px', cursor: 'pointer',
                                      background: s.winner_id === team.id ? '#e65100' : 'var(--bg-card)',
                                      color: s.winner_id === team.id ? 'white' : 'var(--text-secondary)',
                                      border: '1px solid var(--border-light)',
                                    }}>
                                    {team.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* First goal band */}
                          <div style={{ marginBottom: '10px' }}>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>First Goal Minute (optional)</div>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {['1-15','16-30','31-45','46-60','61-75','76-90','et','no_goals'].map(band => (
                                <button key={band} onClick={() => setKoScores(p => ({ ...p, [match.id]: { ...s, first_goal_band: s.first_goal_band === band ? null : band } }))}
                                  style={{
                                    padding: '3px 8px', fontSize: '11px', borderRadius: '4px', cursor: 'pointer',
                                    background: s.first_goal_band === band ? 'var(--accent-blue)' : 'var(--bg-card)',
                                    color: s.first_goal_band === band ? 'white' : 'var(--text-muted)',
                                    border: '1px solid var(--border-light)',
                                  }}>
                                  {band}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => saveKoMatchResult(match)} disabled={koSaving[match.id]} className="btn btn-primary btn-sm" style={{ background: '#e65100' }}>
                              {koSaving[match.id] ? '...' : 'Save & Calculate Points'}
                            </button>
                            <button onClick={() => setKoEditingMatch(null)} className="btn btn-secondary btn-sm">Cancel</button>
                          </div>
                        </div>
                      )}

                      {!isEditing && (
                        <button onClick={() => {
                          setKoEditingMatch(match.id)
                          setKoScores(p => ({ ...p, [match.id]: {
                            home: match.home_score ?? '',
                            away: match.away_score ?? '',
                            outcome_type: match.outcome_type || '90mins',
                            winner_id: match.winner_team_id || null,
                            first_goal_band: match.first_goal_band || null,
                          }}))
                        }} className="btn btn-secondary btn-sm">
                          ✏️ {match.status === 'completed' ? 'Edit Result' : 'Enter Result'}
                        </button>
                      )}
                    </div>
                  )
                })}
                {koMatches.filter(m => m.stage === koStageFilter).length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No matches found for this stage
                  </div>
                )}
              </div>
            </div>

            {/* KO Leaderboard */}
            <div className="card">
              <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '12px' }}>🔥 KO Leaderboard</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {koUsers.filter(u => u.ko_points > 0).slice(0, 20).map((u, i) => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', width: '24px' }}>#{i + 1}</span>
                    <span style={{ flex: 1, fontSize: '13px', fontWeight: '600' }}>{u.username}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '800', fontSize: '14px', color: '#e65100' }}>{u.ko_points}</span>
                    <button onClick={() => setKoPointAdjUser(u.id)}
                      style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--accent-blue)', color: 'var(--accent-blue)', background: 'none', cursor: 'pointer' }}>
                      Adjust
                    </button>
                    {koPointAdjUser === u.id && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <input type="number" placeholder="±pts" value={koPointAdjAmount} onChange={e => setKoPointAdjAmount(e.target.value)}
                          style={{ width: '70px', padding: '3px 6px', border: '1px solid var(--border-medium)', borderRadius: '4px', fontSize: '12px' }} />
                        <input type="text" placeholder="reason" value={koPointAdjReason} onChange={e => setKoPointAdjReason(e.target.value)}
                          style={{ width: '100px', padding: '3px 6px', border: '1px solid var(--border-medium)', borderRadius: '4px', fontSize: '12px' }} />
                        <button onClick={applyKoPointAdjustment} style={{ padding: '3px 8px', background: '#e65100', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>✓</button>
                        <button onClick={() => setKoPointAdjUser(null)} style={{ padding: '3px 8px', background: 'var(--bg-tertiary)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>×</button>
                      </div>
                    )}
                  </div>
                ))}
                {koUsers.filter(u => u.ko_points > 0).length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No KO points awarded yet — launches 27 Jun
                  </div>
                )}
              </div>
            </div>

            {/* KO Leagues */}
            <div className="card">
              <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '12px' }}>🏆 KO Leagues ({koLeagues.length})</div>
              {koLeagues.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No KO leagues created yet
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {koLeagues.map(league => (
                    <div key={league.id} style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '14px' }}>{league.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Code: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700' }}>{league.invite_code}</span>
                            · Created by {league.creator?.username || '?'}
                            · {league.members?.length || 0} members
                          </div>
                        </div>
                        <button onClick={() => setConfirmAction({ type: 'deleteKoLeague', leagueId: league.id, leagueName: league.name })}
                          className="btn btn-sm" style={{ background: '#e53935', color: 'white', border: 'none' }}>
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
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

            {/* Create League */}
            <button onClick={() => setShowCreateLeague(!showCreateLeague)} className="btn btn-primary">
              ➕ Create New League
            </button>
            {showCreateLeague && (
              <div className="card" style={{ border: '1px solid var(--accent-green)' }}>
                <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '12px' }}>Create League</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input className="input" placeholder="League name e.g. Office WC26"
                    value={newLeagueName} onChange={e => setNewLeagueName(e.target.value)} />
                  <input className="input" placeholder="Created by username (leave blank for admin)"
                    value={newLeagueCreatingFor} onChange={e => setNewLeagueCreatingFor(e.target.value)} />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={newLeagueIsGlobal || false}
                      onChange={e => setNewLeagueIsGlobal(e.target.checked)} />
                    🌍 Global league (visible to all users on Leagues page)
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={createLeague} disabled={!newLeagueName.trim()} className="btn btn-primary btn-sm">Create</button>
                    <button onClick={() => setShowCreateLeague(false)} className="btn btn-secondary btn-sm">Cancel</button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{leagues.length} leagues total</div>

            {leagues.map(league => (
              <div key={league.id} className="card">
                {/* League header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ flex: 1 }}>
                    {/* Rename inline */}
                    {editingLeagueName === league.id ? (
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
                        <input className="input" value={editingLeagueNameVal}
                          onChange={e => setEditingLeagueNameVal(e.target.value)}
                          style={{ fontSize: '14px', fontWeight: '700' }} />
                        <button onClick={() => renameLeague(league.id, editingLeagueNameVal)} className="btn btn-primary btn-sm">Save</button>
                        <button onClick={() => setEditingLeagueName(null)} className="btn btn-secondary btn-sm">✕</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <div style={{ fontWeight: '700', fontSize: '15px' }}>{league.name}</div>
                        <button onClick={() => { setEditingLeagueName(league.id); setEditingLeagueNameVal(league.name) }}
                          style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>✏️</button>
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Created by {league.creator?.username || '?'} · {fmt(league.created_at)}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Code: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: 'var(--text-primary)' }}>{league.invite_code}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: '800', fontSize: '16px', fontFamily: 'var(--font-mono)' }}>
                      {league.members?.length ?? 0} members
                    </div>
                  </div>
                </div>

                {/* Member list */}
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

                {/* Add member */}
                {addingMemberTo === league.id ? (
                  <div style={{ marginBottom: '10px', padding: '10px', background: 'var(--accent-blue-light)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Add member to {league.name}</div>
                    <input className="input" placeholder="Search username..."
                      value={addMemberSearch} onChange={e => setAddMemberSearch(e.target.value)}
                      style={{ marginBottom: '8px' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '150px', overflowY: 'auto' }}>
                      {users.filter(u =>
                        addMemberSearch.length > 1 &&
                        u.username?.toLowerCase().includes(addMemberSearch.toLowerCase()) &&
                        !league.members?.find(m => m.user_id === u.id)
                      ).map(u => (
                        <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)' }}>
                          <span style={{ fontSize: '13px' }}>{u.username}</span>
                          <button onClick={() => addMemberToLeague(league.id, league.name, u.id, u.username)}
                            className="btn btn-primary btn-sm">Add</button>
                        </div>
                      ))}
                      {addMemberSearch.length > 1 && users.filter(u =>
                        u.username?.toLowerCase().includes(addMemberSearch.toLowerCase()) &&
                        !league.members?.find(m => m.user_id === u.id)
                      ).length === 0 && (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '8px' }}>No matching users found</div>
                      )}
                    </div>
                    <button onClick={() => { setAddingMemberTo(null); setAddMemberSearch('') }} className="btn btn-secondary btn-sm" style={{ marginTop: '8px' }}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => { setAddingMemberTo(league.id); setAddMemberSearch('') }}
                    className="btn btn-sm" style={{ border: '1px solid var(--accent-blue)', color: 'var(--accent-blue)', background: 'none', marginBottom: '8px' }}>
                    ➕ Add Member
                  </button>
                )}

                {/* Delete */}
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

            {/* ── GAME PHASE CONTROL ── */}
            <div className="card" style={{ border: '2px solid var(--scottish-navy)' }}>
              <div style={{ fontWeight: '800', fontSize: '16px', marginBottom: '4px' }}>🎮 Game Phase Control</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                Override the automatic date-based phase for testing. Set to "Auto" to use real dates.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                {[
                  { key: 'auto', label: '🔄 Auto (use real dates)', desc: `Currently: ${new Date() < new Date('2026-06-11T19:00:00Z') ? 'Pre-Tournament' : new Date() < new Date('2026-06-27T22:00:00Z') ? 'Group Stage' : 'KO Predictor'}` },
                  { key: 'pre_tournament', label: '⏳ Pre-Tournament', desc: 'Before 11 Jun — predictions open, no scores yet' },
                  { key: 'group_stage', label: '⚽ Group Stage', desc: '11–27 Jun — matches live, scores coming in' },
                  { key: 'knockout_banner', label: '📣 KO Banner Live', desc: '20 Jun+ — teaser banner showing on home' },
                  { key: 'ko_predictor', label: '🔥 KO Predictor Live', desc: '27 Jun+ — second game fully open' },
                  { key: 'post_tournament', label: '🏆 Post Tournament', desc: 'After 19 Jul — all results locked' },
                ].map(phase => {
                  const currentVal = settings.game_phase_override || 'auto'
                  const isActive = currentVal === phase.key
                  return (
                    <button key={phase.key} onClick={() => updateSetting('game_phase_override', phase.key === 'auto' ? '' : phase.key)} style={{
                      padding: '10px 14px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                      background: isActive ? 'var(--scottish-navy)' : 'var(--bg-secondary)',
                      border: isActive ? '2px solid var(--scottish-navy)' : '2px solid var(--border-light)',
                      color: isActive ? 'white' : 'var(--text-primary)',
                      textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '2px',
                    }}>
                      <span style={{ fontWeight: '700', fontSize: '13px' }}>{phase.label}</span>
                      <span style={{ fontSize: '11px', opacity: isActive ? 0.8 : 0.6 }}>{phase.desc}</span>
                    </button>
                  )
                })}
              </div>

              {settings.game_phase_override && (
                <div style={{ padding: '8px 12px', background: '#fff3e0', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: '#e65100', fontWeight: '600' }}>
                  ⚠️ Phase override active: <strong>{settings.game_phase_override}</strong> — real dates are ignored. Set to Auto to restore.
                </div>
              )}
            </div>

            {/* ── TEST MODE ── */}
            <div className="card" style={{ border: '1px solid var(--accent-orange)' }}>
              <div style={{ fontWeight: '800', fontSize: '16px', marginBottom: '4px' }}>🧪 Test Mode</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                Preview how a match result will look without writing to the database or awarding points.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Match picker */}
                <div>
                  <label className="label">Pick a match to preview</label>
                  <select className="input" value={testMatchId || ''} onChange={e => setTestMatchId(e.target.value)}>
                    <option value="">Select a match...</option>
                    {matches.filter(m => m.stage === 'group').slice(0, 20).map(m => (
                      <option key={m.id} value={m.id}>
                        Match {m.match_number} · {m.home_team?.short_code} vs {m.away_team?.short_code}
                      </option>
                    ))}
                  </select>
                </div>

                {testMatchId && (
                  <>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input type="number" min="0" max="20" placeholder="Home" value={testHome}
                        onChange={e => setTestHome(e.target.value)}
                        style={{ width: '60px', height: '40px', fontSize: '20px', fontWeight: '800', textAlign: 'center', border: '2px solid var(--border-medium)', borderRadius: 'var(--radius-sm)' }} />
                      <span style={{ fontWeight: '800', color: 'var(--text-muted)', fontSize: '20px' }}>–</span>
                      <input type="number" min="0" max="20" placeholder="Away" value={testAway}
                        onChange={e => setTestAway(e.target.value)}
                        style={{ width: '60px', height: '40px', fontSize: '20px', fontWeight: '800', textAlign: 'center', border: '2px solid var(--border-medium)', borderRadius: 'var(--radius-sm)' }} />
                      <button onClick={runTestPreview} disabled={!testHome || !testAway || testLoading}
                        className="btn btn-primary btn-sm" style={{ background: 'var(--accent-orange)' }}>
                        {testLoading ? '⏳' : '👁 Preview'}
                      </button>
                    </div>

                    {testResult && (
                      <div style={{ padding: '14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
                        <div style={{ fontWeight: '700', marginBottom: '8px' }}>Preview Result (no DB changes)</div>
                        {testResult.map((r, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border-light)' }}>
                            <span>{r.username}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
                              picked {r.home}–{r.away}
                            </span>
                            <span style={{ fontWeight: '700', color: r.points > 0 ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                              +{r.points}pts {r.exact ? '🎯' : r.correct ? '✅' : '❌'}
                            </span>
                          </div>
                        ))}
                        <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                          This is a preview only — no points have been awarded
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* ── EXISTING SETTINGS ── */}
            {[
              { section: '⚽ Predictions' },
              { key: 'predictions_open', label: 'Group Predictions Open', desc: 'Allow users to make/edit group stage predictions', type: 'toggle' },
              { key: 'awards_locked', label: 'Awards Locked', desc: 'Override: lock award predictions early', type: 'toggle' },
              { key: 'knockout_picks_open', label: 'Knockout Picks Open', desc: 'Allow users to make/edit knockout bracket picks', type: 'toggle' },
              { section: '🔄 Live Data' },
              { key: 'live_api_enabled', label: 'Live Score Sync', desc: 'Enable automatic score syncing from football-data.org', type: 'toggle' },
              { key: 'show_odds', label: 'Show Betting Odds', desc: 'Display odds on prediction cards', type: 'toggle' },
              { section: '🔧 Platform' },
              { key: 'maintenance_mode', label: 'Maintenance Mode', desc: 'Show maintenance message to all non-admin users', type: 'toggle' },
              { key: 'registration_open', label: 'Registration Open', desc: 'Allow new user registrations', type: 'toggle' },
              { section: '🔥 Knockout Predictor' },
              { key: 'ko_predictor_enabled', label: 'KO Predictor Enabled', desc: 'Show KO Predictor to users (launches 27 Jun)', type: 'toggle' },
              { key: 'ko_predictions_open', label: 'KO Predictions Open', desc: 'Allow users to make/edit KO predictions', type: 'toggle' },
              { key: 'ko_banner_visible', label: 'KO Banner Visible', desc: 'Show "Coming 28 Jun" banner on home page', type: 'toggle' },
              { key: 'ko_autofill_enabled', label: 'KO Autofill Enabled', desc: 'Allow lucky dip autofill for KO predictions', type: 'toggle' },
              { key: 'ko_first_goal_scorer_enabled', label: 'First Goal Scorer', desc: 'Enable first goal scorer predictions (post-launch)', type: 'toggle' },
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
                else if (confirmAction.type === 'deleteKoLeague') deleteKoLeague(confirmAction.leagueId, confirmAction.leagueName)
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
