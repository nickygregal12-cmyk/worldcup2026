import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/index.js'

const TOURNAMENT_START = new Date('2026-06-11T19:00:00Z')
const KO_OPEN_DATE = new Date('2026-06-27T22:00:00Z')

export default function Leagues() {
  const { user, isAdmin } = useAuthStore()
  const [activeGame, setActiveGame] = useState('tournament')
  const [myLeagues, setMyLeagues] = useState([])
  const [myKoLeagues, setMyKoLeagues] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [newLeagueName, setNewLeagueName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [expandedLeague, setExpandedLeague] = useState(null)
  const [leagueMembers, setLeagueMembers] = useState({})
  const [loadingMembers, setLoadingMembers] = useState({})
  const [confirmAction, setConfirmAction] = useState(null)
  const [memberModal, setMemberModal] = useState(null)
  const [memberPredictions, setMemberPredictions] = useState([])
  const [loadingPreds, setLoadingPreds] = useState(false)
  const [matchOdds, setMatchOdds] = useState({})

  const tournamentLive = new Date() >= TOURNAMENT_START
  const koLive = new Date() >= KO_OPEN_DATE

  useEffect(() => { if (user) { loadMyLeagues(); loadMyKoLeagues() } }, [user])

  const loadMyLeagues = async () => {
    // Fix 1: get real member count from league_members table
    const { data: memberships } = await supabase
      .from('league_members')
      .select('league_id, league:league_id(id, name, invite_code, is_global, created_by)')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false })

    if (!memberships) { setLoading(false); return }

    // Get real counts for each league
    const leagueIds = memberships.map(m => m.league_id)
    const { data: counts } = await supabase
      .from('league_members')
      .select('league_id')
      .in('league_id', leagueIds)

    const countMap = {}
    counts?.forEach(c => { countMap[c.league_id] = (countMap[c.league_id] || 0) + 1 })

    setMyLeagues(memberships.map(m => ({
      ...m,
      memberCount: countMap[m.league_id] || 1,
    })))
    setLoading(false)
  }

  const loadMyKoLeagues = async () => {
    const { data: memberships } = await supabase
      .from('ko_league_members')
      .select('league_id, league:league_id(id, name, invite_code, created_by)')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false })
    if (!memberships) return
    const leagueIds = memberships.map(m => m.league_id)
    const { data: counts } = await supabase
      .from('ko_league_members').select('league_id').in('league_id', leagueIds)
    const countMap = {}
    counts?.forEach(c => { countMap[c.league_id] = (countMap[c.league_id] || 0) + 1 })
    setMyKoLeagues(memberships.map(m => ({ ...m, memberCount: countMap[m.league_id] || 1 })))
  }

  const createKoLeague = async () => {
    if (!newLeagueName.trim()) { setError('Please enter a league name'); return }
    setError('')
    const code = generateCode()
    const { data: league, error: err } = await supabase
      .from('ko_leagues')
      .insert({ name: newLeagueName.trim(), invite_code: code, created_by: user.id, is_global: false })
      .select().single()
    if (err) { setError(err.message); return }
    await supabase.from('ko_league_members').insert({ league_id: league.id, user_id: user.id })
    setSuccess(`KO League created! Share code: ${code}`)
    setNewLeagueName(''); setShowCreate(false)
    loadMyKoLeagues()
  }

  const joinKoLeague = async () => {
    if (!joinCode.trim()) { setError('Enter an invite code'); return }
    setError('')
    const { data: league } = await supabase.from('ko_leagues').select('*').eq('invite_code', joinCode.toUpperCase().trim()).single()
    if (!league) { setError('KO League not found — check the code'); return }
    const { error: err } = await supabase.from('ko_league_members').insert({ league_id: league.id, user_id: user.id })
    if (err?.code === '23505') { setError('You are already in this league'); return }
    if (err) { setError(err.message); return }
    setSuccess(`Joined KO league "${league.name}"!`)
    setJoinCode(''); setShowJoin(false)
    loadMyKoLeagues()
  }

  const leaveKoLeague = async (leagueId, leagueName) => {
    await supabase.from('ko_league_members').delete().eq('league_id', leagueId).eq('user_id', user.id)
    setSuccess(`Left "${leagueName}"`)
    loadMyKoLeagues()
  }

  const deleteKoLeague = async (leagueId, leagueName) => {
    await supabase.from('ko_league_members').delete().eq('league_id', leagueId)
    await supabase.from('ko_leagues').delete().eq('id', leagueId)
    setSuccess(`Deleted "${leagueName}"`)
    loadMyKoLeagues()
  }

  const loadLeagueMembers = async (leagueId) => {
    setLoadingMembers(prev => ({ ...prev, [leagueId]: true }))
    const { data } = await supabase
      .from('league_members')
      .select('*, profile:user_id(id, username, total_points, display_name, streak_current, exact_scores)')
      .eq('league_id', leagueId)
      .order('joined_at', { ascending: true })
    setLeagueMembers(prev => ({ ...prev, [leagueId]: data || [] }))
    setLoadingMembers(prev => ({ ...prev, [leagueId]: false }))

    // Fix 5: load upcoming matches for pre-match % if tournament is live
    if (tournamentLive) {
      loadPreMatchStats(leagueId, data || [])
    }
  }

  // Item 5: Pre-match % — what % of league picked each outcome for next matches
  const loadPreMatchStats = async (leagueId, members) => {
    const now = new Date().toISOString()
    const memberIds = members.map(m => m.user_id)
    if (!memberIds.length) return

    // Get next 3 upcoming matches
    const { data: upcoming } = await supabase
      .from('matches')
      .select('id, kickoff_time, home_team:home_team_id(name,flag_emoji,short_code), away_team:away_team_id(name,flag_emoji,short_code)')
      .eq('status', 'scheduled')
      .gt('kickoff_time', now)
      .order('kickoff_time', { ascending: true })
      .limit(3)

    if (!upcoming?.length) return

    // Get all member predictions for those matches
    const matchIds = upcoming.map(m => m.id)
    const { data: preds } = await supabase
      .from('predictions')
      .select('user_id, match_id, home_score, away_score')
      .in('match_id', matchIds)
      .in('user_id', memberIds)

    // Calculate % for each match
    const stats = {}
    upcoming.forEach(match => {
      const matchPreds = (preds || []).filter(p => p.match_id === match.id)
      const total = matchPreds.length
      if (!total) return
      const homeWins = matchPreds.filter(p => p.home_score > p.away_score).length
      const draws    = matchPreds.filter(p => p.home_score === p.away_score).length
      const awayWins = matchPreds.filter(p => p.home_score < p.away_score).length
      stats[match.id] = {
        match,
        total,
        home: Math.round((homeWins / total) * 100),
        draw: Math.round((draws / total) * 100),
        away: Math.round((awayWins / total) * 100),
      }
    })
    setMatchOdds(prev => ({ ...prev, [leagueId]: stats }))
  }

  const loadMemberPredictions = async (userId, showFuture) => {
    setLoadingPreds(true)
    const { data: preds } = await supabase
      .from('predictions')
      .select(`*, match:match_id(match_number, kickoff_time, stage, status, home_score, away_score, home_team:home_team_id(name,flag_emoji,short_code), away_team:away_team_id(name,flag_emoji,short_code))`)
      .eq('user_id', userId)
      .order('match_id', { ascending: true })

    const filtered = (preds || []).filter(p => {
      const kicked = new Date(p.match?.kickoff_time) <= new Date()
      return kicked || showFuture
    })
    setMemberPredictions(filtered)
    setLoadingPreds(false)
  }

  const openMemberModal = async (member, leagueId) => {
    if (!tournamentLive) return // Item 3: locked pre-tournament
    setMemberModal({ userId: member.user_id, username: member.profile?.username, leagueId })
    const { data: profile } = await supabase
      .from('profiles').select('show_future_predictions').eq('id', member.user_id).single()
    await loadMemberPredictions(member.user_id, profile?.show_future_predictions || false)
  }

  const toggleExpand = async (leagueId) => {
    if (expandedLeague === leagueId) {
      setExpandedLeague(null)
    } else {
      setExpandedLeague(leagueId)
      if (!leagueMembers[leagueId]) await loadLeagueMembers(leagueId)
    }
  }

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  }

  const createLeague = async () => {
    if (!newLeagueName.trim()) { setError('Please enter a league name'); return }
    setError('')
    const code = generateCode()
    const { data: league, error: err } = await supabase
      .from('leagues')
      .insert({ name: newLeagueName.trim(), invite_code: code, created_by: user.id, is_global: false })
      .select().single()
    if (err) { setError(err.message); return }
    await supabase.from('league_members').insert({ league_id: league.id, user_id: user.id })
    setSuccess(`League created! Share this code: ${code}`)
    setNewLeagueName(''); setShowCreate(false)
    loadMyLeagues()
  }

  const joinLeague = async () => {
    if (!joinCode.trim()) { setError('Enter an invite code'); return }
    setError('')
    const { data: league } = await supabase.from('leagues').select('*').eq('invite_code', joinCode.toUpperCase().trim()).single()
    if (!league) { setError('League not found — check the code'); return }
    const { error: err } = await supabase.from('league_members').insert({ league_id: league.id, user_id: user.id })
    if (err?.code === '23505') { setError('You are already in this league'); return }
    if (err) { setError(err.message); return }
    setSuccess(`Joined "${league.name}"!`)
    setJoinCode(''); setShowJoin(false)
    loadMyLeagues()
  }

  const leaveLeague = async (leagueId, leagueName) => {
    await supabase.from('league_members').delete().eq('league_id', leagueId).eq('user_id', user.id)
    setSuccess(`Left "${leagueName}"`)
    setExpandedLeague(null)
    loadMyLeagues()
  }

  const removeMember = async (leagueId, memberId, memberName) => {
    await supabase.from('league_members').delete().eq('league_id', leagueId).eq('user_id', memberId)
    setSuccess(`Removed ${memberName} from league`)
    await loadLeagueMembers(leagueId)
    loadMyLeagues()
  }

  const deleteLeague = async (leagueId, leagueName) => {
    await supabase.from('leagues').delete().eq('id', leagueId)
    setSuccess(`Deleted "${leagueName}"`)
    setExpandedLeague(null)
    loadMyLeagues()
  }

  const copyInviteCode = (code) => {
    navigator.clipboard?.writeText(code)
    setSuccess(`Copied invite code: ${code}`)
    setTimeout(() => setSuccess(''), 3000)
  }

  const shareWhatsApp = (leagueName, code) => {
    const text = `Join my WC26 Predictor league "${leagueName}"! Use code: ${code} at https://wc26predictor1.netlify.app`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const sortedMembers = (leagueId) =>
    [...(leagueMembers[leagueId] || [])].sort((a, b) => (b.profile?.total_points || 0) - (a.profile?.total_points || 0))

  const getPredResult = (pred) => {
    const m = pred.match
    if (m?.status !== 'completed') return 'pending'
    const correct = (m.home_score > m.away_score && pred.home_score > pred.away_score) ||
      (m.home_score === m.away_score && pred.home_score === pred.away_score) ||
      (m.home_score < m.away_score && pred.home_score < pred.away_score)
    const exact = m.home_score === pred.home_score && m.away_score === pred.away_score
    if (exact) return 'exact'
    if (correct) return 'correct'
    return 'wrong'
  }

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, rgba(0,30,80,0.88) 0%, rgba(0,94,184,0.82) 100%), url(/leagues-bg.jpg) center/cover no-repeat', padding: '20px' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'white' }}>👥 Leagues</h1>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { setShowJoin(!showJoin); setShowCreate(false); setError('') }} className="btn btn-secondary btn-sm">Join</button>
              <button onClick={() => { setShowCreate(!showCreate); setShowJoin(false); setError('') }}
                className="btn btn-primary btn-sm"
                style={{ background: activeGame === 'ko' ? '#e65100' : 'var(--scottish-navy)' }}>
                + Create
              </button>
            </div>
          </div>

          {/* Game toggle */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button onClick={() => { setActiveGame('tournament'); setShowCreate(false); setShowJoin(false); setError('') }} style={{
              flex: 1, padding: '8px', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: '700',
              background: activeGame === 'tournament' ? 'var(--scottish-navy)' : 'var(--bg-tertiary)',
              color: activeGame === 'tournament' ? 'white' : 'var(--text-muted)',
              border: activeGame === 'tournament' ? '1px solid var(--scottish-navy)' : '1px solid var(--border-light)',
              cursor: 'pointer',
            }}>🌍 Tournament Leagues</button>
            <button onClick={() => { setActiveGame('ko'); setShowCreate(false); setShowJoin(false); setError('') }} style={{
              flex: 1, padding: '8px', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: '700',
              background: activeGame === 'ko' ? '#e65100' : 'var(--bg-tertiary)',
              color: activeGame === 'ko' ? 'white' : 'var(--text-muted)',
              border: activeGame === 'ko' ? '1px solid #e65100' : '1px solid var(--border-light)',
              cursor: 'pointer',
            }}>🔥 KO Predictor Leagues</button>
          </div>

          {success && (
            <div style={{ padding: '12px 16px', background: 'var(--accent-green-light)', color: 'var(--accent-green)', borderRadius: 'var(--radius-md)', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
              ✅ {success}
              <button onClick={() => setSuccess('')} style={{ background: 'none', border: 'none', marginLeft: '8px', cursor: 'pointer', color: 'inherit' }}>×</button>
            </div>
          )}

          {showCreate && (
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '12px', border: `1px solid ${activeGame === 'ko' ? '#e65100' : 'var(--scottish-navy)'}` }}>
              <div style={{ fontWeight: '700', marginBottom: '4px' }}>
                {activeGame === 'ko' ? '🔥 Create a KO Predictor League' : '🌍 Create a Tournament League'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                {activeGame === 'ko' ? 'Separate from Tournament leagues — KO points only' : 'Group + knockout + awards predictions'}
              </div>
              <input className="input" placeholder="League name e.g. Office WC26" value={newLeagueName}
                onChange={e => setNewLeagueName(e.target.value)} style={{ marginBottom: '12px' }} />
              {error && <div style={{ color: 'var(--accent-red)', fontSize: '13px', marginBottom: '8px' }}>{error}</div>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={activeGame === 'ko' ? createKoLeague : createLeague}
                  className="btn btn-primary btn-sm"
                  style={{ background: activeGame === 'ko' ? '#e65100' : 'var(--scottish-navy)' }}>Create</button>
                <button onClick={() => setShowCreate(false)} className="btn btn-secondary btn-sm">Cancel</button>
              </div>
            </div>
          )}

          {showJoin && (
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '12px' }}>
              <div style={{ fontWeight: '700', marginBottom: '4px' }}>
                {activeGame === 'ko' ? '🔥 Join a KO Predictor League' : '🌍 Join a Tournament League'}
              </div>
              <input className="input" placeholder="Enter invite code e.g. AB1234" value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', fontSize: '18px', fontWeight: '700', marginBottom: '12px' }} />
              {error && <div style={{ color: 'var(--accent-red)', fontSize: '13px', marginBottom: '8px' }}>{error}</div>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={activeGame === 'ko' ? joinKoLeague : joinLeague} className="btn btn-primary btn-sm">Join</button>
                <button onClick={() => setShowJoin(false)} className="btn btn-secondary btn-sm">Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="container" style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}><div className="spinner" /></div>
        ) : activeGame === 'ko' ? (
          /* ── KO Leagues section ── */
          myKoLeagues.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔥</div>
              <div className="empty-state-title">No KO Predictor leagues yet</div>
              <div className="empty-state-desc">Create or join a KO Predictor league — completely separate from your Tournament leagues</div>
              <button onClick={() => { setShowCreate(true); setShowJoin(false) }}
                className="btn btn-primary" style={{ marginTop: '16px', background: '#e65100' }}>
                + Create KO League
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {myKoLeagues.map(({ league_id, league, memberCount }) => {
                const isCreator = league?.created_by === user?.id
                return (
                  <div key={league_id} className="card" style={{ border: '1px solid rgba(230,81,0,0.3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '14px' }}>🔥</span>
                          <span style={{ fontWeight: '700', fontSize: '15px' }}>{league?.name}</span>
                          {isCreator && <span style={{ fontSize: '10px', background: '#e65100', color: 'white', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>CREATOR</span>}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Code: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '0.1em' }}>{league?.invite_code}</span>
                          · {memberCount} member{memberCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#e65100' }}>KO Predictor</div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button onClick={() => navigator.clipboard?.writeText(league?.invite_code).then(() => setSuccess(`Copied: ${league?.invite_code}`))}
                        className="btn btn-secondary btn-sm">📋 Copy Code</button>
                      <button onClick={() => {
                        const text = `Join my WC26 KO Predictor league "${league?.name}"! Code: ${league?.invite_code} at https://wc26predictor1.netlify.app`
                        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
                      }} className="btn btn-sm" style={{ background: '#25d366', color: 'white', border: 'none' }}>WhatsApp</button>
                      {isCreator ? (
                        <button onClick={() => setConfirmAction({ type: 'deleteKoLeague', leagueId: league_id, leagueName: league?.name })}
                          className="btn btn-sm" style={{ background: 'none', border: '1px solid #e53935', color: '#e53935' }}>Delete</button>
                      ) : (
                        <button onClick={() => setConfirmAction({ type: 'leaveKoLeague', leagueId: league_id, leagueName: league?.name })}
                          className="btn btn-secondary btn-sm">Leave</button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        ) : myLeagues.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <div className="empty-state-title">No leagues yet</div>
            <div className="empty-state-desc">Create a league or join one with an invite code</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {myLeagues.map(({ league, memberCount }) => {
              if (!league) return null
              const isCreator = league.created_by === user.id
              const isExpanded = expandedLeague === league.id
              const members = sortedMembers(league.id)
              const leagueStats = matchOdds[league.id] || {}

              return (
                <div key={league.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '4px' }}>
                        {league.is_global ? '🌍 ' : isCreator ? '👑 ' : '👥 '}{league.name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {isCreator ? 'You created this league' : 'Member'}
                      </div>
                    </div>
                    {/* Fix 1: real member count */}
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', flexShrink: 0 }}>
                      {memberCount} {memberCount === 1 ? 'member' : 'members'}
                    </div>
                  </div>

                  {!league.is_global && (
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ background: 'var(--bg-tertiary)', padding: '6px 14px', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontWeight: '800', fontSize: '16px', letterSpacing: '0.12em' }}>
                        {league.invite_code}
                      </div>
                      <button onClick={() => copyInviteCode(league.invite_code)} className="btn btn-secondary btn-sm">📋 Copy</button>
                      <button onClick={() => shareWhatsApp(league.name, league.invite_code)}
                        className="btn btn-sm" style={{ background: '#25d366', color: 'white', border: 'none' }}>
                        💬 WhatsApp
                      </button>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid var(--border-light)', paddingTop: '12px' }}>
                    <button onClick={() => toggleExpand(league.id)} className="btn btn-secondary btn-sm">
                      {isExpanded ? '▲ Hide Members' : '▼ View Members'}
                    </button>
                    {!league.is_global && (
                      isCreator ? (
                        <button onClick={() => setConfirmAction({ type: 'deleteLeague', leagueId: league.id, leagueName: league.name })}
                          className="btn btn-sm" style={{ border: '1px solid #e53935', color: '#e53935', background: 'none' }}>
                          🗑️ Delete
                        </button>
                      ) : (
                        <button onClick={() => setConfirmAction({ type: 'leave', leagueId: league.id, leagueName: league.name })}
                          className="btn btn-sm" style={{ border: '1px solid var(--text-muted)', color: 'var(--text-muted)', background: 'none' }}>
                          Leave
                        </button>
                      )
                    )}
                  </div>

                  {/* Members list */}
                  {isExpanded && (
                    <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
                      {loadingMembers[league.id] ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}><div className="spinner" /></div>
                      ) : (
                        <>
                          {/* Item 5: Pre-match % breakdown — live from 11 Jun */}
                          {tournamentLive && Object.keys(leagueStats).length > 0 && (
                            <div style={{ marginBottom: '16px' }}>
                              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                                🔮 League Predictions — Upcoming Matches
                              </div>
                              {Object.values(leagueStats).map(({ match, total, home, draw, away }) => (
                                <div key={match.id} style={{ marginBottom: '10px', padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '12px', fontWeight: '700' }}>
                                      {match.home_team?.flag_emoji} {match.home_team?.short_code} vs {match.away_team?.short_code} {match.away_team?.flag_emoji}
                                    </span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{total} picks</span>
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                                    {[
                                      { label: match.home_team?.short_code, pct: home },
                                      { label: 'Draw', pct: draw },
                                      { label: match.away_team?.short_code, pct: away },
                                    ].map(({ label, pct }) => (
                                      <div key={label} style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px', fontWeight: '600' }}>{label}</div>
                                        <div style={{ height: '4px', background: 'var(--border-light)', borderRadius: '2px', overflow: 'hidden', marginBottom: '3px' }}>
                                          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent-green)', borderRadius: '2px', transition: 'width 0.4s' }} />
                                        </div>
                                        <div style={{ fontSize: '12px', fontWeight: '800', fontFamily: 'var(--font-mono)' }}>{pct}%</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Leaderboard */}
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                            Leaderboard
                          </div>

                          {/* Item 3 & 4: Pre-tournament message when no points yet */}
                          {!tournamentLive && (
                            <div style={{ padding: '12px 14px', background: 'var(--accent-blue-light)', borderRadius: 'var(--radius-md)', marginBottom: '12px', fontSize: '13px', color: 'var(--accent-blue)', fontWeight: '600' }}>
                              🗓️ Leaderboard goes live on 11 Jun when the tournament kicks off — make sure everyone has joined before then!
                            </div>
                          )}

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {members.map((member, i) => {
                              const isMe = member.user_id === user.id
                              const isLeagueCreator = league.created_by === member.user_id
                              const canRemove = (isCreator || isAdmin) && !isMe && !isLeagueCreator
                              const pts = member.profile?.total_points || 0
                              const leaderPts = members[0]?.profile?.total_points || 0
                              // Fix 2: hide gap when equal or 0
                              const gap = i > 0 && pts !== leaderPts ? leaderPts - pts : null

                              return (
                                <div key={member.user_id} style={{
                                  display: 'flex', alignItems: 'center', gap: '8px',
                                  padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                                  background: isMe ? 'var(--accent-blue-light)' : 'var(--bg-secondary)',
                                  border: isMe ? '1px solid rgba(21,88,176,0.2)' : '1px solid transparent',
                                }}>
                                  <span style={{ fontSize: '12px', fontWeight: '800', color: i < 3 ? ['var(--accent-gold)','var(--text-muted)','#cd7f32'][i] : 'var(--text-muted)', width: '20px' }}>
                                    #{i + 1}
                                  </span>
                                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: isMe ? 'var(--scottish-navy)' : 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800', color: isMe ? 'white' : 'var(--text-secondary)', flexShrink: 0 }}>
                                    {(member.profile?.username || '?')[0].toUpperCase()}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      {member.profile?.display_name || member.profile?.username || 'Unknown'}
                                      {isMe && <span style={{ fontSize: '10px', color: 'var(--accent-blue)', fontWeight: '700' }}>YOU</span>}
                                      {isLeagueCreator && <span style={{ fontSize: '10px' }}>👑</span>}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                                      {member.profile?.streak_current > 0 && (
                                        <span style={{ fontSize: '10px', color: 'var(--accent-orange)' }}>🔥 {member.profile.streak_current}</span>
                                      )}
                                      {member.profile?.exact_scores > 0 && (
                                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>🎯 {member.profile.exact_scores}</span>
                                      )}
                                    </div>
                                  </div>
                                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    {/* Fix 4: only green when pts > 0 */}
                                    <div style={{ fontWeight: '800', fontSize: '14px', fontFamily: 'var(--font-mono)', color: pts > 0 ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                                      {pts}pts
                                    </div>
                                    {/* Fix 2: only show gap when genuinely behind */}
                                    {gap !== null && (
                                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>-{gap}pts</div>
                                    )}
                                  </div>
                                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                    {/* Fix 3: picks button only live from 11 Jun */}
                                    <button
                                      onClick={() => openMemberModal(member, league.id)}
                                      disabled={!tournamentLive}
                                      className="btn btn-sm"
                                      style={{ fontSize: '11px', padding: '3px 8px', opacity: tournamentLive ? 1 : 0.4, cursor: tournamentLive ? 'pointer' : 'default' }}
                                      title={tournamentLive ? '' : 'Available from 11 Jun'}
                                    >
                                      👁 Picks
                                    </button>
                                    {canRemove && (
                                      <button onClick={() => setConfirmAction({ type: 'removeMember', leagueId: league.id, memberId: member.user_id, memberName: member.profile?.username })}
                                        style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: '1px solid #e53935', color: '#e53935', background: 'none', cursor: 'pointer' }}>
                                        ×
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Member predictions modal */}
      {memberModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setMemberModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', width: '100%', maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '800', fontSize: '16px' }}>{memberModal.username}'s Predictions</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Past picks always visible · Future picks if they've enabled sharing</div>
              </div>
              <button onClick={() => setMemberModal(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
            </div>
            <div style={{ overflowY: 'auto', padding: '16px', flex: 1 }}>
              {loadingPreds ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}><div className="spinner" /></div>
              ) : memberPredictions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚽</div>
                  <div style={{ fontWeight: '700', marginBottom: '4px' }}>No results yet</div>
                  <div style={{ fontSize: '13px' }}>Predictions appear here once matches kick off</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {memberPredictions.map(pred => {
                    const result = getPredResult(pred)
                    const match = pred.match
                    const kicked = new Date(match?.kickoff_time) <= new Date()
                    return (
                      <div key={pred.id} style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 12px', borderRadius: 'var(--radius-md)',
                        background: result === 'exact' ? 'var(--accent-green-light)' : result === 'correct' ? 'var(--accent-blue-light)' : result === 'wrong' ? 'var(--accent-red-light)' : 'var(--bg-secondary)',
                        border: `1px solid ${result === 'exact' ? 'rgba(0,122,51,0.2)' : result === 'correct' ? 'rgba(21,88,176,0.2)' : result === 'wrong' ? 'rgba(198,40,40,0.2)' : 'var(--border-light)'}`,
                      }}>
                        <span style={{ fontSize: '18px' }}>{match?.home_team?.flag_emoji}</span>
                        <span style={{ fontSize: '12px', fontWeight: '700', flex: 1 }}>{match?.home_team?.short_code} vs {match?.away_team?.short_code}</span>
                        <span style={{ fontSize: '18px' }}>{match?.away_team?.flag_emoji}</span>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: '800', fontSize: '14px', minWidth: '48px', textAlign: 'center' }}>
                          {pred.home_score} – {pred.away_score}
                        </div>
                        {match?.status === 'completed' && (
                          <div style={{ fontSize: '11px', minWidth: '32px', textAlign: 'right' }}>
                            {result === 'exact' ? '🎯' : result === 'correct' ? '✓' : '✗'}
                            <div style={{ fontWeight: '700', color: result === 'exact' ? 'var(--accent-green)' : result === 'correct' ? 'var(--accent-blue)' : 'var(--accent-red)' }}>
                              {pred.points_awarded || 0}pts
                            </div>
                          </div>
                        )}
                        {!kicked && <span style={{ fontSize: '10px', color: 'var(--accent-blue)', fontWeight: '700' }}>🔮</span>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      {confirmAction && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ maxWidth: '340px', width: '100%' }}>
            <div style={{ fontWeight: '800', fontSize: '16px', marginBottom: '8px' }}>
              {confirmAction.type === 'leave' ? 'Leave League?' :
               confirmAction.type === 'deleteLeague' ? 'Delete League?' :
               confirmAction.type === 'leaveKoLeague' ? 'Leave KO League?' :
               confirmAction.type === 'deleteKoLeague' ? 'Delete KO League?' :
               'Remove Member?'}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              {confirmAction.type === 'leave' ? `Leave "${confirmAction.leagueName}"? You can rejoin with the invite code.` :
               confirmAction.type === 'deleteLeague' ? `Delete "${confirmAction.leagueName}"? This cannot be undone.` :
               confirmAction.type === 'leaveKoLeague' ? `Leave KO league "${confirmAction.leagueName}"?` :
               confirmAction.type === 'deleteKoLeague' ? `Delete KO league "${confirmAction.leagueName}"? This cannot be undone.` :
               `Remove ${confirmAction.memberName}? They can rejoin with the invite code.`}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => {
                if (confirmAction.type === 'leave') leaveLeague(confirmAction.leagueId, confirmAction.leagueName)
                else if (confirmAction.type === 'deleteLeague') deleteLeague(confirmAction.leagueId, confirmAction.leagueName)
                else if (confirmAction.type === 'leaveKoLeague') leaveKoLeague(confirmAction.leagueId, confirmAction.leagueName)
                else if (confirmAction.type === 'deleteKoLeague') deleteKoLeague(confirmAction.leagueId, confirmAction.leagueName)
                else if (confirmAction.type === 'removeMember') removeMember(confirmAction.leagueId, confirmAction.memberId, confirmAction.memberName)
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
