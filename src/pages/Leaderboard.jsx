import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/index.js'

const TOURNAMENT_START = new Date('2026-06-11T19:00:00Z')
const preTournament = new Date() < TOURNAMENT_START

export default function Leaderboard() {
  const { user } = useAuthStore()
  const [players, setPlayers] = useState([])
  const [prevPlayers, setPrevPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 25

  useEffect(() => { loadLeaderboard() }, [])

  const loadLeaderboard = async () => {
    // Load current snapshot
    const { data } = await supabase
      .from('profiles')
      .select('id, username, total_points, streak_current, perfect_rounds, streak_best, prediction_accuracy')
      .order('total_points', { ascending: false })
      .order('username', { ascending: true })
      .limit(200)
    setPlayers(data || [])

    // Load previous snapshot for rank movement (stored in leaderboard_snapshots if exists)
    const { data: prev } = await supabase
      .from('leaderboard_snapshots')
      .select('user_id, rank')
      .eq('snapshot_type', 'previous')
    setPrevPlayers(prev || [])

    setLoading(false)
  }

  const getRankIcon = (rank) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  const getRankMovement = (playerId, currentRank) => {
    const prev = prevPlayers.find(p => p.user_id === playerId)
    if (!prev) return null
    const diff = prev.rank - currentRank
    if (diff > 0) return { dir: 'up', n: diff }
    if (diff < 0) return { dir: 'down', n: Math.abs(diff) }
    return { dir: 'same', n: 0 }
  }

  const filtered = players.filter(p =>
    p.username?.toLowerCase().includes(search.toLowerCase())
  )

  const userRank = players.findIndex(p => p.id === user?.id) + 1
  const userVisible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).some(p => p.id === user?.id)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-light)',
        padding: '20px',
      }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: '800' }}>🏆 Leaderboard</h1>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
              {players.length} player{players.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Your position pill */}
          {user && userRank > 0 && !preTournament && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'var(--accent-blue-light)', borderRadius: 'var(--radius-full)',
              padding: '4px 10px', marginBottom: '12px', fontSize: '12px', fontWeight: '700',
              color: 'var(--accent-blue)',
            }}>
              You are #{userRank} · {players[userRank - 1]?.total_points || 0} pts
            </div>
          )}

          <input
            className="input"
            placeholder="Search players..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
          />
        </div>
      </div>

      <div className="container" style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
            <div className="spinner" />
          </div>
        ) : preTournament && !search ? (
          /* Pre-tournament empty state */
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>⏳</div>
            <div style={{ fontWeight: '800', fontSize: '18px', marginBottom: '8px' }}>Tournament hasn't started yet</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.5' }}>
              The leaderboard comes alive on 11 June when the first matches kick off. Get your predictions in first!
            </div>
            <div style={{ marginTop: '16px', fontSize: '13px', fontWeight: '700', color: 'var(--accent-green)' }}>
              {players.length} player{players.length !== 1 ? 's' : ''} registered so far
            </div>
          </div>
        ) : (
          <>
            <div className="card" style={{ padding: '8px', marginBottom: '12px' }}>
              {paginated.map((player) => {
                const rank = players.findIndex(p => p.id === player.id) + 1
                const isCurrentUser = user?.id === player.id
                const movement = getRankMovement(player.id, rank)

                return (
                  <div
                    key={player.id}
                    className="leaderboard-row"
                    style={{
                      background: isCurrentUser ? 'var(--accent-blue-light)' : 'transparent',
                      borderRadius: 'var(--radius-md)',
                      border: isCurrentUser ? '1px solid var(--accent-blue)' : '1px solid transparent',
                      marginBottom: '2px',
                    }}
                  >
                    {/* Rank */}
                    <div style={{
                      fontWeight: '800',
                      fontSize: rank <= 3 ? '22px' : '14px',
                      textAlign: 'center',
                      fontFamily: rank > 3 ? 'var(--font-mono)' : 'inherit',
                      color: rank > 3 ? 'var(--text-muted)' : 'inherit',
                      minWidth: '40px',
                    }}>
                      {getRankIcon(rank)}
                    </div>

                    {/* Avatar + name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                      <div style={{
                        width: '36px', height: '36px',
                        borderRadius: '50%',
                        background: isCurrentUser ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '15px', fontWeight: '700',
                        color: isCurrentUser ? 'white' : 'var(--text-primary)',
                        flexShrink: 0,
                      }}>
                        {player.username?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {player.username}
                          {isCurrentUser && <span style={{ fontSize: '10px', background: 'var(--accent-blue)', color: 'white', padding: '1px 5px', borderRadius: '20px', fontWeight: '700' }}>YOU</span>}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '2px', alignItems: 'center' }}>
                          {player.streak_current > 2 && (
                            <span style={{ fontSize: '11px', color: 'var(--accent-orange)' }}>🔥 {player.streak_current}</span>
                          )}
                          {player.perfect_rounds > 0 && (
                            <span style={{ fontSize: '11px', color: 'var(--accent-green)' }}>🎯 {player.perfect_rounds}</span>
                          )}
                          {player.prediction_accuracy > 0 && (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{player.prediction_accuracy}%</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Rank movement */}
                    {movement && movement.dir !== 'same' && (
                      <div style={{
                        fontSize: '11px', fontWeight: '700',
                        color: movement.dir === 'up' ? 'var(--accent-green)' : '#e53935',
                        minWidth: '28px', textAlign: 'center',
                      }}>
                        {movement.dir === 'up' ? `↑${movement.n}` : `↓${movement.n}`}
                      </div>
                    )}

                    {/* Points */}
                    <div style={{
                      fontWeight: '800',
                      fontSize: '18px',
                      fontFamily: 'var(--font-mono)',
                      color: player.total_points > 0 ? 'var(--accent-green)' : 'var(--text-muted)',
                    }}>
                      {player.total_points || 0}
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

            {/* Your position sticky card if off screen */}
            {user && userRank > 0 && !userVisible && !search && !preTournament && (
              <div className="card" style={{
                padding: '12px 16px', marginBottom: '12px',
                border: '1px solid var(--accent-blue)',
                background: 'var(--accent-blue-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent-blue)' }}>
                  Your position: #{userRank}
                </div>
                <div style={{ fontSize: '16px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: 'var(--accent-green)' }}>
                  {players[userRank - 1]?.total_points || 0} pts
                </div>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="btn btn-secondary btn-sm"
                >← Prev</button>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', alignSelf: 'center' }}>
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page === totalPages - 1}
                  className="btn btn-secondary btn-sm"
                >Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
