import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { ALL_STAGES, calcPredictedStandings, resolveSlot, getBest3rdTeams } from '../lib/bracketUtils.js'
import { useAuthStore, useAppStore } from '../store/index.js'

const TABS = [
  { key: 'health',   label: '🩺 Health',        superOnly: true },
  { key: 'matches',  label: '⚽ Matches',        superOnly: true },
  { key: 'awards',   label: '🥇 Awards',         superOnly: true },
  { key: 'ko',       label: '🔥 KO Predictor',   superOnly: true },
  { key: 'users',    label: '👥 Users',           superOnly: true },
  { key: 'leagues',  label: '🏆 Leagues',         superOnly: false },
  { key: 'offline',  label: '👤 Offline',         superOnly: false },
  { key: 'points',   label: '🎯 Points',          superOnly: false },
  { key: 'audit',    label: '📋 Audit Log',       superOnly: true },
  { key: 'settings', label: '⚙️ Settings',        superOnly: true },
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
  const [topScorers, setTopScorers] = useState([])
  const [loadingScorers, setLoadingScorers] = useState(false)

  const loadTopScorers = async () => {
    setLoadingScorers(true)
    const { data } = await supabase.from('tournament_scorers').select('*').order('goals', { ascending: false }).limit(5)
    setTopScorers(data || [])
    setLoadingScorers(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="card" style={{ background: 'var(--accent-blue-light)', border: '1px solid var(--accent-blue)' }}>
        <div style={{ fontSize: '13px', color: 'var(--accent-blue)', fontWeight: '600' }}>
          ℹ️ Enter the actual tournament award winners after they are announced. Points will be automatically awarded to users who picked correctly.
        </div>
      </div>

      {/* Golden Boot helper — load from live scorers */}
      <div className="card" style={{ border: '1px solid var(--accent-gold)' }}>
        <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '8px' }}>🥇 Live Top Scorers</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
          Load current top scorers from the synced data to quickly set the Golden Boot winner.
        </div>
        <button onClick={loadTopScorers} disabled={loadingScorers} className="btn btn-sm" style={{ marginBottom: '10px', background: 'var(--accent-gold)', color: 'white', border: 'none' }}>
          {loadingScorers ? '⏳ Loading...' : '🔄 Load Top Scorers'}
        </button>
        {topScorers.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {topScorers.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontWeight: '800', fontSize: '13px', width: '20px' }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: '13px', fontWeight: '600' }}>{s.player_name}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.team_name}</span>
                <span style={{ fontWeight: '800', fontSize: '13px', color: 'var(--accent-gold)' }}>{s.goals}⚽</span>
                <button onClick={() => setInputs(prev => ({ ...prev, golden_boot: s.player_name }))}
                  className="btn btn-sm" style={{ fontSize: '11px', padding: '3px 8px' }}>
                  Use
                </button>
              </div>
            ))}
          </div>
        )}
        {topScorers.length === 0 && !loadingScorers && (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No scorer data yet — data syncs once tournament starts.</div>
        )}
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

function CommittedScoreEditor({ leagueId, members, matches, supabase, onClose, logAudit }) {
  const [committedPreds, setCommittedPreds] = useState({})
  const [selectedUserId, setSelectedUserId] = useState('')
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('league_predictions')
        .select('user_id, match_id, home_score, away_score, is_confident')
        .eq('league_id', leagueId)
      const map = {}
      ;(data || []).forEach(p => {
        map[`${p.user_id}-${p.match_id}`] = { home: p.home_score, away: p.away_score, joker: p.is_confident }
      })
      setCommittedPreds(map)
      setLoaded(true)
    }
    load()
  }, [leagueId])

  const saveScore = async (userId, matchId, home, away, joker) => {
    if (home === '' || away === '' || isNaN(parseInt(home)) || isNaN(parseInt(away))) return
    setSaving(true)
    await supabase.from('league_predictions').upsert({
      league_id: leagueId, user_id: userId, match_id: matchId,
      home_score: parseInt(home), away_score: parseInt(away), is_confident: joker || false,
    }, { onConflict: 'league_id,user_id,match_id' })
    await logAudit('EDIT_COMMITTED_SCORE', { league_id: leagueId, user_id: userId, match_id: matchId, home, away })
    setCommittedPreds(prev => ({ ...prev, [`${userId}-${matchId}`]: { home, away, joker } }))
    setSaving(false)
  }

  const groupMatches = matches.filter(m => m.stage === 'group')
  const selectedMember = members?.find(m => m.user_id === selectedUserId)

  return (
    <div style={{ marginTop: '10px', borderTop: '1px solid var(--border-light)', paddingTop: '10px' }}>
      <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '8px' }}>✏️ Edit committed scores</div>
      <select className="input" value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} style={{ marginBottom: '8px' }}>
        <option value="">Select member...</option>
        {(members || []).map(m => (
          <option key={m.user_id} value={m.user_id}>
            {m.profile?.display_name || m.profile?.username || m.profile?.display_name || '?'}{m.is_offline ? ' (offline)' : ''}
          </option>
        ))}
      </select>

      {selectedUserId && loaded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '300px', overflowY: 'auto' }}>
          {groupMatches.map(match => {
            const key = `${selectedUserId}-${match.id}`
            const val = committedPreds[key] || {}
            const hasPred = val.home !== undefined && val.home !== null
            return (
              <div key={match.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 8px', background: hasPred ? 'rgba(0,122,51,0.05)' : 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: hasPred ? '1px solid rgba(0,122,51,0.2)' : '1px solid var(--border-light)' }}>
                <span style={{ fontSize: '11px', flex: 1 }}>
                  {match.home_team?.flag_emoji} {match.home_team?.short_code} vs {match.away_team?.short_code} {match.away_team?.flag_emoji}
                </span>
                <input type="number" min="0" max="20" placeholder="H" value={val.home ?? ''}
                  onChange={e => setCommittedPreds(prev => ({ ...prev, [key]: { ...prev[key], home: e.target.value } }))}
                  onBlur={() => saveScore(selectedUserId, match.id, val.home, val.away, val.joker)}
                  style={{ width: '34px', textAlign: 'center', padding: '3px', borderRadius: '4px', border: '1px solid var(--border-light)', fontSize: '12px', fontWeight: '700' }} />
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>–</span>
                <input type="number" min="0" max="20" placeholder="A" value={val.away ?? ''}
                  onChange={e => setCommittedPreds(prev => ({ ...prev, [key]: { ...prev[key], away: e.target.value } }))}
                  onBlur={() => saveScore(selectedUserId, match.id, val.home, val.away, val.joker)}
                  style={{ width: '34px', textAlign: 'center', padding: '3px', borderRadius: '4px', border: '1px solid var(--border-light)', fontSize: '12px', fontWeight: '700' }} />
                {hasPred && <span style={{ fontSize: '10px', color: 'var(--accent-green)' }}>✓</span>}
              </div>
            )
          })}
        </div>
      )}
      <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ marginTop: '8px' }}>Close</button>
    </div>
  )
}

export default function AdminPanel() {
  const { user, isAdmin } = useAuthStore()
  const [profile, setProfile] = useState(null)

  // Load profile to check admin_level
  useEffect(() => {
    if (user) supabase.from('profiles').select('admin_level, is_admin').eq('id', user.id).single().then(({ data }) => setProfile(data))
  }, [user])

  const isSuperAdmin = isAdmin || profile?.is_admin
  const isLeagueAdmin = profile?.admin_level === 'league_admin'
  const hasAdminAccess = isSuperAdmin || isLeagueAdmin
  const visibleTabs = TABS.filter(t => isSuperAdmin || !t.superOnly)
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(() => isSuperAdmin ? 'health' : 'leagues')
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

  // Edit user predictions state
  const [editingUserPreds, setEditingUserPreds] = useState(null)
  const [userPredictions, setUserPredictions] = useState([])
  const [userKoPicks, setUserKoPicks] = useState([])
  const [userAwardPreds, setUserAwardPreds] = useState([])
  const [allMatches, setAllMatches] = useState([])
  const [loadingUserPreds, setLoadingUserPreds] = useState(false)
  const [editedPreds, setEditedPreds] = useState({})
  const [editModalTab, setEditModalTab] = useState('group') // group | knockout | awards
  const [editingLeagueName, setEditingLeagueName] = useState(null) // leagueId
  const [editingLeagueNameVal, setEditingLeagueNameVal] = useState('')
  const [addingMemberTo, setAddingMemberTo] = useState(null) // leagueId
  const [addMemberSearch, setAddMemberSearch] = useState('')
  const [showCreateLeague, setShowCreateLeague] = useState(false)
  const [newLeagueName, setNewLeagueName] = useState('')
  const [newLeagueCreatingFor, setNewLeagueCreatingFor] = useState('')
  const [newLeagueIsGlobal, setNewLeagueIsGlobal] = useState(false)
  const [newLeaguePreset, setNewLeaguePreset] = useState('standard')
  const [showCustomScoring, setShowCustomScoring] = useState(false)
  const [newLockType, setNewLockType] = useState('rolling')
  const [editingCommittedLeague, setEditingCommittedLeague] = useState(null)
  const [newLeagueScoring, setNewLeagueScoring] = useState({
    group_correct: 3, group_exact: 5, group_jokers: 8, joker_multiplier: 2,
    ko_correct: 3, ko_exact: 5, ko_jokers: 5,
    group_position: 2, perfect_group: 5,
    golden_boot: 15, golden_glove: 10, pott: 10, goals_exact: 15,
  })

  const SCORING_PRESETS = {
    standard:    { group_correct: 3, group_exact: 5, group_jokers: 8, joker_multiplier: 2, ko_correct: 3, ko_exact: 5, ko_jokers: 5, group_position: 2, perfect_group: 5, golden_boot: 15, golden_glove: 10, pott: 10, goals_exact: 15 },
    high_stakes: { group_correct: 5, group_exact: 10, group_jokers: 8, joker_multiplier: 2, ko_correct: 5, ko_exact: 10, ko_jokers: 5, group_position: 4, perfect_group: 10, golden_boot: 25, golden_glove: 15, pott: 15, goals_exact: 20 },
    exact_only:  { group_correct: 0, group_exact: 8, group_jokers: 5, joker_multiplier: 2, ko_correct: 0, ko_exact: 8, ko_jokers: 3, group_position: 2, perfect_group: 5, golden_boot: 15, golden_glove: 10, pott: 10, goals_exact: 15 },
    excel:       { group_correct: 3, group_exact: 5, group_jokers: 8, joker_multiplier: 2, ko_correct: 3, ko_exact: 5, ko_jokers: 5, group_position: 2, perfect_group: 5, golden_boot: 25, golden_glove: 15, pott: 15, goals_exact: 15 },
  }

  const applyPreset = (preset) => {
    setNewLeaguePreset(preset)
    if (SCORING_PRESETS[preset]) setNewLeagueScoring({ ...SCORING_PRESETS[preset] })
  }

  const updateScoring = (key, val) => {
    const num = Math.min(50, Math.max(0, parseInt(val) || 0))
    setNewLeagueScoring(prev => ({ ...prev, [key]: num }))
  }

  // Offline players state
  const [offlinePlayers, setOfflinePlayers] = useState([])
  const [offlineLeagueId, setOfflineLeagueId] = useState('')
  const [offlineDisplayName, setOfflineDisplayName] = useState('')
  const [offlineCreating, setOfflineCreating] = useState(false)
  const [offlineImporting, setOfflineImporting] = useState(false)
  const [offlineImportPreview, setOfflineImportPreview] = useState(null)
  const [offlineSelectedPlayer, setOfflineSelectedPlayer] = useState(null)
  const [offlineManualScores, setOfflineManualScores] = useState({})
  const [offlineKoMode, setOfflineKoMode] = useState(null) // player id showing KO picks
  const [offlineSearch, setOfflineSearch] = useState('')
  const [offlineLeagueFilter, setOfflineLeagueFilter] = useState('')
  const [collapsedPlayers, setCollapsedPlayers] = useState({})
  const [leagueAmendLeagueId, setLeagueAmendLeagueId] = useState('')
  const [playerAdjLeagueId, setPlayerAdjLeagueId] = useState('')
  const [playerAdjUserId, setPlayerAdjUserId] = useState('')
  const [playerAdjAmount, setPlayerAdjAmount] = useState('')
  const [playerAdjReason, setPlayerAdjReason] = useState('')
  const [playerAdjSaving, setPlayerAdjSaving] = useState(false)
  const [playerAdjLeagueMembers, setPlayerAdjLeagueMembers] = useState([])
  const [leagueAmendAmount, setLeagueAmendAmount] = useState('')
  const [leagueAmendReason, setLeagueAmendReason] = useState('')
  const [leagueAmendSaving, setLeagueAmendSaving] = useState(false)

  useEffect(() => {
    if (!user || !hasAdminAccess) { navigate('/'); return }
    loadAll()
  }, [user, hasAdminAccess])

  useEffect(() => {
    if (activeTab === 'ko') loadKoData()
    if (activeTab === 'settings') { loadSettings(); if (matches.length === 0) loadMatches() }
    if (activeTab === 'offline') { if (leagues.length === 0) loadLeagues(); if (matches.length === 0) loadMatches(); loadOfflinePlayers() }
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
      .select('*, home_team:home_team_id(id,name,flag_emoji,short_code), away_team:away_team_id(id,name,flag_emoji,short_code), group:group_id(name)')
      .order('kickoff_time', { ascending: true })
    // Attach group name from separate fetch since FK join may not be registered
    const { data: groups } = await supabase.from('groups').select('id, name')
    const groupMap = {}
    groups?.forEach(g => { groupMap[g.id] = g.name })
    const enriched = (data || []).map(m => ({
      ...m,
      group: { name: groupMap[m.group_id] || m.group?.name || null }
    }))
    setMatches(enriched)
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
      .select('*, creator:created_by(username), members:league_members(user_id, profile:user_id(username, display_name))')
      .order('created_at', { ascending: false })
    // Fetch offline players and merge into each league's members
    const { data: offlinePlayers } = await supabase
      .from('offline_players').select('id, display_name, league_id, league_points')
    const offlineByLeague = {}
    ;(offlinePlayers || []).forEach(op => {
      if (!offlineByLeague[op.league_id]) offlineByLeague[op.league_id] = []
      offlineByLeague[op.league_id].push({
        user_id: op.id,
        league_points: op.league_points || 0,
        is_offline: true,
        profile: { username: op.display_name + ' (offline)', display_name: op.display_name }
      })
    })
    const merged = (data || []).map(league => ({
      ...league,
      members: [...(league.members || []), ...(offlineByLeague[league.id] || [])]
    }))
    setLeagues(merged)
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

  const loadUserPredictions = async (userId) => {
    setLoadingUserPreds(true)
    setEditedPreds({})

    // Load all group matches
    const { data: allMatchData } = await supabase
      .from('matches')
      .select('id, match_number, kickoff_time, status, home_score, away_score, home_team:home_team_id(name,flag_emoji,short_code), away_team:away_team_id(name,flag_emoji,short_code)')
      .eq('stage', 'group')
      .order('match_number', { ascending: true })
    setAllMatches(allMatchData || [])

    // Load user's existing group predictions
    const { data: predData } = await supabase
      .from('predictions')
      .select('*, match:match_id(id, match_number, kickoff_time, status, home_score, away_score, home_team:home_team_id(name,flag_emoji,short_code), away_team:away_team_id(name,flag_emoji,short_code))')
      .eq('user_id', userId)
      .order('match(match_number)', { ascending: true })
    setUserPredictions(predData || [])

    // Load knockout picks
    const { data: koData, error: koErr } = await supabase
      .from('knockout_picks')
      .select('*')
      .eq('user_id', userId)
      .order('match_number', { ascending: true })
    if (koErr) console.error('KO picks error:', koErr)
    setUserKoPicks(koData || [])

    // Load award predictions
    const { data: awardData } = await supabase
      .from('award_predictions')
      .select('*')
      .eq('user_id', userId)
    setUserAwardPreds(awardData || [])

    setLoadingUserPreds(false)
  }

  const saveEditedPrediction = async (matchId, homeScore, awayScore, userId, isNew = false) => {
    const h = parseInt(homeScore)
    const a = parseInt(awayScore)
    if (isNaN(h) || isNaN(a)) return

    let error
    if (isNew) {
      const { error: e } = await supabase.from('predictions').insert({
        user_id: userId, match_id: matchId,
        home_score: h, away_score: a,
        bracket_type: 'main', is_confident: false,
      })
      error = e
    } else {
      const { error: e } = await supabase.from('predictions')
        .update({ home_score: h, away_score: a })
        .eq('user_id', userId).eq('match_id', matchId)
      error = e
    }

    if (error) { setActionResult(`❌ Error: ${error.message}`); return }

    // Check if match is completed and recalculate
    const match = allMatches.find(m => m.id === matchId)
    if (match?.status === 'completed') {
      await supabase.rpc('calculate_prediction_points', { p_match_id: matchId })
      await supabase.rpc('recalculate_user_total_points', { p_user_id: userId })
    }

    // Send admin notification to user
    const username = users.find(u => u.id === userId)?.username
    await supabase.from('profiles').update({
      admin_message: `An admin updated your prediction for Match ${match?.match_number || ''} (${match?.home_team?.short_code} vs ${match?.away_team?.short_code}) to ${h}–${a}`,
      admin_message_read: false,
    }).eq('id', userId)

    await logAudit('ADMIN_EDIT_PREDICTION', { user_id: userId, match_id: matchId, home: h, away: a, is_new: isNew })
    setActionResult(`✅ Prediction ${isNew ? 'added' : 'updated'} for ${username}`)
    setEditedPreds(prev => { const n = { ...prev }; delete n[matchId]; return n })
    loadUserPredictions(userId)
  }

  const sendBanWarning = async (userId, username) => {
    // Store a notification in profiles for the user to see on next login
    await supabase.from('profiles').update({
      admin_message: 'Your account has been flagged by an administrator. Please review the rules.'
    }).eq('id', userId)
    await logAudit('BAN_WARNING_SENT', { user_id: userId, username })
    setActionResult(`✅ Warning sent to ${username}`)
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
    const { error } = await supabase.from('matches').update({
      use_manual_override: false,
      status: 'scheduled',
      home_score: null,
      away_score: null,
      winner_team_id: null,
    }).eq('id', matchId)
    if (error) { setActionResult(`❌ Error: ${error.message}`); return }
    await logAudit('RESET_OVERRIDE', { match_id: matchId })
    setActionResult('✅ Match fully reverted — score cleared, status back to scheduled')
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

  const makeLeagueAdmin = async (userId, username) => {
    const { error } = await supabase.from('profiles').update({ admin_level: 'league_admin' }).eq('id', userId)
    if (error) { setActionResult(`❌ Error: ${error.message}`); return }
    await logAudit('MAKE_LEAGUE_ADMIN', { user_id: userId, username })
    setActionResult(`✅ ${username} is now a League Admin`)
    loadUsers()
  }

  const removeLeagueAdmin = async (userId, username) => {
    await supabase.from('profiles').update({ admin_level: null }).eq('id', userId)
    await logAudit('REMOVE_LEAGUE_ADMIN', { user_id: userId, username })
    setActionResult(`✅ ${username} League Admin access removed`)
    loadUsers()
  }

  const makeAdmin = async (userId, username) => {
    const { error } = await supabase.from('profiles').update({ is_admin: true, admin_level: 'super_admin' }).eq('id', userId)
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
    const { error } = await supabase.from('app_settings').upsert({ key, value, updated_by: user.id }, { onConflict: 'key' })
    if (error) { setActionResult(`❌ Error saving setting: ${error.message}`); return }
    setSettings(prev => ({ ...prev, [key]: value }))
    await logAudit('SETTING_CHANGE', { key, value })
    // Reload app settings in global store so phase changes take effect immediately
    await useAppStore.getState().loadAppSettings()
    setActionResult(`✅ Setting saved: ${key} = ${value}`)
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
      scoring_preset: newLeaguePreset || 'standard',
      custom_scoring: newLeagueScoring,
      lock_type: newLockType,
    }).select().single()
    if (error) { setActionResult(`❌ Error creating league: ${error.message}`); return }
    await supabase.from('league_members').insert({ league_id: league.id, user_id: creatorUser?.id || user.id })
    await logAudit('CREATE_LEAGUE', { league_id: league.id, name: newLeagueName, code, preset: newLeaguePreset, scoring: newLeagueScoring })
    setActionResult(`✅ Created league "${newLeagueName}" with code ${code}`)
    setShowCreateLeague(false)
    setNewLeagueName('')
    setNewLeagueCreatingFor('')
    setNewLeagueIsGlobal(false)
    setNewLeaguePreset('standard')
    setNewLeagueScoring(SCORING_PRESETS.standard)
    setNewLockType('rolling')
    loadLeagues()
  }

  const loadOfflinePlayers = async () => {
    const { data, error } = await supabase
      .from('offline_players')
      .select(`
        id, display_name, league_id, league_points, created_at,
        league:league_id(id, name)
      `)
      .order('created_at', { ascending: false })
    if (error) { console.error('loadOfflinePlayers error:', error); return }
    setOfflinePlayers(data || [])

    // Load all existing offline predictions into state
    const { data: preds } = await supabase
      .from('offline_predictions')
      .select('offline_player_id, match_id, home_score, away_score, is_confident, picked_team_id')
    const scoresMap = {}
    ;(preds || []).forEach(p => {
      scoresMap[`${p.offline_player_id}-${p.match_id}`] = {
        home: p.home_score ?? '',
        away: p.away_score ?? '',
        joker: p.is_confident || false,
        picked_team_id: p.picked_team_id || null,
        saved: true
      }
    })
    setOfflineManualScores(scoresMap)
  }

  const createOfflinePlayer = async () => {
    if (!offlineDisplayName.trim() || !offlineLeagueId) return
    setOfflineCreating(true)
    try {
      const { data: player, error } = await supabase.from('offline_players').insert({
        display_name: offlineDisplayName.trim(),
        league_id: offlineLeagueId,
        created_by: user.id,
      }).select().single()
      if (error) throw error

      await logAudit('CREATE_OFFLINE_PLAYER', { player_id: player.id, display_name: offlineDisplayName, league_id: offlineLeagueId })
      setActionResult(`✅ Offline player "${offlineDisplayName}" created`)
      setOfflineDisplayName('')
      setOfflineLeagueId('')
      setOfflineSelectedPlayer(player)
      loadOfflinePlayers()
    } catch (e) {
      setActionResult(`❌ Error: ${e.message}`)
    }
    setOfflineCreating(false)
  }

  const deleteOfflinePlayer = async (playerId, displayName) => {
    await supabase.from('offline_predictions').delete().eq('offline_player_id', playerId)
    await supabase.from('offline_players').delete().eq('id', playerId)
    await logAudit('DELETE_OFFLINE_PLAYER', { player_id: playerId, display_name: displayName })
    setActionResult(`✅ Offline player "${displayName}" deleted`)
    loadOfflinePlayers()
  }

  const generateInviteLink = async (playerId, displayName) => {
    const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    const { error } = await supabase.from('offline_players')
      .update({ claim_token: token, claim_token_expires: expires.toISOString() })
      .eq('id', playerId)
    if (error) { setActionResult(`❌ Error: ${error.message}`); return }
    const link = `${window.location.origin}/claim/${token}`
    await navigator.clipboard.writeText(link).catch(() => {})
    setActionResult(`✅ Invite link for "${displayName}" copied to clipboard! Valid for 7 days.`)
  }

  const saveManualScore = async (playerId, matchId, home, away, joker = false) => {
    if (home === '' || away === '' || isNaN(parseInt(home)) || isNaN(parseInt(away))) return
    await supabase.from('offline_predictions').upsert({
      offline_player_id: playerId,
      match_id: matchId,
      home_score: parseInt(home),
      away_score: parseInt(away),
      is_confident: joker,
    }, { onConflict: 'offline_player_id,match_id' })
    setOfflineManualScores(prev => ({ ...prev, [`${playerId}-${matchId}`]: { home, away, joker, saved: true } }))
    setTimeout(() => setOfflineManualScores(prev => ({ ...prev, [`${playerId}-${matchId}`]: { home, away, joker, saved: true } })), 1500)
  }

  // Team name fuzzy matching for Excel import
  const TEAM_ALIASES = {
    'holland': 'Netherlands', 'the netherlands': 'Netherlands',
    'korea republic': 'South Korea', 'republic of korea': 'South Korea', 'korea': 'South Korea',
    'cabo verde': 'Cape Verde', 'cape verde islands': 'Cape Verde',
    "cote d'ivoire": 'Ivory Coast', 'ivory coast': 'Ivory Coast', "côte d'ivoire": 'Ivory Coast',
    'usa': 'United States', 'united states of america': 'United States', 'america': 'United States',
    'türkiye': 'Turkiye', 'turkey': 'Turkiye', 'turkiye': 'Turkiye',
    'bosnia': 'Bosnia-Herzegovina', 'bosnia ': 'Bosnia-Herzegovina', 'bosnia and herzegovina': 'Bosnia-Herzegovina',
    'czech republic': 'Czechia',
    'dr congo': 'DR Congo', 'congo dr': 'DR Congo', 'democratic republic of congo': 'DR Congo',
    'north macedonia': 'North Macedonia', 'macedonia': 'North Macedonia',
    'curacao': 'Curacao', 'curaçao': 'Curacao',
    'ir iran': 'Iran', 'islamic republic of iran': 'Iran',
  }

  const normaliseTeam = (name) => {
    if (!name) return ''
    const trimmed = name.trim()
    const lower = trimmed.toLowerCase()
    if (TEAM_ALIASES[lower]) return TEAM_ALIASES[lower]
    if (TEAM_ALIASES[trimmed.toLowerCase().trim()]) return TEAM_ALIASES[trimmed.toLowerCase().trim()]
    return trimmed
  }

  const parseExcelFile = async (file, targetPlayerId) => {
    setOfflineImporting(true)
    try {
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

      let headerRow = -1
      let homeScoreCol = -1, awayScoreCol = -1, jokerCol = -1
      let homeTeamCol = -1, awayTeamCol = -1

      for (let i = 0; i < Math.min(rows.length, 20); i++) {
        const row = rows[i].map(c => String(c).toLowerCase().trim())

        // Standard format: "Home Score" / "Away Score" headers
        if (row.some(c => c.includes('home') && c.includes('score'))) {
          headerRow = i
          row.forEach((c, j) => {
            if (c.includes('home') && c.includes('score')) homeScoreCol = j
            if (c.includes('away') && c.includes('score')) awayScoreCol = j
            if (c.includes('joker')) jokerCol = j
            if (c.includes('home') && !c.includes('score')) homeTeamCol = j
            if (c.includes('away') && !c.includes('score')) awayTeamCol = j
          })
          break
        }

        // Excel template format: "Match #" header row with Country | blank | Score | blank | blank | Country | Joker
        if (row.some(c => c.includes('match') && (c.includes('#') || c.includes('no') || c === 'match'))) {
          headerRow = i
          // Find the two 'country' columns
          const countryIndices = []
          row.forEach((c, j) => {
            if (c === 'country') countryIndices.push(j)
          })
          if (countryIndices.length >= 2) {
            homeTeamCol = countryIndices[0]
            awayTeamCol = countryIndices[1]
            // WC26 template: Country(4) | blank(5) | HomeScore(6) | AwayScore(7) | blank(8) | Country(9) | Joker(10)
            homeScoreCol = homeTeamCol + 2
            awayScoreCol = homeTeamCol + 3
            jokerCol = awayTeamCol + 1
          } else if (row.some(c => c.includes('score'))) {
            const scoreIdx = row.findIndex(c => c.includes('score'))
            homeScoreCol = scoreIdx + 1
            awayScoreCol = scoreIdx + 2
          }
          break
        }
      }

      // Last resort: try to detect by finding numeric data rows
      if (headerRow === -1 || homeScoreCol === -1) {
        // Look for rows that start with a number (match number)
        for (let i = 0; i < Math.min(rows.length, 20); i++) {
          const row = rows[i]
          if (!isNaN(parseInt(String(row[0]))) && row.length > 8) {
            headerRow = i - 1 // header is previous row
            // Assume standard col positions from the WC26 template
            homeTeamCol = 4; homeScoreCol = 6; awayScoreCol = 7; awayTeamCol = 9; jokerCol = 10
            break
          }
        }
      }

      if (headerRow === -1 || homeScoreCol === -1 || awayScoreCol === -1) {
        setActionResult('❌ Could not detect spreadsheet format. Supported: "Home Score"/"Away Score" headers, or the WC26 Entry Sheet template format.')
        setOfflineImporting(false)
        return
      }

      // Load all matches for matching
      const { data: allMatches } = await supabase
        .from('matches')
        .select('id, kickoff_time, home_team:home_team_id(name, short_code), away_team:away_team_id(name, short_code)')
        .eq('stage', 'group')
        .order('kickoff_time')

      const predictions = []
      const unmatched = []
      let jokersFound = 0

      for (let i = headerRow + 1; i < rows.length; i++) {
        const row = rows[i]
        const homeScore = parseInt(String(row[homeScoreCol]).trim())
        const awayScore = parseInt(String(row[awayScoreCol]).trim())
        if (isNaN(homeScore) || isNaN(awayScore)) continue

        const isJoker = jokerCol >= 0 && String(row[jokerCol]).trim().toUpperCase() === 'X'
        if (isJoker) jokersFound++

        // Match by team names if available, otherwise by row order
        let match = null
        if (homeTeamCol >= 0 && awayTeamCol >= 0) {
          const homeTeam = normaliseTeam(String(row[homeTeamCol]))
          const awayTeam = normaliseTeam(String(row[awayTeamCol]))
          match = allMatches.find(m =>
            (m.home_team?.name === homeTeam ||
             m.home_team?.name?.toLowerCase() === homeTeam.toLowerCase() ||
             m.home_team?.short_code?.toLowerCase() === homeTeam.toLowerCase()) &&
            (m.away_team?.name === awayTeam ||
             m.away_team?.name?.toLowerCase() === awayTeam.toLowerCase() ||
             m.away_team?.short_code?.toLowerCase() === awayTeam.toLowerCase())
          )
          if (!match) unmatched.push(`${homeTeam} vs ${awayTeam}`)
        } else {
          // Fall back to row order
          const idx = predictions.length
          match = allMatches[idx]
        }

        if (match) {
          predictions.push({
            match_id: match.id,
            home_score: homeScore,
            away_score: awayScore,
            is_confident: isJoker,
          })
        }
      }

      setOfflineImportPreview({ predictions, unmatched, jokersFound, targetPlayerId, isOffline: true })
      setOfflineImporting(false)
    } catch (e) {
      setActionResult(`❌ Parse error: ${e.message}`)
      setOfflineImporting(false)
    }
  }

  const confirmImport = async () => {
    if (!offlineImportPreview) return
    setOfflineImporting(true)
    const { predictions, targetPlayerId } = offlineImportPreview
    // Map to offline_predictions format
    const toSave = predictions.map(p => ({
      offline_player_id: targetPlayerId,
      match_id: p.match_id,
      home_score: p.home_score,
      away_score: p.away_score,
      is_confident: p.is_confident || false,
    }))
    const { error } = await supabase.from('offline_predictions')
      .upsert(toSave, { onConflict: 'offline_player_id,match_id' })
    if (error) {
      setActionResult(`❌ Import failed: ${error.message}`)
    } else {
      await logAudit('IMPORT_OFFLINE_PREDICTIONS', { player_id: targetPlayerId, count: toSave.length })
      setActionResult(`✅ Imported ${toSave.length} predictions successfully`)
      setOfflineImportPreview(null)
      // Reload predictions into state so manual entry boxes show imported scores
      const updates = {}
      toSave.forEach(p => {
        updates[`${p.offline_player_id}-${p.match_id}`] = {
          home: p.home_score, away: p.away_score,
          joker: p.is_confident, saved: true
        }
      })
      setOfflineManualScores(prev => ({ ...prev, ...updates }))
    }
    setOfflineImporting(false)
  }

  const parsePdfFile = async (file, targetPlayerId) => {
    setOfflineImporting(true)
    setActionResult('')
    try {
      // Load PDF.js from CDN if not already loaded
      if (!window.pdfjsLib) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
          script.onload = () => {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc =
              'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
            resolve()
          }
          script.onerror = () => reject(new Error('Failed to load PDF.js library'))
          document.head.appendChild(script)
        })
      }

      if (!window.pdfjsLib) throw new Error('PDF.js failed to initialise')

      // Load PDF from file
      const buffer = await file.arrayBuffer()
      const loadingTask = window.pdfjsLib.getDocument({ data: buffer })
      const pdf = await loadingTask.promise

      // Extract all text from all pages with position data
      const allItems = []
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum)
        const content = await page.getTextContent()
        content.items.forEach(item => {
          if (item.str?.trim()) {
            allItems.push({
              text: item.str.trim(),
              x: Math.round(item.transform[4]),
              y: Math.round(item.transform[5]),
              page: pageNum,
            })
          }
        })
      }

      if (!allItems.length) throw new Error('No text found in PDF — is it a scanned image?')

      // Group items into rows by Y position (within 12px tolerance)
      const rowMap = {}
      allItems.forEach(item => {
        const rowKey = `${item.page}_${Math.round(item.y / 12) * 12}`
        if (!rowMap[rowKey]) rowMap[rowKey] = []
        rowMap[rowKey].push(item)
      })

      // Sort rows and within each row sort by X
      const rows = Object.values(rowMap)
        .sort((a, b) => {
          if (a[0].page !== b[0].page) return a[0].page - b[0].page
          return b[0].y - a[0].y // higher Y = higher on page
        })
        .map(row => row.sort((a, b) => a.x - b.x).map(i => i.text))

      // Parse predictions using match number as spatial anchor
      // For each match 1-72, find its Y position and look for scores nearby
      const predictions = []

      // Find all items that are standalone match numbers (1-72)
      const matchAnchors = {}
      allItems.forEach(item => {
        const n = parseInt(item.text)
        if (!isNaN(n) && n >= 1 && n <= 72 && /^\d{1,2}$/.test(item.text)) {
          // Keep leftmost occurrence (real match# is on left, position numbers on right)
          if (!matchAnchors[n] || item.x < matchAnchors[n].x) {
            matchAnchors[n] = item
          }
        }
      })

      for (let matchNum = 1; matchNum <= 72; matchNum++) {
        const anchor = matchAnchors[matchNum]
        if (!anchor) continue

        // Get all items within 15px vertically on same page, to the right of match number
        const rowItemsFull = allItems
          .filter(item => item.page === anchor.page && Math.abs(item.y - anchor.y) <= 15 && item.x > anchor.x)
          .sort((a, b) => a.x - b.x)

        const rowItems = rowItemsFull.map(i => i.text)

        // Find score pair: two 1-2 digit numbers (0-20), skip times/dates/long strings
        const scoreCandidates = []
        for (let i = 0; i < rowItems.length; i++) {
          const p = rowItems[i]
          if (p.includes(':') || p.includes('-') || p.includes('/')) continue
          if (p.length > 2) continue // skip long strings
          if (/^[A-Za-z]/.test(p)) continue // skip words
          const n = parseInt(p)
          if (!isNaN(n) && n >= 0 && n <= 20) {
            scoreCandidates.push({ val: n, idx: i })
          }
        }

        let homeScore = null, awayScore = null, isJoker = false
        let scoreEndX = null
        for (let si = 0; si < scoreCandidates.length - 1; si++) {
          const curr = scoreCandidates[si]
          const next = scoreCandidates[si + 1]
          if (next.idx - curr.idx <= 4) {
            homeScore = curr.val
            awayScore = next.val
            scoreEndX = rowItemsFull[next.idx]?.x || 0
            break
          }
        }

        // Joker: look for standalone "X" at same Y as the match number (tight tolerance ±4px)
        // The joker column is always at a fixed X position, use anchor.y for exact row matching
        if (homeScore !== null) {
          const jokerItems = allItems.filter(item =>
            item.page === anchor.page &&
            Math.abs(item.y - anchor.y) <= 4 && // tight Y — same row only
            item.x > anchor.x &&
            (item.text === 'X' || item.text === 'x' || item.text === '✓')
          )
          isJoker = jokerItems.length > 0
        }

        if (homeScore !== null && awayScore !== null) {
          predictions.push({ match_number: matchNum, home_score: homeScore, away_score: awayScore, is_joker: isJoker })
        }
      }

      if (!predictions.length) {
        setActionResult('❌ No predictions found — make sure scores are filled in and the PDF uses the standard template')
        setOfflineImporting(false)
        return
      }

      // Match to DB matches by match_number
      const toSave = []
      const unmatched = []
      let jokersFound = 0

      for (const pred of predictions) {
        const dbMatch = matches.find(m => m.match_number === pred.match_number)
        if (!dbMatch) { unmatched.push(`M${pred.match_number}`); continue }
        toSave.push({ match_id: dbMatch.id, home_score: pred.home_score, away_score: pred.away_score, is_confident: pred.is_joker })
        if (pred.is_joker) jokersFound++
      }

      const foundNums = predictions.map(p => p.match_number)
      const missingNums = Array.from({length: 72}, (_, i) => i + 1).filter(n => !foundNums.includes(n))

      setOfflineImportPreview({ targetPlayerId, predictions: toSave, jokersFound, unmatched, source: 'pdf', missingNums })

    } catch (e) {
      console.error('PDF parse error:', e)
      setActionResult(`❌ Error parsing PDF: ${e.message || 'Unknown error — check browser console'}`)
    }
    setOfflineImporting(false)
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
            <span style={{ background: isSuperAdmin ? 'var(--accent-orange)' : 'var(--scottish-navy)', color: 'white', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', marginLeft: '8px' }}>
              {isSuperAdmin ? 'SUPER ADMIN' : 'LEAGUE ADMIN'}
            </span>
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
            {visibleTabs.map(tab => (
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
                <button onClick={async () => {
                  setSaving(prev => ({ ...prev, standings: true }))
                  try {
                    const res = await fetch('/.netlify/functions/sync-standings')
                    const data = await res.json()
                    setActionResult(`✅ Standings synced: ${data.updated} rows updated`)
                  } catch (e) {
                    setActionResult(`❌ Standings sync failed: ${e.message}`)
                  }
                  setSaving(prev => ({ ...prev, standings: false }))
                }} disabled={saving.standings} className="btn btn-secondary">
                  {saving.standings ? '⏳ Syncing...' : '📊 Sync Standings'}
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
                        <button onClick={async () => {
                          // Preview only — set score but keep scheduled, no points
                          const homeScore = parseInt(s.home)
                          const awayScore = parseInt(s.away)
                          await supabase.from('matches').update({
                            home_score: homeScore, away_score: awayScore,
                            use_manual_override: true,
                          }).eq('id', match.id)
                          setActionResult('👁 Preview score set — status still scheduled, no points awarded. Use Revert to API to undo.')
                          setEditingMatch(null)
                          loadMatches()
                        }} disabled={saving[match.id]} className="btn btn-sm" style={{ background: 'var(--accent-orange)', color: 'white', border: 'none' }}>
                          👁 Preview Only
                        </button>
                        <button onClick={() => saveMatchResult(match)} disabled={saving[match.id]} className="btn btn-primary btn-sm">
                          {saving[match.id] ? '...' : '✅ Save & Award Points'}
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
                          {u.is_admin && <span style={{ marginLeft: '6px', fontSize: '10px', background: 'var(--accent-orange)', color: 'white', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>SUPER ADMIN</span>}
                          {!u.is_admin && u.admin_level === 'league_admin' && <span style={{ marginLeft: '6px', fontSize: '10px', background: 'var(--scottish-navy)', color: 'white', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>LEAGUE ADMIN</span>}
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
                    {!u.is_banned && (
                      <button onClick={() => sendBanWarning(u.id, u.username)} className="btn btn-sm" style={{ border: '1px solid #e53935', color: '#e53935', background: 'none' }}>⚠️ Warn</button>
                    )}
                    <button onClick={() => setConfirmAction({ type: 'reset', userId: u.id, username: u.username })} className="btn btn-secondary btn-sm">↺ Reset</button>
                    {!u.is_admin && <button onClick={() => setConfirmAction({ type: 'makeAdmin', userId: u.id, username: u.username })} className="btn btn-sm" style={{ border: '1px solid var(--accent-orange)', color: 'var(--accent-orange)', background: 'none' }}>⭐ Super Admin</button>}
                    {!u.is_admin && u.admin_level !== 'league_admin' && <button onClick={() => setConfirmAction({ type: 'makeLeagueAdmin', userId: u.id, username: u.username })} className="btn btn-sm" style={{ border: '1px solid var(--scottish-navy)', color: 'var(--scottish-navy)', background: 'none' }}>🏆 League Admin</button>}
                    {!u.is_admin && u.admin_level === 'league_admin' && <button onClick={() => removeLeagueAdmin(u.id, u.username)} className="btn btn-sm" style={{ border: '1px solid var(--accent-red)', color: 'var(--accent-red)', background: 'none' }}>✕ Remove League Admin</button>}
                    <button onClick={() => setPointAdjUser(u.id)} className="btn btn-sm" style={{ border: '1px solid var(--accent-blue)', color: 'var(--accent-blue)', background: 'none' }}>🎯 Points</button>
                    <button onClick={() => { setEditingUserPreds(u.id); loadUserPredictions(u.id) }} className="btn btn-sm" style={{ border: '1px solid var(--scottish-navy)', color: 'var(--scottish-navy)', background: 'none' }}>✏️ Predictions</button>
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

                  {/* Lock type */}
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '8px', color: 'var(--scottish-navy)' }}>🔒 Prediction Lock</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', padding: '8px', borderRadius: 'var(--radius-sm)', background: newLockType === 'rolling' ? 'var(--accent-blue-light)' : 'var(--bg-card)', border: `1.5px solid ${newLockType === 'rolling' ? 'var(--accent-blue)' : 'var(--border-light)'}` }}>
                        <input type="radio" name="lockType" value="rolling" checked={newLockType === 'rolling'}
                          onChange={() => setNewLockType('rolling')} style={{ marginTop: '2px' }} />
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '13px' }}>🔓 Always editable</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Predictions lock match by match at kickoff. Members can update future picks any time.</div>
                        </div>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', padding: '8px', borderRadius: 'var(--radius-sm)', background: newLockType === 'pre_tournament' ? 'var(--accent-blue-light)' : 'var(--bg-card)', border: `1.5px solid ${newLockType === 'pre_tournament' ? 'var(--accent-blue)' : 'var(--border-light)'}` }}>
                        <input type="radio" name="lockType" value="pre_tournament" checked={newLockType === 'pre_tournament'}
                          onChange={() => setNewLockType('pre_tournament')} style={{ marginTop: '2px' }} />
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '13px' }}>🔒 Lock before tournament</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>All predictions snapshot at 11 Jun 13:00. Scores frozen for league scoring. Members can still update their overall predictions after kickoff.</div>
                        </div>
                      </label>
                    </div>
                  </div>
                  {/* Quick preset buttons */}
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-muted)' }}>Quick Start Preset</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {[['standard','⚽ Standard'],['high_stakes','🔥 High Stakes'],['exact_only','🎯 Exact Only'],['excel','📊 Excel']].map(([key, label]) => (
                        <button key={key} onClick={() => applyPreset(key)} className="btn btn-sm"
                          style={{ background: newLeaguePreset === key ? 'var(--scottish-navy)' : 'var(--bg-secondary)', color: newLeaguePreset === key ? 'white' : 'var(--text-primary)', border: '1px solid var(--border-light)' }}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom scoring grid — collapsed by default */}
                  <div>
                    <button onClick={() => setShowCustomScoring(s => !s)}
                      style={{ background: 'none', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', width: '100%', textAlign: 'left' }}>
                      {showCustomScoring ? '▲ Hide custom scoring' : '⚙️ Customise scoring (optional) — Standard scoring pre-filled'}
                    </button>
                  </div>
                  {showCustomScoring && (
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '10px', color: 'var(--scottish-navy)' }}>⚙️ Custom Scoring (0–50pts each)</div>
                    {[
                      { label: '⚽ Group Stage', fields: [
                        { key: 'group_correct', label: 'Correct result' },
                        { key: 'group_exact', label: 'Exact score' },
                        { key: 'group_jokers', label: 'Jokers available' },
                        { key: 'joker_multiplier', label: 'Joker multiplier ×' },
                      ]},
                      { label: '🏆 Knockout', fields: [
                        { key: 'ko_correct', label: 'Correct result' },
                        { key: 'ko_exact', label: 'Exact score' },
                        { key: 'ko_jokers', label: 'Jokers available' },
                      ]},
                      { label: '📊 Group Positions', fields: [
                        { key: 'group_position', label: 'Per correct position' },
                        { key: 'perfect_group', label: 'Perfect group bonus' },
                      ]},
                      { label: '🥇 Awards', fields: [
                        { key: 'golden_boot', label: 'Golden Boot' },
                        { key: 'golden_glove', label: 'Golden Glove' },
                        { key: 'pott', label: 'Player of Tournament' },
                        { key: 'goals_exact', label: 'Goals total exact' },
                      ]},
                    ].map(section => (
                      <div key={section.label} style={{ marginBottom: '10px' }}>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{section.label}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                          {section.fields.map(f => (
                            <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', padding: '6px 8px' }}>
                              <span style={{ fontSize: '11px', flex: 1, color: 'var(--text-muted)' }}>{f.label}</span>
                              <input type="number" min="0" max="50" value={newLeagueScoring[f.key] ?? 0}
                                onChange={e => updateScoring(f.key, e.target.value)}
                                style={{ width: '44px', textAlign: 'center', padding: '3px', borderRadius: '4px', border: '1px solid var(--border-light)', fontSize: '13px', fontWeight: '700' }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={createLeague} disabled={!newLeagueName.trim()} className="btn btn-primary btn-sm">Create League</button>
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
                        {league.lock_type === 'pre_tournament' && (
                          <span style={{ fontSize: '10px', fontWeight: '700', background: league.snapshot_taken_at ? 'var(--accent-green)' : 'var(--accent-gold)', color: 'white', padding: '2px 6px', borderRadius: 'var(--radius-full)' }}>
                            {league.snapshot_taken_at ? '🔒 Locked' : '⏳ Pre-lock'}
                          </span>
                        )}
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

                {/* Snapshot controls for pre_tournament leagues */}
                {league.lock_type === 'pre_tournament' && (
                  <div style={{ marginTop: '8px', padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700' }}>🔒 Pre-tournament lock</span>
                      {league.snapshot_taken_at
                        ? <span style={{ fontSize: '11px', color: 'var(--accent-green)' }}>✅ Snapshot taken {new Date(league.snapshot_taken_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        : <span style={{ fontSize: '11px', color: 'var(--accent-gold)' }}>⏳ Snapshot pending (11 Jun 13:00)</span>
                      }
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {!league.snapshot_taken_at && (
                        <button onClick={async () => {
                          if (!confirm(`Take snapshot now for "${league.name}"? This locks all predictions immediately.`)) return
                          const res = await fetch('/.netlify/functions/snapshot-league-predictions', { method: 'POST' })
                          const data = await res.json()
                          setActionResult(`✅ ${data.message} — ${data.predictions} predictions locked`)
                          loadLeagues()
                        }} className="btn btn-sm" style={{ background: 'var(--scottish-navy)', color: 'white', border: 'none', fontSize: '11px' }}>
                          📸 Snapshot now
                        </button>
                      )}
                      {league.snapshot_taken_at && (
                        <button onClick={() => setEditingCommittedLeague(editingCommittedLeague === league.id ? null : league.id)}
                          className="btn btn-sm" style={{ border: '1px solid var(--accent-blue)', color: 'var(--accent-blue)', background: 'none', fontSize: '11px' }}>
                          ✏️ Edit committed scores
                        </button>
                      )}
                    </div>

                    {/* Edit committed scores */}
                    {editingCommittedLeague === league.id && (
                      <CommittedScoreEditor leagueId={league.id} members={league.members} matches={matches} supabase={supabase} onClose={() => setEditingCommittedLeague(null)} logAudit={logAudit} />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── OFFLINE PLAYERS ── */}
        {activeTab === 'offline' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Add + Search controls */}
            <div className="card" style={{ border: '1px solid var(--scottish-navy)' }}>
              <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: '12px' }}>👤 Add Offline Player</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input className="input" placeholder="Display name (e.g. Dave's Picks)"
                  value={offlineDisplayName} onChange={e => setOfflineDisplayName(e.target.value)} />
                <select className="input" value={offlineLeagueId} onChange={e => setOfflineLeagueId(e.target.value)}>
                  <option value="">Select a league...</option>
                  {leagues.filter(l => !l.is_global).map(l => (
                    <option key={l.id} value={l.id}>{l.name} ({l.members?.length || 0} members)</option>
                  ))}
                </select>
                <button onClick={createOfflinePlayer}
                  disabled={offlineCreating || !offlineDisplayName.trim() || !offlineLeagueId}
                  className="btn btn-primary">
                  {offlineCreating ? '⏳ Creating...' : '➕ Create Offline Player'}
                </button>
              </div>
            </div>

            {/* Filter controls */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input className="input" placeholder="🔍 Search by name..." style={{ flex: 1 }}
                value={offlineSearch} onChange={e => setOfflineSearch(e.target.value)} />
              <select className="input" style={{ flex: 1 }}
                value={offlineLeagueFilter} onChange={e => setOfflineLeagueFilter(e.target.value)}>
                <option value="">All leagues</option>
                {leagues.filter(l => !l.is_global).map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            {/* Import preview */}
            {offlineImportPreview && (
              <div className="card" style={{ border: '2px solid var(--accent-green)' }}>
                <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: '10px' }}>📋 Import Preview</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '14px' }}>✅ <strong>{offlineImportPreview.predictions.length}</strong> / 72 predictions found</div>
                  <div style={{ fontSize: '14px' }}>🃏 <strong>{offlineImportPreview.jokersFound}</strong> jokers applied</div>
                  {offlineImportPreview.missingNums?.length > 0 && (
                    <div style={{ padding: '8px', background: 'rgba(184,134,11,0.1)', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--accent-gold)' }}>
                      ⚠️ <strong>{offlineImportPreview.missingNums.length} missing:</strong> M{offlineImportPreview.missingNums.join(', M')} — enter these manually after importing
                    </div>
                  )}
                  {offlineImportPreview.unmatched?.length > 0 && (
                    <div style={{ padding: '8px', background: 'var(--accent-red-light)', borderRadius: 'var(--radius-md)', fontSize: '12px' }}>
                      ⚠️ <strong>{offlineImportPreview.unmatched.length} unmatched teams:</strong> {offlineImportPreview.unmatched.join(', ')}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={confirmImport} disabled={offlineImporting} className="btn btn-primary btn-sm">
                    {offlineImporting ? '⏳ Saving...' : '✅ Confirm Import'}
                  </button>
                  <button onClick={() => setOfflineImportPreview(null)} className="btn btn-secondary btn-sm">Cancel</button>
                </div>
              </div>
            )}

            {/* Existing offline players */}
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>
              {offlinePlayers.length} offline player{offlinePlayers.length !== 1 ? 's' : ''}
            </div>

            {/* Compact table */}
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
              {/* Header row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px', gap: '8px', padding: '8px 12px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <span>Player</span>
                <span>League</span>
                <span style={{ textAlign: 'right' }}>Actions</span>
              </div>
              {offlinePlayers
                .filter(p => {
                  const matchSearch = !offlineSearch || p.display_name?.toLowerCase().includes(offlineSearch.toLowerCase())
                  const matchLeague = !offlineLeagueFilter || p.league_id === offlineLeagueFilter
                  return matchSearch && matchLeague
                })
                .map((player, idx, arr) => {
                const isCollapsed = collapsedPlayers[player.id] !== false
                return (
                <div key={player.id}>
                  {/* Compact row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px', gap: '8px', padding: '10px 12px', borderBottom: idx < arr.length - 1 || !isCollapsed ? '1px solid var(--border-light)' : 'none', alignItems: 'center' }}>
                    <div style={{ fontWeight: '700', fontSize: '13px' }}>👤 {player.display_name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{player.league?.name || '—'}</div>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                      <button onClick={() => generateInviteLink(player.id, player.display_name)}
                        title="Generate & copy a unique signup link for this player. They click it, create an account, and their predictions are linked automatically. Valid for 7 days." className="btn btn-sm" style={{ background: 'var(--scottish-navy)', color: 'white', border: 'none', fontSize: '11px', padding: '3px 7px' }}>
                        📧
                      </button>
                      <button onClick={() => setCollapsedPlayers(prev => ({ ...prev, [player.id]: !isCollapsed }))}
                        className="btn btn-sm" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', fontSize: '11px', padding: '3px 7px' }}>
                        {isCollapsed ? '▼' : '▲'}
                      </button>
                      <button onClick={() => setConfirmAction({ type: 'deleteOfflinePlayer', playerId: player.id, displayName: player.display_name })}
                        className="btn btn-sm" style={{ background: '#e53935', color: 'white', border: 'none', padding: '3px 7px' }}>
                        🗑️
                      </button>
                    </div>
                  </div>
                  {/* Expanded detail */}
                  {!isCollapsed && <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)' }}>

                {/* Import section */}
                <div style={{ marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>
                    📥 Import predictions
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>📊 Excel / CSV</div>
                      <input type="file" accept=".xlsx,.xls,.csv"
                        onChange={e => { if (e.target.files[0]) parseExcelFile(e.target.files[0], player.id) }}
                        style={{ fontSize: '11px', width: '100%' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>📄 PDF predictor sheet</div>
                      <input type="file" accept=".pdf"
                        onChange={e => { if (e.target.files[0]) parsePdfFile(e.target.files[0], player.id) }}
                        style={{ fontSize: '11px', width: '100%' }} />
                    </div>
                  </div>
                  {offlineImporting && (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div className="spinner" style={{ width: '12px', height: '12px' }} />
                      Parsing file with AI — this may take 15-30 seconds...
                    </div>
                  )}
                </div>

                {/* Manual score entry toggle buttons */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                  <button onClick={async () => {
                    const newPlayer = offlineSelectedPlayer?.id === player.id ? null : player
                    setOfflineSelectedPlayer(newPlayer)
                    setOfflineKoMode(null)
                    if (newPlayer) {
                      const { data: preds } = await supabase.from('offline_predictions')
                        .select('offline_player_id, match_id, home_score, away_score, is_confident, picked_team_id')
                        .eq('offline_player_id', player.id)
                      const updates = {}
                      ;(preds || []).forEach(p => {
                        updates[`${p.offline_player_id}-${p.match_id}`] = {
                          home: p.home_score ?? '', away: p.away_score ?? '',
                          joker: p.is_confident || false,
                          picked_team_id: p.picked_team_id || null,
                          saved: true
                        }
                      })
                      setOfflineManualScores(prev => ({ ...prev, ...updates }))
                    }
                  }}
                    className="btn btn-sm" style={{ flex: 1, border: '1px solid var(--scottish-navy)', color: offlineSelectedPlayer?.id === player.id ? 'white' : 'var(--scottish-navy)', background: offlineSelectedPlayer?.id === player.id ? 'var(--scottish-navy)' : 'none' }}>
                    ⚽ {offlineSelectedPlayer?.id === player.id ? '▲ Hide groups' : '⌨️ Group scores'}
                  </button>
                  <button onClick={async () => {
                    const newMode = offlineKoMode === player.id ? null : player.id
                    setOfflineKoMode(newMode)
                    setOfflineSelectedPlayer(null)
                    // Load this player's predictions into state if not already loaded
                    if (newMode) {
                      const { data: preds } = await supabase.from('offline_predictions')
                        .select('offline_player_id, match_id, home_score, away_score, is_confident, picked_team_id')
                        .eq('offline_player_id', player.id)
                      const updates = {}
                      ;(preds || []).forEach(p => {
                        updates[`${p.offline_player_id}-${p.match_id}`] = {
                          home: p.home_score ?? '', away: p.away_score ?? '',
                          joker: p.is_confident || false,
                          picked_team_id: p.picked_team_id || null,
                          saved: true
                        }
                      })
                      setOfflineManualScores(prev => ({ ...prev, ...updates }))
                    }
                  }}
                    className="btn btn-sm" style={{ flex: 1, border: '1px solid var(--scottish-navy)', color: offlineKoMode === player.id ? 'white' : 'var(--scottish-navy)', background: offlineKoMode === player.id ? 'var(--scottish-navy)' : 'none' }}>
                    🏆 {offlineKoMode === player.id ? '▲ Hide knockouts' : 'Knockout picks'}
                  </button>
                </div>

                {/* Knockout picks mode */}
                {offlineKoMode === player.id && (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '4px' }}>
                      Pick which team advances — teams resolved from group predictions
                    </div>
                    {(() => {
                      // Build predMap from group predictions
                      const predMap = {}
                      const groupMatches = matches.filter(m => m.stage === 'group')
                      groupMatches.forEach(m => {
                        const key = `${player.id}-${m.id}`
                        const val = offlineManualScores[key]
                        if (val?.home !== undefined && val?.home !== '' && val?.away !== undefined && val?.away !== '') {
                          predMap[m.id] = { home: parseInt(val.home), away: parseInt(val.away) }
                        }
                      })
                      const standings = calcPredictedStandings(groupMatches, predMap)

                      // Resolve a slot — handles both group slots (1A, 2B) and W slots (W73, W74)
                      const resolveOfflineSlot = (slot) => {
                        if (!slot) return null
                        if (slot.startsWith('W')) {
                          // Look up who the player picked to win that match
                          const matchNum = parseInt(slot.replace('W', ''))
                          const koMatch = matches.find(m => m.match_number === matchNum)
                          if (!koMatch) return null
                          const koKey = `${player.id}-${koMatch.id}`
                          const koVal = offlineManualScores[koKey]
                          if (!koVal?.picked_team_id) return null
                          // Find the team object
                          const allTeams = matches.flatMap(m => [m.home_team, m.away_team]).filter(Boolean)
                          return allTeams.find(t => t?.id === koVal.picked_team_id) || null
                        }
                        return resolveSlot(slot, standings, groupMatches, predMap)
                      }

                      return ALL_STAGES.map(stage => (
                        <div key={stage.key}>
                          <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 0 4px' }}>{stage.label} · {stage.points}pts</div>
                          {stage.matches.map(matchDef => {
                            const dbMatch = matches.find(m => m.match_number === matchDef.match_number)
                            if (!dbMatch) return null
                            const key = `${player.id}-${dbMatch.id}`
                            const val = offlineManualScores[key] || {}
                            const homeTeam = resolveOfflineSlot(matchDef.home_slot)
                            const awayTeam = resolveOfflineSlot(matchDef.away_slot)
                            const teams = [homeTeam, awayTeam].filter(Boolean)
                            const pickedTeam = teams.find(t => t?.id === val.picked_team_id)
                            return (
                              <div key={matchDef.match_number} style={{ padding: '6px 8px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: `1px solid ${val.picked_team_id ? 'var(--accent-green)' : 'var(--border-light)'}`, marginBottom: '3px' }}>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                  M{matchDef.match_number} · {matchDef.home_slot} vs {matchDef.away_slot}
                                  {val.picked_team_id && <span style={{ color: 'var(--accent-green)', marginLeft: '6px' }}>✓ {pickedTeam?.name || 'Picked'}</span>}
                                </div>
                                {teams.length === 0 ? (
                                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                    {matchDef.home_slot.startsWith('W') ? `Pick M${matchDef.home_slot.replace('W','')} winner first` : '⚠️ Enter group predictions first'}
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    {teams.map(team => (
                                      <button key={team.id}
                                        onClick={async () => {
                                          const newPickId = val.picked_team_id === team.id ? null : team.id
                                          setOfflineManualScores(prev => ({ ...prev, [key]: { ...prev[key], picked_team_id: newPickId } }))
                                          await supabase.from('offline_predictions').upsert({
                                            offline_player_id: player.id, match_id: dbMatch.id, picked_team_id: newPickId,
                                          }, { onConflict: 'offline_player_id,match_id' })
                                        }}
                                        style={{ flex: 1, padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: `1.5px solid ${val.picked_team_id === team.id ? 'var(--accent-green)' : 'var(--border-light)'}`, background: val.picked_team_id === team.id ? 'var(--accent-green-light)' : 'var(--bg-secondary)', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                                        {team.flag_emoji} {team.short_code || team.name}{val.picked_team_id === team.id && ' ✓'}
                                      </button>
                                    ))}
                                    {teams.length === 1 && <div style={{ flex: 1, padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1.5px dashed var(--border-medium)', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>TBD</div>}
                                  </div>
                                )}
                                {/* Override — pick any team if bracket prediction was wrong */}
                                <details style={{ marginTop: '4px' }}>
                                  <summary style={{ fontSize: '10px', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>🔧 Override — pick any team</summary>
                                  <select onChange={async e => {
                                    if (!e.target.value) return
                                    const newId = e.target.value
                                    setOfflineManualScores(prev => ({ ...prev, [key]: { ...prev[key], picked_team_id: newId } }))
                                    await supabase.from('offline_predictions').upsert({
                                      offline_player_id: player.id, match_id: dbMatch.id, picked_team_id: newId,
                                    }, { onConflict: 'offline_player_id,match_id' })
                                  }} value={val.picked_team_id || ''}
                                    style={{ width: '100%', marginTop: '4px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-light)', fontSize: '12px' }}>
                                    <option value="">Select any team...</option>
                                    {matches.reduce((acc, m) => {
                                      if (m.home_team && !acc.find(t => t.id === m.home_team.id)) acc.push(m.home_team)
                                      if (m.away_team && !acc.find(t => t.id === m.away_team.id)) acc.push(m.away_team)
                                      return acc
                                    }, []).sort((a,b) => a.name?.localeCompare(b.name)).map(t => (
                                      <option key={t.id} value={t.id}>{t.flag_emoji} {t.name}</option>
                                    ))}
                                  </select>
                                </details>
                              </div>
                            )
                          })}
                        </div>
                      ))
                    })()}
                  </div>
                )}

                {/* Group scores section */}
                {offlineSelectedPlayer?.id === player.id && (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Enter scores — saves on blur</span>
                      <span style={{ color: 'var(--accent-gold)' }}>
                        🃏 {Object.keys(offlineManualScores).filter(k => k.startsWith(player.id) && offlineManualScores[k]?.joker).length} / {
                          (() => { const league = leagues.find(l => l.id === player.league_id); return league?.custom_scoring?.group_jokers ?? 8 })()
                        } jokers used
                      </span>
                    </div>
                    {matches.filter(m => m.stage === 'group').map(match => {
                      const key = `${player.id}-${match.id}`
                      const val = offlineManualScores[key] || {}
                      const hasPred = val.home !== '' && val.away !== '' && val.home !== undefined
                      const maxJokers = (() => { const league = leagues.find(l => l.id === player.league_id); return league?.custom_scoring?.group_jokers ?? 8 })()
                      const jokersUsed = Object.keys(offlineManualScores).filter(k => k.startsWith(player.id) && offlineManualScores[k]?.joker).length
                      const canAddJoker = !val.joker && jokersUsed >= maxJokers
                      return (
                        <div key={match.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 8px', background: hasPred ? 'rgba(0,122,51,0.05)' : 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: val.joker ? '1px solid var(--accent-gold)' : hasPred ? '1px solid rgba(0,122,51,0.15)' : '1px solid var(--border-light)' }}>
                          <span style={{ fontSize: '11px', flex: 1, fontWeight: hasPred ? '600' : '400' }}>
                            {match.home_team?.flag_emoji} {match.home_team?.short_code}
                            <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>vs</span>
                            {match.away_team?.short_code} {match.away_team?.flag_emoji}
                          </span>
                          <input type="number" min="0" max="20" placeholder="0"
                            value={val.home ?? ''}
                            onChange={e => setOfflineManualScores(prev => ({ ...prev, [key]: { ...prev[key], home: e.target.value, saved: false } }))}
                            onBlur={() => saveManualScore(player.id, match.id, val.home, val.away, val.joker || false)}
                            style={{ width: '36px', textAlign: 'center', padding: '3px', borderRadius: '4px', border: '1px solid var(--border-light)', fontSize: '13px', fontWeight: '700' }} />
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>–</span>
                          <input type="number" min="0" max="20" placeholder="0"
                            value={val.away ?? ''}
                            onChange={e => setOfflineManualScores(prev => ({ ...prev, [key]: { ...prev[key], away: e.target.value, saved: false } }))}
                            onBlur={() => saveManualScore(player.id, match.id, val.home, val.away, val.joker || false)}
                            style={{ width: '36px', textAlign: 'center', padding: '3px', borderRadius: '4px', border: '1px solid var(--border-light)', fontSize: '13px', fontWeight: '700' }} />
                          <button
                            disabled={canAddJoker}
                            title={canAddJoker ? 'Joker limit reached' : val.joker ? 'Remove joker' : 'Add joker'}
                            onClick={() => {
                              const newJoker = !val.joker
                              setOfflineManualScores(prev => ({ ...prev, [key]: { ...prev[key], joker: newJoker } }))
                              if (hasPred) saveManualScore(player.id, match.id, val.home, val.away, newJoker)
                            }}
                            style={{ fontSize: '14px', background: 'none', border: 'none', cursor: canAddJoker ? 'not-allowed' : 'pointer', opacity: canAddJoker ? 0.3 : 1, padding: '0 2px' }}>
                            🃏
                          </button>
                          {val.saved && <span style={{ fontSize: '11px', color: 'var(--accent-green)', minWidth: '12px' }}>✓</span>}
                        </div>
                      )
                    })}
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>
                      {Object.keys(offlineManualScores).filter(k => k.startsWith(player.id) && offlineManualScores[k]?.home !== '').length} / {matches.filter(m => m.stage === 'group').length} predictions entered
                    </div>
                  </div>
                )}
                </div>}
                </div>
              )})}
            </div>

            {offlinePlayers.filter(p => {
              const matchSearch = !offlineSearch || p.display_name?.toLowerCase().includes(offlineSearch.toLowerCase())
              const matchLeague = !offlineLeagueFilter || p.league_id === offlineLeagueFilter
              return matchSearch && matchLeague
            }).length === 0 && (
              <div className="card" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>👤</div>
                <div style={{ fontWeight: '700' }}>No offline players yet</div>
                <div style={{ fontSize: '13px', marginTop: '4px' }}>Add one above to include non-registered players in a mini league</div>
              </div>
            )}
          </div>
        )}

        {/* ── POINTS ── */}
        {activeTab === 'points' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* League points amendment — based on Excel scoring */}
            <div className="card" style={{ border: '1px solid var(--scottish-navy)' }}>
              <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '4px' }}>📊 League Points Amendment</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Adjust points for all members of a specific league — useful for applying Excel-format scoring corrections.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <select className="input" value={leagueAmendLeagueId} onChange={e => setLeagueAmendLeagueId(e.target.value)}>
                  <option value="">Select league...</option>
                  {leagues.filter(l => !l.is_global).map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="number" className="input" placeholder="±pts per member" style={{ flex: 1 }}
                    value={leagueAmendAmount} onChange={e => setLeagueAmendAmount(e.target.value)} />
                  <input type="text" className="input" placeholder="Reason (e.g. Excel bonus)" style={{ flex: 2 }}
                    value={leagueAmendReason} onChange={e => setLeagueAmendReason(e.target.value)} />
                </div>
                <button className="btn btn-primary" disabled={leagueAmendSaving || !leagueAmendLeagueId || !leagueAmendAmount || !leagueAmendReason}
                  onClick={async () => {
                    const amount = parseInt(leagueAmendAmount)
                    if (isNaN(amount)) { setActionResult('❌ Invalid amount'); return }
                    setLeagueAmendSaving(true)
                    const { data: members } = await supabase.from('league_members').select('user_id, league_points').eq('league_id', leagueAmendLeagueId)
                    if (!members?.length) { setActionResult('❌ No members found'); setLeagueAmendSaving(false); return }
                    for (const m of members) {
                      await supabase.from('league_members')
                        .update({ league_points: (m.league_points || 0) + amount })
                        .eq('league_id', leagueAmendLeagueId)
                        .eq('user_id', m.user_id)
                      await logAudit('LEAGUE_POINTS_AMENDMENT', { league_id: leagueAmendLeagueId, user_id: m.user_id, amount, reason: leagueAmendReason })
                    }
                    setActionResult(`✅ Applied ${amount > 0 ? '+' : ''}${amount}pts to ${members.length} members · ${leagueAmendReason}`)
                    setLeagueAmendAmount('')
                    setLeagueAmendReason('')
                    setLeagueAmendSaving(false)
                  }}>
                  {leagueAmendSaving ? '⏳ Applying...' : 'Apply to all league members'}
                </button>
              </div>
            </div>

            {/* Individual player points adjustment */}
            <div className="card" style={{ border: '1px solid var(--scottish-navy)' }}>
              <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '4px' }}>🎯 Individual Player Points</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Add or deduct points for a specific player in a league with a reason (e.g. "Harry Kane goal bonus +5pts")
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <select className="input" value={playerAdjLeagueId} onChange={async e => {
                  setPlayerAdjLeagueId(e.target.value)
                  setPlayerAdjUserId('')
                  if (e.target.value) {
                    // Fetch real members
                    const { data: realMembers } = await supabase.from('league_members')
                      .select('user_id, league_points, profile:user_id(id, username, display_name, is_offline)')
                      .eq('league_id', e.target.value)
                    // Fetch offline players in this league
                    const { data: offlineInLeague } = await supabase.from('offline_players')
                      .select('id, display_name, league_points')
                      .eq('league_id', e.target.value)
                    // Merge — offline players as pseudo-members
                    const offlineAsMembers = (offlineInLeague || []).map(op => ({
                      user_id: op.id,
                      league_points: op.league_points || 0,
                      profile: { id: op.id, display_name: op.display_name, username: op.display_name, is_offline: true }
                    }))
                    setPlayerAdjLeagueMembers([...(realMembers || []), ...offlineAsMembers])
                  }
                }}>
                  <option value="">Select league...</option>
                  {leagues.filter(l => !l.is_global).map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
                {playerAdjLeagueId && (
                  <select className="input" value={playerAdjUserId} onChange={e => setPlayerAdjUserId(e.target.value)}>
                    <option value="">Select player...</option>
                    {playerAdjLeagueMembers.map(m => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.profile?.display_name || m.profile?.username || '?'} {m.profile?.is_offline ? '(offline)' : ''} · {m.league_points || 0}pts
                      </option>
                    ))}
                  </select>
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="number" className="input" placeholder="±pts (e.g. +5 or -3)" style={{ flex: 1 }}
                    value={playerAdjAmount} onChange={e => setPlayerAdjAmount(e.target.value)} />
                  <input type="text" className="input" placeholder="Reason (e.g. Harry Kane goal bonus)" style={{ flex: 2 }}
                    value={playerAdjReason} onChange={e => setPlayerAdjReason(e.target.value)} />
                </div>
                <button className="btn btn-primary" disabled={playerAdjSaving || !playerAdjLeagueId || !playerAdjUserId || !playerAdjAmount || !playerAdjReason}
                  onClick={async () => {
                    const amount = parseInt(playerAdjAmount)
                    if (isNaN(amount)) { setActionResult('❌ Invalid amount'); return }
                    setPlayerAdjSaving(true)
                    const member = playerAdjLeagueMembers.find(m => m.user_id === playerAdjUserId)
                    const isOffline = member?.profile?.is_offline
                    if (isOffline) {
                      // Update offline_players table
                      await supabase.from('offline_players')
                        .update({ league_points: (member?.league_points || 0) + amount })
                        .eq('id', playerAdjUserId)
                    } else {
                      // Update league_members table
                      await supabase.from('league_members')
                        .update({ league_points: (member?.league_points || 0) + amount })
                        .eq('league_id', playerAdjLeagueId).eq('user_id', playerAdjUserId)
                    }
                    await logAudit('PLAYER_POINTS_ADJUSTMENT', { league_id: playerAdjLeagueId, user_id: playerAdjUserId, amount, reason: playerAdjReason })
                    setActionResult(`✅ ${amount > 0 ? '+' : ''}${amount}pts applied to ${member?.profile?.display_name || member?.profile?.username} · ${playerAdjReason}`)
                    setPlayerAdjAmount('')
                    setPlayerAdjReason('')
                    setPlayerAdjUserId('')
                    // Refresh members list
                    const { data: refreshed } = await supabase.from('league_members')
                      .select('user_id, league_points, profile:user_id(id, username, display_name, is_offline)')
                      .eq('league_id', playerAdjLeagueId)
                    const { data: refreshedOffline } = await supabase.from('offline_players')
                      .select('id, display_name, league_points').eq('league_id', playerAdjLeagueId)
                    const offlineAsMembers = (refreshedOffline || []).map(op => ({
                      user_id: op.id, league_points: op.league_points || 0,
                      profile: { id: op.id, display_name: op.display_name, username: op.display_name, is_offline: true }
                    }))
                    setPlayerAdjLeagueMembers([...(refreshed || []), ...offlineAsMembers])
                    setPlayerAdjSaving(false)
                  }}>
                  {playerAdjSaving ? '⏳ Saving...' : 'Apply to player'}
                </button>
              </div>
            </div>

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
              { key: 'points_maintenance', label: '🔧 Points Maintenance Mode', desc: 'Hide all points/scores from users — show "points being updated" message instead. Use when recalculating or fixing scores.', type: 'toggle' },
              { key: 'registration_open', label: 'Registration Open', desc: 'Allow new user registrations', type: 'toggle' },
              { section: '📊 Group Standings' },
              { key: 'show_group_tables', label: 'Show Group Tables', desc: 'Show real vs predicted standings tab on predictions page', type: 'toggle' },
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
      {/* Edit User Predictions Modal */}
      {editingUserPreds && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
          <div className="card" style={{ maxWidth: '560px', width: '100%', marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontWeight: '800', fontSize: '16px' }}>
                ✏️ Edit Predictions — {users.find(u => u.id === editingUserPreds)?.username}
              </div>
              <button onClick={() => { setEditingUserPreds(null); setUserPredictions([]); setAllMatches([]) }}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>×</button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', marginBottom: '14px' }}>
              {[
                { key: 'group', label: '⚽ Group (72)' },
                { key: 'knockout', label: '🏆 Knockout' },
                { key: 'awards', label: '🥇 Awards' },
              ].map(tab => (
                <button key={tab.key} onClick={() => setEditModalTab(tab.key)} style={{
                  padding: '8px 14px', fontSize: '12px', fontWeight: editModalTab === tab.key ? '700' : '400',
                  color: editModalTab === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
                  borderBottom: editModalTab === tab.key ? '2px solid var(--scottish-navy)' : '2px solid transparent',
                  background: 'none', border: 'none', cursor: 'pointer',
                }}>
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ fontSize: '12px', color: '#e65100', background: '#fff3e0', padding: '8px 12px', borderRadius: 'var(--radius-sm)', marginBottom: '12px', fontWeight: '600' }}>
              ⚠️ User will be notified of any changes. All edits are logged.
            </div>

            {loadingUserPreds ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}><div className="spinner" /></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '65vh', overflowY: 'auto' }}>

                {/* GROUP PREDICTIONS */}
                {editModalTab === 'group' && allMatches.map(match => {
                  const existing = userPredictions.find(p => p.match_id === match.id)
                  const edited = editedPreds[match.id]
                  const currentHome = edited?.home ?? existing?.home_score ?? ''
                  const currentAway = edited?.away ?? existing?.away_score ?? ''
                  const isDirty = edited !== undefined
                  const isNew = !existing

                  return (
                    <div key={match.id} style={{
                      padding: '8px 12px', borderRadius: 'var(--radius-md)',
                      background: isNew ? 'var(--accent-blue-light)' : 'var(--bg-secondary)',
                      border: isDirty ? '1px solid var(--scottish-navy)' : isNew ? '1px solid var(--accent-blue)' : '1px solid var(--border-light)',
                    }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '5px' }}>
                        M{match.match_number} · {match.home_team?.flag_emoji} {match.home_team?.short_code} vs {match.away_team?.short_code} {match.away_team?.flag_emoji}
                        {isNew && <span style={{ marginLeft: '6px', color: 'var(--accent-blue)', fontWeight: '700' }}>NO PICK</span>}
                        {match.status === 'completed' && <span style={{ marginLeft: '6px', color: 'var(--accent-green)' }}>● Done</span>}
                        {existing?.is_confident && <span style={{ marginLeft: '6px', color: '#ff9800' }}>🃏</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="number" min="0" max="20" value={currentHome}
                          onChange={e => setEditedPreds(prev => ({ ...prev, [match.id]: { home: e.target.value, away: prev[match.id]?.away ?? existing?.away_score ?? '' } }))}
                          style={{ width: '44px', height: '30px', textAlign: 'center', fontWeight: '700', fontSize: '15px', border: `2px solid ${isDirty ? 'var(--scottish-navy)' : 'var(--border-medium)'}`, borderRadius: 'var(--radius-sm)' }} />
                        <span style={{ fontWeight: '800', color: 'var(--text-muted)' }}>–</span>
                        <input type="number" min="0" max="20" value={currentAway}
                          onChange={e => setEditedPreds(prev => ({ ...prev, [match.id]: { away: e.target.value, home: prev[match.id]?.home ?? existing?.home_score ?? '' } }))}
                          style={{ width: '44px', height: '30px', textAlign: 'center', fontWeight: '700', fontSize: '15px', border: `2px solid ${isDirty ? 'var(--scottish-navy)' : 'var(--border-medium)'}`, borderRadius: 'var(--radius-sm)' }} />
                        {isDirty && (
                          <button onClick={() => saveEditedPrediction(match.id, editedPreds[match.id].home, editedPreds[match.id].away, editingUserPreds, isNew)}
                            className="btn btn-primary btn-sm" style={{ background: 'var(--scottish-navy)', marginLeft: 'auto' }}>
                            {isNew ? '+ Add' : 'Save'}
                          </button>
                        )}
                        {existing && !isDirty && (
                          <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {existing.points_awarded > 0 ? `+${existing.points_awarded}pts` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* KNOCKOUT PICKS */}
                {editModalTab === 'knockout' && (
                  userKoPicks.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '13px' }}>
                      No knockout picks made yet
                    </div>
                  ) : userKoPicks.map(pick => (
                    <div key={pick.id} style={{ padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                        Match #{pick.match_number} · {pick.stage?.toUpperCase()}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        Winner ID: <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{pick.winner_team_id?.slice(-8)}</span>
                        {pick.is_joker && <span style={{ marginLeft: '6px', color: '#ff9800' }}>🃏 Joker</span>}
                      </div>
                    </div>
                  ))
                )}

                {/* AWARD PREDICTIONS */}
                {editModalTab === 'awards' && (
                  userAwardPreds.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '13px' }}>
                      No award predictions made yet
                    </div>
                  ) : userAwardPreds.map(award => (
                    <div key={award.id} style={{ padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>
                        {award.award_type?.replace(/_/g, ' ')}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '700' }}>
                        {award.predicted_player_name || '—'}
                      </div>
                    </div>
                  ))
                )}

              </div>
            )}
          </div>
        </div>
      )}

      {confirmAction && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ maxWidth: '360px', width: '100%' }}>
            <div style={{ fontWeight: '800', fontSize: '16px', marginBottom: '8px' }}>
              {confirmAction.type === 'ban' ? '🚫 Ban User' :
               confirmAction.type === 'reset' ? '↺ Reset Predictions' :
               confirmAction.type === 'makeAdmin' ? '⭐ Make Super Admin' :
               confirmAction.type === 'makeLeagueAdmin' ? '🏆 Make League Admin' :
               confirmAction.type === 'removeMember' ? '👤 Remove Member' :
               confirmAction.type === 'deleteOfflinePlayer' ? '🗑️ Delete Offline Player' :
               '🗑️ Delete League'}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              {confirmAction.type === 'ban' ? `Ban ${confirmAction.username}? They won't be able to sign in.` :
               confirmAction.type === 'reset' ? `Delete all predictions for ${confirmAction.username}? This cannot be undone.` :
               confirmAction.type === 'makeAdmin' ? `Give ${confirmAction.username} full super admin access?` :
               confirmAction.type === 'makeLeagueAdmin' ? `Give ${confirmAction.username} league admin access (leagues, offline players, points)?` :
               confirmAction.type === 'removeMember' ? `Remove ${confirmAction.username} from "${confirmAction.leagueName}"?` :
               confirmAction.type === 'deleteOfflinePlayer' ? `Delete offline player "${confirmAction.displayName}" and all their predictions? This cannot be undone.` :
               `Delete league "${confirmAction.leagueName}"? All members will be removed.`}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => {
                if (confirmAction.type === 'ban') banUser(confirmAction.userId, confirmAction.username)
                else if (confirmAction.type === 'reset') resetUserPredictions(confirmAction.userId, confirmAction.username)
                else if (confirmAction.type === 'makeAdmin') makeAdmin(confirmAction.userId, confirmAction.username)
                else if (confirmAction.type === 'makeLeagueAdmin') makeLeagueAdmin(confirmAction.userId, confirmAction.username)
                else if (confirmAction.type === 'removeMember') removeMemberFromLeague(confirmAction.leagueId, confirmAction.userId, confirmAction.username, confirmAction.leagueName)
                else if (confirmAction.type === 'deleteLeague') deleteLeague(confirmAction.leagueId, confirmAction.leagueName)
                else if (confirmAction.type === 'deleteKoLeague') deleteKoLeague(confirmAction.leagueId, confirmAction.leagueName)
                else if (confirmAction.type === 'deleteOfflinePlayer') deleteOfflinePlayer(confirmAction.playerId, confirmAction.displayName)
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
