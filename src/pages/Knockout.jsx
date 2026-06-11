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
import { predictKnockoutMatch } from '../lib/luckyDip.js'

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
  const bestThirdMatch = slot.match(/^BT3_([A-L]+)$/)
  if (bestThirdMatch) {
    return `Best 3rd place — Group ${bestThirdMatch[1].split('').join('/')}`
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

  // Find groups whose first match kicks off within the next 24 hours
  // Used to show bracket lock warning banners
  const imminentGroupLocks = useMemo(() => {
    const now = new Date()
    const in24hrs = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    // Get first kickoff per group
    const firstByGroup = {}
    groupMatches.forEach(m => {
      const g = m.group?.name
      if (!g) return
      const t = new Date(m.kickoff_time)
      if (!firstByGroup[g] || t < firstByGroup[g].time) {
        firstByGroup[g] = { time: t, match: m }
      }
    })
    // Return groups that kick off within 24hrs and haven't kicked off yet
    return Object.entries(firstByGroup)
      .filter(([, { time }]) => time > now && time <= in24hrs)
      .map(([group, { time, match }]) => ({ group, time, match }))
      .sort((a, b) => a.time - b.time)
  }, [groupMatches])

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

    // Always lock if the match itself has kicked off
    if (new Date() >= new Date(matchDef.kickoff)) return true

    const pick = knockoutPicks[matchDef.match_number]

    // Lock if any team feeding into this match is from a group that has already kicked off
    // This prevents using real results to fill in empty bracket slots
    // Applies whether or not a pick exists
    const slots = [matchDef.home_slot, matchDef.away_slot].filter(Boolean)
    const feedingGroupsKickedOff = slots.some(slot => {
      // Direct group slots: '1A', '2B', '1L' etc — extract the group letter A-L
      const directGroupMatch = slot.match(/^[123]([A-L])$/)
      const bestThirdMatch = slot.match(/^BT3_([A-L]+)$/)
      const groups = directGroupMatch ? [directGroupMatch[1]] : bestThirdMatch ? bestThirdMatch[1].split('') : []
      if (!groups.length) return false
      return groups.some(groupName => groupMatches.some(m =>
        m.group?.name === groupName &&
        new Date(m.kickoff_time) <= new Date()
      ))
    })
    if (feedingGroupsKickedOff && pick?.winner_id) return true
    // Empty slot with feeding group kicked off: still fillable until the full
    // MD1 bracket lock (18 Jun). Users get extra time to fill gaps they missed —
    // this is safe because they haven't seen who actually qualifies yet, and the
    // DB hard-locks all writes at 18 Jun regardless.

    // If no pick exists and feeding groups haven't kicked off — allow pick
    if (!pick?.winner_id) return false

    // Pick exists — freeze it if the bracket lock has passed
    if (new Date() >= mainBracketLockTime) return true

    // If the picked winner's real group has completed, freeze the pick
    // (the slot-based check above covers feeding groups; this catches the winner
    // specifically — e.g. you picked a team whose group is now done)
    return teamGroupCompleted(pick.winner_id)
  }, [knockoutPicks, mainBracketLockTime, teamGroupCompleted, groupMatches])

  const getMatchTeams = useCallback((matchDef) => {
    // Always resolve matchups LIVE from group predictions — never from stored
    // opponent IDs. The stored home_id/away_id were a pick-time snapshot that
    // could go stale when a group prediction (or the bracket structure) changed.
    // Because group predictions themselves lock at MD1, live resolution is
    // already stable after the lock — no snapshot needed, and never stale.
    const savedPick = knockoutPicks[matchDef.match_number]

    // After the full bracket lock, don't resolve UNSAVED paths from edited
    // group predictions (they stay as placeholders). Saved picks still resolve
    // live — which, with predictions frozen, is deterministic.
    if (new Date() >= mainBracketLockTime && !savedPick?.winner_id) {
      return { home: null, away: null }
    }

    const resolve = (slot) => {
      if (slot.startsWith('W')) return resolveKnockoutWinner(slot)
      if (slot.startsWith('L')) return null
      return resolveTeam(slot)
    }
    return { home: resolve(matchDef.home_slot), away: resolve(matchDef.away_slot) }
  }, [resolveTeam, resolveKnockoutWinner, knockoutPicks, mainBracketLockTime])

  const getBracketLockReason = useCallback((matchDef) => {
    if (new Date() >= mainBracketLockTime) return 'Bracket fully locked. Saved teams and winners are frozen.'
    if (new Date() >= new Date(matchDef.kickoff)) return 'This knockout match has locked.'
    const pick = knockoutPicks[matchDef.match_number]
    if (pick?.winner_id && [pick.home_id, pick.away_id, pick.winner_id].filter(Boolean).some(teamGroupCompleted)) {
      return 'This pick is frozen because one of its teams has completed its real group games.'
    }
    return null
  }, [knockoutPicks, teamGroupCompleted, mainBracketLockTime])

  const [luckyDipping, setLuckyDipping] = useState(false)
  const championCardRef = useRef(null)
  const [sharingChampion, setSharingChampion] = useState(false)

  // A pick counts toward completion only if its stored winner is still one of
  // the two teams the bracket CURRENTLY resolves for that match. Catches picks
  // that went stale after a group-prediction change or bracket-structure fix.
  const isPickValid = useCallback((matchDef) => {
    const pick = knockoutPicks[matchDef.match_number]
    if (!pick?.winner_id) return false
    const { home, away } = getMatchTeams(matchDef)
    if (!home && !away) return false
    return pick.winner_id === home?.id || pick.winner_id === away?.id
  }, [knockoutPicks, getMatchTeams])

  // Count empty locked R32 slots so we can show the banner
  const emptyLockedSlots = useMemo(() => {
    if (!mainBracketLocked) return 0
    return ALL_STAGES[0]?.matches?.filter(matchDef => {
      const pick = knockoutPicks[matchDef.match_number]
      if (pick?.winner_id) return false // already picked
      // Check if feeding groups have kicked off
      const slots = [matchDef.home_slot, matchDef.away_slot].filter(Boolean)
      return slots.some(slot => {
        const directGroupMatch = slot.match(/^[123]([A-L])$/)
        const bestThirdMatch = slot.match(/^BT3_([A-L]+)$/)
        const groups = directGroupMatch ? [directGroupMatch[1]] : bestThirdMatch ? bestThirdMatch[1].split('') : []
        if (!groups.length) return false
        return groups.some(groupName => groupMatches.some(m => m.group?.name === groupName && new Date(m.kickoff_time) <= new Date()))
      })
    }).length || 0
  }, [mainBracketLocked, knockoutPicks, groupMatches])

  const luckyDipBracket = async () => {
    if (!user || luckyDipping) return
    setLuckyDipping(true)
    // Fill only empty R32 slots where teams are resolved
    const allMatches = ALL_STAGES.flatMap(s => s.matches || [])
    for (const matchDef of allMatches) {
      const pick = knockoutPicks[matchDef.match_number]
      if (pick?.winner_id) continue // already picked
      const { home, away } = getMatchTeams(matchDef)
      if (!home?.id || !away?.id) continue // teams not resolved yet
      const winnerId = predictKnockoutMatch(home, away)
      if (winnerId) await savePick(matchDef, winnerId)
    }
    setLuckyDipping(false)
  }

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
        .update({ winner_team_id: winnerId, team_id: winnerId, home_team_id: home?.id, away_team_id: away?.id, bracket_version: 'fifa_v2' })
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
          bracket_version: 'fifa_v2',
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
  // A pick counts toward completion only if its stored winner is still one of
  // the two teams the bracket CURRENTLY resolves for that match. This catches
  // picks that went stale after a group-prediction change or a bracket-structure
  // correction — the row exists but no longer reflects a valid matchup.
  const validPicks = ALL_STAGES.reduce((acc, s) => acc + s.matches.filter(m => isPickValid(m)).length, 0)
  const stalePicks = ALL_STAGES.reduce((acc, s) => acc + s.matches.filter(m => {
    const p = knockoutPicks[m.match_number]
    return p?.winner_id && !isPickValid(m)
  }).length, 0)
  const totalPicks = validPicks
  const totalMatches = ALL_STAGES.reduce((acc, s) => acc + s.matches.length, 0)
  const pct = Math.round((totalPicks / totalMatches) * 100)

  // Pre-full-lock gap analysis: empty picks split into still-fillable vs
  // already frozen empty (their feeding group kicked off). Drives the
  // "sort your bracket" warning banner.
  const preLockGaps = (() => {
    if (mainBracketLocked) return { fillable: 0, lost: 0, firstStage: null }
    let fillable = 0, lost = 0, firstStage = null
    ALL_STAGES.forEach(stage => {
      (stage.matches || []).forEach(def => {
        // A valid pick is done; a missing OR stale pick needs attention.
        if (isPickValid(def)) return
        if (isMainBracketPickFrozen(def)) {
          // Frozen with no valid pick — only count as "lost" if genuinely empty;
          // a stale pick on a frozen slot can't be changed anyway.
          if (!knockoutPicks[def.match_number]?.winner_id) lost++
        } else {
          fillable++; if (!firstStage) firstStage = stage.key
        }
      })
    })
    return { fillable, lost, firstStage }
  })()

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
    // Stale: a pick exists but its winner is no longer in the resolved matchup
    const isStale = isPicked && (home || away) && pick.winner_id !== home?.id && pick.winner_id !== away?.id

    const isFinalMatch = matchDef.match_number === 104

    const accentColor = (isAffected || isStale) ? 'var(--accent-gold)'
      : isFinalMatch ? 'var(--accent-gold)'
      : isPicked ? 'var(--accent-green)'
      : 'transparent'

    const cardBorder = (isAffected || isStale) ? '2px solid var(--accent-gold)'
      : isFinalMatch && isPicked ? '2px solid var(--accent-gold)'
      : isFinalMatch ? '1.5px solid rgba(184,134,11,0.4)'
      : isPicked ? '1.5px solid var(--accent-green)'
      : '1.5px solid var(--border-light)'

    const cardBg = (isAffected || isStale) ? 'var(--accent-gold-light)'
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
          {/* Affected / stale warning */}
          {(isAffected || isStale) && !locked && (
            <div style={{ marginBottom: '12px', padding: '8px 12px', background: 'rgba(184,134,11,0.15)', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: '700', color: 'var(--accent-gold)', border: '1px solid rgba(184,134,11,0.25)' }}>
              ⚠️ The teams in this match changed — please re-pick the winner
            </div>
          )}
          {isStale && locked && (
            <div style={{ marginBottom: '12px', padding: '8px 12px', background: 'rgba(184,134,11,0.1)', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', border: '1px solid rgba(184,134,11,0.2)' }}>
              ⚠️ Your saved winner is no longer in this matchup, but it's locked and can't be changed
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
              {isPicked && !isAffected && !isStale && <span className="badge badge-green">✓ Picked</span>}
              {isStale && !locked && <span className="badge" style={{ background: 'var(--accent-gold)', color: 'white' }}>⚠️ Re-pick</span>}
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
                          display: 'flex', alignItems: 'center', gap: '12px',
                          padding: '10px 14px',
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
                        <span style={{ fontSize: '30px', lineHeight: 1, flexShrink: 0 }}>{team.flag_emoji}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '800', fontSize: '15px', letterSpacing: '-0.01em',
                            color: isPickedTeam ? (isFinal ? 'var(--accent-gold)' : 'var(--accent-green)') : 'var(--text-primary)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {team.name}
                          </div>
                          <div style={{ fontSize: '11px', color: isPickedTeam ? (isFinal ? 'var(--accent-gold)' : 'var(--accent-green)') : 'var(--text-muted)', fontWeight: '600', marginTop: '2px', opacity: 0.8 }}>
                            {team.short_code}
                          </div>
                        </div>
                        {isPickedTeam && (
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: isFinal ? 'var(--accent-gold)' : 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ color: 'white', fontSize: '14px', fontWeight: '900' }}>✓</span>
                          </div>
                        )}
                      </button>
                    ) : (
                      // Placeholder for unknown team
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '10px 14px', borderRadius: 'var(--radius-md)',
                        border: '1.5px dashed var(--border-medium)', background: 'var(--bg-secondary)',
                      }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>🏳️</div>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-muted)' }}>{slotLabel(slot)}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', opacity: 0.7, marginTop: '2px' }}>
                            {slot.startsWith('W') ? `Waiting for M${slot.replace('W', '')} winner` : 'Waiting for group results'}
                          </div>
                        </div>
                      </div>
                    )}
                    {/* VS divider between the two teams */}
                    {idx === 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
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
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px dashed var(--border-medium)',
                  background: 'var(--bg-secondary)',
                }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
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
            {mainBracketLocked ? 'Locked — frozen from your saved bracket' : `Based on your predicted group results · locks progressively as groups kick off`}
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

          {/* Imminent group lock warnings */}
          {imminentGroupLocks.map(({ group, time, match }) => {
            const now = new Date()
            const hoursLeft = Math.floor((time - now) / (1000 * 60 * 60))
            const minsLeft = Math.floor((time - now) / (1000 * 60)) % 60
            const timeStr = time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' })
            const urgent = hoursLeft < 2
            // Check if user has any empty slots from this group
            const emptyFromGroup = (ALL_STAGES[0]?.matches || []).filter(matchDef => {
              const pick = knockoutPicks[matchDef.match_number]
              if (pick?.winner_id) return false
              return [matchDef.home_slot, matchDef.away_slot].some(slot => {
                const gm = slot?.match(/^[123]([A-L])$/)
                return gm && gm[1] === group
              })
            }).length
            return (
              <div key={group} style={{
                marginTop: '12px', borderRadius: 'var(--radius-md)', padding: '12px 14px',
                background: urgent ? 'rgba(198,40,40,0.2)' : 'rgba(184,134,11,0.15)',
                border: `1px solid ${urgent ? 'rgba(198,40,40,0.4)' : 'rgba(184,134,11,0.3)'}`,
              }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: urgent ? '#ef5350' : '#b8860b', marginBottom: '4px' }}>
                  {urgent ? '🚨' : '⏰'} Group {group} bracket slots lock in {hoursLeft > 0 ? `${hoursLeft}h ${minsLeft}m` : `${minsLeft} mins`}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', marginBottom: emptyFromGroup > 0 ? '10px' : 0, lineHeight: 1.4 }}>
                  {match.home_team?.flag_emoji}{match.home_team?.short_code} vs {match.away_team?.short_code}{match.away_team?.flag_emoji} kicks off at {timeStr} BST
                  {emptyFromGroup > 0
                    ? ` — you have ${emptyFromGroup} unpicked slot${emptyFromGroup > 1 ? 's' : ''} from this group!`
                    : ' — your Group ' + group + ' picks are saved ✓'}
                </div>
                {emptyFromGroup > 0 && (
                  <Link to="/knockout" style={{ display: 'inline-block', background: urgent ? '#ef5350' : 'var(--accent-gold)', color: 'white', borderRadius: 'var(--radius-full)', padding: '6px 14px', fontSize: '12px', fontWeight: '700', textDecoration: 'none' }}>
                    Complete bracket →
                  </Link>
                )}
              </div>
            )
          })}

          {/* Affected warning */}
          {affectedMatches.length > 0 && (
            <div style={{ marginTop: '12px', background: 'rgba(184,134,11,0.3)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: '12px', color: '#ffd700', fontWeight: '700' }}>
              ⚠️ {affectedMatches.length} knockout pick{affectedMatches.length > 1 ? 's' : ''} need updating after group changes
            </div>
          )}

          {/* Pre-lock gap warning — bracket incomplete, slots still fillable */}
          {user && !mainBracketLocked && preLockGaps.fillable > 0 && !(isPreTournament && totalPicks === 0) && (
            <div style={{ marginTop: '12px', background: 'rgba(230,81,0,0.18)', borderRadius: 'var(--radius-md)', padding: '12px 14px', border: '1px solid rgba(255,152,0,0.5)' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#ffb74d', marginBottom: '4px' }}>
                ⚠️ {preLockGaps.fillable} bracket pick{preLockGaps.fillable > 1 ? 's' : ''} missing
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', marginBottom: '10px', lineHeight: 1.4 }}>
                Empty slots lock for good as each group's games kick off — fill them while you still can.
                {preLockGaps.lost > 0 && ` (${preLockGaps.lost} slot${preLockGaps.lost > 1 ? 's have' : ' has'} already locked empty.)`}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {preLockGaps.firstStage && preLockGaps.firstStage !== activeStage && (
                  <button onClick={() => setActiveStage(preLockGaps.firstStage)}
                    style={{ background: 'var(--accent-orange)', color: 'white', border: 'none', borderRadius: 'var(--radius-full)', padding: '8px 16px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                    ➡️ Go to first gap
                  </button>
                )}
                <button onClick={luckyDipBracket} disabled={luckyDipping}
                  style={{ background: 'rgba(255,255,255,0.12)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 'var(--radius-full)', padding: '8px 16px', fontSize: '13px', fontWeight: '700', cursor: luckyDipping ? 'wait' : 'pointer', opacity: luckyDipping ? 0.7 : 1 }}>
                  {luckyDipping ? '🎲 Filling...' : '🎲 Lucky Dip the rest'}
                </button>
              </div>
            </div>
          )}

          {/* Empty locked slots banner */}
          {user && emptyLockedSlots > 0 && (
            <div style={{ marginTop: '12px', background: 'rgba(184,134,11,0.15)', borderRadius: 'var(--radius-md)', padding: '12px 14px', border: '1px solid rgba(184,134,11,0.3)' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#b8860b', marginBottom: '4px' }}>
                🔒 {emptyLockedSlots} bracket slot{emptyLockedSlots > 1 ? 's' : ''} left empty before lock
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '10px', lineHeight: 1.4 }}>
                These locked when their group kicked off. Use Lucky Dip to fill them automatically — no points for these slots but at least your bracket is complete.
              </div>
              <button onClick={luckyDipBracket} disabled={luckyDipping}
                style={{ background: 'var(--accent-gold)', color: 'white', border: 'none', borderRadius: 'var(--radius-full)', padding: '8px 16px', fontSize: '13px', fontWeight: '700', cursor: luckyDipping ? 'wait' : 'pointer', opacity: luckyDipping ? 0.7 : 1 }}>
                {luckyDipping ? '🎲 Filling...' : '🎲 Fill with Lucky Dip'}
              </button>
            </div>
          )}

          {/* Pre-tournament tip — only show if no picks made yet */}
          {isPreTournament && totalPicks === 0 && (
            <div style={{ marginTop: '10px', background: 'rgba(255,255,255,0.08)', borderRadius: 'var(--radius-md)', padding: '8px 14px', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
              💡 Fill your bracket now — it locks progressively as each group kicks off
            </div>
          )}
        </div>
      </div>

      {/* ── Two games explainer ── */}
      {user && !mainBracketLocked && (
        <div style={{ margin: '12px 16px', padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Two separate knockout games
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '16px', flexShrink: 0 }}>🏆</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Knockout Bracket — this page</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>Pick which teams advance each round based on your group predictions. Must complete before groups kick off.</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '16px', flexShrink: 0 }}>🔥</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>KO Predictor — opens ~28 Jun</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>Predict actual scores for all 32 knockout matches. Fresh start — even if your teams go out early, everyone begins at 0pts.</div>
              </div>
              <Link to="/ko-predictor" style={{ fontSize: '12px', fontWeight: '700', color: '#e65100', textDecoration: 'none', flexShrink: 0, marginTop: '2px' }}>Info →</Link>
            </div>
          </div>
        </div>
      )}

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
            {activeStage === 'final' && <span style={{ color: 'var(--accent-gold)' }}> + 25pts for World Cup Winner</span>}
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

      {/* ── Champion Route Card (Final tab only) ── */}
      {activeStage === 'final' && user && (() => {
        // Find the predicted champion (winner of Final M104)
        const finalPick = knockoutPicks[104]
        if (!finalPick?.winner_id) return null

        const champion = getTeamById(finalPick.winner_id)
        if (!champion) return null

        // Find champion's group matches
        const champGroupMatches = groupMatches.filter(m =>
          m.home_team_id === champion.id || m.away_team_id === champion.id
        ).sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time))

        const groupResults = champGroupMatches.map(m => {
          const pred = groupPredictions[m.id]
          const isHome = m.home_team_id === champion.id
          const opponent = isHome ? m.away_team : m.home_team
          const predScore = pred ? (isHome ? `${pred.home}–${pred.away}` : `${pred.away}–${pred.home}`) : '?–?'
          const actualScore = m.home_score != null ? (isHome ? `${m.home_score}–${m.away_score}` : `${m.away_score}–${m.home_score}`) : null
          const correct = actualScore && pred ? (
            isHome
              ? (pred.home === m.home_score && pred.away === m.away_score)
              : (pred.away === m.home_score && pred.home === m.away_score)
          ) : null
          return { opponent, predScore, actualScore, correct, stage: 'Group Stage' }
        })

        // Build the champion's route through all knockout rounds
        const route = ALL_STAGES.map(stage => {
          const matchInStage = stage.matches.find(m => {
            const pick = knockoutPicks[m.match_number]
            if (!pick?.winner_id) return false
            // Resolve live so we find the match by its CURRENT teams, not a
            // possibly-stale stored snapshot.
            const { home, away } = getMatchTeams(m)
            return pick.winner_id === champion.id ||
                   home?.id === champion.id ||
                   away?.id === champion.id
          })
          if (!matchInStage) return null
          const pick = knockoutPicks[matchInStage.match_number]
          const { home, away } = getMatchTeams(matchInStage)
          const opponent = home?.id === champion.id ? away : home
          const won = pick?.winner_id === champion.id
          return { stage: stage.label, opponent, won, matchDef: matchInStage }
        }).filter(Boolean)

        return (
          <div className="container" style={{ padding: '0 16px 16px' }}>
            <div ref={championCardRef} style={{ background: 'linear-gradient(135deg, #001830, #002a5c)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(184,134,11,0.4)', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ padding: '16px 16px 12px', textAlign: 'center', borderBottom: '1px solid rgba(184,134,11,0.15)' }}>
                <div style={{ fontSize: '32px', marginBottom: '4px' }}>{champion.flag_emoji}</div>
                <div style={{ fontWeight: '900', fontSize: '18px', color: '#FFD700' }}>
                  {champion.name}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
                  Your predicted World Cup winner
                </div>
              </div>

              {/* Route */}
              <div style={{ padding: '12px 16px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                  🏆 Predicted route to glory
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

                  {/* Group stage games */}
                  {groupResults.map(({ opponent, predScore, correct }, i) => (
                    <div key={`group-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)' }}>
                      <span style={{ fontSize: '14px', width: '22px', flexShrink: 0 }}>
                        {correct === true ? '✅' : correct === false ? '❌' : '⚽'}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Group Stage</div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'white' }}>
                          {champion.flag_emoji} {champion.short_code} vs {opponent?.flag_emoji} {opponent?.short_code || '?'}
                        </div>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', flexShrink: 0 }}>
                        {predScore}
                      </div>
                    </div>
                  ))}

                  {groupResults.length > 0 && route.length > 0 && (
                    <div style={{ height: '1px', background: 'var(--border-light)', margin: '2px 0' }} />
                  )}

                  {/* Knockout rounds */}
                  {route.map(({ stage, opponent, won }) => (
                    <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)' }}>
                      <span style={{ fontSize: '14px', width: '22px', flexShrink: 0 }}>{won ? '✅' : '❌'}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{stage}</div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'white' }}>
                          {champion.flag_emoji} {champion.short_code} vs {opponent?.flag_emoji} {opponent?.short_code || '?'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Branding footer — always visible in image */}
              <div style={{ padding: '10px 16px 12px', borderTop: '1px solid rgba(255,215,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '16px' }}>🏴󠁧󠁢󠁳󠁣󠁴󠁿</span>
                  <span style={{ fontWeight: '800', fontSize: '13px', color: '#FFD700' }}>WC26 Predictor</span>
                </div>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>wc26predictor1.netlify.app</span>
              </div>

              {/* Share button — hidden during capture */}
              <div style={{ padding: '0 16px 16px', display: sharingChampion ? 'none' : 'block' }}>
                <button
                  onClick={async () => {
                    setSharingChampion(true)
                    try {
                      const html2canvas = (await import('html2canvas')).default
                      const canvas = await html2canvas(championCardRef.current, {
                        scale: 2, backgroundColor: '#001830', useCORS: true, logging: false,
                      })
                      canvas.toBlob(async (blob) => {
                        const file = new File([blob], 'wc26-champion.png', { type: 'image/png' })
                        if (navigator.share && navigator.canShare({ files: [file] })) {
                          await navigator.share({
                            title: 'My WC26 Predicted Champion',
                            text: 'Make your own predictions at wc26predictor1.netlify.app',
                            files: [file],
                          })
                        } else {
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url; a.download = 'wc26-champion.png'; a.click()
                          URL.revokeObjectURL(url)
                        }
                        setSharingChampion(false)
                      }, 'image/png')
                    } catch (e) { setSharingChampion(false) }
                  }}
                  disabled={sharingChampion}
                  style={{ width: '100%', padding: '12px', background: 'var(--accent-gold)', color: 'white', border: 'none', borderRadius: 'var(--radius-full)', fontWeight: '800', fontSize: '14px', cursor: sharingChampion ? 'wait' : 'pointer', opacity: sharingChampion ? 0.7 : 1 }}>
                  {sharingChampion ? '⏳ Generating...' : '🏆 Share my predicted champion'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

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
