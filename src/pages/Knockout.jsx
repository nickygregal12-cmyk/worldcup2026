import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/index.js'
import { SkeletonCard, ErrorState } from '../components/PageState.jsx'
import {
  ALL_STAGES,
  calcPredictedStandings, resolveSlot, getBest3rdTeams, findAffectedPicks
} from '../lib/bracketUtils.js'

const RESULT_OPTIONS = [
  { key: 'normal', label: '90 mins', bonus: 0 },
  { key: 'et', label: 'Extra Time', bonus: 3 },
  { key: 'pens', label: 'Penalties', bonus: 5 },
]

function slotLabel(slot) {
  const posMatch = slot.match(/^([12])([A-L])$/)
  if (posMatch) {
    const pos = posMatch[1] === '1' ? 'Winner' : 'Runner-up'
    return `${pos} Group ${posMatch[2]}`
  }
  const thirdMatch = slot.match(/^3([S-Z])$/)
  if (thirdMatch) {
    const rank = thirdMatch[1].charCodeAt(0) - 'S'.charCodeAt(0) + 1
    return `Best 3rd Place #${rank}`
  }
  return slot
}

export default function Knockout() {
  const { user } = useAuthStore()
  const [groupMatches, setGroupMatches] = useState([])
  const [groupPredictions, setGroupPredictions] = useState({})
  const [standings, setStandings] = useState({})
  const [knockoutPicks, setKnockoutPicks] = useState({})
  const [affectedMatches, setAffectedMatches] = useState([])
  const [activeStage, setActiveStage] = useState('r32')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [saving, setSaving] = useState({})
  const [saved, setSaved] = useState({})
  const [jokersRemaining, setJokersRemaining] = useState(3)

  const isPreTournament = new Date() < new Date('2026-06-11T19:00:00Z')
  const groupStageDone = new Date() >= new Date('2026-06-27T22:00:00Z')
  const showGroupTables = activeStage === 'groups'

  useEffect(() => { loadData() }, [user])

  const loadData = async () => {
    try {
      setLoading(true)
      const { data: matchData, error } = await supabase
        .from('matches')
        .select(`*, home_team:home_team_id(id,name,flag_emoji,short_code), away_team:away_team_id(id,name,flag_emoji,short_code), group:group_id(name)`)
        .eq('stage', 'group')
        .order('kickoff_time', { ascending: true })
      if (error) throw error
      setGroupMatches(matchData || [])

      let predMap = {}
      if (user) {
        const { data: predData } = await supabase
          .from('predictions').select('match_id, home_score, away_score').eq('user_id', user.id)
        predData?.forEach(p => { predMap[p.match_id] = { home: p.home_score, away: p.away_score } })
        setGroupPredictions(predMap)

        const { data: koData } = await supabase
          .from('knockout_picks').select('*').eq('user_id', user.id)
        const koMap = {}
        koData?.forEach(p => {
          koMap[p.match_number] = {
            winner_id: p.winner_team_id, home_id: p.home_team_id,
            away_id: p.away_team_id, result_type: p.result_type || 'normal', is_joker: p.is_joker || false,
          }
        })
        setKnockoutPicks(koMap)

        const { data: profile } = await supabase
          .from('profiles').select('jokers_knockout_remaining').eq('id', user.id).single()
        setJokersRemaining(profile?.jokers_knockout_remaining ?? 3)
      }

      setStandings(calcPredictedStandings(matchData || [], predMap))
      setLoadError(false)
    } catch (e) {
      console.error(e)
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  const resolveTeam = useCallback((slot) => resolveSlot(slot, standings), [standings])

  const resolveKnockoutWinner = useCallback((slot) => {
    const matchNum = parseInt(slot.replace('W', ''))
    const pick = knockoutPicks[matchNum]
    if (!pick?.winner_id) return null
    for (const m of groupMatches) {
      if (m.home_team?.id === pick.winner_id) return m.home_team
      if (m.away_team?.id === pick.winner_id) return m.away_team
    }
    return null
  }, [knockoutPicks, groupMatches])

  const getMatchTeams = useCallback((matchDef) => {
    const resolve = (slot) => {
      if (slot.startsWith('W')) return resolveKnockoutWinner(slot)
      if (slot.startsWith('L')) return null
      return resolveTeam(slot)
    }
    return { home: resolve(matchDef.home_slot), away: resolve(matchDef.away_slot) }
  }, [resolveTeam, resolveKnockoutWinner])

  const savePick = async (matchDef, winnerId, resultType = 'normal') => {
    if (!user) return
    const { home, away } = getMatchTeams(matchDef)
    const mn = matchDef.match_number
    const existing = knockoutPicks[mn]

    if (existing?.winner_id && existing.winner_id !== winnerId) {
      const affected = findAffectedPicks(existing.winner_id, knockoutPicks)
      if (affected.length > 0) {
        setAffectedMatches(prev => [...new Set([...prev, ...affected])])
        const newPicks = { ...knockoutPicks }
        affected.forEach(num => { delete newPicks[num] })
        setKnockoutPicks(newPicks)
        await supabase.from('knockout_picks').delete().eq('user_id', user.id).in('match_number', affected)
      }
    }

    setAffectedMatches(prev => prev.filter(n => n !== mn))
    const newPick = { winner_id: winnerId, home_id: home?.id, away_id: away?.id, result_type: resultType, is_joker: existing?.is_joker || false }
    setKnockoutPicks(prev => ({ ...prev, [mn]: newPick }))
    setSaving(prev => ({ ...prev, [mn]: true }))

    await supabase.from('knockout_picks').upsert({
      user_id: user.id, match_number: mn, winner_team_id: winnerId,
      home_team_id: home?.id, away_team_id: away?.id,
      result_type: resultType, is_joker: newPick.is_joker,
    }, { onConflict: 'user_id,match_number' })

    setSaving(prev => ({ ...prev, [mn]: false }))
    setSaved(prev => ({ ...prev, [mn]: true }))
    setTimeout(() => setSaved(prev => ({ ...prev, [mn]: false })), 1500)
  }

  const toggleJoker = async (matchDef) => {
    if (!user) return
    const mn = matchDef.match_number
    const pick = knockoutPicks[mn]
    if (!pick?.winner_id) return
    const newJoker = !pick.is_joker
    if (newJoker && jokersRemaining <= 0) return
    setKnockoutPicks(prev => ({ ...prev, [mn]: { ...prev[mn], is_joker: newJoker } }))
    setJokersRemaining(prev => newJoker ? prev - 1 : prev + 1)
    await supabase.from('knockout_picks').update({ is_joker: newJoker }).eq('user_id', user.id).eq('match_number', mn)
    await supabase.from('profiles').update({ jokers_knockout_remaining: jokersRemaining + (newJoker ? -1 : 1) }).eq('id', user.id)
  }

  const fmt = (time) => {
    const d = new Date(time)
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) +
      ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const best3rd = getBest3rdTeams(standings)
  const best3rdIds = new Set(best3rd.map(t => t.id))
  const currentStage = ALL_STAGES.find(s => s.key === activeStage)
  const stageMatches = currentStage?.matches || []
  const stagePicks = stageMatches.filter(m => knockoutPicks[m.match_number]?.winner_id).length

  if (loading) return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh', padding: '16px' }}>
      <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '16px' }}>
        <SkeletonCard rows={2} /><SkeletonCard rows={4} /><SkeletonCard rows={4} />
      </div>
    </div>
  )

  if (loadError) return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>
      <ErrorState message="Couldn't load bracket" onRetry={loadData} />
    </div>
  )

  const renderMatch = (matchDef) => {
    const { home, away } = getMatchTeams(matchDef)
    const mn = matchDef.match_number
    const pick = knockoutPicks[mn]
    const isAffected = affectedMatches.includes(mn)
    const hasJoker = pick?.is_joker
    const locked = new Date() >= new Date(matchDef.kickoff)
    const canPick = !locked && !!user
    const teamsKnown = !!(home && away)

    return (
      <div key={mn} className="card" style={{
        border: isAffected ? '2px solid var(--accent-gold)' : hasJoker ? '2px solid var(--accent-gold)' : pick?.winner_id ? '1.5px solid var(--accent-green)' : '1px solid var(--border-light)',
        background: isAffected ? 'var(--accent-gold-light)' : 'var(--bg-card)',
      }}>
        {isAffected && (
          <div style={{ marginBottom: '10px', padding: '8px 12px', background: 'rgba(184,134,11,0.15)', borderRadius: 'var(--radius-sm)', fontSize: '12px', fontWeight: '700', color: 'var(--accent-gold)' }}>
            ⚠️ Your group predictions changed — please re-pick the winner
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Match {mn} · {fmt(matchDef.kickoff)}{matchDef.venue ? ` · ${matchDef.venue}` : ''}
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {locked && <span className="badge badge-red">🔒</span>}
            {pick?.winner_id && !isAffected && <span className="badge badge-green">✓</span>}
            {saved[mn] && <span className="badge badge-green">Saved!</span>}
            {saving[mn] && <div className="spinner" style={{ width: '14px', height: '14px' }} />}
          </div>
        </div>

        {/* Teams */}
        {teamsKnown ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[{ team: home }, { team: away }].map(({ team }) => {
              if (!team) return null
              const isPicked = pick?.winner_id === team.id
              return (
                <button key={team.id} onClick={() => canPick && savePick(matchDef, team.id, pick?.result_type || 'normal')} disabled={!canPick}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px',
                    borderRadius: 'var(--radius-md)', width: '100%', textAlign: 'left', transition: 'all 0.15s',
                    border: isPicked ? '2px solid var(--accent-green)' : '1.5px solid var(--border-light)',
                    background: isPicked ? 'var(--accent-green-light)' : 'var(--bg-secondary)',
                    cursor: canPick ? 'pointer' : 'default',
                  }}>
                  <span style={{ fontSize: '28px' }}>{team.flag_emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700', fontSize: '15px', color: isPicked ? 'var(--accent-green)' : 'var(--text-primary)' }}>{team.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{team.short_code}</div>
                  </div>
                  {isPicked && <span style={{ color: 'var(--accent-green)', fontSize: '20px' }}>✓</span>}
                </button>
              )
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[matchDef.home_slot, matchDef.away_slot].map(slot => (
              <div key={slot} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-light)', background: 'var(--bg-secondary)' }}>
                <span style={{ fontSize: '24px' }}>🏳️</span>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-muted)' }}>{slotLabel(slot)}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', opacity: 0.7 }}>
                    {groupStageDone ? 'To be confirmed' : 'Based on your group predictions'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Result type + joker */}
        {pick?.winner_id && teamsKnown && canPick && (
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-light)' }}>
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                How do they win? (bonus points)
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {RESULT_OPTIONS.map(opt => (
                  <button key={opt.key} onClick={() => savePick(matchDef, pick.winner_id, opt.key)}
                    style={{
                      flex: 1, padding: '6px 4px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'center',
                      fontSize: '11px', fontWeight: '700',
                      border: (pick.result_type || 'normal') === opt.key ? '2px solid var(--accent-blue)' : '1.5px solid var(--border-light)',
                      background: (pick.result_type || 'normal') === opt.key ? 'var(--accent-blue-light)' : 'var(--bg-secondary)',
                      color: (pick.result_type || 'normal') === opt.key ? 'var(--accent-blue)' : 'var(--text-muted)',
                    }}>
                    {opt.label}
                    {opt.bonus > 0 && <div style={{ fontSize: '10px', color: 'var(--accent-gold)', fontWeight: '700' }}>+{opt.bonus}pts</div>}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={() => toggleJoker(matchDef)} disabled={!hasJoker && jokersRemaining <= 0}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                  borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: '700', border: 'none',
                  background: hasJoker ? 'var(--accent-gold)' : 'var(--bg-tertiary)',
                  color: hasJoker ? 'white' : jokersRemaining > 0 ? 'var(--text-secondary)' : 'var(--text-muted)',
                  cursor: (!hasJoker && jokersRemaining <= 0) ? 'not-allowed' : 'pointer',
                  opacity: (!hasJoker && jokersRemaining <= 0) ? 0.5 : 1,
                }}>
                🃏 {hasJoker ? 'Joker ON' : 'Use Joker'}
              </button>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {hasJoker ? '2x points if correct!' : `${jokersRemaining} jokers left`}
              </span>
            </div>
          </div>
        )}

        {!user && teamsKnown && (
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sign in to pick a winner</span>
            <Link to="/register" className="btn btn-primary btn-sm">Join free</Link>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0a0a0a, #1a2a1a)', padding: '20px', color: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '4px' }}>🏆 Knockout Bracket</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
              {isPreTournament ? 'Based on your predicted group results' : groupStageDone ? 'Real teams confirmed' : 'Mix of real results and your predictions'}
            </p>
          </div>
          {user && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px',
              borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: '700',
              background: jokersRemaining === 0 ? 'rgba(255,255,255,0.1)' : 'rgba(255,215,0,0.2)',
              border: `1px solid ${jokersRemaining === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,215,0,0.5)'}`,
              color: jokersRemaining === 0 ? 'rgba(255,255,255,0.5)' : '#ffd700',
            }}>
              🃏 {jokersRemaining} left
            </div>
          )}
        </div>
        {isPreTournament && (
          <div style={{ marginTop: '10px', background: 'rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
            💡 Teams shown based on your group predictions. Change a group score and your bracket updates.
          </div>
        )}
        {affectedMatches.length > 0 && (
          <div style={{ marginTop: '10px', background: 'rgba(184,134,11,0.3)', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', color: '#ffd700', fontWeight: '700' }}>
            ⚠️ {affectedMatches.length} knockout pick{affectedMatches.length > 1 ? 's' : ''} affected by your group changes — review highlighted matches
          </div>
        )}
      </div>

      {/* Stage tabs */}
      <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)', position: 'sticky', top: 'var(--nav-height)', zIndex: 50, overflowX: 'auto' }}>
        <div style={{ display: 'flex' }}>
          <button onClick={() => setActiveStage('groups')} style={{
            padding: '12px 14px', fontSize: '12px', whiteSpace: 'nowrap', background: 'none', border: 'none',
            fontWeight: activeStage === 'groups' ? '700' : '400',
            color: activeStage === 'groups' ? 'var(--text-primary)' : 'var(--text-muted)',
            borderBottom: activeStage === 'groups' ? '2px solid var(--primary)' : '2px solid transparent',
            cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
          }}>
            Group Tables
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>Predicted</span>
          </button>
          {ALL_STAGES.map(stage => {
            const picks = stage.matches.filter(m => knockoutPicks[m.match_number]?.winner_id).length
            const complete = picks === stage.matches.length
            return (
              <button key={stage.key} onClick={() => setActiveStage(stage.key)} style={{
                padding: '12px 14px', fontSize: '12px', whiteSpace: 'nowrap', background: 'none', border: 'none',
                fontWeight: activeStage === stage.key ? '700' : '400',
                color: activeStage === stage.key ? 'var(--text-primary)' : 'var(--text-muted)',
                borderBottom: activeStage === stage.key ? '2px solid var(--primary)' : '2px solid transparent',
                cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
              }}>
                {stage.label}
                <span style={{ fontSize: '10px', color: complete ? 'var(--accent-green)' : 'var(--text-muted)', fontWeight: '600' }}>
                  {complete ? '✓' : `${picks}/${stage.matches.length}`}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Points bar */}
      {!showGroupTables && (
        <div style={{ background: 'var(--accent-blue-light)', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
          <span style={{ color: 'var(--accent-blue)', fontWeight: '600' }}>
            🏅 Correct pick = <strong>{currentStage?.points}pts</strong>
            {activeStage === 'r32' ? ' · +3pts ET · +5pts Pens' : ''}
          </span>
          <span style={{ fontSize: '12px', fontWeight: '700', color: stagePicks === stageMatches.length ? 'var(--accent-green)' : 'var(--text-muted)' }}>
            {stagePicks === stageMatches.length ? '✓ Complete' : `${stagePicks}/${stageMatches.length}`}
          </span>
        </div>
      )}

      {/* Group Tables */}
      {showGroupTables && (
        <div className="container" style={{ padding: '16px' }}>
          <div style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
            Based on your predictions — predict more group games to see updated standings
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {Object.entries(standings).sort(([a], [b]) => a.localeCompare(b)).map(([group, teams]) => (
              <div key={group} className="card" style={{ padding: '12px' }}>
                <div style={{ fontWeight: '800', fontSize: '14px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ background: 'var(--primary)', color: 'white', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', flexShrink: 0 }}>
                    {group}
                  </span>
                  Group {group}
                </div>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 8px 4px', borderBottom: '1px solid var(--border-light)', marginBottom: '4px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', width: '14px' }}>#</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', flex: 1 }}>Team</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', width: '18px', textAlign: 'center' }}>P</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', width: '20px', textAlign: 'center' }}>Pts</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', width: '28px', textAlign: 'right' }}>GD</span>
                </div>
                {/* Rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {teams.map((entry, i) => {
                    const qualifies = i < 2
                    const qualifies3rd = i === 2 && best3rdIds.has(entry.id)
                    return (
                      <div key={entry.id} style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: 'var(--radius-sm)',
                        background: qualifies ? 'var(--accent-green-light)' : qualifies3rd ? 'var(--accent-gold-light)' : 'var(--bg-secondary)',
                        border: qualifies ? '1px solid rgba(0,122,51,0.2)' : qualifies3rd ? '1px solid rgba(184,134,11,0.2)' : '1px solid transparent',
                      }}>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', width: '14px' }}>{i + 1}</span>
                        <span style={{ fontSize: '18px' }}>{entry.team?.flag_emoji}</span>
                        <span style={{ fontSize: '12px', fontWeight: '600', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {entry.team?.short_code || entry.team?.name}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', width: '18px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                          {entry.played || '–'}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: '800', fontFamily: 'var(--font-mono)', width: '20px', textAlign: 'center' }}>
                          {entry.pts}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', width: '28px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                          {entry.gd > 0 ? '+' : ''}{entry.gd}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid var(--border-light)', fontSize: '10px', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-green)', display: 'inline-block' }} />
                    Advances
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-gold)', display: 'inline-block' }} />
                    Qualifies as 3rd
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Best 3rd Place table */}
          {best3rd.length > 0 && (
            <div className="card" style={{ marginTop: '12px' }}>
              <div style={{ fontWeight: '800', fontSize: '14px', marginBottom: '6px' }}>🏅 Best 3rd Place Teams</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                The 8 best 3rd-place teams advance to the Round of 32
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 8px 4px', borderBottom: '1px solid var(--border-light)', marginBottom: '4px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', width: '20px' }}>#</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', flex: 1 }}>Team</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', width: '30px', textAlign: 'center' }}>Grp</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', width: '18px', textAlign: 'center' }}>P</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', width: '20px', textAlign: 'center' }}>Pts</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', width: '28px', textAlign: 'right' }}>GD</span>
              </div>
              {best3rd.map((entry, i) => (
                <div key={entry.id} style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 8px',
                  borderRadius: 'var(--radius-sm)', marginBottom: '4px',
                  background: 'var(--accent-green-light)', border: '1px solid rgba(0,122,51,0.15)',
                }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', width: '20px' }}>{i + 1}</span>
                  <span style={{ fontSize: '18px' }}>{entry.team?.flag_emoji}</span>
                  <span style={{ fontSize: '12px', fontWeight: '600', flex: 1 }}>{entry.team?.short_code || entry.team?.name}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', width: '30px', textAlign: 'center', fontWeight: '700' }}>{entry.group}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', width: '18px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{entry.played || '–'}</span>
                  <span style={{ fontSize: '12px', fontWeight: '800', fontFamily: 'var(--font-mono)', width: '20px', textAlign: 'center' }}>{entry.pts}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', width: '28px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    {entry.gd > 0 ? '+' : ''}{entry.gd}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Knockout matches */}
      {!showGroupTables && (
        <div className="container" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {stageMatches.map(renderMatch)}
          </div>
        </div>
      )}
    </div>
  )
}
