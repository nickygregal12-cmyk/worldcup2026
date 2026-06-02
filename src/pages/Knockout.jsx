import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/index.js'
import { ErrorState, SkeletonCard } from '../components/PageState.jsx'

const STAGES = [
  { key: 'r16', label: 'Round of 16', slots: 16, points: 5, emoji: '🏟️' },
  { key: 'qf', label: 'Quarter-finals', slots: 8, points: 8, emoji: '⚡' },
  { key: 'sf', label: 'Semi-finals', slots: 4, points: 12, emoji: '🔥' },
  { key: 'final', label: 'The Final', slots: 2, points: 16, emoji: '🌟' },
  { key: 'winner', label: 'Tournament Winner', slots: 1, points: 25, emoji: '🏆' },
]

export default function Knockout() {
  const { user, profile } = useAuthStore()
  const [teams, setTeams] = useState([])
  const [picks, setPicks] = useState({}) // { r16: [teamId, ...], qf: [...], ... }
  const [activeStage, setActiveStage] = useState('r16')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const [jokerPick, setJokerPick] = useState(null) // teamId for winner joker
  const [jokersRemaining, setJokersRemaining] = useState(3)

  const tournamentStarted = new Date() >= new Date('2026-06-11T23:00:00Z')
  const knockoutDeadline = new Date('2026-06-28T20:00:00Z')
  const isLocked = new Date() >= knockoutDeadline

  useEffect(() => {
    loadTeams()
    if (user) loadPicks()
  }, [user])

  useEffect(() => {
    if (profile) setJokersRemaining(profile.jokers_knockout_remaining ?? 3)
  }, [profile])

  const loadTeams = async () => {
    const { data } = await supabase
      .from('teams')
      .select('id, name, flag_emoji, short_code, group:group_teams(group:group_id(name))')
      .order('name')
    setTeams(data || [])
    setLoading(false)
  }

  const loadPicks = async () => {
    const { data } = await supabase
      .from('knockout_picks')
      .select('*')
      .eq('user_id', user.id)

    if (data && data.length > 0) {
      const pickMap = {}
      let joker = null
      data.forEach(p => {
        if (!pickMap[p.stage]) pickMap[p.stage] = []
        pickMap[p.stage].push(p.team_id)
        if (p.is_joker) joker = p.team_id
      })
      setPicks(pickMap)
      setJokerPick(joker)
    }
  }

  const toggleTeam = async (teamId) => {
    if (!user || isLocked) return
    const stage = activeStage
    const maxSlots = STAGES.find(s => s.key === stage)?.slots || 16
    const current = picks[stage] || []

    let updated
    if (current.includes(teamId)) {
      updated = current.filter(id => id !== teamId)
      // Remove joker if this team is deselected
      if (jokerPick === teamId && stage === 'winner') setJokerPick(null)
    } else {
      if (current.length >= maxSlots) return // already at max
      updated = [...current, teamId]
    }

    const newPicks = { ...picks, [stage]: updated }
    setPicks(newPicks)

    // Auto-save
    setSaving(true)
    await supabase.from('knockout_picks').delete()
      .eq('user_id', user.id).eq('stage', stage)

    if (updated.length > 0) {
      await supabase.from('knockout_picks').insert(
        updated.map(tid => ({
          user_id: user.id,
          stage,
          team_id: tid,
          is_joker: tid === jokerPick && stage === 'winner',
        }))
      )
    }
    setSaving(false)
    setLastSaved(new Date())
  }

  const toggleJoker = async (teamId) => {
    if (!user || isLocked) return
    if (activeStage !== 'winner') return
    const newJoker = jokerPick === teamId ? null : teamId
    const newRemaining = newJoker ? (jokerPick ? jokersRemaining : jokersRemaining - 1) : jokersRemaining + 1
    if (newJoker && !jokerPick && jokersRemaining <= 0) return

    setJokerPick(newJoker)
    setJokersRemaining(newRemaining)

    // Update DB
    await supabase.from('knockout_picks')
      .update({ is_joker: false })
      .eq('user_id', user.id).eq('stage', 'winner')

    if (newJoker) {
      await supabase.from('knockout_picks')
        .update({ is_joker: true })
        .eq('user_id', user.id).eq('stage', 'winner').eq('team_id', newJoker)
    }

    await supabase.from('profiles')
      .update({ jokers_knockout_remaining: newRemaining })
      .eq('id', user.id)
  }

  const autofill = () => {
    if (!user || isLocked || teams.length === 0) return
    const stage = activeStage
    const maxSlots = STAGES.find(s => s.key === stage)?.slots || 16

    // Pick random teams weighted by "strength" (just random for now)
    const shuffled = [...teams].sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, maxSlots).map(t => t.id)
    setPicks(prev => ({ ...prev, [stage]: selected }))

    // Save all
    setSaving(true)
    supabase.from('knockout_picks').delete()
      .eq('user_id', user.id).eq('stage', stage)
      .then(() => {
        supabase.from('knockout_picks').insert(
          selected.map(tid => ({ user_id: user.id, stage, team_id: tid, is_joker: false }))
        ).then(() => { setSaving(false); setLastSaved(new Date()) })
      })
  }

  const currentStage = STAGES.find(s => s.key === activeStage)
  const currentPicks = picks[activeStage] || []
  const slotsLeft = currentStage ? currentStage.slots - currentPicks.length : 0

  if (loading) return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh', padding: '16px' }}>
      <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '16px' }}>
        <SkeletonCard rows={2} />
        <SkeletonCard rows={4} />
        <SkeletonCard rows={4} />
      </div>
    </div>
  )

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0a0a0a, #1a2a1a)',
        padding: '20px', color: 'white',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '4px' }}>🏆 Knockout Picks</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
              Pick which teams advance through each round
            </p>
          </div>
          {user && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 12px', borderRadius: 'var(--radius-full)',
              background: jokersRemaining === 0 ? 'rgba(255,255,255,0.1)' : 'rgba(255,215,0,0.2)',
              border: `1px solid ${jokersRemaining === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,215,0,0.5)'}`,
              fontSize: '12px', fontWeight: '700',
              color: jokersRemaining === 0 ? 'rgba(255,255,255,0.5)' : '#ffd700',
            }}>
              🃏 {jokersRemaining} left
            </div>
          )}
        </div>

        {/* Points summary strip */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
          {STAGES.map(s => (
            <div key={s.key} style={{
              background: 'rgba(255,255,255,0.08)',
              borderRadius: '8px', padding: '6px 10px', flexShrink: 0,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '16px' }}>{s.emoji}</div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>{s.label}</div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#ffd700' }}>+{s.points}pts</div>
            </div>
          ))}
        </div>

        {isLocked && (
          <div style={{ marginTop: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
            🔒 Knockout picks locked — group stage complete
          </div>
        )}
      </div>

      {/* Stage tabs */}
      <div style={{
        background: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)',
        position: 'sticky', top: 'var(--nav-height)', zIndex: 50, overflowX: 'auto',
      }}>
        <div style={{ display: 'flex' }}>
          {STAGES.map(stage => {
            const stagePicks = picks[stage.key] || []
            const complete = stagePicks.length === stage.slots
            return (
              <button
                key={stage.key}
                onClick={() => setActiveStage(stage.key)}
                style={{
                  padding: '12px 14px', fontSize: '12px', whiteSpace: 'nowrap',
                  fontWeight: activeStage === stage.key ? '700' : '400',
                  color: activeStage === stage.key ? 'var(--text-primary)' : 'var(--text-muted)',
                  borderBottom: activeStage === stage.key ? '2px solid var(--primary)' : '2px solid transparent',
                  background: 'none', border: 'none',
                  borderBottom: activeStage === stage.key ? '2px solid var(--primary)' : '2px solid transparent',
                  cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                }}
              >
                {stage.label}
                <span style={{
                  fontSize: '10px', fontWeight: '600',
                  color: complete ? 'var(--accent-green)' : 'var(--text-muted)',
                }}>
                  {complete ? '✓' : `${stagePicks.length}/${stage.slots}`}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Stage info bar */}
      <div style={{
        background: 'var(--accent-blue-light)', padding: '10px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ fontSize: '13px', color: 'var(--accent-blue)', fontWeight: '600' }}>
          {currentStage?.emoji} Pick <strong>{currentStage?.slots} team{currentStage?.slots > 1 ? 's' : ''}</strong> to reach the {currentStage?.label} · <strong>+{currentStage?.points}pts</strong> each
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {user && !isLocked && (
            <button
              onClick={autofill}
              style={{
                padding: '4px 10px', borderRadius: 'var(--radius-full)',
                fontSize: '12px', fontWeight: '700',
                background: 'var(--accent-blue-light)',
                color: 'var(--accent-blue)',
                border: '1px solid var(--accent-blue)',
                cursor: 'pointer',
              }}
            >
              🎲 Autofill
            </button>
          )}
          <div style={{
            fontSize: '12px', fontWeight: '700',
            color: slotsLeft === 0 ? 'var(--accent-green)' : 'var(--text-muted)',
          }}>
            {slotsLeft === 0 ? '✓ Complete' : `${slotsLeft} left`}
          </div>
        </div>
      </div>

      {/* Team grid */}
      <div className="container" style={{ padding: '16px' }}>
        {!user ? (
          <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏆</div>
            <div style={{ fontWeight: '700', fontSize: '18px', marginBottom: '8px' }}>Pick your knockout teams</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
              Register to predict which teams will advance through each round
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <Link to="/register" className="btn btn-primary">Join free</Link>
              <Link to="/login" className="btn btn-secondary">Sign in</Link>
            </div>
          </div>
        ) : (
          <>
            {/* Winner joker banner */}
            {activeStage === 'winner' && currentPicks.length > 0 && (
              <div style={{
                marginBottom: '12px', padding: '10px 14px',
                background: 'var(--accent-gold-light)',
                border: '1px solid var(--accent-gold)',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px', color: 'var(--accent-gold)',
                fontWeight: '600',
              }}>
                🃏 Tap "Joker" on your tournament winner pick to double your points!
              </div>
            )}

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px',
            }}>
              {teams.map(team => {
                const isPicked = currentPicks.includes(team.id)
                const isJoker = jokerPick === team.id && activeStage === 'winner'
                const atMax = currentPicks.length >= currentStage?.slots && !isPicked

                return (
                  <div
                    key={team.id}
                    style={{
                      borderRadius: 'var(--radius-md)',
                      border: isJoker
                        ? '2px solid var(--accent-gold)'
                        : isPicked
                        ? '2px solid var(--accent-green)'
                        : '1.5px solid var(--border-light)',
                      background: isJoker
                        ? 'var(--accent-gold-light)'
                        : isPicked
                        ? 'var(--accent-green-light)'
                        : 'var(--bg-card)',
                      overflow: 'hidden',
                      opacity: atMax ? 0.4 : 1,
                      transition: 'all 0.15s',
                    }}
                  >
                    <button
                      onClick={() => toggleTeam(team.id)}
                      disabled={atMax || isLocked}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 12px', background: 'none', border: 'none',
                        cursor: atMax || isLocked ? 'default' : 'pointer', textAlign: 'left',
                      }}
                    >
                      <span style={{ fontSize: '26px' }}>{team.flag_emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontWeight: '700', fontSize: '13px',
                          color: isPicked ? 'var(--accent-green)' : 'var(--text-primary)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {team.name}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {team.short_code}
                        </div>
                      </div>
                      {isPicked && (
                        <span style={{ color: isJoker ? 'var(--accent-gold)' : 'var(--accent-green)', fontSize: '16px', flexShrink: 0 }}>
                          {isJoker ? '🃏' : '✓'}
                        </span>
                      )}
                    </button>

                    {/* Joker button for winner stage */}
                    {activeStage === 'winner' && isPicked && (
                      <button
                        onClick={() => toggleJoker(team.id)}
                        disabled={!isJoker && jokersRemaining <= 0}
                        style={{
                          width: '100%', padding: '6px 12px',
                          background: isJoker ? 'var(--accent-gold)' : 'var(--bg-tertiary)',
                          color: isJoker ? 'white' : 'var(--text-muted)',
                          border: 'none', borderTop: '1px solid var(--border-light)',
                          cursor: (!isJoker && jokersRemaining <= 0) ? 'not-allowed' : 'pointer',
                          fontSize: '11px', fontWeight: '700',
                          opacity: (!isJoker && jokersRemaining <= 0) ? 0.5 : 1,
                        }}
                      >
                        {isJoker ? '🃏 Joker ON — 2x pts!' : '🃏 Use Joker'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Save indicator */}
            {(saving || lastSaved) && (
              <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
                {saving
                  ? <><div className="spinner" style={{ width: '14px', height: '14px', display: 'inline-block', marginRight: '6px' }} />Saving...</>
                  : lastSaved ? '✓ Picks saved' : ''}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
