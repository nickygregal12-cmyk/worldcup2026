import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { ALL_STAGES, calcPredictedStandings, resolveSlot } from '../lib/bracketUtils.js'
import BracketHealth from '../components/BracketHealth.jsx'
import AdminUserBracketEditor from '../components/AdminUserBracketEditor.jsx'
import AdminKOFixtures from '../components/AdminKOFixtures.jsx'
import { useAuthStore, useAppStore } from '../store/index.js'
import { calculateGroupPredictionPoints } from '../lib/scoring.js'
import { DATES } from '../lib/tournamentDates.js'
import { tournamentGoalTotal } from '../lib/goalTotals.js'
import AdminDashboard from '../components/admin/AdminDashboard.jsx'
import MatchManager from '../components/admin/MatchManager.jsx'
import AwardsManager from '../components/admin/AwardsManager.jsx'
import KoPredictorManager from '../components/admin/KoPredictorManager.jsx'
import KoFixtureManager from '../components/admin/KoFixtureManager.jsx'
import UserManager from '../components/admin/UserManager.jsx'
import PredictionCompletionManager from '../components/admin/PredictionCompletionManager.jsx'
import LeagueManager from '../components/admin/LeagueManager.jsx'
import OfflinePlayerManager from '../components/admin/OfflinePlayerManager.jsx'
import PointsManager from '../components/admin/PointsManager.jsx'
import AdminAuditLog from '../components/admin/AdminAuditLog.jsx'
import TournamentSettings from '../components/admin/TournamentSettings.jsx'
import DailyQuestionsManager from '../components/admin/DailyQuestionsManager.jsx'
import MatchFixtureEditor from '../components/admin/MatchFixtureEditor.jsx'
import UserInspectorModal from '../components/admin/UserInspectorModal.jsx'


const PRIMARY_SECTIONS = [
  { key: 'overview', label: 'Overview', icon: '◫', defaultTab: 'health' },
  { key: 'matches', label: 'Matches', icon: '⚽', defaultTab: 'matches' },
  { key: 'users', label: 'Users', icon: '👥', defaultTab: 'users' },
  { key: 'competitions', label: 'Competitions', icon: '🏆', defaultTab: 'leagues' },
  { key: 'tournament', label: 'Tournament', icon: '⚙️', defaultTab: 'awards' },
]

const SECTION_TABS = {
  overview: [
    { key: 'health', label: 'Dashboard', superOnly: true },
    { key: 'audit', label: 'Recent activity', superOnly: true },
  ],
  matches: [
    { key: 'matches', label: 'All tournament matches', superOnly: true },
  ],
  users: [
    { key: 'users', label: 'User inspector', superOnly: true },
    { key: 'completion', label: 'Prediction completion', superOnly: true },
    { key: 'points', label: 'Points control', superOnly: false },
  ],
  competitions: [
    { key: 'leagues', label: 'Leagues', superOnly: false },
    { key: 'offline', label: 'Offline players', superOnly: false },
  ],
  tournament: [
    { key: 'awards', label: 'Awards', superOnly: true },
    { key: 'questions', label: 'Daily questions', superOnly: true },
    { key: 'settings', label: 'Settings & maintenance', superOnly: true },
  ],
}

const AWARD_DEFS = [
  { key: 'golden_boot', label: '👟 Golden Boot', desc: 'Top scorer of the tournament', pts: 15, positionFilter: ['FWD', 'MID'] },
  { key: 'golden_glove', label: '🧤 Golden Glove', desc: 'Best goalkeeper', pts: 10, positionFilter: ['GK'] },
  { key: 'player_of_tournament', label: '🏅 Player of the Tournament', desc: 'Best overall player', pts: 10, positionFilter: null },
  { key: 'total_goals', label: '⚽ Total Goals', desc: 'Total goals scored in tournament', pts: 15, isGoals: true },
]

function AwardsTab({ awardResults, awardSaving, saveAwardResult }) {
  const [inputs, setInputs] = useState(() => {
    const init = {}
    AWARD_DEFS.forEach(a => { init[a.key] = awardResults[a.key]?.winner_name || '' })
    return init
  })
  const [topScorers, setTopScorers] = useState([])
  const [loadingScorers, setLoadingScorers] = useState(false)
  const [players, setPlayers] = useState([])
  const [search, setSearch] = useState({})
  const [openKey, setOpenKey] = useState(null)
  const [settlementChecks, setSettlementChecks] = useState(null)
  const [checkingSettlement, setCheckingSettlement] = useState(false)

  useEffect(() => {
    supabase.from('players').select('id, name, position, team:team_id(name, flag_emoji)').order('name').then(({ data }) => setPlayers(data || []))
  }, [])

  const loadTopScorers = async () => {
    setLoadingScorers(true)
    const { data } = await supabase.from('tournament_scorers').select('*').order('goals', { ascending: false }).limit(5)
    setTopScorers(data || [])
    setLoadingScorers(false)
  }

  const getFilteredPlayers = (awardKey, positionFilter) => {
    const q = (search[awardKey] || '').toLowerCase()
    if (q.length < 2) return []
    return players.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(q)
      const matchesPos = !positionFilter || positionFilter.includes(p.position)
      return matchesSearch && matchesPos
    }).slice(0, 8)
  }

  const selectPlayer = (awardKey, playerName) => {
    setInputs(prev => ({ ...prev, [awardKey]: playerName }))
    setSearch(prev => ({ ...prev, [awardKey]: playerName }))
    setOpenKey(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="card" style={{ border: '1px solid var(--accent-gold)' }}>
        <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: '5px' }}>🏁 Final settlement check</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
          Read-only verification of all 104 fixtures, the final result, extra-time data, official awards and tournament goal total.
        </div>
        <button
          className="btn btn-sm"
          disabled={checkingSettlement}
          onClick={async () => {
            setCheckingSettlement(true)
            const { data, error } = await supabase.rpc('wc26_final_settlement_check')
            setSettlementChecks(error ? [{ check_name: 'Settlement check', passed: false, details: error.message }] : (data || []))
            setCheckingSettlement(false)
          }}
        >
          {checkingSettlement ? 'Checking…' : 'Run final settlement check'}
        </button>
        {settlementChecks && (
          <div style={{ display: 'grid', gap: '6px', marginTop: '12px' }}>
            {settlementChecks.map(check => (
              <div key={check.check_name} style={{ padding: '8px 10px', borderRadius: '8px', background: check.passed ? 'var(--accent-green-light)' : 'rgba(198,40,40,0.08)', color: check.passed ? 'var(--accent-green)' : 'var(--accent-red)', fontSize: '12px', fontWeight: '700' }}>
                {check.passed ? '✓' : '✗'} {check.check_name} · {check.details}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ background: 'var(--accent-blue-light)', border: '1px solid var(--accent-blue)' }}>
        <div style={{ fontSize: '13px', color: 'var(--accent-blue)', fontWeight: '600' }}>
          ℹ️ Search and select from the players table — this guarantees the name matches exactly what users picked. Points auto-award on save.
        </div>
      </div>

      {/* Golden Boot helper */}
      <div className="card" style={{ border: '1px solid var(--accent-gold)' }}>
        <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '8px' }}>🥇 Live Top Scorers</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
          Load current top scorers — click Search to pre-fill the Golden Boot search field.
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
                <button onClick={() => {
                  setSearch(prev => ({ ...prev, golden_boot: s.player_name }))
                  setInputs(prev => ({ ...prev, golden_boot: '' }))
                  setOpenKey('golden_boot')
                }} className="btn btn-sm" style={{ fontSize: '11px', padding: '3px 8px' }}>
                  Search
                </button>
              </div>
            ))}
          </div>
        )}
        {topScorers.length === 0 && !loadingScorers && (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No scorer data yet — syncs once tournament starts.</div>
        )}
      </div>

      {AWARD_DEFS.map(award => {
        const existing = awardResults[award.key]

        if (award.isGoals) {
          return (
            <div key={award.key} className="card">
              <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '4px' }}>{award.label}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{award.desc}</div>
              <div style={{ fontSize: '12px', color: 'var(--accent-blue)', marginBottom: '12px', fontWeight: '600' }}>
                Exact = 15pts · Within 5 = 5pts · Within 10 = 3pts — range scoring handled automatically by DB
              </div>
              {existing && (
                <div style={{ padding: '8px 12px', background: 'var(--accent-green-light)', borderRadius: 'var(--radius-sm)', marginBottom: '10px', fontSize: '13px', color: 'var(--accent-green)', fontWeight: '600' }}>
                  ✓ Result recorded: {existing.winner_name} goals — points already awarded
                </div>
              )}
              <div style={{ padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', marginBottom: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                💡 Once all 104 matches are complete, click "Auto-calculate from results" to pull the real total directly from match data and award points automatically. Or enter manually if needed.
              </div>
              <button
                onClick={async () => {
                  const { data, error } = await supabase.from('matches')
                    .select('match_number, home_score, away_score, outcome_type, aet_home_score, aet_away_score')
                    .eq('status', 'completed')
                  if (error) {
                    alert(`Could not load completed matches: ${error.message}`)
                    return
                  }
                  const tournamentMatches = (data || []).filter(m => Number.isInteger(m.match_number) && m.match_number >= 1 && m.match_number <= 104)
                  const uniqueMatchNumbers = new Set(tournamentMatches.map(m => m.match_number))
                  if (tournamentMatches.length !== 104 || uniqueMatchNumbers.size !== 104) {
                    alert(`Expected 104 unique completed tournament matches; found ${uniqueMatchNumbers.size}. Resolve missing or duplicate fixtures before settlement.`)
                    return
                  }
                  const invalidExtraTime = tournamentMatches.find(m => ['et', 'penalties'].includes(m.outcome_type) && (m.aet_home_score == null || m.aet_away_score == null))
                  if (invalidExtraTime) {
                    alert(`Match ${invalidExtraTime.match_number} is missing its after-extra-time score. Fix it before calculating total goals.`)
                    return
                  }
                  const total = tournamentGoalTotal(tournamentMatches)
                  if (window.confirm(`Auto-calculated total: ${total} goals from 104 matches, including extra time but excluding shootouts. Save and award points?`)) {
                    saveAwardResult(award.key, String(total), award.pts)
                  }
                }}
                className="btn btn-sm" style={{ marginBottom: '10px', background: 'var(--accent-green)', color: 'white', border: 'none', width: '100%' }}>
                🔢 Auto-calculate from results
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input className="input" style={{ flex: 1 }} type="number" min="0" max="400"
                  placeholder="or enter manually e.g. 147"
                  value={inputs[award.key] || ''}
                  onChange={e => setInputs(prev => ({ ...prev, [award.key]: e.target.value }))}
                />
                <button onClick={() => saveAwardResult(award.key, inputs[award.key], award.pts)}
                  disabled={!inputs[award.key] || awardSaving[award.key]}
                  className="btn btn-primary btn-sm">
                  {awardSaving[award.key] ? '...' : existing ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
          )
        }

        const filteredPlayers = getFilteredPlayers(award.key, award.positionFilter)
        const isOpen = openKey === award.key && filteredPlayers.length > 0
        const selectedName = inputs[award.key]

        return (
          <div key={award.key} className="card">
            <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '4px' }}>{award.label}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
              {award.desc} · {award.pts}pts
              {award.positionFilter && <span style={{ marginLeft: '6px', opacity: 0.7 }}>({award.positionFilter.join('/')} only)</span>}
            </div>
            {existing && (
              <div style={{ padding: '8px 12px', background: 'var(--accent-green-light)', borderRadius: 'var(--radius-sm)', marginBottom: '10px', fontSize: '13px', color: 'var(--accent-green)', fontWeight: '600' }}>
                ✓ Result recorded: {existing.winner_name}
              </div>
            )}
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <input className="input"
                placeholder="Search player name..."
                value={search[award.key] !== undefined ? search[award.key] : (selectedName || '')}
                onChange={e => {
                  setSearch(prev => ({ ...prev, [award.key]: e.target.value }))
                  setInputs(prev => ({ ...prev, [award.key]: '' }))
                  setOpenKey(award.key)
                }}
                onFocus={() => setOpenKey(award.key)}
                onBlur={() => setTimeout(() => setOpenKey(null), 150)}
              />
              {isOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', zIndex: 200, maxHeight: '240px', overflowY: 'auto', marginTop: '4px' }}>
                  {filteredPlayers.map(p => (
                    <button key={p.id} onMouseDown={() => selectPlayer(award.key, p.name)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--border-light)' }}>
                      <span style={{ fontSize: '16px' }}>{p.team?.flag_emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '700', fontSize: '13px' }}>{p.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.team?.name}</div>
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: 'var(--radius-full)', background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>{p.position}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedName && (
              <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', marginBottom: '10px', fontSize: '13px', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Selected: <strong>{selectedName}</strong></span>
                <button onClick={() => { setInputs(prev => ({ ...prev, [award.key]: '' })); setSearch(prev => ({ ...prev, [award.key]: '' })) }}
                  style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>✕ Clear</button>
              </div>
            )}
            <button onClick={() => saveAwardResult(award.key, selectedName, award.pts)}
              disabled={!selectedName || awardSaving[award.key]}
              className="btn btn-primary btn-sm">
              {awardSaving[award.key] ? '...' : existing ? 'Update winner' : 'Save winner'}
            </button>
          </div>
        )
      })}
    </div>
  )
}
async function callAdminFunction(path, options = {}) {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !session?.access_token) throw new Error('Your admin session has expired. Sign in again.')

  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      ...(options.headers || {}),
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`)
  return payload
}


export default function AdminPanel() {
  const {
    user,
    profile: authProfile,
    isAdmin,
    isLeagueAdmin: storeIsLeagueAdmin,
  } = useAuthStore()
  const [profile, setProfile] = useState(authProfile || null)
  const [profileChecked, setProfileChecked] = useState(Boolean(authProfile))

  // AdminRoute already waits for the restored store profile. Keep this local
  // lookup for a fresh admin_level value, but never redirect while it is pending.
  useEffect(() => {
    if (!user?.id) {
      setProfile(null)
      setProfileChecked(true)
      return
    }

    let cancelled = false
    setProfile(authProfile || null)
    setProfileChecked(Boolean(authProfile))

    supabase
      .from('profiles')
      .select('id, admin_level, is_admin')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (!error && data) setProfile(data)
        setProfileChecked(true)
      })
      .catch(() => {
        if (!cancelled) setProfileChecked(true)
      })

    return () => { cancelled = true }
  }, [user?.id])

  const isSuperAdmin = isAdmin || Boolean(profile?.is_admin)
  const isLeagueAdmin = storeIsLeagueAdmin || profile?.admin_level === 'league_admin'
  const hasAdminAccess = isSuperAdmin || isLeagueAdmin
  const navigate = useNavigate()
  const [primarySection, setPrimarySection] = useState(() => isSuperAdmin ? 'overview' : 'competitions')
  const [activeTab, setActiveTab] = useState(() => isSuperAdmin ? 'health' : 'leagues')
  const visiblePrimarySections = PRIMARY_SECTIONS.filter(section => isSuperAdmin || ['competitions','users'].includes(section.key))
  const visibleSectionTabs = (SECTION_TABS[primarySection] || []).filter(tab => isSuperAdmin || !tab.superOnly)
  const selectPrimarySection = (section) => {
    setPrimarySection(section.key)
    const tabs = (SECTION_TABS[section.key] || []).filter(tab => isSuperAdmin || !tab.superOnly)
    if (tabs.length) setActiveTab(tabs[0].key)
  }
  const [loading, setLoading] = useState(true)

  // Data
  const [matches, setMatches] = useState([])
  const [users, setUsers] = useState([])
  const [leagues, setLeagues] = useState([])
  const [auditLog, setAuditLog] = useState([])
  const [settings, setSettings] = useState({})
  const [health, setHealth] = useState({})
  const [allPlayers, setAllPlayers] = useState([])
  const [allTeams, setAllTeams] = useState([])
  const [allGroups, setAllGroups] = useState([])
  const [allVenues, setAllVenues] = useState([])
  const [fixtureEditorMatch, setFixtureEditorMatch] = useState(null)
  const [matchSearch, setMatchSearch] = useState('')
  const [matchStatusFilter, setMatchStatusFilter] = useState('all')

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
  const [jokerManageUser, setJokerManageUser] = useState(null) // { id, username }
  const [jokerPreds, setJokerPreds] = useState([]) // predictions for joker management
  const [jokerLoading, setJokerLoading] = useState(false)
  const [jokerSaving, setJokerSaving] = useState({})
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
  const [editingUserBracket, setEditingUserBracket] = useState(null)
  const [userPredictions, setUserPredictions] = useState([])
  const [userKoPicks, setUserKoPicks] = useState([])
  const [userAwardPreds, setUserAwardPreds] = useState([])
  const [userTournamentPreds, setUserTournamentPreds] = useState([])
  const [editingAwardPred, setEditingAwardPred] = useState(null)
  const [editingAwardValue, setEditingAwardValue] = useState('')
  const [allMatches, setAllMatches] = useState([])
  const [loadingUserPreds, setLoadingUserPreds] = useState(false)
  const [editedPreds, setEditedPreds] = useState({})
  const [editModalTab, setEditModalTab] = useState('view') // view | group | knockout | awards
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
    if (!user || !profileChecked) return

    if (!hasAdminAccess) {
      navigate('/', { replace: true })
      return
    }

    loadAll()
  }, [user?.id, profileChecked, hasAdminAccess])

  useEffect(() => {
    if (activeTab === 'ko') loadKoData()
    if (activeTab === 'settings') { loadSettings(); if (matches.length === 0) loadMatches() }
    if (activeTab === 'offline') { if (leagues.length === 0) loadLeagues(); if (matches.length === 0) loadMatches(); loadOfflinePlayers() }
  }, [activeTab])

  const loadAll = async () => {
    setLoading(true)
    supabase.from('players').select('id, name, position, team:team_id(name, flag_emoji)').order('name').then(({ data }) => setAllPlayers(data || []))
    const [teamsRes, groupsRes, venuesRes] = await Promise.all([
      supabase.from('teams').select('id, name, short_code, flag_emoji').order('name'),
      supabase.from('groups').select('id, name').order('name'),
      supabase.from('venues').select('*').order('city'),
    ])
    setAllTeams(teamsRes.data || [])
    setAllGroups(groupsRes.data || [])
    setAllVenues(venuesRes.data || [])
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
    // Keep the main fixture query deliberately conservative. A missing/renamed
    // venue column must never make the entire Matches workspace appear empty.
    const [{ data: matchRows, error: matchError }, { data: groups }, { data: venues }] = await Promise.all([
      supabase.from('matches')
        .select('*, home_team:home_team_id(id,name,flag_emoji,short_code), away_team:away_team_id(id,name,flag_emoji,short_code)')
        .order('kickoff_time', { ascending: true }),
      supabase.from('groups').select('*'),
      supabase.from('venues').select('*'),
    ])

    if (matchError) {
      console.error('Admin matches failed to load:', matchError)
      setActionResult(`Matches failed to load: ${matchError.message}`)
      setMatches([])
      return
    }

    const groupMap = Object.fromEntries((groups || []).map(g => [g.id, g]))
    const venueMap = Object.fromEntries((venues || []).map(v => [v.id, v]))
    setAllGroups(groups || [])
    setAllVenues(venues || [])

    setMatches((matchRows || []).map(m => ({
      ...m,
      group: groupMap[m.group_id] || null,
      venue: venueMap[m.venue_id] || null,
    })))
  }

  const loadUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    setUsers(data || [])
  }

  const loadJokerPreds = async (userId) => {
    setJokerLoading(true)
    const { data } = await supabase
      .from('predictions')
      .select('match_id, home_score, away_score, is_confident, match:match_id(match_number, kickoff_time, status, home_team:home_team_id(name, flag_emoji, short_code), away_team:away_team_id(name, flag_emoji, short_code))')
      .eq('user_id', userId)
      .order('match_id')
    setJokerPreds((data || []).sort((a, b) => a.match?.match_number - b.match?.match_number))
    setJokerLoading(false)
  }

  const toggleAdminJoker = async (userId, matchId, currentJoker, username) => {
    setJokerSaving(prev => ({ ...prev, [matchId]: true }))
    const newJoker = !currentJoker

    // Update is_confident via RPC to bypass RLS (admin updating another user's prediction)
    const { error: predErr } = await supabase.rpc('admin_set_joker', {
      p_user_id: userId,
      p_match_id: matchId,
      p_is_confident: newJoker,
    })
    if (predErr) {
      console.error('Failed to update joker:', predErr)
      setJokerSaving(prev => ({ ...prev, [matchId]: false }))
      return
    }

    // Update local jokerPreds first so count is accurate
    const updatedPreds = jokerPreds.map(p => p.match_id === matchId ? { ...p, is_confident: newJoker } : p)
    setJokerPreds(updatedPreds)

    // Count jokers from updated local state (avoids RLS issues with cross-user count)
    const jokersUsed = updatedPreds.filter(p => p.is_confident).length
    const remaining = Math.max(0, 8 - jokersUsed)

    // Use RPC to bypass RLS for the profile update (admin updating another user's profile)
    const { error: rpcErr } = await supabase.rpc('admin_set_jokers_remaining', {
      p_user_id: userId,
      p_remaining: remaining,
    })

    // Fallback: if RPC doesn't exist yet, try direct update (works if admin has bypass)
    if (rpcErr) {
      await supabase.from('profiles')
        .update({ jokers_group_remaining: remaining })
        .eq('id', userId)
    }

    await logAudit('ADMIN_TOGGLE_JOKER', { user_id: userId, username, match_id: matchId, joker: newJoker, remaining })
    setJokerSaving(prev => ({ ...prev, [matchId]: false }))
    loadUsers()
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
    setActionResult('Contacting football-data.org…')
    try {
      const data = await callAdminFunction('/.netlify/functions/sync-scores', { method: 'POST' })

      if (data.disabled || data.skipped) {
        setActionResult(`Sync not run — ${data.message || 'Live API is disabled in Settings.'}`)
        return
      }

      const parts = [
        `${data.updated || 0} matches updated`,
        `${data.pointsCalculated || 0} points calculated`,
      ]
      if (data.fixturesPopulated) parts.push(`${data.fixturesPopulated} KO fixtures populated`)
      if (data.standingsSynced) parts.push('standings synced')

      const warnings = Array.isArray(data.errors) && data.errors.length
        ? ` · Warnings: ${data.errors.slice(0, 3).join(' | ')}`
        : ''

      setActionResult(`✅ Sync complete — ${parts.join(', ')}${warnings}`)
      await logAudit('MANUAL_SYNC', {
        updated: data.updated,
        pointsCalculated: data.pointsCalculated,
        fixturesPopulated: data.fixturesPopulated,
        standingsSynced: data.standingsSynced,
        errors: data.errors || [],
      })
      await Promise.all([loadHealth(), loadMatches()])
    } catch (e) {
      setActionResult(`❌ Sync failed — ${e.message}`)
    } finally {
      setSaving(prev => ({ ...prev, sync: false }))
    }
  }

  const prepopulateMatchIds = async () => {
    setSaving(prev => ({ ...prev, prepopulate: true }))
    try {
      const data = await callAdminFunction('/.netlify/functions/prepopulate-matches', { method: 'POST' })
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
    try {
      const { error: saveError } = await supabase.from('award_results').upsert(
        { award_type: awardType, winner_name: winner, points_value: parseInt(pts) },
        { onConflict: 'award_type' }
      )
      if (saveError) throw new Error(`Result was not saved: ${saveError.message}`)

      const { error: pointsError } = await supabase.rpc('calculate_award_points', { p_award_type: awardType })
      if (pointsError) throw new Error(`Result saved, but points were not recalculated: ${pointsError.message}`)

      await logAudit('AWARD_RESULT', { award_type: awardType, winner, points: parseInt(pts) })
      setActionResult(`✅ ${awardType} result saved and all totals recalculated`)
      await loadAwardResults()
    } catch (error) {
      console.error('Award settlement failed:', error)
      setActionResult(`❌ ${error.message}`)
    } finally {
      setAwardSaving(prev => ({ ...prev, [awardType]: false }))
    }
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
    const parseScore = value => {
      if (value === '' || value === null || value === undefined) return null
      const parsed = Number.parseInt(value, 10)
      return Number.isInteger(parsed) && parsed >= 0 ? parsed : null
    }

    const homeScore = parseScore(s.home)
    const awayScore = parseScore(s.away)
    const outcomeType = s.outcome_type || '90mins'
    const aetHomeScore = parseScore(s.aet_home)
    const aetAwayScore = parseScore(s.aet_away)
    const pensHomeScore = parseScore(s.pens_home)
    const pensAwayScore = parseScore(s.pens_away)

    if (homeScore === null || awayScore === null) {
      setActionResult('❌ Enter the score after 90 minutes for both teams')
      return
    }

    let winnerId = null

    if (!s.winner_id || ![match.home_team_id, match.away_team_id].includes(s.winner_id)) {
      setActionResult('❌ Select the match winner')
      return
    }

    if (outcomeType === '90mins') {
      if (homeScore === awayScore) {
        setActionResult('❌ A knockout match cannot finish level after 90 minutes. Select Extra Time or Penalties.')
        return
      }
      winnerId = homeScore > awayScore ? match.home_team_id : match.away_team_id
      if (s.winner_id !== winnerId) {
        setActionResult('❌ The selected winner does not match the score after 90 minutes')
        return
      }
    }

    if (outcomeType === 'et') {
      if (homeScore !== awayScore) {
        setActionResult('❌ Extra time requires the score after 90 minutes to be level')
        return
      }
      if (aetHomeScore === null || aetAwayScore === null) {
        setActionResult('❌ Enter the score after extra time')
        return
      }
      if (aetHomeScore === aetAwayScore) {
        setActionResult('❌ An extra-time result must have a winner. Select Penalties if it was still level after 120 minutes.')
        return
      }
      winnerId = aetHomeScore > aetAwayScore ? match.home_team_id : match.away_team_id
      if (s.winner_id && s.winner_id !== winnerId) {
        setActionResult('❌ The selected winner does not match the score after extra time')
        return
      }
    }

    if (outcomeType === 'penalties') {
      if (homeScore !== awayScore) {
        setActionResult('❌ Penalties require the score after 90 minutes to be level')
        return
      }
      if (aetHomeScore === null || aetAwayScore === null) {
        setActionResult('❌ Enter the score after extra time before recording a penalty shootout')
        return
      }
      if (aetHomeScore !== aetAwayScore) {
        setActionResult('❌ A penalty shootout can only happen when the score is still level after extra time')
        return
      }
      if (pensHomeScore === null || pensAwayScore === null) {
        setActionResult('❌ Enter the penalty shootout score for both teams')
        return
      }
      if (pensHomeScore === pensAwayScore) {
        setActionResult('❌ Penalty shootout scores cannot finish level')
        return
      }
      const shootoutWinner = pensHomeScore > pensAwayScore ? match.home_team_id : match.away_team_id
      if (shootoutWinner !== s.winner_id) {
        setActionResult('❌ The selected winner does not match the penalty shootout score')
        return
      }
      winnerId = s.winner_id
    }

    setKoSaving(prev => ({ ...prev, [match.id]: true }))

    const { error } = await supabase.from('matches').update({
      // These are deliberately the scores after 90 minutes. KO prediction
      // exact-score points are based on this result.
      home_score: homeScore,
      away_score: awayScore,
      winner_team_id: winnerId,
      outcome_type: outcomeType,
      // Keep both historic AET column pairs in sync while WC26 is live.
      aet_home_score: outcomeType === '90mins' ? null : aetHomeScore,
      aet_away_score: outcomeType === '90mins' ? null : aetAwayScore,
      home_score_aet: outcomeType === '90mins' ? null : aetHomeScore,
      away_score_aet: outcomeType === '90mins' ? null : aetAwayScore,
      home_score_pens: outcomeType === 'penalties' ? pensHomeScore : null,
      away_score_pens: outcomeType === 'penalties' ? pensAwayScore : null,
      first_goal_band: s.first_goal_band || null,
      status: 'completed',
      use_manual_override: true,
    }).eq('id', match.id)

    if (error) {
      setActionResult(`❌ Error: ${error.message}`)
      setKoSaving(prev => ({ ...prev, [match.id]: false }))
      return
    }

    const scoringErrors = []

    const { error: originalKoErr } = await supabase.rpc('calculate_knockout_points', { p_match_id: match.id })
    if (originalKoErr) scoringErrors.push(`original tournament KO: ${originalKoErr.message}`)

    const { error: koPredictorErr } = await supabase.rpc('calculate_ko_prediction_points', { p_match_id: match.id })
    if (koPredictorErr) scoringErrors.push(`KO Predictor: ${koPredictorErr.message}`)

    const { data: allProfiles, error: profileLoadErr } = await supabase.from('profiles').select('id')
    if (profileLoadErr) {
      scoringErrors.push(`profile totals: ${profileLoadErr.message}`)
    } else {
      for (const profileRow of allProfiles || []) {
        const { error: totalErr } = await supabase.rpc('recalculate_user_total_points', { p_user_id: profileRow.id })
        if (totalErr) {
          scoringErrors.push(`total points for ${profileRow.id}: ${totalErr.message}`)
          break
        }
      }
    }

    if (scoringErrors.length) {
      setActionResult(`⚠️ Result saved, but some follow-up actions failed: ${scoringErrors.join(' · ')}`)
    } else {
      setActionResult(`✅ KO Match ${match.match_number} saved — original tournament points, KO Predictor points and user totals recalculated`)
    }

    await logAudit('KO_SCORE_ENTRY', {
      match_id: match.id,
      match_number: match.match_number,
      score_after_90: `${homeScore}-${awayScore}`,
      score_after_extra_time: aetHomeScore === null ? null : `${aetHomeScore}-${aetAwayScore}`,
      penalty_score: pensHomeScore === null ? null : `${pensHomeScore}-${pensAwayScore}`,
      winner_team_id: winnerId,
      outcome: outcomeType,
    })
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
      .select('id, match_number, kickoff_time, status, home_score, away_score, home_team_id, away_team_id, stage, group:group_id(name), home_team:home_team_id(id,name,flag_emoji,short_code), away_team:away_team_id(id,name,flag_emoji,short_code)')
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

    // Load knockout picks — home_team_id and away_team_id are on the row directly
    const { data: koData, error: koErr } = await supabase
      .from('knockout_picks')
      .select(`*,
        team:team_id(id, name, flag_emoji, short_code),
        home_team:home_team_id(id, name, flag_emoji, short_code),
        away_team:away_team_id(id, name, flag_emoji, short_code)
      `)
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

    // Load tournament predictions (total goals etc)
    const { data: tournData } = await supabase
      .from('tournament_predictions')
      .select('*')
      .eq('user_id', userId)
    setUserTournamentPreds(tournData || [])

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

  const [editingUsername, setEditingUsername] = useState(null) // { userId, current }
  const [newUsername, setNewUsername] = useState('')
  const [usernameSaving, setUsernameSaving] = useState(false)

  const saveUsername = async () => {
    if (!newUsername.trim() || !editingUsername) return
    setUsernameSaving(true)
    const displayVal = newUsername.trim()
    const clean = displayVal.toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (!clean) { setUsernameSaving(false); return }
    // Check uniqueness
    const { data: existing } = await supabase.from('profiles').select('id').eq('username', clean).neq('id', editingUsername.userId).maybeSingle()
    if (existing) { alert('Username already taken'); setUsernameSaving(false); return }
    // display_name keeps capitalisation/spaces as typed, username is the clean version
    const { error } = await supabase.from('profiles').update({ username: clean, display_name: displayVal }).eq('id', editingUsername.userId)
    if (error) { alert(error.message); setUsernameSaving(false); return }
    await logAudit('EDIT_USERNAME', { user_id: editingUsername.userId, old_username: editingUsername.current, new_username: clean })
    setActionResult(`✅ Username changed from ${editingUsername.current} to ${clean}`)
    setEditingUsername(null)
    setNewUsername('')
    setUsernameSaving(false)
    loadUsers()
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
      const points = calculateGroupPredictionPoints(p, { home_score: homeScore, away_score: awayScore })
      return {
        username: p.profiles?.username || 'Unknown',
        home: p.home_score,
        away: p.away_score,
        exact,
        correct,
        points,
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

    if (match.stage !== 'group') {
      setActionResult('⚠️ Use KO Match Results or the full fixture editor for knockout games so extra time, penalties, advancing team and both scoring systems are handled correctly.')
      return
    }

    setSaving(prev => ({ ...prev, [match.id]: true }))
    const homeScore = parseInt(s.home)
    const awayScore = parseInt(s.away)
    const winnerId = homeScore > awayScore ? match.home_team_id : awayScore > homeScore ? match.away_team_id : null

    const { error } = await supabase.from('matches').update({
      home_score: homeScore, away_score: awayScore,
      winner_team_id: winnerId, status: 'completed', use_manual_override: true,
    }).eq('id', match.id)

    if (error) { setActionResult(`Error saving score: ${error.message}`); setSaving(prev => ({ ...prev, [match.id]: false })); return }

    // Score real users for the original tournament group-stage predictor.
    const { error: rpcErr } = await supabase.rpc('calculate_prediction_points', { p_match_id: match.id })

    // Score offline players — idempotently recompute each affected player's
    // TOTAL league_points from all their predictions (not additive)
    const { data: affectedOffline } = await supabase
      .from('offline_predictions')
      .select('offline_player_id')
      .eq('match_id', match.id)

    if (affectedOffline?.length) {
      const playerIds = [...new Set(affectedOffline.map(a => a.offline_player_id))]
      // All completed match results
      const { data: completed } = await supabase
        .from('matches').select('id, home_score, away_score').eq('status', 'completed')
      const resultMap = {}
      ;(completed || []).forEach(m => {
        if (m.home_score != null && m.away_score != null) resultMap[m.id] = { h: m.home_score, a: m.away_score }
      })
      // Include the match we just scored (may not be 'completed' in DB yet)
      resultMap[match.id] = { h: homeScore, a: awayScore }

      for (const playerId of playerIds) {
        const { data: preds } = await supabase
          .from('offline_predictions')
          .select('match_id, home_score, away_score, is_confident')
          .eq('offline_player_id', playerId)
        let total = 0
        for (const p of preds || []) {
          const result = resultMap[p.match_id]
          if (!result || p.home_score == null || p.away_score == null) continue
          const actResult = result.h > result.a ? 'H' : result.h < result.a ? 'A' : 'D'
          const predResult = p.home_score > p.away_score ? 'H' : p.home_score < p.away_score ? 'A' : 'D'
          if (predResult !== actResult) continue
          const exact = p.home_score === result.h && p.away_score === result.a
          let pts = exact ? 5 : 3
          if (p.is_confident) pts *= 2
          total += pts
        }
        await supabase.from('offline_players').update({ league_points: total }).eq('id', playerId)
      }
    }

    if (rpcErr) setActionResult(`Score saved but points calc failed: ${rpcErr.message}`)
    else setActionResult(`✅ Score saved — points calculated for all players`)

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

  const snapshotKickoffRanks = async () => {
    setSaving(prev => ({ ...prev, snapshot: true }))
    const { data: ranked, error } = await supabase
      .from('profiles')
      .select('id, total_points')
      .eq('is_banned', false)
      .order('total_points', { ascending: false })
    if (error) { setActionResult(`❌ Snapshot failed: ${error.message}`); setSaving(prev => ({ ...prev, snapshot: false })); return }
    let failed = 0
    for (let i = 0; i < (ranked || []).length; i++) {
      const { error: upErr } = await supabase
        .from('profiles')
        .update({ rank_at_kickoff: i + 1, rank_snapshot_taken_at: new Date().toISOString() })
        .eq('id', ranked[i].id)
      if (upErr) failed++
    }

    // Also snapshot per-league ranks
    const { data: allLeagues } = await supabase.from('leagues').select('id')
    for (const league of allLeagues || []) {
      const { data: members } = await supabase
        .from('league_members')
        .select('id, league_points')
        .eq('league_id', league.id)
        .order('league_points', { ascending: false })
      for (let i = 0; i < (members || []).length; i++) {
        await supabase.from('league_members')
          .update({ rank_snapshot: i + 1 })
          .eq('id', members[i].id)
      }
    }

    await logAudit('SNAPSHOT_KICKOFF_RANKS', { player_count: ranked?.length, failed })
    setSaving(prev => ({ ...prev, snapshot: false }))
    setActionResult(`✅ Ranks snapshotted — ${ranked?.length} global + ${allLeagues?.length} leagues — ↑↓ movement now active`)
  }

  const backfillKnockoutMatchups = async () => {
    setSaving(prev => ({ ...prev, backfillKo: true }))
    setActionResult('⏳ Rebuilding knockout matchups from predictions...')

    // Load all group matches once (needed for standings resolution)
    const { data: groupMatchData } = await supabase
      .from('matches')
      .select('id, match_number, stage, group_id, home_team_id, away_team_id, home_score, away_score, status, group:group_id(name), home_team:home_team_id(id,name,flag_emoji,short_code), away_team:away_team_id(id,name,flag_emoji,short_code)')
      .eq('stage', 'group')

    const { data: userList } = await supabase.from('profiles').select('id')
    const allMatchDefs = ALL_STAGES.flatMap(s => s.matches || [])
    let usersFixed = 0, picksFixed = 0, failed = 0

    for (const u of userList || []) {
      try {
        // Build this user's pure predicted standings
        const { data: preds } = await supabase
          .from('predictions')
          .select('match_id, home_score, away_score')
          .eq('user_id', u.id)
        const predMap = {}
        ;(preds || []).forEach(p => { predMap[p.match_id] = { home: p.home_score, away: p.away_score } })

        // PURE mode — predicted standings only, ignore real results
        const standings = calcPredictedStandings(groupMatchData || [], predMap, true)

        // Load this user's knockout picks
        const { data: koPicks } = await supabase
          .from('knockout_picks')
          .select('match_number, winner_team_id, home_team_id, away_team_id')
          .eq('user_id', u.id)
        if (!koPicks?.length) continue

        const picksByNum = {}
        koPicks.forEach(p => { picksByNum[p.match_number] = { winner_id: p.winner_team_id, home_id: p.home_team_id, away_id: p.away_team_id } })

        // Resolve W-slots (winner of match N) from this user's own winner picks
        const resolveWinner = (slot) => {
          const mn = parseInt(slot.replace('W', ''))
          const pick = picksByNum[mn]
          if (!pick?.winner_id) return null
          // Find team object
          for (const m of groupMatchData || []) {
            if (m.home_team?.id === pick.winner_id) return m.home_team
            if (m.away_team?.id === pick.winner_id) return m.away_team
          }
          return { id: pick.winner_id }
        }

        // For each pick, recompute correct home/away from pure standings
        for (const matchDef of allMatchDefs) {
          const pick = picksByNum[matchDef.match_number]
          if (!pick?.winner_id) continue

          const resolve = (slot) => {
            if (!slot) return null
            if (slot.startsWith('W')) return resolveWinner(slot)
            if (slot.startsWith('L')) return null
            return resolveSlot(slot, standings, groupMatchData || [], predMap)
          }
          const home = resolve(matchDef.home_slot)
          const away = resolve(matchDef.away_slot)

          // Only update if we resolved both and they differ from stored
          if (home?.id && away?.id && (home.id !== pick.home_id || away.id !== pick.away_id)) {
            const { error } = await supabase
              .from('knockout_picks')
              .update({ home_team_id: home.id, away_team_id: away.id })
              .eq('user_id', u.id)
              .eq('match_number', matchDef.match_number)
            if (!error) picksFixed++
          }
        }
        usersFixed++
      } catch (e) {
        failed++
        console.error(`Backfill failed for user ${u.id}:`, e.message)
      }
    }

    await logAudit('BACKFILL_KO_MATCHUPS', { users_fixed: usersFixed, picks_fixed: picksFixed, failed })
    setSaving(prev => ({ ...prev, backfillKo: false }))
    setActionResult(`✅ Rebuilt matchups — ${usersFixed} users, ${picksFixed} picks corrected${failed > 0 ? ` (${failed} errors)` : ''}`)
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

    // Recalculate offline players too — idempotent recompute from all their predictions
    const { data: offlinePlayers } = await supabase.from('offline_players').select('id')
    let offlineCount = 0
    if (offlinePlayers?.length) {
      // Build result map from all completed matches once
      const { data: completed } = await supabase
        .from('matches').select('id, home_score, away_score').eq('status', 'completed')
      const resultMap = {}
      ;(completed || []).forEach(m => {
        if (m.home_score != null && m.away_score != null) resultMap[m.id] = { h: m.home_score, a: m.away_score }
      })
      for (const op of offlinePlayers) {
        const { data: preds } = await supabase
          .from('offline_predictions')
          .select('match_id, home_score, away_score, is_confident')
          .eq('offline_player_id', op.id)
        let total = 0
        for (const p of preds || []) {
          const result = resultMap[p.match_id]
          if (!result || p.home_score == null || p.away_score == null) continue
          const actResult = result.h > result.a ? 'H' : result.h < result.a ? 'A' : 'D'
          const predResult = p.home_score > p.away_score ? 'H' : p.home_score < p.away_score ? 'A' : 'D'
          if (predResult !== actResult) continue
          const exact = p.home_score === result.h && p.away_score === result.a
          let pts = exact ? 5 : 3
          if (p.is_confident) pts *= 2
          total += pts
        }
        await supabase.from('offline_players').update({ league_points: total }).eq('id', op.id)
        offlineCount++
      }
    }

    await logAudit('RECALC_ALL_POINTS', { user_count: userList?.length, offline_count: offlineCount, failed })
    setSaving(prev => ({ ...prev, recalc: false }))
    setActionResult(`Points recalculated for ${userList?.length} users + ${offlineCount} offline players${failed > 0 ? ` (${failed} failed)` : ''}`)
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

  const downloadOfflineTemplate = async () => {
    const XLSX = await import('xlsx')

    // Fetch all 72 group matches
    const { data: matches } = await supabase
      .from('matches')
      .select('match_number, kickoff_time, home_team:home_team_id(name, short_code), away_team:away_team_id(name, short_code), group:group_id(name)')
      .eq('stage', 'group')
      .order('match_number', { ascending: true })

    if (!matches?.length) {
      alert('No matches found — make sure group matches are loaded in the DB.')
      return
    }

    // Build rows matching WC26 template format the parser expects:
    // Col 0: Match #, Col 1: Group, Col 2: Home Team, Col 3: Home Short, Col 4: Country(home)
    // Col 5: blank, Col 6: Home Score, Col 7: Away Score, Col 8: blank
    // Col 9: Country(away), Col 10: Joker (TRUE/FALSE)
    const header = ['Match #', 'Group', 'Home Team', 'Home Short', 'Country', '', 'Home Score', 'Away Score', '', 'Country', 'Joker']

    const rows = matches.map(m => [
      m.match_number,
      m.group?.name || '',
      m.home_team?.name || '',
      m.home_team?.short_code || '',
      m.home_team?.short_code || '',
      '',
      '', // Home Score — to be filled in
      '', // Away Score — to be filled in
      '',
      m.away_team?.short_code || '',
      'FALSE', // Joker — TRUE or FALSE
    ])

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows])

    // Column widths
    ws['!cols'] = [
      { wch: 8 },  // Match #
      { wch: 7 },  // Group
      { wch: 20 }, // Home Team
      { wch: 10 }, // Home Short
      { wch: 10 }, // Country
      { wch: 4 },  // blank
      { wch: 11 }, // Home Score
      { wch: 11 }, // Away Score
      { wch: 4 },  // blank
      { wch: 10 }, // Country
      { wch: 7 },  // Joker
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Predictions')
    XLSX.writeFile(wb, 'WC26_Predictions_Template.xlsx')
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

  const filteredUsers = users.filter(u => {
    if (!userSearch) return true
    const q = userSearch.toLowerCase()
    return u.username?.toLowerCase().includes(q) ||
           u.display_name?.toLowerCase().includes(q) ||
           u.email?.toLowerCase().includes(q)
  })
  const filteredMatches = matches.filter(m => {
    if (stageFilter !== 'all' && m.stage !== stageFilter) return false
    if (matchStatusFilter !== 'all' && m.status !== matchStatusFilter) return false
    if (!matchSearch.trim()) return true
    const q = matchSearch.toLowerCase()
    return String(m.match_number).includes(q) ||
      m.home_team?.name?.toLowerCase().includes(q) ||
      m.away_team?.name?.toLowerCase().includes(q) ||
      m.venue?.city?.toLowerCase().includes(q) ||
      m.venue?.name?.toLowerCase().includes(q)
  })

  const fmt = (t) => t ? new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  const adminContext = {
    user, isAdmin, profile, setProfile, isSuperAdmin, isLeagueAdmin, hasAdminAccess, navigate,
    primarySection, setPrimarySection, activeTab, setActiveTab, visiblePrimarySections, visibleSectionTabs, selectPrimarySection, loading,
    setLoading, matches, setMatches, users, setUsers, leagues, setLeagues, auditLog,
    setAuditLog, settings, setSettings, health, setHealth, allPlayers, setAllPlayers, allTeams,
    setAllTeams, allGroups, setAllGroups, allVenues, setAllVenues, fixtureEditorMatch, setFixtureEditorMatch, matchSearch,
    setMatchSearch, matchStatusFilter, setMatchStatusFilter, stageFilter, setStageFilter, editingMatch, setEditingMatch, scores,
    setScores, saving, setSaving, userSearch, setUserSearch, pointAdjUser, setPointAdjUser, pointAdjAmount,
    setPointAdjAmount, pointAdjReason, setPointAdjReason, confirmAction, setConfirmAction, actionResult, setActionResult, awardResults,
    setAwardResults, awardSaving, setAwardSaving, koMatches, setKoMatches, koLeagues, setKoLeagues, koUsers,
    setKoUsers, jokerManageUser, setJokerManageUser, jokerPreds, setJokerPreds, jokerLoading, setJokerLoading, jokerSaving,
    setJokerSaving, koEditingMatch, setKoEditingMatch, koScores, setKoScores, koSaving, setKoSaving, koStageFilter,
    setKoStageFilter, koPointAdjUser, setKoPointAdjUser, koPointAdjAmount, setKoPointAdjAmount, koPointAdjReason, setKoPointAdjReason, testMatchId,
    setTestMatchId, testHome, setTestHome, testAway, setTestAway, testResult, setTestResult, testLoading,
    setTestLoading, editingUserPreds, setEditingUserPreds, editingUserBracket, setEditingUserBracket, userPredictions, setUserPredictions, userKoPicks,
    setUserKoPicks, userAwardPreds, setUserAwardPreds, userTournamentPreds, setUserTournamentPreds, editingAwardPred, setEditingAwardPred, editingAwardValue,
    setEditingAwardValue, allMatches, setAllMatches, loadingUserPreds, setLoadingUserPreds, editedPreds, setEditedPreds, editModalTab,
    setEditModalTab, editingLeagueName, setEditingLeagueName, editingLeagueNameVal, setEditingLeagueNameVal, addingMemberTo, setAddingMemberTo, addMemberSearch,
    setAddMemberSearch, showCreateLeague, setShowCreateLeague, newLeagueName, setNewLeagueName, newLeagueCreatingFor, setNewLeagueCreatingFor, newLeagueIsGlobal,
    setNewLeagueIsGlobal, newLeaguePreset, setNewLeaguePreset, showCustomScoring, setShowCustomScoring, newLockType, setNewLockType, newLeagueScoring,
    setNewLeagueScoring, SCORING_PRESETS, applyPreset, updateScoring, offlinePlayers, setOfflinePlayers, offlineLeagueId, setOfflineLeagueId,
    offlineDisplayName, setOfflineDisplayName, offlineCreating, setOfflineCreating, offlineImporting, setOfflineImporting, offlineImportPreview, setOfflineImportPreview,
    offlineSelectedPlayer, setOfflineSelectedPlayer, offlineManualScores, setOfflineManualScores, offlineKoMode, setOfflineKoMode, offlineSearch, setOfflineSearch,
    offlineLeagueFilter, setOfflineLeagueFilter, collapsedPlayers, setCollapsedPlayers, leagueAmendLeagueId, setLeagueAmendLeagueId, playerAdjLeagueId, setPlayerAdjLeagueId,
    playerAdjUserId, setPlayerAdjUserId, playerAdjAmount, setPlayerAdjAmount, playerAdjReason, setPlayerAdjReason, playerAdjSaving, setPlayerAdjSaving,
    playerAdjLeagueMembers, setPlayerAdjLeagueMembers, leagueAmendAmount, setLeagueAmendAmount, leagueAmendReason, setLeagueAmendReason, leagueAmendSaving, setLeagueAmendSaving,
    loadAll, loadHealth, loadMatches, loadUsers, loadJokerPreds, toggleAdminJoker, loadLeagues, loadAudit,
    loadSettings, loadAwardResults, callAdminFunction, syncScoresNow, prepopulateMatchIds, saveAwardResult, loadKoData, saveKoMatchResult, recalcAllKoPoints,
    applyKoPointAdjustment, deleteKoLeague, loadUserPredictions, saveEditedPrediction, editingUsername, setEditingUsername, newUsername, setNewUsername,
    usernameSaving, setUsernameSaving, saveUsername, sendBanWarning, runTestPreview, logAudit, saveMatchResult, setMatchLive,
    resetMatchOverride, banUser, unbanUser, resetUserPredictions, makeLeagueAdmin, removeLeagueAdmin, makeAdmin, applyPointAdjustment,
    deleteLeague, updateSetting, snapshotKickoffRanks, backfillKnockoutMatchups, recalcAllPoints, removeMemberFromLeague, renameLeague, addMemberToLeague,
    createLeague, loadOfflinePlayers, createOfflinePlayer, deleteOfflinePlayer, generateInviteLink, saveManualScore, TEAM_ALIASES, normaliseTeam,
    downloadOfflineTemplate, parseExcelFile, confirmImport, parsePdfFile, filteredUsers, filteredMatches, fmt, Link,
    supabase, ALL_STAGES, calcPredictedStandings, resolveSlot, BracketHealth, AdminUserBracketEditor, AdminKOFixtures, calculateGroupPredictionPoints,
    DATES, AwardsTab, AWARD_DEFS,
  }

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #003087, #005eb8)', padding: '20px', color: 'white' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: '800' }}>WC26 Control Centre</h1>
            <span style={{ background: isSuperAdmin ? 'var(--accent-orange)' : 'var(--scottish-navy)', color: 'white', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', marginLeft: '8px' }}>
              {isSuperAdmin ? 'SUPER ADMIN' : 'LEAGUE ADMIN'}
            </span>
            <span style={{ background: 'var(--accent-orange)', color: 'white', padding: '2px 10px', borderRadius: 'var(--radius-full)', fontSize: '11px', fontWeight: '700' }}>ADMIN</span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Live tournament control · {health.totalUsers} users</p>
          {actionResult && (
            <div style={{ marginTop: '8px', background: 'rgba(0,255,0,0.15)', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', color: '#00ff88' }}>
              ✓ {actionResult}
              <button onClick={() => setActionResult('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: '8px' }}>×</button>
            </div>
          )}
        </div>
      </div>

      {/* Primary admin navigation */}
      <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)' }}>
        <div className="container" style={{ paddingTop: '8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${visiblePrimarySections.length}, minmax(0, 1fr))`, gap: '6px' }}>
            {visiblePrimarySections.map(section => (
              <button key={section.key} onClick={() => selectPrimarySection(section)} style={{
                minWidth: 0, padding: '10px 6px', borderRadius: '10px 10px 0 0', border: 'none',
                borderBottom: primarySection === section.key ? '3px solid var(--accent-orange)' : '3px solid transparent',
                background: primarySection === section.key ? 'var(--bg-secondary)' : 'transparent',
                color: primarySection === section.key ? 'var(--text-primary)' : 'var(--text-muted)',
                fontSize: '11px', fontWeight: primarySection === section.key ? 900 : 700, cursor: 'pointer',
              }}><div style={{ fontSize: '17px', lineHeight: 1 }}>{section.icon}</div><div style={{ marginTop: '5px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{section.label}</div></button>
            ))}
          </div>
          {visibleSectionTabs.length > 1 && (
            <div style={{ display: 'flex', gap: '7px', overflowX: 'auto', padding: '9px 0 11px' }}>
              {visibleSectionTabs.map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)} className="btn btn-sm" style={{
                  whiteSpace: 'nowrap', background: activeTab === tab.key ? 'var(--scottish-navy)' : 'var(--bg-secondary)',
                  color: activeTab === tab.key ? 'white' : 'var(--text-secondary)', border: '1px solid var(--border-light)'
                }}>{tab.label}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="container" style={{ padding: '16px' }}>

        {/* ── HEALTH ── */}
        {activeTab === 'health' && <AdminDashboard admin={adminContext} />}

        {/* ── MATCHES ── */}
        {activeTab === 'matches' && <MatchManager admin={adminContext} />}

        {/* ── AWARDS ── */}
        {activeTab === 'awards' && <AwardsManager admin={adminContext} />}

        {/* ── KO PREDICTOR ── */}
        {activeTab === 'ko' && <KoPredictorManager admin={adminContext} />}

        {/* ── KO FIXTURES (manual fallback editor) ── */}
        {activeTab === 'kofixtures' && <KoFixtureManager admin={adminContext} />}

        {/* ── USERS ── */}
        {activeTab === 'users' && <UserManager admin={adminContext} />}

        {/* ── PREDICTION COMPLETION ── */}
        {activeTab === 'completion' && <PredictionCompletionManager admin={adminContext} />}

        {/* ── LEAGUES ── */}
        {activeTab === 'leagues' && <LeagueManager admin={adminContext} />}

        {/* ── OFFLINE PLAYERS ── */}
        {activeTab === 'offline' && <OfflinePlayerManager admin={adminContext} />}

        {/* ── POINTS ── */}
        {activeTab === 'points' && <PointsManager admin={adminContext} />}

        {/* ── AUDIT LOG ── */}
        {activeTab === 'audit' && <AdminAuditLog admin={adminContext} />}

        {/* ── SETTINGS ── */}
        {activeTab === 'settings' && <TournamentSettings admin={adminContext} />}

        {/* ── DAILY QUESTIONS TAB ── */}
        {activeTab === 'questions' && <DailyQuestionsManager admin={adminContext} />}
      </div>

      {/* Full fixture editor — one source of truth for every real match. */}
      {fixtureEditorMatch && (
        <MatchFixtureEditor
          match={fixtureEditorMatch}
          teams={allTeams}
          groups={allGroups}
          venues={allVenues}
          onClose={() => setFixtureEditorMatch(null)}
          onSaved={loadMatches}
          setActionResult={setActionResult}
          logAudit={logAudit}
        />
      )}

      {/* Modern user workspace covering groups, original bracket, KO Predictor and awards. */}
      {editingUserPreds && (
        <UserInspectorModal
          userId={editingUserPreds}
          users={users}
          onClose={() => setEditingUserPreds(null)}
          onChanged={() => { loadUsers(); loadHealth() }}
          setActionResult={setActionResult}
          logAudit={logAudit}
        />
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
