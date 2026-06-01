import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/index.js'

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']

// ELO-based autofill — weighted random based on FIFA rankings
const predictScore = (homeRank, awayRank) => {
  // Lower rank number = better team
  const homeStrength = 1 / (homeRank || 20)
  const awayStrength = 1 / (awayRank || 20)
  const total = homeStrength + awayStrength
  const homeWinProb = homeStrength / total

  // Add home advantage
  const adjustedHomeProb = Math.min(0.75, homeWinProb * 1.1)
  const rand = Math.random()

  let result
  if (rand < adjustedHomeProb * 0.7) result = 'home'
  else if (rand < adjustedHomeProb * 0.7 + 0.28) result = 'draw'
  else result = 'away'

  // Generate realistic scores
  const scoreOptions = {
    home: [[1,0],[2,0],[2,1],[3,0],[3,1],[1,0],[2,0]],
    draw: [[0,0],[1,1],[2,2],[1,1],[0,0]],
    away: [[0,1],[0,2],[1,2],[0,3],[1,2]],
  }
  const scores = scoreOptions[result]
  const [h, a] = scores[Math.floor(Math.random() * scores.length)]
  return { home: h, away: a }
}

export default function Predictions() {
  const { user, profile, loadProfile } = useAuthStore()
  const navigate = useNavigate()
  const [activeGroup, setActiveGroup] = useState('A')
  const [viewMode, setViewMode] = useState('group')
  const [matches, setMatches] = useState([])
  const [predictions, setPredictions] = useState({})
  const [odds, setOdds] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState({})
  const [saved, setSaved] = useState({})
  const [jokersRemaining, setJokersRemaining] = useState(5)
  const [autoFilling, setAutoFilling] = useState(false)
  const [showJokerReminder, setShowJokerReminder] = useState(false)

  useEffect(() => {
    loadMatches()
    loadOdds()
    if (user) {
      loadPredictions()
      checkJokerReminder()
    }
  }, [user])

  useEffect(() => {
    if (profile) {
      setJokersRemaining(profile.jokers_group_remaining ?? 5)
    }
  }, [profile])

  const checkJokerReminder = async () => {
    // Check if last group match is within 24 hours
    const lastGroupMatch = new Date('2026-06-28T20:00:00Z')
    const now = new Date()
    const hoursUntilEnd = (lastGroupMatch - now) / (1000 * 60 * 60)
    if (hoursUntilEnd > 0 && hoursUntilEnd < 24 && (profile?.jokers_group_remaining ?? 5) > 0) {
      setShowJokerReminder(true)
    }
  }

  const loadOdds = async () => {
    try {
      const response = await fetch('/.netlify/functions/get-odds')
      if (!response.ok) return
      const data = await response.json()
      const oddsMap = {}
      data.forEach(game => {
        oddsMap[`${game.home_team}|${game.away_team}`] = game.odds
      })
      setOdds(oddsMap)
    } catch (e) {
      console.log('Odds unavailable', e)
    }
  }

  const loadMatches = async () => {
    const { data } = await supabase
      .from('matches')
      .select(`
        *,
        home_team:home_team_id(id,name,flag_emoji,short_code,fifa_ranking),
        away_team:away_team_id(id,name,flag_emoji,short_code,fifa_ranking),
        group:group_id(name),
        venue:venue_id(city,country)
      `)
      .eq('stage', 'group')
      .order('kickoff_time', { ascending: true })
    setMatches(data || [])
    setLoading(false)
  }

  const loadPredictions = async () => {
    const { data } = await supabase
      .from('predictions')
      .select('*')
      .eq('user_id', user.id)
    if (data) {
      const predMap = {}
      data.forEach(p => {
        predMap[p.match_id] = {
          home: p.home_score,
          away: p.away_score,
          joker: p.is_confident,
        }
      })
      setPredictions(predMap)
    }
  }

  const isLocked = (kickoffTime) => new Date() >= new Date(kickoffTime)

  const handleScoreChange = (matchId, side, value) => {
    if (!user) return
    const num = value === '' ? '' : Math.max(0, Math.min(99, parseInt(value) || 0))
    setPredictions(prev => ({
      ...prev,
      [matchId]: { ...prev[matchId], [side]: num }
    }))
  }

  const handleJoker = async (matchId, currentJoker) => {
    if (!user) return
    const pred = predictions[matchId]
    if (!pred) return

    // Can't add joker if none remaining (unless removing one)
    if (!currentJoker && jokersRemaining <= 0) return

    const newJoker = !currentJoker
    const newRemaining = newJoker ? jokersRemaining - 1 : jokersRemaining + 1

    // Update local state immediately
    setPredictions(prev => ({
      ...prev,
      [matchId]: { ...prev[matchId], joker: newJoker }
    }))
    setJokersRemaining(newRemaining)

    // Save to DB
    await supabase
      .from('predictions')
      .upsert({
        user_id: user.id,
        match_id: matchId,
        home_score: pred.home ?? 0,
        away_score: pred.away ?? 0,
        is_confident: newJoker,
        bracket_type: 'main',
      }, { onConflict: 'user_id,match_id,bracket_type' })

    // Update joker count in profile
    await supabase
      .from('profiles')
      .update({ jokers_group_remaining: newRemaining })
      .eq('id', user.id)
  }

  const savePrediction = async (match, jokerOverride) => {
    if (!user) return
    const pred = predictions[match.id]
    if (pred?.home === '' || pred?.home === undefined || pred?.away === '' || pred?.away === undefined) return
    if (isLocked(match.kickoff_time)) return

    setSaving(prev => ({ ...prev, [match.id]: true }))
    const { error } = await supabase
      .from('predictions')
      .upsert({
        user_id: user.id,
        match_id: match.id,
        home_score: pred.home,
        away_score: pred.away,
        is_confident: jokerOverride ?? pred.joker ?? false,
        bracket_type: 'main',
      }, { onConflict: 'user_id,match_id,bracket_type' })

    setSaving(prev => ({ ...prev, [match.id]: false }))
    if (!error) {
      setSaved(prev => ({ ...prev, [match.id]: true }))
      setTimeout(() => setSaved(prev => ({ ...prev, [match.id]: false })), 2000)
    }
  }

  const autoFillGroup = async () => {
    if (!user || autoFilling) return
    setAutoFilling(true)

    const groupMatchesToFill = matches.filter(m =>
      m.group?.name === activeGroup && !isLocked(m.kickoff_time)
    )

    const newPreds = { ...predictions }
    const updates = []

    for (const match of groupMatchesToFill) {
      const score = predictScore(
        match.home_team?.fifa_ranking,
        match.away_team?.fifa_ranking
      )
      newPreds[match.id] = {
        ...newPreds[match.id],
        home: score.home,
        away: score.away,
      }
      updates.push(
        supabase.from('predictions').upsert({
          user_id: user.id,
          match_id: match.id,
          home_score: score.home,
          away_score: score.away,
          is_confident: newPreds[match.id]?.joker ?? false,
          bracket_type: 'main',
        }, { onConflict: 'user_id,match_id,bracket_type' })
      )
    }

    setPredictions(newPreds)
    await Promise.all(updates)
    setAutoFilling(false)
  }

  const formatDate = (time) => {
    const d = new Date(time)
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  const formatTime = (time) => {
    return new Date(time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDateKey = (time) => {
    const d = new Date(time)
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  const getMatchOdds = (match) => {
    const key = `${match.home_team?.name}|${match.away_team?.name}`
    return odds[key] || null
  }

  const getPredictionCount = () => {
    return Object.values(predictions).filter(p =>
      p.home !== undefined && p.home !== '' && p.away !== undefined && p.away !== ''
    ).length
  }

  const matchesByDate = matches.reduce((acc, match) => {
    const key = formatDateKey(match.kickoff_time)
    if (!acc[key]) acc[key] = []
    acc[key].push(match)
    return acc
  }, {})

  const groupMatches = matches.filter(m => m.group?.name === activeGroup)

  const jokerColor = jokersRemaining <= 1 ? 'var(--accent-red)' : jokersRemaining <= 2 ? 'var(--accent-orange)' : 'var(--accent-green)'

  if (loading) {
    return <div className="loading-screen"><div className="spinner" /></div>
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

    const getFavourite = () => {
      if (!matchOdds) return null
      const homeD = matchOdds.home_decimal || 99
      const drawD = matchOdds.draw_decimal || 99
      const awayD = matchOdds.away_decimal || 99
      const minOdds = Math.min(homeD, drawD, awayD)
      if (homeD === minOdds) return 'home'
      if (awayD === minOdds) return 'away'
      return 'draw'
    }
    const favourite = getFavourite()

    return (
      <div
        key={match.id}
        className="card"
        style={{
          opacity: locked ? 0.7 : 1,
          border: hasJoker
            ? '2px solid var(--accent-gold)'
            : hasPrediction
            ? '1px solid var(--accent-green)'
            : '1px solid var(--border-light)',
          background: hasJoker ? 'var(--accent-gold-light)' : 'var(--bg-card)',
        }}
      >
        {/* Joker indicator */}
        {hasJoker && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            marginBottom: '10px',
            padding: '6px 10px',
            background: 'rgba(255,215,0,0.2)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            fontWeight: '700',
            color: '#b8860b',
          }}>
            🃏 Joker applied — 2x points if correct!
          </div>
        )}

        {/* Match info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {viewMode === 'date'
              ? `Group ${match.group?.name} · ${formatTime(match.kickoff_time)} · ${match.venue?.city}`
              : `${formatDate(match.kickoff_time)} · ${formatTime(match.kickoff_time)} · ${match.venue?.city}`
            }
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {locked && <span className="badge badge-red">🔒 Locked</span>}
            {!locked && hasPrediction && !hasJoker && <span className="badge badge-green">✓ Saved</span>}
            {match.status === 'completed' && (
              <span className="badge badge-gray">{match.home_score} – {match.away_score}</span>
            )}
          </div>
        </div>

        {/* Teams + Score inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '36px' }}>{match.home_team?.flag_emoji}</span>
            <span style={{ fontWeight: '700', fontSize: '13px', textAlign: 'center' }}>{match.home_team?.name}</span>
            {favourite === 'home' && matchOdds && (
              <span style={{ fontSize: '10px', color: 'var(--accent-green)', fontWeight: '700' }}>⭐ Favourite</span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="number" className="score-input" min="0" max="99"
              value={pred.home ?? ''}
              onChange={e => handleScoreChange(match.id, 'home', e.target.value)}
              onBlur={() => savePrediction(match)}
              disabled={locked || isGuest} placeholder="?"
              style={{ cursor: isGuest ? 'not-allowed' : 'text', opacity: isGuest ? 0.5 : 1 }}
            />
            <span className="score-divider">–</span>
            <input
              type="number" className="score-input" min="0" max="99"
              value={pred.away ?? ''}
              onChange={e => handleScoreChange(match.id, 'away', e.target.value)}
              onBlur={() => savePrediction(match)}
              disabled={locked || isGuest} placeholder="?"
              style={{ cursor: isGuest ? 'not-allowed' : 'text', opacity: isGuest ? 0.5 : 1 }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '36px' }}>{match.away_team?.flag_emoji}</span>
            <span style={{ fontWeight: '700', fontSize: '13px', textAlign: 'center' }}>{match.away_team?.name}</span>
            {favourite === 'away' && matchOdds && (
              <span style={{ fontSize: '10px', color: 'var(--accent-green)', fontWeight: '700' }}>⭐ Favourite</span>
            )}
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

        {/* Joker + Save (logged in only) */}
        {!isGuest && !locked && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '12px', borderTop: `1px solid ${hasJoker ? 'rgba(255,215,0,0.4)' : 'var(--border-light)'}` }}>
            <button
              onClick={() => hasPrediction && canUseJoker && handleJoker(match.id, hasJoker)}
              disabled={!hasPrediction || (!canUseJoker && !hasJoker)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', borderRadius: 'var(--radius-full)',
                fontSize: '12px', fontWeight: '700',
                background: hasJoker ? 'var(--accent-gold)' : jokersRemaining > 0 ? 'var(--bg-tertiary)' : 'var(--bg-tertiary)',
                color: hasJoker ? 'white' : jokersRemaining > 0 ? 'var(--text-secondary)' : 'var(--text-muted)',
                border: hasJoker ? '1px solid var(--accent-gold)' : '1px solid var(--border-light)',
                transition: 'all 0.15s', cursor: hasPrediction && (canUseJoker || hasJoker) ? 'pointer' : 'not-allowed',
                opacity: !hasPrediction ? 0.5 : 1,
              }}
            >
              🃏 {hasJoker ? 'Joker ON' : 'Use Joker'}
            </button>

            <button
              onClick={() => savePrediction(match)}
              disabled={isSaving || pred.home === '' || pred.home === undefined}
              className="btn btn-sm"
              style={{ background: isSaved ? 'var(--accent-green)' : 'var(--primary)', color: 'white', minWidth: '80px' }}
            >
              {isSaving
                ? <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
                : isSaved ? '✓ Saved' : 'Save'}
            </button>
          </div>
        )}

        {locked && match.status === 'completed' && hasPrediction && (
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-muted)' }}>
              Your prediction: <strong>{pred.home} – {pred.away}</strong>
              {hasJoker && <span style={{ marginLeft: '6px', color: '#b8860b' }}>🃏</span>}
            </span>
            <span style={{ fontWeight: '700', color: 'var(--accent-green)' }}>+{predictions[match.id]?.points_total || 0} pts</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>
      {/* Joker reminder banner */}
      {showJokerReminder && user && jokersRemaining > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #b8860b, #ffd700)',
          padding: '12px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '12px',
        }}>
          <div style={{ color: 'white', fontSize: '13px', fontWeight: '600' }}>
            ⚠️ Group stage ends in less than 24hrs! You have <strong>{jokersRemaining} joker{jokersRemaining > 1 ? 's' : ''}</strong> left — use them!
          </div>
          <button onClick={() => setShowJokerReminder(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px' }}>✕</button>
        </div>
      )}

      {/* Guest banner */}
      {!user && (
        <div style={{
          background: 'linear-gradient(135deg, #0a0a0a, #1a2a1a)',
          padding: '14px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '12px', flexWrap: 'wrap',
        }}>
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

      {/* Header */}
      <div style={{
        background: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)',
        padding: '16px 20px', position: 'sticky', top: 'var(--nav-height)', zIndex: 50,
      }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: '800' }}>⚽ Predictions</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Joker counter */}
              {user && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-full)',
                  background: jokersRemaining === 0 ? 'var(--bg-tertiary)' : 'var(--accent-gold-light)',
                  border: `1px solid ${jokersRemaining === 0 ? 'var(--border-light)' : 'var(--accent-gold)'}`,
                  fontSize: '13px',
                  fontWeight: '700',
                  color: jokersRemaining === 0 ? 'var(--text-muted)' : '#b8860b',
                  animation: jokersRemaining > 0 && showJokerReminder ? 'pulse 1.5s infinite' : 'none',
                }}>
                  🃏 {jokersRemaining} left
                </div>
              )}

              {/* View toggle */}
              <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', padding: '3px', gap: '2px' }}>
                <button
                  onClick={() => setViewMode('group')}
                  style={{
                    padding: '5px 12px', borderRadius: 'var(--radius-full)',
                    fontSize: '12px', fontWeight: '600', border: 'none', cursor: 'pointer',
                    background: viewMode === 'group' ? 'var(--bg-card)' : 'transparent',
                    color: viewMode === 'group' ? 'var(--text-primary)' : 'var(--text-muted)',
                    boxShadow: viewMode === 'group' ? 'var(--shadow-sm)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >By Group</button>
                <button
                  onClick={() => setViewMode('date')}
                  style={{
                    padding: '5px 12px', borderRadius: 'var(--radius-full)',
                    fontSize: '12px', fontWeight: '600', border: 'none', cursor: 'pointer',
                    background: viewMode === 'date' ? 'var(--bg-card)' : 'transparent',
                    color: viewMode === 'date' ? 'var(--text-primary)' : 'var(--text-muted)',
                    boxShadow: viewMode === 'date' ? 'var(--shadow-sm)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >By Date</button>
              </div>

              {user && (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  <span style={{ fontWeight: '700', color: 'var(--accent-green)' }}>{getPredictionCount()}</span>
                  <span> / {matches.length}</span>
                </div>
              )}
            </div>
          </div>

          {/* Group tabs + autofill */}
          {viewMode === 'group' && (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', flex: 1 }}>
                {GROUPS.map(g => (
                  <button
                    key={g}
                    onClick={() => setActiveGroup(g)}
                    style={{
                      padding: '6px 14px', borderRadius: 'var(--radius-full)',
                      fontSize: '13px', fontWeight: '700',
                      background: activeGroup === g ? 'var(--primary)' : 'var(--bg-tertiary)',
                      color: activeGroup === g ? 'var(--text-inverse)' : 'var(--text-muted)',
                      border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                      transition: 'all 0.15s', flexShrink: 0,
                    }}
                  >Group {g}</button>
                ))}
              </div>

              {/* Autofill button */}
              {user && (
                <button
                  onClick={autoFillGroup}
                  disabled={autoFilling}
                  style={{
                    padding: '6px 12px', borderRadius: 'var(--radius-full)',
                    fontSize: '12px', fontWeight: '700', flexShrink: 0,
                    background: 'var(--accent-blue-light)',
                    color: 'var(--accent-blue)',
                    border: '1px solid var(--accent-blue)',
                    cursor: autoFilling ? 'wait' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '4px',
                    transition: 'all 0.15s',
                  }}
                >
                  {autoFilling ? <div className="spinner" style={{ width: '12px', height: '12px', borderWidth: '2px' }} /> : '🎲'}
                  {autoFilling ? 'Filling...' : 'Autofill'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>

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
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {Object.entries(matchesByDate).map(([date, dayMatches]) => (
              <div key={date}>
                <div style={{
                  fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  marginBottom: '10px',
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  <div style={{ flex: 1, height: '1px', background: 'var(--border-light)' }} />
                  <span>{date}</span>
                  <div style={{ flex: 1, height: '1px', background: 'var(--border-light)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {dayMatches.map(renderMatch)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
