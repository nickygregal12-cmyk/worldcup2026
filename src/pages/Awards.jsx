import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/index.js'

// Reordered: awards first, goals last. Final Four removed.
const AWARDS = [
  {
    type: 'golden_boot',
    label: 'Golden Boot',
    icon: '👟',
    desc: 'Top scorer of the tournament',
    points: 15,
    positionFilter: ['FWD', 'MID'],
    placeholder: 'Search strikers & midfielders...',
  },
  {
    type: 'golden_glove',
    label: 'Golden Glove',
    icon: '🧤',
    desc: 'Best goalkeeper of the tournament',
    points: 10,
    positionFilter: ['GK'],
    placeholder: 'Search goalkeepers...',
  },
  {
    type: 'player_of_tournament',
    label: 'Player of the Tournament',
    icon: '⭐',
    desc: 'Best overall player — decided by FIFA at the end',
    points: 10,
    positionFilter: null,
    placeholder: 'Search any player...',
  },
]

const POSITION_COLORS = {
  GK:  { bg: '#fff3e0', color: '#e65100' },
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

  // Goals
  const [groupGoals, setGroupGoals] = useState('')
  const [knockoutGoals, setKnockoutGoals] = useState('')
  const [totalGoals, setTotalGoals] = useState('')
  const [goalsLocked, setGoalsLocked] = useState(false)
  const [goalsSaving, setGoalsSaving] = useState(false)
  const [goalsSaved, setGoalsSaved] = useState(false)
  const [predictedGroupGoals, setPredictedGroupGoals] = useState(null)
  const [allGroupPredicted, setAllGroupPredicted] = useState(false)

  const tournamentStarted = new Date() >= new Date('2026-06-11T19:00:00Z')

  useEffect(() => { loadData() }, [user])

  const loadData = async () => {
    const [playersRes, teamsRes] = await Promise.all([
      supabase.from('players').select('*, team:team_id(id,name,flag_emoji,short_code)').order('name'),
      supabase.from('teams').select('id,name,flag_emoji,short_code').order('name'),
    ])
    setPlayers(playersRes.data || [])
    setTeams(teamsRes.data || [])

    if (user) {
      const { data: awardData } = await supabase
        .from('award_predictions').select('*').eq('user_id', user.id)
      if (awardData) {
        const predMap = {}
        awardData.forEach(p => {
          predMap[p.award_type] = { player_name: p.predicted_player_name, team_id: p.predicted_team_id }
        })
        setPredictions(predMap)
      }

      const { data: tourData } = await supabase
        .from('tournament_predictions').select('*').eq('user_id', user.id)
      if (tourData) {
        const gg = tourData.find(p => p.prediction_type === 'group_goals')
        const kg = tourData.find(p => p.prediction_type === 'knockout_goals')
        const tg = tourData.find(p => p.prediction_type === 'total_goals')
        if (gg) setGroupGoals(gg.int_value?.toString() || '')
        if (kg) setKnockoutGoals(kg.int_value?.toString() || '')
        if (tg) setTotalGoals(tg.int_value?.toString() || '')
        if (gg?.is_locked) setGoalsLocked(true)
      }

      await calcPredictedGoals()
    }
    setLoading(false)
  }

  const calcPredictedGoals = async () => {
    if (!user) return
    const { data: preds } = await supabase
      .from('predictions')
      .select('home_score, away_score, match:match_id(stage)')
      .eq('user_id', user.id)
    if (!preds) return
    const groupPreds = preds.filter(p => p.match?.stage === 'group')
    const allDone = groupPreds.length === 72
    if (allDone) {
      const total = groupPreds.reduce((sum, p) => sum + (Number(p.home_score) || 0) + (Number(p.away_score) || 0), 0)
      setPredictedGroupGoals(total)
      setAllGroupPredicted(true)
      if (!groupGoals) setGroupGoals(total.toString())
    } else {
      setAllGroupPredicted(false)
      if (groupPreds.length > 0) {
        const partial = groupPreds.reduce((sum, p) => sum + (Number(p.home_score) || 0) + (Number(p.away_score) || 0), 0)
        setPredictedGroupGoals(partial)
      }
    }
  }

  const saveGoals = async () => {
    if (!user || tournamentStarted) return
    setGoalsSaving(true)
    const upserts = [
      { user_id: user.id, prediction_type: 'group_goals', int_value: parseInt(groupGoals) || null },
      { user_id: user.id, prediction_type: 'knockout_goals', int_value: parseInt(knockoutGoals) || null },
      { user_id: user.id, prediction_type: 'total_goals', int_value: parseInt(totalGoals) || null },
    ].filter(u => u.int_value !== null)
    for (const upsert of upserts) {
      // Delete existing then insert to avoid conflict key issues with null team_id
      await supabase.from('tournament_predictions')
        .delete()
        .eq('user_id', user.id)
        .eq('prediction_type', upsert.prediction_type)
      await supabase.from('tournament_predictions').insert(upsert)
    }

    // Update awards_done — count player awards + 1 if any goals entered
    const goalsEntered = groupGoals || knockoutGoals || totalGoals ? 1 : 0
    const { data: awardPreds } = await supabase.from('award_predictions').select('award_type').eq('user_id', user.id)
    const playerAwardsDone = awardPreds?.length || 0
    await supabase.from('profiles').update({ awards_done: playerAwardsDone + goalsEntered }).eq('id', user.id)

    setGoalsSaving(false)
    setGoalsSaved(true)
    setTimeout(() => setGoalsSaved(false), 2000)
  }

  const getFilteredPlayers = (awardType) => {
    const award = AWARDS.find(a => a.type === awardType)
    const query = (search[awardType] || '').toLowerCase()
    const tFilter = teamFilter[awardType]
    return players.filter(p => {
      const matchesSearch = query.length < 2 || p.name.toLowerCase().includes(query)
      const matchesTeam = !tFilter || p.team_id === tFilter
      const matchesPosition = !award.positionFilter || query.length >= 2 || tFilter
        ? true : award.positionFilter.includes(p.position)
      return matchesSearch && matchesTeam && matchesPosition
    }).sort((a, b) => {
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
    setPredictions(prev => ({ ...prev, [awardType]: { player_name: player.name, team_id: player.team_id } }))
    setSaving(prev => ({ ...prev, [awardType]: true }))
    await supabase.from('award_predictions').upsert({
      user_id: user.id, award_type: awardType,
      predicted_player_name: player.name, predicted_team_id: player.team_id,
      bracket_type: 'main', is_locked: false,
    }, { onConflict: 'user_id,award_type,bracket_type' })

    // Update awards_done — player awards + 1 if any goals entered
    const newPreds = { ...predictions, [awardType]: { player_name: player.name } }
    const playerCount = AWARDS.filter(a => newPreds[a.type]?.player_name).length
    const { data: goalData } = await supabase.from('tournament_predictions')
      .select('prediction_type').eq('user_id', user.id)
      .in('prediction_type', ['group_goals', 'knockout_goals', 'total_goals'])
    const goalsEntered = goalData && goalData.length > 0 ? 1 : 0
    await supabase.from('profiles').update({ awards_done: playerCount + goalsEntered }).eq('id', user.id)
    setSaving(prev => ({ ...prev, [awardType]: false }))
    setSaved(prev => ({ ...prev, [awardType]: true }))
    setTimeout(() => setSaved(prev => ({ ...prev, [awardType]: false })), 2000)
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  // Progress summary
  const awardsDone = AWARDS.filter(a => predictions[a.type]?.player_name).length
  const goalsDone = [groupGoals, knockoutGoals, totalGoals].filter(Boolean).length
  const totalDone = awardsDone + (goalsDone > 0 ? 1 : 0)
  const totalPossible = AWARDS.length + 1 // 3 awards + goals section

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, rgba(0,30,80,0.85) 0%, rgba(0,60,140,0.80) 100%), url(/awards-bg.jpg) center/cover no-repeat', padding: '24px 20px', color: 'white', textAlign: 'center' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '4px' }}>🏅 Tournament Predictions</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginBottom: '16px' }}>
          {tournamentStarted ? 'Predictions locked at tournament kickoff' : 'Lock at kickoff · 11 Jun 20:00 BST'}
        </p>
        {/* Progress */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', maxWidth: '320px', margin: '0 auto' }}>
          {AWARDS.map(a => (
            <div key={a.type} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '10px', fontWeight: '600', color: predictions[a.type]?.player_name ? '#4ade80' : 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>
                {predictions[a.type]?.player_name ? '✓' : a.icon}
              </div>
              <div style={{ height: '3px', background: 'rgba(255,255,255,0.15)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: predictions[a.type]?.player_name ? '100%' : '0%', background: '#4ade80', borderRadius: '2px', transition: 'width 0.4s' }} />
              </div>
            </div>
          ))}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '10px', fontWeight: '600', color: goalsDone > 0 ? '#4ade80' : 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>
              {goalsDone > 0 ? '✓' : '🥅'}
            </div>
            <div style={{ height: '3px', background: 'rgba(255,255,255,0.15)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(goalsDone / 3) * 100}%`, background: '#4ade80', borderRadius: '2px', transition: 'width 0.4s' }} />
            </div>
          </div>
        </div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>{totalDone}/{totalPossible} sections complete</div>
      </div>

      {!user && (
        <div style={{ background: 'var(--accent-blue-light)', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', color: 'var(--accent-blue)', fontWeight: '600' }}>Register to save your predictions</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link to="/register" className="btn btn-primary btn-sm">Join free</Link>
            <Link to="/login" className="btn btn-secondary btn-sm">Sign in</Link>
          </div>
        </div>
      )}

      <div className="container" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* ── AWARD PREDICTIONS (Golden Boot, Glove, POTT) ── */}
          {AWARDS.map(award => {
            const pred = predictions[award.type]
            const isSaving = saving[award.type]
            const isSaved = saved[award.type]
            const filtered = getFilteredPlayers(award.type)
            const isOpen = showDropdown[award.type]
            const currentSearch = search[award.type] ?? pred?.player_name ?? ''

            return (
              <div key={award.type} className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'var(--accent-gold-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
                    {award.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '800', fontSize: '16px' }}>{award.label}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{award.desc}</div>
                    {award.positionFilter && (
                      <div style={{ marginTop: '4px', display: 'flex', gap: '4px' }}>
                        {award.positionFilter.map(pos => (
                          <span key={pos} style={{ fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: 'var(--radius-full)', background: POSITION_COLORS[pos]?.bg, color: POSITION_COLORS[pos]?.color }}>
                            {pos}
                          </span>
                        ))}
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', alignSelf: 'center' }}>
                          {award.positionFilter.length === 1 ? 'only' : 'prioritised'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div style={{ background: 'var(--accent-gold-light)', color: '#b8860b', padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: '700' }}>
                    +{award.points}pts
                  </div>
                </div>

                {/* Current pick */}
                {pred?.player_name && (
                  <div style={{ background: 'var(--accent-green-light)', border: '1px solid var(--accent-green)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '20px' }}>{teams.find(t => t.id === pred.team_id)?.flag_emoji || '🏳️'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--accent-green)' }}>✓ {pred.player_name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{teams.find(t => t.id === pred.team_id)?.name}</div>
                    </div>
                    {isSaved && <span style={{ color: 'var(--accent-green)', fontSize: '12px', fontWeight: '700' }}>Saved!</span>}
                    {isSaving && <div className="spinner" style={{ width: '16px', height: '16px' }} />}
                    {!tournamentStarted && user && (
                      <button onClick={() => setSearch(prev => ({ ...prev, [award.type]: '' }))} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px', padding: '4px' }}>✏️</button>
                    )}
                  </div>
                )}

                {/* Player search */}
                {!tournamentStarted && (
                  <div style={{ position: 'relative' }}>
                    {/* Team filter chips */}
                    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '8px' }}>
                      <button onClick={() => setTeamFilter(prev => ({ ...prev, [award.type]: null }))}
                        style={{ padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: '600', background: !teamFilter[award.type] ? 'var(--primary)' : 'var(--bg-tertiary)', color: !teamFilter[award.type] ? 'var(--text-inverse)' : 'var(--text-muted)', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                        All Teams
                      </button>
                      {teams.map(team => (
                        <button key={team.id} onClick={() => setTeamFilter(prev => ({ ...prev, [award.type]: prev[award.type] === team.id ? null : team.id }))}
                          style={{ padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: '600', background: teamFilter[award.type] === team.id ? 'var(--primary)' : 'var(--bg-tertiary)', color: teamFilter[award.type] === team.id ? 'var(--text-inverse)' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                          {team.flag_emoji} {team.name}
                        </button>
                      ))}
                    </div>
                    <input className="input" placeholder={award.placeholder} value={currentSearch}
                      onChange={e => { setSearch(prev => ({ ...prev, [award.type]: e.target.value })); setShowDropdown(prev => ({ ...prev, [award.type]: true })) }}
                      onFocus={() => setShowDropdown(prev => ({ ...prev, [award.type]: true }))}
                      onBlur={() => setTimeout(() => setShowDropdown(prev => ({ ...prev, [award.type]: false })), 200)}
                      disabled={!user} style={{ opacity: !user ? 0.6 : 1 }} />
                    {isOpen && filtered.length > 0 && user && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', zIndex: 100, maxHeight: '280px', overflowY: 'auto', marginTop: '4px' }}>
                        {filtered.map(player => {
                          const posStyle = POSITION_COLORS[player.position] || {}
                          const isRelevant = !award.positionFilter || award.positionFilter.includes(player.position)
                          return (
                            <button key={player.id} onMouseDown={() => selectPlayer(award.type, player)}
                              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', border: 'none', background: isRelevant ? 'none' : 'var(--bg-secondary)', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--border-light)', opacity: isRelevant ? 1 : 0.7 }}
                              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                              onMouseLeave={e => e.currentTarget.style.background = isRelevant ? 'none' : 'var(--bg-secondary)'}>
                              <span style={{ fontSize: '22px' }}>{player.team?.flag_emoji}</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: '600', fontSize: '14px' }}>{player.name}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{player.team?.name}</div>
                              </div>
                              <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: 'var(--radius-full)', background: posStyle.bg, color: posStyle.color }}>
                                {player.position}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {!user && (
                  <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                    <Link to="/register" style={{ color: 'var(--accent-blue)', fontWeight: '600' }}>Register</Link> to make award predictions
                  </div>
                )}
              </div>
            )
          })}

          {/* ── TOTAL GOALS (moved to bottom) ── */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'var(--accent-green-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
                🥅
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '800', fontSize: '16px' }}>Total Goals</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Closest prediction = 10pts · Exact = 15pts</div>
              </div>
              {goalsLocked && <span className="badge badge-red">🔒 Locked</span>}
              {goalsSaved && <span className="badge badge-green">Saved!</span>}
            </div>

            {predictedGroupGoals !== null && (
              <div style={{ marginBottom: '12px', padding: '10px 14px', background: allGroupPredicted ? 'var(--accent-green-light)' : 'var(--accent-blue-light)', borderRadius: 'var(--radius-md)', fontSize: '13px', color: allGroupPredicted ? 'var(--accent-green)' : 'var(--accent-blue)', fontWeight: '600' }}>
                {allGroupPredicted
                  ? `✓ Auto-calculated from your predictions: ${predictedGroupGoals} group goals`
                  : `📊 Based on your picks so far · ~${predictedGroupGoals} group goals estimated`
                }
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { key: 'group', label: '⚽ Group Stage Goals', value: groupGoals, setter: setGroupGoals, locked: tournamentStarted, hint: '72 matches · avg ~2.5/game' },
                { key: 'knockout', label: '🏆 Knockout Goals', value: knockoutGoals, setter: setKnockoutGoals, locked: new Date() >= new Date('2026-06-28T20:00:00Z'), hint: '32 matches · avg ~2.2/game' },
                { key: 'total', label: '🌍 Tournament Total', value: totalGoals, setter: setTotalGoals, locked: tournamentStarted, hint: '104 matches total' },
              ].map(item => (
                <div key={item.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{item.label}</label>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.hint}</span>
                  </div>
                  <input type="number" min="0" max="400" value={item.value}
                    onChange={e => {
                      item.setter(e.target.value)
                      if (item.key === 'group' && knockoutGoals) setTotalGoals((parseInt(e.target.value || 0) + parseInt(knockoutGoals || 0)).toString())
                      if (item.key === 'knockout' && groupGoals) setTotalGoals((parseInt(groupGoals || 0) + parseInt(e.target.value || 0)).toString())
                    }}
                    disabled={!user || item.locked}
                    placeholder="Enter number..."
                    className="input"
                    style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', fontSize: '16px', opacity: item.locked ? 0.6 : 1 }}
                  />
                </div>
              ))}
            </div>

            {user && !tournamentStarted && (
              <button onClick={saveGoals} disabled={goalsSaving || (!groupGoals && !knockoutGoals && !totalGoals)}
                className="btn btn-primary btn-full" style={{ marginTop: '14px' }}>
                {goalsSaving ? 'Saving...' : '💾 Save Goals Predictions'}
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
