import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadTournamentPulse } from '../lib/tournamentPulse.js'

function upsetText(upset) {
  if (!upset?.match) return null
  const m = upset.match
  const winner = upset.actualResult === 'home' ? m.home_team?.short_code : upset.actualResult === 'away' ? m.away_team?.short_code : 'the draw'
  return `Only ${upset.actualPct}% backed ${winner}`
}

export default function TournamentPulsePreview({ compact = false }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    let active = true
    loadTournamentPulse().then(result => { if (active) setData(result) }).catch(error => console.warn('Tournament Pulse preview failed:', error))
    return () => { active = false }
  }, [])

  const insight = useMemo(() => {
    if (!data) return null
    if (data.upsets?.length) {
      const upset = data.upsets[0]
      return {
        icon: '🚨',
        title: compact ? upsetText(upset) : 'Biggest tournament shock',
        body: compact
          ? `${upset.match.home_team?.short_code} ${upset.match.home_score}–${upset.match.away_score} ${upset.match.away_team?.short_code}`
          : `${upset.match.home_team?.flag_emoji || ''} ${upset.match.home_team?.short_code} ${upset.match.home_score}–${upset.match.away_score} ${upset.match.away_team?.short_code} ${upset.match.away_team?.flag_emoji || ''} · ${upsetText(upset)}`,
      }
    }
    const top = data.topScores?.[0]
    return top ? { icon: '📊', title: `${top.score} is the most popular score`, body: `${top.count.toLocaleString()} predictions · ${top.pct}% of all picks` } : null
  }, [data, compact])

  if (!insight) return null

  if (compact) {
    return (
      <Link to="/stats" style={{ textDecoration: 'none' }}>
        <div className="card fade-in" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '11px', borderLeft: '4px solid var(--accent-gold)' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', fontSize: '17px', flexShrink: 0 }}>{insight.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '9.5px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Community view</div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>{insight.title}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{insight.body}</div>
          </div>
          <span style={{ color: 'var(--scottish-navy)', fontSize: '18px', fontWeight: 900 }}>›</span>
        </div>
      </Link>
    )
  }

  return (
    <div className="card fade-in" style={{ overflow: 'hidden', padding: 0 }}>
      <div style={{ background: 'linear-gradient(145deg, var(--scottish-navy), #173d73)', color: '#fff', padding: '16px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: '-20px', top: '-35px', fontSize: '110px', fontWeight: 900, opacity: 0.06 }}>26</div>
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: '9.5px', fontWeight: 800, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.09em' }}>Tournament Pulse</div>
          <div style={{ fontSize: '18px', fontWeight: 900, marginTop: '4px' }}>{insight.icon} {insight.title}</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.72)', marginTop: '5px' }}>{insight.body}</div>
          {data && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '7px', marginTop: '13px' }}>
              {[
                ['Predictors', data.activeUsers],
                ['Predictions', data.totalPredictions.toLocaleString()],
                ['Accuracy', `${data.communityAccuracy}%`],
              ].map(([label, value]) => (
                <div key={label} style={{ background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '9px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '15px' }}>{value}</div>
                  <div style={{ fontSize: '8.5px', color: 'rgba(255,255,255,0.55)', marginTop: '2px', textTransform: 'uppercase' }}>{label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Link to="/stats" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', color: 'var(--scottish-navy)', fontSize: '12px', fontWeight: 800, textDecoration: 'none' }}>
        <span>See community trends and predictor records</span><span>View Pulse →</span>
      </Link>
    </div>
  )
}
