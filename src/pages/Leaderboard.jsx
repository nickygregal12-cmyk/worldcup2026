import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/index.js'

export default function Leaderboard() {
  const { user } = useAuthStore()
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadLeaderboard()
  }, [])

  const loadLeaderboard = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, total_points, streak_current, perfect_rounds, streak_best')
      .order('total_points', { ascending: false })
      .limit(100)
    setPlayers(data || [])
    setLoading(false)
  }

  const filtered = players.filter(p =>
    p.username?.toLowerCase().includes(search.toLowerCase())
  )

  const getRankIcon = (rank) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-light)',
        padding: '20px',
      }}>
        <div className="container">
          <h1 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '16px' }}>
            🏆 Global Leaderboard
          </h1>
          <input
            className="input"
            placeholder="Search players..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="container" style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
            <div className="spinner" />
          </div>
        ) : (
          <div className="card" style={{ padding: '8px' }}>
            {filtered.map((player, i) => {
              const rank = players.findIndex(p => p.id === player.id) + 1
              const isCurrentUser = user?.id === player.id

              return (
                <div
                  key={player.id}
                  className="leaderboard-row"
                  style={{
                    background: isCurrentUser ? 'var(--accent-blue-light)' : 'transparent',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>
                        {player.username}
                        {isCurrentUser && <span style={{ fontSize: '11px', color: 'var(--accent-blue)', marginLeft: '6px', fontWeight: '700' }}>YOU</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                        {player.streak_current > 2 && (
                          <span style={{ fontSize: '11px', color: 'var(--accent-orange)' }}>🔥 {player.streak_current}</span>
                        )}
                        {player.perfect_rounds > 0 && (
                          <span style={{ fontSize: '11px', color: 'var(--accent-green)' }}>🎯 {player.perfect_rounds}</span>
                        )}
                      </div>
                    </div>
                  </div>

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
        )}
      </div>
    </div>
  )
}
