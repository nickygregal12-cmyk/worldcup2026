import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/index.js'
import { SkeletonCard, ErrorState } from '../components/PageState.jsx'
import { StandingsRow, StandingsHeader, StandingsLegend } from '../components/GroupStandingsTable.jsx'
import {
  ALL_STAGES,
  calcPredictedStandings, resolveSlot, getBest3rdTeams, findAffectedPicks, groupFullyPredicted
} from '../lib/bracketUtils.js'

const VENUE_FLAGS = {
  'New York': '🇺🇸', 'New Jersey': '🇺🇸', 'Los Angeles': '🇺🇸',
  'Dallas': '🇺🇸', 'San Francisco': '🇺🇸', 'Seattle': '🇺🇸',
  'Miami': '🇺🇸', 'Atlanta': '🇺🇸', 'Boston': '🇺🇸', 'Houston': '🇺🇸',
  'Philadelphia': '🇺🇸', 'Kansas City': '🇺🇸',
  'Toronto': '🇨🇦', 'Vancouver': '🇨🇦',
  'Mexico City': '🇲🇽', 'Guadalajara': '🇲🇽', 'Monterrey': '🇲🇽',
}

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
            winner_id: p.winner_team_id,
            home_id: p.home_team_id,
            away_id: p.away_team_id,
          }
        })
        setKnockoutPicks(koMap)
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

  const resolveTeam = useCallback((slot) => resolveSlot(slot, standings, groupMatches, groupPredictions), [standings, groupMatches, groupPredictions])

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

  const savePick = async (matchDef, winnerId) => {
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
    const newPick = { winner_id: winnerId, home_id: home?.id, away_id: away?.id }
    setKnockoutPicks(prev => ({ ...prev, [mn]: newPick }))
    setSaving(prev => ({ ...prev, [mn]: true }))

    const { error: upsertErr } = await supabase.from('knockout_picks').upsert({
      user_id: user.id, match_number: mn,
      winner_team_id: winnerId,
      home_team_id: home?.id,
      away_team_id: away?.id,
    }, { onConflict: 'user_id,match_number' })

    if (upsertErr) {
      console.error('Knockout save error:', upsertErr)
      setSaving(prev => ({ ...prev, [mn]: false }))
      return
    }

    setSaving(prev => ({ ...prev, [mn]: false }))
    setSaved(prev => ({ ...prev, [mn]: true }))
    setTimeout(() => setSaved(prev => ({ ...prev, [mn]: false })), 1500)
  }

  const fmt = (time) => {
    const d = new Date(time)
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) +
      ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh', padding: '16px' }}>
      <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '16px' }}>
        <SkeletonCard rows={2} /><SkeletonCard rows={4} /><SkeletonCard rows={4} />
      </div>
    </div>
  )

  const best3rd = getBest3rdTeams(standings) || []
  const best3rdIds = new Set(best3rd.map(t => t?.id).filter(Boolean))
  const currentStage = ALL_STAGES.find(s => s.key === activeStage)
  const stageMatches = currentStage?.matches || []
  const stagePicks = stageMatches.filter(m => knockoutPicks[m.match_number]?.winner_id).length

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
    const locked = new Date() >= new Date(matchDef.kickoff)
    const canPick = !locked && !!user
    const teamsKnown = !!(home && away)

    return (
      <div key={mn} className="card" style={{
        border: isAffected ? '2px solid var(--accent-gold)' : pick?.winner_id ? '1.5px solid var(--accent-green)' : '1px solid var(--border-light)',
        background: isAffected ? 'var(--accent-gold-light)' : 'var(--bg-card)',
      }}>
        {isAffected && (
          <div style={{ marginBottom: '10px', padding: '8px 12px', background: 'rgba(184,134,11,0.15)', borderRadius: 'var(--radius-sm)', fontSize: '12px', fontWeight: '700', color: 'var(--accent-gold)' }}>
            ⚠️ Your group predictions changed — please re-pick the winner
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Match {mn} · {fmt(matchDef.kickoff)}{matchDef.venue ? ` · ${VENUE_FLAGS[matchDef.venue] || ''} ${matchDef.venue}` : ''}
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {locked && <span className="badge badge-red">🔒</span>}
            {pick?.winner_id && !isAffected && <span className="badge badge-green">✓</span>}
            {saved[mn] && <span className="badge badge-green">Saved!</span>}
            {saving[mn] && <div className="spinner" style={{ width: '14px', height: '14px' }} />}
          </div>
        </div>

        {teamsKnown ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[{ team: home }, { team: away }].map(({ team }) => {
              if (!team) return null
              const isPicked = pick?.winner_id === team.id
              return (
                <button key={team.id} onClick={() => canPick && savePick(matchDef, team.id)} disabled={!canPick}
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
                    {groupStageDone ? 'To be confirmed' : 'Predict all 3 group games to confirm'}
                  </div>
                </div>
              </div>
            ))}
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
      <div style={{ background: 'linear-gradient(135deg, #003087, #005eb8)', padding: '20px', color: 'white' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '4px' }}>🏆 Knockout Bracket</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
            {isPreTournament ? 'Based on your predicted group results' : groupStageDone ? 'Real teams confirmed' : 'Mix of real results and your predictions'}
          </p>
        </div>
        {isPreTournament && (
          <div style={{ marginTop: '10px', background: 'rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
            💡 Predict all 3 games in a group to lock in those teams in the bracket.
          </div>
        )}
        {affectedMatches.length > 0 && (
          <div style={{ marginTop: '10px', background: 'rgba(184,134,11,0.3)', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', color: '#ffd700', fontWeight: '700' }}>
            ⚠️ {affectedMatches.length} knockout pick{affectedMatches.length > 1 ? 's' : ''} affected by your group changes
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
          <div className="group-grid">
            {Object.entries(standings).sort(([a], [b]) => a.localeCompare(b)).map(([group, teams]) => (
              <div key={group} className="card" style={{ padding: '12px' }}>
                <div style={{ fontWeight: '800', fontSize: '14px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ background: 'var(--primary)', color: 'white', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', flexShrink: 0 }}>
                    {group}
                  </span>
                  Group {group}
                </div>
                <StandingsHeader />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {teams.map((entry, i) => {
                    const qualifies = i < 2
                    const groupComplete = groupFullyPredicted(group, groupMatches, groupPredictions)
                    const qualifies3rd = i === 2 && groupComplete && best3rdIds.has(entry.id)
                    return (
                      <StandingsRow
                        key={entry.id}
                        entry={entry}
                        position={i + 1}
                        qualifies={qualifies}
                        qualifies3rd={qualifies3rd}
                      />
                    )
                  })}
                </div>
                <StandingsLegend allPredicted={groupFullyPredicted(group, groupMatches, groupPredictions)} />
              </div>
            ))}
          </div>

          {best3rd.length > 0 && (
            <div className="card" style={{ marginTop: '12px' }}>
              <div style={{ fontWeight: '800', fontSize: '14px', marginBottom: '4px' }}>🏅 Best 3rd Place Teams</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>Top 8 of 12 advance to the Round of 32</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 8px 5px', borderBottom: '1px solid var(--border-light)', marginBottom: '4px' }}>
                <span style={{ width: '16px', fontSize: '10px', color: 'var(--text-muted)' }}>#</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', flex: 1 }}>Team</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', width: '28px', textAlign: 'center' }}>Grp</span>
                <span style={{ width: '16px', fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>P</span>
                <span style={{ width: '28px', fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', fontWeight: '700' }}>Pts</span>
                <span style={{ width: '30px', fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right' }}>GD</span>
              </div>
              {best3rd.map((entry, i) => (
                <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: 'var(--radius-sm)', marginBottom: '2px', background: 'var(--accent-green-light)', border: '1px solid rgba(0,122,51,0.15)' }}>
                  <span style={{ width: '16px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>{i + 1}</span>
                  <span style={{ fontSize: '18px' }}>{entry.team?.flag_emoji}</span>
                  <span style={{ flex: 1, fontSize: '12px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.team?.short_code || entry.team?.name}</span>
                  <span style={{ width: '28px', fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', fontWeight: '700' }}>{entry.group}</span>
                  <span style={{ width: '16px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{entry.played || '–'}</span>
                  <span style={{ width: '28px', fontSize: '15px', fontWeight: '900', fontFamily: 'var(--font-mono)', textAlign: 'center', color: 'var(--text-primary)' }}>{entry.pts}</span>
                  <span style={{ width: '30px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{entry.gd > 0 ? '+' : ''}{entry.gd}</span>
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
