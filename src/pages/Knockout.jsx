import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore, useAppStore } from '../store/index.js'
import { SkeletonCard, ErrorState } from '../components/PageState.jsx'
import {
  ALL_STAGES,
  calcPredictedStandings, resolveSlot, getBest3rdTeams, allocateThirdPlaces, findAffectedPicks, groupFullyPredicted,
  getMD1LockTime, MD1_STANDINGS_LOCK_FALLBACK,
} from '../lib/bracketUtils.js'
import { predictKnockoutMatch } from '../lib/luckyDip.js'
import { DATES } from '../lib/tournamentDates.js'
import WorldCupLogo from '../components/WorldCupLogo.jsx'
import { buildPredictedDepthByTeam, buildFixtureBracketHealth } from '../lib/bracketHealth.js'


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

  const [realKoResults, setRealKoResults] = useState([]) // completed real KO matches
  const [bracketPtsBreakdown, setBracketPtsBreakdown] = useState(null) // per-stage pts breakdown
  const [realKoFixtures, setRealKoFixtures] = useState([]) // all KO fixtures with confirmed teams
  const [realGroupStandings, setRealGroupStandings] = useState([]) // live real group standings

  const isPreTournament = new Date() < DATES.TOURNAMENT_START
  const groupStageDone = new Date() >= DATES.GROUP_STAGE_END
  const phaseOverride = appSettings?.game_phase_override || ''
  const koLive = phaseOverride === 'ko_predictor' || phaseOverride === 'post_tournament'
    ? true : phaseOverride && phaseOverride !== 'ko_predictor' ? false
    : m73Ready || new Date() >= DATES.KO_PREDICTOR_OPEN
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

  useEffect(() => {
    loadData()

    // Real knockout fixtures and statuses can be populated or updated after the
    // page has opened. Refresh while the page remains mounted so a live fixture
    // such as M73 cannot disappear until the user manually reloads.
    const interval = window.setInterval(loadData, 60000)
    return () => window.clearInterval(interval)
  }, [user?.id])

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
            is_unlocked: p.is_unlocked,
          }
        })
        setKnockoutPicks(koMap)
      }

      // Bracket is built from the user's PURE predicted standings (pureMode=true)
      // — frozen at MD1, never blended with real results. The bracket shows the
      // user's PREDICTED tournament; scoring compares it against reality separately.
      setStandings(calcPredictedStandings(matchData || [], predMap, true))

      // Load real knockout results (completed) + confirmed fixtures (teams set)
      const [{ data: koResults }, { data: koFixtures }, { data: groupStandings }] = await Promise.all([
        supabase.from('matches')
          .select('id, match_number, stage, status, home_team_id, away_team_id, winner_team_id, home_score, away_score, home_team:home_team_id(id), away_team:away_team_id(id)')
          .neq('stage', 'group')
          .eq('status', 'completed'),
        supabase.from('matches')
          .select('id, match_number, stage, status, kickoff_time, home_team_id, away_team_id, winner_team_id, home_score, away_score, live_minute, injury_time, home_team:home_team_id(id, name, flag_emoji, short_code), away_team:away_team_id(id, name, flag_emoji, short_code)')
          .neq('stage', 'group')
          .order('kickoff_time', { ascending: true }),
        supabase.from('group_standings')
          .select('*, group:group_id(id, name), team:team_id(id, name, flag_emoji, short_code, fifa_ranking)')
          .order('group_id').order('position')
      ])
      setRealKoResults(koResults || [])
      setRealKoFixtures(koFixtures || [])
      setRealGroupStandings((groupStandings || []).map(s => ({ ...s, group_name: s.group?.name || '' })))

      setLoadError(false)
    } catch (e) {
      console.error(e)
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  const resolveTeam = useCallback((slot) => resolveSlot(slot, standings, groupMatches, groupPredictions), [standings, groupMatches, groupPredictions])

  // Lookup any team object by its id (built from group match data)
  const teamById = useMemo(() => {
    const map = {}
    groupMatches.forEach(m => {
      if (m.home_team?.id) map[m.home_team.id] = m.home_team
      if (m.away_team?.id) map[m.away_team.id] = m.away_team
    })
    return map
  }, [groupMatches])

  // Teams eliminated from the real tournament (lost a completed KO match)
  const eliminatedTeams = useMemo(() => {
    const out = new Set()
    realKoResults.forEach(m => {
      if (m.home_score == null || m.away_score == null) return
      if (m.winner_team_id) {
        if (m.winner_team_id === m.home_team_id && m.away_team_id) out.add(m.away_team_id)
        else if (m.winner_team_id === m.away_team_id && m.home_team_id) out.add(m.home_team_id)
      } else if (m.home_score > m.away_score && m.away_team_id) out.add(m.away_team_id)
      else if (m.away_score > m.home_score && m.home_team_id) out.add(m.home_team_id)
    })
    return out
  }, [realKoResults])

  // Teams confirmed in real R32:
  // 1. home/away team IDs set on r32 fixtures
  // 2. Teams that finished top 2 in completed groups (played=3, position<=2)

  // Build real standings map in same format as predicted standings (group -> [{team, pts, gd...}])
  const realStandingsMap = useMemo(() => {
    if (!realGroupStandings.length) return {}
    const map = {}
    realGroupStandings.forEach(s => {
      const g = s.group_name
      if (!g) return
      if (!map[g]) map[g] = []
      map[g].push({
        team: s.team,
        pts: s.points || 0,
        gd: Number.isFinite(Number(s.goal_difference)) ? Number(s.goal_difference) : (Number(s.goals_for) || 0) - (Number(s.goals_against) || 0),
        gf: s.goals_for || 0,
        played: s.played || 0,
        position: s.position || 99,
        qualified: s.qualified,
        qualificationType: s.qualification_type,
        fifaRanking: s.team?.fifa_ranking || 999,
        confirmedR32: s.played >= 3 && s.position <= 2,
      })
    })
    // Sort by API position (already FIFA-correct, don't re-sort)
    Object.keys(map).forEach(g => map[g].sort((a, b) => a.position - b.position))
    return map
  }, [realGroupStandings])

  const confirmedR32Teams = useMemo(() => {
    const out = new Set()
    // From confirmed fixtures
    realKoFixtures.filter(m => m.stage === 'r32').forEach(m => {
      if (m.home_team?.id) out.add(m.home_team.id)
      if (m.away_team?.id) out.add(m.away_team.id)
    })
    // From completed group standings (position 1 or 2 with all 3 matches played)
    Object.values(realStandingsMap).forEach(teams => {
      const allPlayed = teams.every(t => t.played >= 3)
      if (allPlayed) {
        teams.filter(t => t.position <= 2).forEach(t => { if (t.team?.id) out.add(t.team.id) })
      }
    })
    return out
  }, [realKoFixtures, realStandingsMap])

  // Per-team real group-stage standing (games played + final position)
  const teamStandInfo = useMemo(() => {
    const m = {}
    realGroupStandings.forEach(r => { if (r.team?.id) m[r.team.id] = { played: r.played || 0, position: r.position || 99 } })
    return m
  }, [realGroupStandings])

  // Once every group is finished we can rank the 3rd-placed teams ourselves to
  // know which 8 qualify as best thirds — even before the R32 fixtures populate.
  const realBestThirdIds = useMemo(() => {
    const groups = Object.values(realStandingsMap)
    const allDone = groups.length >= 12 && groups.every(arr => arr.length >= 4 && arr.every(t => (t.played || 0) >= 3))
    if (!allDone) return null
    return new Set(getBest3rdTeams(realStandingsMap).slice(0, 8).map(t => t.id).filter(Boolean))
  }, [realStandingsMap])

  // A team is OUT of the real tournament if it lost a completed KO match, OR its
  // group is finished and it can't reach the R32. 4th place is out immediately;
  // 3rd place is only ruled out once the best thirds are known (all groups done,
  // or the R32 fully drawn) — so qualifying best thirds are never wrongly struck.
  const isTeamOut = useCallback((id) => {
    if (!id) return false
    if (eliminatedTeams.has(id)) return true
    const st = teamStandInfo[id]
    if (!st || st.played < 3) return false
    if (st.position <= 2) return false
    if (st.position >= 4) return true
    // 3rd place — verdict only when we actually know the qualifying best thirds
    if (realBestThirdIds) return !realBestThirdIds.has(id)
    if (confirmedR32Teams.size >= 32) return !confirmedR32Teams.has(id)
    return false
  }, [eliminatedTeams, teamStandInfo, realBestThirdIds, confirmedR32Teams])

  // Resolve a slot against real current standings (no prediction check needed)
  const resolveRealSlot = useCallback((slot) => {
    if (!slot || !Object.keys(realStandingsMap).length) return null

    // Winner/runner-up slots: '1A', '2B' etc
    const posMatch = slot.match(/^([12])([A-L])$/)
    if (posMatch) {
      const pos = parseInt(posMatch[1]) - 1
      const group = posMatch[2]
      const groupTeams = realStandingsMap[group]
      if (!groupTeams || groupTeams.every(t => t.played === 0)) return null
      const entry = groupTeams[pos]
      if (!entry?.team) return null
      // Confirmed = API has set qualification_type (official), fallback = all 3 played
      const groupDone = groupTeams.every(t => t.played >= 3)
      const apiConfirmed = !!(entry.qualificationType)
      const confirmed = apiConfirmed || groupDone
      return { ...entry.team, confirmed, provisional: !confirmed }
    }

    // Best-third slots: 'BT3_ABCDF' etc
    // Show provisional estimate from live standings, clearly marked as such
    const btMatch = slot.match(/^BT3_([A-L]+)$/)
    if (btMatch) {
      const eligibleGroups = btMatch[1].split('')
      const thirds = Object.entries(realStandingsMap)
        .map(([g, teams]) => ({
          group: g,
          team: teams[2]?.team,
          pts: teams[2]?.pts || 0,
          gd: teams[2]?.gd || 0,
          gf: teams[2]?.gf || 0,
          played: teams[2]?.played || 0,
          fifaRanking: teams[2]?.team?.fifa_ranking || 999,
          qualificationType: teams[2]?.qualificationType,
        }))
        .filter(t => t.team && t.played > 0)
        // FIFA tiebreaker order: pts → gd → gf → FIFA ranking (lower = better)
        .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.fifaRanking - b.fifaRanking)

      const best8 = thirds.slice(0, 8)
      if (best8.length < 1) return null

      // Try full allocation if we have 8+ thirds
      if (best8.length >= 8) {
        const allocation = allocateThirdPlaces(best8.map(t => t.group))
        if (allocation?.[slot]) {
          const assigned = best8.find(t => t.group === allocation[slot])
          if (assigned?.team) return { ...assigned.team, provisional: true }
        }
      }

      // Partial: if exactly one eligible third is in the current best 8, show it
      const matching = best8.filter(t => eligibleGroups.includes(t.group))
      if (matching.length === 1) return { ...matching[0].team, provisional: true }
      return null
    }
    return null
  }, [realStandingsMap])

  // "As it stands" tracker — stage-aware, shows for active stage only
  const liveTrackerStats = useMemo(() => {
    if (!knockoutPicks) return null

    const stageConfig = ALL_STAGES.find(s => s.key === activeStage)
    if (!stageConfig) return null

    const groupsComplete = Object.values(realStandingsMap).filter(teams =>
      teams.every(t => t.played >= 3)
    ).length

    // Stage-specific: what teams are confirmed in THIS stage?
    // R32: teams from confirmed fixtures + live standings
    // R16+: teams that WON their previous round (from realKoResults)
    const stageDbName = activeStage // 'r32','r16','qf','sf','final'
    const prevStageDb = { r16: 'r32', qf: 'r16', sf: 'qf', final: 'sf' }[activeStage]

    // Build set of teams confirmed in this stage
    const teamsInStage = new Set()

    if (activeStage === 'r32') {
      // R32: use confirmed fixtures + live standings resolution
      const confirmedR32 = {}
      realKoFixtures.filter(m => m.stage === 'r32').forEach(m => { confirmedR32[m.match_number] = m })
      stageConfig.matches.forEach(matchDef => {
        const conf = confirmedR32[matchDef.match_number]
        const rH = conf?.home_team || resolveRealSlot(matchDef.home_slot)
        const rA = conf?.away_team || resolveRealSlot(matchDef.away_slot)
        if (rH?.id) teamsInStage.add(rH.id)
        if (rA?.id) teamsInStage.add(rA.id)
      })
    } else if (prevStageDb) {
      // R16/QF/SF/Final: teams that won their match in the previous round
      realKoResults
        .filter(m => m.stage === prevStageDb && m.home_team?.id)
        .forEach(m => {
          // winner = team with higher score
          if (m.home_score > m.away_score && m.home_team?.id) teamsInStage.add(m.home_team.id)
          else if (m.away_score > m.home_score && m.away_team?.id) teamsInStage.add(m.away_team.id)
          // Also include upcoming confirmed fixtures for this stage
        })
      // Also add teams from confirmed fixtures for this stage
      realKoFixtures.filter(m => m.stage === stageDbName).forEach(m => {
        if (m.home_team?.id) teamsInStage.add(m.home_team.id)
        if (m.away_team?.id) teamsInStage.add(m.away_team.id)
      })
    }

    // No data yet for this stage — don't show tracker
    if (teamsInStage.size === 0) return null

    // Build confirmed fixtures lookup for this stage
    const confirmedFixtures = {}
    realKoFixtures.filter(m => m.stage === stageDbName).forEach(m => {
      confirmedFixtures[m.match_number] = m
    })

    // Per-match comparison
    const matchComparisons = stageConfig.matches.map(matchDef => {
      const pick = knockoutPicks[matchDef.match_number]
      const userPickId = pick?.winner_id
      const userHome = resolveTeam(matchDef.home_slot)
      const userAway = resolveTeam(matchDef.away_slot)

      const confirmed = confirmedFixtures[matchDef.match_number]
      // For real matchup: use confirmed fixture first, then resolve non-BT3 slots only
      // BT3 slots are provisional until all groups complete — don't show them to avoid duplicates
      const isBT3Home = matchDef.home_slot?.startsWith('BT3_')
      const isBT3Away = matchDef.away_slot?.startsWith('BT3_')
      const realHome = confirmed?.home_team || (activeStage === 'r32' && !isBT3Home ? resolveRealSlot(matchDef.home_slot) : null)
      const realAway = confirmed?.away_team || (activeStage === 'r32' && !isBT3Away ? resolveRealSlot(matchDef.away_slot) : null)

      // Winner pick on track
      const pickOnTrack = userPickId && teamsInStage.has(userPickId)
      // Both predicted teams checked — both earn 5pts if they qualify
      const userHomeOnTrack = userHome?.id && teamsInStage.has(userHome.id)
      const userAwayOnTrack = userAway?.id && teamsInStage.has(userAway.id)
      const isConfirmed = !!confirmed

      return {
        matchDef,
        userHome, userAway,
        realHome, realAway,
        userPickId,
        pickOnTrack,
        userHomeOnTrack,
        userAwayOnTrack,
        isConfirmed,
        hasPick: !!userPickId,
        hasRealData: !!(realHome || realAway),
      }
    })

    // Count all 32 predicted teams (both slots per match)
    // Both teams earn 5pts if they actually qualify — not just the winner pick
    let correct = 0
    let total = 0
    if (teamsInStage.size > 0) {
      matchComparisons.forEach(m => {
        if (m.userHome?.id) { total++; if (m.userHomeOnTrack) correct++ }
        if (m.userAway?.id) { total++; if (m.userAwayOnTrack) correct++ }
      })
    }
    const confirmedCount = matchComparisons.filter(m => m.isConfirmed).length
    const stageLabels = { r32: 'R32', r16: 'R16', qf: 'QF', sf: 'SF', final: 'Final' }

    return { correct, total, groupsComplete, matchComparisons, confirmedCount, stageLabel: stageLabels[activeStage] || activeStage, teamsInStage, stagePoints: stageConfig.points }
  }, [activeStage, realStandingsMap, realKoFixtures, realKoResults, knockoutPicks, resolveTeam, resolveRealSlot])



  // Bracket points earned — computed from real results vs user picks
  const bracketPtsEarned = useMemo(() => {
    if (!knockoutPicks || !user) return null
    const stages = [
      { key: 'r32', label: 'Round of 32', pts: 5 },
      { key: 'r16', label: 'Round of 16', pts: 8 },
      { key: 'qf',  label: 'Quarter-finals', pts: 12 },
      { key: 'sf',  label: 'Semi-finals', pts: 16 },
      { key: 'final', label: 'Final', pts: 20 },
    ]

    // Build confirmed teams per stage from real results
    const confirmedInStage = {
      r32: new Set([
        ...realKoFixtures.filter(m => m.stage === 'r32').flatMap(m => [m.home_team?.id, m.away_team?.id]),
        ...Object.values(realStandingsMap).flatMap(teams => [teams[0]?.team?.id, teams[1]?.team?.id]).filter(Boolean),
      ].filter(Boolean)),
      r16: new Set(realKoResults.filter(m => m.stage === 'r32').flatMap(m => m.winner_team_id ? [m.winner_team_id] : [])),
      qf:  new Set(realKoResults.filter(m => m.stage === 'r16').flatMap(m => m.winner_team_id ? [m.winner_team_id] : [])),
      sf:  new Set(realKoResults.filter(m => m.stage === 'qf' ).flatMap(m => m.winner_team_id ? [m.winner_team_id] : [])),
      final: new Set(realKoResults.filter(m => m.stage === 'sf').flatMap(m => m.winner_team_id ? [m.winner_team_id] : [])),
    }

    // Get all teams user picked per stage depth
    const userTeamDepth = {} // teamId -> max depth index (0=r32, 1=r16, etc)
    Object.values(knockoutPicks).forEach(pick => {
      if (!pick?.winner_id) return
      const stageIdx = stages.findIndex(s => s.key === pick.stage)
      if (stageIdx < 0) return
      if (userTeamDepth[pick.winner_id] === undefined || stageIdx > userTeamDepth[pick.winner_id]) {
        userTeamDepth[pick.winner_id] = stageIdx
      }
    })

    let totalEarned = 0
    const breakdown = stages.map((stage, idx) => {
      const confirmed = confirmedInStage[stage.key]
      if (!confirmed || confirmed.size === 0) return { ...stage, earned: 0, possible: 0, teams: [], active: false }

      // Teams user picked to reach at least this stage
      const userTeamsHere = Object.entries(userTeamDepth)
        .filter(([, depth]) => depth >= idx)
        .map(([teamId]) => teamId)

      const correct = userTeamsHere.filter(id => confirmed.has(id))
      const earned = correct.length * stage.pts
      totalEarned += earned

      return { ...stage, earned, possible: userTeamsHere.length * stage.pts, correct: correct.length, total: userTeamsHere.length, active: true }
    }).filter(s => s.active)

    return { breakdown, totalEarned }
  }, [knockoutPicks, realKoFixtures, realKoResults, realStandingsMap, user])

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

    const pick = knockoutPicks[matchDef.match_number]

    // Admin unlock override — orphaned picks that were affected by the matchup
    // bug are explicitly unlocked so the user can re-pick, even past normal locks
    if (pick?.is_unlocked) return false

    // Always lock if the match itself has kicked off
    if (new Date() >= new Date(matchDef.kickoff)) return true

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
    const savedPick = knockoutPicks[matchDef.match_number]

    // After the full bracket lock, don't resolve UNSAVED paths from edited
    // group predictions (they stay as placeholders). Saved picks still resolve
    // from the user's own bracket below — deterministic once predictions lock.
    if (new Date() >= mainBracketLockTime && !savedPick?.winner_id) {
      return { home: null, away: null }
    }

    // Resolve the two teams from the user's OWN predicted bracket — pure predicted
    // standings (resolveTeam) plus their own winner picks (resolveKnockoutWinner).
    // This is the bracket they predicted and never duplicates a team across slots
    // (unlike the stored snapshot columns, whose best-third teams were corrupted by
    // an old backfill).
    const resolve = (slot) => {
      if (slot?.startsWith('W')) return resolveKnockoutWinner(slot)
      if (slot?.startsWith('L')) return null
      return resolveTeam(slot)
    }
    const pureHome = resolve(matchDef.home_slot)
    const pureAway = resolve(matchDef.away_slot)
    const w = savedPick?.winner_id
    if (!w) return { home: pureHome, away: pureAway }

    // The winner they chose is always shown inside its match. Normally it's already
    // one of the two resolved teams. If their group prediction for this slot moved
    // after they picked, keep their actual winner and pair it with the resolved
    // opponent — never drop or contradict the team they chose. It still carries
    // forward to later rounds via the winner.
    if (w === pureHome?.id || w === pureAway?.id) {
      return { home: pureHome, away: pureAway }
    }
    const winnerTeam = teamById[w] || (savedPick?.winner_team || null)
    if (savedPick?.away_id === w && savedPick?.home_id !== w) {
      return { home: pureHome, away: winnerTeam }
    }
    return { home: winnerTeam, away: pureAway }
  }, [resolveTeam, resolveKnockoutWinner, knockoutPicks, mainBracketLockTime, teamById])

  // Official-fixture health uses the same shared calculation as Match Centre.
  const liveFixtureHealth = useMemo(() => {
    const stageConfig = ALL_STAGES.find(s => s.key === activeStage)
    if (!stageConfig) return []
    const predictedDepthByTeam = buildPredictedDepthByTeam({
      allStages: ALL_STAGES, knockoutPicks, getMatchTeams,
    })
    const now = Date.now()
    const statusRank = m => {
      const status = String(m.status || '').toLowerCase()
      const kickoffMs = new Date(m.kickoff_time).getTime()
      const recentlyFinished = now - kickoffMs <= 12 * 60 * 60 * 1000

      if (status === 'live' || status === 'in_progress') return 0

      // Keep a match visible near the top after full time. Previously every
      // completed fixture was pushed below all 15 upcoming R32 games, which made
      // M73 appear to have disappeared as soon as it finished.
      if ((status === 'completed' || status === 'finished') && recentlyFinished) return 1

      if (kickoffMs <= now && status !== 'completed' && status !== 'finished') return 2
      if (status !== 'completed' && status !== 'finished') return 3
      return 4
    }
    return realKoFixtures
      .filter(m => m.stage === activeStage && m.home_team?.id && m.away_team?.id)
      .map(fixture => {
        const stageIndex = ALL_STAGES.findIndex(stage => stage.key === activeStage)
        const nextStage = stageIndex >= 0 ? ALL_STAGES[stageIndex + 1] : null
        const advancePoints = nextStage?.points || stageConfig.points || 0
        return buildFixtureBracketHealth({
          fixture, stageKey: activeStage, stageConfig, knockoutPicks,
          predictedDepthByTeam, getTeamById, getMatchTeams, advancePoints,
        })
      })
      .filter(Boolean)
      .sort((a, b) => statusRank(a.fixture) - statusRank(b.fixture) || new Date(a.fixture.kickoff_time) - new Date(b.fixture.kickoff_time))
  }, [activeStage, realKoFixtures, knockoutPicks, getTeamById, getMatchTeams])

  // Detect when two teams the user predicted to reach the active round are now
  // on the same official route one round earlier. Example: if Spain and Portugal
  // were both predicted to reach the quarter-finals but the official bracket can
  // make them meet in the Round of 16, both quarter-final picks cannot survive.
  const routeCollisions = useMemo(() => {
    const stageOrder = ['r32', 'r16', 'qf', 'sf', 'final']
    const stageIndex = stageOrder.indexOf(activeStage)
    if (stageIndex <= 0) return []

    const activeConfig = ALL_STAGES.find(s => s.key === activeStage)
    const previousStageKey = stageOrder[stageIndex - 1]
    const previousConfig = ALL_STAGES.find(s => s.key === previousStageKey)
    if (!activeConfig || !previousConfig) return []

    const defsByNumber = new Map(ALL_STAGES.flatMap(s => s.matches).map(m => [m.match_number, m]))
    const realByNumber = new Map(realKoFixtures.map(m => [m.match_number, m]))
    const memo = new Map()

    const candidateIdsForMatch = (matchNumber) => {
      if (memo.has(matchNumber)) return memo.get(matchNumber)
      const real = realByNumber.get(matchNumber)
      if (real?.home_team?.id && real?.away_team?.id) {
        const ids = new Set([real.home_team.id, real.away_team.id])
        memo.set(matchNumber, ids)
        return ids
      }
      const def = defsByNumber.get(matchNumber)
      const ids = new Set()
      if (def) {
        ;[def.home_slot, def.away_slot].forEach(slot => {
          const winnerMatch = slot?.match(/^W(\d+)$/)
          if (winnerMatch) {
            candidateIdsForMatch(Number(winnerMatch[1])).forEach(id => ids.add(id))
          }
        })
      }
      memo.set(matchNumber, ids)
      return ids
    }

    const predictedTeams = new Map()
    activeConfig.matches.forEach(matchDef => {
      const { home, away } = getMatchTeams(matchDef)
      ;[home, away].forEach(team => { if (team?.id) predictedTeams.set(team.id, team) })
    })

    const collisions = []
    previousConfig.matches.forEach(previousMatch => {
      const candidates = [...candidateIdsForMatch(previousMatch.match_number)]
        .filter(id => predictedTeams.has(id) && !isTeamOut(id))
        .map(id => predictedTeams.get(id))
      if (candidates.length < 2) return

      // In a single knockout match only one team can advance, so every pair of
      // user's active-round picks inside this match is mutually exclusive.
      for (let i = 0; i < candidates.length; i++) {
        for (let j = i + 1; j < candidates.length; j++) {
          collisions.push({
            matchNumber: previousMatch.match_number,
            earlierRound: previousConfig.label,
            targetRound: activeConfig.label,
            pointsLost: activeConfig.points,
            teamA: candidates[i],
            teamB: candidates[j],
          })
        }
      }
    })

    const seen = new Set()
    return collisions.filter(c => {
      const key = [c.matchNumber, c.teamA.id, c.teamB.id].sort().join(':')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [activeStage, realKoFixtures, getMatchTeams, isTeamOut])

  // Candidate teams that can still arrive in any real bracket match. For rounds
  // that do not yet have confirmed fixtures, this follows the official feeder
  // matches backwards and carries forward every still-possible team.
  const realRouteCandidates = useMemo(() => {
    const defsByNumber = new Map(ALL_STAGES.flatMap(s => s.matches).map(m => [m.match_number, m]))
    const realByNumber = new Map(realKoFixtures.map(m => [m.match_number, m]))
    const resultByNumber = new Map(realKoResults.map(m => [m.match_number, m]))
    const memo = new Map()

    const collect = (matchNumber) => {
      if (memo.has(matchNumber)) return memo.get(matchNumber)
      const ids = new Set()
      const real = realByNumber.get(matchNumber)
      const result = resultByNumber.get(matchNumber)

      const completedWinner = result?.winner_team_id || real?.winner_team_id || null
      if (completedWinner) {
        ids.add(completedWinner)
        memo.set(matchNumber, ids)
        return ids
      }

      if (real?.home_team?.id) ids.add(real.home_team.id)
      if (real?.away_team?.id) ids.add(real.away_team.id)
      if (ids.size) {
        memo.set(matchNumber, ids)
        return ids
      }

      const def = defsByNumber.get(matchNumber)
      if (def) {
        ;[def.home_slot, def.away_slot].forEach(slot => {
          const feeder = slot?.match(/^[WL](\d+)$/)
          if (feeder) {
            collect(Number(feeder[1])).forEach(id => ids.add(id))
            return
          }
          const realTeam = resolveRealSlot(slot)
          if (realTeam?.id) ids.add(realTeam.id)
        })
      }

      memo.set(matchNumber, ids)
      return ids
    }

    ALL_STAGES.flatMap(s => s.matches).forEach(m => collect(m.match_number))
    return memo
  }, [realKoFixtures, realKoResults, resolveRealSlot])

  // Always reconstruct the user's frozen predicted matchup, even when the newer
  // pure bracket resolver cannot currently rebuild one side. Stored snapshot IDs
  // are used only as a display fallback here; the saved winner remains untouched.
  const getOriginalPredictedMatchup = useCallback((matchDef) => {
    const resolved = getMatchTeams(matchDef)
    const pick = knockoutPicks[matchDef.match_number]

    const feederTeam = (slot) => {
      const feeder = slot?.match(/^W(\d+)$/)
      if (!feeder) return null
      const feederPick = knockoutPicks[Number(feeder[1])]
      return feederPick?.winner_id ? getTeamById(feederPick.winner_id) : null
    }

    const home = resolved.home
      || (pick?.home_id ? getTeamById(pick.home_id) : null)
      || feederTeam(matchDef.home_slot)
    const away = resolved.away
      || (pick?.away_id ? getTeamById(pick.away_id) : null)
      || feederTeam(matchDef.away_slot)

    return { home, away }
  }, [getMatchTeams, knockoutPicks, getTeamById])

  const predictedRoundHealth = useMemo(() => {
    const stageConfig = ALL_STAGES.find(s => s.key === activeStage)
    if (!stageConfig) return []

    const stageOrder = ['r32', 'r16', 'qf', 'sf', 'final']
    const activeIndex = stageOrder.indexOf(activeStage)

    return stageConfig.matches.map(matchDef => {
      const { home, away } = getOriginalPredictedMatchup(matchDef)
      const pick = knockoutPicks[matchDef.match_number]
      const winner = pick?.winner_id ? getTeamById(pick.winner_id) : null
      const homeOut = !!home?.id && isTeamOut(home.id)
      const awayOut = !!away?.id && isTeamOut(away.id)
      const winnerOut = !!winner?.id && isTeamOut(winner.id)
      const candidates = realRouteCandidates.get(matchDef.match_number) || new Set()
      const homeCanReach = !!home?.id && !homeOut && candidates.has(home.id)
      const awayCanReach = !!away?.id && !awayOut && candidates.has(away.id)
      const winnerCanReach = !!winner?.id && !winnerOut && candidates.has(winner.id)
      const exactMatchupPossible = !!home?.id && !!away?.id && homeCanReach && awayCanReach

      let tone = 'neutral'
      let label = 'Route still forming'
      let detail = 'The official fixture is not confirmed yet, but this card tracks whether your predicted teams can still arrive here.'

      if (!home?.id && !away?.id) {
        label = 'Prediction unavailable'
        detail = 'No saved predicted teams could be reconstructed for this fixture.'
      } else if (winner?.id && winnerOut) {
        tone = 'out'
        label = 'Saved winner eliminated'
        detail = `${winner.name} can no longer reach the ${stageConfig.label.toLowerCase()}.`
      } else if (exactMatchupPossible) {
        tone = 'safe'
        label = 'Exact matchup still possible'
        detail = `${home.name} and ${away.name} can both still arrive in this fixture. ${winner?.name ? `${winner.name} remains your saved winner.` : ''}`.trim()
      } else if (winnerCanReach) {
        tone = 'need'
        label = `${winner.name} still on track`
        const missing = [home, away].find(team => team?.id && team.id !== winner.id && !(team.id === home?.id ? homeCanReach : awayCanReach))
        detail = missing
          ? `${winner.name} can still reach this fixture, but ${missing.name} can no longer arrive through the official route. The exact matchup is lost, while your saved winner remains alive.`
          : `${winner.name} can still reach this fixture through the official route.`
      } else if (!winner?.id && (homeCanReach || awayCanReach)) {
        tone = 'need'
        label = 'Part of the matchup still possible'
        const aliveTeam = homeCanReach ? home : away
        detail = `${aliveTeam.name} can still reach this fixture, but the exact predicted matchup cannot currently happen.`
      } else if (!homeOut && !awayOut && home?.id && away?.id) {
        tone = 'partial'
        label = 'Both alive, routes have changed'
        detail = `${home.name} and ${away.name} are still in the tournament, but the official bracket no longer allows this exact fixture. Check the route-conflict notice for where their paths now cross.`
      } else if ((homeCanReach || awayCanReach) && !winnerCanReach) {
        tone = 'need'
        label = 'Exact matchup no longer possible'
        const survivor = homeCanReach ? home : away
        detail = `${survivor.name} can still reach this fixture, but your original saved winner or opponent cannot.`
      } else if (homeOut && awayOut) {
        tone = 'out'
        label = 'Predicted matchup eliminated'
        detail = 'Neither predicted team can reach this fixture.'
      } else {
        tone = 'out'
        label = 'Predicted route lost'
        detail = 'The official bracket route no longer allows either side of this predicted fixture to arrive here.'
      }

      return {
        matchDef, home, away, winner, homeOut, awayOut, winnerOut,
        homeCanReach, awayCanReach, winnerCanReach, exactMatchupPossible,
        activeIndex, tone, label, detail,
      }
    })
  }, [activeStage, knockoutPicks, getOriginalPredictedMatchup, getTeamById, isTeamOut, realRouteCandidates])

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
    // Pick exists — consider it valid for display purposes even if team
    // doesn't currently resolve from group predictions (stale but counted)
    const { home, away } = getMatchTeams(matchDef)
    if (!home && !away) return true // can't resolve opponents, assume valid
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
        .update({ winner_team_id: winnerId, team_id: winnerId, home_team_id: home?.id, away_team_id: away?.id, is_unlocked: false, bracket_version: 'fifa_v2' })
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
  const stageMatches = [...(currentStage?.matches || [])].sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff))
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


  const getStageHealth = (stage) => {
    // Keep the active tab and the bracket-health summary on one source of truth.
    // liveTrackerStats is the same real-vs-predicted calculation used by the
    // summary card below, so the two figures cannot disagree.
    if (stage?.key === activeStage && liveTrackerStats?.total > 0) {
      return {
        alive: liveTrackerStats.correct,
        total: liveTrackerStats.total,
      }
    }

    // Fallback for inactive tabs. When a tab is selected, liveTrackerStats is
    // recalculated for that round and replaces this provisional figure.
    let alive = 0
    let total = 0
    ;(stage.matches || []).forEach(def => {
      const { home, away } = getMatchTeams(def)
      ;[home, away].forEach(team => {
        if (!team?.id) return
        total++
        if (!isTeamOut(team.id)) alive++
      })
    })
    return { alive, total }
  }

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

    // Team-alive colour logic (post-groups)
    const pickedTeamId = pick?.winner_id
    const teamEliminated = pickedTeamId && isTeamOut(pickedTeamId)
    const teamStillAlive = groupStageDone && isPicked && !teamEliminated
    // Colour: gold=stale/final, red=eliminated, green=still alive, navy=picked/unknown, transparent=unpicked
    const accentColor = (isAffected || isStale) ? 'var(--accent-gold)'
      : isFinalMatch ? 'var(--accent-gold)'
      : teamEliminated ? 'var(--accent-red, #c62828)'
      : teamStillAlive ? 'var(--accent-green)'
      : isPicked ? 'var(--scottish-navy)'
      : 'transparent'

    const cardBorder = (isAffected || isStale) ? '2px solid var(--accent-gold)'
      : isFinalMatch && isPicked ? '2px solid var(--accent-gold)'
      : isFinalMatch ? '1.5px solid rgba(184,134,11,0.4)'
      : teamEliminated ? '1.5px solid rgba(198,40,40,0.35)'
      : teamStillAlive ? '1.5px solid rgba(0,122,51,0.35)'
      : isPicked ? '1.5px solid rgba(0,48,135,0.3)'
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
          {locked && lockedReason && !mainBracketLocked && (
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
              {locked && !mainBracketLocked && <span className="badge badge-red">🔒 Locked</span>}
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
                // Confirmed in real R32 (works for both picked and non-picked team)
                const isConfirmedInR32 = activeStage === 'r32' && team?.id && confirmedR32Teams.has(team.id)
                const isEliminatedFromR32 = activeStage === 'r32' && team?.id && isTeamOut(team.id)
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
                            ? `2px solid ${isFinal ? 'var(--accent-gold)' : teamEliminated ? 'rgba(198,40,40,0.4)' : teamStillAlive ? 'rgba(0,122,51,0.4)' : 'rgba(0,48,135,0.35)'}`
                            : '1.5px solid var(--border-light)',
                          background: isPickedTeam
                            ? (isFinal ? 'var(--accent-gold-light)' : teamEliminated ? 'rgba(198,40,40,0.06)' : teamStillAlive ? 'var(--accent-green-light)' : 'rgba(0,48,135,0.05)')
                            : 'var(--bg-secondary)',
                          cursor: canPickThisTeam ? 'pointer' : 'default',
                          boxShadow: isPickedTeam ? `0 0 0 3px ${isFinal ? 'rgba(184,134,11,0.12)' : teamEliminated ? 'rgba(198,40,40,0.08)' : teamStillAlive ? 'rgba(0,122,51,0.1)' : 'rgba(0,48,135,0.08)'}` : 'none',
                        }}>
                        <span style={{ fontSize: '30px', lineHeight: 1, flexShrink: 0, opacity: isPickedTeam && teamEliminated ? 0.5 : 1 }}>{team.flag_emoji}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '800', fontSize: '15px', letterSpacing: '-0.01em',
                            color: isPickedTeam ? (isFinal ? 'var(--accent-gold)' : teamEliminated ? '#c62828' : teamStillAlive ? 'var(--accent-green)' : 'var(--scottish-navy)')
                              : isConfirmedInR32 ? 'var(--accent-green)'
                              : isEliminatedFromR32 ? '#c62828'
                              : 'var(--text-primary)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            textDecoration: isPickedTeam && teamEliminated ? 'line-through' : 'none' }}>
                            {team.name}
                          </div>
                          <div style={{ fontSize: '11px', fontWeight: '600', marginTop: '2px',
                            color: isPickedTeam ? (isFinal ? 'var(--accent-gold)' : teamEliminated ? '#c62828' : teamStillAlive ? 'var(--accent-green)' : 'var(--scottish-navy)')
                              : isConfirmedInR32 ? 'var(--accent-green)'
                              : isEliminatedFromR32 ? '#c62828'
                              : 'var(--text-muted)' }}>
                            {isPickedTeam
                              ? teamEliminated ? `${team.short_code} · Eliminated ✗`
                              : teamStillAlive ? `${team.short_code} · Still in ✓`
                              : isConfirmedInR32 ? `${team.short_code} · Your pick · +5pts`
                              : `${team.short_code} · Your pick`
                              : isConfirmedInR32 ? `${team.short_code} · In R32 · +5pts`
                              : isEliminatedFromR32 ? `${team.short_code} · Eliminated ✗`
                              : team.short_code}
                          </div>
                        </div>
                        {isPickedTeam && (
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%',
                            background: isFinal ? 'var(--accent-gold)' : teamEliminated ? '#c62828' : teamStillAlive ? 'var(--accent-green)' : 'var(--scottish-navy)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ color: 'white', fontSize: teamEliminated ? '12px' : '14px', fontWeight: '900' }}>{teamEliminated ? '✗' : '✓'}</span>
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
        padding: '28px 20px 24px', color: 'white', textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        <WorldCupLogo variant="watermark" size={184} opacity={0.09} style={{ right: '-20px' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '600px', margin: '0 auto' }}>
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
            Two knockout prediction games
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '16px', flexShrink: 0 }}>🏆</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Tournament Bracket — this page</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>Pick which teams advance each round based on your group predictions. Must complete before groups kick off.</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '16px', flexShrink: 0 }}>🔥</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>KO Match Predictor</div>
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
                {(() => {
                  const health = getStageHealth(stage)
                  const showHealth = groupStageDone && health.total > 0
                  return (
                    <span style={{ fontSize: '10px', fontWeight: '700', color: showHealth ? (health.alive === health.total ? 'var(--accent-green)' : health.alive === 0 ? '#c62828' : 'var(--accent-gold)') : complete ? 'var(--accent-green)' : isActive ? 'var(--scottish-navy)' : 'var(--text-muted)', opacity: 1 }}>
                      {showHealth ? `${health.alive}/${health.total} alive` : complete ? '✓ Done' : `${picks}/${stage.matches.length}`}
                    </span>
                  )
                })()}
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
            {stagePicks === stageMatches.length ? '' : `${stagePicks}/${stageMatches.length} picked`}
          </span>
        </div>
      </div>

      {/* ── Match cards ── */}
      <div className="container" style={{ padding: '16px' }}>
        {/* Single lock notice — replaces per-card Locked badges */}
        {mainBracketLocked && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '9px 14px', marginBottom: '4px',
            background: 'rgba(0,48,135,0.05)',
            border: '1px solid rgba(0,48,135,0.12)',
            borderRadius: 'var(--radius-md)',
            fontSize: '12px', fontWeight: '600', color: 'var(--scottish-navy)',
          }}>
            <span>🔒</span>
            <span style={{ flex: 1 }}>Tournament Bracket locked · your saved picks are frozen</span>
            {groupStageDone && eliminatedTeams.size > 0 && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>
                colours = team status
              </span>
            )}
          </div>
        )}

        {/* Unified bracket health — each card also shows the frozen original pick */}
        {(liveTrackerStats?.total > 0 || liveFixtureHealth.length > 0 || predictedRoundHealth.length > 0 || routeCollisions.length > 0) && (() => {
          // Later rounds often have no official fixture teams yet. In that case,
          // build the round summary from the user's reconstructed predicted fixtures
          // instead of hiding the whole health section behind liveTrackerStats.
          const fallbackTotal = predictedRoundHealth.reduce((sum, item) =>
            sum + (item.home?.id ? 1 : 0) + (item.away?.id ? 1 : 0), 0)
          const fallbackCorrect = predictedRoundHealth.reduce((sum, item) =>
            sum + (item.home?.id && !item.homeOut ? 1 : 0) + (item.away?.id && !item.awayOut ? 1 : 0), 0)
          const summaryTotal = liveTrackerStats?.total > 0 ? liveTrackerStats.total : fallbackTotal
          const summaryCorrect = liveTrackerStats?.total > 0 ? liveTrackerStats.correct : fallbackCorrect
          const summaryStageLabel = liveTrackerStats?.stageLabel || currentStage?.label || activeStage
          const summaryStagePoints = liveTrackerStats?.stagePoints || currentStage?.points || 0
          const pctHealth = summaryTotal > 0 ? Math.round((summaryCorrect / summaryTotal) * 100) : 0
          const lost = Math.max(0, summaryTotal - summaryCorrect)
          const colour = pctHealth >= 75 ? 'var(--accent-green)' : pctHealth >= 50 ? 'var(--accent-gold)' : '#c62828'

          // Teams can still be alive individually but be guaranteed to eliminate
          // one another before this round. Count each feeder match once and remove
          // the unavoidable extra qualifiers from the true maximum available.
          const collisionTeamsByMatch = new Map()
          routeCollisions.forEach(collision => {
            if (!collisionTeamsByMatch.has(collision.matchNumber)) {
              collisionTeamsByMatch.set(collision.matchNumber, new Set())
            }
            const ids = collisionTeamsByMatch.get(collision.matchNumber)
            if (collision.teamA?.id && !isTeamOut(collision.teamA.id)) ids.add(collision.teamA.id)
            if (collision.teamB?.id && !isTeamOut(collision.teamB.id)) ids.add(collision.teamB.id)
          })
          const guaranteedLosses = [...collisionTeamsByMatch.values()]
            .reduce((sum, ids) => sum + Math.max(0, ids.size - 1), 0)
          const maxScoringTeams = Math.max(0, summaryCorrect - guaranteedLosses)
          const maxRemaining = maxScoringTeams * summaryStagePoints
          return (
            <div style={{ marginTop: '10px' }}>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                        {summaryStageLabel} bracket health
                      </div>
                      <div style={{ fontSize: '18px', lineHeight: 1.25, fontWeight: '900', color: 'var(--text-primary)', marginTop: '5px' }}>
                        <span style={{ color: colour }}>{summaryCorrect}/{summaryTotal}</span> predicted teams still alive
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '5px', lineHeight: 1.45 }}>
                        {lost === 0 ? 'Your full path can still happen.' : `${lost} predicted team${lost === 1 ? '' : 's'} can no longer reach this round.`}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '20px', fontWeight: '900', color: colour }}>{pctHealth}%</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>healthy</div>
                    </div>
                  </div>
                  <div style={{ height: '6px', background: 'var(--border-light)', borderRadius: '10px', overflow: 'hidden', marginTop: '12px' }}>
                    <div style={{ width: `${pctHealth}%`, height: '100%', background: colour, borderRadius: '10px' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                    <span style={{ padding: '5px 9px', borderRadius: 'var(--radius-full)', background: 'rgba(0,122,51,0.08)', color: 'var(--accent-green)', fontSize: '11px', fontWeight: '800' }}>{summaryCorrect} alive</span>
                    <span style={{ padding: '5px 9px', borderRadius: 'var(--radius-full)', background: lost ? 'rgba(198,40,40,0.08)' : 'var(--bg-secondary)', color: lost ? '#c62828' : 'var(--text-muted)', fontSize: '11px', fontWeight: '800' }}>{lost} out</span>
                    {guaranteedLosses > 0 && (
                      <span style={{ padding: '5px 9px', borderRadius: 'var(--radius-full)', background: 'rgba(184,134,11,0.08)', color: 'var(--accent-gold)', fontSize: '11px', fontWeight: '800' }}>
                        {guaranteedLosses} guaranteed loss{guaranteedLosses === 1 ? '' : 'es'}
                      </span>
                    )}
                    <span style={{ padding: '5px 9px', borderRadius: 'var(--radius-full)', background: 'rgba(0,48,135,0.06)', color: 'var(--scottish-navy)', fontSize: '11px', fontWeight: '800' }}>Up to {maxRemaining} pts remain</span>
                  </div>
                </div>

              </div>

              {groupStageDone && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                  {routeCollisions.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {routeCollisions.map(collision => (
                        <div key={`${collision.matchNumber}-${collision.teamA.id}-${collision.teamB.id}`} style={{
                          background: 'rgba(184,134,11,0.08)',
                          border: '1.5px solid rgba(184,134,11,0.35)',
                          borderRadius: 'var(--radius-lg)',
                          padding: '13px 15px',
                          boxShadow: 'var(--shadow-card)',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                            <div style={{ fontSize: '11px', fontWeight: '900', color: '#9a6700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Route conflict · M{collision.matchNumber}</div>
                            <span style={{ padding: '4px 8px', borderRadius: 'var(--radius-full)', background: 'rgba(184,134,11,0.1)', border: '1px solid rgba(184,134,11,0.35)', color: '#9a6700', fontSize: '10px', fontWeight: '900', whiteSpace: 'nowrap' }}>AT LEAST {collision.pointsLost} PTS LOST</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '13px', fontWeight: '900', color: 'var(--text-primary)' }}>
                            <span>{collision.teamA.flag_emoji} {collision.teamA.name}</span>
                            <span style={{ color: 'var(--text-muted)', fontWeight: '700' }}>and</span>
                            <span>{collision.teamB.flag_emoji} {collision.teamB.name}</span>
                          </div>
                          <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                            You predicted both teams to reach the {collision.targetRound.toLowerCase()}, but they can now meet in the {collision.earlierRound.toLowerCase()}. Only one can advance, so one of those {collision.targetRound.toLowerCase()} picks is guaranteed to be lost.
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {liveFixtureHealth.length > 0 ? liveFixtureHealth.map(({ fixture, originalHome, originalAway, savedWinner, homeNeeded, awayNeeded, homeInRoundPath, awayInRoundPath, homeDepth, awayDepth, preferredId, neededId, tone, label, detail, completed, completedOutcome, pointsEffect, winnerId, reachLabels, activeStageIndex }) => {
                    const toneMap = {
                      safe: { colour: 'var(--accent-green)', bg: 'rgba(0,122,51,0.05)', border: 'rgba(0,122,51,0.25)' },
                      need: { colour: 'var(--scottish-navy)', bg: 'rgba(0,48,135,0.04)', border: 'rgba(0,48,135,0.22)' },
                      partial: { colour: '#9a6700', bg: 'rgba(184,134,11,0.06)', border: 'rgba(184,134,11,0.28)' },
                      out: { colour: '#c62828', bg: 'rgba(198,40,40,0.04)', border: 'rgba(198,40,40,0.22)' },
                      neutral: { colour: 'var(--text-muted)', bg: 'var(--bg-card)', border: 'var(--border-light)' },
                    }
                    const completedNoImpact = completed && completedOutcome === 'no-impact'
                    const t = completedNoImpact ? toneMap.neutral : toneMap[tone]
                    return (
                      <Link
                        key={fixture.id || fixture.match_number}
                        to={`/match/${fixture.id}/stats`}
                        aria-label={`View Match Centre for ${fixture.home_team?.name || 'home team'} versus ${fixture.away_team?.name || 'away team'}`}
                        style={{
                          display: 'block',
                          color: 'inherit',
                          textDecoration: 'none',
                          background: t.bg,
                          border: `1.5px solid ${t.border}`,
                          borderRadius: 'var(--radius-lg)',
                          boxShadow: 'var(--shadow-card)',
                          padding: '14px 16px',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '11px' }}>
                          <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {completed
                              ? `Full time · M${fixture.match_number} · ${fixture.home_score ?? '–'}–${fixture.away_score ?? '–'}`
                              : `M${fixture.match_number} · ${fmt(fixture.kickoff_time)}`}
                          </div>
                          <span style={{ padding: '4px 8px', borderRadius: 'var(--radius-full)', background: t.bg, border: `1px solid ${t.border}`, color: t.colour, fontSize: '10px', fontWeight: '900', whiteSpace: 'nowrap' }}>
                            {label.toUpperCase()}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '10px' }}>
                          {[fixture.home_team, fixture.away_team].map((team, idx) => {
                            const needed = team.id === neededId || (idx === 0 ? homeNeeded : awayNeeded)
                            const inRoundPath = idx === 0 ? homeInRoundPath : awayInRoundPath
                            const usefulElsewhere = !needed && inRoundPath
                            const preferred = preferredId === team.id
                            const depth = idx === 0 ? homeDepth : awayDepth
                            const winner = completed && winnerId === team.id
                            const loser = completed && winnerId && winnerId !== team.id
                            const teamBorder = needed || preferred
                              ? `2px solid ${tone === 'out' ? '#c62828' : preferred ? '#9a6700' : 'var(--accent-green)'}`
                              : usefulElsewhere
                                ? '1.5px solid rgba(184,134,11,0.45)'
                                : '1px solid var(--border-light)'
                            const teamBg = needed
                              ? 'var(--bg-card)'
                              : preferred
                                ? 'rgba(184,134,11,0.09)'
                                : usefulElsewhere
                                  ? 'rgba(184,134,11,0.05)'
                                  : 'rgba(255,255,255,0.45)'
                            const teamColour = needed ? t.colour : (preferred || usefulElsewhere) ? '#9a6700' : 'var(--text-primary)'
                            return (
                              <div key={team.id} style={{ textAlign: idx === 0 ? 'left' : 'right', padding: '10px', borderRadius: 'var(--radius-md)', border: teamBorder, background: teamBg, opacity: tone === 'out' && needed ? 0.65 : 1 }}>
                                <div style={{ fontSize: '26px' }}>{team.flag_emoji}</div>
                                <div style={{ fontSize: '13px', fontWeight: '900', color: teamColour, marginTop: '4px' }}>{team.name}</div>
                                <div style={{ fontSize: '10px', color: needed ? t.colour : usefulElsewhere ? '#9a6700' : 'var(--text-muted)', fontWeight: '800', marginTop: '2px' }}>
                                  {winner
                                    ? 'Advanced ✓'
                                    : loser
                                      ? 'Eliminated'
                                      : needed
                                        ? 'Your saved winner for this fixture'
                                        : preferred
                                          ? `Best for your bracket · predicted to reach ${reachLabels[Math.max(depth, 0)]}`
                                          : usefulElsewhere
                                            ? `Predicted to progress to ${reachLabels[Math.max(depth, 0)]}`
                                            : depth === activeStageIndex
                                              ? `Predicted to exit in ${reachLabels[activeStageIndex]}`
                                              : 'Not in your remaining bracket path'}
                                </div>
                              </div>
                            )
                          })}
                          <div style={{ gridColumn: 2, gridRow: 1, fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)' }}>VS</div>
                        </div>
                        <div style={{ marginTop: '11px', paddingTop: '10px', borderTop: '1px solid var(--border-light)' }}>
                          <div style={{ fontSize: '13px', fontWeight: '900', color: t.colour }}>{label}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.45, marginTop: '3px' }}>{detail}</div>
                          {completed && pointsEffect !== null && (
                            <div style={{ marginTop: '7px', fontSize: '11px', fontWeight: '900', color: pointsEffect > 0 ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                              {pointsEffect > 0 ? `+${pointsEffect} bracket points preserved from this result` : 'No additional bracket points preserved from this result'}
                            </div>
                          )}
                        </div>

                        <div style={{ marginTop: '11px', padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
                          <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '7px' }}>
                            Your original pick
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap', fontSize: '12px', fontWeight: '800', color: 'var(--text-primary)' }}>
                            <span>{originalHome?.flag_emoji || '🏳️'} {originalHome?.name || 'Unknown team'}</span>
                            <span style={{ color: 'var(--text-muted)', fontWeight: '700' }}>vs</span>
                            <span>{originalAway?.flag_emoji || '🏳️'} {originalAway?.name || 'Unknown team'}</span>
                          </div>
                          <div style={{ marginTop: '6px', fontSize: '12px', fontWeight: '900', color: savedWinner ? 'var(--scottish-navy)' : 'var(--text-muted)' }}>
                            {savedWinner ? `${savedWinner.flag_emoji || ''} ${savedWinner.name} to advance` : 'No winner saved'}
                          </div>
                        </div>

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                          marginTop: '11px',
                          paddingTop: '10px',
                          borderTop: '1px solid var(--border-light)',
                        }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>
                            View the full points impact
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--scottish-navy)', fontWeight: 900 }}>
                            View Match Centre →
                          </span>
                        </div>
                      </Link>
                    )
                  } ) : predictedRoundHealth.length > 0 ? predictedRoundHealth.map(({ matchDef, home, away, winner, homeOut, awayOut, homeCanReach, awayCanReach, tone, label, detail }) => {
                    const toneMap = {
                      safe: { colour: 'var(--accent-green)', bg: 'rgba(0,122,51,0.05)', border: 'rgba(0,122,51,0.25)' },
                      need: { colour: 'var(--scottish-navy)', bg: 'rgba(0,48,135,0.04)', border: 'rgba(0,48,135,0.22)' },
                      partial: { colour: '#9a6700', bg: 'rgba(184,134,11,0.06)', border: 'rgba(184,134,11,0.28)' },
                      out: { colour: '#c62828', bg: 'rgba(198,40,40,0.04)', border: 'rgba(198,40,40,0.22)' },
                      neutral: { colour: 'var(--text-muted)', bg: 'var(--bg-card)', border: 'var(--border-light)' },
                    }
                    const t = toneMap[tone]
                    return (
                      <div key={matchDef.match_number} style={{ background: t.bg, border: `1.5px solid ${t.border}`, borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)', padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '11px' }}>
                          <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your original pick · M{matchDef.match_number} · {currentStage?.label}</div>
                          <span style={{ padding: '4px 8px', borderRadius: 'var(--radius-full)', background: t.bg, border: `1px solid ${t.border}`, color: t.colour, fontSize: '10px', fontWeight: '900', whiteSpace: 'nowrap' }}>{label.toUpperCase()}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '10px' }}>
                          {[{ team: home, out: homeOut, canReach: homeCanReach }, { team: away, out: awayOut, canReach: awayCanReach }].map(({ team, out, canReach }, idx) => {
                            const isWinner = !!team?.id && team.id === winner?.id
                            return (
                              <div key={team?.id || idx} style={{ textAlign: idx === 0 ? 'left' : 'right', padding: '10px', borderRadius: 'var(--radius-md)', border: isWinner ? `2px solid ${out ? '#c62828' : 'var(--scottish-navy)'}` : '1px solid var(--border-light)', background: 'var(--bg-card)', opacity: out ? 0.6 : 1 }}>
                                <div style={{ fontSize: '26px' }}>{team?.flag_emoji || '🏳️'}</div>
                                <div style={{ fontSize: '13px', fontWeight: '900', color: out ? '#c62828' : isWinner ? 'var(--scottish-navy)' : 'var(--text-primary)', marginTop: '4px', textDecoration: out ? 'line-through' : 'none' }}>{team?.name || 'To be confirmed'}</div>
                                <div style={{ fontSize: '10px', color: out ? '#c62828' : canReach ? 'var(--accent-green)' : isWinner ? 'var(--scottish-navy)' : 'var(--text-muted)', fontWeight: '800', marginTop: '2px' }}>{out ? 'Eliminated' : canReach ? 'Can still reach this fixture' : isWinner ? 'Your saved winner · off this route' : team ? 'Alive, but off this route' : 'Waiting'}</div>
                              </div>
                            )
                          })}
                          <div style={{ gridColumn: 2, gridRow: 1, fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)' }}>VS</div>
                        </div>
                        <div style={{ marginTop: '11px', paddingTop: '10px', borderTop: '1px solid var(--border-light)' }}>
                          <div style={{ fontSize: '13px', fontWeight: '900', color: t.colour }}>{label}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.45, marginTop: '3px' }}>{detail}</div>
                        </div>
                      </div>
                    )
                  }) : (
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '18px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No saved bracket data is available for this round yet.</div>
                  )}
                </div>
              )}
            </div>
          )
        })()}

        {/* Before the live knockout stage, keep the original bracket editable. */}
        {!groupStageDone && <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: mainBracketLocked ? '12px' : '0' }}>
          {stageMatches.map(renderMatch)}
        </div>}
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
