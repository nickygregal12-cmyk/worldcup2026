import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore, useAppStore } from '../store/index.js'
import { predictMatchOdds, predictGoals, predictAwards } from '../lib/luckyDip.js'
import { ALL_STAGES, calcPredictedStandings, resolveSlot, getBest3rdTeams } from '../lib/bracketUtils.js'
import ShareCard from '../components/ShareCard.jsx'
import MemberPredictionsModal, { useMemberPredictions } from '../components/MemberPredictionsModal.jsx'

// ── Tournament phase dates ───────────────────────────────────────────────────
const TOURNAMENT_START   = new Date('2026-06-11T19:00:00Z') // first kickoff
const GROUP_STAGE_END    = new Date('2026-06-27T22:00:00Z') // last group game
const KNOCKOUT_BANNER    = new Date('2026-06-20T00:00:00Z') // banner appears
const KNOCKOUT_LIVE      = new Date('2026-06-27T22:00:00Z') // predictor opens 27 Jun 23:00 BST
const TOURNAMENT_END     = new Date('2026-07-19T20:00:00Z') // final
const REQUIRED_KNOCKOUT_PICKS = ALL_STAGES.reduce((total, stage) => total + (stage.matches?.length || 0), 0)


const VENUE_FLAGS = {
  'Mexico City': '🇲🇽', 'Guadalajara': '🇲🇽', 'Monterrey': '🇲🇽',
  'Toronto': '🇨🇦', 'Vancouver': '🇨🇦',
  'New York': '🇺🇸', 'New Jersey': '🇺🇸', 'New York/NJ': '🇺🇸', 'Los Angeles': '🇺🇸',
  'Dallas': '🇺🇸', 'Houston': '🇺🇸', 'San Francisco': '🇺🇸', 'Seattle': '🇺🇸',
  'Boston': '🇺🇸', 'Miami': '🇺🇸', 'Atlanta': '🇺🇸', 'Philadelphia': '🇺🇸', 'Kansas City': '🇺🇸',
}

const getVenueFlag = (city = '') => VENUE_FLAGS[city] || '🏟️'

const formatWeather = (weather) => {
  if (!weather) return null
  const temp = weather.temp_c ?? weather.temperature ?? weather.temp
  const condition = weather.condition || weather.text || ''
  const icon = weather.icon || weather.emoji || '🌤️'
  if (temp === undefined || temp === null) return condition ? `${icon} ${condition}` : null
  return `${icon} ${Math.round(Number(temp))}°C${condition ? ` · ${condition}` : ''}`
}

// Returns { label, style } for a coloured weather pill
const getWeatherPillStyle = (weather) => {
  if (!weather?.available) return null
  const temp = weather.temp_c
  const cond = (weather.condition || '').toLowerCase()
  if (temp >= 33) return { bg: 'rgba(230,81,0,0.12)', color: '#e65100' }
  if (temp >= 28) return { bg: 'rgba(245,124,0,0.12)', color: '#e65100' }
  if (cond.includes('thunder')) return { bg: 'rgba(94,53,177,0.12)', color: '#5e35b1' }
  if (cond.includes('rain') || cond.includes('drizzle')) return { bg: 'rgba(21,101,192,0.12)', color: '#1565c0' }
  if (cond.includes('cloud') || cond.includes('overcast')) return { bg: 'rgba(96,125,139,0.1)', color: 'var(--text-muted)' }
  return { bg: 'rgba(46,125,50,0.1)', color: '#2e7d32' }
}

function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState({})
  useEffect(() => {
    if (!targetDate) return
    const calc = () => {
      const diff = new Date(targetDate) - new Date()
      if (diff <= 0) return setTimeLeft({ started: true })
      setTimeLeft({
        started: false,
        days:    Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours:   Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      })
    }
    calc()
    const interval = setInterval(calc, 1000)
    return () => clearInterval(interval)
  }, [targetDate])
  return timeLeft
}

// ── Smart CTA logic ──────────────────────────────────────────────────────────
function getSmartCTA(user, profile, predictionCount, tournamentStarted, groupStageDone, koLive) {
  if (!user) return { label: '🏆 Start predicting free', to: '/register', secondary: { label: 'How does it work?', to: '/how-to-play' } }

  const groupsDone    = predictionCount >= 72
  const knockoutsDone = (profile?.knockout_picks_count || 0) >= REQUIRED_KNOCKOUT_PICKS
  const awardsDone    = (profile?.awards_done || 0) >= 4
  const jokersLeft    = profile?.jokers_group_remaining ?? 8

  if (!tournamentStarted) {
    if (predictionCount === 0)  return { label: '⚽ Start group predictions', to: '/predictions', secondary: { label: 'Step-by-step guide →', to: '/how-to-play' } }
    if (!groupsDone)            return { label: '⚽ Continue group predictions', to: '/predictions', secondary: { label: 'Finish groups first →', to: '/how-to-play' } }
    if (!knockoutsDone)         return { label: '🏆 Pick your knockout teams', to: '/knockout', secondary: { label: 'How to play →', to: '/how-to-play' } }
    if (!awardsDone)            return { label: '🏅 Make your award predictions', to: '/awards', secondary: { label: 'How to play →', to: '/how-to-play' } }
    if (jokersLeft > 0)         return { label: '🃏 Use your jokers before kickoff!', to: '/predictions', secondary: { label: '👥 Invite a friend to compete →', to: '/leagues' } }
    return { label: '✏️ Edit your predictions', to: '/predictions', secondary: { label: '👥 Create or join a league →', to: '/leagues' } }
  }

  if (koLive) {
    return { label: '🔥 Play KO Predictor', to: '/ko-predictor' }
  }

  if (!groupStageDone) {
    if (predictionCount === 0)  return { label: '⚽ Predict today\'s matches', to: '/predictions' }
    if (predictionCount >= 72)  return { label: '👥 View your leagues', to: '/leagues', secondary: { label: '📊 Leaderboard →', to: '/leaderboard' } }
    return { label: '⚽ Continue predicting', to: '/predictions' }
  }

  return { label: '📊 View leaderboard', to: '/leaderboard', secondary: { label: 'How to get points →', to: '/how-to-play' } }
}

export default function Home() {
  const { user, profile, isAdmin } = useAuthStore()
  const [nextMatch, setNextMatch]         = useState(null)
  const [liveLeaguePreds, setLiveLeaguePreds] = useState([]) // league members' picks for live match
  const [liveMatches, setLiveMatches]     = useState([])
  const { memberModal, setMemberModal, memberPredictions, memberReactions, loadingPreds, openProfile, groupPositionBreakdown } = useMemberPredictions()
  const [upcomingMatches, setUpcomingMatches] = useState([])
  const [topPredictors, setTopPredictors] = useState([])
  const [predictionCount, setPredictionCount] = useState(0)
  const [knockoutPickCount, setKnockoutPickCount] = useState(0)
  const [koOpenByData, setKoOpenByData] = useState(false) // true once first R32 match (M73) has both real teams
  const [awardPickCount, setAwardPickCount] = useState(0)
  const [jokerAssignedCount, setJokerAssignedCount] = useState(0)
  const [leaderPosition, setLeaderPosition]   = useState(null)
  const [loading, setLoading]             = useState(true)
  const [luckyDipping, setLuckyDipping]   = useState(false)
  const [showShareCard, setShowShareCard] = useState(false)
  const [shareCopied, setShareCopied]     = useState(false)
  const [luckyDone, setLuckyDone]         = useState(false)
  const [todayMatches, setTodayMatches]   = useState([])
  const [matchWeather, setMatchWeather]   = useState({})
  const [dailyQuestion, setDailyQuestion] = useState(null)
  const [imminentBracketLock, setImminentBracketLock] = useState(null)
  const [roundUpData, setRoundUpData] = useState(null) // post-match round-up
  const [userPredictions, setUserPredictions] = useState({}) // matchId -> {home, away}
  const roundUpCardRef = useRef(null)
  const [sharingRoundUp, setSharingRoundUp] = useState(false)
  const [myAnswer, setMyAnswer]           = useState(null)
  const [answerCounts, setAnswerCounts]   = useState({})
  const [answerSaving, setAnswerSaving]   = useState(false)
  const [numberInput, setNumberInput]     = useState('')
  const [myAnswerCorrect, setMyAnswerCorrect] = useState(null)
  const countdown = useCountdown(nextMatch?.kickoff_time)

  const now               = new Date()
  const { appSettings } = useAppStore()
  const phaseOverride = appSettings.game_phase_override || ''
  
  const tournamentStarted = phaseOverride
    ? ['group_stage','knockout_banner','ko_predictor','post_tournament'].includes(phaseOverride)
    : now >= TOURNAMENT_START
  const groupStageDone = phaseOverride
    ? ['ko_predictor','post_tournament'].includes(phaseOverride)
    : now >= GROUP_STAGE_END
  const showKnockoutBanner = phaseOverride
    ? ['knockout_banner','ko_predictor','post_tournament'].includes(phaseOverride)
    : (koOpenByData || now >= KNOCKOUT_BANNER)
  const knockoutLive = phaseOverride === 'ko_predictor'
    ? true
    : phaseOverride && phaseOverride !== 'ko_predictor' ? false
    : koOpenByData || now >= KNOCKOUT_LIVE
  const tournamentOver = phaseOverride === 'post_tournament' ? true : now >= TOURNAMENT_END

  useEffect(() => { loadData(); loadDailyQuestion(); loadRoundUp() }, [user])

  // The KO Predictor opens the moment the first R32 match (M73) has both real
  // teams — mirror that here so the home banner goes live at the same time the
  // page does, rather than waiting on a fixed date.
  useEffect(() => {
    let cancelled = false
    supabase.from('matches')
      .select('home_team_id, away_team_id')
      .eq('match_number', 73)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data?.home_team_id && data?.away_team_id) setKoOpenByData(true)
      })
    return () => { cancelled = true }
  }, [])

  // Load user predictions for live matches so we can show pick vs score
  useEffect(() => {
    if (!user || !liveMatches.length) return
    supabase.from('predictions')
      .select('match_id, home_score, away_score, is_confident')
      .eq('user_id', user.id)
      .in('match_id', liveMatches.map(m => m.id))
      .then(({ data }) => {
        const map = {}
        data?.forEach(p => { map[p.match_id] = { home: p.home_score, away: p.away_score, joker: p.is_confident } })
        setUserPredictions(map)
      })
  }, [liveMatches.map(m => m.id).join(',')])

  // Check for imminent bracket locks (within 3 hours)
  // Uses allMatchesRef populated during loadData
  useEffect(() => {
    const allMatches = [...(liveMatches || []), ...(todayMatches || []), nextMatch].filter(Boolean)
    if (!allMatches.length) return
    const now = new Date()
    const in3hrs = new Date(now.getTime() + 3 * 60 * 60 * 1000)
    const firstByGroup = {}
    allMatches.filter(m => m.stage === 'group').forEach(m => {
      const g = m.group?.name
      if (!g) return
      const t = new Date(m.kickoff_time)
      if (!firstByGroup[g] || t < firstByGroup[g].time) firstByGroup[g] = { time: t, match: m }
    })
    const next = Object.entries(firstByGroup)
      .filter(([, { time }]) => time > now && time <= in3hrs)
      .sort((a, b) => a[1].time - b[1].time)[0]
    setImminentBracketLock(next ? { group: next[0], ...next[1] } : null)
  }, [liveMatches, todayMatches, nextMatch])

  // Re-fetch when returning to tab so progress bars update immediately
  useEffect(() => {
    if (!user) return
    const handleVisibility = () => { if (!document.hidden) loadData() }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [user])

  useEffect(() => {
    const interval = setInterval(loadData, 60000)
    return () => clearInterval(interval)
  }, [user])

  useEffect(() => {
    const matchesToCheck = [nextMatch, ...liveMatches, ...todayMatches].filter(Boolean)
    if (!matchesToCheck.length) return

    // Deduplicate by id
    const seen = new Set()
    matchesToCheck.forEach(match => {
      if (!match?.id || !match?.venue?.city || matchWeather[match.id] || seen.has(match.id)) return
      seen.add(match.id)
      loadMatchWeather(match)
    })
  }, [nextMatch?.id, liveMatches.map(m => m.id).join('|'), todayMatches.map(m => m.id).join('|')])

  const loadMatchWeather = async (match) => {
    try {
      const params = new URLSearchParams({
        city: match.venue.city,
        kickoff: match.kickoff_time,
      })
      const res = await fetch(`/.netlify/functions/weather?${params.toString()}`)
      if (!res.ok) return
      const data = await res.json()
      if (!data?.available) return
      setMatchWeather(prev => ({ ...prev, [match.id]: data }))
    } catch (e) {
      // Weather is a nice-to-have; never block the home screen.
    }
  }

  const loadRoundUp = async () => {
    if (!user) return
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Get completed matches from last 24hrs
    const { data: recentMatches } = await supabase
      .from('matches')
      .select('id, match_number, kickoff_time, home_score, away_score, stage, home_team:home_team_id(name,flag_emoji,short_code), away_team:away_team_id(name,flag_emoji,short_code)')
      .eq('status', 'completed')
      .gte('kickoff_time', yesterday.toISOString())
      .lte('kickoff_time', now.toISOString())
      .order('kickoff_time', { ascending: false })

    if (!recentMatches?.length) return

    // Get user's predictions for these matches
    const { data: preds } = await supabase
      .from('predictions')
      .select('match_id, home_score, away_score, points_awarded, is_confident')
      .eq('user_id', user.id)
      .in('match_id', recentMatches.map(m => m.id))
      .not('home_score', 'is', null)

    if (!preds?.length) return

    const totalPts = preds.reduce((sum, p) => sum + (p.points_awarded || 0), 0)
    const correct = preds.filter(p => (p.points_awarded || 0) > 0).length
    const exact = preds.filter(p => {
      const match = recentMatches.find(m => m.id === p.match_id)
      return match && p.home_score === match.home_score && p.away_score === match.away_score
    })
    const jokerPaid = preds.filter(p => p.is_confident && (p.points_awarded || 0) > 0)
    const bestPred = exact[0] ? recentMatches.find(m => m.id === exact[0].match_id) : null

    setRoundUpData({
      matches: recentMatches,
      preds,
      totalPts,
      correct,
      exact: exact.length,
      jokerPaid: jokerPaid.length,
      bestMatch: bestPred,
      bestPred: exact[0],
    })
  }

  const loadDailyQuestion = async () => {
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    // Load today's live question OR yesterday's expired question (to show result)
    const { data: questions } = await supabase
      .from('daily_questions')
      .select('*')
      .in('scheduled_date', [today, yesterday])
      .in('status', ['live', 'expired'])
      .order('scheduled_date', { ascending: false })
      .limit(2)

    if (!questions?.length) return

    // Prefer today's live question; fall back to yesterday's expired one
    const q = questions.find(q => q.status === 'live') || questions[0]
    setDailyQuestion(q)

    // Get answer counts
    const { data: answers } = await supabase
      .from('daily_answers')
      .select('answer')
      .eq('question_id', q.id)

    const counts = {}
    answers?.forEach(a => { counts[a.answer] = (counts[a.answer] || 0) + 1 })
    setAnswerCounts(counts)

    // Get user's own answer
    if (user) {
      const { data: mine } = await supabase
        .from('daily_answers')
        .select('answer, is_correct')
        .eq('question_id', q.id)
        .eq('user_id', user.id)
        .single()
      if (mine) {
        setMyAnswer(mine.answer)
        setMyAnswerCorrect(mine.is_correct)
      }
    }
  }

  const loadData = async () => {
    try {
      const nowIso = new Date().toISOString()

      // Rolling 24-hour window from now — timezone-safe, always shows the right session
      // e.g. at 15:00 BST: catches 16:00, 19:00, 22:00, and 01:00 next morning kickoffs
      const windowStart = new Date() // now
      const windowEnd   = new Date(windowStart.getTime() + 24 * 60 * 60 * 1000)

      const [liveRes, liveFromKickoffRes, nextRes, upcomingRes, predictorRes, todayRes] = await Promise.all([
        supabase.from('matches')
          .select('*, home_team:home_team_id(name,flag_emoji,short_code), away_team:away_team_id(name,flag_emoji,short_code), venue:venue_id(city)')
          .eq('status', 'live').order('kickoff_time', { ascending: true }),

        // Also treat scheduled matches past kickoff as live (API slow to update)
        supabase.from('matches')
          .select('*, home_team:home_team_id(name,flag_emoji,short_code), away_team:away_team_id(name,flag_emoji,short_code), venue:venue_id(city)')
          .eq('status', 'scheduled')
          .lt('kickoff_time', nowIso)
          .gt('kickoff_time', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
          .order('kickoff_time', { ascending: true }),

        supabase.from('matches')
          .select('*, home_team:home_team_id(name,flag_emoji,short_code), away_team:away_team_id(name,flag_emoji,short_code), venue:venue_id(city)')
          .eq('status', 'scheduled').gt('kickoff_time', nowIso)
          .order('kickoff_time', { ascending: true }).limit(1).maybeSingle(),

        supabase.from('matches')
          .select('*, home_team:home_team_id(name,flag_emoji,short_code), away_team:away_team_id(name,flag_emoji,short_code), venue:venue_id(city)')
          .eq('status', 'scheduled').gt('kickoff_time', nowIso)
          .order('kickoff_time', { ascending: true }).range(1, 5),

        supabase.from('profiles')
          .select('id, username, total_points, streak_current')
          .order('total_points', { ascending: false }).limit(5),

        supabase.from('matches')
          .select('*, home_team:home_team_id(name,flag_emoji,short_code), away_team:away_team_id(name,flag_emoji,short_code), venue:venue_id(city)')
          .gte('kickoff_time', windowStart.toISOString())
          .lte('kickoff_time', windowEnd.toISOString())
          .order('kickoff_time', { ascending: true }),
      ])

      const allLive = [...(liveRes.data || []), ...(liveFromKickoffRes.data || [])]
      setLiveMatches(allLive)

      // Load league members' predictions for live match(es)
      if (allLive.length > 0 && user) {
        const liveMatchIds = allLive.map(m => m.id)
        // Get user's first league members
        const { data: myLeague } = await supabase
          .from('league_members')
          .select('league_id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle()
        if (myLeague) {
          const { data: members } = await supabase
            .from('league_members')
            .select('user_id, profile:user_id(display_name, username, avatar_emoji, avatar_color)')
            .eq('league_id', myLeague.league_id)
            .neq('user_id', user.id)
            .limit(20)
          if (members?.length) {
            const memberIds = members.map(m => m.user_id)
            const { data: preds } = await supabase
              .from('predictions')
              .select('user_id, match_id, home_score, away_score, is_confident, points_awarded')
              .in('match_id', liveMatchIds)
              .in('user_id', memberIds)
            // Merge predictions with member profiles
            const merged = members.map(m => ({
              ...m,
              preds: preds?.filter(p => p.user_id === m.user_id) || []
            })).filter(m => m.preds.length > 0)
            setLiveLeaguePreds(merged)
          }
        }
      }
      setNextMatch(nextRes.data || null)
      setUpcomingMatches(upcomingRes.data || [])
      setTopPredictors(predictorRes.data || [])
      setTodayMatches(todayRes.data || [])

      // Load user completion counts from source tables so Home doesn't rely on stale cached profile values.
      if (user) {
        const [
          freshProfileRes,
          groupCountRes,
          jokerCountRes,
          knockoutCountRes,
          awardCountRes,
          totalGoalsRes,
        ] = await Promise.all([
          supabase.from('profiles').select('*, rank_at_kickoff, rank_snapshot_taken_at').eq('id', user.id).maybeSingle(),
          supabase.from('predictions')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .not('home_score', 'is', null)
            .not('away_score', 'is', null),
          supabase.from('predictions')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_confident', true),
          supabase.from('knockout_picks')
            .select('match_number', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .not('winner_team_id', 'is', null),
          supabase.from('award_predictions')
            .select('award_type', { count: 'exact', head: true })
            .eq('user_id', user.id),
          supabase.from('tournament_predictions')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('prediction_type', 'total_goals')
            .not('int_value', 'is', null),
        ])

        const freshProfile = freshProfileRes.data
        if (freshProfile) useAuthStore.getState().setProfile(freshProfile)

        const groupCount = groupCountRes.count || 0
        const jokerCount = jokerCountRes.count || 0
        const koCount = knockoutCountRes.count || 0
        const awardsCount = (awardCountRes.count || 0) + (totalGoalsRes.count || 0)

        setPredictionCount(groupCount)
        setJokerAssignedCount(Math.min(8, jokerCount))
        setKnockoutPickCount(koCount)
        setAwardPickCount(awardsCount)

        // Repair cached profile counters used by other screens, but keep Home based on live counts above.
        await supabase.from('profiles')
          .update({
            total_predictions: groupCount,
            jokers_group_remaining: Math.max(0, 8 - jokerCount),
            knockout_picks_count: koCount,
            awards_done: awardsCount,
          })
          .eq('id', user.id)

        const pointsForRank = freshProfile?.total_points ?? profile?.total_points ?? 0
        if (pointsForRank > 0) {
          const { count: ahead } = await supabase.from('profiles')
            .select('*', { count: 'exact', head: true })
            .gt('total_points', pointsForRank)
          setLeaderPosition((ahead || 0) + 1)
        } else {
          setLeaderPosition(null)
        }
      } else {
        setPredictionCount(0)
        setJokerAssignedCount(0)
        setKnockoutPickCount(0)
        setAwardPickCount(0)
        setLeaderPosition(null)
      }
    } catch (error) {
      console.error('Home dashboard failed to load:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatKickoff = (time) => {
    const d = new Date(time)
    const tz = { timeZone: 'Europe/London' }
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', ...tz }) +
      ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', ...tz }) + ' BST'
  }

  const cta = getSmartCTA(user, profile, predictionCount, tournamentStarted, groupStageDone, knockoutLive)

  const groupsComplete = predictionCount >= 72
  const knockoutsComplete = knockoutPickCount >= REQUIRED_KNOCKOUT_PICKS
  const awardsComplete = awardPickCount >= 4
  const jokersAssigned = jokerAssignedCount
  const readyChecklist = [
    { label: 'Groups complete', done: groupsComplete },
    { label: 'Knockout Bracket complete', done: knockoutsComplete },
    { label: 'Awards complete', done: awardsComplete },
    { label: `${jokersAssigned}/8 jokers assigned`, done: jokersAssigned >= 8 },
  ]
  const readyForKickoff = readyChecklist.every(item => item.done)

  const handleShareApp = async () => {
    const url = window.location.origin
    const shareData = {
      title: 'WC26 Predictor',
      text: 'Join my World Cup 2026 predictor — pick every match, build your knockout bracket and compete with friends.',
      url,
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(url)
        setShareCopied(true)
        setTimeout(() => setShareCopied(false), 2200)
      }
    } catch (_) {
      // Native share was cancelled
    }
  }

  // ── Lucky Dip — fill everything in one tap ───────────────────────────────
  const submitAnswer = async (answer) => {
    if (!user || !dailyQuestion || myAnswer || answerSaving) return
    setAnswerSaving(true)
    setMyAnswer(answer)
    setAnswerCounts(prev => ({ ...prev, [answer]: (prev[answer] || 0) + 1 }))

    await supabase.from('daily_answers').upsert({
      question_id: dailyQuestion.id,
      user_id: user.id,
      answer,
    }, { onConflict: 'question_id,user_id' })

    // Update streak
    const today = new Date().toISOString().split('T')[0]
    const { data: prof } = await supabase.from('profiles').select('question_last_answered, question_streak').eq('id', user.id).single()
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const newStreak = prof?.question_last_answered === yesterday ? (prof.question_streak || 0) + 1 : 1
    await supabase.from('profiles').update({ question_streak: newStreak, question_last_answered: today }).eq('id', user.id)

    setAnswerSaving(false)
  }

  const handleLuckyDip = async () => {
    if (!user || luckyDipping || tournamentStarted) return
    setLuckyDipping(true)

    try {
      const [matchesRes, oddsRes, playersRes, existingPredsRes, existingAwardsRes, existingGoalsRes] = await Promise.all([
        supabase.from('matches')
          .select('*, home_team:home_team_id(id,name,flag_emoji,short_code,fifa_ranking), away_team:away_team_id(id,name,flag_emoji,short_code,fifa_ranking)')
          .eq('stage', 'group').order('kickoff_time', { ascending: true }),
        fetch('/.netlify/functions/get-odds').then(r => r.ok ? r.json() : []).catch(() => []),
        supabase.from('players').select('*, team:team_id(id,name,flag_emoji,short_code)').order('name'),
        supabase.from('predictions').select('match_id').eq('user_id', user.id),
        supabase.from('award_predictions').select('award_type').eq('user_id', user.id),
        supabase.from('tournament_predictions').select('prediction_type').eq('user_id', user.id),
      ])

      const matches = matchesRes.data || []
      const players = playersRes.data || []
      const now = new Date()

      const existingMatchIds = new Set((existingPredsRes.data || []).map(p => p.match_id))
      const existingAwardTypes = new Set((existingAwardsRes.data || []).map(p => p.award_type))
      const existingGoalTypes = new Set((existingGoalsRes.data || []).map(p => p.prediction_type))

      const oddsMap = {}
      oddsRes.forEach(g => { oddsMap[`${g.home_team}|${g.away_team}`] = g.odds })

      // Only fill unlocked matches without an existing prediction
      const toFill = matches.filter(m =>
        new Date(m.kickoff_time) > now && !existingMatchIds.has(m.id)
      )
      const predUpserts = toFill.map(m => {
        const score = predictMatchOdds(m, oddsMap)
        return { user_id: user.id, match_id: m.id, home_score: score.home, away_score: score.away, is_confident: false, bracket_type: 'main' }
      })
      for (let i = 0; i < predUpserts.length; i += 50) {
        await supabase.from('predictions').upsert(predUpserts.slice(i, i + 50), { onConflict: 'user_id,match_id,bracket_type' })
      }

      // Only fill missing goal sections
      const goals = predictGoals()
      const goalUpserts = [
        { prediction_type: 'total_goals', int_value: goals.totalGoals },
      ].filter(g => !existingGoalTypes.has(g.prediction_type)).map(g => ({ user_id: user.id, ...g }))
      if (goalUpserts.length) {
        await Promise.all(goalUpserts.map(u =>
          supabase.from('tournament_predictions').upsert(u, { onConflict: 'user_id,prediction_type,team_id' })
        ))
      }

      // Only fill missing awards
      const awards = predictAwards(players)
      const awardUpserts = Object.entries(awards)
        .filter(([type, player]) => player && !existingAwardTypes.has(type))
        .map(([type, player]) => ({
          user_id: user.id, award_type: type,
          predicted_player_name: player.name, predicted_team_id: player.team_id,
          bracket_type: 'main', is_locked: false,
        }))
      if (awardUpserts.length) {
        await supabase.from('award_predictions').upsert(awardUpserts, { onConflict: 'user_id,award_type,bracket_type' })
      }

      // Fill knockout picks if not already done
      const { data: existingKoPicks } = await supabase
        .from('knockout_picks').select('match_number').eq('user_id', user.id)
      const existingKoNums = new Set((existingKoPicks || []).map(p => p.match_number))

      if (existingKoNums.size < REQUIRED_KNOCKOUT_PICKS) {
        // Build predicted standings from group predictions
        const allGroupMatches = matches
        const { data: allPreds } = await supabase
          .from('predictions').select('match_id, home_score, away_score').eq('user_id', user.id)
        const predMap = {}
        ;(allPreds || []).forEach(p => { predMap[p.match_id] = { home: p.home_score, away: p.away_score } })
        const standings = calcPredictedStandings(allGroupMatches, predMap, true)
        const best3rd = getBest3rdTeams(standings) || []

        // Simulate knockout bracket randomly
        const koResults = {} // match_number -> winner team_id
        const getTeam = (slot) => {
          if (!slot) return null
          if (slot.startsWith('W')) {
            const num = parseInt(slot.replace('W', ''))
            return koResults[num] || null
          }
          return resolveSlot(slot, standings, allGroupMatches, predMap)
        }

        const koUpserts = []
        for (const stage of ALL_STAGES) {
          for (const matchDef of stage.matches) {
            if (existingKoNums.has(matchDef.match_number)) continue
            const home = getTeam(matchDef.home_slot)
            const away = getTeam(matchDef.away_slot)
            if (!home || !away) continue
            // Pick randomly weighted slightly toward home
            const winner = Math.random() > 0.5 ? home : away
            const winnerId = winner?.id
            if (!winnerId) continue
            koResults[matchDef.match_number] = winner
            koUpserts.push({
              user_id: user.id,
              match_number: matchDef.match_number,
              stage: matchDef.stage || stage.key,
              team_id: winnerId,
              winner_team_id: winnerId,
              home_team_id: home?.id,
              away_team_id: away?.id,
            })
          }
        }
        if (koUpserts.length) {
          for (let i = 0; i < koUpserts.length; i += 20) {
            await supabase.from('knockout_picks')
              .upsert(koUpserts.slice(i, i + 20), { onConflict: 'user_id,match_number' })
          }
          await supabase.from('profiles')
            .update({ knockout_picks_count: (existingKoNums.size + koUpserts.length) })
            .eq('id', user.id)
        }
      }

      setLuckyDone(true)
      setTimeout(() => { setLuckyDone(false); loadData() }, 2500)
    } catch (e) {
      console.error('Lucky dip failed:', e)
    }
    setLuckyDipping(false)
  }

  // ── Progress bar data ────────────────────────────────────────────────────
  // Bracket "done" uses the live count from knockout_picks. Note: the Knockout
  // page itself does full matchup-validity checking and will flag/reprompt any
  // stale picks there — Home links straight to it.
  const progressItems = user ? [
    { label: 'Groups', done: Math.min(predictionCount, 72), total: 72, to: '/predictions' },
    { label: 'Bracket', done: knockoutPickCount, total: REQUIRED_KNOCKOUT_PICKS, to: '/knockout' },
    { label: 'Awards', done: awardPickCount, total: 4, to: '/awards' },
  ] : []

  const firstGroupPickMade = user && predictionCount > 0
  const showFirstTimeGuide = !loading && user && !firstGroupPickMade

  // ── Hero subtitle ─────────────────────────────────────────────────────────
  const heroSubtitle = tournamentOver
    ? 'Thanks for playing — see you next time! 🏆'
    : groupStageDone
    ? 'Group stage complete — knockout stage underway!'
    : tournamentStarted
    ? 'Group stage underway · Groups lock when first match kicks off'
    : user
    ? 'Predict every match. Compete with friends. Glory awaits.'
    : 'Predict all 104 matches, build your knockout bracket, pick awards and compete with friends.'

  // ── Countdown target ──────────────────────────────────────────────────────
  // Pre-tournament: count down to tournament start, not just next match
  const countdownTarget = !tournamentStarted ? TOURNAMENT_START.toISOString() : nextMatch?.kickoff_time
  const mainCountdown = useCountdown(countdownTarget)

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>


      {/* Points maintenance banner */}
      {appSettings?.points_maintenance === 'true' && !isAdmin && (
        <div style={{
          background: '#b8860b', color: 'white',
          padding: '10px 16px', textAlign: 'center',
          fontSize: '13px', fontWeight: '600',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
        }}>
          🔧 Points are being updated — scores will be back shortly!
        </div>
      )}

      {/* ── Hero ── */}
      <div style={{
        position: 'relative',
        background: 'linear-gradient(135deg, rgba(0,30,80,0.84) 0%, rgba(0,60,140,0.80) 60%, rgba(0,30,80,0.84) 100%), url(/hero-bg.jpg) center/cover no-repeat',
        padding: '38px 20px 34px', textAlign: 'center', color: 'white',
        overflow: 'hidden',
      }}>
        {/* Woven saltire — ambient Scottish identity, subtle structural bands */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.5 }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', width: '220%', height: '13px', background: 'rgba(255,255,255,0.05)', transform: 'translate(-50%,-50%) rotate(27deg)' }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', width: '220%', height: '13px', background: 'rgba(255,255,255,0.05)', transform: 'translate(-50%,-50%) rotate(-27deg)' }} />
        </div>

        <div style={{ position: 'relative', maxWidth: '600px', margin: '0 auto' }}>
          {/* Dynamic eyebrow — navigational, tells you where you are */}
          <div style={{ fontSize: 'var(--t-tiny)', fontWeight: '700', letterSpacing: '0.14em', marginBottom: '10px', textTransform: 'uppercase',
            color: liveMatches.length > 0 ? '#ef5350' : 'var(--accent-green)',
          }}>
            {liveMatches.length > 0 ? '🔴 Live · FIFA World Cup 2026' : tournamentOver ? '🏆 FIFA World Cup 2026' : '🏴󠁧󠁢󠁳󠁣󠁴󠁿 FIFA World Cup 2026'}
          </div>

          <h1 style={{ fontSize: 'clamp(26px, 6vw, 44px)', fontWeight: '800', letterSpacing: '-0.025em', marginBottom: '10px', lineHeight: 1.08 }}>
            WC26 Predictor
          </h1>

          <p style={{ color: 'rgba(255,255,255,0.62)', fontSize: 'var(--t-small)', marginBottom: '24px', maxWidth: '34ch', marginLeft: 'auto', marginRight: 'auto' }}>
            {heroSubtitle}
          </p>

          {/* Smart CTA */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            {loading ? (
              <div style={{
                background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.82)',
                border: '1px solid rgba(255,255,255,0.18)',
                padding: '13px 24px', borderRadius: 'var(--radius-lg)',
                fontSize: '15px', fontWeight: '700',
              }}>
                Loading your tournament dashboard…
              </div>
            ) : user ? (
              <>
                <Link to={cta.to} className="btn btn-green btn-lg">{cta.label}</Link>
                {cta.secondary && (
                  <Link to={cta.secondary.to} style={{ color: 'rgba(255,255,255,0.75)', fontSize: '13px', textDecoration: 'none' }}>
                    {cta.secondary.label}
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link to="/register" className="btn btn-green btn-lg">🏆 Join Free</Link>
                <Link to="/login" style={{
                  background: 'rgba(255,255,255,0.1)', color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  padding: '14px 28px', borderRadius: 'var(--radius-lg)',
                  fontSize: '16px', fontWeight: '600', textDecoration: 'none',
                  display: 'inline-flex', alignItems: 'center',
                }}>Sign in</Link>
              </>
            )}
          </div>

          {/* Lucky Dip — show pre-tournament only when predictions incomplete */}
          {!loading && user && !tournamentStarted && predictionCount < 72 && (
            <div style={{ marginTop: '12px' }}>
              <button
                onClick={handleLuckyDip}
                disabled={luckyDipping || luckyDone}
                style={{
                  background: luckyDone ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.08)',
                  border: `1px solid ${luckyDone ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.2)'}`,
                  color: luckyDone ? '#4ade80' : 'rgba(255,255,255,0.7)',
                  padding: '10px 24px', borderRadius: 'var(--radius-full)',
                  fontSize: '14px', fontWeight: '600', cursor: luckyDipping ? 'wait' : 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  transition: 'all 0.2s',
                }}
              >
                {luckyDipping ? (
                  <><div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> Filling the gaps...</>
                ) : luckyDone ? (
                  <>✓ All done — good luck!</>
                ) : predictionCount === 0 ? (
                  <>🎲 Feeling Lucky? Fill everything in one tap</>
                ) : (
                  <>🎲 Feeling Lucky? Fill the rest</>
                )}
              </button>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '6px' }}>
                {predictionCount === 0
                  ? 'Uses odds & rankings · everyone gets different results'
                  : 'Only fills what\'s missing · won\'t overwrite your picks'}
              </div>
            </div>
          )}

          {/* Prediction progress bar — logged in only */}
          {!loading && user && progressItems.length > 0 && (
            <div style={{ marginTop: '24px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
              {progressItems.map(({ label, done, total, to }) => {
                const pct = Math.round((done / total) * 100)
                const complete = done >= total
                return (
                  <Link key={label} to={to} style={{ textDecoration: 'none', flex: 1, maxWidth: '120px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '600', color: complete ? '#4ade80' : 'rgba(255,255,255,0.5)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {complete ? '✓ ' : ''}{label}
                    </div>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.15)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: complete ? '#4ade80' : 'var(--accent-green)', borderRadius: '2px', transition: 'width 0.4s ease' }} />
                    </div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '3px' }}>{done}/{total}</div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Stats Bar — only useful once the tournament is live ── */}
      {tournamentStarted && (
        <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)', padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', maxWidth: '500px', margin: '0 auto' }}>
            {[
              { label: 'Teams', value: '48' },
              { label: 'Matches', value: '104' },
              tournamentStarted
                ? { label: 'Today', value: `${todayMatches.length || 0} games` }
                : { label: 'Kick off', value: '11 Jun' },
              { label: 'Final', value: '19 Jul' },
            ].map(({ label, value }, i, arr) => (
              <div key={label} style={{
                textAlign: 'center', flex: 1,
                borderRight: i < arr.length - 1 ? '1px solid var(--border-light)' : 'none',
                padding: '0 8px',
              }}>
                <div style={{ fontWeight: '900', fontSize: '17px', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', letterSpacing: '-0.02em' }}>{value}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '500', marginTop: '3px' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="container" style={{ padding: '20px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>

          {/* ── Post-kickoff: Next Match countdown → flips to LIVE when it starts ── */}
          {!loading && tournamentStarted && (liveMatches.length > 0 || nextMatch) && (
            <div className="card fade-in" style={{
              overflow: 'hidden',
              border: liveMatches.length > 0 ? '2px solid #e53935' : '1px solid rgba(0,48,135,0.16)',
              padding: '18px 16px',
            }}>
              {liveMatches.length > 0 ? (
                /* ── LIVE STATE ── */
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ background: '#e53935', color: 'white', fontSize: '11px', fontWeight: '800', padding: '3px 8px', borderRadius: 'var(--radius-full)', letterSpacing: '0.08em', animation: 'pulse 2s infinite' }}>🔴 LIVE</span>
                      <span style={{ fontWeight: '700', fontSize: '13px' }}>{liveMatches.length === 1 ? 'Match in Progress' : `${liveMatches.length} Matches in Progress`}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Updates every 60s</span>
                  </div>
                  {liveMatches.map(match => {
                    const pred = userPredictions[match.id]
                    const predHome = pred?.home ?? null
                    const predAway = pred?.away ?? null
                    const onTrack = predHome !== null && (
                      (predHome > predAway && match.home_score > match.away_score) ||
                      (predHome < predAway && match.home_score < match.away_score) ||
                      (predHome === predAway && match.home_score === match.away_score)
                    )
                    return (
                      <div key={match.id} style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '14px 16px', border: '1px solid rgba(229,57,53,0.2)' }}>
                        {match.venue?.city && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px', textAlign: 'center', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {getVenueFlag(match.venue.city)} {match.venue.city}{formatWeather(matchWeather[match.id]) ? ` · ${formatWeather(matchWeather[match.id])}` : ''}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
                            <span style={{ fontSize: '32px', lineHeight: 1 }}>{match.home_team?.flag_emoji}</span>
                            <span style={{ fontWeight: '800', fontSize: '13px', textAlign: 'center' }}>{match.home_team?.short_code}</span>
                          </div>
                          <div style={{ textAlign: 'center', minWidth: '80px' }}>
                            <div style={{ fontSize: '30px', fontWeight: '900', fontFamily: 'var(--font-mono)', lineHeight: 1, whiteSpace: 'nowrap' }}>
                              {(match.home_score != null && match.away_score != null)
                                ? `${match.home_score} – ${match.away_score}`
                                : match.status === 'live' ? '0 – 0' : '– –'}
                            </div>
                            <div style={{ fontSize: '10px', color: '#e53935', fontWeight: '700', marginTop: '4px' }}>
                              {match.live_minute != null
                                ? `● ${match.live_minute}${match.injury_time ? `+${match.injury_time}` : ''}'`
                                : '● LIVE'}
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
                            <span style={{ fontSize: '32px', lineHeight: 1 }}>{match.away_team?.flag_emoji}</span>
                            <span style={{ fontWeight: '800', fontSize: '13px', textAlign: 'center' }}>{match.away_team?.short_code}</span>
                          </div>
                        </div>
                        {predHome !== null && (
                          <div style={{ marginTop: '10px', padding: '6px 10px', background: onTrack ? 'rgba(0,122,51,0.08)' : 'rgba(198,40,40,0.06)', borderRadius: 'var(--radius-sm)', border: `1px solid ${onTrack ? 'rgba(0,122,51,0.2)' : 'rgba(198,40,40,0.12)'}`, textAlign: 'center' }}>
                            <span style={{ fontSize: '12px', fontWeight: '700', color: onTrack ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                              Your pick: {predHome}–{predAway} {pred?.joker ? '🃏 · 2× pts' : ''} · {onTrack ? '✓ On track' : '✗ Off track'}
                            </span>
                          </div>
                        )}
                        <Link to={`/match/${match.id}/stats`} style={{
                          display: 'block', marginTop: '10px', padding: '8px',
                          background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-light)', textAlign: 'center',
                          fontSize: '12px', fontWeight: '700', color: 'var(--scottish-navy)',
                          textDecoration: 'none',
                        }}>
                          📊 Full match stats →
                        </Link>
                      </div>
                    )
                  })}
                </>
              ) : nextMatch ? (
                /* ── COUNTDOWN STATE ── */
                <>
                  <div style={{ height: '4px', background: 'var(--scottish-navy)', marginBottom: '16px', borderRadius: 'var(--radius-full)' }} />
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '900', color: 'var(--scottish-navy)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
                      ⏱ Next match in
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                      {[
                        { label: 'Days', value: mainCountdown.days ?? 0 },
                        { label: 'Hours', value: mainCountdown.hours ?? 0 },
                        { label: 'Mins', value: mainCountdown.minutes ?? 0 },
                        { label: 'Secs', value: mainCountdown.seconds ?? 0 },
                      ].map(item => (
                        <div key={item.label} style={{ textAlign: 'center', padding: '10px 4px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                          <div style={{ fontWeight: '900', fontSize: 'clamp(24px, 7vw, 36px)', lineHeight: 1, fontFamily: 'var(--font-mono)', color: 'var(--scottish-navy)', letterSpacing: '-0.04em' }}>
                            {String(item.value).padStart(2, '0')}
                          </div>
                          <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '6px' }}>{item.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ fontWeight: '800', fontSize: '14px' }}>
                        ⚽ {nextMatch.group ? `Group ${nextMatch.group.name}` : nextMatch.stage?.toUpperCase()}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700' }}>{formatKickoff(nextMatch.kickoff_time)}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
                        <span style={{ fontSize: '36px', lineHeight: 1 }}>{nextMatch.home_team?.flag_emoji}</span>
                        <span style={{ fontWeight: '800', fontSize: '14px', textAlign: 'center', lineHeight: 1.2 }}>{nextMatch.home_team?.name}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '900' }}>vs</div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
                        <span style={{ fontSize: '36px', lineHeight: 1 }}>{nextMatch.away_team?.flag_emoji}</span>
                        <span style={{ fontWeight: '800', fontSize: '14px', textAlign: 'center', lineHeight: 1.2 }}>{nextMatch.away_team?.name}</span>
                      </div>
                    </div>
                    {nextMatch.venue?.city && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '10px', fontWeight: '600' }}>
                        {getVenueFlag(nextMatch.venue.city)} {nextMatch.venue.city}
                        {formatWeather(matchWeather[nextMatch.id]) && <span> · {formatWeather(matchWeather[nextMatch.id])}</span>}
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* ── League picks for live match ── */}
          {liveMatches.length > 0 && liveLeaguePreds.length > 0 && (
            <div className="card fade-in" style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                👥 Your league's picks
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {liveLeaguePreds.map(member => {
                  const name = member.profile?.display_name || member.profile?.username || '?'
                  const initials = name.slice(0, 1).toUpperCase()
                  const avatarColor = member.profile?.avatar_color || '#003087'
                  return liveMatches.map(match => {
                    const pred = member.preds.find(p => p.match_id === match.id)
                    if (!pred) return null
                    const liveH = match.home_score ?? 0
                    const liveA = match.away_score ?? 0
                    const predH = pred.home_score
                    const predA = pred.away_score
                    const onTrack = predH != null && (
                      (predH > predA && liveH > liveA) ||
                      (predH < predA && liveH < liveA) ||
                      (predH === predA && liveH === liveA)
                    )
                    const pts = pred.points_awarded
                    return (
                      <div key={`${member.user_id}-${match.id}`}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Avatar */}
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', color: 'white', flexShrink: 0 }}>
                          {member.profile?.avatar_emoji || initials}
                        </div>
                        {/* Name */}
                        <span style={{ fontSize: '12px', fontWeight: '600', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {name}
                        </span>
                        {/* Their pick */}
                        <span style={{ fontSize: '13px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: pts != null ? (pts > 0 ? 'var(--accent-green)' : 'var(--accent-red)') : onTrack ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                          {predH != null ? `${predH}–${predA}` : '?'}{pred.is_confident ? ' 🃏' : ''}
                        </span>
                        {/* On track indicator */}
                        <span style={{ fontSize: '10px', color: onTrack ? 'var(--accent-green)' : 'var(--text-muted)', flexShrink: 0 }}>
                          {pts != null ? `${pts}pts` : predH != null ? (onTrack ? '✓' : '✗') : ''}
                        </span>
                      </div>
                    )
                  })
                })}
              </div>
            </div>
          )}

          {/* ── Tournament countdown / opening match — pre-tournament ── */}
          {!loading && !tournamentStarted && nextMatch && (
            <div className="card fade-in" style={{ overflow: 'hidden', border: '1px solid rgba(0,48,135,0.16)', padding: '22px 18px' }}>
              <div style={{ height: '5px', background: 'var(--scottish-navy)', marginBottom: '20px', borderRadius: 'var(--radius-full)' }} />

              <div style={{ textAlign: 'center', marginBottom: '22px' }}>
                <div style={{ fontSize: '13px', fontWeight: '900', color: 'var(--scottish-navy)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>
                  ⏱ World Cup kicks off in
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '8px' }}>
                  {[
                    { label: 'Days', value: mainCountdown.days ?? 0 },
                    { label: 'Hours', value: mainCountdown.hours ?? 0 },
                    { label: 'Mins', value: mainCountdown.minutes ?? 0 },
                    { label: 'Secs', value: mainCountdown.seconds ?? 0 },
                  ].map(item => (
                    <div key={item.label} style={{ textAlign: 'center', padding: '12px 6px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
                      <div style={{ fontWeight: '900', fontSize: 'clamp(28px, 8vw, 42px)', lineHeight: 1, fontFamily: 'var(--font-mono)', color: 'var(--scottish-navy)', letterSpacing: '-0.04em' }}>
                        {String(item.value).padStart(2, '0')}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '8px' }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '12px' }}>
                  <div style={{ fontWeight: '900', fontSize: '16px' }}>⚽ Opening Match</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textAlign: 'right' }}>{formatKickoff(nextMatch.kickoff_time)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '38px', lineHeight: 1 }}>{nextMatch.home_team?.flag_emoji}</span>
                    <span style={{ fontWeight: '900', fontSize: '15px', textAlign: 'center', lineHeight: 1.15 }}>{nextMatch.home_team?.name}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '900' }}>vs</div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '38px', lineHeight: 1 }}>{nextMatch.away_team?.flag_emoji}</span>
                    <span style={{ fontWeight: '900', fontSize: '15px', textAlign: 'center', lineHeight: 1.15 }}>{nextMatch.away_team?.name}</span>
                  </div>
                </div>
                {nextMatch.venue?.city && (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '12px', fontWeight: '700' }}>
                    {getVenueFlag(nextMatch.venue.city)} {nextMatch.venue.city}
                    {formatWeather(matchWeather[nextMatch.id]) && <span> · {formatWeather(matchWeather[nextMatch.id])}</span>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Matchday round-up share card ── */}
          {roundUpData && user && tournamentStarted && roundUpData.totalPts > 0 && (() => {
            const { totalPts, correct, exact, jokerPaid, bestMatch, matches, preds } = roundUpData
            const shareText = () => {
              const lines = [
                `⚽ WC26 Predictor — Last 24hrs Round-Up`,
                ``,
                `${profile?.display_name || profile?.username}`,
                `+${totalPts}pts · ${correct}/${preds.length} correct${exact > 0 ? ` · ${exact} exact 🎯` : ''}`,
                jokerPaid > 0 ? `🃏 Joker paid off!` : '',
                bestMatch ? `⭐ Best pick: ${bestMatch.home_team?.flag_emoji}${bestMatch.home_team?.short_code} ${bestMatch.home_score}–${bestMatch.away_score} ${bestMatch.away_team?.short_code}${bestMatch.away_team?.flag_emoji}` : '',
                ``,
                `Current rank: #${leaderPosition || '?'}`,
                ``,
                `wc26predictor1.netlify.app`,
              ].filter(Boolean).join(String.fromCharCode(10))
              return lines
            }

            return (
              <div ref={roundUpCardRef} className="card fade-in" style={{ overflow: 'hidden', background: 'var(--scottish-navy)', color: 'white' }}>
                <div style={{ height: '4px', background: 'var(--accent-gold)', marginBottom: '14px', borderRadius: 'var(--radius-full)' }} />
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
                  <span style={{ fontSize: '28px', flexShrink: 0 }}>⚽</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '900', fontSize: '16px', marginBottom: '2px' }}>
                      +{totalPts}pts in the last 24hrs
                    </div>
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)' }}>
                      {correct}/{preds.length} correct
                      {exact > 0 ? ` · ${exact} exact score${exact > 1 ? 's' : ''} 🎯` : ''}
                      {jokerPaid > 0 ? ` · 🃏 joker paid off!` : ''}
                    </div>
                    {bestMatch && (
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
                        ⭐ {bestMatch.home_team?.flag_emoji}{bestMatch.home_team?.short_code} {bestMatch.home_score}–{bestMatch.away_score} {bestMatch.away_team?.short_code}{bestMatch.away_team?.flag_emoji}
                      </div>
                    )}
                  </div>
                  {leaderPosition && (
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: '900', fontSize: '22px', color: 'var(--accent-gold)' }}>#{leaderPosition}</div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rank</div>
                    </div>
                  )}
                </div>
                {/* Branding footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '14px' }}>🏴󠁧󠁢󠁳󠁣󠁴󠁿</span>
                    <span style={{ fontWeight: '800', fontSize: '12px', color: 'var(--accent-gold)' }}>WC26 Predictor</span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>wc26predictor1.netlify.app</span>
                </div>

                {/* Share button — hidden during capture */}
                <div style={{ display: sharingRoundUp ? 'none' : 'block' }}>
                <button
                  onClick={async () => {
                    setSharingRoundUp(true)
                    try {
                      const html2canvas = (await import('html2canvas')).default
                      const canvas = await html2canvas(roundUpCardRef.current, {
                        scale: 2, backgroundColor: '#003087', useCORS: true, logging: false,
                      })
                      canvas.toBlob(async (blob) => {
                        const file = new File([blob], 'wc26-score.png', { type: 'image/png' })
                        if (navigator.share && navigator.canShare({ files: [file] })) {
                          await navigator.share({
                            title: 'My WC26 Score',
                            text: 'Make your own predictions at wc26predictor1.netlify.app',
                            files: [file],
                          })
                        } else {
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url; a.download = 'wc26-score.png'; a.click()
                          URL.revokeObjectURL(url)
                        }
                        setSharingRoundUp(false)
                      }, 'image/png')
                    } catch (e) { setSharingRoundUp(false) }
                  }}
                  disabled={sharingRoundUp}
                  style={{ width: '100%', padding: '11px', background: 'var(--accent-gold)', color: 'white', border: 'none', borderRadius: 'var(--radius-full)', fontWeight: '800', fontSize: '14px', cursor: sharingRoundUp ? 'wait' : 'pointer', opacity: sharingRoundUp ? 0.7 : 1 }}>
                  {sharingRoundUp ? '⏳ Generating...' : '📤 Share my score'}
                </button>
                </div>
              </div>
            )
          })()}

          {/* ── Imminent bracket lock warning ── */}
          {user && imminentBracketLock && (() => {
            const { group, time, match } = imminentBracketLock
            const hoursLeft = Math.floor((time - new Date()) / (1000 * 60 * 60))
            const minsLeft = Math.floor((time - new Date()) / (1000 * 60)) % 60
            const timeStr = time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' })
            const urgent = hoursLeft < 1
            return (
              <div className="card fade-in" style={{ overflow: 'hidden', border: `2px solid ${urgent ? '#e53935' : 'var(--accent-gold)'}` }}>
                <div style={{ height: '4px', background: urgent ? '#e53935' : 'var(--accent-gold)', marginBottom: '12px', borderRadius: 'var(--radius-full)' }} />
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ fontSize: '24px', flexShrink: 0 }}>{urgent ? '🚨' : '⏰'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '800', fontSize: '14px', marginBottom: '3px', color: urgent ? '#e53935' : 'var(--text-primary)' }}>
                      Group {group} bracket locks in {hoursLeft > 0 ? `${hoursLeft}h ${minsLeft}m` : `${minsLeft} mins`}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: 1.4 }}>
                      {match.home_team?.flag_emoji}{match.home_team?.short_code} vs {match.away_team?.short_code}{match.away_team?.flag_emoji} kicks off {timeStr} BST — your Round of 32 picks from Group {group} lock then.
                    </div>
                    <Link to="/knockout" style={{ display: 'inline-block', background: urgent ? '#e53935' : 'var(--scottish-navy)', color: 'white', borderRadius: 'var(--radius-full)', padding: '7px 16px', fontSize: '12px', fontWeight: '700', textDecoration: 'none' }}>
                      Check bracket →
                    </Link>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* ── Daily Question ── */}
          {dailyQuestion && user && (() => {
            const total = Object.values(answerCounts).reduce((a, b) => a + b, 0)
            const options = dailyQuestion.type === 'yes_no'
              ? ['Yes', 'No']
              : dailyQuestion.type === 'multiple_choice'
              ? (dailyQuestion.options || [])
              : null

            return (
              <div className="card fade-in" style={{ overflow: 'hidden', marginBottom: '4px' }}>
                <div style={{ height: '4px', background: 'var(--scottish-navy)', marginBottom: '14px', borderRadius: 'var(--radius-full)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '18px' }}>❓</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: '800', fontSize: '15px' }}>
                      {dailyQuestion.status === 'expired' ? "Yesterday's Question" : "Today's Question"}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px', fontWeight: '500' }}>No leaderboard points · just for fun</span>
                  </div>
                  {myAnswer && myAnswerCorrect === null && <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent-green)' }}>✓ Answered</span>}
                  {myAnswer && myAnswerCorrect === true && <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent-green)', marginLeft: 'auto' }}>✅ Correct!</span>}
                  {myAnswer && myAnswerCorrect === false && <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent-red)', marginLeft: 'auto' }}>❌ Wrong</span>}
                  {dailyQuestion.status === 'expired' && dailyQuestion.correct_answer && (
                    <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--scottish-navy)', marginLeft: myAnswer ? '4px' : 'auto' }}>
                      Answer: {dailyQuestion.correct_answer}
                    </span>
                  )}
                </div>
                <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '14px', lineHeight: 1.4 }}>
                  {dailyQuestion.question}
                </div>

                {/* Yes/No or Multiple Choice */}
                {options && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {options.map(opt => {
                      const count = answerCounts[opt] || 0
                      const pct = total > 0 ? Math.round((count / total) * 100) : 0
                      const isMyAnswer = myAnswer === opt
                      return (
                        <button key={opt}
                          onClick={() => !myAnswer && submitAnswer(opt)}
                          disabled={!!myAnswer}
                          style={{
                            position: 'relative', overflow: 'hidden',
                            padding: '10px 14px', borderRadius: 'var(--radius-md)',
                            border: isMyAnswer ? '2px solid var(--scottish-navy)' : '1px solid var(--border-light)',
                            background: myAnswer ? 'var(--bg-secondary)' : 'var(--bg-secondary)',
                            cursor: myAnswer ? 'default' : 'pointer',
                            textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          }}>
                          {/* Progress bar behind */}
                          {myAnswer && (
                            <div style={{
                              position: 'absolute', left: 0, top: 0, bottom: 0,
                              width: `${pct}%`,
                              background: isMyAnswer ? 'rgba(0,56,168,0.12)' : 'rgba(0,0,0,0.04)',
                              transition: 'width 0.6s ease',
                            }} />
                          )}
                          <span style={{ fontWeight: isMyAnswer ? '700' : '500', fontSize: '14px', position: 'relative' }}>
                            {isMyAnswer && '✓ '}
                            {dailyQuestion.status === 'expired' && dailyQuestion.correct_answer === opt && '✅ '}
                            {opt}
                          </span>
                          {myAnswer && (
                            <span style={{ fontWeight: '700', fontSize: '13px', color: isMyAnswer ? 'var(--scottish-navy)' : 'var(--text-muted)', position: 'relative' }}>
                              {pct}%
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Number input */}
                {dailyQuestion.type === 'number' && !myAnswer && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input className="input" type="number" min="0" value={numberInput}
                      onChange={e => setNumberInput(e.target.value)}
                      placeholder="Enter your number"
                      style={{ flex: 1 }} />
                    <button onClick={() => numberInput !== '' && submitAnswer(numberInput)}
                      disabled={numberInput === '' || answerSaving}
                      className="btn btn-primary">Submit</button>
                  </div>
                )}

                {/* Number result */}
                {dailyQuestion.type === 'number' && myAnswer && (
                  <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', fontSize: '14px' }}>
                    <span style={{ fontWeight: '700' }}>Your answer: {myAnswer}</span>
                    {total > 1 && (
                      <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>
                        · Community average: {(Object.entries(answerCounts).reduce((sum, [k, v]) => sum + parseFloat(k) * v, 0) / total).toFixed(1)}
                        &nbsp;({total} answers)
                      </span>
                    )}
                  </div>
                )}

                {myAnswer && total > 0 && dailyQuestion.type !== 'number' && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'right' }}>
                    {total} answer{total !== 1 ? 's' : ''} so far
                  </div>
                )}
              </div>
            )
          })()}

          {/* ── Late joiner banner ── */}
          {/* ── Bracket-corrected review notice: users who COMPLETED their
               bracket before the FIFA structure fix won't see the incomplete
               warning, so prompt them to review M86-88 + third-place matchups.
               Shows pre-lock only; picks are editable until groups kick off. ── */}
          {user && profile && !tournamentStarted && knockoutsComplete && localStorage.getItem('bracketReviewDismissed') !== '1' && (
            <div className="card fade-in" style={{ overflow: 'hidden', border: '2px solid var(--accent-blue)', position: 'relative' }}>
              <button onClick={(e) => { localStorage.setItem('bracketReviewDismissed', '1'); e.currentTarget.closest('.card').style.display = 'none' }}
                aria-label="Dismiss" style={{ position: 'absolute', top: '8px', right: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--text-muted)' }}>✕</button>
              <div style={{ height: '4px', background: 'var(--accent-blue)', marginBottom: '12px', borderRadius: 'var(--radius-full)' }} />
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '24px', flexShrink: 0 }}>🔁</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '800', fontSize: '14px', marginBottom: '3px' }}>Bracket corrected to official FIFA structure</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: 1.4 }}>
                    Your picks are all saved, but matchups for a few Round of 32 games (incl. M86–M88) changed to match FIFA's real bracket. Worth a quick review before it locks at kickoff.
                  </div>
                  <Link to="/knockout" onClick={() => localStorage.setItem('bracketReviewDismissed', '1')} className="btn btn-sm" style={{ background: 'var(--accent-blue)', color: 'white', fontWeight: '700' }}>Review bracket →</Link>
                </div>
              </div>
            </div>
          )}

          {/* ── Incomplete bracket warning ── */}
          {user && profile && !tournamentStarted && predictionCount >= 10 && !knockoutsComplete && (
            <div className="card fade-in" style={{ overflow: 'hidden', border: '2px solid var(--accent-gold)' }}>
              <div style={{ height: '4px', background: 'var(--accent-gold)', marginBottom: '12px', borderRadius: 'var(--radius-full)' }} />
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '24px', flexShrink: 0 }}>⚠️</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '800', fontSize: '14px', marginBottom: '3px' }}>Knockout Bracket incomplete</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: 1.4 }}>
                    You've done your group predictions but haven't finished your knockout bracket. It locks when groups kick off — complete it before Thursday!
                  </div>
                  <Link to="/knockout" style={{ display: 'inline-block', background: 'var(--scottish-navy)', color: 'white', borderRadius: 'var(--radius-full)', padding: '7px 16px', fontSize: '12px', fontWeight: '700', textDecoration: 'none' }}>
                    Complete bracket →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {user && profile && tournamentStarted && predictionCount < 10 && (
            <div className="card fade-in" style={{ overflow: 'hidden', border: '2px solid #e65100' }}>
              <div style={{ height: '4px', background: '#e65100', marginBottom: '14px', borderRadius: 'var(--radius-full)' }} />
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '28px', flexShrink: 0 }}>🔥</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: '4px' }}>
                    Joined late? KO Predictor is your fresh start
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '12px' }}>
                    The KO Predictor opens once the Round of 32 teams are confirmed — everyone starts at 0pts regardless of the group stage. You'll be on equal footing with everyone.
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', padding: '4px 10px', background: 'rgba(230,81,0,0.1)', borderRadius: 'var(--radius-full)', color: '#e65100' }}>
                      🏆 Separate leaderboard
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: '700', padding: '4px 10px', background: 'rgba(230,81,0,0.1)', borderRadius: 'var(--radius-full)', color: '#e65100' }}>
                      ⚡ Fresh start for all
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: '700', padding: '4px 10px', background: 'rgba(230,81,0,0.1)', borderRadius: 'var(--radius-full)', color: '#e65100' }}>
                      📅 Opens ~28 Jun
                    </div>
                  </div>
                  {predictionCount === 0 && (
                    <div style={{ marginTop: '12px', padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      💡 Some group matches may still be open — check the Groups tab to predict what you can. Every point counts!
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Invite friends / app share card ── */}
          {user && !tournamentStarted && (
            <div className="card fade-in" style={{ overflow: 'hidden' }}>
              <div style={{ height: '4px', background: 'var(--accent-gold)', marginBottom: '14px', borderRadius: 'var(--radius-full)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ fontSize: '32px', flexShrink: 0 }}>🚀</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: '3px' }}>Invite friends to play</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Share WC26 Predictor — they can make their own picks and join a league later</div>
                </div>
                <button onClick={handleShareApp}
                  style={{ background: 'var(--scottish-navy)', color: 'white', border: 'none', borderRadius: 'var(--radius-full)', padding: '8px 16px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {shareCopied ? 'Copied ✓' : 'Share'}
                </button>
              </div>
            </div>
          )}

          {/* ── Ready for kickoff checklist ── */}
          {!loading && user && !tournamentStarted && (
            <div className="card fade-in" style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '900', fontSize: '16px' }}>{readyForKickoff ? "🎉 You're ready for kickoff" : '✅ Ready for kickoff'}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Final checks before the opening match.</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {readyChecklist.map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 10px', borderRadius: 'var(--radius-md)', background: item.done ? 'var(--accent-green-light)' : 'var(--bg-secondary)', border: `1px solid ${item.done ? 'rgba(0,122,51,0.18)' : 'var(--border-light)'}` }}>
                    <span style={{ fontSize: '13px', fontWeight: '900', color: item.done ? 'var(--accent-green)' : 'var(--text-muted)' }}>{item.done ? '✓' : '□'}</span>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: item.done ? 'var(--text-primary)' : 'var(--text-muted)' }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Knockout Predictor Banner — clickable once KO Predictor is open ── */}
          {showKnockoutBanner && (
            knockoutLive ? (
              <Link to="/ko-predictor" style={{
                background: 'linear-gradient(135deg, #e65100, #ff9800)',
                borderRadius: 'var(--radius-lg)', padding: '16px 20px',
                border: '1px solid rgba(255,152,0,0.5)', textDecoration: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: 'white', marginBottom: '2px' }}>
                    🔥 KO Predictor is LIVE!
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)' }}>
                    Your Second Chance — predict the real knockout matches as they're confirmed
                  </div>
                </div>
                <span style={{
                  background: 'white', color: '#e65100', padding: '8px 14px',
                  borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: '800',
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}>Play now →</span>
              </Link>
            ) : (
              <div style={{
                background: 'linear-gradient(135deg, #1a0800, #2a1400)',
                borderRadius: 'var(--radius-lg)', padding: '16px 20px',
                border: '1px solid rgba(230,81,0,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#ff9800', marginBottom: '2px' }}>
                    🔥 KO Predictor — coming soon
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,152,0,0.6)' }}>
                    Opens when the first Round of 32 teams are confirmed — fresh start, separate leaderboard
                  </div>
                </div>
              </div>
            )
          )}

          {/* ── First-time guidance ── */}
          {showFirstTimeGuide && (
            <div className="card fade-in" style={{ border: '1px solid var(--accent-blue)', background: 'linear-gradient(180deg, var(--bg-card), var(--accent-blue-light))' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Start here</div>
              <div style={{ fontSize: '20px', fontWeight: '900', marginBottom: '8px' }}>
                {tournamentStarted ? "👋 Welcome — here's what you can do" : "👋 Make your World Cup predictions"}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '14px' }}>
                {tournamentStarted
                  ? 'The tournament has started but you can still predict remaining matches, build your bracket and join a league!'
                  : 'First, predict the 72 group matches. After that, build your knockout bracket, pick the awards and join a league with friends.'}
              </div>
              <div style={{ display: 'grid', gap: '8px', marginBottom: '16px' }}>
                {(tournamentStarted ? [
                  '1. Predict upcoming group matches',
                  '2. Build your knockout bracket',
                  '3. KO Predictor opens ~28 Jun — fresh start for all',
                  '4. Join or create a mini league',
                ] : [
                  '1. Pick scores for every group match',
                  '2. Your group tables create your knockout bracket',
                  '3. Choose awards and total tournament goals',
                  '4. Join or create a mini league',
                ]).map(step => (
                  <div key={step} style={{ fontSize: '13px', fontWeight: '700', padding: '9px 10px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                    {step}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Link to="/predictions" className="btn btn-primary btn-full">⚽ {tournamentStarted ? 'Predict upcoming matches' : 'Start group predictions'}</Link>
                <Link to="/how-to-play" style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600', textDecoration: 'none' }}>📖 How to play & scoring guide →</Link>
              </div>
            </div>
          )}


          {/* ── "You're X pts behind 1st" nudge ── */}
          {tournamentStarted && user && profile && leaderPosition && leaderPosition > 1 && topPredictors.length > 0 && (
            <div style={{
              background: 'var(--accent-blue-light)', border: '1px solid rgba(21,88,176,0.2)',
              borderRadius: 'var(--radius-lg)', padding: '12px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ fontSize: '13px', color: 'var(--accent-blue)', fontWeight: '600' }}>
                📊 You're <strong>{(topPredictors[0]?.total_points || 0) - (profile.total_points || 0)} pts</strong> behind {topPredictors[0]?.username}
              </div>
              <Link to="/leaderboard" style={{ fontSize: '12px', color: 'var(--accent-blue)', fontWeight: '700', textDecoration: 'none' }}>
                Rankings →
              </Link>
            </div>
          )}

          {/* ── User Stats ── */}
          {user && profile && (tournamentStarted || knockoutLive || (profile.total_points || 0) > 0) && (
            <div className="card fade-in">
              <div className="section-header">
                <span className="section-title">👋 Your Stats</span>
                <Link to="/profile" className="section-link">View profile →</Link>
              </div>

              {/* Tournament stats */}
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--scottish-navy)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                🌍 Tournament Predictor
              </div>
              {/* Live rank movement card — shows during live matches */}
              {liveMatches.length > 0 && leaderPosition && profile.rank_at_kickoff && (() => {
                const movement = profile.rank_at_kickoff - leaderPosition // positive = moved up
                const moved = movement !== 0
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: moved ? (movement > 0 ? 'rgba(0,122,51,0.08)' : 'rgba(198,40,40,0.06)') : 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', marginBottom: '10px', border: `1px solid ${moved ? (movement > 0 ? 'rgba(0,122,51,0.2)' : 'rgba(198,40,40,0.15)') : 'var(--border-light)'}` }}>
                    <div style={{ fontWeight: '900', fontSize: '28px', fontFamily: 'var(--font-mono)', color: moved ? (movement > 0 ? 'var(--accent-green)' : 'var(--accent-red)') : 'var(--text-primary)' }}>
                      #{leaderPosition}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '700', fontSize: '13px' }}>
                        {moved
                          ? movement > 0
                            ? `▲ Up ${movement} place${movement > 1 ? 's' : ''} since kickoff`
                            : `▼ Down ${Math.abs(movement)} place${Math.abs(movement) > 1 ? 's' : ''} since kickoff`
                          : 'Holding position since kickoff'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Was #{profile.rank_at_kickoff} · {profile.total_points || 0}pts
                      </div>
                    </div>
                    <div style={{ fontSize: '20px' }}>
                      {moved ? (movement > 0 ? '📈' : '📉') : '➡️'}
                    </div>
                  </div>
                )
              })()}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: knockoutLive ? '14px' : '0' }}>
                {[
                  { label: 'Points', value: profile.total_points || 0, icon: '🏅' },
                  { label: 'Streak', value: profile.streak_current || 0, icon: '🔥' },
                  { label: 'Exact Scores', value: profile.exact_scores || 0, icon: '🎯' },
                ].map(({ label, value, icon }) => (
                  <div key={label} style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '14px', textAlign: 'center' }}>
                    <div style={{ fontSize: '22px', marginBottom: '4px' }}>{icon}</div>
                    <div style={{ fontWeight: '800', fontSize: '20px', fontFamily: 'var(--font-mono)' }}>{value}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* KO stats — only show once live */}
              {knockoutLive && (
                <>
                  <div style={{ height: '1px', background: 'var(--border-light)', margin: '4px 0 12px' }} />
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#e65100', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                    🔥 KO Predictor
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {[
                      { label: 'KO Points', value: profile.ko_points || 0, icon: '🔥' },
                      { label: 'KO Streak', value: profile.ko_streak_current || 0, icon: '⚡' },
                      { label: 'Exact Scores', value: profile.ko_exact_scores || 0, icon: '🎯' },
                    ].map(({ label, value, icon }) => (
                      <div key={label} style={{ background: '#fff3e0', borderRadius: 'var(--radius-md)', padding: '14px', textAlign: 'center', border: '1px solid rgba(230,81,0,0.2)' }}>
                        <div style={{ fontSize: '22px', marginBottom: '4px' }}>{icon}</div>
                        <div style={{ fontWeight: '800', fontSize: '20px', fontFamily: 'var(--font-mono)', color: '#e65100' }}>{value}</div>
                        <div style={{ fontSize: '10px', color: '#e65100', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px', opacity: 0.7 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Tournament over */}
          {tournamentOver && (
            <div className="card fade-in" style={{ textAlign: 'center', padding: '32px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏆</div>
              <div style={{ fontWeight: '800', fontSize: '20px', marginBottom: '8px' }}>Tournament Complete!</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Thanks for playing WC26 Predictor</div>
            </div>
          )}

          {/* ── Upcoming matches in next 24hrs — weather-first card ── */}
          {todayMatches.length > 0 && tournamentStarted && (() => {
            const now2 = new Date()
            const liveIds = new Set(liveMatches.map(m => m.id))
            // Exclude currently-live matches (already shown in LIVE card above)
            const nonLive = todayMatches.filter(m => !liveIds.has(m.id))
            const upcoming = nonLive.filter(m => new Date(m.kickoff_time) > now2 && m.status !== 'completed')
            const completed = nonLive.filter(m => m.status === 'completed')
            // Show upcoming first, completed at the bottom; if all done show results
            const displayMatches = [...upcoming, ...completed].slice(0, 6)
            const overflow = [...upcoming, ...completed].length - 6
            if (displayMatches.length === 0) return null
            const allDone = upcoming.length === 0 && completed.length > 0
            return (
              <div className="card fade-in" style={{ overflow: 'hidden' }}>
                <div style={{ height: '3px', background: 'var(--scottish-navy)', borderRadius: 'var(--radius-full)', marginBottom: '0' }} />
                <div className="section-header" style={{ paddingTop: '14px' }}>
                  <span className="section-title">
                    {allDone ? '✅ Recent Results' : '📅 Upcoming'}
                  </span>
                  <Link to="/predictions" className="section-link">
                    {allDone ? 'View →' : groupsComplete ? 'View →' : 'Predict →'}
                  </Link>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                  {displayMatches.map((match, idx) => {
                    const w = matchWeather[match.id]
                    const pillStyle = w?.available ? getWeatherPillStyle(w) : null
                    const isCompleted = match.status === 'completed'
                    return (
                      <div key={match.id} style={{
                        padding: '12px 16px',
                        borderTop: '1px solid var(--border-light)',
                        display: 'flex', alignItems: 'center', gap: '10px',
                      }}>
                        {/* Teams */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: '20px' }}>{match.home_team?.flag_emoji}</span>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                            {match.home_team?.short_code}
                          </span>
                          {isCompleted ? (
                            <span style={{ fontSize: '14px', fontWeight: '900', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', padding: '0 4px' }}>
                              {match.home_score}–{match.away_score}
                            </span>
                          ) : (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '0 2px' }}>vs</span>
                          )}
                          <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                            {match.away_team?.short_code}
                          </span>
                          <span style={{ fontSize: '20px' }}>{match.away_team?.flag_emoji}</span>
                        </div>

                        {/* Right side: weather pill + kickoff time */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
                            {isCompleted ? 'FT' : new Date(match.kickoff_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }) + ' BST'}
                          </span>
                          {pillStyle && (
                            <span style={{
                              fontSize: '11px', fontWeight: '600',
                              padding: '2px 7px', borderRadius: 'var(--radius-full)',
                              background: pillStyle.bg, color: pillStyle.color,
                              whiteSpace: 'nowrap',
                            }}>
                              {w.icon} {Math.round(w.temp_c)}°C
                              {w.alert ? ` · ${w.alert}` : ''}
                            </span>
                          )}
                          {!pillStyle && match.venue?.city && (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', opacity: 0.6 }}>
                              {getVenueFlag(match.venue.city)} {match.venue.city}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
                {/* Overflow note */}
                {overflow > 0 && (
                  <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-light)', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                    + {overflow} more match{overflow > 1 ? 'es' : ''} today
                  </div>
                )}
                {/* Extreme heat / thunderstorm alert if any match has one */}
                {(() => {
                  const alerts = displayMatches
                    .map(m => matchWeather[m.id]?.alert)
                    .filter(Boolean)
                  const worst = alerts.find(a => a === 'Extreme heat' || a === 'Thunderstorm') || alerts[0]
                  if (!worst) return null
                  const isHeat = worst.includes('heat') || worst.includes('hot')
                  return (
                    <div style={{
                      margin: '0 16px 14px', padding: '8px 12px',
                      background: isHeat ? 'rgba(230,81,0,0.08)' : 'rgba(94,53,177,0.08)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '11px', fontWeight: '600',
                      color: isHeat ? '#e65100' : '#5e35b1',
                      display: 'flex', alignItems: 'center', gap: '6px',
                    }}>
                      {isHeat ? '🌡️' : '⛈️'}
                      <span>{worst} conditions for {alerts.filter(a => a === worst).length > 1 ? 'multiple matches' : 'one match'} today</span>
                    </div>
                  )
                })()}
              </div>
            )
          })()}

          {/* ── Coming Up fallback — shown when nothing in next 24hrs ── */}
          {liveMatches.length === 0 && todayMatches.length === 0 && upcomingMatches.length > 0 && nextMatch && !countdown.started && tournamentStarted && (
            <div className="card fade-in">
              <div className="section-header">
                <span className="section-title">📅 Coming Up</span>
                <Link to="/predictions" className="section-link">
                  {groupsComplete ? 'View →' : 'Predict →'}
                </Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {upcomingMatches.slice(0, 4).map(match => (
                  <div key={match.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 12px', background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '20px' }}>{match.home_team?.flag_emoji}</span>
                      <span style={{ fontSize: '13px', fontWeight: '700' }}>{match.home_team?.short_code}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>vs</span>
                      <span style={{ fontSize: '13px', fontWeight: '700' }}>{match.away_team?.short_code}</span>
                      <span style={{ fontSize: '20px' }}>{match.away_team?.flag_emoji}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>
                      {formatKickoff(match.kickoff_time)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Top Predictors — only show during tournament ── */}
          {tournamentStarted && (
          <div className="card fade-in">
            <div className="section-header">
              <span className="section-title">🏆 Top Predictors</span>
              <Link to="/leaderboard" className="section-link">Full table →</Link>
            </div>
            {topPredictors.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🏅</div>
                <div className="empty-state-title">No scores yet</div>
                <div className="empty-state-desc">Leaderboard updates after first matches</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {topPredictors.map((p, i) => {
                  const isMe = user?.id === p.id
                  return (
                    <div key={p.id} className="leaderboard-row" 
                      onClick={() => openProfile(p, user?.id)}
                      role="button" tabIndex={0}
                      style={{
                      background: isMe ? 'var(--scottish-navy-light)' : 'var(--bg-card)',
                      border: isMe ? '1px solid var(--scottish-navy)' : '1px solid var(--border-light)',
                      cursor: 'pointer',
                    }}>
                      {/* accent bar */}
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px',
                        background: isMe ? 'var(--scottish-navy)' : i < 3 ? 'linear-gradient(180deg, #f6c026, #b8860b)' : 'transparent' }} />
                      {/* Rank */}
                      <div style={{ fontWeight: '800', fontSize: i < 3 ? '20px' : '13px', minWidth: '36px',
                        textAlign: 'center', flexShrink: 0, fontFamily: i >= 3 ? 'var(--font-mono)' : 'inherit',
                        color: i >= 3 ? 'var(--text-muted)' : 'inherit' }}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                      </div>
                      {/* Avatar */}
                      <div style={{ width: '38px', height: '38px', borderRadius: '50%',
                        background: isMe ? 'var(--scottish-navy)' : 'var(--bg-tertiary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '15px', fontWeight: '700', flexShrink: 0,
                        color: isMe ? 'white' : 'var(--text-primary)',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
                        {p.username?.[0]?.toUpperCase()}
                      </div>
                      {/* Name */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.username}</span>
                          {isMe && <span style={{ fontSize: '9px', background: 'var(--scottish-navy)', color: 'white', padding: '2px 6px', borderRadius: '20px', fontWeight: '700', flexShrink: 0 }}>YOU</span>}
                        </div>
                        {p.streak_current > 2 && (
                          <div style={{ fontSize: '11px', color: 'var(--accent-orange)', marginTop: '2px' }}>🔥 {p.streak_current}</div>
                        )}
                      </div>
                      {/* Points */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '44px' }}>
                        <div style={{ fontWeight: '900', fontSize: '20px', fontFamily: 'var(--font-mono)',
                          letterSpacing: '-0.02em', lineHeight: 1,
                          color: isMe ? 'var(--scottish-navy)' : 'var(--text-primary)' }}>{p.total_points}</div>
                        <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--text-muted)',
                          textTransform: 'uppercase', letterSpacing: '0.04em' }}>pts</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          )}

          {/* ── How it works (guest only) ── */}
          {!user && (
            <div className="card fade-in">
              <div className="section-title" style={{ marginBottom: '16px' }}>How it works</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { icon: '⚽', title: 'Predict the full tournament', desc: 'Pick the 72 group games, then build your knockout bracket.' },
                  { icon: '🏅', title: 'Pick awards and goals', desc: 'Choose Golden Boot, Golden Glove, Player of the Tournament and total goals.' },
                  { icon: '👥', title: 'Compete in mini leagues', desc: 'Create or join private leagues with friends, family or work.' },
                  { icon: '📊', title: 'Live scoring', desc: 'Leaderboards update as the World Cup is played.' },
                ].map(({ icon, title, desc }) => (
                  <div key={title} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-tertiary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '20px', flexShrink: 0,
                    }}>{icon}</div>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '2px' }}>{title}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/register" className="btn btn-primary btn-full" style={{ marginTop: '20px' }}>
                Join free — takes 30 seconds
              </Link>
            </div>
          )}

        </div>
      </div>
      {showShareCard && <ShareCard onClose={() => setShowShareCard(false)} />}
      <MemberPredictionsModal
        memberModal={memberModal}
        setMemberModal={setMemberModal}
        memberPredictions={memberPredictions}
        memberReactions={memberReactions}
        loadingPreds={loadingPreds}
        groupPositionBreakdown={groupPositionBreakdown}
        currentUserId={user?.id}
      />
    </div>
  )
}
