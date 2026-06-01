import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/index.js'

const STAGE_LABELS = {
  r32: 'Round of 32',
  r16: 'Round of 16',
  qf: 'Quarter-finals',
  sf: 'Semi-finals',
  '3rd': '3rd Place',
  final: 'The Final',
}

const STAGE_POINTS = {
  r32: 5,
  r16: 8,
  qf: 12,
  sf: 16,
  '3rd': 8,
  final: 20,
}

const STAGES = ['r32', 'r16', 'qf', 'sf', '3rd', 'final']

export default function Knockout() {
  const { user } = useAuthStore()
  const [matches, setMatches] = useState([])
  const [predictions, setPredictions] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState({})
  const [saved, setSaved] = useState({})
  const [activeStage, setActiveStage] = useState('r32')

  useEffect(() => {
    loadMatches()
    if (user) loadPredictions()
  }, [user])

  const loadMatches = async () => {
    const { data } = await supabase
      .from('matches')
      .select(`
        *,
        home_team:home_team_id(id,name,flag_emoji,short_code),
        away_team:away_team_id(id,name,flag_emoji,short_code),
        venue:venue_id(city,country)
      `)
      .in('stage', STAGES)
      .order('match_number', { ascending: true })

    setMatches(data || [])
    setLoading(false)
  }

  const loadPredictions = async () => {
    const { data } = await supabase
      .from('predictions')
      .select('*')
      .eq('user_id', user.id)
      .in('match_id', matches.map(m => m.id))

    if (data) {
      const predMap = {}
      data.forEach(p => { predMap[p.match_id] = p.winner_team_id })
      setPredictions(predMap)
    }
  }

  const isLocked = (kickoffTime) => new Date() >= new Date(kickoffTime)

  const savePrediction = async (matchId, winnerId) => {
    if (!user) return
    setSaving(prev => ({ ...prev, [matchId]: true }))

    const { error } = await supabase
      .from('predictions')
      .upsert({
        user_id: user.id,
        match_id: matchId,
        home_score: 1,
        away_score: 0,
        bracket_type: 'main',
      }, { onConflict: 'user_id,match_id,bracket_type' })

    setSaving(prev => ({ ...prev, [matchId]: false }))
    if (!error) {
      setPredictions(prev => ({ ...prev, [matchId]: winnerId }))
      setSaved(prev => ({ ...prev, [matchId]: true }))
      setTimeout(() => setSaved(prev => ({ ...prev, [matchId]: false })), 2000)
    }
  }

  const formatDate = (time) => {
    if (!time) return ''
    const d = new Date(time)
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) +
      ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const getTeamDisplay = (match, side) => {
    const team = side === 'home' ? match.home_team : match.away_team
    const placeholder = side === 'home' ? match.home_team_placeholder : match.away_team_placeholder

    if (team) return { name: team.name, flag: team.flag_emoji, short: team.short_code, id: team.id }
    if (placeholder) return { name: placeholder, flag: '🏳️', short: placeholder, id: null }
    return { name: 'TBC', flag: '🏳️', short: 'TBC', id: null }
  }

  const stageMatches = matches.filter(m => m.stage === activeStage)
  const hasTeams = (match) => match.home_team || match.away_team

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  const tournamentStarted = matches.some(m => m.stage === 'r32' && (m.home_team || m.home_score !== null))

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0a0a0a, #1a2a1a)',
        padding: '20px',
        color: 'white',
        textAlign: 'center',
      }}>
        <h1 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '4px' }}>🏆 Knockout Stage</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
          {tournamentStarted
            ? 'Predict the winner of each match'
            : 'Unlocks when group stage is complete · 28 Jun 2026'}
        </p>
      </div>

      {/* Stage tabs */}
      <div style={{
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-light)',
        position: 'sticky',
        top: 'var(--nav-height)',
        zIndex: 50,
        overflowX: 'auto',
      }}>
        <div style={{ display: 'flex', padding: '0 16px' }}>
          {STAGES.map(stage => (
            <button
              key={stage}
              onClick={() => setActiveStage(stage)}
              style={{
                padding: '14px 16px',
                fontSize: '13px',
                fontWeight: activeStage === stage ? '700' : '400',
                color: activeStage === stage ? 'var(--text-primary)' : 'var(--text-muted)',
                borderBottom: activeStage === stage ? '2px solid var(--primary)' : '2px solid transparent',
                whiteSpace: 'nowrap',
                background: 'none',
                border: 'none',
                borderBottom: activeStage === stage ? '2px solid var(--primary)' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {STAGE_LABELS[stage]}
            </button>
          ))}
        </div>
      </div>

      {/* Points info */}
      <div style={{
        background: 'var(--accent-blue-light)',
        padding: '10px 20px',
        textAlign: 'center',
        fontSize: '13px',
        color: 'var(--accent-blue)',
        fontWeight: '600',
      }}>
        🏅 Correct {STAGE_LABELS[activeStage]} winner = <strong>{STAGE_POINTS[activeStage]} pts</strong>
      </div>

      <div className="container" style={{ padding: '16px' }}>
        {!tournamentStarted ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px' }}>
              Group Stage in Progress
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
              The knockout bracket will be populated once the group stage is complete on 28 June 2026.
              Teams will appear automatically as they qualify.
            </p>
            <Link to="/predictions" className="btn btn-primary">
              ⚽ Make Group Stage Predictions
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {stageMatches.map(match => {
              const home = getTeamDisplay(match, 'home')
              const away = getTeamDisplay(match, 'away')
              const locked = isLocked(match.kickoff_time)
              const predicted = predictions[match.id]
              const isSaving = saving[match.id]
              const isSaved = saved[match.id]
              const teamsKnown = hasTeams(match)

              return (
                <div
                  key={match.id}
                  className="card"
                  style={{
                    border: predicted ? '1px solid var(--accent-green)' : '1px solid var(--border-light)',
                    opacity: !teamsKnown ? 0.6 : 1,
                  }}
                >
                  {/* Match info */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Match {match.match_number} · {formatDate(match.kickoff_time)}
                      {match.venue?.city && ` · ${match.venue.city}`}
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {locked && <span className="badge badge-red">🔒 Locked</span>}
                      {predicted && !locked && <span className="badge badge-green">✓ Picked</span>}
                      {match.status === 'completed' && match.winner_team_id && (
                        <span className="badge badge-gold">
                          {match.home_team?.id === match.winner_team_id
                            ? match.home_team?.short_code
                            : match.away_team?.short_code} wins
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Teams */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { team: home, side: 'home' },
                      { team: away, side: 'away' },
                    ].map(({ team, side }) => {
                      const isWinner = match.winner_team_id && team.id === match.winner_team_id
                      const isPicked = predicted === team.id
                      const canPick = !locked && user && teamsKnown && team.id

                      return (
                        <button
                          key={side}
                          onClick={() => canPick && savePrediction(match.id, team.id)}
                          disabled={!canPick || isSaving}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px 14px',
                            borderRadius: 'var(--radius-md)',
                            border: isPicked
                              ? '2px solid var(--accent-green)'
                              : isWinner
                              ? '2px solid var(--accent-gold)'
                              : '1.5px solid var(--border-light)',
                            background: isPicked
                              ? 'var(--accent-green-light)'
                              : isWinner
                              ? 'var(--accent-gold-light)'
                              : 'var(--bg-secondary)',
                            cursor: canPick ? 'pointer' : 'default',
                            transition: 'all 0.15s',
                            width: '100%',
                            textAlign: 'left',
                          }}
                        >
                          <span style={{ fontSize: '28px' }}>{team.flag}</span>
                          <span style={{ fontWeight: '700', fontSize: '15px', flex: 1 }}>{team.name}</span>
                          {isPicked && <span style={{ color: 'var(--accent-green)', fontSize: '18px' }}>✓</span>}
                          {isWinner && !isPicked && <span style={{ color: '#b8860b', fontSize: '14px', fontWeight: '700' }}>Winner</span>}
                          {match.status === 'completed' && team.id && (
                            <span style={{
                              fontSize: '13px',
                              fontWeight: '700',
                              color: isWinner
                                ? (isPicked ? 'var(--accent-green)' : 'var(--text-muted)')
                                : 'var(--text-muted)',
                            }}>
                              {isWinner
                                ? isPicked ? `+${STAGE_POINTS[activeStage]}pts` : '❌'
                                : ''}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {/* Guest CTA */}
                  {!user && teamsKnown && !locked && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Register to pick a winner</span>
                      <Link to="/register" className="btn btn-primary btn-sm">Join free</Link>
                    </div>
                  )}
                </div>
              )
            })}

            {stageMatches.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">🏆</div>
                <div className="empty-state-title">No {STAGE_LABELS[activeStage]} matches yet</div>
                <div className="empty-state-desc">Teams will appear as they qualify</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
