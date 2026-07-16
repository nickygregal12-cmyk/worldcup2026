import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/index.js'
import { DATES } from '../lib/tournamentDates.js'
import { tournamentGoalTotal } from '../lib/goalTotals.js'
import WorldCupLogo from '../components/WorldCupLogo.jsx'

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
  const [totalGoals, setTotalGoals] = useState('')
  const [goalsLocked, setGoalsLocked] = useState(false)
  const [goalsSaving, setGoalsSaving] = useState(false)
  const [goalsSaved, setGoalsSaved] = useState(false)
  const [predictedGroupGoals, setPredictedGroupGoals] = useState(null)
  const [allGroupPredicted, setAllGroupPredicted] = useState(false)
  const ESTIMATED_KNOCKOUT_GOALS = 69

  const tournamentStarted = new Date() >= DATES.TOURNAMENT_START

  // Live tournament data (post-kickoff)
  const [awardResults, setAwardResults] = useState({}) // actual winners set by admin
  const [topScorers, setTopScorers] = useState([])     // live top scorers
  const [liveGoals, setLiveGoals] = useState(null)     // actual goals scored so far

  useEffect(() => { loadData() }, [user])

  const loadData = async () => {
    const [playersRes, teamsRes] = await Promise.all([
      supabase.from('players').select('*, team:team_id(id,name,flag_emoji,short_code)').order('name'),
      supabase.from('teams').select('id,name,flag_emoji,short_code').order('name'),
    ])
    setPlayers(playersRes.data || [])
    setTeams(teamsRes.data || [])

    // Always fetch award results and live scorers once tournament started
    if (tournamentStarted) {
      const [awardRes, scorersRes, goalsRes] = await Promise.all([
        supabase.from('award_results').select('*'),
        supabase.from('tournament_scorers').select('*').order('goals', { ascending: false }).limit(5),
        supabase.from('matches').select('home_score, away_score, outcome_type, aet_home_score, aet_away_score').eq('status', 'completed'),
      ])
      const awardMap = {}
      ;(awardRes.data || []).forEach(r => { awardMap[r.award_type] = r })
      setAwardResults(awardMap)
      setTopScorers(scorersRes.data || [])
      setLiveGoals(tournamentGoalTotal(goalsRes.data || []))
    }

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
        const tg = tourData.find(p => p.prediction_type === 'total_goals')
        if (tg) setTotalGoals(tg.int_value?.toString() || '')
        if (tg?.is_locked) setGoalsLocked(true)
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
    // Only count predictions that actually have scores entered
    const groupPreds = preds.filter(p => p.match?.stage === 'group' && p.home_score !== null && p.away_score !== null)
    const allDone = groupPreds.length >= 72
    if (allDone) {
      const total = groupPreds.reduce((sum, p) => sum + (Number(p.home_score) || 0) + (Number(p.away_score) || 0), 0)
      setPredictedGroupGoals(total)
      setAllGroupPredicted(true)
      // Use group-pick total as a helper. If no total is saved yet, suggest group goals + a conservative knockout estimate.
      setTotalGoals(prev => prev ? prev : (total + ESTIMATED_KNOCKOUT_GOALS).toString())
    } else {
      setAllGroupPredicted(false)
      if (groupPreds.length > 0) {
        const partial = groupPreds.reduce((sum, p) => sum + (Number(p.home_score) || 0) + (Number(p.away_score) || 0), 0)
        setPredictedGroupGoals(partial)
      } else {
        setPredictedGroupGoals(null)
      }
    }
  }

  const saveGoals = async () => {
    if (!user || tournamentStarted) return

    const parsedGoals = parseInt(totalGoals, 10)
    if (Number.isNaN(parsedGoals) || parsedGoals < 0) return

    setGoalsSaving(true)
    try {
      // Group/knockout goal totals are now helper-only. Only tournament total is scored/saved.
      const { error: deleteError } = await supabase.from('tournament_predictions')
        .delete()
        .eq('user_id', user.id)
        .in('prediction_type', ['group_goals', 'knockout_goals', 'total_goals'])

      if (deleteError) throw deleteError

      const { error: insertError } = await supabase.from('tournament_predictions').insert({
        user_id: user.id,
        prediction_type: 'total_goals',
        int_value: parsedGoals,
      })

      if (insertError) throw insertError

      setTotalGoals(String(parsedGoals))

      // Update awards_done — count player awards + 1 for total goals.
      const { data: awardPreds } = await supabase.from('award_predictions').select('award_type').eq('user_id', user.id)
      const playerAwardsDone = AWARDS.filter(a => (awardPreds || []).some(p => p.award_type === a.type)).length
      await supabase.from('profiles').update({ awards_done: playerAwardsDone + 1 }).eq('id', user.id)

      setGoalsSaved(true)
      setTimeout(() => setGoalsSaved(false), 2000)
    } catch (error) {
      console.error('Failed to save total goals:', error)
      alert('Could not save total goals. Please try again.')
    } finally {
      setGoalsSaving(false)
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

    // Update awards_done — player awards + 1 if any goals entered
    const newPreds = { ...predictions, [awardType]: { player_name: player.name } }
    const playerCount = AWARDS.filter(a => newPreds[a.type]?.player_name).length
    const { data: goalData } = await supabase.from('tournament_predictions')
      .select('prediction_type').eq('user_id', user.id)
      .eq('prediction_type', 'total_goals')
    const goalsEntered = goalData && goalData.length > 0 ? 1 : 0
    await supabase.from('profiles').update({ awards_done: playerCount + goalsEntered }).eq('id', user.id)
    setSaving(prev => ({ ...prev, [awardType]: false }))
    setSaved(prev => ({ ...prev, [awardType]: true }))
    setTimeout(() => setSaved(prev => ({ ...prev, [awardType]: false })), 2000)
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  // Progress summary
  const awardsDone = AWARDS.filter(a => predictions[a.type]?.player_name).length
  const goalsDone = totalGoals ? 1 : 0
  const totalDone = awardsDone + (goalsDone > 0 ? 1 : 0)
  const totalPossible = AWARDS.length + 1 // 3 awards + goals section

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, rgba(0,30,80,0.85) 0%, rgba(0,60,140,0.80) 100%), url(/awards-bg.jpg) center/cover no-repeat', padding: '24px 20px', color: 'white', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <WorldCupLogo variant="watermark" size={166} opacity={0.1} style={{ right: '-16px' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
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
              <div style={{ height: '100%', width: goalsDone ? '100%' : '0%', background: '#4ade80', borderRadius: '2px', transition: 'width 0.4s' }} />
            </div>
          </div>
        </div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>{totalDone}/{totalPossible} sections complete</div>
        </div>
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

          {/* ── LIVE GOAL COUNTER (post-kickoff, moved to top) ── */}
          {tournamentStarted && (
            <div className="card" style={{ overflow: 'hidden', background: 'var(--scottish-navy)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontWeight: '800', fontSize: '15px', color: 'white' }}>🥅 Total Goals</div>
                {goalsLocked && <span className="badge badge-red">🔒 Locked</span>}
              </div>
              <div style={{ display: 'flex', gap: '0', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: '10px' }}>
                {/* Live goals */}
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.12)', padding: '14px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', fontWeight: '900', fontFamily: 'var(--font-mono)', color: 'white', lineHeight: 1 }}>
                    {liveGoals ?? '—'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live goals</div>
                </div>
                <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                {/* Your prediction */}
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', padding: '14px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', fontWeight: '900', fontFamily: 'var(--font-mono)', lineHeight: 1,
                    color: liveGoals !== null && totalGoals ? (
                      Math.abs(liveGoals - parseInt(totalGoals)) === 0 ? '#4ade80' :
                      Math.abs(liveGoals - parseInt(totalGoals)) <= 5 ? '#fbbf24' : 'rgba(255,255,255,0.5)'
                    ) : 'rgba(255,255,255,0.5)'
                  }}>
                    {totalGoals || '—'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your pick</div>
                </div>
              </div>
              {/* Gap indicator */}
              {liveGoals !== null && totalGoals && (() => {
                const diff = parseInt(totalGoals) - liveGoals
                const absDiff = Math.abs(diff)
                const pts = absDiff === 0 ? 15 : absDiff <= 5 ? 5 : absDiff <= 10 ? 3 : 0
                const colour = pts === 15 ? '#4ade80' : pts === 5 ? '#fbbf24' : pts === 3 ? '#fb923c' : 'rgba(255,255,255,0.4)'
                const msg = absDiff === 0 ? '🎯 Exact! On track for 15pts'
                  : absDiff <= 5 ? `${diff > 0 ? `${absDiff} above live` : `${absDiff} below live`} · on track for 5pts`
                  : absDiff <= 10 ? `${absDiff} away · on track for 3pts`
                  : `${absDiff} away · 0pts if final`
                return (
                  <div style={{ fontSize: '12px', fontWeight: '700', color: colour, textAlign: 'center', padding: '4px 0 2px' }}>
                    {msg}
                  </div>
                )
              })()}
              {/* Top scorers mini list */}
              {topScorers.length > 0 && (
                <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🥇 Top Scorers</div>
                  {topScorers.slice(0, 3).map((s, i) => {
                    const isMyPick = predictions['golden_boot']?.player_name === s.player_name
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 0', borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', width: '16px' }}>{i + 1}</span>
                        <span style={{ flex: 1, fontSize: '12px', fontWeight: isMyPick ? '800' : '600', color: isMyPick ? '#fbbf24' : 'rgba(255,255,255,0.8)' }}>
                          {s.player_name} {isMyPick && '⭐'}
                        </span>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>{s.team_name}</span>
                        <span style={{ fontSize: '13px', fontWeight: '800', color: 'white' }}>{s.goals}⚽</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── AWARD PREDICTIONS (Golden Boot, Glove, POTT) ── */}
          {AWARDS.map(award => {
            const pred = predictions[award.type]
            const isSaving = saving[award.type]
            const isSaved = saved[award.type]
            const filtered = getFilteredPlayers(award.type)
            const isOpen = showDropdown[award.type]
            const currentSearch = search[award.type] ?? pred?.player_name ?? ''
            const actualResult = awardResults[award.type] // set by admin post-tournament
            const correct = actualResult?.winner_name && pred?.player_name === actualResult.winner_name
            const decided = !!(actualResult?.winner_name) // only true when admin has actually set a winner

            return (
              <div key={award.type} className="card" style={{
                border: decided ? (correct ? '2px solid var(--accent-green)' : '2px solid rgba(198,40,40,0.3)') : undefined
              }}>
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

                {/* Actual winner — shown when admin has set result */}
                {decided && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: '12px',
                    background: correct ? 'var(--accent-green-light)' : 'rgba(198,40,40,0.06)',
                    border: `1px solid ${correct ? 'var(--accent-green)' : 'rgba(198,40,40,0.2)'}`,
                    display: 'flex', alignItems: 'center', gap: '10px',
                  }}>
                    <span style={{ fontSize: '22px' }}>{correct ? '🎯' : '❌'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '800', fontSize: '13px', color: correct ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                        {correct ? 'Correct!' : 'Wrong'} — Winner: {actualResult.winner_name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Your pick: {pred?.player_name || 'No pick made'}
                      </div>
                    </div>
                    <div style={{ fontWeight: '900', fontSize: '20px', fontFamily: 'var(--font-mono)', color: correct ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                      {correct ? `+${award.points}` : '0'}
                      <span style={{ fontSize: '11px', fontWeight: '600' }}>pts</span>
                    </div>
                  </div>
                )}

                {/* Current pick — shown pre-result in neutral style (not green — that's for confirmed correct only) */}
                {!decided && pred?.player_name && (
                  <div style={{ background: 'var(--scottish-navy-light)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '20px' }}>{teams.find(t => t.id === pred.team_id)?.flag_emoji || '🏳️'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>🎯 {pred.player_name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{teams.find(t => t.id === pred.team_id)?.name} · Your pick</div>
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
                    />
                    {isOpen && filtered.length > 0 && (
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

                {/* Guest — sticky banner handles CTA */}
              </div>
            )
          })}

          {/* ── TOTAL GOALS (shown at bottom pre-tournament, moves to top post-kickoff) ── */}
          {!tournamentStarted && <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'var(--accent-green-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
                🥅
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '800', fontSize: '16px' }}>Total Goals</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Exact = 15pts · Within 5 = 5pts · Within 10 = 3pts</div>
              </div>
              {goalsLocked && <span className="badge badge-red">🔒 Locked</span>}
              {goalsSaved && <span className="badge badge-green">Saved!</span>}
            </div>

            {predictedGroupGoals !== null && (
              <div style={{ marginBottom: '12px', padding: '10px 14px', background: allGroupPredicted ? 'var(--accent-green-light)' : 'var(--accent-blue-light)', borderRadius: 'var(--radius-md)', fontSize: '13px', color: allGroupPredicted ? 'var(--accent-green)' : 'var(--accent-blue)', fontWeight: '600' }}>
                {allGroupPredicted
                  ? <>✓ Your group picks total <strong>{predictedGroupGoals} goals</strong>. Suggested tournament total: <strong>{predictedGroupGoals + ESTIMATED_KNOCKOUT_GOALS}</strong>. You can edit it below.</>
                  : <>📊 Your group picks so far total <strong>{predictedGroupGoals} goals</strong>. Complete all 72 group matches for a better tournament-total guide.</>
                }
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>🌍 Tournament Total Goals</label>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>104 matches total</span>
                </div>
                <input type="number" min="0" max="400" value={totalGoals}
                  onChange={e => setTotalGoals(e.target.value)}
                  disabled={tournamentStarted}
                  placeholder="Enter tournament total..."
                  className="input"
                  style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', fontSize: '16px', opacity: tournamentStarted ? 0.6 : 1 }}
                />
              </div>
            </div>

            {!tournamentStarted && (
              <button onClick={user ? saveGoals : () => alert('Sign up free to save your predictions!')}
                disabled={goalsSaving || !totalGoals}
                className="btn btn-primary btn-full" style={{ marginTop: '14px' }}>
                {goalsSaving ? 'Saving...' : goalsSaved ? 'Saved!' : '💾 Save Total Goals'}
              </button>
            )}
          </div>}

        </div>
      </div>

      {/* Sticky guest save banner */}
      {!user && (
        <div style={{
          position: 'fixed', bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))',
          left: 0, right: 0, zIndex: 90,
          background: 'var(--scottish-navy)',
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
          boxShadow: '0 -4px 16px rgba(0,0,0,0.15)',
        }}>
          <div style={{ color: 'white', fontSize: '13px', lineHeight: 1.4 }}>
            <span style={{ fontWeight: '700' }}>💾 Save your picks</span>
            <span style={{ color: 'rgba(255,255,255,0.65)', marginLeft: '6px' }}>Join free to compete</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <Link to="/register" className="btn btn-green btn-sm">Join free</Link>
            <Link to="/login" className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>Sign in</Link>
          </div>
        </div>
      )}
    </div>
  )
}
