import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/index.js'

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']

export default function Predictions() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [activeGroup, setActiveGroup] = useState('A')
  const [matches, setMatches] = useState([])
  const [predictions, setPredictions] = useState({})
  const [odds, setOdds] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState({})
  const [saved, setSaved] = useState({})

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    loadMatches()
    loadPredictions()
  }, [user])

  const loadMatches = async () => {
    const { data } = await supabase
      .from('matches')
      .select(`
        *,
        home_team:home_team_id(id,name,flag_emoji,short_code),
        away_team:away_team_id(id,name,flag_emoji,short_code),
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
          confident: p.is_confident,
        }
      })
      setPredictions(predMap)
    }
  }

  const isLocked = (kickoffTime) => {
    return new Date() >= new Date(kickoffTime)
  }

  const handleScoreChange = (matchId, side, value) => {
    const num = value === '' ? '' : Math.max(0, Math.min(99, parseInt(value) || 0))
    setPredictions(prev => ({
      ...prev,
      [matchId]: { ...prev[matchId], [side]: num }
    }))
  }

  const handleConfident = (matchId) => {
    setPredictions(prev => ({
      ...prev,
      [matchId]: { ...prev[matchId], confident: !prev[matchId]?.confident }
    }))
  }

  const savePrediction = async (match) => {
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
        is_confident: pred.confident || false,
        bracket_type: 'main',
      }, { onConflict: 'user_id,match_id,bracket_type' })

    setSaving(prev => ({ ...prev, [match.id]: false }))
    if (!error) {
      setSaved(prev => ({ ...prev, [match.id]: true }))
      setTimeout(() => setSaved(prev => ({ ...prev, [match.id]: false })), 2000)
    }
  }

  const formatDate = (time) => {
    const d = new Date(time)
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  const formatTime = (time) => {
    return new Date(time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const groupMatches = matches.filter(m => m.group?.name === activeGroup)

  const getMatchOdds = (matchId) => odds[matchId] || null

  const getPredictionCount = () => {
    return Object.values(predictions).filter(p => p.home !== undefined && p.home !== '' && p.away !== undefined && p.away !== '').length
  }

  if (loading) {
    return <div className="loading-screen"><div className="spinner" /></div>
  }

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-light)',
        padding: '16px 20px',
        position: 'sticky',
        top: 'var(--nav-height)',
        zIndex: 50,
      }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: '800' }}>⚽ Predictions</h1>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              <span style={{ fontWeight: '700', color: 'var(--accent-green)' }}>{getPredictionCount()}</span>
              <span> / {matches.length} predicted</span>
            </div>
          </div>

          {/* Group tabs */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
            {GROUPS.map(g => (
              <button
                key={g}
                onClick={() => setActiveGroup(g)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '13px',
                  fontWeight: '700',
                  background: activeGroup === g ? 'var(--primary)' : 'var(--bg-tertiary)',
                  color: activeGroup === g ? 'var(--text-inverse)' : 'var(--text-muted)',
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                  flexShrink: 0,
                }}
              >
                Group {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Matches */}
      <div className="container" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {groupMatches.map(match => {
            const pred = predictions[match.id] || {}
            const locked = isLocked(match.kickoff_time)
            const isSaving = saving[match.id]
            const isSaved = saved[match.id]
            const matchOdds = getMatchOdds(match.id)
            const hasPrediction = pred.home !== undefined && pred.home !== ''

            // Determine favourite from odds
            const getFavourite = () => {
              if (!matchOdds) return null
              const { home, draw, away } = matchOdds
              const minOdds = Math.min(
                parseFloat(home) || 99,
                parseFloat(draw) || 99,
                parseFloat(away) || 99
              )
              if (parseFloat(home) === minOdds) return 'home'
              if (parseFloat(away) === minOdds) return 'away'
              return 'draw'
            }
            const favourite = getFavourite()

            return (
              <div
                key={match.id}
                className="card"
                style={{
                  opacity: locked ? 0.7 : 1,
                  border: hasPrediction ? '1px solid var(--accent-green)' : '1px solid var(--border-light)',
                }}
              >
                {/* Match info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {formatDate(match.kickoff_time)} · {formatTime(match.kickoff_time)} · {match.venue?.city}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {locked && <span className="badge badge-red">🔒 Locked</span>}
                    {!locked && hasPrediction && <span className="badge badge-green">✓ Saved</span>}
                    {match.status === 'completed' && (
                      <span className="badge badge-gray">
                        {match.home_score} – {match.away_score}
                      </span>
                    )}
                  </div>
                </div>

                {/* Teams + Score inputs */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '14px',
                }}>
                  {/* Home team */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '36px' }}>{match.home_team?.flag_emoji}</span>
                    <span style={{ fontWeight: '700', fontSize: '13px', textAlign: 'center' }}>
                      {match.home_team?.name}
                    </span>
                    {favourite === 'home' && matchOdds && (
                      <span style={{ fontSize: '10px', color: 'var(--accent-green)', fontWeight: '700' }}>⭐ Favourite</span>
                    )}
                  </div>

                  {/* Score inputs */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="number"
                      className="score-input"
                      min="0" max="99"
                      value={pred.home ?? ''}
                      onChange={e => handleScoreChange(match.id, 'home', e.target.value)}
                      onBlur={() => savePrediction(match)}
                      disabled={locked}
                      placeholder="0"
                    />
                    <span className="score-divider">–</span>
                    <input
                      type="number"
                      className="score-input"
                      min="0" max="99"
                      value={pred.away ?? ''}
                      onChange={e => handleScoreChange(match.id, 'away', e.target.value)}
                      onBlur={() => savePrediction(match)}
                      disabled={locked}
                      placeholder="0"
                    />
                  </div>

                  {/* Away team */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '36px' }}>{match.away_team?.flag_emoji}</span>
                    <span style={{ fontWeight: '700', fontSize: '13px', textAlign: 'center' }}>
                      {match.away_team?.name}
                    </span>
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

                {/* Confidence toggle + Save */}
                {!locked && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-light)' }}>
                    <button
                      onClick={() => handleConfident(match.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: pred.confident ? 'var(--accent-gold-light)' : 'var(--bg-tertiary)',
                        color: pred.confident ? '#b8860b' : 'var(--text-muted)',
                        border: pred.confident ? '1px solid var(--accent-gold)' : '1px solid transparent',
                        transition: 'all 0.15s',
                        cursor: 'pointer',
                      }}
                    >
                      🎯 {pred.confident ? 'Confident! (2x pts)' : 'Confident?'}
                    </button>

                    <button
                      onClick={() => savePrediction(match)}
                      disabled={isSaving || pred.home === '' || pred.home === undefined}
                      className="btn btn-sm"
                      style={{
                        background: isSaved ? 'var(--accent-green)' : 'var(--primary)',
                        color: 'white',
                        minWidth: '80px',
                      }}
                    >
                      {isSaving ? <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> :
                       isSaved ? '✓ Saved' : 'Save'}
                    </button>
                  </div>
                )}

                {locked && match.status === 'completed' && hasPrediction && (
                  <div style={{
                    marginTop: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--border-light)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '13px',
                  }}>
                    <span style={{ color: 'var(--text-muted)' }}>
                      Your prediction: <strong>{pred.home} – {pred.away}</strong>
                    </span>
                    <span style={{ fontWeight: '700', color: 'var(--accent-green)' }}>
                      +{predictions[match.id]?.points_total || 0} pts
                    </span>
                  </div>
                )}
              </div>
            )
          })}

          {groupMatches.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">⚽</div>
              <div className="empty-state-title">No matches in Group {activeGroup}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
