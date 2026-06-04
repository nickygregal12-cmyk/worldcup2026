import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuthStore, useAppStore } from '../store/index.js'

const TOURNAMENT_START = new Date('2026-06-11T19:00:00Z')
const KO_OPEN_DATE = new Date('2026-06-27T22:00:00Z')

function KnockoutPicksView({ userId }) {
  const [picks, setPicks] = React.useState([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    supabase.from('knockout_picks')
      .select('match_number, stage, winner_team_id, is_joker, winner:winner_team_id(name, flag_emoji, short_code)')
      .eq('user_id', userId)
      .order('match_number', { ascending: true })
      .then(({ data }) => { setPicks(data || []); setLoading(false) })
  }, [userId])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}><div className="spinner" /></div>
  if (picks.length === 0) return (
    <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏆</div>
      <div style={{ fontWeight: '700' }}>No knockout picks yet</div>
    </div>
  )

  const stages = { r32: 'Round of 32', r16: 'Round of 16', qf: 'Quarter-Finals', sf: 'Semi-Finals', final: 'Final' }
  const grouped = picks.reduce((acc, p) => { const s = p.stage || 'r32'; if (!acc[s]) acc[s] = []; acc[s].push(p); return acc }, {})

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {Object.entries(grouped).map(([stage, stagePicks]) => (
        <div key={stage}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
            {stages[stage] || stage}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {stagePicks.map(pick => (
              <div key={pick.match_number} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '24px' }}>#{pick.match_number}</span>
                <span style={{ fontSize: '18px' }}>{pick.winner?.flag_emoji}</span>
                <span style={{ fontSize: '13px', fontWeight: '700' }}>{pick.winner?.name || '?'}</span>
                {pick.is_joker && <span style={{ marginLeft: 'auto', fontSize: '12px' }}>🃏</span>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function AwardPredsView({ userId }) {
  const [preds, setPreds] = React.useState([])
  const [goals, setGoals] = React.useState([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    Promise.all([
      supabase.from('award_predictions').select('award_type, predicted_player_name').eq('user_id', userId),
      supabase.from('tournament_predictions').select('prediction_type, int_value').eq('user_id', userId).in('prediction_type', ['group_goals', 'knockout_goals', 'total_goals'])
    ]).then(([{ data: awardData }, { data: goalData }]) => {
      setPreds(awardData || [])
      setGoals(goalData || [])
      setLoading(false)
    })
  }, [userId])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}><div className="spinner" /></div>
  if (preds.length === 0 && goals.length === 0) return (
    <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>🥇</div>
      <div style={{ fontWeight: '700' }}>No award predictions yet</div>
    </div>
  )

  const labels = { golden_boot: '⚽ Golden Boot', golden_glove: '🧤 Golden Glove', player_of_tournament: '🌟 Player of the Tournament' }
  const goalLabels = { group_goals: '⚽ Group Stage Goals', knockout_goals: '🏆 Knockout Goals', total_goals: '🌍 Tournament Total Goals' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {preds.map(pred => (
        <div key={pred.award_type} style={{ padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '4px' }}>{labels[pred.award_type] || pred.award_type}</div>
          <div style={{ fontSize: '14px', fontWeight: '700' }}>{pred.predicted_player_name || '—'}</div>
        </div>
      ))}
      {goals.map(g => (
        <div key={g.prediction_type} style={{ padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '4px' }}>{goalLabels[g.prediction_type] || g.prediction_type}</div>
          <div style={{ fontSize: '14px', fontWeight: '700' }}>{g.int_value} goals</div>
        </div>
      ))}
    </div>
  )
}

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

  const { appSettings } = useAppStore()
  const phaseOverride = appSettings?.game_phase_override || ''
  const tournamentLive = new Date() >= TOURNAMENT_START
  const koLive = phaseOverride === 'ko_predictor' || phaseOverride === 'post_tournament'
    ? true
    : phaseOverride && phaseOverride !== 'ko_predictor' ? false
    : new Date() >= KO_OPEN_DATE

  useEffect(() => { if (user) { loadMyLeagues(); loadMyKoLeagues() } }, [user])

  const loadMyLeagues = async () => {
    const { data: memberships } = await supabase
      .from('league_members')
      .select('league_id, league:league_id(id, name, invite_code, is_global, created_by)')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false })

    if (!memberships) { setLoading(false); return }

    const leagueIds = memberships.map(m => m.league_id)
    const { data: counts } = await supabase
      .from('league_members')
      .select('league_id')
      .in('league_id', leagueIds)

    const countMap = {}
    counts?.forEach(c => { countMap[c.league_id] = (countMap[c.league_id] || 0) + 1 })

    const leagues = memberships.map(m => ({
      ...m,
      memberCount: countMap[m.league_id] || 1,
    }))
    leagues.sort((a, b) => (b.league?.is_global ? 1 : 0) - (a.league?.is_global ? 1 : 0))
    setMyLeagues(leagues)
    setLoading(false)

    // Auto-expand global league and load its members
    const globalLeague = leagues.find(m => m.league?.is_global)
    if (globalLeague && !expandedLeague) {
      setExpandedLeague(globalLeague.league_id)
      loadLeagueMembers(globalLeague.league_id)
    }
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
    const { data: preds, error } = await supabase
      .from('predictions')
      .select(`*, match:match_id(match_number, kickoff_time, stage, status, home_score, away_score, home_team:home_team_id(name,flag_emoji,short_code), away_team:away_team_id(name,flag_emoji,short_code))`)
      .eq('user_id', userId)
      .order('match_id', { ascending: true })

    console.log('loadMemberPredictions:', { userId, showFuture, count: preds?.length, error })

    const filtered = (preds || []).filter(p => {
      const kicked = new Date(p.match?.kickoff_time) <= new Date()
      return kicked || showFuture
    })
    console.log('filtered:', filtered.length)
    setMemberPredictions(filtered)
    setLoadingPreds(false)
  }

  const openMemberModal = async (member, leagueId) => {
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
              background: activeGame === 'tournament' ? 'var(--scottish-navy)' : 'rgba(255,255,255,0.15)',
              color: activeGame === 'tournament' ? 'white' : 'rgba(255,255,255,0.8)',
              border: activeGame === 'tournament' ? '1px solid var(--scottish-navy)' : '1px solid rgba(255,255,255,0.3)',
              cursor: 'pointer',
            }}>🌍 Tournament Leagues</button>
            <button onClick={() => { if (koLive) { setActiveGame('ko'); setShowCreate(false); setShowJoin(false); setError('') } }} style={{
              flex: 1, padding: '8px', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: '700',
              background: activeGame === 'ko' ? '#e65100' : 'rgba(255,255,255,0.15)',
              color: activeGame === 'ko' ? 'white' : 'rgba(255,255,255,0.8)',
              border: activeGame === 'ko' ? '1px solid #e65100' : '1px solid rgba(255,255,255,0.3)',
              cursor: 'pointer',
            }}>🔥 KO Predictor {!koLive && <span style={{ fontSize: '10px', opacity: 0.7 }}>· 28 Jun</span>}</button>
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
        ) : activeGame === 'ko' && !koLive ? (
          /* KO not live yet */
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔥</div>
            <div style={{ fontWeight: '800', fontSize: '18px', marginBottom: '8px' }}>KO Predictor Leagues launch 27 Jun</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>
              Once the group stage finishes you can create or join KO Predictor leagues — completely separate from your Tournament leagues with a fresh start.
            </div>
            <button onClick={() => setActiveGame('tournament')} className="btn btn-secondary">
              ← Back to Tournament Leagues
            </button>
          </div>
        ) : activeGame === 'ko' && koLive ? (
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
            {[...myLeagues].sort((a, b) => {
              if (a.league?.is_global && !b.league?.is_global) return -1
              if (!a.league?.is_global && b.league?.is_global) return 1
              return 0
            }).map(({ league, memberCount }) => {
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
                        {league.is_global ? '🌍 ' : isCreator ? '👑 ' : '👥 '}{league.is_global ? 'WC26 Overall' : league.name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {isCreator ? 'You created this league' : 'Member'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        {memberCount} {memberCount === 1 ? 'member' : 'members'}
                      </div>
                      {leagueMembers[league.id] && (() => {
                        const sorted = [...(leagueMembers[league.id] || [])].sort((a, b) => (b.profile?.total_points || 0) - (a.profile?.total_points || 0))
                        const myRank = sorted.findIndex(m => m.user_id === user?.id) + 1
                        return myRank > 0 ? (
                          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--scottish-navy)', marginTop: '2px' }}>
                            You #{myRank}
                          </div>
                        ) : null
                      })()}
                    </div>
                  </div>

                  {/* Invite code + actions */}
                  {!league.is_global && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '800', fontSize: '15px', letterSpacing: '0.12em', flex: 1 }}>{league.invite_code}</span>
                      <button onClick={() => copyInviteCode(league.invite_code)} style={{ fontSize: '12px', padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-medium)', background: 'var(--bg-card)', cursor: 'pointer' }}>📋</button>
                      <button onClick={() => shareWhatsApp(league.name, league.invite_code)} style={{ fontSize: '12px', padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: 'none', background: '#25d366', color: 'white', cursor: 'pointer' }}>💬</button>
                      {isCreator ? (
                        <button onClick={() => setConfirmAction({ type: 'deleteLeague', leagueId: league.id, leagueName: league.name })}
                          style={{ fontSize: '12px', padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid #e53935', color: '#e53935', background: 'none', cursor: 'pointer' }}>🗑️</button>
                      ) : (
                        <button onClick={() => setConfirmAction({ type: 'leave', leagueId: league.id, leagueName: league.name })}
                          style={{ fontSize: '12px', padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-medium)', color: 'var(--text-muted)', background: 'none', cursor: 'pointer' }}>Leave</button>
                      )}
                    </div>
                  )}

                  <button onClick={() => toggleExpand(league.id)} style={{
                    width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-light)', background: 'none',
                    fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                  }}>
                    {isExpanded ? '▲ Hide table' : '▼ Show table'}
                  </button>

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

                          {/* FPL-style table header */}
                          <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 48px 32px', gap: '4px', padding: '4px 8px', borderBottom: '1px solid var(--border-light)', marginBottom: '4px' }}>
                            <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rank</span>
                            <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Player</span>
                            <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Total</span>
                            <span></span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {members.map((member, i) => {
                              const isMe = member.user_id === user.id
                              const isLeagueCreator = league.created_by === member.user_id
                              const canRemove = (isCreator || isAdmin) && !isMe && !isLeagueCreator && !league.is_global
                              const pts = member.profile?.total_points || 0
                              const leaderPts = members[0]?.profile?.total_points || 0
                              const gap = i > 0 && pts !== leaderPts ? leaderPts - pts : null
                              const rankColour = i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : i === 2 ? '#cd7f32' : 'var(--text-muted)'

                              return (
                                <div key={member.user_id} style={{
                                  display: 'grid', gridTemplateColumns: '32px 1fr 48px 32px',
                                  gap: '4px', alignItems: 'center',
                                  padding: '9px 8px',
                                  borderBottom: '1px solid var(--border-light)',
                                  background: isMe ? 'rgba(0,48,135,0.06)' : 'transparent',
                                  borderLeft: isMe ? '3px solid var(--scottish-navy)' : '3px solid transparent',
                                }}>
                                  {/* Rank */}
                                  <span style={{ fontSize: '13px', fontWeight: '800', color: rankColour }}>
                                    {i + 1}
                                  </span>

                                  {/* Name + sub info */}
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: '13px', fontWeight: isMe ? '700' : '500', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden' }}>
                                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {member.profile?.display_name || member.profile?.username || 'Unknown'}
                                      </span>
                                      {isMe && <span style={{ fontSize: '9px', background: 'var(--scottish-navy)', color: 'white', padding: '1px 4px', borderRadius: '3px', fontWeight: '700', flexShrink: 0 }}>YOU</span>}
                                      {isLeagueCreator && !isMe && <span style={{ fontSize: '11px', flexShrink: 0 }}>👑</span>}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '6px', marginTop: '1px' }}>
                                      {gap !== null && <span>-{gap}pts</span>}
                                      {member.profile?.streak_current > 0 && <span>🔥{member.profile.streak_current}</span>}
                                      {member.profile?.exact_scores > 0 && <span>🎯{member.profile.exact_scores}</span>}
                                    </div>
                                  </div>

                                  {/* Points */}
                                  <div style={{ textAlign: 'right' }}>
                                    <span style={{ fontWeight: '800', fontSize: '14px', fontFamily: 'var(--font-mono)', color: pts > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                      {pts}
                                    </span>
                                  </div>

                                  {/* Actions */}
                                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '3px' }}>
                                    <button onClick={() => openMemberModal(member, league.id)}
                                      style={{ fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6, padding: '2px' }}
                                      title="View picks">👁</button>
                                    {canRemove && (
                                      <button onClick={() => setConfirmAction({ type: 'removeMember', leagueId: league.id, memberId: member.user_id, memberName: member.profile?.username })}
                                        style={{ fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#e53935', padding: '2px' }}>×</button>
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

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)' }}>
              {['group', 'knockout', 'awards'].map(tab => (
                <button key={tab} onClick={() => setMemberModal(prev => ({ ...prev, tab }))} style={{
                  flex: 1, padding: '10px', fontSize: '12px', fontWeight: memberModal.tab === tab || (!memberModal.tab && tab === 'group') ? '700' : '400',
                  color: memberModal.tab === tab || (!memberModal.tab && tab === 'group') ? 'var(--text-primary)' : 'var(--text-muted)',
                  borderBottom: memberModal.tab === tab || (!memberModal.tab && tab === 'group') ? '2px solid var(--scottish-navy)' : '2px solid transparent',
                  background: 'none', border: 'none', cursor: 'pointer', textTransform: 'capitalize',
                }}>
                  {tab === 'group' ? '⚽ Groups' : tab === 'knockout' ? '🏆 Knockout' : '🥇 Awards'}
                </button>
              ))}
            </div>

            <div style={{ overflowY: 'auto', padding: '16px', flex: 1 }}>
              {loadingPreds ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}><div className="spinner" /></div>
              ) : (!memberModal.tab || memberModal.tab === 'group') ? (
                memberPredictions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔒</div>
                    <div style={{ fontWeight: '700', marginBottom: '4px' }}>Picks are private</div>
                    <div style={{ fontSize: '13px' }}>
                      {tournamentLive
                        ? 'This user has chosen to keep their predictions private'
                        : 'Picks become visible once matches kick off on 11 Jun — unless the user enables "Show Future Predictions" in their profile'}
                    </div>
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
                )
              ) : memberModal.tab === 'knockout' ? (
                <KnockoutPicksView userId={memberModal.userId} />
              ) : (
                <AwardPredsView userId={memberModal.userId} />
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
