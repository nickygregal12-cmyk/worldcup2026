import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore, useAppStore } from '../store/index.js'
import { SkeletonCard, ErrorState } from '../components/PageState.jsx'
import {
  ALL_STAGES,
  calcPredictedStandings, resolveSlot, getBest3rdTeams, findAffectedPicks, groupFullyPredicted,
  getMD1LockTime, MD1_STANDINGS_LOCK_FALLBACK,
} from '../lib/bracketUtils.js'

const KO_OPEN_DATE = new Date('2026-06-27T22:00:00Z')

const VENUE_FLAGS = {
  'New York': '🇺🇸', 'New Jersey': '🇺🇸', 'New York/NJ': '🇺🇸', 'Los Angeles': '🇺🇸',
  'Dallas': '🇺🇸', 'San Francisco': '🇺🇸', 'Seattle': '🇺🇸',
  'Miami': '🇺🇸', 'Atlanta': '🇺🇸', 'Boston': '🇺🇸', 'Houston': '🇺🇸',
  'Philadelphia': '🇺🇸', 'Kansas City': '🇺🇸',
  'Toronto': '🇨🇦', 'Vancouver': '🇨🇦',
  'Mexico City': '🇲🇽', 'Guadalajara': '🇲🇽', 'Monterrey': '🇲🇽',
}

// Lock time is now end of MD1 (not MD2) — users cannot exploit real MD2 results
// Derived dynamically from fixture data; fallback used if fixtures unavailable
const MATCHDAY_TWO_LOCK_FALLBACK = MD1_STANDINGS_LOCK_FALLBACK
const MATCHDAY_TWO_FULL_TIME_BUFFER_MS = 0 // buffer already baked into getMD1LockTime

function getMatchdayTwoFullTime(groupMatches = []) {
  return getMD1LockTime(groupMatches)
}
  const matchdayTwoKickoffs = []
  const byGroup = {}


function formatLockDate(date) {
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) +
    ' · ' + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function slotLabel(slot) {
  const posMatch = slot.match(/^([12])([A-L])$/)
  if (posMatch) {
    const pos = posMatch[1] === '1' ? 'Winner' : 'Runner-up'
    return `${pos} — Group ${posMatch[2]}`
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
  const { appSettings } = useAppStore()
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
  const [m73Ready, setM73Ready] = useState(false)
  const smartStageAppliedRef = useRef(false)

  const isPreTournament = new Date() < new Date('2026-06-11T19:00:00Z')
  const groupStageDone = new Date() >= new Date('2026-06-27T22:00:00Z')
  const phaseOverride = appSettings?.game_phase_override || ''
  const koLive = phaseOverride === 'ko_predictor' || phaseOverride === 'post_tournament'
    ? true : phaseOverride && phaseOverride !== 'ko_predictor' ? false
    : m73Ready || new Date() >= KO_OPEN_DATE
  const mainBracketLockTime = useMemo(() => getMatchdayTwoFullTime(groupMatches), [groupMatches])
  const mainBracketLocked = new Date() >= mainBracketLockTime

  useEffect(() => { loadData() }, [user])

  // Recalculate affected matches when standings change
  useEffect(() => {
    if (!standings || Object.keys(standings).length === 0) return
    if (Object.keys(knockoutPicks).length === 0) return
    const newAffected = []
    for (const [mn, pick] of Object.entries(knockoutPicks)) {
      if (!pick?.winner_id) continue
      const matchNum = parseInt(mn)
      const matchDef = ALL_STAGES.flatMap(s => s.matches).find(m => m.match_number === matchNum)
      if (!matchDef) continue
      // Only check R32 matches (slots starting with 1/2/3 not W)
      // R16+ are cascade dependent so don't flag them
      const isR32 = !matchDef.home_slot.startsWith('W') && !matchDef.away_slot.startsWith('W')
      if (!isR32) continue
      const { home, away } = getMatchTeams(matchDef)
      // Only flag if BOTH teams are resolved but neither matches the saved pick
      if (home && away && home.id !== pick.winner_id && away.id !== pick.winner_id) {
        newAffected.push(matchNum)
      }
    }
    setAffectedMatches(newAffected)
  }, [standings])

  const loadData = async () => {
    try {
      setLoading(true)

      // Check if M73 has both teams — signals KO Predictor is open
      const { data: m73 } = await supabase
        .from('matches')
        .select('home_team_id, away_team_id')
        .eq('match_number', 73)
        .maybeSingle()
      if (m73?.home_team_id && m73?.away_team_id) setM73Ready(true)

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
    // Use stored team object if available (instant propagation)
    if (pick.winner_team) return pick.winner_team
    // Search in group matches
    for (const m of groupMatches) {
      if (m.home_team?.id === pick.winner_id) return m.home_team
      if (m.away_team?.id === pick.winner_id) return m.away_team
    }
    // Search in other pick's stored teams
    for (const [, p] of Object.entries(knockoutPicks)) {
      if (p?.home_team?.id === pick.winner_id) return p.home_team
      if (p?.away_team?.id === pick.winner_id) return p.away_team
    }
    if (pick.winner_id) return { id: pick.winner_id, name: '?', flag_emoji: '🏳️', short_code: '???' }
    return null
  }, [knockoutPicks, groupMatches])

  const getTeamById = useCallback((teamId) => {
    if (!teamId) return null
    for (const m of groupMatches) {
      if (m.home_team?.id === teamId) return m.home_team
      if (m.away_team?.id === teamId) return m.away_team
    }
    for (const [, pick] of Object.entries(knockoutPicks)) {
      if (pick?.winner_team?.id === teamId) return pick.winner_team
      if (pick?.home_team?.id === teamId) return pick.home_team
      if (pick?.away_team?.id === teamId) return pick.away_team
    }
    return { id: teamId, name: '?', flag_emoji: '🏳️', short_code: '???' }
  }, [groupMatches, knockoutPicks])

  const teamGroupCompleted = useCallback((teamId) => {
    if (!teamId) return false
    const completed = groupMatches.filter(m =>
      (m.home_team?.id === teamId || m.away_team?.id === teamId) && m.status === 'completed'
    ).length
    return completed >= 3
  }, [groupMatches])

  const isMainBracketPickFrozen = useCallback((matchDef) => {
    if (!matchDef) return false
    if (new Date() >= mainBracketLockTime) return true
    if (new Date() >= new Date(matchDef.kickoff)) return true

    const pick = knockoutPicks[matchDef.match_number]
    if (!pick?.winner_id) return false

    // Safety fallback: if a saved path already involves a team whose real group is complete,
    // freeze that pick even if the global Matchday 2 lock date was misconfigured.
    return [pick.home_id, pick.away_id, pick.winner_id].filter(Boolean).some(teamGroupCompleted)
  }, [knockoutPicks, mainBracketLockTime, teamGroupCompleted])

  const getMatchTeams = useCallback((matchDef) => {
    const savedPick = knockoutPicks[matchDef.match_number]
    const useSavedSnapshot = savedPick && isMainBracketPickFrozen(matchDef) && (savedPick.home_id || savedPick.away_id)

    if (useSavedSnapshot) {
      return {
        home: savedPick.home_id ? getTeamById(savedPick.home_id) : null,
        away: savedPick.away_id ? getTeamById(savedPick.away_id) : null,
      }
    }

    // After the Matchday 2 lock, do not keep resolving unsaved bracket paths from edited group predictions.
    // Saved picks display their stored snapshot above; unsaved matches stay as placeholders.
    if (new Date() >= mainBracketLockTime && !savedPick) {
      return { home: null, away: null }
    }

    const resolve = (slot) => {
      if (slot.startsWith('W')) return resolveKnockoutWinner(slot)
      if (slot.startsWith('L')) return null
      return resolveTeam(slot)
    }
    return { home: resolve(matchDef.home_slot), away: resolve(matchDef.away_slot) }
  }, [resolveTeam, resolveKnockoutWinner, knockoutPicks, isMainBracketPickFrozen, getTeamById, mainBracketLockTime])

  const getBracketLockReason = useCallback((matchDef) => {
    if (new Date() >= mainBracketLockTime) return 'Main bracket locked after Matchday 1. Saved teams and winners are frozen.'
    if (new Date() >= new Date(matchDef.kickoff)) return 'This knockout match has locked.'
    const pick = knockoutPicks[matchDef.match_number]
    if (pick?.winner_id && [pick.home_id, pick.away_id, pick.winner_id].filter(Boolean).some(teamGroupCompleted)) {
      return 'This pick is frozen because one of its teams has completed its real group games.'
    }
    return null
  }, [knockoutPicks, teamGroupCompleted, mainBracketLockTime])

  const savePick = async (matchDef, winnerId) => {
    if (isMainBracketPickFrozen(matchDef)) return
    // Guests: update local state only, no DB save
    if (!user) {
      const mn = matchDef.match_number
      const existing = knockoutPicks[mn]
      if (existing?.winner_id === winnerId) {
        setKnockoutPicks(prev => { const n = { ...prev }; delete n[mn]; return n })
      } else {
        setKnockoutPicks(prev => ({ ...prev, [mn]: { winner_id: winnerId, home_id: getMatchTeams(matchDef).home?.id, away_id: getMatchTeams(matchDef).away?.id } }))
      }
      return
    }
    const { home, away } = getMatchTeams(matchDef)
    const mn = matchDef.match_number
    const existing = knockoutPicks[mn]

    // Click same team = clear the pick
    if (existing?.winner_id === winnerId) {
      setKnockoutPicks(prev => { const n = { ...prev }; delete n[mn]; return n })
      setSaved(prev => ({ ...prev, [mn]: false }))
      setSaving(prev => ({ ...prev, [mn]: false }))
      await supabase.from('knockout_picks').delete().eq('user_id', user.id).eq('match_number', mn)
      const totalPicks = Object.keys({ ...knockoutPicks }).length - 1
      await supabase.from('profiles').update({ knockout_picks_count: Math.max(0, totalPicks) }).eq('id', user.id)
      return
    }

    if (existing?.winner_id && existing.winner_id !== winnerId) {
      const affected = findAffectedPicks(existing.winner_id, knockoutPicks, mn)
      if (affected.length > 0) {
        setAffectedMatches(prev => [...new Set([...prev, ...affected])])
        const newPicks = { ...knockoutPicks }
        affected.forEach(num => { delete newPicks[num] })
        setKnockoutPicks(newPicks)
        await supabase.from('knockout_picks').delete().eq('user_id', user.id).in('match_number', affected)
      }
    }

    setAffectedMatches(prev => prev.filter(n => n !== mn))
    const winner = home?.id === winnerId ? home : away
    const newPick = { winner_id: winnerId, home_id: home?.id, away_id: away?.id, winner_team: winner, home_team: home, away_team: away }
    setKnockoutPicks(prev => ({ ...prev, [mn]: newPick }))
    setSaving(prev => ({ ...prev, [mn]: true }))

    const { data: existingDb } = await supabase
      .from('knockout_picks')
      .select('id')
      .eq('user_id', user.id)
      .eq('match_number', mn)
      .maybeSingle()

    let upsertErr
    if (existingDb) {
      const { error } = await supabase
        .from('knockout_picks')
        .update({ winner_team_id: winnerId, team_id: winnerId, home_team_id: home?.id, away_team_id: away?.id })
        .eq('user_id', user.id)
        .eq('match_number', mn)
      upsertErr = error
    } else {
      const { error } = await supabase
        .from('knockout_picks')
        .insert({
          user_id: user.id, match_number: mn,
          stage: matchDef.stage || activeStage || 'r32',
          team_id: winnerId, winner_team_id: winnerId,
          home_team_id: home?.id, away_team_id: away?.id,
        })
      upsertErr = error
    }

    if (upsertErr) {
      console.error('Knockout save error:', upsertErr)
      setSaving(prev => ({ ...prev, [mn]: false }))
      return
    }

    const totalPicks = Object.keys({ ...knockoutPicks, [mn]: { winner_id: winnerId } }).length
    await supabase.from('profiles').update({ knockout_picks_count: totalPicks }).eq('id', user.id)

    setSaving(prev => ({ ...prev, [mn]: false }))
    setSaved(prev => ({ ...prev, [mn]: true }))
    setTimeout(() => setSaved(prev => ({ ...prev, [mn]: false })), 1500)
  }

  const fmt = (time) => {
    const d = new Date(time)
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) +
      ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const getSmartBracketMatch = (stageKey = null) => {
    const now = new Date()
    const stages = stageKey ? ALL_STAGES.filter(s => s.key === stageKey) : ALL_STAGES
    const allMatches = stages.flatMap(s => s.matches.map(m => ({ ...m, stageKey: s.key })))
    const ordered = [...allMatches].sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff))
    return ordered.find(m => new Date() < new Date(m.kickoff) && !knockoutPicks[m.match_number]?.winner_id)
      || ordered.find(m => !knockoutPicks[m.match_number]?.winner_id)
      || ordered.find(m => new Date(m.kickoff) >= now)
      || [...ordered].reverse().find(Boolean)
      || null
  }

  const scrollToBracketMatch = (matchDef, delay = 180) => {
    if (!matchDef) return
    window.setTimeout(() => {
      const el = document.getElementById(`bracket-match-${matchDef.match_number}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, delay)
  }

  const goToSmartBracketStage = (stageKey = null) => {
    const matchDef = getSmartBracketMatch(stageKey)
    if (!matchDef) return
    setActiveStage(matchDef.stageKey || stageKey || activeStage)
    scrollToBracketMatch(matchDef)
  }

  useEffect(() => {
    if (loading || smartStageAppliedRef.current) return
    if (!ALL_STAGES?.length) return
    smartStageAppliedRef.current = true
    goToSmartBracketStage()
  }, [loading, knockoutPicks])

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

  const best3rd = getBest3rdTeams(standings) || []
  const currentStage = ALL_STAGES.find(s => s.key === activeStage)
  const stageMatches = currentStage?.matches || []
  const stagePicks = stageMatches.filter(m => knockoutPicks[m.match_number]?.winner_id).length
  const totalPicks = ALL_STAGES.reduce((acc, s) => acc + s.matches.filter(m => knockoutPicks[m.match_number]?.winner_id).length, 0)
  const totalMatches = ALL_STAGES.reduce((acc, s) => acc + s.matches.length, 0)
  const pct = Math.round((totalPicks / totalMatches) * 100)

  const renderMatch = (matchDef) => {
    const { home, away } = getMatchTeams(matchDef)
    const mn = matchDef.match_number
    const pick = knockoutPicks[mn]
    const isAffected = affectedMatches.includes(mn)
    const locked = isMainBracketPickFrozen(matchDef)
    const lockedReason = getBracketLockReason(matchDef)
    const canPick = !locked  // guests can pick locally too
    const teamsKnown = !!(home || away) // show as soon as either team is known
    const bothTeamsKnown = !!(home && away) // need both to enable picking
    const isPicked = !!pick?.winner_id

    const isFinalMatch = matchDef.match_number === 104

    const accentColor = isAffected ? 'var(--accent-gold)'
      : isFinalMatch ? 'var(--accent-gold)'
      : isPicked ? 'var(--accent-green)'
      : 'transparent'

    const cardBorder = isAffected ? '2px solid var(--accent-gold)'
      : isFinalMatch && isPicked ? '2px solid var(--accent-gold)'
      : isFinalMatch ? '1.5px solid rgba(184,134,11,0.4)'
      : isPicked ? '1.5px solid var(--accent-green)'
      : '1.5px solid var(--border-light)'

    const cardBg = isAffected ? 'var(--accent-gold-light)'
      : isFinalMatch ? 'var(--accent-gold-light)'
      : 'var(--bg-card)'

    return (
      <div key={`${mn}-${isPicked ? pick?.winner_id : 'empty'}`} id={`bracket-match-${mn}`} style={{
        background: cardBg,
        border: cardBorder,
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
      }}>
        {/* Coloured top accent strip */}
        <div style={{ height: '4px', background: accentColor, flexShrink: 0 }} />

        <div style={{ padding: '14px 16px 16px' }}>
          {/* Final special header */}
          {matchDef.match_number === 104 && (
            <div style={{ textAlign: 'center', marginBottom: '14px', padding: '12px', background: 'linear-gradient(135deg, rgba(184,134,11,0.1), rgba(184,134,11,0.05))', borderRadius: 'var(--radius-md)', border: '1px solid rgba(184,134,11,0.2)' }}>
              <div style={{ fontSize: '28px', marginBottom: '4px' }}>🏆</div>
              <div style={{ fontWeight: '900', fontSize: '16px', color: 'var(--accent-gold)', letterSpacing: '-0.02em' }}>The World Cup Final</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Pick your World Cup winner · Worth <strong style={{ color: 'var(--accent-gold)' }}>20 pts</strong></div>
            </div>
          )}
          {/* Affected warning */}
          {isAffected && !locked && (
            <div style={{ marginBottom: '12px', padding: '8px 12px', background: 'rgba(184,134,11,0.15)', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: '700', color: 'var(--accent-gold)', border: '1px solid rgba(184,134,11,0.25)' }}>
              ⚠️ Your earlier pick changed — please re-pick the winner for this match
            </div>
          )}
          {locked && lockedReason && (
            <div style={{ marginBottom: '12px', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', border: '1px solid var(--border-light)' }}>
              🔒 {lockedReason}
            </div>
          )}

          {/* Match meta */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1.4 }}>
              M{mn} · {fmt(matchDef.kickoff)}
              {matchDef.venue && <span> · {VENUE_FLAGS[matchDef.venue] || ''} {matchDef.venue}</span>}
            </div>
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              {locked && <span className="badge badge-red">🔒 Locked</span>}
              {isPicked && !isAffected && <span className="badge badge-green">✓ Picked</span>}
              {saved[mn] && <span className="badge badge-green">Saved!</span>}
              {saving[mn] && <div className="spinner" style={{ width: '14px', height: '14px' }} />}
            </div>
          </div>

          {/* Teams or placeholder slots */}
          {teamsKnown ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {[
                { team: home, slot: matchDef.home_slot },
                { team: away, slot: matchDef.away_slot }
              ].map(({ team, slot }, idx) => {
                const isPickedTeam = pick?.winner_id === team?.id
                const isFinal = matchDef.match_number === 104
                const canPickThisTeam = canPick && bothTeamsKnown && !!team
                return (
                  <div key={team?.id || slot}>
                    {team ? (
                      <button
                        onClick={() => canPickThisTeam && savePick(matchDef, team.id)}
                        disabled={!canPickThisTeam}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '14px',
                          padding: '14px 16px',
                          borderRadius: 'var(--radius-md)',
                          width: '100%', textAlign: 'left',
                          transition: 'all 0.15s',
                          border: isPickedTeam
                            ? `2px solid ${isFinal ? 'var(--accent-gold)' : 'var(--accent-green)'}`
                            : '1.5px solid var(--border-light)',
                          background: isPickedTeam
                            ? (isFinal ? 'var(--accent-gold-light)' : 'var(--accent-green-light)')
                            : 'var(--bg-secondary)',
                          cursor: canPickThisTeam ? 'pointer' : 'default',
                          boxShadow: isPickedTeam ? `0 0 0 3px ${isFinal ? 'rgba(184,134,11,0.12)' : 'rgba(0,122,51,0.1)'}` : 'none',
                        }}>
                        <span style={{ fontSize: '40px', lineHeight: 1, flexShrink: 0 }}>{team.flag_emoji}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '800', fontSize: '16px', letterSpacing: '-0.01em',
                            color: isPickedTeam ? (isFinal ? 'var(--accent-gold)' : 'var(--accent-green)') : 'var(--text-primary)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {team.name}
                          </div>
                          <div style={{ fontSize: '11px', color: isPickedTeam ? (isFinal ? 'var(--accent-gold)' : 'var(--accent-green)') : 'var(--text-muted)', fontWeight: '600', marginTop: '2px', opacity: 0.8 }}>
                            {team.short_code}
                          </div>
                        </div>
                        {isPickedTeam && (
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: isFinal ? 'var(--accent-gold)' : 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ color: 'white', fontSize: '14px', fontWeight: '900' }}>✓</span>
                          </div>
                        )}
                      </button>
                    ) : (
                      // Placeholder for unknown team
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '14px',
                        padding: '14px 16px', borderRadius: 'var(--radius-md)',
                        border: '1.5px dashed var(--border-medium)', background: 'var(--bg-secondary)',
                      }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>🏳️</div>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-muted)' }}>{slotLabel(slot)}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', opacity: 0.7, marginTop: '2px' }}>
                            {mainBracketLocked ? 'Not saved before Matchday 1 lock' : slot.startsWith('W') ? `Waiting for M${slot.replace('W', '')} winner` : 'Waiting for group results'}
                          </div>
                        </div>
                      </div>
                    )}
                    {/* VS divider between the two teams */}
                    {idx === 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '6px 0' }}>
                        <div style={{ flex: 1, height: '1px', background: 'var(--border-light)' }} />
                        <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.08em', padding: '2px 8px', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-full)', background: 'var(--bg-secondary)' }}>VS</span>
                        <div style={{ flex: 1, height: '1px', background: 'var(--border-light)' }} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[matchDef.home_slot, matchDef.away_slot].map(slot => (
                <div key={slot} style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px dashed var(--border-medium)',
                  background: 'var(--bg-secondary)',
                }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                    🏳️
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-muted)' }}>{slotLabel(slot)}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', opacity: 0.7, marginTop: '2px' }}>
                      {mainBracketLocked
                        ? 'Not saved before Matchday 1 lock'
                        : slot.startsWith('W')
                        ? (groupStageDone ? 'To be confirmed' : `Waiting for M${slot.replace('W', '')} winner`)
                        : (groupStageDone ? 'To be confirmed' : 'Predict all 3 group games to unlock')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Guest — no per-card CTA, handled by sticky banner */}
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>

      {/* ── KO Predictor overlap banner — shown when KO Pred open but groups still running ── */}
      {koLive && !groupStageDone && (
        <div style={{ background: 'linear-gradient(135deg, #e65100, #ff9800)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <div style={{ fontWeight: '800', fontSize: '14px', color: 'white' }}>🔥 KO Predictor is now open!</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', marginTop: '2px' }}>Fresh start — predict all 32 knockout matches</div>
          </div>
          <Link to="/ko-predictor" style={{
            background: 'white', color: '#e65100',
            padding: '8px 16px', borderRadius: 'var(--radius-full)',
            fontWeight: '800', fontSize: '13px', textDecoration: 'none', flexShrink: 0,
          }}>Play →</Link>
        </div>
      )}

      {/* ── Hero ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(0,20,60,0.85) 0%, rgba(0,48,135,0.88) 60%, rgba(0,20,60,0.85) 100%), url(/hero-bg.jpg) center/cover no-repeat',
        padding: '28px 20px 24px', color: 'white', textAlign: 'center',
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>
            FIFA World Cup 2026
          </div>
          <h1 style={{ fontSize: 'clamp(22px, 5vw, 34px)', fontWeight: '900', letterSpacing: '-0.03em', marginBottom: '6px', lineHeight: 1.1 }}>
            🏆 Knockout Bracket
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '20px' }}>
            {mainBracketLocked ? 'Locked after Matchday 1 from your saved bracket' : `Based on your predicted group results · locks ${formatLockDate(mainBracketLockTime)}`}
          </p>

          {/* Overall progress bar */}
          {user && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ height: '5px', background: 'rgba(255,255,255,0.15)', borderRadius: 'var(--radius-full)', overflow: 'hidden', margin: '0 4px 6px' }}>
                <div style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: totalPicks === totalMatches ? 'var(--accent-green)' : '#4a90d9',
                  borderRadius: 'var(--radius-full)',
                  transition: 'width 0.5s ease',
                }} />
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>
                {totalPicks === totalMatches
                  ? '✓ All knockout picks complete'
                  : `${totalPicks}/${totalMatches} picks made`}
              </div>
            </div>
          )}

          {/* Affected warning */}
          {affectedMatches.length > 0 && (
            <div style={{ marginTop: '12px', background: 'rgba(184,134,11,0.3)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: '12px', color: '#ffd700', fontWeight: '700' }}>
              ⚠️ {affectedMatches.length} knockout pick{affectedMatches.length > 1 ? 's' : ''} need updating after group changes
            </div>
          )}

          {/* Pre-tournament tip — only show if no picks made yet */}
          {isPreTournament && totalPicks === 0 && (
            <div style={{ marginTop: '10px', background: 'rgba(255,255,255,0.08)', borderRadius: 'var(--radius-md)', padding: '8px 14px', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
              💡 Fill your bracket before Matchday 1 ends — saved teams and winners freeze at the lock deadline
            </div>
          )}
        </div>
      </div>

      {/* ── Sticky stage tabs ── */}
      <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)', position: 'sticky', top: 'var(--nav-height)', zIndex: 50, boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {ALL_STAGES.map(stage => {
            const picks = stage.matches.filter(m => knockoutPicks[m.match_number]?.winner_id).length
            const complete = picks === stage.matches.length
            const isActive = activeStage === stage.key
            return (
              <button key={stage.key} onClick={() => { setActiveStage(stage.key); scrollToBracketMatch(getSmartBracketMatch(stage.key)) }} style={{
                padding: '12px 14px', fontSize: '12px', whiteSpace: 'nowrap',
                background: 'none', border: 'none',
                fontWeight: isActive ? '800' : '500',
                color: isActive ? 'var(--scottish-navy)' : 'var(--text-muted)',
                borderBottom: isActive ? '2px solid var(--scottish-navy)' : '2px solid transparent',
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                flexShrink: 0,
              }}>
                {stage.label}
                <span style={{ fontSize: '10px', fontWeight: '700', color: complete ? 'var(--accent-green)' : isActive ? 'var(--scottish-navy)' : 'var(--text-muted)', opacity: complete ? 1 : 0.7 }}>
                  {complete ? '✓ Done' : `${picks}/${stage.matches.length}`}
                </span>
              </button>
            )
          })}
        </div>

        {/* Points + stage progress row */}
        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--scottish-navy-light)' }}>
          <span style={{ fontSize: '12px', color: 'var(--scottish-navy)', fontWeight: '700' }}>
            🏅 {activeStage === 'r32'
              ? `${currentStage?.points}pts for each team you predicted to qualify that reaches this round`
              : `${currentStage?.points}pts for each team you picked to advance that makes it to this round`}
            {activeStage === 'final' && <span style={{ color: 'var(--accent-gold)' }}> + 25pts winner bonus</span>}
          </span>
          <span style={{ fontSize: '12px', fontWeight: '700', color: stagePicks === stageMatches.length ? 'var(--accent-green)' : 'var(--text-muted)' }}>
            {stagePicks === stageMatches.length ? '✓ Stage complete' : `${stagePicks}/${stageMatches.length} picked`}
          </span>
        </div>
      </div>

      {/* ── Match cards ── */}
      <div className="container" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {stageMatches.map(renderMatch)}
        </div>
      </div>

      {/* ── Sticky guest save banner ── */}
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
