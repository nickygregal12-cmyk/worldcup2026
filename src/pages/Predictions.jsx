import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/index.js'
import { toApiName, normalise } from '../lib/teamNames.js'
import { ErrorState, SkeletonCard } from '../components/PageState.jsx'
import { StandingsRow, StandingsHeader, StandingsLegend } from '../components/GroupStandingsTable.jsx'
import { calcPredictedStandings, getBest3rdTeams, groupFullyPredicted } from '../lib/bracketUtils.js'

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']
const TOTAL_GROUP_MATCHES = 72 // 12 groups × 6 matches

// ELO-based autofill
const predictScore = (homeRank, awayRank) => {
  const homeStrength = 1 / (homeRank || 20)
  const awayStrength = 1 / (awayRank || 20)
  const total = homeStrength + awayStrength
  const homeWinProb = homeStrength / total
  const adjustedHomeProb = Math.min(0.75, homeWinProb * 1.1)
  const rand = Math.random()
  let result
  if (rand < adjustedHomeProb * 0.7) result = 'home'
  else if (rand < adjustedHomeProb * 0.7 + 0.28) result = 'draw'
  else result = 'away'
  const scoreOptions = {
    home: [[1,0],[2,0],[2,1],[3,0],[3,1],[1,0],[2,0]],
    draw: [[0,0],[1,1],[2,2],[1,1],[0,0]],
    away: [[0,1],[0,2],[1,2],[0,3],[1,2]],
  }
  const scores = scoreOptions[result]
  const [h, a] = scores[Math.floor(Math.random() * scores.length)]
  return { home: h, away: a }
}

const VENUE_FLAGS = {
  'New York/NJ': '🇺🇸', 'Los Angeles': '🇺🇸', 'Dallas': '🇺🇸',
  'Houston': '🇺🇸', 'San Francisco': '🇺🇸', 'Seattle': '🇺🇸',
  'Boston': '🇺🇸', 'Miami': '🇺🇸', 'Atlanta': '🇺🇸',
  'Philadelphia': '🇺🇸', 'Kansas City': '🇺🇸',
  'Toronto': '🇨🇦', 'Vancouver': '🇨🇦',
  'Mexico City': '🇲🇽', 'Guadalajara': '🇲🇽', 'Monterrey': '🇲🇽',
}

// Item 5: Group standings with proper 3rd place logic
// Only show "Possible 3rd" highlight if all 4 teams have played all 3 games
const calcGroupStandings = (matches, predictions) => {
  const teams = {}
  for (const match of matches) {
    const hId = match.home_team_id, aId = match.away_team_id
    if (!teams[hId]) teams[hId] = { team: match.home_team, id: hId, pts: 0, gd: 0, gf: 0, played: 0, h2h: {} }
    if (!teams[aId]) teams[aId] = { team: match.away_team, id: aId, pts: 0, gd: 0, gf: 0, played: 0, h2h: {} }
    const pred = predictions[match.id]
    let hs, as_
    if (match.status === 'completed') { hs = match.home_score; as_ = match.away_score }
    else if (pred?.home !== undefined && pred?.away !== undefined) { hs = Number(pred.home); as_ = Number(pred.away) }
    else continue
    const h = teams[hId], a = teams[aId]
    h.played++; a.played++
    h.gf += hs; h.gd += hs - as_
    a.gf += as_; a.gd += as_ - hs
    if (hs > as_) { h.pts += 3 }
    else if (hs === as_) { h.pts += 1; a.pts += 1 }
    else { a.pts += 3 }
    if (!h.h2h[aId]) h.h2h[aId] = { pts: 0, gd: 0, gf: 0 }
    if (!a.h2h[hId]) a.h2h[hId] = { pts: 0, gd: 0, gf: 0 }
    if (hs > as_) { h.h2h[aId].pts += 3 }
    else if (hs === as_) { h.h2h[aId].pts += 1; a.h2h[hId].pts += 1 }
    else { a.h2h[hId].pts += 3 }
    h.h2h[aId].gd += hs - as_; h.h2h[aId].gf += hs
    a.h2h[hId].gd += as_ - hs; a.h2h[hId].gf += as_
  }
  const sorted = Object.values(teams).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts
    const aH2H = a.h2h[b.id] || { pts: 0, gd: 0, gf: 0 }
    const bH2H = b.h2h[a.id] || { pts: 0, gd: 0, gf: 0 }
    if (bH2H.pts !== aH2H.pts) return bH2H.pts - aH2H.pts
    if (bH2H.gd !== aH2H.gd) return bH2H.gd - aH2H.gd
    if (bH2H.gf !== aH2H.gf) return bH2H.gf - aH2H.gf
    if (b.gd !== a.gd) return b.gd - a.gd
    if (b.gf !== a.gf) return b.gf - a.gf
    return 0
  })
  // Item 5: allGroupMatchesPredicted — only show 3rd place indicator when all 6 games predicted
  const allPredicted = sorted.every(t => t.played === 3)
  return { standings: sorted, allPredicted }
}

// Item 8: Score validation
const isHighScore = (val) => val !== '' && val !== undefined && Number(val) >= 7

export default function Predictions() {
  const { user, profile, loadProfile } = useAuthStore()
  const navigate = useNavigate()
  const [activeGroup, setActiveGroup] = useState('A')
  const [viewMode, setViewMode] = useState('group')
  const [matches, setMatches] = useState([])
  const [predictions, setPredictions] = useState({})
  const [odds, setOdds] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [saving, setSaving] = useState({})
  const [saved, setSaved] = useState({})
  const [jokersRemaining, setJokersRemaining] = useState(8)
  const [autoFillingDate, setAutoFillingDate] = useState(null)
  const [showJokerReminder, setShowJokerReminder] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [scoreWarning, setScoreWarning] = useState(null) // Item 8: {matchId, side, value}
  const [jokerConfirm, setJokerConfirm] = useState(null) // { matchId, currentJoker }

  useEffect(() => {
    loadMatches()
    loadOdds()
    if (user) {
      loadPredictions()
      checkJokerReminder()
    }
  }, [user])

  useEffect(() => {
    if (profile) setJokersRemaining(profile.jokers_group_remaining ?? 8)
  }, [profile])

  const checkJokerReminder = async () => {
    const lastGroupMatch = new Date('2026-06-28T20:00:00Z')
    const now = new Date()
    const hoursUntilEnd = (lastGroupMatch - now) / (1000 * 60 * 60)
    if (hoursUntilEnd > 0 && hoursUntilEnd < 24 && (profile?.jokers_group_remaining ?? 8) > 0) {
      setShowJokerReminder(true)
    }
  }

  const loadOdds = async () => {
    try {
      const response = await fetch('/.netlify/functions/get-odds')
      if (!response.ok) return
      const data = await response.json()
      const oddsMap = {}
      data.forEach(game => { oddsMap[`${game.home_team}|${game.away_team}`] = game.odds })
      setOdds(oddsMap)
    } catch (e) { console.log('Odds unavailable', e) }
  }

  const loadMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`*, stage, home_team:home_team_id(id,name,flag_emoji,short_code,fifa_ranking), away_team:away_team_id(id,name,flag_emoji,short_code,fifa_ranking), group:group_id(name), venue:venue_id(city,country)`)
        .eq('stage', 'group')
        .order('kickoff_time', { ascending: true })
      if (error) throw error
      setMatches(data || [])
      setLoadError(false)
    } catch (e) {
      console.error('Failed to load matches:', e)
      setLoadError(true)
    } finally { setLoading(false) }
  }

  const loadPredictions = async () => {
    const { data } = await supabase.from('predictions').select('*').eq('user_id', user.id)
    if (data) {
      const predMap = {}
      data.forEach(p => { predMap[p.match_id] = { home: p.home_score, away: p.away_score, joker: p.is_confident } })
      setPredictions(predMap)
    }
  }

  const isLocked = (kickoffTime) => new Date() >= new Date(kickoffTime)

  const handleScoreChange = (matchId, side, value) => {
    if (!user) return
    const num = value === '' ? '' : Math.max(0, Math.min(99, parseInt(value) || 0))
    setPredictions(prev => ({ ...prev, [matchId]: { ...prev[matchId], [side]: num } }))
  }

  // Item 8: blur handler — check for high score before saving
  const handleScoreBlur = (match, side) => {
    const pred = predictions[match.id] || {}
    const val = pred[side]
    if (isHighScore(val)) {
      setScoreWarning({ matchId: match.id, match, side, value: val })
    } else {
      savePrediction(match)
    }
  }

  const handleJoker = async (matchId, currentJoker) => {
    if (!user) return
    const pred = predictions[matchId]
    if (!pred) return
    if (!currentJoker && jokersRemaining <= 0) return
    const newJoker = !currentJoker
    const newRemaining = newJoker ? jokersRemaining - 1 : jokersRemaining + 1
    setPredictions(prev => ({ ...prev, [matchId]: { ...prev[matchId], joker: newJoker } }))
    setJokersRemaining(newRemaining)
    await supabase.from('predictions').upsert({
      user_id: user.id, match_id: matchId,
      home_score: pred.home ?? 0, away_score: pred.away ?? 0,
      is_confident: newJoker, bracket_type: 'main',
    }, { onConflict: 'user_id,match_id,bracket_type' })
    await supabase.from('profiles').update({ jokers_group_remaining: newRemaining }).eq('id', user.id)
  }

  const savePrediction = async (match, jokerOverride) => {
    if (!user) return
    const pred = predictions[match.id]
    if (pred?.home === '' || pred?.home === undefined || pred?.away === '' || pred?.away === undefined) return
    if (isLocked(match.kickoff_time)) return
    setSaving(prev => ({ ...prev, [match.id]: true }))
    const { error } = await supabase.from('predictions').upsert({
      user_id: user.id, match_id: match.id,
      home_score: pred.home, away_score: pred.away,
      is_confident: jokerOverride ?? pred.joker ?? false,
      bracket_type: 'main',
    }, { onConflict: 'user_id,match_id,bracket_type' })
    setSaving(prev => ({ ...prev, [match.id]: false }))
    if (!error) {
      setSaved(prev => ({ ...prev, [match.id]: true }))
      setTimeout(() => setSaved(prev => ({ ...prev, [match.id]: false })), 2000)
    }
  }

  // Item 2: autofill for By Date view
  const autoFillGroup = async () => {
    if (!user || autoFilling) return
    setAutoFilling(true)
    const groupMatchesToFill = matches.filter(m => m.group?.name === activeGroup && !isLocked(m.kickoff_time))
    await runAutofill(groupMatchesToFill)
    setAutoFilling(false)
  }

  const autoFillDate = async (dateMatches) => {
    if (!user) return
    const key = dateMatches[0]?.kickoff_time
    setAutoFillingDate(key)
    const toFill = dateMatches.filter(m => !isLocked(m.kickoff_time))
    await runAutofill(toFill)
    setAutoFillingDate(null)
  }

  const runAutofill = async (matchList) => {
    const newPreds = { ...predictions }
    const updates = []
    for (const match of matchList) {
      const score = predictScore(match.home_team?.fifa_ranking, match.away_team?.fifa_ranking)
      newPreds[match.id] = { ...newPreds[match.id], home: score.home, away: score.away }
      updates.push(supabase.from('predictions').upsert({
        user_id: user.id, match_id: match.id,
        home_score: score.home, away_score: score.away,
        is_confident: newPreds[match.id]?.joker ?? false, bracket_type: 'main',
      }, { onConflict: 'user_id,match_id,bracket_type' }))
    }
    setPredictions(newPreds)
    await Promise.all(updates)
  }

  const formatDate = (time) => new Date(time).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  const formatTime = (time) => new Date(time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const formatDateKey = (time) => new Date(time).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const clearPick = async (matchId) => {
    if (!user) return
    setPredictions(prev => { const next = { ...prev }; delete next[matchId]; return next })
    await supabase.from('predictions').delete().eq('match_id', matchId).eq('user_id', user.id)
  }

  const clearGroupPredictions = async () => {
    if (!user) return
    const groupMatchIds = groupMatches.map(m => m.id)
    setPredictions(prev => { const next = { ...prev }; groupMatchIds.forEach(id => delete next[id]); return next })
    await supabase.from('predictions').delete().in('match_id', groupMatchIds).eq('user_id', user.id)
    setShowClearConfirm(false)
  }

  const clearDatePredictions = async (dateMatches) => {
    if (!user) return
    const ids = dateMatches.map(m => m.id).filter(id => !isLocked(matches.find(m => m.id === id)?.kickoff_time))
    setPredictions(prev => { const next = { ...prev }; ids.forEach(id => delete next[id]); return next })
    await supabase.from('predictions').delete().in('match_id', ids).eq('user_id', user.id)
    setShowClearConfirm(false)
  }

  const getMatchOdds = (match) => {
    const homeName = match.home_team?.name
    const awayName = match.away_team?.name
    if (!homeName || !awayName) return null
    const key1 = `${homeName}|${awayName}`
    if (odds[key1]) return odds[key1]
    const key2 = `${toApiName(homeName)}|${toApiName(awayName)}`
    if (odds[key2]) return odds[key2]
    const normHome = normalise(homeName), normAway = normalise(awayName)
    for (const key of Object.keys(odds)) {
      const [h, a] = key.split('|')
      if (normalise(h) === normHome && normalise(a) === normAway) return odds[key]
    }
    return null
  }

  const getPredictionCount = () =>
    Object.values(predictions).filter(p => p.home !== undefined && p.home !== '' && p.away !== undefined && p.away !== '').length

  const matchesByDate = matches.reduce((acc, match) => {
    const key = formatDateKey(match.kickoff_time)
    if (!acc[key]) acc[key] = []
    acc[key].push(match)
    return acc
  }, {})

  const groupMatches = matches.filter(m => m.group?.name === activeGroup)

  if (loading) {
    return (
      <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh', padding: '16px' }}>
        <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '16px' }}>
          <SkeletonCard rows={2} /><SkeletonCard rows={4} /><SkeletonCard rows={4} /><SkeletonCard rows={4} />
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>
        <ErrorState message="Couldn't load predictions" onRetry={() => { setLoading(true); setLoadError(false); loadMatches() }} />
      </div>
    )
  }

  // Item 7: colour coding for completed match result vs prediction
  const getResultColour = (match, pred) => {
    if (match.status !== 'completed' || pred?.home === undefined) return null
    const predHome = Number(pred.home), predAway = Number(pred.away)
    const actHome = match.home_score, actAway = match.away_score
    if (predHome === actHome && predAway === actAway) return 'gold'   // exact score
    const predResult = predHome > predAway ? 'H' : predHome < predAway ? 'A' : 'D'
    const actResult  = actHome  > actAway  ? 'H' : actHome  < actAway  ? 'A' : 'D'
    if (predResult === actResult) return 'green'  // correct result
    return 'red' // wrong
  }

  const renderMatch = (match) => {
    const pred = predictions[match.id] || {}
    const locked = isLocked(match.kickoff_time)
    const isSaving = saving[match.id]
    const isSaved = saved[match.id]
    const matchOdds = getMatchOdds(match)
    const hasPrediction = pred.home !== undefined && pred.home !== ''
    const isGuest = !user
    const hasJoker = pred.joker === true
    const canUseJoker = !locked && user && hasPrediction && (jokersRemaining > 0 || hasJoker)
    const resultColour = getResultColour(match, pred)

    const getFavourite = () => {
      if (!matchOdds) return null
      const homeD = matchOdds.home_decimal || 99, drawD = matchOdds.draw_decimal || 99, awayD = matchOdds.away_decimal || 99
      const minOdds = Math.min(homeD, drawD, awayD)
      if (homeD === minOdds) return 'home'
      if (awayD === minOdds) return 'away'
      return 'draw'
    }
    const favourite = getFavourite()

    // Item 7: border/bg for completed matches
    const cardBorder = resultColour === 'gold' ? '2px solid var(--accent-gold)'
      : resultColour === 'green' ? '2px solid var(--accent-green)'
      : resultColour === 'red' ? '2px solid var(--accent-red)'
      : hasJoker ? '2px solid var(--accent-gold)'
      : hasPrediction ? '1px solid var(--accent-green)'
      : '1px solid var(--border-light)'

    const cardBg = resultColour === 'gold' ? 'var(--accent-gold-light)'
      : resultColour === 'green' ? 'var(--accent-green-light)'
      : resultColour === 'red' ? 'var(--accent-red-light)'
      : hasJoker ? 'var(--accent-gold-light)'
      : 'var(--bg-card)'

    return (
      <div key={match.id} className="card" style={{ opacity: locked && !hasPrediction ? 0.6 : 1, border: cardBorder, background: cardBg }}>

        {/* Result badge for completed */}
        {resultColour && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px',
            padding: '5px 10px', borderRadius: 'var(--radius-sm)', fontSize: '12px', fontWeight: '700',
            background: resultColour === 'gold' ? 'rgba(255,215,0,0.2)' : resultColour === 'green' ? 'rgba(0,122,51,0.1)' : 'rgba(198,40,40,0.1)',
            color: resultColour === 'gold' ? '#b8860b' : resultColour === 'green' ? 'var(--accent-green)' : 'var(--accent-red)',
          }}>
            {resultColour === 'gold' ? '🎯 Exact score!' : resultColour === 'green' ? '✅ Correct result' : '❌ Wrong result'}
            {hasJoker && ' · 🃏 Joker'}
          </div>
        )}

        {/* Joker indicator (non-completed) */}
        {hasJoker && !resultColour && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', padding: '6px 10px', background: 'rgba(255,215,0,0.2)', borderRadius: 'var(--radius-sm)', fontSize: '12px', fontWeight: '700', color: '#b8860b' }}>
            🃏 Joker applied — 2x points if correct!
          </div>
        )}

        {/* Match info row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {match.match_number && <span style={{ marginRight: '6px' }}>Match {match.match_number} ·</span>}
            {viewMode === 'date'
              ? `Grp ${match.group?.name} · ${formatTime(match.kickoff_time)}`
              : `${formatDate(match.kickoff_time)} · ${formatTime(match.kickoff_time)}`}
            {match.venue?.city && <span style={{ marginLeft: '6px' }}>· {match.venue.city} {VENUE_FLAGS[match.venue.city] || ''}</span>}
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {locked && <span className="badge badge-red">🔒</span>}
            {!locked && hasPrediction && !hasJoker && <span className="badge badge-green">✓</span>}
            {match.status === 'completed' && (
              <span className="badge badge-gray">{match.home_score}–{match.away_score}</span>
            )}
          </div>
        </div>

        {/* Teams + inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '36px' }}>{match.home_team?.flag_emoji}</span>
            <span style={{ fontWeight: '700', fontSize: '13px', textAlign: 'center' }}>{match.home_team?.name}</span>
            {favourite === 'home' && matchOdds && <span style={{ fontSize: '10px', color: 'var(--accent-green)', fontWeight: '700' }}>⭐ Favourite</span>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="number" className="score-input" min="0" max="99"
              value={pred.home ?? ''}
              onChange={e => handleScoreChange(match.id, 'home', e.target.value)}
              onBlur={() => handleScoreBlur(match, 'home')}
              disabled={locked || isGuest} placeholder="?"
              style={{ cursor: isGuest ? 'not-allowed' : 'text', opacity: isGuest ? 0.5 : 1 }}
            />
            <span className="score-divider">–</span>
            <input type="number" className="score-input" min="0" max="99"
              value={pred.away ?? ''}
              onChange={e => handleScoreChange(match.id, 'away', e.target.value)}
              onBlur={() => handleScoreBlur(match, 'away')}
              disabled={locked || isGuest} placeholder="?"
              style={{ cursor: isGuest ? 'not-allowed' : 'text', opacity: isGuest ? 0.5 : 1 }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '36px' }}>{match.away_team?.flag_emoji}</span>
            <span style={{ fontWeight: '700', fontSize: '13px', textAlign: 'center' }}>{match.away_team?.name}</span>
            {favourite === 'away' && matchOdds && <span style={{ fontSize: '10px', color: 'var(--accent-green)', fontWeight: '700' }}>⭐ Favourite</span>}
          </div>
        </div>

        {/* Odds */}
        {matchOdds && !locked && (
          <div className="odds-row">
            <div className={`odds-item ${favourite === 'home' ? 'odds-favourite' : ''}`}>
              <span className="odds-label">{match.home_team?.short_code}</span>
              <span className="odds-value">{matchOdds.home}</span>
            </div>
            <div className={`odds-item ${favourite === 'draw' ? 'odds-favourite' : ''}`}>
              <span className="odds-label">Draw</span>
              <span className="odds-value">{matchOdds.draw}</span>
            </div>
            <div className={`odds-item ${favourite === 'away' ? 'odds-favourite' : ''}`}>
              <span className="odds-label">{match.away_team?.short_code}</span>
              <span className="odds-value">{matchOdds.away}</span>
            </div>
          </div>
        )}

        {/* Guest CTA */}
        {isGuest && !locked && (
          <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Register to save your predictions</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Link to="/register" className="btn btn-primary btn-sm">Join free</Link>
              <Link to="/login" className="btn btn-secondary btn-sm">Sign in</Link>
            </div>
          </div>
        )}

        {/* Joker + Save */}
        {!isGuest && !locked && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '12px', borderTop: `1px solid ${hasJoker ? 'rgba(255,215,0,0.4)' : 'var(--border-light)'}` }}>
            <button
              onClick={() => {
                if (!hasPrediction || !canUseJoker) return
                if (!hasJoker) {
                  setJokerConfirm({ matchId: match.id, currentJoker: hasJoker })
                } else {
                  handleJoker(match.id, hasJoker) // removing joker needs no confirm
                }
              }}
              disabled={!hasPrediction || (!canUseJoker && !hasJoker)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', borderRadius: 'var(--radius-full)',
                fontSize: '12px', fontWeight: '700',
                background: hasJoker ? 'var(--accent-gold)' : 'var(--bg-tertiary)',
                color: hasJoker ? 'white' : jokersRemaining > 0 ? 'var(--text-secondary)' : 'var(--text-muted)',
                border: hasJoker ? '1px solid var(--accent-gold)' : '1px solid var(--border-light)',
                transition: 'all 0.15s', cursor: hasPrediction && (canUseJoker || hasJoker) ? 'pointer' : 'not-allowed',
                opacity: !hasPrediction ? 0.5 : 1,
              }}
            >
              🃏 {hasJoker ? 'Joker ON' : 'Use Joker'}
            </button>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {/* Item 4: Clear button on individual card */}
              {hasPrediction && (
                <button
                  onClick={() => clearPick(match.id)}
                  style={{
                    padding: '6px 10px', borderRadius: 'var(--radius-full)',
                    fontSize: '12px', fontWeight: '600', border: '1px solid var(--border-light)',
                    background: 'var(--bg-tertiary)', color: 'var(--text-muted)', cursor: 'pointer',
                  }}
                >Clear</button>
              )}
              <button
                onClick={() => savePrediction(match)}
                disabled={isSaving || pred.home === '' || pred.home === undefined}
                className={`btn btn-sm ${isSaved ? 'btn-save-success' : 'btn-save'}`}
                style={{ minWidth: '80px' }}
              >
                {isSaving
                  ? <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
                  : isSaved ? '✓ Saved' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* Completed match — prediction vs result */}
        {locked && match.status === 'completed' && hasPrediction && (
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-muted)' }}>
              Your pick: <strong>{pred.home} – {pred.away}</strong>
              {hasJoker && <span style={{ marginLeft: '6px', color: '#b8860b' }}>🃏</span>}
            </span>
            <span style={{ fontWeight: '700', color: 'var(--accent-green)' }}>+{predictions[match.id]?.points_total || 0} pts</span>
          </div>
        )}
      </div>
    )
  }

  // Single group standings (By Group view)
  const renderGroupStandings = () => {
    if (groupMatches.length === 0) return null
    const { standings, allPredicted } = calcGroupStandings(groupMatches, predictions)
    const hasPreds = standings.some(s => s.played > 0)
    if (!hasPreds) return null

    const hasFairPlayTie = allPredicted && standings.some((s, i) => {
      if (i === 0) return false
      const prev = standings[i - 1]
      return s.pts === prev.pts && s.gd === prev.gd && s.gf === prev.gf
    })

    // Work out where this group's 3rd place team ranks among all groups
    const allStandings = calcPredictedStandings(matches, predictions)
    const best3rd = getBest3rdTeams(allStandings) || []
    const best3rdIds = new Set(best3rd.slice(0, 8).map(t => t?.id).filter(Boolean))
    const this3rd = standings[2]
    const this3rdRank = best3rd.findIndex(t => t?.id === this3rd?.id) + 1
    const this3rdQualifies = best3rdIds.has(this3rd?.id)
    const groupsWithPreds = Object.values(allStandings).filter(teams => teams.some(t => t.played > 0)).length

    return (
      <div className="card" style={{ marginTop: '4px' }}>
        <div style={{ fontWeight: '800', fontSize: '13px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>📊 Predicted Group {activeGroup} Standings</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '400' }}>Based on your picks</span>
        </div>
        {hasFairPlayTie && (
          <div style={{ marginBottom: '8px', padding: '6px 10px', background: 'var(--accent-gold-light)', borderRadius: 'var(--radius-sm)', fontSize: '11px', color: 'var(--accent-gold)', fontWeight: '600' }}>
            ⚠️ Teams are level on all criteria — FIFA would use fair play points or a draw of lots. You may want to adjust your predictions.
          </div>
        )}
        <StandingsHeader />
        {standings.map((entry, i) => (
          <StandingsRow
            key={entry.id}
            entry={entry}
            position={i + 1}
            qualifies={i < 2}
            qualifies3rd={i === 2 && allPredicted && this3rdQualifies}
          />
        ))}
        {/* 3rd place context across all groups */}
        {allPredicted && this3rd && groupsWithPreds > 1 && (
          <div style={{
            marginTop: '8px', padding: '7px 10px',
            background: this3rdQualifies ? 'var(--accent-gold-light)' : 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-sm)', fontSize: '11px', fontWeight: '600',
            color: this3rdQualifies ? '#b8860b' : 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            border: this3rdQualifies ? '1px solid rgba(184,134,11,0.3)' : '1px solid var(--border-light)',
          }}>
            <span>
              {this3rd.team?.flag_emoji} {this3rd.team?.short_code} · {this3rdRank > 0 ? `${this3rdRank}${['st','nd','rd'][this3rdRank-1]||'th'} best 3rd` : 'unranked'} of {groupsWithPreds} groups
            </span>
            <span style={{ fontWeight: '800' }}>
              {this3rdQualifies ? '🏅 On track' : 'Needs improvement'}
            </span>
          </div>
        )}
        {allPredicted && this3rd && groupsWithPreds <= 1 && (
          <StandingsLegend allPredicted={allPredicted} />
        )}
        {!allPredicted && (
          <StandingsLegend allPredicted={false} />
        )}
      </div>
    )
  }

  // All-groups standings (By Date view)
  const renderAllGroupsStandings = () => {
    const allStandings = calcPredictedStandings(matches, predictions)
    const hasPreds = Object.values(allStandings).some(teams => teams.some(t => t.played > 0))
    if (!hasPreds) return null

    const best3rd = getBest3rdTeams(allStandings) || []
    const best3rdIds = new Set(best3rd.map(t => t?.id).filter(Boolean))
    const allGroupsComplete = Object.keys(allStandings).every(g => groupFullyPredicted(g, matches, predictions))

    return (
      <div style={{ marginTop: '32px' }}>
        <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: '4px' }}>📊 All Group Standings</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Based on your predictions across all groups
        </div>

        <div className="group-grid">
          {Object.entries(allStandings).sort(([a], [b]) => a.localeCompare(b)).map(([group, teams]) => {
            const groupComplete = groupFullyPredicted(group, matches, predictions)
            const hasPred = teams.some(t => t.played > 0)
            if (!hasPred) return null
            return (
              <div key={group} className="card" style={{ padding: '12px' }}>
                <div style={{ fontWeight: '800', fontSize: '13px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ background: 'var(--primary)', color: 'var(--text-inverse)', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', flexShrink: 0 }}>
                    {group}
                  </span>
                  Group {group}
                </div>
                <StandingsHeader />
                {teams.map((entry, i) => (
                  <StandingsRow
                    key={entry.id}
                    entry={entry}
                    position={i + 1}
                    qualifies={i < 2}
                    qualifies3rd={i === 2 && groupComplete && best3rdIds.has(entry.id)}
                  />
                ))}
                <StandingsLegend allPredicted={groupComplete} />
              </div>
            )
          })}
        </div>

        {/* Best 3rd place summary */}
        {best3rd.length > 0 && (
          <div className="card" style={{ marginTop: '16px' }}>
            <div style={{ fontWeight: '800', fontSize: '13px', marginBottom: '4px' }}>🏅 Best 3rd Place Teams</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
              Top 8 of 12 third-place teams advance to the Round of 32
              {!allGroupsComplete && <span style={{ fontStyle: 'italic' }}> · predict all groups to see final ranking</span>}
            </div>
            <StandingsHeader />
            {best3rd.map((entry, i) => (
              <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: 'var(--radius-sm)', marginBottom: '2px', background: i < 8 ? 'var(--accent-green-light)' : 'var(--bg-secondary)', border: i < 8 ? '1px solid rgba(0,122,51,0.15)' : '1px solid transparent' }}>
                <span style={{ width: '16px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>{i + 1}</span>
                <span style={{ fontSize: '18px' }}>{entry.team?.flag_emoji}</span>
                <span style={{ flex: 1, fontSize: '12px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.team?.short_code || entry.team?.name}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', marginRight: '4px' }}>Grp {entry.group}</span>
                <span style={{ width: '16px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{entry.played ?? '–'}</span>
                <span style={{ width: '28px', fontSize: '15px', fontWeight: '900', fontFamily: 'var(--font-mono)', textAlign: 'center', color: 'var(--text-primary)' }}>{entry.pts}</span>
                <span style={{ width: '30px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{entry.gd > 0 ? '+' : ''}{entry.gd}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>

      {/* Item 8: Score warning modal */}
      {scoreWarning && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ maxWidth: '320px', width: '100%' }}>
            <div style={{ fontWeight: '800', fontSize: '16px', marginBottom: '8px' }}>⚠️ High score entered</div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              You've entered <strong>{scoreWarning.value}</strong> goals — are you sure? That's unusually high for a World Cup match.
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => { setScoreWarning(null); savePrediction(scoreWarning.match) }}
                className="btn btn-primary" style={{ flex: 1 }}
              >Yes, save it</button>
              <button
                onClick={() => {
                  handleScoreChange(scoreWarning.matchId, scoreWarning.side, '')
                  setScoreWarning(null)
                }}
                className="btn btn-secondary" style={{ flex: 1 }}
              >Change it</button>
            </div>
          </div>
        </div>
      )}

      {/* Joker reminder */}
      {showJokerReminder && user && jokersRemaining > 0 && (
        <div style={{ background: 'linear-gradient(135deg, #b8860b, #ffd700)', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ color: 'white', fontSize: '13px', fontWeight: '600' }}>
            ⚠️ Group stage ends in less than 24hrs! You have <strong>{jokersRemaining} joker{jokersRemaining > 1 ? 's' : ''}</strong> left — use them!
          </div>
          <button onClick={() => setShowJokerReminder(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px' }}>✕</button>
        </div>
      )}

      {/* Guest banner */}
      {!user && (
        <div style={{ background: 'linear-gradient(135deg, #0a0a0a, #1a2a1a)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ color: 'white', fontSize: '14px' }}>
            <strong>👋 Browsing as guest</strong>
            <span style={{ color: 'rgba(255,255,255,0.6)', marginLeft: '8px' }}>Register free to save predictions & compete</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link to="/register" className="btn btn-green btn-sm">Join free</Link>
            <Link to="/login" className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>Sign in</Link>
          </div>
        </div>
      )}

      {/* Sticky header — Knockout-style tab bar */}
      <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)', position: 'sticky', top: 'var(--nav-height)', zIndex: 50 }}>
        <div className="container">

          {/* Row 1: Title + joker + count */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>⚽ Predictions</h1>
              <Link to="/how-to-play" style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', flexShrink: 0, textDecoration: 'none' }}>?</Link>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {user && (
                <div className={`joker-counter ${jokersRemaining === 0 ? 'joker-counter-empty' : jokersRemaining <= 2 ? 'joker-counter-low' : 'joker-counter-active'}`}
                  style={{ animation: jokersRemaining > 0 && showJokerReminder ? 'pulse 1.5s infinite' : 'none' }}>
                  <span style={{ fontSize: '13px', lineHeight: 1 }}>🃏</span>
                  <span style={{ fontSize: '13px', fontWeight: '800' }}>{jokersRemaining}</span>
                  <span style={{ fontSize: '10px', fontWeight: '500', opacity: 0.8 }}>left</span>
                </div>
              )}
              {user && (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span style={{ fontWeight: '700', color: 'var(--accent-green)' }}>{getPredictionCount()}</span>
                  <span> / {matches.length}</span>
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Adaptive tab bar */}
          <div style={{ display: 'flex', overflowX: 'auto', marginTop: '4px', borderBottom: '1px solid var(--border-light)', scrollbarWidth: 'none' }}>

            {viewMode === 'group' ? (
              <>
                <button onClick={() => setViewMode('date')} style={{
                  padding: '10px 14px', fontSize: '12px', fontWeight: '400',
                  color: 'var(--text-muted)', borderBottom: '2px solid transparent',
                  background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                }}>
                  By Date
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>All groups</span>
                </button>
                <div style={{ width: '1px', background: 'var(--border-light)', margin: '8px 2px', flexShrink: 0 }} />
                {GROUPS.map(g => {
                  const gMatches = matches.filter(m => m.group?.name === g)
                  const gDone = gMatches.filter(m => predictions[m.id]?.home !== undefined && predictions[m.id]?.home !== '').length
                  const gComplete = gDone === gMatches.length && gMatches.length > 0
                  const isActive = activeGroup === g
                  return (
                    <button key={g} onClick={() => setActiveGroup(g)} style={{
                      padding: '10px 12px', fontSize: '12px', fontWeight: isActive ? '700' : '400',
                      color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                      borderBottom: isActive ? '2px solid var(--accent-green)' : '2px solid transparent',
                      background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                    }}>
                      Grp {g}
                      <span style={{ fontSize: '10px', color: gComplete ? 'var(--accent-green)' : 'var(--text-muted)', fontWeight: '600' }}>
                        {gComplete ? '✓' : `${gDone}/${gMatches.length}`}
                      </span>
                    </button>
                  )
                })}
                {user && (
                  <button onClick={() => setShowClearConfirm('group')} style={{
                    padding: '10px 10px', fontSize: '11px', color: 'rgba(255,255,255,0.4)',
                    background: 'none', border: 'none', borderBottom: '2px solid transparent',
                    cursor: 'pointer', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                  }}>🗑️<span style={{ fontSize: '10px' }}>Clear</span>
                  </button>
                )}
              </>
            ) : (
              <>
                <button onClick={() => setViewMode('group')} style={{
                  padding: '10px 14px', fontSize: '12px', fontWeight: '400',
                  color: 'var(--text-muted)', borderBottom: '2px solid transparent',
                  background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                }}>
                  By Group
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>A – L</span>
                </button>
                <div style={{ width: '1px', background: 'var(--border-light)', margin: '8px 2px', flexShrink: 0 }} />
                {Object.entries(matchesByDate).map(([dateKey, dayMatches]) => {
                  const firstMatch = dayMatches[0]
                  const shortDate = new Date(firstMatch.kickoff_time).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
                  const donePreds = dayMatches.filter(m => predictions[m.id]?.home !== undefined && predictions[m.id]?.home !== '').length
                  const complete = donePreds === dayMatches.length
                  return (
                    <button key={dateKey} onClick={() => {
                      const el = document.getElementById(`date-${dateKey.replace(/[^a-z0-9]/gi, '-')}`)
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }} style={{
                      padding: '10px 12px', fontSize: '11px', fontWeight: '500',
                      color: 'var(--text-muted)', borderBottom: '2px solid transparent',
                      background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                    }}>
                      {shortDate}
                      <span style={{ fontSize: '10px', color: complete ? 'var(--accent-green)' : 'var(--text-muted)', fontWeight: '600' }}>
                        {complete ? '✓' : `${donePreds}/${dayMatches.length}`}
                      </span>
                    </button>
                  )
                })}
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }`}</style>

      {/* Matches */}
      <div className="container" style={{ padding: '16px' }}>
        {viewMode === 'group' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {groupMatches.map(renderMatch)}
            {groupMatches.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">⚽</div>
                <div className="empty-state-title">No matches in Group {activeGroup}</div>
              </div>
            )}
            {renderGroupStandings()}
          </div>
        ) : (
          // Item 2 & 3: By Date view with autofill and clear per day
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {Object.entries(matchesByDate).map(([date, dayMatches]) => {
              const hasUnlocked = dayMatches.some(m => !isLocked(m.kickoff_time))
              const hasPreds = dayMatches.some(m => predictions[m.id])
              const isFillingThis = autoFillingDate === dayMatches[0]?.kickoff_time
              return (
                <div key={date} id={`date-${date.replace(/[^a-z0-9]/gi, '-')}`}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-light)' }} />
                    <span>{date}</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-light)' }} />
                    {/* Item 3: clear per day */}
                    {user && hasPreds && hasUnlocked && (
                      <button onClick={() => clearDatePredictions(dayMatches)} style={{
                        fontSize: '11px', padding: '3px 8px', borderRadius: 'var(--radius-full)',
                        border: '1px solid var(--border-medium)', background: 'var(--bg-card)',
                        color: 'var(--text-muted)', cursor: 'pointer',
                      }}>🗑️ Clear</button>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {dayMatches.map(renderMatch)}
                  </div>
                </div>
              )
            })}
            {renderAllGroupsStandings()}
          </div>
        )}
      </div>

      {/* Clear confirm modal */}
      {/* Joker confirm modal */}
      {jokerConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ maxWidth: '340px', width: '100%' }}>
            <div style={{ fontWeight: '800', fontSize: '16px', marginBottom: '8px' }}>🃏 Use a Joker?</div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              This doubles your points for this match if you get the result right.
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              You have <strong>{jokersRemaining}</strong> joker{jokersRemaining !== 1 ? 's' : ''} remaining. This cannot be undone once the match kicks off.
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => { handleJoker(jokerConfirm.matchId, jokerConfirm.currentJoker); setJokerConfirm(null) }}
                className="btn btn-primary" style={{ flex: 1 }}>
                Yes, use joker
              </button>
              <button onClick={() => setJokerConfirm(null)} className="btn btn-secondary" style={{ flex: 1 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showClearConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ maxWidth: '340px', width: '100%' }}>
            <div style={{ fontWeight: '800', fontSize: '16px', marginBottom: '8px' }}>🗑️ Clear Predictions</div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              {showClearConfirm === 'group'
                ? `Clear all unlocked predictions in Group ${activeGroup}? This cannot be undone.`
                : 'Clear all unlocked predictions for this date? This cannot be undone.'}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => showClearConfirm === 'group' ? clearGroupPredictions() : clearDatePredictions([])} className="btn btn-primary" style={{ background: '#e53935', flex: 1 }}>Clear</button>
              <button onClick={() => setShowClearConfirm(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
