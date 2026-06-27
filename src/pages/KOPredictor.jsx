import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore, useAppStore } from '../store/index.js'
import { DATES } from '../lib/tournamentDates.js'
import WorldCupLogo from '../components/WorldCupLogo.jsx'

const STAGES = [
  { key: 'r32',   label: 'R32',       full: 'Round of 32',    total: 16 },
  { key: 'r16',   label: 'R16',       full: 'Round of 16',    total: 8 },
  { key: 'qf',    label: 'QF',        full: 'Quarter-finals', total: 4 },
  { key: 'sf',    label: 'SF',        full: 'Semi-finals',    total: 2 },
  { key: '3rd',   label: '3rd',       full: '3rd Place',      total: 1 },
  { key: 'final', label: 'Final',     full: 'The Final',      total: 1 },
]

const FIRST_GOAL_BANDS = [
  { key: '1-15',    label: '1–15' },
  { key: '16-30',   label: '16–30' },
  { key: '31-45',   label: '31–45' },
  { key: '46-60',   label: '46–60' },
  { key: '61-75',   label: '61–75' },
  { key: '76-90',   label: '76–90+' },
  { key: 'et',      label: 'Extra Time' },
  { key: 'no_goals',label: 'No Goals' },
]

const VENUE_FLAGS = {
  'New York': '🇺🇸', 'New Jersey': '🇺🇸', 'New York/NJ': '🇺🇸', 'Los Angeles': '🇺🇸',
  'Dallas': '🇺🇸', 'San Francisco': '🇺🇸', 'Seattle': '🇺🇸',
  'Miami': '🇺🇸', 'Atlanta': '🇺🇸', 'Boston': '🇺🇸', 'Houston': '🇺🇸',
  'Philadelphia': '🇺🇸', 'Kansas City': '🇺🇸',
  'Toronto': '🇨🇦', 'Vancouver': '🇨🇦',
  'Mexico City': '🇲🇽', 'Guadalajara': '🇲🇽', 'Monterrey': '🇲🇽',
}

export default function KOPredictor() {
  const { user, profile } = useAuthStore()
  const { appSettings } = useAppStore()
  const [matches, setMatches] = useState([])
  const [predictions, setPredictions] = useState({})
  const [odds, setOdds] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeStage, setActiveStage] = useState('r32')
  const [saving, setSaving] = useState({})
  const [saved, setSaved] = useState({})
  const [jokersRemaining, setJokersRemaining] = useState(5)
  const [jokerConfirm, setJokerConfirm] = useState(null)
  const [scoreWarning, setScoreWarning] = useState(null)
  const [m73Ready, setM73Ready] = useState(false)
  const smartStageAppliedRef = useRef(false)

  const phaseOverride = appSettings?.game_phase_override || ''
  const isOpen = phaseOverride === 'ko_predictor' || phaseOverride === 'post_tournament'
    ? true
    : phaseOverride && phaseOverride !== 'ko_predictor' ? false
    : m73Ready || new Date() >= DATES.KO_PREDICTOR_OPEN
  const isLocked = (kickoffTime) => new Date() >= new Date(kickoffTime)

  useEffect(() => {
    loadData()
    loadOdds()
  }, [user])

  useEffect(() => { loadFreshJokerCount() }, [user])

  const loadFreshJokerCount = async () => {
    if (!user) return
    // Source of truth is the actual saved KO joker picks, not the cached profile counter.
    const { count, error } = await supabase
      .from('ko_predictions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_joker', true)

    if (error) return
    const remaining = Math.max(0, 5 - (count || 0))
    setJokersRemaining(remaining)
    await supabase.from('profiles').update({ ko_jokers_remaining: remaining }).eq('id', user.id)
  }

  const loadData = async () => {
    setLoading(true)

    // Check if M73 (first R32 match) has both teams confirmed — opens KO Predictor early
    const { data: m73 } = await supabase
      .from('matches')
      .select('home_team_id, away_team_id')
      .eq('match_number', 73)
      .maybeSingle()
    if (m73?.home_team_id && m73?.away_team_id) setM73Ready(true)

    const { data: matchData } = await supabase
      .from('matches')
      .select('*, home_team:home_team_id(id,name,flag_emoji,short_code), away_team:away_team_id(id,name,flag_emoji,short_code)')
      .in('stage', ['r32','r16','qf','sf','3rd','final'])
      .order('kickoff_time', { ascending: true })
    setMatches(matchData || [])

    if (user) {
      const { data: predData } = await supabase
        .from('ko_predictions')
        .select('*')
        .eq('user_id', user.id)
      const predMap = {}
      predData?.forEach(p => {
        predMap[p.match_id] = {
          home: p.home_score,
          away: p.away_score,
          outcome_type: p.outcome_type || '90mins',
          winner_team_id: p.winner_team_id,
          first_goal_band: p.first_goal_band,
          is_joker: p.is_joker,
          points_awarded: p.points_awarded,
          points_breakdown: p.points_breakdown,
        }
      })
      setPredictions(predMap)
      const jokerCount = predData?.filter(p => p.is_joker === true).length || 0
      const remaining = Math.max(0, 5 - jokerCount)
      setJokersRemaining(remaining)
      await supabase.from('profiles').update({ ko_jokers_remaining: remaining }).eq('id', user.id)
    }
    setLoading(false)
  }

  const loadOdds = async () => {
    try {
      const res = await fetch('/.netlify/functions/get-odds')
      const data = await res.json()
      const oddsMap = {}
      data.forEach(g => { oddsMap[`${g.home_team}|${g.away_team}`] = g.odds })
      setOdds(oddsMap)
    } catch {}
  }

  const getMatchOdds = (match) => {
    const h = match.home_team?.name || ''
    const a = match.away_team?.name || ''
    return odds[`${h}|${a}`] || odds[`${a}|${h}`] || null
  }

  const handleScoreChange = (matchId, side, value) => {
    if (value.length > 2) return
    setPredictions(prev => {
      const current = prev[matchId] || {}
      const updated = { ...current, [side]: value === '' ? '' : parseInt(value) }
      // Work out if score is a draw after this change
      const home = parseInt(side === 'home' ? value : current.home)
      const away = parseInt(side === 'away' ? value : current.away)
      const isNowDraw = !isNaN(home) && !isNaN(away) && home === away
      const wasNonDraw = !isNaN(home) && !isNaN(away) && home !== away
      // If score becomes a non-draw, force 90mins and clear winner
      if (wasNonDraw) {
        updated.outcome_type = '90mins'
        updated.winner_team_id = null
      }
      // If score becomes a draw and outcome is 90mins, clear it so user must pick ET/Pens
      if (isNowDraw && (updated.outcome_type === '90mins' || !updated.outcome_type)) {
        updated.outcome_type = null // null = unselected, must pick
        updated.winner_team_id = null
      }
      updated._error = null
      return { ...prev, [matchId]: updated }
    })
  }

  const handleScoreBlur = (match, side) => {
    const pred = predictions[match.id] || {}
    const val = pred[side]
    if (val !== undefined && val !== '' && parseInt(val) >= 7) {
      setScoreWarning({ matchId: match.id, side, value: val })
    }
  }

  const savePrediction = async (match) => {
    if (!user || isLocked(match.kickoff_time)) return
    const pred = predictions[match.id] || {}
    if (pred.home === undefined || pred.home === '') return

    const homeScore = parseInt(pred.home)
    const awayScore = parseInt(pred.away ?? 0)
    const outcomeType = pred.outcome_type // null means unselected on a draw
    const isDraw = homeScore === awayScore

    // Validation
    if (isDraw && !outcomeType) {
      setPredictions(prev => ({ ...prev, [match.id]: { ...prev[match.id], _error: 'Select how it ends — Extra Time or Penalties' } }))
      return
    }
    if (isDraw && outcomeType === '90mins') {
      setPredictions(prev => ({ ...prev, [match.id]: { ...prev[match.id], _error: 'A draw must go to Extra Time or Penalties — select one' } }))
      return
    }
    if (outcomeType === 'et' && !isDraw) {
      setPredictions(prev => ({ ...prev, [match.id]: { ...prev[match.id], _error: 'Extra time only happens after a draw — enter equal scores (e.g. 1-1)' } }))
      return
    }
    if (outcomeType === 'penalties' && !isDraw) {
      setPredictions(prev => ({ ...prev, [match.id]: { ...prev[match.id], _error: 'Penalty shootouts only happen after a draw — enter equal scores (e.g. 1-1)' } }))
      return
    }
    if ((outcomeType === 'et' || outcomeType === 'penalties') && !pred.winner_team_id) {
      setPredictions(prev => ({ ...prev, [match.id]: { ...prev[match.id], _error: 'Please select a winner' } }))
      return
    }

    setPredictions(prev => ({ ...prev, [match.id]: { ...prev[match.id], _error: null } }))
    setSaving(prev => ({ ...prev, [match.id]: true }))

    const { error } = await supabase.from('ko_predictions').upsert({
      user_id: user.id,
      match_id: match.id,
      home_score: homeScore,
      away_score: awayScore,
      outcome_type: outcomeType || '90mins',
      winner_team_id: pred.winner_team_id || null,
      first_goal_band: pred.first_goal_band || null,
      is_joker: pred.is_joker || false,
      bracket_type: 'main',
    }, { onConflict: 'user_id,match_id,bracket_type' })

    setSaving(prev => ({ ...prev, [match.id]: false }))
    if (error) {
      setPredictions(prev => ({ ...prev, [match.id]: { ...prev[match.id], _error: error.message } }))
      return
    }
    setSaved(prev => ({ ...prev, [match.id]: true }))
    setTimeout(() => setSaved(prev => ({ ...prev, [match.id]: false })), 2000)
  }

  const handleJoker = async (matchId, currentJoker) => {
    if (!user) return
    const pred = predictions[matchId]
    if (!pred) return
    if (!currentJoker && jokersRemaining <= 0) return
    const newJoker = !currentJoker
    const newRemaining = newJoker ? jokersRemaining - 1 : jokersRemaining + 1
    setPredictions(prev => ({ ...prev, [matchId]: { ...prev[matchId], is_joker: newJoker } }))
    setJokersRemaining(newRemaining)
    const { error } = await supabase.from('ko_predictions').upsert({
      user_id: user.id, match_id: matchId,
      home_score: pred.home ?? 0, away_score: pred.away ?? 0,
      outcome_type: pred.outcome_type || '90mins',
      winner_team_id: pred.winner_team_id || null,
      first_goal_band: pred.first_goal_band || null,
      is_joker: newJoker, bracket_type: 'main',
    }, { onConflict: 'user_id,match_id,bracket_type' })
    if (error) {
      setPredictions(prev => ({ ...prev, [matchId]: { ...prev[matchId], is_joker: currentJoker, _error: error.message } }))
      setJokersRemaining(jokersRemaining)
      return
    }
    await supabase.from('profiles').update({ ko_jokers_remaining: newRemaining }).eq('id', user.id)
    await loadFreshJokerCount()
  }

  const formatTime = (t) => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const formatDate = (t) => new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

  const hasPredictionForMatch = (match) => {
    const pred = predictions[match.id]
    return pred?.home !== undefined && pred?.home !== '' && pred?.away !== undefined && pred?.away !== ''
  }

  const getSmartKOMatch = (stageKey = null) => {
    const now = new Date()
    const base = matches.filter(isConfirmed)
    const scope = stageKey ? base.filter(m => m.stage === stageKey) : base
    const ordered = [...scope].sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time))
    return ordered.find(m => !isLocked(m.kickoff_time) && !hasPredictionForMatch(m))
      || ordered.find(m => new Date(m.kickoff_time) >= now)
      || [...ordered].reverse().find(Boolean)
      || null
  }

  const scrollToKOMatch = (match, delay = 180) => {
    if (!match) return
    window.setTimeout(() => {
      const el = document.getElementById(`ko-match-${match.id}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, delay)
  }

  const goToSmartKOStage = (stageKey = null) => {
    const match = getSmartKOMatch(stageKey)
    if (match?.stage) setActiveStage(match.stage)
    scrollToKOMatch(match)
  }

  useEffect(() => {
    if (loading || smartStageAppliedRef.current || matches.length === 0) return
    smartStageAppliedRef.current = true
    goToSmartKOStage()
  }, [loading, matches.length, predictions])

  // A KO match is "confirmed" once both real teams are set (not null and not a
  // "Winner of.."/"Runner-up.." placeholder). Undecided matches are hidden until
  // their teams are known, rather than shown as empty cards.
  const isConfirmed = (m) =>
    !!(m.home_team_id && m.away_team_id) &&
    !/Winner|Runner/.test(m.home_team?.name || '') &&
    !/Winner|Runner/.test(m.away_team?.name || '')

  const stageMatches = matches.filter(m => m.stage === activeStage && isConfirmed(m)).sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time))
  const stagePending = matches.filter(m => m.stage === activeStage && !isConfirmed(m)).length
  const confirmedTotal = matches.filter(isConfirmed).length
  const getPredCount = (stage) => {
    const sm = matches.filter(m => m.stage === stage && isConfirmed(m))
    return sm.filter(m => predictions[m.id]?.home !== undefined && predictions[m.id]?.home !== '').length
  }

  const renderMatch = (match) => {
    const pred = predictions[match.id] || {}
    const locked = isLocked(match.kickoff_time)
    const isSaving = saving[match.id]
    const isSaved = saved[match.id]
    const matchOdds = getMatchOdds(match)
    const hasPrediction = pred.home !== undefined && pred.home !== ''
    const isGuest = !user
    const hasJoker = pred.is_joker === true
    const canUseJoker = !locked && user && hasPrediction && (jokersRemaining > 0 || hasJoker)
    const outcomeType = pred.outcome_type // null = draw entered but ET/Pens not yet selected
    const homeScore = parseInt(pred.home)
    const awayScore = parseInt(pred.away ?? 0)
    const isDraw = hasPrediction && homeScore === awayScore
    const needsWinner = outcomeType === 'et' || outcomeType === 'penalties'
    const outcomeUnselected = isDraw && !outcomeType
    const teamsKnown = match.home_team?.name && !match.home_team.name.includes('Winner') && !match.home_team.name.includes('Runner')

    // Result colouring for completed
    const getResultColour = () => {
      if (match.status !== 'completed' || !hasPrediction) return null
      const predWinner = outcomeType === '90mins'
        ? (homeScore > awayScore ? match.home_team_id : awayScore > homeScore ? match.away_team_id : null)
        : pred.winner_team_id
      if (pred.home === match.home_score && pred.away === match.away_score) return 'gold'
      if (predWinner === match.winner_team_id) return 'green'
      return 'red'
    }
    const resultColour = getResultColour()

    const cardBorder = resultColour === 'gold' ? '2px solid var(--accent-gold)'
      : resultColour === 'green' ? '2px solid var(--accent-green)'
      : resultColour === 'red' ? '2px solid var(--accent-red)'
      : hasJoker ? '2px solid #ff9800'
      : hasPrediction ? '1px solid #ff9800'
      : '1px solid var(--border-light)'

    const cardBg = resultColour === 'gold' ? 'var(--accent-gold-light)'
      : resultColour === 'green' ? 'var(--accent-green-light)'
      : resultColour === 'red' ? 'var(--accent-red-light)'
      : hasJoker ? '#fff3e0'
      : 'var(--bg-card)'

    const favourite = (() => {
      if (!matchOdds) return null
      const h = matchOdds.home_decimal || 99, d = matchOdds.draw_decimal || 99, a = matchOdds.away_decimal || 99
      const m = Math.min(h, d, a)
      return h === m ? 'home' : a === m ? 'away' : 'draw'
    })()

    return (
      <div key={match.id} id={`ko-match-${match.id}`} className="card" style={{ border: cardBorder, background: cardBg, opacity: locked && !hasPrediction ? 0.6 : 1 }}>

        {/* Result badge */}
        {resultColour && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', padding: '5px 10px', borderRadius: 'var(--radius-sm)', fontSize: '12px', fontWeight: '700',
            background: resultColour === 'gold' ? 'rgba(255,215,0,0.2)' : resultColour === 'green' ? 'rgba(0,122,51,0.1)' : 'rgba(198,40,40,0.1)',
            color: resultColour === 'gold' ? '#b8860b' : resultColour === 'green' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {resultColour === 'gold' ? '🎯 Exact score!' : resultColour === 'green' ? '✅ Correct result' : '❌ Wrong result'}
            {hasJoker && resultColour !== 'red' && <span style={{ marginLeft: '4px', color: 'var(--accent-gold)' }}>🃏 ×2</span>}
            {hasJoker && resultColour === 'red' && <span style={{ marginLeft: '4px' }}>🃏 wasted</span>}
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
              {pred.points_awarded !== undefined ? (pred.points_awarded === 0 ? '0' : `+${pred.points_awarded}`) : ''}pts
            </span>
          </div>
        )}

        {/* Joker indicator — pre-result */}
        {hasJoker && !resultColour && (
          <div style={{ marginBottom: '10px', padding: '6px 10px', background: 'rgba(255,152,0,0.15)', borderRadius: 'var(--radius-sm)', fontSize: '12px', fontWeight: '700', color: '#e65100' }}>
            🃏 Joker applied — 2× points if correct!
          </div>
        )}
        {/* Joker result banners */}
        {hasJoker && resultColour && resultColour !== 'red' && (
          <div style={{ marginBottom: '10px', padding: '6px 10px', background: 'rgba(184,134,11,0.12)', borderRadius: 'var(--radius-sm)', fontSize: '12px', fontWeight: '700', color: 'var(--accent-gold)', border: '1px solid rgba(184,134,11,0.3)' }}>
            🃏 Joker paid off! Points doubled ×2
          </div>
        )}
        {hasJoker && resultColour === 'red' && (
          <div style={{ marginBottom: '10px', padding: '6px 10px', background: 'rgba(198,40,40,0.06)', borderRadius: 'var(--radius-sm)', fontSize: '12px', fontWeight: '700', color: 'var(--accent-red)', border: '1px solid rgba(198,40,40,0.2)' }}>
            🃏 Joker wasted — wrong result, 0pts
          </div>
        )}

        {/* Match header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Match {match.match_number} · {formatDate(match.kickoff_time)} · {formatTime(match.kickoff_time)}
            {match.venue?.city && ` · ${VENUE_FLAGS[match.venue.city] || ''} ${match.venue.city}`}
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {locked && <span className="badge badge-red">🔒</span>}
            {!locked && hasPrediction && !hasJoker && <span className="badge" style={{ background: '#fff3e0', color: '#e65100' }}>✓</span>}
            {match.status === 'completed' && <span className="badge badge-gray">{match.home_score}–{match.away_score}</span>}
          </div>
        </div>

        {/* Teams + score inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '36px' }}>{match.home_team?.flag_emoji || '🏳️'}</span>
            <span style={{ fontWeight: '700', fontSize: '13px', textAlign: 'center' }}>{match.home_team?.name || '?'}</span>
            {favourite === 'home' && matchOdds && !locked && !resultColour && <span style={{ fontSize: '10px', color: 'var(--accent-green)', fontWeight: '700' }}>⭐ Favourite</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="number" className="score-input" min="0" max="99"
              value={pred.home ?? ''} placeholder="?"
              onChange={e => handleScoreChange(match.id, 'home', e.target.value)}
              onBlur={() => handleScoreBlur(match, 'home')}
              disabled={locked || isGuest}
              style={{ cursor: isGuest ? 'not-allowed' : 'text', opacity: isGuest ? 0.5 : 1 }}
            />
            <span className="score-divider">–</span>
            <input type="number" className="score-input" min="0" max="99"
              value={pred.away ?? ''} placeholder="?"
              onChange={e => handleScoreChange(match.id, 'away', e.target.value)}
              onBlur={() => handleScoreBlur(match, 'away')}
              disabled={locked || isGuest}
              style={{ cursor: isGuest ? 'not-allowed' : 'text', opacity: isGuest ? 0.5 : 1 }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '36px' }}>{match.away_team?.flag_emoji || '🏳️'}</span>
            <span style={{ fontWeight: '700', fontSize: '13px', textAlign: 'center' }}>{match.away_team?.name || '?'}</span>
            {favourite === 'away' && matchOdds && !locked && !resultColour && <span style={{ fontSize: '10px', color: 'var(--accent-green)', fontWeight: '700' }}>⭐ Favourite</span>}
          </div>
        </div>

        {/* Odds */}
        {matchOdds && !locked && (
          <div className="odds-row" style={{ marginBottom: '14px' }}>
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

        {/* Score label — clarify what the score means when ET/Pens selected */}
        {hasPrediction && !locked && !isGuest && isDraw && (outcomeType === 'et' || outcomeType === 'penalties') && (
          <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '8px', marginTop: '-6px' }}>
            ↑ Score after 90 mins
          </div>
        )}

        {/* Outcome picker */}
        {hasPrediction && !locked && !isGuest && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: outcomeUnselected ? 'var(--accent-red)' : 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {outcomeUnselected ? '⚠️ How does it end? (required)' : 'How does it end?'}
            </div>
            {!isDraw ? (
              // Score is a win — 90 mins only
              <div style={{ padding: '7px 12px', background: 'var(--scottish-navy)', borderRadius: 'var(--radius-sm)', fontSize: '11px', fontWeight: '700', color: 'white', textAlign: 'center' }}>
                ✓ 90 mins — winner decided by score
              </div>
            ) : (
              // Draw — must pick ET or Penalties
              <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { key: 'et',        label: '⏱ Extra Time', sub: '+3pts bonus' },
                  { key: 'penalties', label: '🎯 Penalties', sub: '+5pts bonus' },
                ].map(opt => (
                  <button key={opt.key}
                    onClick={() => setPredictions(prev => ({
                      ...prev,
                      [match.id]: {
                        ...prev[match.id],
                        outcome_type: opt.key,
                        // Clear winner if switching between ET and Pens
                        winner_team_id: prev[match.id]?.outcome_type === opt.key ? prev[match.id].winner_team_id : null,
                        _error: null,
                      }
                    }))}
                    style={{
                      padding: '7px 10px', fontSize: '12px', fontWeight: '700',
                      borderRadius: 'var(--radius-sm)', cursor: 'pointer', flex: 1,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                      background: outcomeType === opt.key ? '#e65100' : outcomeUnselected ? 'rgba(198,40,40,0.06)' : 'var(--bg-tertiary)',
                      color: outcomeType === opt.key ? 'white' : outcomeUnselected ? 'var(--accent-red)' : 'var(--text-secondary)',
                      border: outcomeType === opt.key ? '1px solid #e65100' : outcomeUnselected ? '1px solid rgba(198,40,40,0.3)' : '1px solid var(--border-light)',
                    }}>
                    <span>{opt.label}</span>
                    <span style={{ fontSize: '10px', opacity: 0.8, fontWeight: '600' }}>{opt.sub}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Winner picker — only for ET/Pens with draw score */}
        {hasPrediction && isDraw && needsWinner && !locked && !isGuest && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {outcomeType === 'penalties' ? '🎯 Who wins on penalties?' : '⏱ Who wins in extra time?'}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { id: match.home_team_id, flag: match.home_team?.flag_emoji, name: match.home_team?.short_code },
                { id: match.away_team_id, flag: match.away_team?.flag_emoji, name: match.away_team?.short_code },
              ].map(team => (
                <button key={team.id}
                  onClick={() => setPredictions(prev => ({ ...prev, [match.id]: { ...prev[match.id], winner_team_id: team.id, _error: null } }))}
                  style={{
                    flex: 1, padding: '10px 8px', fontSize: '13px', fontWeight: '700',
                    borderRadius: 'var(--radius-md)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    background: pred.winner_team_id === team.id ? '#e65100' : 'var(--bg-tertiary)',
                    color: pred.winner_team_id === team.id ? 'white' : 'var(--text-secondary)',
                    border: pred.winner_team_id === team.id ? '1px solid #e65100' : '1px solid var(--border-light)',
                  }}>
                  {team.flag} {team.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* First goal band */}
        {hasPrediction && !locked && !isGuest && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ⏱ First Goal? <span style={{ color: '#e65100' }}>+3pts</span> <span style={{ fontWeight: '400', textTransform: 'none' }}>(optional)</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {FIRST_GOAL_BANDS.map(band => (
                <button key={band.key}
                  onClick={() => setPredictions(prev => ({ ...prev, [match.id]: { ...prev[match.id], first_goal_band: prev[match.id]?.first_goal_band === band.key ? null : band.key } }))}
                  style={{
                    padding: '4px 8px', fontSize: '11px', fontWeight: '600',
                    borderRadius: '4px', cursor: 'pointer',
                    background: pred.first_goal_band === band.key ? 'var(--scottish-navy)' : 'var(--bg-tertiary)',
                    color: pred.first_goal_band === band.key ? 'white' : 'var(--text-muted)',
                    border: pred.first_goal_band === band.key ? '1px solid var(--scottish-navy)' : '1px solid var(--border-light)',
                  }}>
                  {band.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Validation error */}
        {pred._error && (
          <div style={{ marginBottom: '10px', padding: '8px 12px', background: 'var(--accent-red-light)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--accent-red)', fontWeight: '600' }}>
            ⚠️ {pred._error}
          </div>
        )}

        {/* Guest CTA */}
        {isGuest && !locked && (
          <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Register to save your picks</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Link to="/register" className="btn btn-primary btn-sm">Join free</Link>
              <Link to="/login" className="btn btn-secondary btn-sm">Sign in</Link>
            </div>
          </div>
        )}

        {/* Joker + Save */}
        {!isGuest && !locked && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '12px', borderTop: `1px solid ${hasJoker ? 'rgba(255,152,0,0.4)' : 'var(--border-light)'}` }}>
            <button
              onClick={() => {
                if (!hasPrediction || !canUseJoker) return
                if (!hasJoker) setJokerConfirm({ matchId: match.id, currentJoker: false })
                else handleJoker(match.id, true)
              }}
              disabled={!hasPrediction || (!canUseJoker && !hasJoker)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', borderRadius: 'var(--radius-full)',
                fontSize: '12px', fontWeight: '700',
                background: hasJoker ? '#ff9800' : 'var(--bg-tertiary)',
                color: hasJoker ? 'white' : jokersRemaining > 0 ? 'var(--text-secondary)' : 'var(--text-muted)',
                border: hasJoker ? '1px solid #ff9800' : '1px solid var(--border-light)',
                cursor: hasPrediction && (canUseJoker || hasJoker) ? 'pointer' : 'not-allowed',
                opacity: !hasPrediction ? 0.5 : 1,
              }}>
              🃏 {hasJoker ? 'Joker ON' : 'Use Joker'}
            </button>

            <button
              onClick={() => savePrediction(match)}
              disabled={isSaving || !hasPrediction}
              className={`btn btn-sm ${isSaved ? 'btn-save-success' : ''}`}
              style={{ minWidth: '80px', background: isSaved ? 'var(--accent-green)' : '#e65100', color: 'white', border: 'none' }}
            >
              {isSaving
                ? <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
                : isSaved ? '✓ Saved' : 'Save'}
            </button>
          </div>
        )}

        {/* Completed — your pick vs result */}
        {locked && match.status === 'completed' && hasPrediction && (
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-muted)' }}>
              Your pick: <strong>{pred.home}–{pred.away}</strong>
              {outcomeType !== '90mins' && <span style={{ marginLeft: '4px', color: '#e65100', fontSize: '11px' }}>({outcomeType === 'et' ? 'AET' : 'PENS'})</span>}
              {hasJoker && <span style={{ marginLeft: '6px', color: '#ff9800' }}>🃏</span>}
            </span>
            <span style={{ fontWeight: '700', color: '#e65100' }}>
              {pred.points_awarded > 0 ? `+${pred.points_awarded}pts` : '0pts'}
            </span>
          </div>
        )}
      </div>
    )
  }

  // Pre-launch state
  if (!isOpen) {
    return (
      <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>
        <div style={{ background: 'linear-gradient(135deg, #e65100, #ff9800)', padding: '32px 20px', color: 'white', textAlign: 'center' }}>
          <div className="container">
            <WorldCupLogo variant="hero" size={104} />
            <h1 style={{ fontSize: '26px', fontWeight: '900', marginBottom: '8px' }}>🔥 Knockout Predictor</h1>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '15px', marginBottom: '4px' }}>Separate game · fresh start · everyone on 0pts</p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Opens as soon as the Round of 32 teams are confirmed</p>
          </div>
        </div>
        <div className="container" style={{ padding: '24px 16px' }}>
          <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>⏳</div>
            <div style={{ fontWeight: '800', fontSize: '18px', marginBottom: '8px' }}>🔥 KO Predictor</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>
              Not the same as the Knockout Bracket — this is a completely separate game. Predict actual scores for all 32 knockout matches. Opens once R32 teams are confirmed from real results. Everyone starts at 0pts — even if your group stage didn't go well.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
              {[
                { icon: '⚽', label: '32 matches to predict' },
                { icon: '🃏', label: '5 jokers to use' },
                { icon: '⏱', label: '+3pts first goal bonus' },
                { icon: '🏆', label: 'Separate leaderboard' },
              ].map(item => (
                <div key={item.label} style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: '600' }}>
                  {item.icon} {item.label}
                </div>
              ))}
            </div>
            <Link to="/predictions" className="btn btn-primary btn-full">
              Meanwhile — make your group predictions →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #e65100, #ff9800)', position: 'sticky', top: 'var(--nav-height)', zIndex: 50 }}>
        <div className="container">
          {/* Row 1: Title + joker counter */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0 8px', gap: '10px' }}>
            <WorldCupLogo variant="compact" size={42} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', flex: 1 }}>
              <span style={{ fontSize: '18px', fontWeight: '800', color: 'white' }}>🔥 KO Predictor</span>
              <span style={{ fontSize: '10.5px', fontWeight: '600', color: 'rgba(255,255,255,0.85)' }}>Separate game · doesn't affect your Tournament score</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: 'var(--radius-full)', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', fontSize: '12px', fontWeight: '700', color: 'white' }}>
                🃏 {jokersRemaining} left
              </div>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>
                {Object.keys(predictions).length} / {confirmedTotal}
              </span>
            </div>
          </div>

          {/* Row 2: Stage tabs */}
          <div style={{ display: 'flex', overflowX: 'auto', borderTop: '1px solid rgba(255,255,255,0.2)', scrollbarWidth: 'none' }}>
            {STAGES.map(stage => {
              const done = getPredCount(stage.key)
              const total = matches.filter(m => m.stage === stage.key && isConfirmed(m)).length
              const complete = done === total && total > 0
              const isActive = activeStage === stage.key
              return (
                <button key={stage.key} onClick={() => { setActiveStage(stage.key); scrollToKOMatch(getSmartKOMatch(stage.key)) }} style={{
                  padding: '10px 14px', fontSize: '12px', fontWeight: isActive ? '700' : '500',
                  color: isActive ? 'white' : 'rgba(255,255,255,0.6)',
                  borderBottom: isActive ? '2px solid white' : '2px solid transparent',
                  background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                }}>
                  {stage.label}
                  <span style={{ fontSize: '10px', color: complete ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)', fontWeight: '600' }}>
                    {complete ? '✓' : `${done}/${total}`}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Points info bar */}
      <div style={{ background: 'var(--accent-blue-light)', borderBottom: '1px solid var(--border-light)', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: 'var(--accent-blue)', fontWeight: '700' }}>
          🥇 Correct winner = 5pts · Exact score = 10pts
        </span>
        <span style={{ fontSize: '12px', color: 'var(--accent-blue)', fontWeight: '700' }}>
          ET +3 · Pens +5
        </span>
      </div>

      {/* Match list */}
      <div className="container" style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
            <div className="spinner" />
          </div>
        ) : stageMatches.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
            <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '8px' }}>
              {stagePending > 0 ? 'Matchups not confirmed yet' : 'No matches yet for this round'}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              {stagePending > 0
                ? `${stagePending} ${stagePending === 1 ? 'match' : 'matches'} will appear here once the teams are confirmed.`
                : 'Teams will be confirmed as results come in'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {stageMatches.map(renderMatch)}
            {stagePending > 0 && (
              <div style={{ textAlign: 'center', padding: '14px', color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600' }}>
                ⏳ {stagePending} more {stagePending === 1 ? 'match' : 'matches'} to be confirmed — they'll appear here automatically.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Score warning modal */}
      {scoreWarning && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ maxWidth: '320px', width: '100%' }}>
            <div style={{ fontWeight: '800', fontSize: '16px', marginBottom: '8px' }}>⚠️ High score!</div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              You entered {scoreWarning.value} goals — are you sure?
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setScoreWarning(null)} className="btn btn-primary" style={{ flex: 1, background: '#e65100' }}>Yes, keep it</button>
              <button onClick={() => {
                setPredictions(prev => ({ ...prev, [scoreWarning.matchId]: { ...prev[scoreWarning.matchId], [scoreWarning.side]: '' } }))
                setScoreWarning(null)
              }} className="btn btn-secondary" style={{ flex: 1 }}>Change it</button>
            </div>
          </div>
        </div>
      )}

      {/* Joker confirm modal */}
      {jokerConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ maxWidth: '340px', width: '100%' }}>
            <div style={{ fontWeight: '800', fontSize: '16px', marginBottom: '8px' }}>🃏 Use a KO Joker?</div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Doubles all points for this match if correct.
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              You have <strong>{jokersRemaining}</strong> KO joker{jokersRemaining !== 1 ? 's' : ''} remaining. You can remove it before kickoff, but not after.
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { handleJoker(jokerConfirm.matchId, false); setJokerConfirm(null) }}
                className="btn btn-primary" style={{ flex: 1, background: '#e65100' }}>
                Yes, use joker
              </button>
              <button onClick={() => setJokerConfirm(null)} className="btn btn-secondary" style={{ flex: 1 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
