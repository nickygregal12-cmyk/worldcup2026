import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/index.js'

export default function PublicLeague() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [league, setLeague] = useState(null)
  const [leagueType, setLeagueType] = useState('tournament')
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
    setError(null)
    const cleanCode = code?.toUpperCase().trim()

    const { data: tournamentLeague } = await supabase
      .from('leagues')
      .select('id, name, invite_code, created_at, scoring_preset, custom_scoring, creator:created_by(username, display_name)')
      .eq('invite_code', cleanCode)
      .maybeSingle()

    if (tournamentLeague) {
      setLeagueType('tournament')
      setLeague(tournamentLeague)

      const [{ data: memberData }, { data: offlineData }] = await Promise.all([
        supabase
          .from('league_members')
          .select('user_id, league_points, profile:user_id(id, username, display_name, total_points, avatar_emoji, streak_current)')
          .eq('league_id', tournamentLeague.id),
        supabase
          .from('offline_players')
          .select('id, display_name, league_points')
          .eq('league_id', tournamentLeague.id),
      ])

      setMembers(memberData || [])
      setOfflinePlayers(offlineData || [])
      setLoading(false)
      return
    }

    const { data: koLeague } = await supabase
      .from('ko_leagues')
      .select('id, name, invite_code, created_at, creator:created_by(username, display_name)')
      .eq('invite_code', cleanCode)
      .maybeSingle()

    if (!koLeague) {
      setError('League not found')
      setLoading(false)
      return
    }

    setLeagueType('ko')
    setLeague(koLeague)
    setOfflinePlayers([])

    const { data: koMemberData } = await supabase
      .from('ko_league_members')
      .select('user_id, profile:user_id(id, username, display_name, ko_points, ko_exact_scores, avatar_emoji)')
      .eq('league_id', koLeague.id)

    setMembers(koMemberData || [])
    setLoading(false)
  }

  const checkMembership = async () => {
    if (!user || !league) return
    const table = leagueType === 'ko' ? 'ko_league_members' : 'league_members'
    const { data } = await supabase.from(table)
      .select('user_id').eq('league_id', league.id).eq('user_id', user.id).maybeSingle()
    setAlreadyMember(!!data)
  }

  const joinLeague = async () => {
    if (!user) {
      navigate(`/register?join=${code}${leagueType === 'ko' ? '&game=ko' : ''}`)
      return
    }
    setJoining(true)
    setError(null)
    const table = leagueType === 'ko' ? 'ko_league_members' : 'league_members'
    const { error: joinError } = await supabase.from(table).insert({ league_id: league.id, user_id: user.id })
    if (joinError && joinError.code !== '23505') {
      setError(joinError.message || 'Could not join this league')
      setJoining(false)
      return
    }
    setJoined(true)
    setAlreadyMember(true)
    setJoining(false)
    setTimeout(() => navigate(`/leagues${leagueType === 'ko' ? '?game=ko' : ''}`), 1500)
  }

  // Combine and sort all members by points
  const allMembers = [
    ...(members || []).map(m => ({
      id: m.user_id,
      name: m.profile?.display_name || m.profile?.username || 'Unknown',
      avatar: m.profile?.avatar_emoji || '👤',
      points: leagueType === 'ko'
        ? (m.profile?.ko_points || 0)
        : (m.league_points > 0 ? m.league_points : (m.profile?.total_points || 0)),
      streak: leagueType === 'ko' ? 0 : (m.profile?.streak_current || 0),
      exactScores: leagueType === 'ko' ? (m.profile?.ko_exact_scores || 0) : 0,
      isOffline: false,
    })),
    ...(leagueType === 'tournament' ? (offlinePlayers || []).map(op => ({
      id: op.id,
      name: op.display_name,
      avatar: '👤',
      points: op.league_points || 0,
      streak: 0,
      exactScores: 0,
      isOffline: true,
    })) : [])
  ].sort((a, b) => b.points - a.points)

  const getRankIcon = (rank) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  const isCustomScoring = leagueType === 'tournament' && league?.scoring_preset && league.scoring_preset !== 'standard'

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
        background: leagueType === 'ko' ? 'linear-gradient(135deg, rgba(130,45,0,0.94), rgba(230,81,0,0.9)), url(/hero-bg.jpg) center/cover no-repeat' : 'linear-gradient(135deg, rgba(0,20,60,0.92) 0%, rgba(0,50,135,0.88) 60%, rgba(0,20,60,0.92) 100%), url(/hero-bg.jpg) center/cover no-repeat',
        padding: '40px 20px 32px', color: 'white', textAlign: 'center',
      }}>
        <div style={{ fontSize: '13px', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>
          {leagueType === 'ko' ? 'WC26 Predictor · KO Predictor League' : 'WC26 Predictor · Tournament Mini League'}
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
            <Link to={leagueType === 'ko' ? '/leagues?game=ko' : '/leagues'} className="btn btn-primary" style={{ display: 'inline-block' }}>
              View your leagues →
            </Link>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <button onClick={joinLeague} disabled={joining} className="btn btn-primary" style={{ fontSize: '16px', padding: '14px 32px', fontWeight: '800' }}>
                {joining ? '⏳ Joining...' : user ? (leagueType === 'ko' ? '🔥 Join this KO league' : '🏆 Join this league') : (leagueType === 'ko' ? '🔥 Join free — sign up to compete' : '🏆 Join free — sign up to compete')}
              </button>
              {!user && (
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
                  Already have an account? <Link to={`/login?join=${code}${leagueType === 'ko' ? '&game=ko' : ''}`} style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'underline' }}>Sign in</Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="container" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Offline players note */}
        {allMembers.some(m => m.isOffline) && (
          <div className="card" style={{ padding: '12px 16px', borderLeft: '3px solid var(--accent-blue)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '18px', flexShrink: 0 }}>📧</span>
            <div>
              <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '2px' }}>Some players don't have an account yet</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Players marked "no account" have their picks entered by the league admin. Ask the admin for a personal invite link to get your own account — your predictions lock automatically at kickoff so no one can change them.
              </div>
            </div>
          </div>
        )}

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
                    {member.isOffline && <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '6px', fontWeight: '400' }}>no account</span>}
                  </div>
                  {!member.isOffline && member.streak > 1 && (
                    <div style={{ fontSize: '11px', color: 'var(--accent-orange)', fontWeight: '600' }}>🔥 {member.streak} streak</div>
                  )}
                  {leagueType === 'ko' && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>🎯 {member.exactScores} exact scores</div>
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
              {leagueType === 'ko' ? 'Predict the knockout matches and compete on KO Predictor points only. Your picks lock at kickoff.' : 'Predict all 104 World Cup matches and compete for glory. Your picks lock automatically at kickoff — no one can change them.'}
            </div>
            <button onClick={joinLeague} disabled={joining} className="btn btn-primary" style={{ fontWeight: '800', width: '100%', padding: '12px' }}>
              {joining ? '⏳ Joining...' : user ? (leagueType === 'ko' ? '🔥 Join this KO league' : '🏆 Join this league') : (leagueType === 'ko' ? '🔥 Sign up free & join' : '🏆 Sign up free & join')}
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
