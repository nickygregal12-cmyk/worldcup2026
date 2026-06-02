import { useEffect, useState, useCallback } from 'react'
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

  // Goals predictions
  const [groupGoals, setGroupGoals] = useState('')
  const [knockoutGoals, setKnockoutGoals] = useState('')
  const [totalGoals, setTotalGoals] = useState('')
  const [goalsLocked, setGoalsLocked] = useState(false)
  const [goalsSaving, setGoalsSaving] = useState(false)
  const [goalsSaved, setGoalsSaved] = useState(false)
  const [predictedGroupGoals, setPredictedGroupGoals] = useState(null)
  const [allGroupPredicted, setAllGroupPredicted] = useState(false)

  // Final Four
  const [finalFourPicks, setFinalFourPicks] = useState([]) // array of team_ids
  const [finalFourSaving, setFinalFourSaving] = useState(false)

  const tournamentStarted = new Date() >= new Date('2026-06-11T19:00:00Z')
  const knockoutStarted = new Date() >= new Date('2026-06-28T20:00:00Z')

  useEffect(() => { loadData() }, [user])

  const loadData = async () => {
    const [playersRes, teamsRes] = await Promise.all([
      supabase.from('players').select('*, team:team_id(id,name,flag_emoji,short_code)').order('name'),
      supabase.from('teams').select('id,name,flag_emoji,short_code').order('name'),
    ])
    setPlayers(playersRes.data || [])
    setTeams(teamsRes.data || [])

    if (user) {
      // Load award predictions
      const { data: awardData } = await supabase
        .from('award_predictions')
        .select('*')
        .eq('user_id', user.id)

      if (awardData) {
        const predMap = {}
        awardData.forEach(p => {
          predMap[p.award_type] = { player_name: p.predicted_player_name, team_id: p.predicted_team_id }
        })
        setPredictions(predMap)
      }

      // Load tournament predictions (goals + final four)
      const { data: tourData } = await supabase
        .from('tournament_predictions')
        .select('*')
        .eq('user_id', user.id)

      if (tourData) {
        const gg = tourData.find(p => p.prediction_type === 'group_goals')
        const kg = tourData.find(p => p.prediction_type === 'knockout_goals')
        const tg = tourData.find(p => p.prediction_type === 'total_goals')
        const ff = tourData.filter(p => p.prediction_type === 'final_four')

        if (gg) setGroupGoals(gg.int_value?.toString() || '')
        if (kg) setKnockoutGoals(kg.int_value?.toString() || '')
        if (tg) setTotalGoals(tg.int_value?.toString() || '')
        if (ff.length) setFinalFourPicks(ff.map(p => p.team_id))
        if (gg?.is_locked) setGoalsLocked(true)
      }

      // Calculate predicted group goals from predictions
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
      // Auto-fill if not already set
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
      await supabase.from('tournament_predictions')
        .upsert(upsert, { onConflict: 'user_id,prediction_type,team_id' })
    }

    setGoalsSaving(false)
    setGoalsSaved(true)
    setTimeout(() => setGoalsSaved(false), 2000)
  }

  const toggleFinalFour = async (teamId) => {
    if (!user || knockoutStarted) return
    const isSelected = finalFourPicks.includes(teamId)

    if (isSelected) {
      setFinalFourPicks(prev => prev.filter(id => id !== teamId))
      await supabase.from('tournament_predictions')
        .delete()
        .eq('user_id', user.id)
        .eq('prediction_type', 'final_four')
        .eq('team_id', teamId)
    } else {
      if (finalFourPicks.length >= 4) return // max 4
      setFinalFourPicks(prev => [...prev, teamId])
      await supabase.from('tournament_predictions')
        .upsert({ user_id: user.id, prediction_type: 'final_four', team_id: teamId },
          { onConflict: 'user_id,prediction_type,team_id' })
    }
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

    setSaving(prev => ({ ...prev, [awardType]: false }))
    setSaved(prev => ({ ...prev, [awardType]: true }))
    setTimeout(() => setSaved(prev => ({ ...prev, [awardType]: false })), 2000)
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1000, #2a2000)',
        padding: '24px 20px', color: 'white', textAlign: 'center',
      }}>
        <h1 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '4px' }}>🏅 Tournament Predictions</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
          {tournamentStarted ? 'Predictions locked at tournament kickoff' : 'Lock at kickoff · 11 Jun 20:00 BST'}
        </p>
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

          {/* ── GOALS PREDICTIONS ── */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'var(--accent-green-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
                🥅
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '800', fontSize: '16px' }}>Total Goals</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Closest = 10pts · Exact = 15pts · Ties share points</div>
              </div>
              {goalsLocked && <span className="badge badge-red">🔒 Locked</span>}
              {goalsSaved && <span className="badge badge-green">Saved!</span>}
            </div>

            {/* Auto-calculate hint */}
            {predictedGroupGoals !== null && (
              <div style={{
                marginBottom: '12px', padding: '10px 14px',
                background: allGroupPredicted ? 'var(--accent-green-light)' : 'var(--accent-blue-light)',
                borderRadius: 'var(--radius-md)', fontSize: '13px',
                color: allGroupPredicted ? 'var(--accent-green)' : 'var(--accent-blue)',
                fontWeight: '600',
              }}>
                {allGroupPredicted
                  ? `✓ Auto-calculated from your predictions: ${predictedGroupGoals} group goals`
                  : `📊 Based on ${Math.round(predictedGroupGoals / 72 * 100)}% of predictions: ~${predictedGroupGoals} group goals so far`
                }
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { key: 'group', label: '⚽ Group Stage Goals', value: groupGoals, setter: setGroupGoals, locked: tournamentStarted, hint: '72 matches · avg ~2.5 per game' },
                { key: 'knockout', label: '🏆 Knockout Goals', value: knockoutGoals, setter: setKnockoutGoals, locked: knockoutStarted, hint: '32 matches · avg ~2.2 per game' },
                { key: 'total', label: '🌍 Tournament Total', value: totalGoals, setter: setTotalGoals, locked: tournamentStarted, hint: '104 matches total' },
              ].map(item => (
                <div key={item.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{item.label}</label>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.hint}</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="400"
                    value={item.value}
                    onChange={e => {
                      item.setter(e.target.value)
                      // Auto-update total if group + knockout both set
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

          {/* ── FINAL FOUR ── */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: '#fce4ec', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
                🔥
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '800', fontSize: '16px' }}>Final Four</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Pick all 4 semi-finalists correctly = 20pts bonus</div>
              </div>
              <div style={{
                padding: '4px 10px', borderRadius: 'var(--radius-full)',
                background: finalFourPicks.length === 4 ? 'var(--accent-green-light)' : 'var(--bg-tertiary)',
                fontSize: '12px', fontWeight: '700',
                color: finalFourPicks.length === 4 ? 'var(--accent-green)' : 'var(--text-muted)',
              }}>
                {finalFourPicks.length}/4
              </div>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              {knockoutStarted ? '🔒 Locked when knockout started' : 'Locks when Round of 32 begins · 28 Jun'}
            </div>

            {!user ? (
              <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                <Link to="/register" style={{ color: 'var(--accent-blue)', fontWeight: '600' }}>Register</Link> to pick your Final Four
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {teams.map(team => {
                  const isPicked = finalFourPicks.includes(team.id)
                  const atMax = finalFourPicks.length >= 4 && !isPicked
                  return (
                    <button
                      key={team.id}
                      onClick={() => toggleFinalFour(team.id)}
                      disabled={knockoutStarted || atMax}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '8px 12px', borderRadius: 'var(--radius-md)',
                        border: isPicked ? '2px solid var(--accent-green)' : '1.5px solid var(--border-light)',
                        background: isPicked ? 'var(--accent-green-light)' : 'var(--bg-secondary)',
                        cursor: knockoutStarted || atMax ? 'default' : 'pointer',
                        opacity: atMax ? 0.4 : 1, transition: 'all 0.15s',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ fontSize: '20px' }}>{team.flag_emoji}</span>
                      <span style={{ fontSize: '12px', fontWeight: '600', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {team.short_code}
                      </span>
                      {isPicked && <span style={{ color: 'var(--accent-green)', fontSize: '14px' }}>✓</span>}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── AWARD PREDICTIONS ── */}
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
                  <div style={{ background: 'var(--accent-gold-light)', color: 'var(--accent-gold)', padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: '700' }}>
                    +{award.points}pts
                  </div>
                </div>

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

                {!tournamentStarted && (
                  <div style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '8px' }}>
                      <button onClick={() => setTeamFilter(prev => ({ ...prev, [award.type]: null }))}
                        style={{ padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: '600', background: !teamFilter[award.type] ? 'var(--primary)' : 'var(--bg-tertiary)', color: !teamFilter[award.type] ? 'var(--text-inverse)' : 'var(--text-muted)', border: 'none', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                        All Teams
                      </button>
                      {teams.map(team => (
                        <button key={team.id} onClick={() => setTeamFilter(prev => ({ ...prev, [award.type]: prev[award.type] === team.id ? null : team.id }))}
                          style={{ padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: '600', background: teamFilter[award.type] === team.id ? 'var(--primary)' : 'var(--bg-tertiary)', color: teamFilter[award.type] === team.id ? 'var(--text-inverse)' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                          {team.flag_emoji} {team.short_code}
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
        </div>
      </div>
    </div>
  )
}
