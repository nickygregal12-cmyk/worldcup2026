import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore, useAppStore } from '../store/index.js'
import { DATES } from '../lib/tournamentDates.js'
import { ALL_STAGES } from '../lib/bracketUtils.js'
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


const POINT_LABELS = {
  correct_winner: 'Correct result',
  winner: 'Correct result',
  result: 'Correct result',
  exact_score: 'Exact score',
  exact: 'Exact score',
  first_goal_band: 'First-goal band',
  first_goal: 'First-goal band',
  first_goal_time: 'First-goal time',
  first_goal_minute: 'First-goal time',
  first_goal_time_band: 'First-goal time',
  extra_time: 'Extra-time bonus',
  et_bonus: 'Extra-time bonus',
  method_bonus: 'Method bonus',
  correct_method: 'Correct method',
  penalties: 'Penalties bonus',
  penalties_bonus: 'Penalties bonus',
  pen_bonus: 'Penalties bonus',
  joker: 'Joker multiplier',
  joker_bonus: 'Joker bonus',
}

const KO_SCORING = {
  correctResult: 5,
  exactScore: 10,
  firstGoalBand: 3,
  extraTime: 3,
  penalties: 5,
}

const methodBonusFor = outcomeType =>
  outcomeType === 'et'
    ? KO_SCORING.extraTime
    : outcomeType === 'penalties'
      ? KO_SCORING.penalties
      : 0

const methodLabelFor = outcomeType =>
  outcomeType === 'et'
    ? 'after extra time'
    : outcomeType === 'penalties'
      ? 'on penalties'
      : 'in 90 minutes'

function normalisePointsBreakdown(breakdown) {
  if (!breakdown) return []

  let value = breakdown
  if (typeof value === 'string') {
    try { value = JSON.parse(value) } catch { return [] }
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => {
      if (typeof item === 'number') {
        return { key: `item-${index}`, label: `Bonus ${index + 1}`, points: item }
      }
      if (typeof item === 'string') {
        return { key: `item-${index}`, label: item, points: null }
      }
      const key = item?.key || item?.type || item?.name || `item-${index}`
      const points = item?.points ?? item?.value ?? item?.amount ?? null
      return {
        key,
        label: item?.label || POINT_LABELS[key] || String(key).replaceAll('_', ' '),
        points: Number.isFinite(Number(points)) ? Number(points) : null,
      }
    })
  }

  if (typeof value === 'object') {
    return Object.entries(value).map(([key, points]) => ({
      key,
      label: POINT_LABELS[key] || key.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase()),
      points: Number.isFinite(Number(points)) ? Number(points) : null,
    }))
  }

  return []
}

function canonicaliseCompletedBreakdown(items, hasJoker = false, context = {}) {
  const byKey = new Map(items.map(item => [String(item.key).toLowerCase(), Number(item.points || 0)]))

  const firstValue = keys => {
    for (const key of keys) {
      if (byKey.has(key)) return byKey.get(key)
    }
    return 0
  }

  const scorePoints = firstValue([
    'score_points', 'base', 'exact_score', 'exact', 'correct_90_result', 'correct_result', 'result',
  ])
  const advancePoints = firstValue([
    'advance_points', 'advancing_team', 'correct_advancing_team', 'team_to_advance',
  ])
  const methodPoints = firstValue([
    'method_points', 'method_bonus', 'correct_method', 'extra_time_bonus', 'et_bonus',
    'penalties_bonus', 'pen_bonus', 'extra_time', 'penalties',
  ])
  const firstGoalPoints = firstValue([
    'first_goal_points', 'first_goal_band', 'first_goal', 'first_goal_time_band',
  ])
  const jokerMultiplier = hasJoker
    ? Math.max(1, firstValue(['joker_multiplier', 'joker']) || 2)
    : 1

  const actualMethod = context.actualMethod || '90mins'
  const predictedMethod = context.predictedMethod || '90mins'
  const advancementIsSeparate = actualMethod !== '90mins' || predictedMethod !== '90mins' || advancePoints > 0
  const methodIsRelevant = actualMethod !== '90mins' || predictedMethod !== '90mins' || methodPoints > 0

  const rows = [
    { key: 'score', label: '90-minute score', points: scorePoints },
    ...(advancementIsSeparate
      ? [{ key: 'advance', label: 'Advancing team', points: advancePoints }]
      : []),
    ...(methodIsRelevant
      ? [{ key: 'method', label: 'Method', points: methodPoints }]
      : []),
    { key: 'first-goal', label: 'First-goal band', points: firstGoalPoints },
  ]

  if (hasJoker) rows.push({ key: 'joker', label: 'Joker', points: jokerMultiplier, multiplier: true })
  return rows
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

    const interval = window.setInterval(() => {
      loadData({ silent: true })
    }, 60000)

    return () => window.clearInterval(interval)
  }, [user?.id])

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

  const loadData = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)

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
      if (!silent) {
        await supabase.from('profiles').update({ ko_jokers_remaining: remaining }).eq('id', user.id)
      }
    }
    if (!silent) setLoading(false)
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

  const adjustScore = (matchId, side, delta) => {
    const current = predictions[matchId]?.[side]
    const next = Math.max(0, Math.min(99, (current === '' || current == null ? 0 : Number(current)) + delta))
    handleScoreChange(matchId, side, String(next))
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
    if (!pred.first_goal_band) {
      const saveWithoutBonus = window.confirm('You have not selected a first-goal time, so you cannot earn the +3 bonus points. Save this prediction anyway?')
      if (!saveWithoutBonus) return
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

  // A KO match is confirmed only when both real teams are known. Future
  // fixtures still render below as read-only cards with their narrowed feeder
  // possibilities, rather than disappearing behind a generic TBC message.
  const isConfirmed = (m) =>
    !!(m.home_team_id && m.away_team_id) &&
    !/Winner|Runner/.test(m.home_team?.name || '') &&
    !/Winner|Runner/.test(m.away_team?.name || '')

  const getMatchDefinition = matchNumber =>
    ALL_STAGES
      .flatMap(stage => stage.matches || [])
      .find(definition => Number(definition.match_number) === Number(matchNumber))

  const describePendingSide = (match, side) => {
    const team = side === 'home' ? match.home_team : match.away_team
    if (team?.id) {
      return {
        title: team.name || team.short_code,
        options: [team],
      }
    }

    const definition = getMatchDefinition(match.match_number)
    const slot = side === 'home' ? definition?.home_slot : definition?.away_slot
    const feeder = typeof slot === 'string' ? slot.match(/^([WL])(\d+)$/) : null

    if (feeder) {
      const resultWord = feeder[1] === 'W' ? 'Winner' : 'Loser'
      const feederNumber = Number(feeder[2])
      const feederMatch = matches.find(row => Number(row.match_number) === feederNumber)
      const options = [feederMatch?.home_team, feederMatch?.away_team].filter(Boolean)

      if (options.length === 2) {
        return {
          title: `${resultWord} of ${options[0].short_code || options[0].name} v ${options[1].short_code || options[1].name}`,
          options,
        }
      }

      return {
        title: `${resultWord} of M${feederNumber}`,
        options,
      }
    }

    if (/^1[A-L]$/.test(slot || '')) return { title: `Winner of Group ${slot.slice(1)}`, options: [] }
    if (/^2[A-L]$/.test(slot || '')) return { title: `Runner-up of Group ${slot.slice(1)}`, options: [] }
    if (/^BT3_/.test(slot || '')) return { title: 'Best third-place qualifier', options: [] }
    return { title: 'To be confirmed', options: [] }
  }

  const stageMatches = matches
    .filter(m => m.stage === activeStage && isConfirmed(m))
    .sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time))
  const pendingStageMatches = matches
    .filter(m => m.stage === activeStage && !isConfirmed(m))
    .sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time))
  const stagePending = pendingStageMatches.length
  const confirmedTotal = matches.filter(isConfirmed).length
  const getPredCount = (stage) => {
    const sm = matches.filter(m => m.stage === stage && isConfirmed(m))
    return sm.filter(m => predictions[m.id]?.home !== undefined && predictions[m.id]?.home !== '').length
  }

  const renderPendingMatch = (match) => {
    const isFinal = match.stage === 'final'
    const home = describePendingSide(match, 'home')
    const away = describePendingSide(match, 'away')

    const PendingSide = ({ side }) => (
      <div style={{
        minWidth: 0,
        padding: '11px 9px',
        borderRadius: 'var(--radius-md)',
        border: '1px dashed var(--border-medium)',
        background: 'var(--bg-secondary)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '9px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {isFinal ? 'Possible finalist' : 'Possible team'}
        </div>
        <div style={{ marginTop: '5px', fontSize: '11px', fontWeight: 850, color: 'var(--text-secondary)', lineHeight: 1.35, overflowWrap: 'anywhere' }}>
          {side.title}
        </div>
        {side.options.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', flexWrap: 'wrap', marginTop: '7px' }}>
            {side.options.map(team => (
              <span key={team.id || team.short_code} style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 6px',
                borderRadius: '999px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-light)',
                fontSize: '9.5px',
                fontWeight: 850,
                whiteSpace: 'nowrap',
              }}>
                <span>{team.flag_emoji}</span>
                <span>{team.short_code || team.name}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    )

    return (
      <div key={match.id} className="card" style={{
        border: isFinal ? '1.5px solid rgba(184,134,11,0.28)' : '1px solid var(--border-light)',
        background: isFinal ? 'linear-gradient(180deg, rgba(184,134,11,0.05), var(--bg-card))' : 'var(--bg-card)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '10px',
          marginBottom: '12px',
        }}>
          <div>
            <div style={{ fontSize: '9px', fontWeight: 950, color: isFinal ? 'var(--accent-gold)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {isFinal ? '🏆 Final matchup forming' : 'Matchup forming'}
            </div>
            <div style={{ marginTop: '3px', fontSize: '11px', fontWeight: 750, color: 'var(--text-secondary)' }}>
              M{match.match_number} · {formatDate(match.kickoff_time)} · {formatTime(match.kickoff_time)}
            </div>
          </div>
          <span style={{
            padding: '4px 7px',
            borderRadius: '999px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-light)',
            color: 'var(--text-muted)',
            fontSize: '9px',
            fontWeight: 850,
            whiteSpace: 'nowrap',
          }}>
            Not open yet
          </span>
        </div>

        {isFinal && (
          <div style={{
            marginBottom: '10px',
            padding: '8px 9px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(184,134,11,0.08)',
            border: '1px solid rgba(184,134,11,0.16)',
            color: 'var(--text-secondary)',
            fontSize: '10px',
            lineHeight: 1.4,
          }}>
            Final prediction opens when both finalists are confirmed. Normal KO Predictor scoring applies.
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)', alignItems: 'stretch', gap: '8px' }}>
          <PendingSide side={home} />
          <div style={{ alignSelf: 'center', color: 'var(--text-muted)', fontSize: '10px', fontWeight: 900 }}>VS</div>
          <PendingSide side={away} />
        </div>
      </div>
    )
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
    const completedBreakdown = match.status === 'completed'
      ? canonicaliseCompletedBreakdown(
          normalisePointsBreakdown(pred.points_breakdown),
          hasJoker,
          {
            actualMethod: match.outcome_type || '90mins',
            predictedMethod: outcomeType || '90mins',
          },
        )
      : []
    const totalAwarded = Number(pred.points_awarded || 0)
    const actualWinner = match.winner_team_id === match.home_team_id
      ? match.home_team
      : match.winner_team_id === match.away_team_id
        ? match.away_team
        : null

    const isLive = match.status === 'live'
    const liveHomeScore = Number(match.home_score ?? 0)
    const liveAwayScore = Number(match.away_score ?? 0)
    const currentLeaderId = liveHomeScore > liveAwayScore
      ? match.home_team_id
      : liveAwayScore > liveHomeScore
        ? match.away_team_id
        : null

    const predictedWinnerId = hasPrediction
      ? outcomeType === '90mins'
        ? homeScore > awayScore
          ? match.home_team_id
          : awayScore > homeScore
            ? match.away_team_id
            : null
        : pred.winner_team_id
      : null

    const winnerOnTrack = Boolean(
      isLive &&
      currentLeaderId &&
      predictedWinnerId &&
      currentLeaderId === predictedWinnerId
    )

    const exactScoreOnTrack = Boolean(
      isLive &&
      hasPrediction &&
      liveHomeScore === homeScore &&
      liveAwayScore === awayScore
    )

    const actualFirstGoalBand = match.first_goal_band || null
    const firstGoalWon = Boolean(
      actualFirstGoalBand &&
      pred.first_goal_band &&
      String(actualFirstGoalBand) === String(pred.first_goal_band)
    )
    const firstGoalLost = Boolean(
      actualFirstGoalBand &&
      pred.first_goal_band &&
      String(actualFirstGoalBand) !== String(pred.first_goal_band)
    )

    const liveMultiplier = hasJoker ? 2 : 1
    const methodBonus = methodBonusFor(outcomeType)
    const maximumRawPoints =
      KO_SCORING.exactScore +
      methodBonus +
      KO_SCORING.firstGoalBand
    const maximumPoints = maximumRawPoints * liveMultiplier

    const firstGoalBandSelected = Boolean(pred.first_goal_band)
    const firstGoalResolved = Boolean(actualFirstGoalBand)

    // A football score can only increase. Once either live score has gone above
    // the predicted score, the exact-score award is no longer achievable.
    // The predicted winner can still recover before full time, so the smaller
    // correct-result award remains available until the match is completed.
    const exactScoreStillPossible = Boolean(
      isLive &&
      hasPrediction &&
      liveHomeScore <= homeScore &&
      liveAwayScore <= awayScore
    )
    const resultPointsStillAvailable = exactScoreStillPossible
      ? KO_SCORING.exactScore
      : predictedWinnerId
        ? KO_SCORING.correctResult
        : 0
    const methodPointsStillAvailable = predictedWinnerId ? methodBonus : 0
    const firstGoalPointsStillAvailable =
      !firstGoalResolved && firstGoalBandSelected
        ? KO_SCORING.firstGoalBand
        : 0

    const securedRawPoints = firstGoalWon ? KO_SCORING.firstGoalBand : 0
    const remainingRawPoints =
      resultPointsStillAvailable +
      methodPointsStillAvailable +
      firstGoalPointsStillAvailable

    // Keep the live status internally consistent:
    // maximum possible = secured + still available + missed.
    const missedRawPoints = Math.max(
      0,
      maximumRawPoints - securedRawPoints - remainingRawPoints
    )

    const securedPoints = securedRawPoints * liveMultiplier
    const missedPoints = missedRawPoints * liveMultiplier
    const remainingAvailablePoints = remainingRawPoints * liveMultiplier
    const completedMissedPoints = Math.max(0, maximumPoints - totalAwarded)

    const predictedWinner = predictedWinnerId === match.home_team_id
      ? match.home_team
      : predictedWinnerId === match.away_team_id
        ? match.away_team
        : null
    const predictionSummary = predictedWinner
      ? `${predictedWinner.name || predictedWinner.short_code} to advance ${methodLabelFor(outcomeType)}`
      : 'Advancing team not recorded'

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

        {match.stage === 'final' && (
          <div style={{
            marginBottom: '11px',
            padding: '10px 11px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(184,134,11,0.09)',
            border: '1px solid rgba(184,134,11,0.2)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '9px', fontWeight: 950, color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '0.11em' }}>
              🏆 Final prediction
            </div>
            <div style={{ marginTop: '3px', fontSize: '12px', fontWeight: 900, color: 'var(--text-primary)' }}>
              Pick the score and your World Cup champion
            </div>
            <div style={{ marginTop: '3px', fontSize: '9.5px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Normal KO Predictor scoring applies: exact score or result, method, first-goal band and joker.
            </div>
          </div>
        )}

        {/* Result badge */}
        {resultColour && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '10px',
            padding: '7px 10px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            fontWeight: '700',
            background: resultColour === 'gold' ? 'rgba(255,215,0,0.2)' : resultColour === 'green' ? 'rgba(0,122,51,0.1)' : 'rgba(198,40,40,0.1)',
            color: resultColour === 'gold' ? '#b8860b' : resultColour === 'green' ? 'var(--accent-green)' : 'var(--accent-red)',
          }}>
            <span>
              {resultColour === 'gold' ? '🎯 Exact score!' : resultColour === 'green' ? '✅ Correct result' : '❌ Wrong result'}
              {hasJoker && resultColour !== 'red' && <span style={{ marginLeft: '4px', color: 'var(--accent-gold)' }}>🃏 ×2</span>}
              {hasJoker && resultColour === 'red' && <span style={{ marginLeft: '4px' }}>🃏 wasted</span>}
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
            {match.stage === 'final' ? 'Final prediction' : 'Match'} {match.match_number} · {formatDate(match.kickoff_time)} · {formatTime(match.kickoff_time)}
            {match.venue?.city && ` · ${VENUE_FLAGS[match.venue.city] || ''} ${match.venue.city}`}
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {locked && <span className="badge badge-red">🔒</span>}
            {!locked && hasPrediction && !hasJoker && <span className="badge" style={{ background: '#fff3e0', color: '#e65100' }}>✓</span>}
          </div>
        </div>

        {/* Live match panel */}
        {isLive && hasPrediction && (
          <div style={{
            marginBottom: '14px',
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-light)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              marginBottom: '10px',
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: 900,
                color: 'var(--accent-red)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                🔴 Live {match.live_minute ? `${match.live_minute}${match.injury_time ? `+${match.injury_time}` : ''}'` : ''}
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '20px',
                fontWeight: 950,
              }}>
                {liveHomeScore}–{liveAwayScore}
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '10px',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px' }}>{match.home_team?.flag_emoji}</div>
                <div style={{ fontSize: '11px', fontWeight: 850 }}>{match.home_team?.short_code}</div>
              </div>
              <div style={{ color: 'var(--text-muted)', fontWeight: 850 }}>vs</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px' }}>{match.away_team?.flag_emoji}</div>
                <div style={{ fontSize: '11px', fontWeight: 850 }}>{match.away_team?.short_code}</div>
              </div>
            </div>

            <div style={{
              paddingTop: '10px',
              borderTop: '1px solid var(--border-light)',
              display: 'grid',
              gap: '7px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                fontSize: '11px',
              }}>
                <span style={{ color: 'var(--text-muted)' }}>
                  Your pick: <strong style={{ color: 'var(--text-primary)' }}>{pred.home}–{pred.away}</strong>
                  <span style={{ marginLeft: '5px', color: 'var(--text-secondary)', fontWeight: 750 }}>
                    · {predictionSummary}
                  </span>
                </span>
                <span style={{
                  fontWeight: 900,
                  color: exactScoreOnTrack || winnerOnTrack
                    ? 'var(--accent-green)'
                    : 'var(--accent-red)',
                }}>
                  {exactScoreOnTrack
                    ? 'Exact score on track'
                    : winnerOnTrack
                      ? 'Winner on track'
                      : 'Result currently trailing'}
                </span>
              </div>

              {pred.first_goal_band && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  padding: '7px 9px',
                  borderRadius: 'var(--radius-sm)',
                  background: firstGoalWon
                    ? 'var(--accent-green-light)'
                    : firstGoalLost
                      ? 'var(--accent-red-light)'
                      : 'var(--bg-card)',
                  border: '1px solid var(--border-light)',
                  fontSize: '10px',
                  fontWeight: 800,
                }}>
                  <span>
                    First goal: {pred.first_goal_band}
                    {actualFirstGoalBand && ` · Actual ${actualFirstGoalBand}`}
                  </span>
                  <span style={{
                    color: firstGoalWon
                      ? 'var(--accent-green)'
                      : firstGoalLost
                        ? 'var(--accent-red)'
                        : 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                  }}>
                    {firstGoalWon
                      ? `+${KO_SCORING.firstGoalBand * liveMultiplier} pts secured`
                      : firstGoalLost
                        ? `${KO_SCORING.firstGoalBand * liveMultiplier} pts missed`
                        : 'Still available'}
                  </span>
                </div>
              )}

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: '7px',
              }}>
                <div style={{
                  padding: '8px 9px',
                  borderRadius: 'var(--radius-sm)',
                  background: securedPoints > 0 ? 'var(--accent-green-light)' : 'var(--bg-card)',
                  border: '1px solid var(--border-light)',
                }}>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>
                    Secured
                  </div>
                  <div style={{
                    marginTop: '3px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '14px',
                    fontWeight: 950,
                    color: securedPoints > 0 ? 'var(--accent-green)' : 'var(--text-primary)',
                  }}>
                    {securedPoints} pts
                  </div>
                </div>

                <div style={{
                  padding: '8px 9px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-light)',
                }}>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>
                    Still available
                  </div>
                  <div style={{
                    marginTop: '3px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '14px',
                    fontWeight: 950,
                    color: 'var(--scottish-navy)',
                  }}>
                    Up to {remainingAvailablePoints} more
                  </div>
                </div>
              </div>

              {missedPoints > 0 && (
                <div style={{
                  padding: '7px 9px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--accent-red-light)',
                  border: '1px solid rgba(198,40,40,0.18)',
                  color: 'var(--accent-red)',
                  fontSize: '10px',
                  fontWeight: 850,
                }}>
                  {missedPoints} pts missed
                </div>
              )}

              <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', fontWeight: 750 }}>
                Current position: {exactScoreOnTrack
                  ? 'exact score currently on track'
                  : winnerOnTrack
                    ? 'correct result currently on track'
                    : 'prediction currently trailing'}
              </div>

              {hasJoker && (
                <div style={{ fontSize: '9.5px', color: '#e65100', fontWeight: 850 }}>
                  🃏 Joker active · live points shown at ×2
                </div>
              )}

              <Link
                to={`/match/${match.id}/stats?view=ko`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  marginTop: '2px',
                  padding: '9px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(0,48,135,0.06)',
                  border: '1px solid rgba(0,48,135,0.14)',
                  color: 'var(--scottish-navy)',
                  textDecoration: 'none',
                  fontSize: '10.5px',
                  fontWeight: 850,
                }}
              >
                <span>See live predictions and points impact</span>
                <span>View Match Centre →</span>
              </Link>
            </div>
          </div>
        )}

        {!locked && hasPrediction && (
          <div style={{
            marginBottom: '14px',
            padding: '11px 12px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(0,48,135,0.06)',
            border: '1px solid rgba(0,48,135,0.14)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
            }}>
              <span style={{ fontSize: '11px', fontWeight: 850, color: 'var(--text-secondary)' }}>
                Up to {maximumPoints} pts available
              </span>
              {hasJoker && (
                <span style={{ fontSize: '9.5px', fontWeight: 850, color: '#e65100' }}>
                  🃏 Maximum doubled
                </span>
              )}
            </div>
            <div style={{ marginTop: '4px', fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Exact score {KO_SCORING.exactScore} (or correct result {KO_SCORING.correctResult})
              {methodBonus > 0 ? ` · method bonus ${methodBonus}` : ''}
              {' · first-goal band '}{KO_SCORING.firstGoalBand}
            </div>
            {!firstGoalBandSelected && (
              <div style={{ marginTop: '5px', fontSize: '10px', fontWeight: 800, color: 'var(--accent-red)' }}>
                Select a first-goal band to keep all {maximumPoints} points available.
              </div>
            )}
          </div>
        )}

        {/* Teams + score inputs */}
        {!isLive && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '36px' }}>{match.home_team?.flag_emoji || '🏳️'}</span>
            <span style={{ fontWeight: '700', fontSize: '13px', textAlign: 'center' }}>{match.home_team?.name || '?'}</span>
            {favourite === 'home' && matchOdds && !locked && !resultColour && <span style={{ fontSize: '10px', color: 'var(--accent-green)', fontWeight: '700' }}>⭐ Favourite</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {['home', 'away'].map((side, index) => (
              <div key={side} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {index === 1 && <span className="score-divider">–</span>}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => adjustScore(match.id, side, 1)}
                    disabled={locked || isGuest}
                    aria-label={`Increase ${side} score`}
                    style={{
                      width: '42px', height: '34px', borderRadius: '10px',
                      border: '1px solid var(--border-light)', background: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)', fontSize: '18px', fontWeight: '900',
                      cursor: locked || isGuest ? 'not-allowed' : 'pointer', opacity: locked || isGuest ? 0.45 : 1,
                    }}
                  >▲</button>
                  <input type="number" inputMode="numeric" className="score-input" min="0" max="99"
                    value={pred[side] ?? ''} placeholder="?"
                    onChange={e => handleScoreChange(match.id, side, e.target.value)}
                    onBlur={() => handleScoreBlur(match, side)}
                    disabled={locked || isGuest}
                    style={{ cursor: isGuest ? 'not-allowed' : 'text', opacity: isGuest ? 0.5 : 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => adjustScore(match.id, side, -1)}
                    disabled={locked || isGuest || Number(pred[side] ?? 0) <= 0}
                    aria-label={`Decrease ${side} score`}
                    style={{
                      width: '42px', height: '34px', borderRadius: '10px',
                      border: '1px solid var(--border-light)', background: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)', fontSize: '18px', fontWeight: '900',
                      cursor: locked || isGuest || Number(pred[side] ?? 0) <= 0 ? 'not-allowed' : 'pointer',
                      opacity: locked || isGuest || Number(pred[side] ?? 0) <= 0 ? 0.45 : 1,
                    }}
                  >▼</button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '36px' }}>{match.away_team?.flag_emoji || '🏳️'}</span>
            <span style={{ fontWeight: '700', fontSize: '13px', textAlign: 'center' }}>{match.away_team?.name || '?'}</span>
            {favourite === 'away' && matchOdds && !locked && !resultColour && <span style={{ fontSize: '10px', color: 'var(--accent-green)', fontWeight: '700' }}>⭐ Favourite</span>}
          </div>
        </div>
        )}

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
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ⏱ First goal time · <span style={{ color: '#e65100' }}>+3 bonus points</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', lineHeight: 1.4 }}>
              When will the first goal be scored? Pick a time band to keep every scoring opportunity available.
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

        {/* Completed — full result and points breakdown */}
        {locked && match.status === 'completed' && hasPrediction && (
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-light)' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              gap: '10px',
              alignItems: 'center',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-light)',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '22px' }}>{match.home_team?.flag_emoji}</div>
                <div style={{ marginTop: '3px', fontSize: '11px', fontWeight: 800 }}>{match.home_team?.short_code}</div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Full time
                </div>
                <div style={{ marginTop: '2px', fontFamily: 'var(--font-mono)', fontSize: '24px', fontWeight: 950 }}>
                  {match.home_score}–{match.away_score}
                </div>
                {actualWinner && (
                  <div style={{ marginTop: '2px', fontSize: '9.5px', color: 'var(--accent-green)', fontWeight: 800 }}>
                    {actualWinner.short_code || actualWinner.name} advanced
                  </div>
                )}
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '22px' }}>{match.away_team?.flag_emoji}</div>
                <div style={{ marginTop: '3px', fontSize: '11px', fontWeight: 800 }}>{match.away_team?.short_code}</div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '10px',
              marginTop: '9px',
              fontSize: '12px',
            }}>
              <span style={{ color: 'var(--text-muted)', minWidth: 0 }}>
                Your pick: <strong style={{ color: 'var(--text-primary)' }}>{pred.home}–{pred.away}</strong>
                <span style={{ marginLeft: '5px', color: 'var(--text-secondary)', fontWeight: 750 }}>
                  · {predictionSummary}
                </span>
                {pred.first_goal_band && (
                  <span style={{ marginLeft: '6px' }}>· First goal {pred.first_goal_band}</span>
                )}
                {!pred.first_goal_band && (
                  <span style={{ marginLeft: '6px', color: 'var(--accent-red)' }}>· No first-goal pick</span>
                )}
                {hasJoker && <span style={{ marginLeft: '6px', color: '#ff9800' }}>🃏</span>}
              </span>
              <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 950, color: totalAwarded > 0 ? 'var(--accent-green)' : 'var(--text-primary)' }}>
                  {totalAwarded} pts earned
                </div>
                <div style={{ marginTop: '2px', fontSize: '9.5px', fontWeight: 800, color: completedMissedPoints > 0 ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                  {completedMissedPoints} pts missed
                </div>
              </div>
            </div>

            {match.first_goal_band && (
              <div style={{
                marginTop: '8px',
                padding: '7px 9px',
                borderRadius: 'var(--radius-sm)',
                background: pred.first_goal_band === match.first_goal_band
                  ? 'var(--accent-green-light)'
                  : 'var(--bg-secondary)',
                border: '1px solid var(--border-light)',
                fontSize: '10.5px',
                fontWeight: 800,
                color: pred.first_goal_band === match.first_goal_band
                  ? 'var(--accent-green)'
                  : 'var(--text-secondary)',
              }}>
                Actual first goal: {match.first_goal_band}
                {pred.first_goal_band ? (
                  <span style={{ marginLeft: '6px' }}>
                    {pred.first_goal_band === match.first_goal_band
                      ? `✓ Correct band · +${KO_SCORING.firstGoalBand * liveMultiplier} pts`
                      : `· Your pick ${pred.first_goal_band} · ${KO_SCORING.firstGoalBand * liveMultiplier} pts missed`}
                  </span>
                ) : (
                  <span style={{ marginLeft: '6px', color: 'var(--accent-red)' }}>
                    · No prediction · {KO_SCORING.firstGoalBand * liveMultiplier} pts missed
                  </span>
                )}
              </div>
            )}

            {completedBreakdown.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '6px',
                marginTop: '10px',
              }}>
                {completedBreakdown.map(item => (
                  <div key={item.key} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '7px 9px',
                    borderRadius: 'var(--radius-sm)',
                    background: Number(item.points || 0) > 0 ? 'var(--accent-green-light)' : 'var(--bg-secondary)',
                    border: '1px solid var(--border-light)',
                    fontSize: '10px',
                  }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 750 }}>{item.label}</span>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 900,
                      color: Number(item.points || 0) > 0 ? 'var(--accent-green)' : 'var(--text-muted)',
                    }}>
                      {item.points == null
                        ? '—'
                        : item.multiplier
                          ? `×${item.points}`
                          : Number(item.points) > 0
                            ? `+${item.points}`
                            : '0'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                marginTop: '9px',
                padding: '8px 9px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-light)',
                color: 'var(--text-muted)',
                fontSize: '10px',
                lineHeight: 1.4,
              }}>
                Total points are confirmed above. A component-by-component breakdown was not returned for this saved prediction.
              </div>
            )}

            <Link
              to={`/match/${match.id}/stats?view=ko`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                marginTop: '11px',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(0,48,135,0.06)',
                border: '1px solid rgba(0,48,135,0.14)',
                color: 'var(--scottish-navy)',
                textDecoration: 'none',
                fontSize: '11px',
                fontWeight: 850,
              }}
            >
              <span>See predictions, splits and full points impact</span>
              <span>View Match Centre →</span>
            </Link>
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

      <style>{`
        .ko-hero {
          background: linear-gradient(135deg, #e65100, #ff9800);
          position: sticky;
          top: var(--nav-height);
          z-index: 50;
          color: white;
        }
        .ko-hero-main {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 12px;
          padding: 12px 0 10px;
        }
        .ko-hero-copy {
          min-width: 0;
        }
        .ko-hero-title {
          display: block;
          font-size: 18px;
          line-height: 1.15;
          font-weight: 900;
        }
        .ko-hero-subtitle {
          display: block;
          margin-top: 2px;
          font-size: 10.5px;
          line-height: 1.3;
          font-weight: 650;
          color: rgba(255,255,255,0.84);
        }
        .ko-hero-stats {
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: flex-end;
        }
        .ko-hero-stat {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          min-height: 30px;
          padding: 5px 10px;
          border-radius: 999px;
          background: rgba(255,255,255,0.16);
          border: 1px solid rgba(255,255,255,0.28);
          color: white;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }
        .ko-stage-strip {
          display: flex;
          overflow-x: auto;
          border-top: 1px solid rgba(255,255,255,0.2);
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }
        .ko-stage-strip::-webkit-scrollbar {
          display: none;
        }
        .ko-stage-tab {
          min-width: 68px;
          padding: 9px 13px 8px;
          border: 0;
          border-bottom: 2px solid transparent;
          background: none;
          color: rgba(255,255,255,0.62);
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1px;
          font-size: 11px;
          font-weight: 650;
        }
        .ko-stage-tab.active {
          color: white;
          border-bottom-color: white;
          font-weight: 850;
        }
        .ko-stage-count {
          font-size: 9px;
          font-weight: 750;
          color: rgba(255,255,255,0.52);
        }
        .ko-stage-tab.active .ko-stage-count,
        .ko-stage-count.complete {
          color: rgba(255,255,255,0.95);
        }
        @media (max-width: 640px) {
          .ko-hero-main {
            grid-template-columns: minmax(0, 1fr);
            gap: 8px;
            padding: 10px 0 8px;
          }
          .ko-hero-logo {
            display: none;
          }
          .ko-hero-copy {
            text-align: left;
          }
          .ko-hero-title {
            font-size: 17px;
          }
          .ko-hero-subtitle {
            font-size: 10px;
            max-width: 100%;
          }
          .ko-hero-stats {
            justify-content: space-between;
            gap: 8px;
          }
          .ko-hero-stat {
            flex: 1;
            justify-content: center;
            min-height: 29px;
            padding: 5px 8px;
            font-size: 10.5px;
          }
          .ko-stage-strip {
            margin: 0 -16px;
            padding: 0 10px;
          }
          .ko-stage-tab {
            min-width: 62px;
            padding: 8px 10px 7px;
            font-size: 10.5px;
          }
        }
      `}</style>

      {/* Header */}
      <div className="ko-hero">
        <div className="container">
          <div className="ko-hero-main">
            <div className="ko-hero-logo">
              <WorldCupLogo variant="compact" size={42} />
            </div>

            <div className="ko-hero-copy">
              <span className="ko-hero-title">🔥 KO Predictor</span>
              <span className="ko-hero-subtitle">Separate game · Tournament score unaffected</span>
            </div>

            <div className="ko-hero-stats">
              <div className="ko-hero-stat">
                <span>✓</span>
                <span>{Object.keys(predictions).length}/{confirmedTotal} complete</span>
              </div>
              <div className="ko-hero-stat">
                <span>🃏</span>
                <span>{jokersRemaining} joker{jokersRemaining !== 1 ? 's' : ''} left</span>
              </div>
            </div>
          </div>

          <div className="ko-stage-strip">
            {STAGES.map(stage => {
              const done = getPredCount(stage.key)
              const total = matches.filter(m => m.stage === stage.key && isConfirmed(m)).length
              const complete = done === total && total > 0
              const isActive = activeStage === stage.key
              return (
                <button
                  key={stage.key}
                  type="button"
                  className={`ko-stage-tab ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setActiveStage(stage.key)
                    scrollToKOMatch(getSmartKOMatch(stage.key))
                  }}
                >
                  <span>{stage.label}</span>
                  <span className={`ko-stage-count ${complete ? 'complete' : ''}`}>
                    {complete
                      ? '✓'
                      : total > 0
                        ? `${done}/${total}`
                        : matches.some(m => m.stage === stage.key)
                          ? '⏳'
                          : '0/0'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Points info bar */}
      <div style={{
        background: 'var(--accent-blue-light)',
        borderBottom: '1px solid var(--border-light)',
        padding: '8px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
      }}>
        {activeStage === 'final' ? (
          <>
            <span style={{ fontSize: '12px', color: 'var(--accent-gold)', fontWeight: '800' }}>
              🏆 Final prediction · normal KO scoring
            </span>
            <span style={{ fontSize: '12px', color: 'var(--accent-blue)', fontWeight: '700' }}>
              Exact 10 · Result 5 · Advance +5 when separate · First goal +3 · ET +3 · Pens +5 · Joker ×2
            </span>
          </>
        ) : (
          <>
            <span style={{ fontSize: '12px', color: 'var(--accent-blue)', fontWeight: '700' }}>
              🎯 90-minute score: exact 10pts or correct result 5pts
            </span>
            <span style={{ fontSize: '12px', color: 'var(--accent-blue)', fontWeight: '700' }}>
              Advance +5 when separate · First goal +3 · ET +3 · Pens +5 · Joker ×2
            </span>
          </>
        )}
      </div>

      {/* Match list */}
      <div className="container" style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
            <div className="spinner" />
          </div>
        ) : stageMatches.length === 0 && pendingStageMatches.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
            <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '8px' }}>No matches yet for this round</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Teams will be confirmed as results come in</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {stageMatches.map(renderMatch)}
            {pendingStageMatches.map(renderPendingMatch)}
            {stagePending > 0 && (
              <div style={{ textAlign: 'center', padding: '4px 14px 10px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600', lineHeight: 1.4 }}>
                These future fixtures are read-only. Prediction controls appear automatically when both teams are confirmed.
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
              Doubles all points earned from this match.
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              You have <strong>{jokersRemaining}</strong> joker{jokersRemaining !== 1 ? 's' : ''} remaining for the <strong>entire knockout tournament</strong>. They do not reset each round. You can remove this joker before kickoff, but not after.
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { handleJoker(jokerConfirm.matchId, false); setJokerConfirm(null) }}
                className="btn btn-primary" style={{ flex: 1, background: '#e65100' }}>
                Use 1 of my {jokersRemaining} joker{jokersRemaining !== 1 ? 's' : ''}
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
