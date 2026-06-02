import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/index.js'

function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState({})
  useEffect(() => {
    if (!targetDate) return
    const calc = () => {
      const diff = new Date(targetDate) - new Date()
      if (diff <= 0) return setTimeLeft({ started: true })
      setTimeLeft({
        started: false,
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      })
    }
    calc()
    const interval = setInterval(calc, 1000)
    return () => clearInterval(interval)
  }, [targetDate])
  return timeLeft
}

export default function Home() {
  const { user, profile } = useAuthStore()
  const [nextMatch, setNextMatch] = useState(null)
  const [liveMatches, setLiveMatches] = useState([])
  const [upcomingMatches, setUpcomingMatches] = useState([])
  const [topPredictors, setTopPredictors] = useState([])
  const [loading, setLoading] = useState(true)
  const countdown = useCountdown(nextMatch?.kickoff_time)

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    // Refresh every 60s — live scores update, countdown switches to next match
    const interval = setInterval(loadData, 60000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    const now = new Date().toISOString()

    // Live matches — kicked off but not completed
    const { data: liveData } = await supabase
      .from('matches')
      .select('*, home_team:home_team_id(name,flag_emoji,short_code), away_team:away_team_id(name,flag_emoji,short_code), venue:venue_id(city)')
      .eq('status', 'live')
      .order('kickoff_time', { ascending: true })

    // Next upcoming match not yet kicked off
    const { data: nextData } = await supabase
      .from('matches')
      .select('*, home_team:home_team_id(name,flag_emoji,short_code), away_team:away_team_id(name,flag_emoji,short_code), venue:venue_id(city)')
      .eq('status', 'scheduled')
      .gt('kickoff_time', now)
      .order('kickoff_time', { ascending: true })
      .limit(1)
      .single()

    // Next 4 upcoming for the list (after the very next one)
    const { data: upcomingData } = await supabase
      .from('matches')
      .select('*, home_team:home_team_id(name,flag_emoji,short_code), away_team:away_team_id(name,flag_emoji,short_code), venue:venue_id(city)')
      .eq('status', 'scheduled')
      .gt('kickoff_time', now)
      .order('kickoff_time', { ascending: true })
      .range(1, 5)

    const { data: predictorData } = await supabase
      .from('profiles')
      .select('id, username, total_points, streak_current')
      .order('total_points', { ascending: false })
      .limit(5)

    setLiveMatches(liveData || [])
    setNextMatch(nextData || null)
    setUpcomingMatches(upcomingData || [])
    setTopPredictors(predictorData || [])
    setLoading(false)
  }

  const formatKickoff = (time) => {
    const d = new Date(time)
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) +
      ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const tournamentOver = !loading && !nextMatch && liveMatches.length === 0

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a2a1a 50%, #0a1a0a 100%)',
        padding: '40px 20px', textAlign: 'center', color: 'white',
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--accent-green)', letterSpacing: '0.1em', marginBottom: '12px', textTransform: 'uppercase' }}>
            FIFA World Cup 2026
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 6vw, 48px)', fontWeight: '900', letterSpacing: '-0.03em', marginBottom: '12px', lineHeight: 1.1 }}>
            WC26 Predictor
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px', marginBottom: '28px' }}>
            Predict every match. Compete with friends. Glory awaits.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {user ? (
              <Link to="/predictions" className="btn btn-green btn-lg">⚽ Make Predictions</Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-green btn-lg">🏆 Join Free</Link>
                <Link to="/login" style={{
                  background: 'rgba(255,255,255,0.1)', color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  padding: '14px 28px', borderRadius: 'var(--radius-lg)',
                  fontSize: '16px', fontWeight: '600', textDecoration: 'none',
                  display: 'inline-flex', alignItems: 'center',
                }}>Sign in</Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)', padding: '16px 20px' }}>
        <div className="container">
          <div style={{ display: 'flex', gap: '24px', overflowX: 'auto', justifyContent: 'center' }}>
            {[
              { label: 'Teams', value: '48' },
              { label: 'Matches', value: '104' },
              { label: 'Groups', value: '12' },
              { label: 'Hosts', value: 'USA · CAN · MEX' },
              { label: 'Start', value: '11 Jun' },
              { label: 'Final', value: '19 Jul' },
            ].map(({ label, value }) => (
              <div key={label} style={{ textAlign: 'center', minWidth: '60px', flexShrink: 0 }}>
                <div style={{ fontWeight: '800', fontSize: '16px', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{value}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '24px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>

          {/* User stats */}
          {user && profile && (
            <div className="card fade-in">
              <div className="section-header">
                <span className="section-title">👋 Your Stats</span>
                <Link to="/profile" className="section-link">View profile →</Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { label: 'Points', value: profile.total_points || 0, icon: '🏅' },
                  { label: 'Streak', value: profile.streak_current || 0, icon: '🔥' },
                  { label: 'Perfect', value: profile.perfect_rounds || 0, icon: '🎯' },
                ].map(({ label, value, icon }) => (
                  <div key={label} style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>{icon}</div>
                    <div style={{ fontWeight: '800', fontSize: '22px', fontFamily: 'var(--font-mono)' }}>{value}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LIVE MATCHES */}
          {liveMatches.length > 0 && (
            <div className="card fade-in" style={{ border: '2px solid #e53935' }}>
              <div className="section-header" style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    background: '#e53935', color: 'white',
                    fontSize: '11px', fontWeight: '800', padding: '3px 8px',
                    borderRadius: 'var(--radius-full)', letterSpacing: '0.08em',
                    animation: 'pulse 2s infinite',
                  }}>🔴 LIVE</span>
                  <span className="section-title">
                    {liveMatches.length === 1 ? 'Match in Progress' : `${liveMatches.length} Matches in Progress`}
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Updates every 60s</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {liveMatches.map(match => (
                  <div key={match.id} style={{
                    background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
                    padding: '14px 16px', border: '1px solid rgba(229,57,53,0.2)',
                  }}>
                    {match.venue?.city && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px', textAlign: 'center', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        📍 {match.venue.city}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                      {/* Home team */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
                        <span style={{ fontSize: '32px' }}>{match.home_team?.flag_emoji}</span>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>{match.home_team?.short_code}</span>
                      </div>

                      {/* Score */}
                      <div style={{ textAlign: 'center', minWidth: '80px' }}>
                        <div style={{
                          fontSize: '32px', fontWeight: '900', fontFamily: 'var(--font-mono)',
                          color: 'var(--text-primary)', lineHeight: 1,
                          letterSpacing: '-0.02em',
                        }}>
                          {match.home_score ?? 0} – {match.away_score ?? 0}
                        </div>
                        <div style={{
                          marginTop: '6px', fontSize: '10px', fontWeight: '800',
                          color: '#e53935', textTransform: 'uppercase', letterSpacing: '0.1em',
                        }}>
                          Live
                        </div>
                      </div>

                      {/* Away team */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
                        <span style={{ fontSize: '32px' }}>{match.away_team?.flag_emoji}</span>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>{match.away_team?.short_code}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* COUNTDOWN to next match */}
          {!loading && !tournamentOver && nextMatch && (
            <div className="card fade-in">
              {liveMatches.length > 0 ? (
                // Compact next match when live games are showing
                <>
                  <div className="section-header">
                    <span className="section-title">📅 Next Up</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>All times UK</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                      <span style={{ fontSize: '22px' }}>{nextMatch.home_team?.flag_emoji}</span>
                      <span style={{ fontSize: '13px', fontWeight: '700' }}>{nextMatch.home_team?.short_code}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>vs</span>
                      <span style={{ fontSize: '13px', fontWeight: '700' }}>{nextMatch.away_team?.short_code}</span>
                      <span style={{ fontSize: '22px' }}>{nextMatch.away_team?.flag_emoji}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>
                      {formatKickoff(nextMatch.kickoff_time)}
                    </div>
                  </div>
                </>
              ) : countdown.started ? (
                // Match just kicked off — show upcoming list
                <>
                  <div className="section-header">
                    <span className="section-title">📅 Upcoming Matches</span>
                    <Link to="/predictions" className="section-link">Predict →</Link>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[nextMatch, ...upcomingMatches].slice(0, 4).map(match => (
                      <div key={match.id} style={{
                        background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
                        padding: '12px 14px', border: '1px solid var(--border-light)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '22px' }}>{match.home_team?.flag_emoji}</span>
                          <span style={{ fontSize: '13px', fontWeight: '700' }}>{match.home_team?.short_code}</span>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>vs</span>
                          <span style={{ fontSize: '13px', fontWeight: '700' }}>{match.away_team?.short_code}</span>
                          <span style={{ fontSize: '22px' }}>{match.away_team?.flag_emoji}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>
                          {formatKickoff(match.kickoff_time)}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                // Full countdown
                <>
                  <div className="section-header">
                    <span className="section-title">⏱️ Next Match</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>All times UK</span>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
                    <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      {formatKickoff(nextMatch.kickoff_time)}
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>
                      {nextMatch.home_team?.flag_emoji} {nextMatch.home_team?.name} vs {nextMatch.away_team?.name} {nextMatch.away_team?.flag_emoji}
                    </div>
                    {nextMatch.venue?.city && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                        📍 {nextMatch.venue.city}
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                      {[
                        { value: countdown.days, label: 'Days' },
                        { value: countdown.hours, label: 'Hours' },
                        { value: countdown.minutes, label: 'Mins' },
                        { value: countdown.seconds, label: 'Secs' },
                      ].map(({ value, label }) => (
                        <div key={label} style={{
                          background: 'var(--primary)', color: 'var(--text-inverse)',
                          borderRadius: 'var(--radius-md)', padding: '14px 10px', minWidth: '60px', textAlign: 'center',
                        }}>
                          <div style={{ fontSize: '30px', fontWeight: '900', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
                            {String(value ?? 0).padStart(2, '0')}
                          </div>
                          <div style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '6px', opacity: 0.6 }}>
                            {label}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: '20px' }}>
                      <Link to="/predictions" className="btn btn-primary">⚽ Predict before kickoff</Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Tournament over */}
          {tournamentOver && (
            <div className="card fade-in" style={{ textAlign: 'center', padding: '32px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏆</div>
              <div style={{ fontWeight: '800', fontSize: '20px', marginBottom: '8px' }}>Tournament Complete!</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Thanks for playing WC26 Predictor</div>
            </div>
          )}

          {/* Upcoming matches list — only show when no live games */}
          {liveMatches.length === 0 && upcomingMatches.length > 0 && nextMatch && !countdown.started && (
            <div className="card fade-in">
              <div className="section-header">
                <span className="section-title">📅 Coming Up</span>
                <Link to="/predictions" className="section-link">Predict →</Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {upcomingMatches.slice(0, 4).map(match => (
                  <div key={match.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 12px', background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '20px' }}>{match.home_team?.flag_emoji}</span>
                      <span style={{ fontSize: '13px', fontWeight: '700' }}>{match.home_team?.short_code}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>vs</span>
                      <span style={{ fontSize: '13px', fontWeight: '700' }}>{match.away_team?.short_code}</span>
                      <span style={{ fontSize: '20px' }}>{match.away_team?.flag_emoji}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>
                      {formatKickoff(match.kickoff_time)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Predictors */}
          <div className="card fade-in">
            <div className="section-header">
              <span className="section-title">🏆 Top Predictors</span>
              <Link to="/leaderboard" className="section-link">Full table →</Link>
            </div>
            {topPredictors.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🏅</div>
                <div className="empty-state-title">No predictions yet</div>
                <div className="empty-state-desc">Be the first to predict!</div>
              </div>
            ) : (
              <div>
                {topPredictors.map((p, i) => (
                  <div key={p.id} className="leaderboard-row" style={{
                    background: user?.id === p.id ? 'var(--accent-blue-light)' : 'transparent',
                  }}>
                    <div className={`rank-number rank-${i + 1}`}>#{i + 1}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: 'var(--bg-tertiary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '14px', fontWeight: '700',
                      }}>
                        {p.username?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px' }}>{p.username}</div>
                        {p.streak_current > 2 && (
                          <div style={{ fontSize: '11px', color: 'var(--accent-orange)' }}>🔥 {p.streak_current} streak</div>
                        )}
                      </div>
                    </div>
                    <div style={{ fontWeight: '800', fontSize: '16px', fontFamily: 'var(--font-mono)', color: 'var(--accent-green)' }}>
                      {p.total_points}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* How it works (guest only) */}
          {!user && (
            <div className="card fade-in">
              <div className="section-title" style={{ marginBottom: '16px' }}>How it works</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { icon: '⚽', title: 'Predict every match', desc: 'Pick scores for all 72 group games' },
                  { icon: '🏅', title: 'Earn points', desc: 'Correct result = 3pts. Exact score = 5pts. Jokers double your points.' },
                  { icon: '👥', title: 'Compete in leagues', desc: 'Create or join private leagues. Beat your friends.' },
                  { icon: '📊', title: 'Live tracking', desc: 'Scores update in real time as matches are played' },
                ].map(({ icon, title, desc }) => (
                  <div key={title} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-tertiary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '20px', flexShrink: 0,
                    }}>
                      {icon}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '2px' }}>{title}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/register" className="btn btn-primary btn-full" style={{ marginTop: '20px' }}>
                Join free — takes 30 seconds
              </Link>
            </div>
          )}

          {/* How to play link */}
          <div style={{ textAlign: 'center', paddingBottom: '24px' }}>
            <Link to="/how-to-play" style={{ fontSize: '14px', color: 'var(--accent-blue)', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              ❓ How does scoring work?
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}
