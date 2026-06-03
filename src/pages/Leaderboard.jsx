import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/index.js'

const TOURNAMENT_START = new Date('2026-06-11T19:00:00Z')
const KO_OPEN_DATE = new Date('2026-06-27T22:00:00Z')
const PAGE_SIZE = 25

export default function Leaderboard() {
  const { user } = useAuthStore()
  const [activeGame, setActiveGame] = useState('tournament')
  const [players, setPlayers] = useState([])
  const [koPlayers, setKoPlayers] = useState([])
  const [prevRanks, setPrevRanks] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  const preTournament = new Date() < TOURNAMENT_START
  const koLive = new Date() >= KO_OPEN_DATE

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    const [tRes, koRes, prevRes] = await Promise.all([
      supabase.from('profiles')
        .select('id, username, avatar_emoji, total_points, streak_current, perfect_rounds, streak_best, prediction_accuracy')
        .order('total_points', { ascending: false })
        .order('username', { ascending: true })
        .limit(200),
      supabase.from('profiles')
        .select('id, username, avatar_emoji, ko_points, ko_streak_current, ko_exact_scores')
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
    const prev = prevRanks.find(p => p.user_id === playerId)
    if (!prev) return null
    const diff = prev.rank - currentRank
    if (diff > 0) return { dir: 'up', n: diff }
    if (diff < 0) return { dir: 'down', n: Math.abs(diff) }
    return { dir: 'same', n: 0 }
  }

  const isTournament = activeGame === 'tournament'
  const currentPlayers = isTournament ? players : koPlayers
  const filtered = currentPlayers.filter(p =>
    p.username?.toLowerCase().includes(search.toLowerCase())
  )
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

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, rgba(0,30,80,0.88) 0%, rgba(0,94,184,0.85) 100%), url(/leaderboard-bg.jpg) center/cover no-repeat', padding: '20px', color: 'white' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'white' }}>🏆 Leaderboard</h1>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
              {currentPlayers.length} player{currentPlayers.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Game tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button onClick={() => { setActiveGame('tournament'); setPage(0); setSearch('') }} style={{
              flex: 1, padding: '10px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: '700',
              background: isTournament ? 'var(--scottish-navy)' : 'var(--bg-tertiary)',
              color: isTournament ? 'white' : 'var(--text-muted)',
              border: isTournament ? '1px solid var(--scottish-navy)' : '1px solid var(--border-light)',
              cursor: 'pointer',
            }}>
              🌍 Tournament
            </button>
            <button onClick={() => { setActiveGame('ko'); setPage(0); setSearch('') }} style={{
              flex: 1, padding: '10px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: '700',
              background: !isTournament ? '#e65100' : 'var(--bg-tertiary)',
              color: !isTournament ? 'white' : koLive ? 'var(--text-muted)' : 'var(--text-muted)',
              border: !isTournament ? '1px solid #e65100' : '1px solid var(--border-light)',
              cursor: 'pointer', opacity: !koLive && isTournament ? 0.6 : 1,
            }}>
              🔥 KO Predictor {!koLive && <span style={{ fontSize: '10px' }}>· 28 Jun</span>}
            </button>
          </div>

          {/* Your position */}
          {user && userRank > 0 && !preTournament && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: accentLight, borderRadius: 'var(--radius-full)',
              padding: '4px 10px', marginBottom: '12px', fontSize: '12px', fontWeight: '700',
              color: accentColour,
            }}>
              You are #{userRank} · {userPoints} pts
            </div>
          )}

          <input className="input" placeholder="Search players..." style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "white" }}
            value={search} onChange={e => { setSearch(e.target.value); setPage(0) }} />
        </div>
      </div>

      <div className="container" style={{ padding: '16px' }}>
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
            <div style={{ fontWeight: '800', fontSize: '18px', marginBottom: '8px' }}>KO Predictor launches 27 Jun</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6' }}>
              A completely fresh start — everyone begins at 0 points when predictions open.
            </div>
          </div>
        ) : (
          <>
            <div className="card" style={{ padding: '8px', marginBottom: '12px' }}>
              {paginated.map(player => {
                const rank = currentPlayers.findIndex(p => p.id === player.id) + 1
                const isCurrentUser = user?.id === player.id
                const movement = getRankMovement(player.id, rank)
                const pts = isTournament ? player.total_points : player.ko_points

                return (
                  <div key={player.id} className="leaderboard-row" style={{
                    background: isCurrentUser ? accentLight : 'transparent',
                    borderRadius: 'var(--radius-md)',
                    border: isCurrentUser ? `1px solid ${accentColour}` : '1px solid transparent',
                    marginBottom: '2px',
                  }}>
                    {/* Rank */}
                    <div style={{
                      fontWeight: '800', fontSize: rank <= 3 ? '22px' : '14px',
                      textAlign: 'center', fontFamily: rank > 3 ? 'var(--font-mono)' : 'inherit',
                      color: rank > 3 ? 'var(--text-muted)' : 'inherit', minWidth: '40px',
                    }}>
                      {getRankIcon(rank)}
                    </div>

                    {/* Avatar + name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        background: isCurrentUser ? accentColour : 'var(--bg-tertiary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: player.avatar_emoji ? '18px' : '15px', fontWeight: '700',
                        color: isCurrentUser ? 'white' : 'var(--text-primary)', flexShrink: 0,
                      }}>
                        {player.avatar_emoji || player.username?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {player.username}
                          {isCurrentUser && <span style={{ fontSize: '10px', background: accentColour, color: 'white', padding: '1px 5px', borderRadius: '20px', fontWeight: '700' }}>YOU</span>}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '2px', alignItems: 'center' }}>
                          {isTournament && player.streak_current > 2 && <span style={{ fontSize: '11px', color: 'var(--accent-orange)' }}>🔥 {player.streak_current}</span>}
                          {isTournament && player.perfect_rounds > 0 && <span style={{ fontSize: '11px', color: 'var(--accent-green)' }}>🎯 {player.perfect_rounds}</span>}
                          {!isTournament && player.ko_exact_scores > 0 && <span style={{ fontSize: '11px', color: '#e65100' }}>🎯 {player.ko_exact_scores}</span>}
                          {isTournament && player.prediction_accuracy > 0 && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{player.prediction_accuracy}%</span>}
                        </div>
                      </div>
                    </div>

                    {/* Rank movement */}
                    {movement && movement.dir !== 'same' && (
                      <div style={{ fontSize: '11px', fontWeight: '700', minWidth: '28px', textAlign: 'center',
                        color: movement.dir === 'up' ? 'var(--accent-green)' : '#e53935' }}>
                        {movement.dir === 'up' ? `↑${movement.n}` : `↓${movement.n}`}
                      </div>
                    )}

                    {/* Points */}
                    <div style={{ fontWeight: '800', fontSize: '18px', fontFamily: 'var(--font-mono)',
                      color: pts > 0 ? accentColour : 'var(--text-muted)' }}>
                      {pts || 0}
                    </div>
                  </div>
                )
              })}

              {filtered.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-icon">🔍</div>
                  <div className="empty-state-title">No players found</div>
                </div>
              )}
            </div>

            {/* Sticky your position if off screen */}
            {user && userRank > 0 && !userVisible && !search && (
              <div className="card" style={{ padding: '12px 16px', marginBottom: '12px', border: `1px solid ${accentColour}`, background: accentLight, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: accentColour }}>Your position: #{userRank}</div>
                <div style={{ fontSize: '16px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: accentColour }}>{userPoints} pts</div>
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
    </div>
  )
}
