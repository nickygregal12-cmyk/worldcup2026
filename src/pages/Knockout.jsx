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

// Pre-tournament placeholders so users can predict before teams are known
const STAGE_PLACEHOLDERS = {
  r32: Array.from({ length: 16 }, (_, i) => ({
    id: `r32-placeholder-${i}`,
    match_number: 73 + i,
    stage: 'r32',
    home_team_placeholder: `Winner Group ${String.fromCharCode(65 + Math.floor(i / 2))}`,
    away_team_placeholder: `Runner-up Group ${String.fromCharCode(65 + Math.floor(i / 2))}`,
    kickoff_time: '2026-06-28T23:00:00Z',
    isPlaceholder: true,
  })),
}

export default function Knockout() {
  const { user } = useAuthStore()
  const [matches, setMatches] = useState([])
  const [predictions, setPredictions] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState({})
  const [saved, setSaved] = useState({})
  const [activeStage, setActiveStage] = useState('r32')
  const [jokerPicks, setJokerPicks] = useState({})
  const [jokersRemaining, setJokersRemaining] = useState(3)

  const tournamentStarted = new Date() >= new Date('2026-06-28T20:00:00Z') // group stage ends

  useEffect(() => {
    loadMatches()
    if (user) loadPredictions()
  }, [user])

  useEffect(() => {
    if (user?.profile) {
      setJokersRemaining(user.profile.jokers_knockout_remaining ?? 3)
    }
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
    if (!matches.length) return
    const { data } = await supabase
      .from('predictions')
      .select('*')
      .eq('user_id', user.id)
      .eq('bracket_type', 'main')

    if (data) {
      const predMap = {}
      const jokerMap = {}
      data.forEach(p => {
        predMap[p.match_id] = p.winner_team_id || p.home_team_placeholder_pick
        jokerMap[p.match_id] = p.is_confident
      })
      setPredictions(predMap)
      setJokerPicks(jokerMap)
    }
  }

  useEffect(() => {
    if (matches.length && user) loadPredictions()
  }, [matches, user])

  const isLocked = (kickoffTime) => new Date() >= new Date(kickoffTime)

  const savePick = async (matchId, teamId, teamName, isPlaceholder) => {
    if (!user) return
    setSaving(prev => ({ ...prev, [matchId]: true }))

    const upsertData = {
      user_id: user.id,
      match_id: isPlaceholder ? null : matchId,
      bracket_type: 'main',
      home_score: 1,
      away_score: 0,
      is_confident: jokerPicks[matchId] || false,
    }

    if (isPlaceholder) {
      // Store by match_number reference for placeholder matches
      upsertData.match_number_ref = matchId
      upsertData.winner_team_placeholder = teamName
    } else {
      upsertData.winner_team_id = teamId
    }

    const { error } = await supabase
      .from('predictions')
      .upsert(
        { ...upsertData, match_id: isPlaceholder ? matchId : matchId },
        { onConflict: 'user_id,match_id,bracket_type' }
      )

    setSaving(prev => ({ ...prev, [matchId]: false }))
    if (!error) {
      setPredictions(prev => ({ ...prev, [matchId]: teamId || teamName }))
      setSaved(prev => ({ ...prev, [matchId]: true }))
      setTimeout(() => setSaved(prev => ({ ...prev, [matchId]: false })), 2000)
    }
  }

  const handleJoker = async (matchId) => {
    if (!user) return
    const hasJoker = jokerPicks[matchId]
    const newJoker = !hasJoker
    const newRemaining = newJoker ? jokersRemaining - 1 : jokersRemaining + 1

    if (newJoker && jokersRemaining <= 0) return

    setJokerPicks(prev => ({ ...prev, [matchId]: newJoker }))
    setJokersRemaining(newRemaining)

    await supabase.from('profiles')
      .update({ jokers_knockout_remaining: newRemaining })
      .eq('id', user.id)
  }

  const formatDate = (time) => {
    if (!time) return 'TBC'
    const d = new Date(time)
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) +
      ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const getTeamDisplay = (match, side) => {
    const team = side === 'home' ? match.home_team : match.away_team
    const placeholder = side === 'home' ? match.home_team_placeholder : match.away_team_placeholder

    if (team) return { name: team.name, flag: team.flag_emoji, id: team.id, known: true }
    if (placeholder) return { name: placeholder, flag: '🏳️', id: placeholder, known: false }
    return { name: 'TBC', flag: '🏳️', id: null, known: false }
  }

  const stageMatches = matches.filter(m => m.stage === activeStage)

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  const renderMatch = (match) => {
    const home = getTeamDisplay(match, 'home')
    const away = getTeamDisplay(match, 'away')
    const locked = isLocked(match.kickoff_time)
    const predicted = predictions[match.id]
    const isSaving = saving[match.id]
    const isSaved = saved[match.id]
    const hasJoker = jokerPicks[match.id]
    const hasPrediction = !!predicted
    const canPick = !locked && user

    return (
      <div
        key={match.id}
        className="card"
        style={{
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
            marginBottom: '10px', padding: '6px 10px',
            background: 'rgba(184,134,11,0.15)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px', fontWeight: '700', color: 'var(--accent-gold)',
          }}>
            🃏 Joker applied — 2x points if correct!
          </div>
        )}

        {/* Match info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Match {match.match_number} · {formatDate(match.kickoff_time)}
            {match.venue?.city && ` · ${match.venue.city}`}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {locked && <span className="badge badge-red">🔒 Locked</span>}
            {hasPrediction && !locked && <span className="badge badge-green">✓ Picked</span>}
            {isSaved && <span className="badge badge-green">Saved!</span>}
          </div>
        </div>

        {/* Teams */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[{ team: home, side: 'home' }, { team: away, side: 'away' }].map(({ team }) => {
            const isPicked = predicted === team.id || predicted === team.name
            const isWinner = match.winner_team_id && team.id === match.winner_team_id

            return (
              <button
                key={team.id || team.name}
                onClick={() => canPick && team.id && savePick(match.id, team.id, team.name, !team.known)}
                disabled={!canPick || isSaving}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
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
                  cursor: canPick && team.id ? 'pointer' : 'default',
                  transition: 'all 0.15s',
                  width: '100%', textAlign: 'left',
                  opacity: !team.known && !tournamentStarted ? 0.75 : 1,
                }}
              >
                <span style={{ fontSize: team.known ? '28px' : '20px' }}>{team.flag}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>{team.name}</div>
                  {!team.known && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Team TBC after group stage</div>
                  )}
                </div>
                {isPicked && <span style={{ color: 'var(--accent-green)', fontSize: '18px' }}>✓</span>}
                {isWinner && !isPicked && <span style={{ color: 'var(--accent-gold)', fontSize: '14px', fontWeight: '700' }}>Winner</span>}
              </button>
            )
          })}
        </div>

        {/* Joker + actions */}
        {canPick && hasPrediction && (
          <div style={{
            marginTop: '12px', paddingTop: '12px',
            borderTop: '1px solid var(--border-light)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <button
              onClick={() => handleJoker(match.id)}
              disabled={!hasJoker && jokersRemaining <= 0}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', borderRadius: 'var(--radius-full)',
                fontSize: '12px', fontWeight: '700',
                background: hasJoker ? 'var(--accent-gold)' : 'var(--bg-tertiary)',
                color: hasJoker ? 'white' : jokersRemaining > 0 ? 'var(--text-secondary)' : 'var(--text-muted)',
                border: 'none', cursor: (!hasJoker && jokersRemaining <= 0) ? 'not-allowed' : 'pointer',
                opacity: (!hasJoker && jokersRemaining <= 0) ? 0.5 : 1,
              }}
            >
              🃏 {hasJoker ? 'Joker ON' : 'Use Joker'}
            </button>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {isSaving
                ? <div className="spinner" style={{ width: '14px', height: '14px' }} />
                : hasPrediction ? `Picked ✓` : ''}
            </div>
          </div>
        )}

        {/* Guest CTA */}
        {!user && !locked && (
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Register to pick a winner</span>
            <Link to="/register" className="btn btn-primary btn-sm">Join free</Link>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0a0a0a, #1a2a1a)',
        padding: '20px', color: 'white', textAlign: 'center',
      }}>
        <h1 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '4px' }}>🏆 Knockout Stage</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
          {tournamentStarted
            ? 'Pick the winner of each match'
            : 'Predict now — teams confirmed after group stage ends 28 Jun'}
        </p>
        {!tournamentStarted && (
          <div style={{
            marginTop: '10px', background: 'rgba(255,255,255,0.1)',
            borderRadius: '8px', padding: '8px 16px',
            fontSize: '12px', color: 'rgba(255,255,255,0.7)',
          }}>
            💡 Teams shown as placeholders until group stage completes
          </div>
        )}
      </div>

      {/* Stage tabs */}
      <div style={{
        background: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)',
        position: 'sticky', top: 'var(--nav-height)', zIndex: 50, overflowX: 'auto',
      }}>
        <div style={{ display: 'flex', padding: '0 16px' }}>
          {STAGES.map(stage => (
            <button
              key={stage}
              onClick={() => setActiveStage(stage)}
              style={{
                padding: '14px 16px', fontSize: '13px',
                fontWeight: activeStage === stage ? '700' : '400',
                color: activeStage === stage ? 'var(--text-primary)' : 'var(--text-muted)',
                borderBottom: activeStage === stage ? '2px solid var(--primary)' : '2px solid transparent',
                whiteSpace: 'nowrap', background: 'none', border: 'none',
                borderBottom: activeStage === stage ? '2px solid var(--primary)' : '2px solid transparent',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {STAGE_LABELS[stage]}
            </button>
          ))}
        </div>
      </div>

      {/* Points info + joker counter */}
      <div style={{
        background: 'var(--accent-blue-light)', padding: '10px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: '13px',
      }}>
        <span style={{ color: 'var(--accent-blue)', fontWeight: '600' }}>
          🏅 Correct {STAGE_LABELS[activeStage]} pick = <strong>{STAGE_POINTS[activeStage]} pts</strong>
        </span>
        {user && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '4px 10px', borderRadius: 'var(--radius-full)',
            background: jokersRemaining === 0 ? 'var(--bg-tertiary)' : 'var(--accent-gold-light)',
            border: `1px solid ${jokersRemaining === 0 ? 'var(--border-light)' : 'var(--accent-gold)'}`,
            fontSize: '12px', fontWeight: '700',
            color: jokersRemaining === 0 ? 'var(--text-muted)' : 'var(--accent-gold)',
          }}>
            🃏 {jokersRemaining} left
          </div>
        )}
      </div>

      {/* Matches */}
      <div className="container" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {stageMatches.length > 0
            ? stageMatches.map(renderMatch)
            : (
              <div className="empty-state">
                <div className="empty-state-icon">🏆</div>
                <div className="empty-state-title">No {STAGE_LABELS[activeStage]} matches yet</div>
                <div className="empty-state-desc">Matches will appear once confirmed</div>
              </div>
            )
          }
        </div>
      </div>
    </div>
  )
}
