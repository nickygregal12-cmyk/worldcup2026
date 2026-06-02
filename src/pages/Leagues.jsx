import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/index.js'

export default function Leagues() {
  const { user, isAdmin } = useAuthStore()
  const [myLeagues, setMyLeagues] = useState([])
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
  const [memberModal, setMemberModal] = useState(null) // { userId, username, leagueId }
  const [memberPredictions, setMemberPredictions] = useState([])
  const [loadingPreds, setLoadingPreds] = useState(false)

  useEffect(() => { if (user) loadMyLeagues() }, [user])

  const loadMyLeagues = async () => {
    const { data } = await supabase
      .from('league_members')
      .select('*, league:league_id(id, name, invite_code, is_global, member_count, created_by)')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false })
    setMyLeagues(data || [])
    setLoading(false)
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
  }

  const loadMemberPredictions = async (userId, showFuture) => {
    setLoadingPreds(true)
    const now = new Date().toISOString()

    const { data: preds } = await supabase
      .from('predictions')
      .select(`
        *,
        match:match_id(
          match_number, kickoff_time, stage, status,
          home_score, away_score,
          home_team:home_team_id(name, flag_emoji, short_code),
          away_team:away_team_id(name, flag_emoji, short_code)
        )
      `)
      .eq('user_id', userId)
      .order('match_id', { ascending: true })

    // Filter by visibility rules:
    // - Past predictions (kicked off) = always show
    // - Future predictions = only show if user has show_future_predictions = true
    const filtered = (preds || []).filter(p => {
      const kickoff = new Date(p.match?.kickoff_time)
      const haKickedOff = kickoff <= new Date()
      return haKickedOff || showFuture
    })

    setMemberPredictions(filtered)
    setLoadingPreds(false)
  }

  const openMemberModal = async (member, leagueId) => {
    setMemberModal({ userId: member.user_id, username: member.profile?.username, leagueId })
    // Check if member allows future predictions visibility
    const { data: profile } = await supabase
      .from('profiles')
      .select('show_future_predictions')
      .eq('id', member.user_id)
      .single()
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
      <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)', padding: '20px' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '800' }}>👥 Leagues</h1>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { setShowJoin(!showJoin); setShowCreate(false); setError('') }} className="btn btn-secondary btn-sm">Join</button>
              <button onClick={() => { setShowCreate(!showCreate); setShowJoin(false); setError('') }} className="btn btn-primary btn-sm">+ Create</button>
            </div>
          </div>

          {success && (
            <div style={{ padding: '12px 16px', background: 'var(--accent-green-light)', color: 'var(--accent-green)', borderRadius: 'var(--radius-md)', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
              ✅ {success}
              <button onClick={() => setSuccess('')} style={{ background: 'none', border: 'none', marginLeft: '8px', cursor: 'pointer', color: 'inherit' }}>×</button>
            </div>
          )}

          {showCreate && (
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '12px' }}>
              <div style={{ fontWeight: '700', marginBottom: '12px' }}>Create a League</div>
              <input className="input" placeholder="League name e.g. Office 2026" value={newLeagueName}
                onChange={e => setNewLeagueName(e.target.value)} style={{ marginBottom: '12px' }} />
              {error && <div style={{ color: 'var(--accent-red)', fontSize: '13px', marginBottom: '8px' }}>{error}</div>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={createLeague} className="btn btn-primary btn-sm">Create</button>
                <button onClick={() => setShowCreate(false)} className="btn btn-secondary btn-sm">Cancel</button>
              </div>
            </div>
          )}

          {showJoin && (
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '12px' }}>
              <div style={{ fontWeight: '700', marginBottom: '12px' }}>Join a League</div>
              <input className="input" placeholder="Enter invite code e.g. AB1234" value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', fontSize: '18px', fontWeight: '700', marginBottom: '12px' }} />
              {error && <div style={{ color: 'var(--accent-red)', fontSize: '13px', marginBottom: '8px' }}>{error}</div>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={joinLeague} className="btn btn-primary btn-sm">Join</button>
                <button onClick={() => setShowJoin(false)} className="btn btn-secondary btn-sm">Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="container" style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}><div className="spinner" /></div>
        ) : myLeagues.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <div className="empty-state-title">No leagues yet</div>
            <div className="empty-state-desc">Create a league or join one with an invite code</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {myLeagues.map(({ league }) => {
              if (!league) return null
              const isCreator = league.created_by === user.id
              const isExpanded = expandedLeague === league.id
              const members = sortedMembers(league.id)

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
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', flexShrink: 0 }}>
                      {league.member_count || '?'} members
                    </div>
                  </div>

                  {!league.is_global && (
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ background: 'var(--bg-tertiary)', padding: '6px 14px', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontWeight: '800', fontSize: '16px', letterSpacing: '0.12em', color: 'var(--text-primary)' }}>
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
                    <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-light)', paddingTop: '12px' }}>
                      {loadingMembers[league.id] ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}><div className="spinner" /></div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                            Leaderboard
                          </div>
                          {members.map((member, i) => {
                            const isMe = member.user_id === user.id
                            const isLeagueCreator = league.created_by === member.user_id
                            const canRemove = (isCreator || isAdmin) && !isMe && !isLeagueCreator
                            const myPos = members.findIndex(m => m.user_id === user.id)
                            const gap = i === myPos ? null : (members[0]?.profile?.total_points || 0) - (member.profile?.total_points || 0)

                            return (
                              <div key={member.user_id} style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                                background: isMe ? 'var(--accent-blue-light)' : 'var(--bg-secondary)',
                                border: isMe ? '1px solid rgba(21,88,176,0.2)' : '1px solid transparent',
                              }}>
                                <span style={{ fontSize: '12px', fontWeight: '800', color: i < 3 ? ['var(--accent-gold)', 'var(--text-muted)', '#cd7f32'][i] : 'var(--text-muted)', width: '20px' }}>
                                  #{i + 1}
                                </span>
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: isMe ? 'var(--accent-blue)' : 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800', color: isMe ? 'white' : 'var(--text-secondary)', flexShrink: 0 }}>
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
                                  <div style={{ fontWeight: '800', fontSize: '14px', fontFamily: 'var(--font-mono)', color: 'var(--accent-green)' }}>
                                    {member.profile?.total_points || 0}pts
                                  </div>
                                  {i > 0 && (
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                      -{gap}pts
                                    </div>
                                  )}
                                </div>
                                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                  <button onClick={() => openMemberModal(member, league.id)}
                                    className="btn btn-sm" style={{ fontSize: '11px', padding: '3px 8px' }}>
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
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--bg-card)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
            width: '100%', maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column',
          }}>
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
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔒</div>
                  <div style={{ fontWeight: '700' }}>No predictions to show</div>
                  <div style={{ fontSize: '13px', marginTop: '4px' }}>Past predictions appear here once matches kick off</div>
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
                        background: result === 'exact' ? 'var(--accent-green-light)' :
                                    result === 'correct' ? 'var(--accent-blue-light)' :
                                    result === 'wrong' ? 'var(--accent-red-light)' : 'var(--bg-secondary)',
                        border: `1px solid ${result === 'exact' ? 'rgba(0,122,51,0.2)' : result === 'correct' ? 'rgba(21,88,176,0.2)' : result === 'wrong' ? 'rgba(198,40,40,0.2)' : 'var(--border-light)'}`,
                      }}>
                        <span style={{ fontSize: '18px' }}>{match?.home_team?.flag_emoji}</span>
                        <span style={{ fontSize: '12px', fontWeight: '700', flex: 1 }}>{match?.home_team?.short_code} vs {match?.away_team?.short_code}</span>
                        <span style={{ fontSize: '18px' }}>{match?.away_team?.flag_emoji}</span>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: '800', fontSize: '14px', minWidth: '48px', textAlign: 'center' }}>
                          {pred.home_score} – {pred.away_score}
                        </div>
                        {match?.status === 'completed' && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '32px', textAlign: 'right' }}>
                            {result === 'exact' ? '🎯' : result === 'correct' ? '✓' : '✗'}
                            <div style={{ fontWeight: '700', color: result === 'exact' ? 'var(--accent-green)' : result === 'correct' ? 'var(--accent-blue)' : 'var(--accent-red)' }}>
                              {pred.points_awarded || 0}pts
                            </div>
                          </div>
                        )}
                        {!kicked && (
                          <span style={{ fontSize: '10px', color: 'var(--accent-blue)', fontWeight: '700' }}>🔮 Future</span>
                        )}
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
              {confirmAction.type === 'leave' ? 'Leave League?' : confirmAction.type === 'deleteLeague' ? 'Delete League?' : 'Remove Member?'}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              {confirmAction.type === 'leave' ? `Leave "${confirmAction.leagueName}"? You can rejoin with the invite code.` :
               confirmAction.type === 'deleteLeague' ? `Delete "${confirmAction.leagueName}"? This cannot be undone.` :
               `Remove ${confirmAction.memberName}? They can rejoin with the invite code.`}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => {
                if (confirmAction.type === 'leave') leaveLeague(confirmAction.leagueId, confirmAction.leagueName)
                else if (confirmAction.type === 'deleteLeague') deleteLeague(confirmAction.leagueId, confirmAction.leagueName)
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
