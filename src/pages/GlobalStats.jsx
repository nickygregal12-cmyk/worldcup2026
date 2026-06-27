import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadTournamentPulse } from '../lib/tournamentPulse.js'
import WorldCupLogo from '../components/WorldCupLogo.jsx'

export default function GlobalStats() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    loadTournamentPulse()
      .then(data => { if (active) setStats(data) })
      .catch(err => {
        console.error(err)
        if (active) setError(err.message || 'Tournament Pulse could not load.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  if (error || !stats) {
    return (
      <div className="container" style={{ padding: '40px 16px', textAlign: 'center' }}>
        <div style={{ color: 'var(--accent-red)', marginBottom: '12px' }}>{error || 'Tournament Pulse could not load.'}</div>
        <Link to="/" style={{ color: 'var(--scottish-navy)', fontWeight: 800 }}>Return home →</Link>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh', paddingBottom: '90px' }}>
      <div style={{ background: 'linear-gradient(145deg, var(--scottish-navy), #163d73)', color: '#fff', padding: '24px 18px 26px', position: 'relative', overflow: 'hidden' }}>
        <WorldCupLogo variant="watermark" size={190} opacity={0.09} style={{ right: '-28px', top: '48%' }} />
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <Link to="/" style={{ color: 'rgba(255,255,255,0.72)', fontSize: '12px', textDecoration: 'none', fontWeight: 700 }}>← Back</Link>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.11em', color: 'rgba(255,255,255,0.62)', fontWeight: 800, marginTop: '15px' }}>Tournament Pulse</div>
          <h1 style={{ fontSize: '28px', lineHeight: 1.1, margin: '6px 0 5px', fontWeight: 900 }}>What the predictor community is thinking</h1>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.5, maxWidth: '600px', margin: 0 }}>
            Community trends, biggest shocks, popular scorelines and predictor records across WC26.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '16px' }}>
            <HeroStat value={stats.activeUsers} label="Active predictors" />
            <HeroStat value={stats.totalPredictions.toLocaleString()} label="Predictions made" />
            <HeroStat value={`${stats.communityAccuracy}%`} label="Community accuracy" />
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '16px' }}>
        <Section title="Community consensus" sub="Strongest shared opinions from matches that have locked.">
          {stats.consensus.length ? stats.consensus.slice(0, 5).map((row, index) => {
            const m = row.match
            const label = row.outcome.key === 'draw'
              ? 'Draw'
              : `${row.outcome.team?.flag_emoji || ''} ${row.outcome.team?.short_code || row.outcome.team?.name || 'Team'}`
            return (
              <div key={m.id} style={{ padding: '11px 0', borderTop: index ? '1px solid var(--border-light)' : 'none' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '8px', alignItems: 'center', fontSize: '12px', fontWeight: 800 }}>
                  <span>{m.home_team?.flag_emoji} {m.home_team?.short_code}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '17px', color: 'var(--accent-gold-dark, #a9871f)' }}>{row.pct}%</span>
                  <span style={{ textAlign: 'right' }}>{m.away_team?.short_code} {m.away_team?.flag_emoji}</span>
                </div>
                <div style={{ height: '8px', background: 'var(--bg-tertiary)', borderRadius: '999px', overflow: 'hidden', marginTop: '7px' }}>
                  <div style={{ width: `${row.pct}%`, height: '100%', background: 'var(--scottish-navy)' }} />
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '5px' }}>{label} was the community pick · {row.total} predictions</div>
              </div>
            )
          }) : <Empty text="Consensus appears once matches lock." />}
        </Section>

        <Section title="Biggest shocks" sub="Completed results that the fewest predictors expected.">
          {stats.upsets.length ? stats.upsets.slice(0, 5).map((row, index) => {
            const m = row.match
            return (
              <div key={m.id} style={{ display: 'flex', gap: '11px', padding: '11px 0', borderTop: index ? '1px solid var(--border-light)' : 'none' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(198,40,40,0.1)', flexShrink: 0 }}>{index === 0 ? '🚨' : '😲'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 800 }}>{m.home_team?.flag_emoji} {m.home_team?.short_code} {m.home_score}–{m.away_score} {m.away_team?.short_code} {m.away_team?.flag_emoji}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>Only {row.actualPct}% predicted the result · {row.exactCount} exact {row.exactCount === 1 ? 'score' : 'scores'}</div>
                </div>
              </div>
            )
          }) : <Empty text="Upsets appear after completed matches." />}
        </Section>

        <Section title="Most popular scorelines" sub="Across all saved group-stage predictions.">
          {stats.topScores.map((row, index) => (
            <div key={row.score} style={{ display: 'grid', gridTemplateColumns: '24px 1fr auto', gap: '10px', alignItems: 'center', padding: '9px 0', borderTop: index ? '1px solid var(--border-light)' : 'none' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 900 }}>{index + 1}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', fontWeight: 900 }}>{row.score}</span>
              <div style={{ textAlign: 'right' }}><b style={{ fontSize: '12px' }}>{row.count.toLocaleString()} picks</b><div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{row.pct}%</div></div>
            </div>
          ))}
        </Section>

        <Section title="Golden Boot race" sub="Actual scorers compared with the community’s pre-tournament picks.">
          {stats.scorers.length ? stats.scorers.slice(0, 5).map((scorer, index) => {
            const playerName = scorer.player_name || scorer.name || 'Player'
            const pick = stats.topBootPicks.find(p => p.name.toLowerCase() === playerName.toLowerCase())
            return (
              <div key={`${playerName}-${index}`} style={{ display: 'grid', gridTemplateColumns: '24px 1fr 48px 78px', gap: '8px', alignItems: 'center', padding: '9px 0', borderTop: index ? '1px solid var(--border-light)' : 'none' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 900 }}>{index + 1}</span>
                <div><b style={{ fontSize: '12px' }}>{playerName}</b><div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{scorer.team_name || ''}</div></div>
                <span style={{ textAlign: 'right', fontWeight: 900 }}>{scorer.goals || 0}⚽</span>
                <span style={{ textAlign: 'right', fontSize: '10px', color: 'var(--text-muted)' }}>{pick ? `${pick.count} picks` : 'No top picks'}</span>
              </div>
            )
          }) : <Empty text="Top scorers have not been added yet." />}
        </Section>

        <Section title="Predictor records" sub="Current community leaders.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <Record value={stats.records.exact?.value ?? 0} label="Most exact scores" name={stats.records.exact?.name} />
            <Record value={stats.records.streak?.value ?? 0} label="Best streak" name={stats.records.streak?.name} />
            <Record value={stats.records.topScore?.value ?? 0} label="Highest score" name={stats.records.topScore?.name} />
          </div>
        </Section>

        <Section title="Community overview">
          <StatRow label="Total registered predictors" value={stats.totalUsers.toLocaleString()} />
          <StatRow label="Active predictors" value={stats.activeUsers.toLocaleString()} />
          <StatRow label="Private leagues" value={stats.privateLeagueCount.toLocaleString()} />
          <StatRow label="Jokers used" value={stats.jokerCount.toLocaleString()} />
          <StatRow label="Average total score" value={`${stats.avgPoints} pts`} />
          <StatRow label="Total exact scores" value={stats.totalExact.toLocaleString()} />
        </Section>

        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', padding: '3px 12px 12px', lineHeight: 1.45 }}>
          Statistics are loaded in paginated batches so totals are not limited to the first 1,000 prediction rows.
        </div>
      </div>
    </div>
  )
}

function HeroStat({ value, label }) {
  return <div style={{ background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: '12px', padding: '11px', textAlign: 'center' }}><div style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '20px' }}>{value}</div><div style={{ fontSize: '8.5px', color: 'rgba(255,255,255,0.58)', marginTop: '3px', textTransform: 'uppercase' }}>{label}</div></div>
}

function Section({ title, sub, children }) {
  return <div className="card fade-in" style={{ marginBottom: '12px', padding: '15px' }}><div style={{ marginBottom: '10px' }}><div style={{ fontSize: '14px', fontWeight: 900 }}>{title}</div>{sub && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>{sub}</div>}</div>{children}</div>
}

function StatRow({ label, value }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--border-light)', fontSize: '12px' }}><span style={{ color: 'var(--text-secondary)' }}>{label}</span><b style={{ fontFamily: 'var(--font-mono)' }}>{value}</b></div>
}

function Record({ value, label, name }) {
  return <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '11px', textAlign: 'center' }}><div style={{ fontFamily: 'var(--font-mono)', fontSize: '21px', fontWeight: 900, color: 'var(--scottish-navy)' }}>{value}</div><div style={{ fontSize: '8.5px', color: 'var(--text-muted)', marginTop: '3px', textTransform: 'uppercase' }}>{label}</div><div style={{ fontSize: '9px', fontWeight: 800, color: 'var(--accent-gold-dark, #a9871f)', marginTop: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name || '—'}</div></div>
}

function Empty({ text }) {
  return <div style={{ color: 'var(--text-muted)', fontSize: '11px', padding: '8px 0' }}>{text}</div>
}
