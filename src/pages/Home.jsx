import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore, useAppStore } from '../store/index.js'
import { predictMatchOdds, predictGoals, predictAwards } from '../lib/luckyDip.js'
import { ALL_STAGES, calcPredictedStandings, resolveSlot, getBest3rdTeams } from '../lib/bracketUtils.js'
import ShareCard from '../components/ShareCard.jsx'

// ── Tournament phase dates ───────────────────────────────────────────────────
const TOURNAMENT_START   = new Date('2026-06-11T19:00:00Z') // first kickoff
const GROUP_STAGE_END    = new Date('2026-06-27T22:00:00Z') // last group game
const KNOCKOUT_BANNER    = new Date('2026-06-20T00:00:00Z') // banner appears
const KNOCKOUT_LIVE      = new Date('2026-06-27T22:00:00Z') // predictor opens 27 Jun 23:00 BST
const TOURNAMENT_END     = new Date('2026-07-19T20:00:00Z') // final


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
  const knockoutsDone = (profile?.knockout_picks_count || 0) >= 32
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
    return { label: '⚽ Continue predicting', to: '/predictions' }
  }

  return { label: '📊 View leaderboard', to: '/leaderboard', secondary: { label: 'How to get points →', to: '/how-to-play' } }
}

export default function Home() {
  const { user, profile, isAdmin } = useAuthStore()
  const [nextMatch, setNextMatch]         = useState(null)
  const [liveMatches, setLiveMatches]     = useState([])
  const [upcomingMatches, setUpcomingMatches] = useState([])
  const [topPredictors, setTopPredictors] = useState([])
  const [predictionCount, setPredictionCount] = useState(0)
  const [knockoutPickCount, setKnockoutPickCount] = useState(0)
  const [awardPickCount, setAwardPickCount] = useState(0)
  const [jokerAssignedCount, setJokerAssignedCount] = useState(0)
  const [leaderPosition, setLeaderPosition]   = useState(null)
  const [loading, setLoading]             = useState(true)
  const [luckyDipping, setLuckyDipping]   = useState(false)
  const [showShareCard, setShowShareCard] = useState(false)
  const [shareCopied, setShareCopied]     = useState(false)
  const [luckyDone, setLuckyDone]         = useState(false)
  const [matchWeather, setMatchWeather]   = useState({})
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
    : now >= KNOCKOUT_BANNER
  const knockoutLive = phaseOverride === 'ko_predictor'
    ? true
    : phaseOverride && phaseOverride !== 'ko_predictor' ? false
    : now >= KNOCKOUT_LIVE
  const tournamentOver = phaseOverride === 'post_tournament' ? true : now >= TOURNAMENT_END

  useEffect(() => { loadData() }, [user])

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
    const matchesToCheck = [nextMatch, ...liveMatches].filter(Boolean)
    if (!matchesToCheck.length) return

    matchesToCheck.forEach(match => {
      if (!match?.id || !match?.venue?.city || matchWeather[match.id]) return
      loadMatchWeather(match)
    })
  }, [nextMatch?.id, liveMatches.map(m => m.id).join('|')])

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

  const loadData = async () => {
    try {
      const nowIso = new Date().toISOString()

      const [liveRes, nextRes, upcomingRes, predictorRes] = await Promise.all([
        supabase.from('matches')
          .select('*, home_team:home_team_id(name,flag_emoji,short_code), away_team:away_team_id(name,flag_emoji,short_code), venue:venue_id(city)')
          .eq('status', 'live').order('kickoff_time', { ascending: true }),

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
      ])

      setLiveMatches(liveRes.data || [])
      setNextMatch(nextRes.data || null)
      setUpcomingMatches(upcomingRes.data || [])
      setTopPredictors(predictorRes.data || [])

      // Load user completion counts from source tables so Home doesn't rely on stale cached profile values.
      if (user) {
        const [
          freshProfileRes,
          groupCountRes,
          jokerCountRes,
          knockoutCountRes,
          awardCountRes,
        ] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
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
            .eq('user_id', user.id),
          supabase.from('award_predictions')
            .select('award_type', { count: 'exact', head: true })
            .eq('user_id', user.id),
        ])

        const freshProfile = freshProfileRes.data
        if (freshProfile) useAuthStore.getState().setProfile(freshProfile)

        const groupCount = groupCountRes.count || 0
        const jokerCount = jokerCountRes.count || 0
        const koCount = knockoutCountRes.count || 0
        const awardsCount = awardCountRes.count || 0

        setPredictionCount(groupCount)
        setJokerAssignedCount(Math.min(8, jokerCount))
        setKnockoutPickCount(koCount)
        setAwardPickCount(awardsCount)

        // Repair cached profile counters used by other screens, but keep Home based on live counts above.
        await supabase.from('profiles')
          .update({
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
  const knockoutsComplete = knockoutPickCount >= 32
  const awardsComplete = awardPickCount >= 4
  const jokersAssigned = jokerAssignedCount
  const readyChecklist = [
    { label: 'Groups complete', done: groupsComplete },
    { label: 'Knockouts complete', done: knockoutsComplete },
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

      if (existingKoNums.size < 32) {
        // Build predicted standings from group predictions
        const allGroupMatches = matches
        const { data: allPreds } = await supabase
          .from('predictions').select('match_id, home_score, away_score').eq('user_id', user.id)
        const predMap = {}
        ;(allPreds || []).forEach(p => { predMap[p.match_id] = { home: p.home_score, away: p.away_score } })
        const standings = calcPredictedStandings(allGroupMatches, predMap)
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
  const progressItems = user ? [
    { label: 'Groups', done: Math.min(predictionCount, 72), total: 72, to: '/predictions' },
    { label: 'Knockouts', done: knockoutPickCount, total: 32, to: '/knockout' },
    { label: 'Awards', done: awardPickCount, total: 4, to: '/awards' },
  ] : []

  const firstGroupPickMade = user && predictionCount > 0
  const showFirstTimeGuide = !loading && user && !tournamentStarted && !firstGroupPickMade

  // ── Hero subtitle ─────────────────────────────────────────────────────────
  const heroSubtitle = tournamentOver
    ? 'Thanks for playing — see you next time! 🏆'
    : groupStageDone
    ? 'Group stage complete — knockout stage underway!'
    : tournamentStarted
    ? 'Group stage underway · Predictions lock at kickoff'
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
        background: 'linear-gradient(135deg, rgba(0,30,80,0.82) 0%, rgba(0,60,140,0.78) 60%, rgba(0,30,80,0.82) 100%), url(/hero-bg.jpg) center/cover no-repeat',
        padding: '36px 20px 32px', textAlign: 'center', color: 'white',
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          {/* Dynamic badge */}
          <div style={{ fontSize: '13px', fontWeight: '700', letterSpacing: '0.1em', marginBottom: '10px', textTransform: 'uppercase',
            color: liveMatches.length > 0 ? '#ef5350' : 'var(--accent-green)',
          }}>
            {liveMatches.length > 0 ? '🔴 Live · FIFA World Cup 2026' : tournamentOver ? '🏆 FIFA World Cup 2026' : 'FIFA World Cup 2026'}
          </div>

          <h1 style={{ fontSize: 'clamp(26px, 6vw, 44px)', fontWeight: '900', letterSpacing: '-0.03em', marginBottom: '10px', lineHeight: 1.1 }}>
            WC26 Predictor
          </h1>

          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '24px' }}>
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
              { label: 'Kick off', value: '11 Jun' },
              { label: 'Final', value: '19 Jul' },
            ].map(({ label, value }, i, arr) => (
              <div key={label} style={{
                textAlign: 'center', flex: 1,
                borderRight: i < arr.length - 1 ? '1px solid var(--border-light)' : 'none',
                padding: '0 8px',
              }}>
                <div style={{ fontWeight: '800', fontSize: '15px', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{value}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '2px' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="container" style={{ padding: '20px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>

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

          {/* ── Knockout Predictor Banner (20 Jun – 26 Jun teaser, 27 Jun+ live) ── */}
          {showKnockoutBanner && (
            <div style={{
              background: knockoutLive
                ? 'linear-gradient(135deg, #e65100, #ff9800)'
                : 'linear-gradient(135deg, #1a0800, #2a1400)',
              borderRadius: 'var(--radius-lg)', padding: '16px 20px',
              border: `1px solid ${knockoutLive ? 'rgba(255,152,0,0.5)' : 'rgba(230,81,0,0.3)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
            }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: knockoutLive ? 'white' : '#ff9800', marginBottom: '2px' }}>
                  🔥 {knockoutLive ? 'KO Predictor is LIVE!' : `KO Predictor launches in ${Math.ceil((KNOCKOUT_LIVE - now) / (1000 * 60 * 60 * 24))} days`}
                </div>
                <div style={{ fontSize: '12px', color: knockoutLive ? 'rgba(255,255,255,0.8)' : 'rgba(255,152,0,0.6)' }}>
                  {knockoutLive ? 'Your Second Chance — predict all 32 knockout matches' : 'Fresh start, separate leaderboard · Coming 27 Jun 23:00 BST'}
                </div>
              </div>
              {knockoutLive && (
                <Link to="/ko-predictor" style={{
                  background: 'white', color: '#e65100', padding: '8px 14px',
                  borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: '800',
                  textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
                }}>Play now →</Link>
              )}
            </div>
          )}

          {/* ── First-time guidance ── */}
          {showFirstTimeGuide && (
            <div className="card fade-in" style={{ border: '1px solid var(--accent-blue)', background: 'linear-gradient(180deg, var(--bg-card), var(--accent-blue-light))' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Start here</div>
              <div style={{ fontSize: '20px', fontWeight: '900', marginBottom: '8px' }}>👋 Make your World Cup predictions</div>
              <div style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '14px' }}>
                First, predict the 72 group matches. After that, build your knockout bracket, pick the awards and join a league with friends.
              </div>
              <div style={{ display: 'grid', gap: '8px', marginBottom: '16px' }}>
                {[
                  '1. Pick scores for every group match',
                  '2. Your group tables create your knockout bracket',
                  '3. Choose awards and total tournament goals',
                  '4. Join or create a mini league',
                ].map(step => (
                  <div key={step} style={{ fontSize: '13px', fontWeight: '700', padding: '9px 10px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                    {step}
                  </div>
                ))}
              </div>
              <Link to="/predictions" className="btn btn-primary btn-full">⚽ Start group predictions</Link>
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

          {/* ── Live Matches ── */}
          {liveMatches.length > 0 && (
            <div className="card fade-in" style={{ border: '2px solid #e53935' }}>
              <div className="section-header" style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    background: '#e53935', color: 'white',
                    fontSize: '11px', fontWeight: '800', padding: '3px 8px',
                    borderRadius: 'var(--radius-full)', letterSpacing: '0.08em',
                    animation: 'pulse 2s infinite',
                  }}>🔴 LIVE</span>
                  <span className="section-title">
                    {liveMatches.length === 1 ? 'Match in Progress' : `${liveMatches.length} Matches in Progress`}
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Updates every 60s</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {liveMatches.map(match => (
                  <div key={match.id} style={{
                    background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
                    padding: '14px 16px', border: '1px solid rgba(229,57,53,0.2)',
                  }}>
                    {match.venue?.city && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px', textAlign: 'center', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {getVenueFlag(match.venue.city)} {match.venue.city}{formatWeather(matchWeather[match.id]) ? ` · ${formatWeather(matchWeather[match.id])}` : ''}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
                        <span style={{ fontSize: '32px' }}>{match.home_team?.flag_emoji}</span>
                        <span style={{ fontSize: '12px', fontWeight: '700' }}>{match.home_team?.short_code}</span>
                      </div>
                      <div style={{ textAlign: 'center', minWidth: '80px' }}>
                        <div style={{ fontSize: '32px', fontWeight: '900', fontFamily: 'var(--font-mono)', lineHeight: 1, letterSpacing: '-0.02em' }}>
                          {match.home_score ?? 0} – {match.away_score ?? 0}
                        </div>
                        <div style={{ marginTop: '6px', fontSize: '10px', fontWeight: '800', color: '#e53935', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Live</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
                        <span style={{ fontSize: '32px' }}>{match.away_team?.flag_emoji}</span>
                        <span style={{ fontSize: '12px', fontWeight: '700' }}>{match.away_team?.short_code}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Next match card (tournament live only) ── */}
          {!loading && tournamentStarted && !tournamentOver && nextMatch && liveMatches.length === 0 && (
            <div className="card fade-in" style={{ overflow: 'hidden' }}>
              <div style={{ height: '4px', background: 'var(--scottish-navy)', marginBottom: '14px', borderRadius: 'var(--radius-full)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ fontWeight: '800', fontSize: '14px' }}>⏱️ Next Match</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatKickoff(nextMatch.kickoff_time)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
                  <span style={{ fontSize: '36px', lineHeight: 1 }}>{nextMatch.home_team?.flag_emoji}</span>
                  <span style={{ fontWeight: '800', fontSize: '13px' }}>{nextMatch.home_team?.name}</span>
                </div>
                <div style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: '300' }}>vs</div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
                  <span style={{ fontSize: '36px', lineHeight: 1 }}>{nextMatch.away_team?.flag_emoji}</span>
                  <span style={{ fontWeight: '800', fontSize: '13px' }}>{nextMatch.away_team?.name}</span>
                </div>
              </div>
              {nextMatch.venue?.city && <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '8px' }}>{getVenueFlag(nextMatch.venue.city)} {nextMatch.venue.city}{formatWeather(matchWeather[nextMatch.id]) ? ` · ${formatWeather(matchWeather[nextMatch.id])}` : ''}</div>}
            </div>
          )}

          {/* ── Next up compact (when live matches on) ── */}
          {!loading && tournamentStarted && liveMatches.length > 0 && nextMatch && (
            <div className="card fade-in">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: '700', fontSize: '14px' }}>📅 Next Up</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatKickoff(nextMatch.kickoff_time)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                <span style={{ fontSize: '22px' }}>{nextMatch.home_team?.flag_emoji}</span>
                <span style={{ fontWeight: '700', fontSize: '14px' }}>{nextMatch.home_team?.short_code}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', flex: 1, textAlign: 'center' }}>vs</span>
                <span style={{ fontWeight: '700', fontSize: '14px' }}>{nextMatch.away_team?.short_code}</span>
                <span style={{ fontSize: '22px' }}>{nextMatch.away_team?.flag_emoji}</span>
              </div>
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

          {/* ── Upcoming matches list ── */}
          {liveMatches.length === 0 && upcomingMatches.length > 0 && nextMatch && !countdown.started && tournamentStarted && (
            <div className="card fade-in">
              <div className="section-header">
                <span className="section-title">📅 Coming Up</span>
                <Link to="/predictions" className="section-link">Predict →</Link>
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
              <div>
                {topPredictors.map((p, i) => (
                  <div key={p.id} className="leaderboard-row" style={{
                    background: user?.id === p.id ? 'var(--accent-blue-light)' : 'transparent',
                  }}>
                    <div className={`rank-number rank-${i + 1}`}>#{i + 1}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: 'var(--bg-tertiary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '14px', fontWeight: '700',
                      }}>
                        {p.username?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px' }}>{p.username}</div>
                        {p.streak_current > 2 && (
                          <div style={{ fontSize: '11px', color: 'var(--accent-orange)' }}>🔥 {p.streak_current} streak</div>
                        )}
                      </div>
                    </div>
                    <div style={{ fontWeight: '800', fontSize: '16px', fontFamily: 'var(--font-mono)', color: 'var(--accent-green)' }}>
                      {p.total_points}
                    </div>
                  </div>
                ))}
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

          <div className="card fade-in" style={{ overflow: 'hidden' }}>
            <div style={{ height: '4px', background: 'var(--accent-gold)', marginBottom: '14px', borderRadius: 'var(--radius-full)' }} />
            <div className="section-header" style={{ marginBottom: '10px' }}>
              <span className="section-title">🏅 How to score points</span>
              <Link to="/how-to-play" className="section-link">Full rules →</Link>
            </div>
            <div style={{
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              padding: '14px',
            }}>
              <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '6px' }}>
                Predict scores, use jokers and earn points throughout the tournament.
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Exact scores score the most points. Jokers boost selected matches. Awards, knockout picks and tournament predictions all contribute to your final total.
              </div>
            </div>
          </div>

        </div>
      </div>
      {showShareCard && <ShareCard onClose={() => setShowShareCard(false)} />}
    </div>
  )
}
