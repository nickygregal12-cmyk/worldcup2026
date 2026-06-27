import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { avatarColor } from '../lib/avatarColor.js'
import { useAuthStore, useAppStore } from '../store/index.js'
import { useCountUp } from '../hooks/useCountUp.js'
import MemberPredictionsModal, { useMemberPredictions } from '../components/MemberPredictionsModal.jsx'
import { DATES } from '../lib/tournamentDates.js'

const PAGE_SIZE = 25

// Animated count-up for points values
function AnimatedPoints({ value }) {
  const display = useCountUp(value)
  return <>{display}</>
}

export default function Leaderboard() {
  const { user, isAdmin } = useAuthStore()
  const { appSettings, loadAppSettings } = useAppStore()
  const [activeGame, setActiveGame] = useState('tournament')
  const [players, setPlayers] = useState([])
  const [koPlayers, setKoPlayers] = useState([])
  const [prevRanks, setPrevRanks] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const { memberModal, setMemberModal, memberPredictions, memberReactions, loadingPreds, openProfile, groupPositionBreakdown } = useMemberPredictions()
  const [page, setPage] = useState(0)

  const preTournament = new Date() < DATES.TOURNAMENT_START
  const koLive = new Date() >= DATES.KO_PREDICTOR_OPEN

  useEffect(() => {
    loadAll()
    loadAppSettings()
  }, [loadAppSettings])

  const loadAll = async () => {
    setLoading(true)
    const [tRes, koRes, prevRes] = await Promise.all([
      supabase.from('profiles')
        .select('id, username, avatar_emoji, total_points, streak_current, perfect_rounds, streak_best, prediction_accuracy, total_predictions, is_banned')
        .order('total_points', { ascending: false })
        .order('username', { ascending: true })
        .limit(200),
      supabase.from('profiles')
        .select('id, username, display_name, avatar_emoji, total_points, streak_current, exact_scores, ko_points, ko_streak_current, ko_exact_scores, rank_at_kickoff, is_banned')
        .order('ko_points', { ascending: false })
        .order('username', { ascending: true })
        .limit(200),
      supabase.from('leaderboard_snapshots')
        .select('user_id, rank')
        .eq('snapshot_type', 'previous'),
    ])
    setPlayers(tRes.data || [])
    setKoPlayers(koRes.data || [])
    setPrevRanks(prevRes.data || [])
    setLoading(false)
  }

  const getRankIcon = (rank) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  const getRankMovement = (playerId, currentRank) => {
    // During live matches, use rank_at_kickoff for real-time movement
    const player = players.find(p => p.id === playerId)
    if (player?.rank_at_kickoff) {
      const diff = player.rank_at_kickoff - currentRank
      if (diff > 0) return { dir: 'up', n: diff }
      if (diff < 0) return { dir: 'down', n: Math.abs(diff) }
      return { dir: 'same', n: 0 }
    }
    // Fallback to daily snapshot
    const prev = prevRanks.find(p => p.user_id === playerId)
    if (!prev) return null
    const diff = prev.rank - currentRank
    if (diff > 0) return { dir: 'up', n: diff }
    if (diff < 0) return { dir: 'down', n: Math.abs(diff) }
    return { dir: 'same', n: 0 }
  }

  const GROUP_STAGE_END = DATES.GROUP_STAGE_END
  const groupStageOver = new Date() >= GROUP_STAGE_END
  const MIN_PREDICTIONS = 10

  const isTournament = activeGame === 'tournament'
  const currentPlayers = isTournament ? players : koPlayers
  const filtered = currentPlayers.filter(p => {
    const matchesSearch = p.username?.toLowerCase().includes(search.toLowerCase())
    const pts = isTournament ? p.total_points : p.ko_points
    // Always hide banned users
    if (p.is_banned) return false
    // After group stage: hide anyone with fewer than 10 predictions (except current user)
    if (groupStageOver && isTournament && p.id !== user?.id && (p.total_predictions || 0) < MIN_PREDICTIONS) return false
    // Pre-tournament: only show players with points or the current user
    if (preTournament && isTournament && pts === 0 && p.id !== user?.id) return false
    return matchesSearch
  })
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const userRank = currentPlayers.findIndex(p => p.id === user?.id) + 1
  const userVisible = paginated.some(p => p.id === user?.id)
  const userPoints = isTournament
    ? currentPlayers[userRank - 1]?.total_points || 0
    : currentPlayers[userRank - 1]?.ko_points || 0

  const accentColour = isTournament ? 'var(--scottish-navy)' : '#e65100'
  const accentLight = isTournament ? 'var(--scottish-navy-light)' : '#fff3e0'

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>

      {/* Points maintenance banner */}
      {appSettings?.points_maintenance === 'true' && !isAdmin && (
        <div style={{ background: '#b8860b', color: 'white', padding: '10px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>
          🔧 Points are being updated — scores will be back shortly!
        </div>
      )}

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, rgba(0,20,60,0.88) 0%, rgba(0,50,120,0.85) 100%), url(/leaderboard-bg.jpg) center/cover no-repeat', padding: '28px 20px 20px', color: 'white', textAlign: 'center' }}>
        <div className="container">
          <div style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>FIFA World Cup 2026</div>
          <h1 style={{ fontSize: '26px', fontWeight: '900', letterSpacing: '-0.03em', marginBottom: '4px' }}>🏆 Leaderboard</h1>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '16px' }}>
            {currentPlayers.length} player{currentPlayers.length !== 1 ? 's' : ''} competing
          </div>

          {/* Your position pill */}
          {user && userRank > 0 && !preTournament && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'rgba(255,255,255,0.15)', borderRadius: 'var(--radius-full)',
              padding: '6px 14px', marginBottom: '16px', fontSize: '13px', fontWeight: '700', color: 'white',
              border: '1px solid rgba(255,255,255,0.25)',
            }}>
              You are #{userRank} · <AnimatedPoints value={userPoints} /> pts
            </div>
          )}

          {/* Game tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
            <button onClick={() => { setActiveGame('tournament'); setPage(0); setSearch('') }} style={{
              flex: 1, padding: '10px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: '700',
              background: isTournament ? 'white' : 'rgba(255,255,255,0.1)',
              color: isTournament ? 'var(--scottish-navy)' : 'rgba(255,255,255,0.7)',
              border: 'none', cursor: 'pointer',
            }}>
              🌍 Tournament
            </button>
            <button onClick={() => { setActiveGame('ko'); setPage(0); setSearch('') }} style={{
              flex: 1, padding: '10px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: '700',
              background: !isTournament ? 'white' : 'rgba(255,255,255,0.1)',
              color: !isTournament ? '#e65100' : 'rgba(255,255,255,0.7)',
              border: 'none', cursor: 'pointer', opacity: !koLive && isTournament ? 0.6 : 1,
            }}>
              🔥 KO Predictor {!koLive && <span style={{ fontSize: '10px' }}>· soon</span>}
            </button>
          </div>

          {/* Search — white text on dark bg */}
          <input className="input" placeholder="🔍 Search players..."
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', caretColor: 'white' }}
            value={search} onChange={e => { setSearch(e.target.value); setPage(0) }} />
        </div>
      </div>

      <div className="container" style={{ padding: '16px' }}>
        {!isTournament && koLive && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', marginBottom: '14px', background: 'rgba(230,81,0,0.08)', border: '1px solid rgba(230,81,0,0.2)', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: '700', color: '#e65100' }}>
            🔥 <span>A separate competition — these points don't affect your Tournament score.</span>
          </div>
        )}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
            <div className="spinner" />
          </div>
        ) : preTournament && !search && isTournament ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>⏳</div>
            <div style={{ fontWeight: '800', fontSize: '18px', marginBottom: '8px' }}>Tournament hasn't started yet</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6' }}>
              The leaderboard comes alive on 11 June when matches kick off.
            </div>
            <div style={{ marginTop: '16px', fontSize: '13px', fontWeight: '700', color: accentColour }}>
              {players.length} player{players.length !== 1 ? 's' : ''} registered so far
            </div>
          </div>
        ) : !koLive && !isTournament ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔥</div>
            <div style={{ fontWeight: '800', fontSize: '18px', marginBottom: '8px' }}>KO Predictor — coming soon</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6', marginBottom: '16px' }}>
              Opens when the Round of 32 teams are confirmed — a completely fresh start, everyone begins at 0 points regardless of the group stage.
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', padding: '6px 12px', background: 'rgba(230,81,0,0.1)', borderRadius: 'var(--radius-full)', color: '#e65100' }}>
                🏆 Separate leaderboard
              </div>
              <div style={{ fontSize: '12px', fontWeight: '700', padding: '6px 12px', background: 'rgba(230,81,0,0.1)', borderRadius: 'var(--radius-full)', color: '#e65100' }}>
                ⚡ Everyone starts at 0pts
              </div>
              <div style={{ fontSize: '12px', fontWeight: '700', padding: '6px 12px', background: 'rgba(230,81,0,0.1)', borderRadius: 'var(--radius-full)', color: '#e65100' }}>
                🎯 32 knockout matches
              </div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
              {paginated.map(player => {
                const playerPts = isTournament ? (player.total_points || 0) : (player.ko_points || 0)
                const rank = currentPlayers.filter(other => (isTournament ? (other.total_points || 0) : (other.ko_points || 0)) > playerPts).length + 1
                const isCurrentUser = user?.id === player.id
                const movement = getRankMovement(player.id, rank)
                const pts = appSettings?.points_maintenance === 'true' && !isAdmin 
                  ? null 
                  : isTournament ? player.total_points : player.ko_points
                const isTop3 = rank <= 3

                return (
                  <div key={player.id} className={`leaderboard-row${isCurrentUser ? ' current-user' : ''}`}
                    onClick={() => openProfile(player, user?.id)}
                    role="button" tabIndex={0} style={{
                    background: isCurrentUser ? accentLight : 'var(--bg-card)',
                    border: isCurrentUser ? `1px solid ${accentColour}` : '1px solid var(--border-light)',
                    cursor: 'pointer',
                  }}>
                    {/* Gold gradient bar for top 3 / accent bar for current user */}
                    <div style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px',
                      background: isCurrentUser
                        ? accentColour
                        : isTop3
                          ? 'linear-gradient(180deg, #f6c026, #b8860b)'
                          : 'transparent',
                    }} />

                    {/* Rank */}
                    <div style={{
                      fontWeight: '800',
                      fontSize: isTop3 ? '22px' : '13px',
                      textAlign: 'center',
                      fontFamily: !isTop3 ? 'var(--font-mono)' : 'inherit',
                      color: !isTop3 ? 'var(--text-muted)' : 'inherit',
                      minWidth: '36px',
                      flexShrink: 0,
                    }}>
                      {getRankIcon(rank)}
                    </div>

                    {/* Avatar + name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '50%',
                        background: isCurrentUser ? accentColour : avatarColor(player.display_name || player.username).bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: player.avatar_emoji ? '20px' : '15px', fontWeight: '700',
                        color: isCurrentUser ? 'white' : avatarColor(player.display_name || player.username).fg,
                        flexShrink: 0,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                      }}>
                        {player.avatar_emoji || player.username?.[0]?.toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{player.username}</span>
                          {isCurrentUser && <span style={{ fontSize: '9px', background: accentColour, color: 'white', padding: '2px 6px', borderRadius: '20px', fontWeight: '700', flexShrink: 0, letterSpacing: '0.02em' }}>YOU</span>}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '3px', alignItems: 'center' }}>
                          {isTournament && player.streak_current > 2 && <span style={{ fontSize: '11px', color: 'var(--accent-orange)' }}>🔥 {player.streak_current}</span>}
                          {isTournament && player.perfect_rounds > 0 && <span style={{ fontSize: '11px', color: 'var(--accent-green)' }}>🎯 {player.perfect_rounds}</span>}
                          {!isTournament && player.ko_exact_scores > 0 && <span style={{ fontSize: '11px', color: '#e65100' }}>🎯 {player.ko_exact_scores}</span>}
                          {isTournament && player.prediction_accuracy > 0 && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{player.prediction_accuracy}%</span>}
                        </div>
                      </div>
                    </div>

                    {/* Rank movement */}
                    <div style={{ fontSize: '11px', fontWeight: '700', minWidth: '30px', textAlign: 'right',
                      color: movement?.dir === 'up' ? 'var(--accent-green)' : movement?.dir === 'down' ? '#e53935' : 'transparent' }}>
                      {movement?.dir === 'up' ? `↑${movement.n}` : movement?.dir === 'down' ? `↓${movement.n}` : '–'}
                    </div>

                    {/* Points — stacked number + label */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '44px' }}>
                      <div style={{ fontWeight: '900', fontSize: '20px', fontFamily: 'var(--font-mono)',
                        letterSpacing: '-0.02em', lineHeight: 1,
                        color: pts > 0 ? accentColour : 'var(--text-muted)' }}>
                        {pts === null ? '—' : <AnimatedPoints value={pts || 0} />}
                      </div>
                      <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--text-muted)',
                        textTransform: 'uppercase', letterSpacing: '0.04em' }}>pts</div>
                    </div>
                  </div>
                )
              })}

              {filtered.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-icon">🔍</div>
                  <div className="empty-state-title">No players found</div>
                  <div className="empty-state-desc">No one matches "{search}" — check the spelling or try a shorter name.</div>
                  <button className="btn btn-secondary btn-sm" onClick={() => setSearch('')}>Clear search</button>
                </div>
              )}
            </div>

            {/* Sticky your position if off screen */}
            {user && userRank > 0 && !userVisible && !search && (
              <div className="card" style={{ padding: '12px 16px', marginBottom: '12px', border: `1px solid ${accentColour}`, background: accentLight, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: accentColour }}>Your position: #{userRank}</div>
                <div style={{ fontSize: '16px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: accentColour }}>
                  {appSettings?.points_maintenance === 'true' && !isAdmin ? '—' : `${userPoints} pts`}
                </div>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="btn btn-secondary btn-sm">← Prev</button>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', alignSelf: 'center' }}>{page + 1} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} className="btn btn-secondary btn-sm">Next →</button>
              </div>
            )}
          </>
        )}
      </div>

      <MemberPredictionsModal
        memberModal={memberModal}
        setMemberModal={setMemberModal}
        memberPredictions={memberPredictions}
        memberReactions={memberReactions}
        loadingPreds={loadingPreds}
        groupPositionBreakdown={groupPositionBreakdown}
        currentUserId={user?.id}
      />
    </div>
  )
}
