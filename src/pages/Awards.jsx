import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/index.js'

const AWARDS = [
  {
    type: 'golden_boot',
    label: 'Golden Boot',
    icon: '👟',
    desc: 'Top scorer of the tournament',
    points: 15,
    positionFilter: ['FWD', 'MID'],
    placeholder: 'Search strikers & midfielders... e.g. Mbappé',
  },
  {
    type: 'golden_glove',
    label: 'Golden Glove',
    icon: '🧤',
    desc: 'Best goalkeeper of the tournament',
    points: 10,
    positionFilter: ['GK'],
    placeholder: 'Search goalkeepers... e.g. Pickford',
  },
  {
    type: 'player_of_tournament',
    label: 'Player of the Tournament',
    icon: '⭐',
    desc: 'Best overall player',
    points: 10,
    positionFilter: null,
    placeholder: 'Search any player... e.g. Bellingham',
  },
]

const POSITION_LABELS = { GK: 'GK', DEF: 'DEF', MID: 'MID', FWD: 'FWD' }
const POSITION_COLORS = {
  GK: { bg: '#fff3e0', color: '#e65100' },
  DEF: { bg: '#e3f2fd', color: '#1565c0' },
  MID: { bg: '#e8f5e9', color: '#2e7d32' },
  FWD: { bg: '#fce4ec', color: '#c62828' },
}

export default function Awards() {
  const { user } = useAuthStore()
  const [players, setPlayers] = useState([])
  const [teams, setTeams] = useState([])
  const [predictions, setPredictions] = useState({})
  const [search, setSearch] = useState({})
  const [teamFilter, setTeamFilter] = useState({})
  const [showDropdown, setShowDropdown] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState({})
  const [saved, setSaved] = useState({})

  const tournamentStarted = new Date() >= new Date('2026-06-11T23:00:00Z')

  useEffect(() => {
    loadData()
  }, [user])

  const loadData = async () => {
    const [playersRes, teamsRes] = await Promise.all([
      supabase.from('players').select('*, team:team_id(id,name,flag_emoji,short_code)').order('name'),
      supabase.from('teams').select('id,name,flag_emoji,short_code').order('name'),
    ])
    setPlayers(playersRes.data || [])
    setTeams(teamsRes.data || [])

    if (user) {
      const { data } = await supabase
        .from('award_predictions')
        .select('*')
        .eq('user_id', user.id)

      if (data) {
        const predMap = {}
        data.forEach(p => {
          predMap[p.award_type] = {
            player_name: p.predicted_player_name,
            team_id: p.predicted_team_id,
          }
        })
        setPredictions(predMap)
      }
    }
    setLoading(false)
  }

  const getFilteredPlayers = (awardType) => {
    const award = AWARDS.find(a => a.type === awardType)
    const query = (search[awardType] || '').toLowerCase()
    const tFilter = teamFilter[awardType]

    return players.filter(p => {
      const matchesSearch = query.length < 2 || p.name.toLowerCase().includes(query)
      const matchesTeam = !tFilter || p.team_id === tFilter
      // Position filter: only enforce if no search query and no team filter
      const matchesPosition = !award.positionFilter || query.length >= 2 || tFilter
        ? true
        : award.positionFilter.includes(p.position)
      return matchesSearch && matchesTeam && matchesPosition
    }).sort((a, b) => {
      // Sort by position relevance first
      if (award.positionFilter) {
        const aMatch = award.positionFilter.includes(a.position)
        const bMatch = award.positionFilter.includes(b.position)
        if (aMatch && !bMatch) return -1
        if (!aMatch && bMatch) return 1
      }
      return a.name.localeCompare(b.name)
    }).slice(0, 20)
  }

  const selectPlayer = async (awardType, player) => {
    if (!user || tournamentStarted) return

    setShowDropdown(prev => ({ ...prev, [awardType]: false }))
    setSearch(prev => ({ ...prev, [awardType]: player.name }))
    setPredictions(prev => ({
      ...prev,
      [awardType]: { player_name: player.name, team_id: player.team_id }
    }))

    setSaving(prev => ({ ...prev, [awardType]: true }))

    const { error } = await supabase
      .from('award_predictions')
      .upsert({
        user_id: user.id,
        award_type: awardType,
        predicted_player_name: player.name,
        predicted_team_id: player.team_id,
        bracket_type: 'main',
        is_locked: false,
      }, { onConflict: 'user_id,award_type,bracket_type' })

    setSaving(prev => ({ ...prev, [awardType]: false }))
    if (!error) {
      setSaved(prev => ({ ...prev, [awardType]: true }))
      setTimeout(() => setSaved(prev => ({ ...prev, [awardType]: false })), 2000)
    }
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1000, #2a2000)',
        padding: '24px 20px', color: 'white', textAlign: 'center',
      }}>
        <h1 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '4px' }}>🏅 Award Predictions</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
          {tournamentStarted
            ? 'Predictions locked — tournament has started'
            : 'Predict before 11 Jun 2026 · Locks at kickoff'}
        </p>
        {tournamentStarted && (
          <div style={{ marginTop: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>
            🔒 Award predictions locked at tournament kickoff
          </div>
        )}
      </div>

      {/* Guest banner */}
      {!user && (
        <div style={{ background: 'var(--accent-blue-light)', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', color: 'var(--accent-blue)', fontWeight: '600' }}>
            Register to save your award predictions
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link to="/register" className="btn btn-primary btn-sm">Join free</Link>
            <Link to="/login" className="btn btn-secondary btn-sm">Sign in</Link>
          </div>
        </div>
      )}

      <div className="container" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {AWARDS.map(award => {
            const pred = predictions[award.type]
            const isSaving = saving[award.type]
            const isSaved = saved[award.type]
            const filtered = getFilteredPlayers(award.type)
            const isOpen = showDropdown[award.type]
            const currentSearch = search[award.type] ?? pred?.player_name ?? ''

            return (
              <div key={award.type} className="card">
                {/* Award header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: 'var(--radius-md)',
                    background: 'var(--accent-gold-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '24px', flexShrink: 0,
                  }}>
                    {award.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '800', fontSize: '16px' }}>{award.label}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{award.desc}</div>
                    {award.positionFilter && (
                      <div style={{ marginTop: '4px', display: 'flex', gap: '4px' }}>
                        {award.positionFilter.map(pos => (
                          <span key={pos} style={{
                            fontSize: '10px', fontWeight: '700', padding: '2px 6px',
                            borderRadius: 'var(--radius-full)',
                            background: POSITION_COLORS[pos]?.bg,
                            color: POSITION_COLORS[pos]?.color,
                          }}>
                            {POSITION_LABELS[pos]}
                          </span>
                        ))}
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', alignSelf: 'center' }}>
                          {award.positionFilter.length === 1 ? 'only' : 'prioritised'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div style={{
                    background: 'var(--accent-gold-light)', color: 'var(--accent-gold)',
                    padding: '4px 10px', borderRadius: 'var(--radius-full)',
                    fontSize: '12px', fontWeight: '700',
                  }}>
                    +{award.points}pts
                  </div>
                </div>

                {/* Current prediction */}
                {pred?.player_name && (
                  <div style={{
                    background: 'var(--accent-green-light)', border: '1px solid var(--accent-green)',
                    borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: '12px',
                    display: 'flex', alignItems: 'center', gap: '10px',
                  }}>
                    <span style={{ fontSize: '20px' }}>
                      {teams.find(t => t.id === pred.team_id)?.flag_emoji || '🏳️'}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--accent-green)' }}>
                        ✓ {pred.player_name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {teams.find(t => t.id === pred.team_id)?.name}
                      </div>
                    </div>
                    {isSaved && <span style={{ color: 'var(--accent-green)', fontSize: '12px', fontWeight: '700' }}>Saved!</span>}
                    {isSaving && <div className="spinner" style={{ width: '16px', height: '16px' }} />}
                    {!tournamentStarted && user && (
                      <button
                        onClick={() => setSearch(prev => ({ ...prev, [award.type]: '' }))}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px', padding: '4px' }}
                      >
                        ✏️
                      </button>
                    )}
                  </div>
                )}

                {/* Search */}
                {!tournamentStarted && (
                  <div style={{ position: 'relative' }}>
                    {/* Team filter */}
                    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '8px' }}>
                      <button
                        onClick={() => setTeamFilter(prev => ({ ...prev, [award.type]: null }))}
                        style={{
                          padding: '4px 10px', borderRadius: 'var(--radius-full)',
                          fontSize: '12px', fontWeight: '600',
                          background: !teamFilter[award.type] ? 'var(--primary)' : 'var(--bg-tertiary)',
                          color: !teamFilter[award.type] ? 'var(--text-inverse)' : 'var(--text-muted)',
                          border: 'none', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
                        }}
                      >
                        All Teams
                      </button>
                      {teams.map(team => (
                        <button
                          key={team.id}
                          onClick={() => setTeamFilter(prev => ({
                            ...prev,
                            [award.type]: prev[award.type] === team.id ? null : team.id
                          }))}
                          style={{
                            padding: '4px 10px', borderRadius: 'var(--radius-full)',
                            fontSize: '12px', fontWeight: '600',
                            background: teamFilter[award.type] === team.id ? 'var(--primary)' : 'var(--bg-tertiary)',
                            color: teamFilter[award.type] === team.id ? 'var(--text-inverse)' : 'var(--text-secondary)',
                            border: 'none', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
                          }}
                        >
                          {team.flag_emoji} {team.short_code}
                        </button>
                      ))}
                    </div>

                    {/* Search input */}
                    <input
                      className="input"
                      placeholder={award.placeholder}
                      value={currentSearch}
                      onChange={e => {
                        setSearch(prev => ({ ...prev, [award.type]: e.target.value }))
                        setShowDropdown(prev => ({ ...prev, [award.type]: true }))
                      }}
                      onFocus={() => setShowDropdown(prev => ({ ...prev, [award.type]: true }))}
                      onBlur={() => setTimeout(() => setShowDropdown(prev => ({ ...prev, [award.type]: false })), 200)}
                      disabled={!user || tournamentStarted}
                      style={{ opacity: !user || tournamentStarted ? 0.6 : 1 }}
                    />

                    {/* Dropdown */}
                    {isOpen && filtered.length > 0 && user && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0,
                        background: 'var(--bg-card)', border: '1px solid var(--border-medium)',
                        borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
                        zIndex: 100, maxHeight: '280px', overflowY: 'auto', marginTop: '4px',
                      }}>
                        {filtered.map(player => {
                          const posStyle = POSITION_COLORS[player.position] || {}
                          const isRelevant = !award.positionFilter || award.positionFilter.includes(player.position)

                          return (
                            <button
                              key={player.id}
                              onMouseDown={() => selectPlayer(award.type, player)}
                              style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '10px 14px', border: 'none',
                                background: isRelevant ? 'none' : 'var(--bg-secondary)',
                                cursor: 'pointer', textAlign: 'left',
                                borderBottom: '1px solid var(--border-light)',
                                opacity: isRelevant ? 1 : 0.7,
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                              onMouseLeave={e => e.currentTarget.style.background = isRelevant ? 'none' : 'var(--bg-secondary)'}
                            >
                              <span style={{ fontSize: '22px' }}>{player.team?.flag_emoji}</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)' }}>
                                  {player.name}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                  {player.team?.name}
                                </div>
                              </div>
                              <span style={{
                                fontSize: '10px', fontWeight: '700', padding: '2px 6px',
                                borderRadius: 'var(--radius-full)',
                                background: posStyle.bg, color: posStyle.color,
                              }}>
                                {player.position}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Not logged in */}
                {!user && (
                  <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                    <Link to="/register" style={{ color: 'var(--accent-blue)', fontWeight: '600' }}>Register</Link> to make award predictions
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
