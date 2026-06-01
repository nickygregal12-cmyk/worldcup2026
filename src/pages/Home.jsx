import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/index.js'

const TOURNAMENT_START = new Date('2026-06-11T23:00:00Z') // Mexico vs South Africa kickoff UTC

function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState({})
  useEffect(() => {
    const calc = () => {
      const diff = targetDate - new Date()
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
  const [matches, setMatches] = useState([])
  const [topPredictors, setTopPredictors] = useState([])
  const [loading, setLoading] = useState(true)
  const countdown = useCountdown(TOURNAMENT_START)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const { data: matchData } = await supabase
      .from('matches')
      .select('*, home_team:home_team_id(name,flag_emoji,short_code), away_team:away_team_id(name,flag_emoji,short_code), venue:venue_id(city,country)')
      .eq('stage', 'group')
      .order('kickoff_time', { ascending: true })
      .limit(6)

    const { data: predictorData } = await supabase
      .from('profiles')
      .select('id, username, total_points, streak_current')
      .order('total_points', { ascending: false })
      .limit(5)

    setMatches(matchData || [])
    setTopPredictors(predictorData || [])
    setLoading(false)
  }

  const formatKickoff = (time) => {
    const d = new Date(time)
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) +
      ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>
      {/* Hero Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a2a1a 50%, #0a1a0a 100%)',
        padding: '40px 20px',
        textAlign: 'center',
        color: 'white',
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
                <Link to="/login" className="btn" style={{
                  background: 'rgba(255,255,255,0.1)', color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  padding: '14px 28px', borderRadius: 'var(--radius-lg)',
                  fontSize: '16px', fontWeight: '600',
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
              { label: 'Host Countries', value: '3' },
              { label: 'Start Date', value: '11 Jun' },
              { label: 'Final', value: '19 Jul' },
            ].map(({ label, value }) => (
              <div key={label} style={{ textAlign: 'center', minWidth: '60px' }}>
                <div style={{ fontWeight: '800', fontSize: '18px', fontFamily: 'var(--font-mono)' }}>{value}</div>
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
                  { label: 'Perfect Rounds', value: profile.perfect_rounds || 0, icon: '🎯' },
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

          {/* Countdown OR Upcoming Matches */}
          <div className="card fade-in">
            {!countdown.started ? (
              <>
                <div className="section-header">
                  <span className="section-title">⏱️ Tournament Countdown</span>
                </div>
                <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                    Mexico 🇲🇽 vs South Africa 🇿🇦 · Estadio Azteca · 11 Jun
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                    {[
                      { value: countdown.days, label: 'Days' },
                      { value: countdown.hours, label: 'Hours' },
                      { value: countdown.minutes, label: 'Mins' },
                      { value: countdown.seconds, label: 'Secs' },
                    ].map(({ value, label }) => (
                      <div key={label} style={{
                        background: 'var(--primary)',
                        color: 'var(--text-inverse)',
                        borderRadius: 'var(--radius-md)',
                        padding: '16px 12px',
                        minWidth: '64px',
                        textAlign: 'center',
                      }}>
                        <div style={{ fontSize: '32px', fontWeight: '900', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
                          {String(value ?? 0).padStart(2, '0')}
                        </div>
                        <div style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '6px', opacity: 0.6 }}>
                          {label}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: '20px' }}>
                    <Link to="/predictions" className="btn btn-primary">
                      ⚽ Submit predictions before kickoff
                    </Link>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="section-header">
                  <span className="section-title">📅 Upcoming Matches</span>
                  <Link to="/predictions" className="section-link">Predict →</Link>
                </div>
                {loading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
                    <div className="spinner" />
                  </div>
                ) : matches.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">⚽</div>
                    <div className="empty-state-title">No upcoming matches</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {matches.filter(m => new Date(m.kickoff_time) > new Date()).slice(0, 5).map(match => (
                      <div key={match.id} style={{
                        background: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px',
                        border: '1px solid var(--border-light)',
                      }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {formatKickoff(match.kickoff_time)} · {match.venue?.city}
                        </div>
                        <div className="match-teams">
                          <div className="match-team">
                            <span style={{ fontSize: '28px' }}>{match.home_team?.flag_emoji}</span>
                            <span className="match-team-name">{match.home_team?.short_code}</span>
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>VS</div>
                          <div className="match-team">
                            <span style={{ fontSize: '28px' }}>{match.away_team?.flag_emoji}</span>
                            <span className="match-team-name">{match.away_team?.short_code}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

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
                  { icon: '⚽', title: 'Predict every match', desc: 'Pick scores for all 72 group games + knockout rounds' },
                  { icon: '🏅', title: 'Earn points', desc: 'Correct result = 3pts. Exact score = 5pts. Confidence bonus available!' },
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

        </div>
      </div>
    </div>
  )
}
