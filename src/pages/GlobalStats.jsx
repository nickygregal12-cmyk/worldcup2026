import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function GlobalStats() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)

  useEffect(() => { loadStats() }, [])

  const loadStats = async () => {
    setLoading(true)
    try {
      const [
        profilesRes,
        predictionsRes,
        matchesRes,
        awardPredsRes,
        topScorersRes,
        leaguesRes,
      ] = await Promise.all([
        supabase.from('profiles').select('total_points, exact_scores, streak_best, prediction_accuracy').order('total_points', { ascending: false }),
        supabase.from('predictions').select('match_id, home_score, away_score, is_confident').not('home_score', 'is', null),
        supabase.from('matches').select('id, home_score, away_score, status, home_team:home_team_id(name, flag_emoji, short_code), away_team:away_team_id(name, flag_emoji, short_code), group:group_id(name)').eq('stage', 'group'),
        supabase.from('award_predictions').select('award_type, predicted_player_name').eq('award_type', 'golden_boot'),
        supabase.from('tournament_scorers').select('*').order('goals', { ascending: false }).limit(5),
        supabase.from('leagues').select('id').neq('is_global', true),
      ])

      const profiles = profilesRes.data || []
      const predictions = predictionsRes.data || []
      const matches = matchesRes.data || []
      const awardPreds = awardPredsRes.data || []
      const topScorers = topScorersRes.data || []
      const leagueCount = leaguesRes.data?.length || 0

      // User stats
      const totalUsers = profiles.length
      const usersWithPreds = profiles.filter(p => p.total_points > 0 || p.exact_scores > 0).length
      const totalPoints = profiles.reduce((s, p) => s + (p.total_points || 0), 0)
      const avgPoints = totalUsers > 0 ? Math.round(totalPoints / totalUsers) : 0
      const topScore = profiles[0]?.total_points || 0
      const totalExact = profiles.reduce((s, p) => s + (p.exact_scores || 0), 0)
      const bestStreak = Math.max(...profiles.map(p => p.streak_best || 0))

      // Prediction stats
      const totalPredictions = predictions.length
      const jokerCount = predictions.filter(p => p.is_confident).length

      // Most predicted scores overall
      const scoreCounts = {}
      predictions.forEach(p => {
        const key = `${p.home_score}-${p.away_score}`
        scoreCounts[key] = (scoreCounts[key] || 0) + 1
      })
      const topScores = Object.entries(scoreCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([score, count]) => ({ score, count, pct: Math.round((count / totalPredictions) * 100) }))

      // Match community picks — for completed matches
      const completedMatches = matches.filter(m => m.status === 'completed')
      const matchPredMap = {}
      predictions.forEach(p => {
        if (!matchPredMap[p.match_id]) matchPredMap[p.match_id] = { home: 0, draw: 0, away: 0, total: 0 }
        matchPredMap[p.match_id].total++
        if (p.home_score > p.away_score) matchPredMap[p.match_id].home++
        else if (p.home_score === p.away_score) matchPredMap[p.match_id].draw++
        else matchPredMap[p.match_id].away++
      })

      // Biggest upsets — match where actual result was least predicted
      const upsets = completedMatches
        .filter(m => m.home_score !== null && matchPredMap[m.id]?.total >= 5)
        .map(m => {
          const cp = matchPredMap[m.id]
          const actualResult = m.home_score > m.away_score ? 'home' : m.home_score === m.away_score ? 'draw' : 'away'
          const actualPct = Math.round((cp[actualResult] / cp.total) * 100)
          return { match: m, actualResult, actualPct, cp }
        })
        .sort((a, b) => a.actualPct - b.actualPct)
        .slice(0, 3)

      // Most popular Golden Boot picks
      const bootCounts = {}
      awardPreds.forEach(p => {
        if (p.predicted_player_name) {
          bootCounts[p.predicted_player_name] = (bootCounts[p.predicted_player_name] || 0) + 1
        }
      })
      const topBootPicks = Object.entries(bootCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count, pct: Math.round((count / awardPreds.length) * 100) }))

      setStats({
        totalUsers, usersWithPreds, avgPoints, topScore, totalExact,
        bestStreak, totalPredictions, jokerCount, leagueCount,
        topScores, upsets, topBootPicks, topScorers,
        totalAwardPreds: awardPreds.length,
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  if (!stats) return null

  const Section = ({ title, children }) => (
    <div className="card" style={{ marginBottom: '12px' }}>
      <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid var(--border-light)' }}>{title}</div>
      {children}
    </div>
  )

  const StatRow = ({ label, value, sub }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{label}</span>
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontWeight: '800', fontSize: '14px', fontFamily: 'var(--font-mono)' }}>{value}</span>
        {sub && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{sub}</div>}
      </div>
    </div>
  )

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, rgba(0,20,60,0.9) 0%, rgba(0,50,120,0.88) 100%)', padding: '28px 20px 32px', color: 'white' }}>
        <Link to="/" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '16px' }}>← Back</Link>
        <div style={{ fontSize: '28px', fontWeight: '900', marginBottom: '4px' }}>🌍 Tournament Stats</div>
        <div style={{ fontSize: '14px', opacity: 0.7 }}>How everyone's predicting WC26</div>
      </div>

      <div className="container" style={{ padding: '16px' }}>

        {/* Community overview */}
        <Section title="👥 Community Overview">
          <StatRow label="Total predictors" value={stats.totalUsers.toLocaleString()} />
          <StatRow label="Active predictors" value={stats.usersWithPreds.toLocaleString()} sub="with predictions" />
          <StatRow label="Private leagues" value={stats.leagueCount} />
          <StatRow label="Total predictions made" value={stats.totalPredictions.toLocaleString()} />
          <StatRow label="Jokers used" value={stats.jokerCount.toLocaleString()} sub={`${Math.round((stats.jokerCount / stats.totalPredictions) * 100)}% of predictions`} />
        </Section>

        {/* Points stats */}
        <Section title="🏅 Points & Performance">
          <StatRow label="Highest score" value={`${stats.topScore} pts`} />
          <StatRow label="Average score" value={`${stats.avgPoints} pts`} />
          <StatRow label="Total exact scores" value={stats.totalExact.toLocaleString()} sub="across all predictors" />
          <StatRow label="Best streak" value={`${stats.bestStreak} correct`} sub="in a row" />
        </Section>

        {/* Most popular scores */}
        {stats.topScores.length > 0 && (
          <Section title="⚽ Most Predicted Scores">
            {stats.topScores.map(({ score, count, pct }, i) => (
              <div key={score} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: i < stats.topScores.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                <span style={{ fontWeight: '800', fontSize: '13px', width: '20px', color: 'var(--text-muted)' }}>{i + 1}</span>
                <span style={{ fontWeight: '900', fontSize: '16px', fontFamily: 'var(--font-mono)', flex: 1 }}>{score}</span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '700', fontSize: '13px' }}>{count.toLocaleString()} picks</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{pct}% of predictions</div>
                </div>
              </div>
            ))}
          </Section>
        )}

        {/* Biggest upsets */}
        {stats.upsets.length > 0 && (
          <Section title="😱 Biggest Upsets">
            {stats.upsets.map(({ match, actualResult, actualPct, cp }, i) => {
              const winner = actualResult === 'home' ? match.home_team : actualResult === 'away' ? match.away_team : null
              return (
                <div key={match.id} style={{ padding: '10px 0', borderBottom: i < stats.upsets.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '18px' }}>{match.home_team?.flag_emoji}</span>
                    <span style={{ fontWeight: '700', fontSize: '13px' }}>{match.home_team?.short_code}</span>
                    <span style={{ fontWeight: '900', fontFamily: 'var(--font-mono)', fontSize: '14px', padding: '0 4px' }}>{match.home_score}–{match.away_score}</span>
                    <span style={{ fontWeight: '700', fontSize: '13px' }}>{match.away_team?.short_code}</span>
                    <span style={{ fontSize: '18px' }}>{match.away_team?.flag_emoji}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '3px', height: '5px', borderRadius: '3px', overflow: 'hidden', marginBottom: '5px' }}>
                    <div style={{ width: `${Math.round((cp.home/cp.total)*100)}%`, background: 'var(--scottish-navy)' }} />
                    <div style={{ width: `${Math.round((cp.draw/cp.total)*100)}%`, background: 'var(--text-muted)', opacity: 0.4 }} />
                    <div style={{ width: `${Math.round((cp.away/cp.total)*100)}%`, background: '#c62828' }} />
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Only <strong style={{ color: 'var(--accent-red)' }}>{actualPct}%</strong> predicted {actualResult === 'draw' ? 'a draw' : `${winner?.short_code} to win`} · {cp.total} predictions
                  </div>
                </div>
              )
            })}
          </Section>
        )}

        {/* Golden Boot picks */}
        {stats.topBootPicks.length > 0 && (
          <Section title="👟 Most Picked Golden Boot">
            {stats.topBootPicks.map(({ name, count, pct }, i) => {
              const liveScorer = stats.topScorers.find(s => s.player_name === name)
              return (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: i < stats.topBootPicks.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                  <span style={{ fontWeight: '800', fontSize: '13px', width: '20px', color: 'var(--text-muted)' }}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700', fontSize: '13px' }}>{name}</div>
                    {liveScorer && <div style={{ fontSize: '11px', color: '#e65100', fontWeight: '600' }}>⚽ {liveScorer.goals} goals so far</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '700', fontSize: '13px' }}>{count} picks</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{pct}%</div>
                  </div>
                </div>
              )
            })}
          </Section>
        )}

        {/* Live top scorers */}
        {stats.topScorers.length > 0 && (
          <Section title="🥇 Live Top Scorers">
            {stats.topScorers.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: i < stats.topScorers.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                <span style={{ fontWeight: '800', fontSize: '13px', width: '20px', color: 'var(--text-muted)' }}>{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '13px' }}>{s.player_name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.team_name}</div>
                </div>
                <span style={{ fontWeight: '900', fontSize: '18px', fontFamily: 'var(--font-mono)', color: '#e65100' }}>{s.goals}⚽</span>
              </div>
            ))}
          </Section>
        )}

        <div style={{ height: '16px' }} />
      </div>
    </div>
  )
}
