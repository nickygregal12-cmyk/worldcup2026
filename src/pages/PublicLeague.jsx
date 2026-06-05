import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/index.js'

export default function PublicLeague() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [league, setLeague] = useState(null)
  const [members, setMembers] = useState([])
  const [offlinePlayers, setOfflinePlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [joined, setJoined] = useState(false)
  const [error, setError] = useState(null)
  const [alreadyMember, setAlreadyMember] = useState(false)

  useEffect(() => {
    loadLeague()
  }, [code])

  useEffect(() => {
    if (user && league) checkMembership()
  }, [user, league])

  const loadLeague = async () => {
    setLoading(true)
    const { data: leagueData } = await supabase
      .from('leagues')
      .select('id, name, invite_code, created_at, scoring_preset, custom_scoring, creator:created_by(username, display_name)')
      .eq('invite_code', code?.toUpperCase().trim())
      .single()

    if (!leagueData) { setError('League not found'); setLoading(false); return }
    setLeague(leagueData)

    // Load real members
    const { data: memberData } = await supabase
      .from('league_members')
      .select('user_id, league_points, profile:user_id(id, username, display_name, total_points, avatar_emoji, streak_current)')
      .eq('league_id', leagueData.id)

    // Load offline players
    const { data: offlineData } = await supabase
      .from('offline_players')
      .select('id, display_name, league_points')
      .eq('league_id', leagueData.id)

    setMembers(memberData || [])
    setOfflinePlayers(offlineData || [])
    setLoading(false)
  }

  const checkMembership = async () => {
    if (!user || !league) return
    const { data } = await supabase.from('league_members')
      .select('user_id').eq('league_id', league.id).eq('user_id', user.id).single()
    if (data) setAlreadyMember(true)
  }

  const joinLeague = async () => {
    if (!user) {
      navigate(`/register?join=${code}`)
      return
    }
    setJoining(true)
    await supabase.from('league_members').insert({ league_id: league.id, user_id: user.id })
    setJoined(true)
    setAlreadyMember(true)
    setJoining(false)
    setTimeout(() => navigate('/leagues'), 1500)
  }

  // Combine and sort all members by points
  const allMembers = [
    ...(members || []).map(m => ({
      id: m.user_id,
      name: m.profile?.display_name || m.profile?.username || 'Unknown',
      avatar: m.profile?.avatar_emoji || '👤',
      points: m.league_points > 0 ? m.league_points : (m.profile?.total_points || 0),
      streak: m.profile?.streak_current || 0,
      isOffline: false,
    })),
    ...(offlinePlayers || []).map(op => ({
      id: op.id,
      name: op.display_name,
      avatar: '👤',
      points: op.league_points || 0,
      streak: 0,
      isOffline: true,
    }))
  ].sort((a, b) => b.points - a.points)

  const getRankIcon = (rank) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  const isCustomScoring = league?.scoring_preset && league.scoring_preset !== 'standard'

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏴</div>
      <div style={{ fontWeight: '800', fontSize: '20px', marginBottom: '8px' }}>League not found</div>
      <div style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>This invite link doesn't exist or has expired.</div>
      <Link to="/" className="btn btn-primary">Go to home</Link>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)' }}>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(0,20,60,0.92) 0%, rgba(0,50,135,0.88) 60%, rgba(0,20,60,0.92) 100%), url(/hero-bg.jpg) center/cover no-repeat',
        padding: '40px 20px 32px', color: 'white', textAlign: 'center',
      }}>
        <div style={{ fontSize: '13px', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>
          WC26 Predictor · Mini League
        </div>
        <h1 style={{ fontSize: 'clamp(26px, 6vw, 40px)', fontWeight: '900', letterSpacing: '-0.03em', marginBottom: '8px', lineHeight: 1.1 }}>
          {league.name}
        </h1>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '6px' }}>
          {allMembers.length} {allMembers.length === 1 ? 'player' : 'players'} competing
          {league.creator?.display_name || league.creator?.username ? ` · Created by ${league.creator.display_name || league.creator.username}` : ''}
        </div>
        {isCustomScoring && (
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.1)', borderRadius: 'var(--radius-full)', padding: '3px 10px', fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginBottom: '8px' }}>
            ⚙️ Custom scoring
          </div>
        )}

        {/* CTA */}
        <div style={{ marginTop: '20px' }}>
          {joined ? (
            <div style={{ background: 'var(--accent-green)', color: 'white', padding: '12px 24px', borderRadius: 'var(--radius-full)', fontWeight: '700', display: 'inline-block' }}>
              ✅ Joined! Taking you there...
            </div>
          ) : alreadyMember ? (
            <Link to="/leagues" className="btn btn-primary" style={{ display: 'inline-block' }}>
              View your leagues →
            </Link>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <button onClick={joinLeague} disabled={joining} className="btn btn-primary" style={{ fontSize: '16px', padding: '14px 32px', fontWeight: '800' }}>
                {joining ? '⏳ Joining...' : user ? '🏆 Join this league' : '🏆 Join free — sign up to compete'}
              </button>
              {!user && (
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
                  Already have an account? <Link to={`/login?join=${code}`} style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'underline' }}>Sign in</Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="container" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {allMembers.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏆</div>
            <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '4px' }}>Be the first to join!</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No one has joined this league yet.</div>
          </div>
        ) : (
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '800', fontSize: '15px' }}>🏆 Leaderboard</span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{allMembers.length} players</span>
            </div>
            {allMembers.map((member, i) => (
              <div key={member.id} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 16px',
                borderBottom: i < allMembers.length - 1 ? '1px solid var(--border-light)' : 'none',
                background: i < 3 ? `rgba(${i === 0 ? '255,199,0' : i === 1 ? '192,192,192' : '205,127,50'},0.05)` : 'transparent',
              }}>
                <div style={{ fontWeight: '800', fontSize: i < 3 ? '20px' : '13px', minWidth: '32px', textAlign: 'center', color: i >= 3 ? 'var(--text-muted)' : 'inherit' }}>
                  {getRankIcon(i + 1)}
                </div>
                <div style={{ fontSize: '24px', lineHeight: 1 }}>{member.avatar}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '700', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {member.name}
                    {member.isOffline && <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '6px', fontWeight: '400' }}>paper entry</span>}
                  </div>
                  {member.streak > 1 && (
                    <div style={{ fontSize: '11px', color: 'var(--accent-orange)', fontWeight: '600' }}>🔥 {member.streak} streak</div>
                  )}
                </div>
                <div style={{ fontWeight: '900', fontSize: '16px', fontFamily: 'var(--font-mono)', color: member.points > 0 ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                  {member.points}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Join CTA at bottom */}
        {!alreadyMember && !joined && (
          <div className="card" style={{ textAlign: 'center', padding: '20px', background: 'var(--scottish-navy)', color: 'white' }}>
            <div style={{ fontWeight: '800', fontSize: '16px', marginBottom: '6px' }}>Think you can beat them? 🏴󠁧󠁢󠁳󠁣󠁴󠁥󠁢</div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '14px' }}>
              Predict all 104 World Cup matches and compete for glory.
            </div>
            <button onClick={joinLeague} disabled={joining} className="btn btn-primary" style={{ fontWeight: '800', width: '100%', padding: '12px' }}>
              {joining ? '⏳ Joining...' : user ? '🏆 Join this league' : '🏆 Sign up free & join'}
            </button>
          </div>
        )}

        {/* Invite code */}
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', paddingBottom: '16px' }}>
          League code: <strong>{league.invite_code}</strong>
        </div>
      </div>
    </div>
  )
}
