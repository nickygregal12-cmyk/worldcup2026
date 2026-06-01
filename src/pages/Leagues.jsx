import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/index.js'

export default function Leagues() {
  const { user } = useAuthStore()
  const [myLeagues, setMyLeagues] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [newLeagueName, setNewLeagueName] = useState('')
  const [visibility, setVisibility] = useState('fair')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadMyLeagues()
  }, [user])

  const loadMyLeagues = async () => {
    if (!user) return
    const { data } = await supabase
      .from('league_members')
      .select(`
        *,
        league:league_id(id, name, invite_code, visibility_rule, is_global, member_count, created_by)
      `)
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false })

    setMyLeagues(data || [])
    setLoading(false)
  }

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  }

  const createLeague = async () => {
    if (!newLeagueName.trim()) { setError('Please enter a league name'); return }
    setError('')
    const code = generateCode()
    const { data: league, error: err } = await supabase
      .from('leagues')
      .insert({
        name: newLeagueName.trim(),
        invite_code: code,
        created_by: user.id,
        visibility_rule: visibility,
        is_global: false,
      })
      .select()
      .single()

    if (err) { setError(err.message); return }

    await supabase.from('league_members').insert({
      league_id: league.id,
      user_id: user.id,
    })

    setSuccess(`League created! Invite code: ${code}`)
    setNewLeagueName('')
    setShowCreate(false)
    loadMyLeagues()
  }

  const joinLeague = async () => {
    if (!joinCode.trim()) { setError('Enter an invite code'); return }
    setError('')
    const { data: league } = await supabase
      .from('leagues')
      .select('*')
      .eq('invite_code', joinCode.toUpperCase().trim())
      .single()

    if (!league) { setError('League not found — check the code'); return }

    const { error: err } = await supabase
      .from('league_members')
      .insert({ league_id: league.id, user_id: user.id })

    if (err?.code === '23505') { setError('You are already in this league'); return }
    if (err) { setError(err.message); return }

    setSuccess(`Joined "${league.name}"!`)
    setJoinCode('')
    setShowJoin(false)
    loadMyLeagues()
  }

  const visibilityLabel = (rule) => {
    if (rule === 'strict') return { label: '🔒 Strict', desc: 'See predictions after tournament ends' }
    if (rule === 'fair') return { label: '⚖️ Fair', desc: 'See predictions for played matches only' }
    return { label: '🔓 Open', desc: 'See all predictions anytime' }
  }

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-light)',
        padding: '20px',
      }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '800' }}>👥 Leagues</h1>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { setShowJoin(!showJoin); setShowCreate(false); setError('') }} className="btn btn-secondary btn-sm">
                Join
              </button>
              <button onClick={() => { setShowCreate(!showCreate); setShowJoin(false); setError('') }} className="btn btn-primary btn-sm">
                + Create
              </button>
            </div>
          </div>

          {/* Success message */}
          {success && (
            <div style={{
              padding: '12px 16px',
              background: 'var(--accent-green-light)',
              color: 'var(--accent-green)',
              borderRadius: 'var(--radius-md)',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '12px',
            }}>
              ✅ {success}
            </div>
          )}

          {/* Create form */}
          {showCreate && (
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '12px' }}>
              <div style={{ fontWeight: '700', marginBottom: '12px' }}>Create a League</div>
              <div className="form-group">
                <label className="label">League Name</label>
                <input className="input" placeholder="e.g. Office Predictions 2026" value={newLeagueName} onChange={e => setNewLeagueName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="label">Prediction Visibility</label>
                <select className="input" value={visibility} onChange={e => setVisibility(e.target.value)}>
                  <option value="fair">⚖️ Fair — see predictions for played matches only</option>
                  <option value="strict">🔒 Strict — see predictions after tournament ends</option>
                  <option value="open">🔓 Open — see all predictions anytime</option>
                </select>
              </div>
              {error && <div style={{ color: 'var(--accent-red)', fontSize: '13px', marginBottom: '8px' }}>{error}</div>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={createLeague} className="btn btn-primary btn-sm">Create League</button>
                <button onClick={() => setShowCreate(false)} className="btn btn-secondary btn-sm">Cancel</button>
              </div>
            </div>
          )}

          {/* Join form */}
          {showJoin && (
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '12px' }}>
              <div style={{ fontWeight: '700', marginBottom: '12px' }}>Join a League</div>
              <div className="form-group">
                <label className="label">Invite Code</label>
                <input
                  className="input"
                  placeholder="e.g. AB1234"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', fontSize: '18px', fontWeight: '700' }}
                />
              </div>
              {error && <div style={{ color: 'var(--accent-red)', fontSize: '13px', marginBottom: '8px' }}>{error}</div>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={joinLeague} className="btn btn-primary btn-sm">Join League</button>
                <button onClick={() => setShowJoin(false)} className="btn btn-secondary btn-sm">Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* My Leagues */}
      <div className="container" style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
            <div className="spinner" />
          </div>
        ) : myLeagues.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <div className="empty-state-title">No leagues yet</div>
            <div className="empty-state-desc">Create a league or join one with an invite code</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {myLeagues.map(({ league, total_points, rank }) => {
              const vis = visibilityLabel(league?.visibility_rule)
              return (
                <div key={league?.id} className="card card-hover">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '4px' }}>
                        {league?.is_global ? '🌍 ' : '👥 '}{league?.name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {vis.label} · {vis.desc}
                      </div>
                    </div>
                    {rank && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: '800', fontSize: '20px', fontFamily: 'var(--font-mono)', color: 'var(--accent-green)' }}>
                          #{rank}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Your rank</div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-light)' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      👥 {league?.member_count || '—'} members
                    </div>
                    {!league?.is_global && (
                      <div style={{
                        marginLeft: 'auto',
                        background: 'var(--bg-tertiary)',
                        padding: '4px 12px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '13px',
                        fontWeight: '700',
                        fontFamily: 'var(--font-mono)',
                        letterSpacing: '0.1em',
                        color: 'var(--text-secondary)',
                      }}>
                        {league?.invite_code}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
