import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/index.js'
import { SkeletonCard, ErrorState } from '../components/PageState.jsx'
import {
  ALL_STAGES, FINAL, THIRD_PLACE,
  calcPredictedStandings, resolveSlot, findAffectedPicks
} from '../lib/bracketUtils.js'

const RESULT_OPTIONS = [
  { key: 'normal', label: '90 mins', bonus: 0 },
  { key: 'et',     label: 'Extra Time', bonus: 3 },
  { key: 'pens',   label: 'Penalties', bonus: 5 },
]

export default function Knockout() {
  const { user } = useAuthStore()
  const [groupMatches, setGroupMatches] = useState([])
  const [groupPredictions, setGroupPredictions] = useState({})
  const [standings, setStandings] = useState({})
  const [knockoutPicks, setKnockoutPicks] = useState({}) // { match_number: { winner_id, home_id, away_id, result_type, is_joker } }
  const [affectedMatches, setAffectedMatches] = useState([]) // match_numbers with cascade warning
  const [activeStage, setActiveStage] = useState('r32')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [saving, setSaving] = useState({})
  const [saved, setSaved] = useState({})
  const [jokersRemaining, setJokersRemaining] = useState(3)

  const isPreTournament = new Date() < new Date('2026-06-11T19:00:00Z')
  const groupStageDone = new Date() >= new Date('2026-06-27T22:00:00Z')

  useEffect(() => {
    loadData()
  }, [user])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load all group matches with full team/group data
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select(`
          *,
          home_team:home_team_id(id,name,flag_emoji,short_code),
          away_team:away_team_id(id,name,flag_emoji,short_code),
          group:group_id(name)
        `)
        .eq('stage', 'group')
        .order('kickoff_time', { ascending: true })

      if (matchError) throw matchError
      setGroupMatches(matchData || [])

      // Load user's group predictions
      let predMap = {}
      if (user) {
        const { data: predData } = await supabase
          .from('predictions')
          .select('match_id, home_score, away_score')
          .eq('user_id', user.id)

        predData?.forEach(p => {
          predMap[p.match_id] = { home: p.home_score, away: p.away_score }
        })
        setGroupPredictions(predMap)

        // Load knockout picks
        const { data: koData } = await supabase
          .from('knockout_picks')
          .select('*')
          .eq('user_id', user.id)

        const koMap = {}
        koData?.forEach(p => {
          koMap[p.match_number] = {
            winner_id: p.winner_team_id,
            home_id: p.home_team_id,
            away_id: p.away_team_id,
            result_type: p.result_type || 'normal',
            is_joker: p.is_joker || false,
          }
        })
        setKnockoutPicks(koMap)

        // Load jokers remaining
        const { data: profile } = await supabase
          .from('profiles')
          .select('jokers_knockout_remaining')
          .eq('id', user.id)
          .single()

        setJokersRemaining(profile?.jokers_knockout_remaining ?? 3)
      }

      // Calculate standings
      const s = calcPredictedStandings(matchData || [], predMap)
      setStandings(s)
      setLoadError(false)
    } catch (e) {
      console.error('Failed to load knockout data:', e)
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  // Recalculate standings whenever group predictions change
  const recalcStandings = useCallback((newPreds) => {
    const s = calcPredictedStandings(groupMatches, newPreds)
    setStandings(s)
  }, [groupMatches])

  // Resolve a slot to actual team data
  const resolveTeam = useCallback((slot) => {
    return resolveSlot(slot, standings)
  }, [standings])

  // Resolve winner of a previous knockout match
  const resolveKnockoutWinner = useCallback((slot) => {
    const matchNum = parseInt(slot.replace('W', ''))
    const pick = knockoutPicks[matchNum]
    if (!pick?.winner_id) return null
    // Find team from group matches
    for (const m of groupMatches) {
      if (m.home_team?.id === pick.winner_id) return m.home_team
      if (m.away_team?.id === pick.winner_id) return m.away_team
    }
    return null
  }, [knockoutPicks, groupMatches])

  // Get both teams for a match slot
  const getMatchTeams = useCallback((matchDef) => {
    const resolveAny = (slot) => {
      if (slot.startsWith('W')) return resolveKnockoutWinner(slot)
      if (slot.startsWith('L')) return null // loser slots for 3rd place
      return resolveTeam(slot)
    }
    return {
      home: resolveAny(matchDef.home_slot),
      away: resolveAny(matchDef.away_slot),
    }
  }, [resolveTeam, resolveKnockoutWinner])

  const savePick = async (matchDef, winnerId, resultType = 'normal') => {
    if (!user) return
    const { home, away } = getMatchTeams(matchDef)
    const mn = matchDef.match_number

    // Check if this changes an existing pick and cascade
    const existing = knockoutPicks[mn]
    if (existing?.winner_id && existing.winner_id !== winnerId) {
      // Find downstream matches affected
      const affected = findAffectedPicks(existing.winner_id, knockoutPicks)
      if (affected.length > 0) {
        setAffectedMatches(prev => [...new Set([...prev, ...affected])])
        // Clear downstream picks
        const newPicks = { ...knockoutPicks }
        affected.forEach(num => { delete newPicks[num] })
        setKnockoutPicks(newPicks)
        // Delete from DB
        await supabase.from('knockout_picks')
          .delete()
          .eq('user_id', user.id)
          .in('match_number', affected)
      }
    }

    // Clear warning for this match if it was affected
    setAffectedMatches(prev => prev.filter(n => n !== mn))

    const newPick = {
      winner_id: winnerId,
      home_id: home?.id,
      away_id: away?.id,
      result_type: resultType,
      is_joker: existing?.is_joker || false,
    }

    setKnockoutPicks(prev => ({ ...prev, [mn]: newPick }))
    setSaving(prev => ({ ...prev, [mn]: true }))

    await supabase.from('knockout_picks').upsert({
      user_id: user.id,
      match_number: mn,
      winner_team_id: winnerId,
      home_team_id: home?.id,
      away_team_id: away?.id,
      result_type: resultType,
      is_joker: newPick.is_joker,
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
    const newRemaining = newJoker ? jokersRemaining - 1 : jokersRemaining + 1
    if (newJoker && jokersRemaining <= 0) return

    setKnockoutPicks(prev => ({ ...prev, [mn]: { ...prev[mn], is_joker: newJoker } }))
    setJokersRemaining(newRemaining)

    await supabase.from('knockout_picks')
      .update({ is_joker: newJoker })
      .eq('user_id', user.id)
      .eq('match_number', mn)

    await supabase.from('profiles')
      .update({ jokers_knockout_remaining: newRemaining })
      .eq('id', user.id)
  }

  const formatDate = (time) => {
    const d = new Date(time)
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) +
      ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const showGroupTables = activeStage === 'groups'
  const currentStage = ALL_STAGES.find(s => s.key === activeStage)
  const stageMatches = currentStage?.matches || []

  // Count completed picks for this stage
  const stagePicks = stageMatches.filter(m => knockoutPicks[m.match_number]?.winner_id).length

  if (loading) return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh', padding: '16px' }}>
      <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '16px' }}>
        <SkeletonCard rows={2} />
        <SkeletonCard rows={4} />
        <SkeletonCard rows={4} />
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
    const isSaving = saving[mn]
    const isSaved = saved[mn]
    const hasJoker = pick?.is_joker
    const locked = new Date() >= new Date(matchDef.kickoff)
    const canPick = !locked && user
    const teamsKnown = home && away

    return (
      <div
        key={mn}
        className="card"
        style={{
          border: isAffected
            ? '2px solid var(--accent-gold)'
            : hasJoker
            ? '2px solid var(--accent-gold)'
            : pick?.winner_id
            ? '1.5px solid var(--accent-green)'
            : '1px solid var(--border-light)',
          background: isAffected ? 'var(--accent-gold-light)' : 'var(--bg-card)',
        }}
      >
        {/* Cascade warning */}
        {isAffected && (
          <div style={{
            marginBottom: '10px', padding: '8px 12px',
            background: 'rgba(184,134,11,0.15)', borderRadius: 'var(--radius-sm)',
            fontSize: '12px', fontWeight: '700', color: 'var(--accent-gold)',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            ⚠️ Your group predictions changed — please re-pick the winner
          </div>
        )}

        {/* Match header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Match {mn} · {formatDate(matchDef.kickoff)}
            {matchDef.venue && ` · ${matchDef.venue}`}
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {locked && <span className="badge badge-red">🔒</span>}
            {pick?.winner_id && !isAffected && <span className="badge badge-green">✓</span>}
            {isSaved && <span className="badge badge-green">Saved!</span>}
            {isSaving && <div className="spinner" style={{ width: '14px', height: '14px' }} />}
          </div>
        </div>

        {/* Teams */}
        {!teamsKnown ? (
          <div style={{
            padding: '16px', textAlign: 'center', background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: '13px',
          }}>
            <div style={{ marginBottom: '6px' }}>
              {matchDef.home_slot} vs {matchDef.away_slot}
            </div>
            <div style={{ fontSize: '11px' }}>
              {groupStageDone
                ? 'Waiting for real group results'
                : 'Predict your group stage to see teams here'
              }
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { team: home, slot: matchDef.home_slot },
              { team: away, slot: matchDef.away_slot },
            ].map(({ team }) => {
              if (!team) return null
              const isPicked = pick?.winner_id === team.id
              return (
                <button
                  key={team.id}
                  onClick={() => canPick && savePick(matchDef, team.id, pick?.result_type || 'normal')}
                  disabled={!canPick}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 14px', borderRadius: 'var(--radius-md)',
                    border: isPicked ? '2px solid var(--accent-green)' : '1.5px solid var(--border-light)',
                    background: isPicked ? 'var(--accent-green-light)' : 'var(--bg-secondary)',
                    cursor: canPick ? 'pointer' : 'default',
                    width: '100%', textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: '28px' }}>{team.flag_emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700', fontSize: '15px', color: isPicked ? 'var(--accent-green)' : 'var(--text-primary)' }}>
                      {team.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{team.short_code}</div>
                  </div>
                  {isPicked && <span style={{ color: 'var(--accent-green)', fontSize: '20px' }}>✓</span>}
                </button>
              )
            })}
          </div>
        )}

        {/* Result type + joker — only shown after picking a winner */}
        {pick?.winner_id && teamsKnown && canPick && (
          <div style={{
            marginTop: '12px', paddingTop: '12px',
            borderTop: '1px solid var(--border-light)',
          }}>
            {/* Result type for bonus points */}
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                How do they win? (bonus points)
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {RESULT_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => savePick(matchDef, pick.winner_id, opt.key)}
                    style={{
                      flex: 1, padding: '6px 4px',
                      borderRadius: 'var(--radius-sm)',
                      border: (pick.result_type || 'normal') === opt.key
                        ? '2px solid var(--accent-blue)'
                        : '1.5px solid var(--border-light)',
                      background: (pick.result_type || 'normal') === opt.key
                        ? 'var(--accent-blue-light)'
                        : 'var(--bg-secondary)',
                      cursor: 'pointer', textAlign: 'center',
                      fontSize: '11px', fontWeight: '700',
                      color: (pick.result_type || 'normal') === opt.key
                        ? 'var(--accent-blue)'
                        : 'var(--text-muted)',
                    }}
                  >
                    {opt.label}
                    {opt.bonus > 0 && (
                      <div style={{ fontSize: '10px', color: 'var(--accent-gold)', fontWeight: '700' }}>+{opt.bonus}pts</div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Joker */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => toggleJoker(matchDef)}
                disabled={!hasJoker && jokersRemaining <= 0}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', borderRadius: 'var(--radius-full)',
                  fontSize: '12px', fontWeight: '700',
                  background: hasJoker ? 'var(--accent-gold)' : 'var(--bg-tertiary)',
                  color: hasJoker ? 'white' : jokersRemaining > 0 ? 'var(--text-secondary)' : 'var(--text-muted)',
                  border: 'none', cursor: (!hasJoker && jokersRemaining <= 0) ? 'not-allowed' : 'pointer',
                  opacity: (!hasJoker && jokersRemaining <= 0) ? 0.5 : 1,
                }}
              >
                🃏 {hasJoker ? 'Joker ON' : 'Use Joker'}
              </button>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {hasJoker ? '2x points if correct!' : `${jokersRemaining} jokers left`}
              </span>
            </div>
          </div>
        )}

        {/* Guest CTA */}
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
      <div style={{
        background: 'linear-gradient(135deg, #0a0a0a, #1a2a1a)',
        padding: '20px', color: 'white',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '4px' }}>🏆 Knockout Bracket</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
              {isPreTournament
                ? 'Based on your predicted group results'
                : groupStageDone
                ? 'Real teams confirmed — pick your winners'
                : 'Mix of real results and your predictions'}
            </p>
          </div>
          {user && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 12px', borderRadius: 'var(--radius-full)',
              background: jokersRemaining === 0 ? 'rgba(255,255,255,0.1)' : 'rgba(255,215,0,0.2)',
              border: `1px solid ${jokersRemaining === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,215,0,0.5)'}`,
              fontSize: '12px', fontWeight: '700',
              color: jokersRemaining === 0 ? 'rgba(255,255,255,0.5)' : '#ffd700',
            }}>
              🃏 {jokersRemaining} left
            </div>
          )}
        </div>

        {/* Pre-tournament note */}
        {isPreTournament && (
          <div style={{
            marginTop: '10px', background: 'rgba(255,255,255,0.08)',
            borderRadius: '8px', padding: '8px 14px',
            fontSize: '12px', color: 'rgba(255,255,255,0.7)',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            💡 Teams shown are based on your group predictions. Change a group score and your bracket updates automatically.
          </div>
        )}

        {/* Cascade warning banner */}
        {affectedMatches.length > 0 && (
          <div style={{
            marginTop: '10px', background: 'rgba(184,134,11,0.3)',
            borderRadius: '8px', padding: '8px 14px',
            fontSize: '12px', color: '#ffd700', fontWeight: '700',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            ⚠️ {affectedMatches.length} knockout pick{affectedMatches.length > 1 ? 's' : ''} affected by your group changes — review highlighted matches
          </div>
        )}
      </div>

      {/* Stage tabs */}
      <div style={{
        background: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)',
        position: 'sticky', top: 'var(--nav-height)', zIndex: 50, overflowX: 'auto',
      }}>
        <div style={{ display: 'flex' }}>
          {/* Group tables tab */}
          <button
            onClick={() => setActiveStage('groups')}
            style={{
              padding: '12px 14px', fontSize: '12px', whiteSpace: 'nowrap',
              fontWeight: activeStage === 'groups' ? '700' : '400',
              color: activeStage === 'groups' ? 'var(--text-primary)' : 'var(--text-muted)',
              borderBottom: activeStage === 'groups' ? '2px solid var(--primary)' : '2px solid transparent',
              background: 'none', border: 'none',
              borderBottom: activeStage === 'groups' ? '2px solid var(--primary)' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
            }}
          >
            Group Tables
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>Predicted</span>
          </button>

          {ALL_STAGES.map(stage => {
            const picks = stage.matches.filter(m => knockoutPicks[m.match_number]?.winner_id).length
            const complete = picks === stage.matches.length
            return (
              <button
                key={stage.key}
                onClick={() => setActiveStage(stage.key)}
                style={{
                  padding: '12px 14px', fontSize: '12px', whiteSpace: 'nowrap',
                  fontWeight: activeStage === stage.key ? '700' : '400',
                  color: activeStage === stage.key ? 'var(--text-primary)' : 'var(--text-muted)',
                  borderBottom: activeStage === stage.key ? '2px solid var(--primary)' : '2px solid transparent',
                  background: 'none', border: 'none',
                  borderBottom: activeStage === stage.key ? '2px solid var(--primary)' : '2px solid transparent',
                  cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                }}
              >
                {stage.label}
                <span style={{ fontSize: '10px', color: complete ? 'var(--accent-green)' : 'var(--text-muted)', fontWeight: '600' }}>
                  {complete ? '✓' : `${picks}/${stage.matches.length}`}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Points info bar */}
      <div style={{
        background: 'var(--accent-blue-light)', padding: '10px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: '13px',
      }}>
        <span style={{ color: 'var(--accent-blue)', fontWeight: '600' }}>
          🏅 Correct {currentStage?.label} pick = <strong>{currentStage?.points}pts</strong>
          {activeStage !== 'r32' ? '' : ' · +3pts ET · +5pts Pens'}
        </span>
        <span style={{ fontSize: '12px', fontWeight: '700', color: stagePicks === stageMatches.length ? 'var(--accent-green)' : 'var(--text-muted)' }}>
          {stagePicks === stageMatches.length ? '✓ Complete' : `${stagePicks}/${stageMatches.length}`}
        </span>
      </div>

      {/* Group Tables */}
      {showGroupTables && (
        <div className="container" style={{ padding: '16px' }}>
          <div style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
            Based on your predictions — predict more group games to see updated standings
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {Object.entries(standings).sort(([a],[b]) => a.localeCompare(b)).map(([group, teams]) => (
              <div key={group} className="card" style={{ padding: '12px' }}>
                <div style={{ fontWeight: '800', fontSize: '14px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    background: 'var(--primary)', color: 'white',
                    width: '22px', height: '22px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: '800', flexShrink: 0,
                  }}>{group}</span>
                  Group {group}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {teams.map((entry, i) => (
                    <div key={entry.id} style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '6px 8px', borderRadius: 'var(--radius-sm)',
                      background: i < 2 ? 'var(--accent-green-light)' : i === 2 ? 'var(--accent-gold-light)' : 'var(--bg-secondary)',
                      border: i < 2 ? '1px solid rgba(0,122,51,0.2)' : '1px solid transparent',
                    }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', width: '14px' }}>{i + 1}</span>
                      <span style={{ fontSize: '18px' }}>{entry.team?.flag_emoji}</span>
                      <span style={{ fontSize: '12px', fontWeight: '600', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.team?.short_code || entry.team?.name}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: '800', fontFamily: 'var(--font-mono)', minWidth: '20px', textAlign: 'right' }}>
                        {entry.pts}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', minWidth: '28px', textAlign: 'right' }}>
                        {entry.gd > 0 ? '+' : ''}{entry.gd}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid var(--border-light)', fontSize: '10px', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-green)', display: 'inline-block' }} />
                    Advances
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-gold)', display: 'inline-block' }} />
                    Possible 3rd
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Matches */}
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
