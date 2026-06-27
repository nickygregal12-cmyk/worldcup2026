import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadTournamentPulse } from '../lib/tournamentPulse.js'
import WorldCupLogo from '../components/WorldCupLogo.jsx'

const normalisePlayerName = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '')

export default function GlobalStats() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    loadTournamentPulse({ force: true })
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
          <h1 style={{ fontSize: '28px', lineHeight: 1.1, margin: '6px 0 5px', fontWeight: 900 }}>The story of the predictor so far</h1>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.5, maxWidth: '600px', margin: 0 }}>
            Community trends, predictor records and the calls nobody saw coming.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '16px' }}>
            <HeroStat value={stats.activeUsers} label="Predictors" />
            <HeroStat value={stats.completedMatches} label="Matches played" />
            <HeroStat value={`${stats.communityAccuracy}%`} label="Accuracy" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '8px' }}>
            <HeroStat value={stats.totalPredictions.toLocaleString()} label="Predictions" />
            <HeroStat value={stats.tournamentGoals} label="Goals" />
            <HeroStat value={stats.totalExact.toLocaleString()} label="Exact scores" />
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '16px' }}>
        <Section title="Predictor records" sub="The current leaders across every part of the game.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
            <Record icon="✅" value={stats.records.correct?.value ?? 0} label="Most correct results" name={stats.records.correct?.name} />
            <Record icon="🎯" value={stats.records.exact?.value ?? 0} label="Most exact scores" name={stats.records.exact?.name} />
            <Record icon="⚽" value={stats.records.matchPoints?.value ?? 0} label="Match points" name={stats.records.matchPoints?.name} />
            <Record icon="🃏" value={stats.records.successfulJokers?.value ?? 0} label="Jokers paid off" name={stats.records.successfulJokers?.name} />
            <Record icon="🔥" value={stats.records.streak?.value ?? 0} label="Best streak" name={stats.records.streak?.name} />
            <Record icon="🏅" value={stats.records.topScore?.value ?? 0} label="Highest total" name={stats.records.topScore?.name} />
          </div>
        </Section>

        {stats.bracketRaceVisible ? (
          <Section title="Bracket race" sub="Who has correctly carried the most teams into each completed knockout round.">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
              <Record icon="32" value={stats.records.r16Teams?.value ?? 0} label="R16 teams right" name={stats.records.r16Teams?.name} />
              {stats.records.qfTeams?.value > 0 && <Record icon="16" value={stats.records.qfTeams.value} label="QF teams right" name={stats.records.qfTeams.name} />}
              {stats.records.sfTeams?.value > 0 && <Record icon="8" value={stats.records.sfTeams.value} label="SF teams right" name={stats.records.sfTeams.name} />}
              {stats.records.finalTeams?.value > 0 && <Record icon="4" value={stats.records.finalTeams.value} label="Finalists right" name={stats.records.finalTeams.name} />}
            </div>
            <div style={{ marginTop: '8px' }}>
              <Record icon="🏆" value={stats.records.bracketPoints?.value ?? 0} label="Most bracket points so far" name={stats.records.bracketPoints?.name} wide />
            </div>
            <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', lineHeight: 1.45, marginTop: '9px' }}>
              New round records appear only after that knockout round has produced real results.
            </div>
          </Section>
        ) : (
          <Section title="Pre-knockout trends" sub="The community's tournament favourites while the bracket race is still waiting for results.">
            {stats.championPicks?.length ? (
              <>
                <div style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '7px' }}>Most-backed champions</div>
                {stats.championPicks.map((row, index) => (
                  <div key={row.teamId} style={{ display: 'grid', gridTemplateColumns: '24px 1fr auto', gap: '10px', alignItems: 'center', padding: '9px 0', borderTop: index ? '1px solid var(--border-light)' : 'none' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 900 }}>{index + 1}</span>
                    <div style={{ fontSize: '12px', fontWeight: 850 }}>{row.team?.flag_emoji || '🏳️'} {row.team?.name || row.team?.short_code || 'Team'}</div>
                    <div style={{ textAlign: 'right' }}><b style={{ fontSize: '12px' }}>{row.count} picks</b><div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{row.pct}%</div></div>
                  </div>
                ))}
              </>
            ) : <Empty text="Champion trends appear once tournament brackets are submitted." />}

            {(stats.easiestGroup || stats.toughestGroup) && (
              <div style={{ borderTop: '1px solid var(--border-light)', marginTop: '8px', paddingTop: '10px', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
                {stats.easiestGroup && <MiniInsight icon="✅" label="Most predictable group" value={`Group ${stats.easiestGroup.group}`} detail={`${stats.easiestGroup.accuracy}% correct`} />}
                {stats.toughestGroup && <MiniInsight icon="🤯" label="Toughest group" value={`Group ${stats.toughestGroup.group}`} detail={`${stats.toughestGroup.accuracy}% correct`} />}
              </div>
            )}
          </Section>
        )}

        <Section title="Golden Boot race" sub="Actual scorers compared with every saved pre-tournament pick.">
          {stats.scorers.length ? stats.scorers.slice(0, 8).map((scorer, index) => {
            const playerName = scorer.player_name || scorer.name || 'Player'
            const pick = stats.bootPickCounts?.[normalisePlayerName(playerName)]
            return (
              <div key={`${playerName}-${index}`} style={{ display: 'grid', gridTemplateColumns: '24px 1fr 48px 82px', gap: '8px', alignItems: 'center', padding: '10px 0', borderTop: index ? '1px solid var(--border-light)' : 'none' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 900 }}>{index + 1}</span>
                <div><b style={{ fontSize: '12px' }}>{playerName}</b><div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{scorer.team_name || ''}</div></div>
                <span style={{ textAlign: 'right', fontWeight: 900 }}>{scorer.goals || 0}⚽</span>
                <span style={{ textAlign: 'right', fontSize: '10px', fontWeight: pick ? 800 : 500, color: pick ? 'var(--accent-gold-dark, #a9871f)' : 'var(--text-muted)' }}>
                  {pick ? `${pick.count} ${pick.count === 1 ? 'pick' : 'picks'}` : '0 picks'}
                </span>
              </div>
            )
          }) : <Empty text="Top scorers have not been added yet." />}
          {stats.topBootPicks?.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border-light)', marginTop: '6px', paddingTop: '10px' }}>
              <div style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '7px' }}>Most selected before kickoff</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {stats.topBootPicks.slice(0, 5).map(p => <span key={p.key} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: '999px', padding: '6px 9px', fontSize: '10px', fontWeight: 800 }}>{p.name} · {p.count}</span>)}
              </div>
            </div>
          )}
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

        <Section title="Most predictable matches" sub="The results the community called most confidently.">
          {stats.predictable?.length ? stats.predictable.map((row, index) => {
            const m = row.match
            return <TrendRow key={m.id} index={index} title={`${m.home_team?.flag_emoji} ${m.home_team?.short_code} ${m.home_score}–${m.away_score} ${m.away_team?.short_code} ${m.away_team?.flag_emoji}`} detail={`${row.actualPct}% called the result correctly · ${row.total} predictions`} />
          }) : <Empty text="Predictability records appear after completed matches." />}
        </Section>

        <Section title="Joker traps" sub="Matches where the most doubled predictions failed to pay off.">
          {stats.jokerTraps?.length ? stats.jokerTraps.map((row, index) => {
            const m = row.match
            const failed = Math.max(0, (row.jokers || 0) - (row.paidJokers || 0))
            return <TrendRow key={m.id} index={index} title={`${m.home_team?.flag_emoji} ${m.home_team?.short_code} ${m.home_score}–${m.away_score} ${m.away_team?.short_code} ${m.away_team?.flag_emoji}`} detail={`${failed} of ${row.jokers} Jokers failed`} />
          }) : <Empty text="Joker records appear once Joker matches are completed." />}
        </Section>

        <Section title="Community consensus" sub="Strongest shared opinions from matches that have locked.">
          {stats.consensus.length ? stats.consensus.slice(0, 5).map((row, index) => {
            const m = row.match
            const label = row.outcome.key === 'draw' ? 'Draw' : `${row.outcome.team?.flag_emoji || ''} ${row.outcome.team?.short_code || row.outcome.team?.name || 'Team'}`
            return (
              <div key={m.id} style={{ padding: '11px 0', borderTop: index ? '1px solid var(--border-light)' : 'none' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '8px', alignItems: 'center', fontSize: '12px', fontWeight: 800 }}>
                  <span>{m.home_team?.flag_emoji} {m.home_team?.short_code}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '17px', color: 'var(--accent-gold-dark, #a9871f)' }}>{row.pct}%</span>
                  <span style={{ textAlign: 'right' }}>{m.away_team?.short_code} {m.away_team?.flag_emoji}</span>
                </div>
                <div style={{ height: '8px', background: 'var(--bg-tertiary)', borderRadius: '999px', overflow: 'hidden', marginTop: '7px' }}><div style={{ width: `${row.pct}%`, height: '100%', background: 'var(--scottish-navy)' }} /></div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '5px' }}>{label} was the community pick · {row.total} predictions</div>
              </div>
            )
          }) : <Empty text="Consensus appears once matches lock." />}
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

        <Section title="Community overview">
          <StatRow label="Total registered predictors" value={stats.totalUsers.toLocaleString()} />
          <StatRow label="Active predictors" value={stats.activeUsers.toLocaleString()} />
          <StatRow label="Private leagues" value={stats.privateLeagueCount.toLocaleString()} />
          <StatRow label="Jokers used" value={stats.jokerCount.toLocaleString()} />
          <StatRow label="Average total score" value={`${stats.avgPoints} pts`} />
          <StatRow label="Total exact scores" value={stats.totalExact.toLocaleString()} />
        </Section>

        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', padding: '3px 12px 12px', lineHeight: 1.45 }}>
          Statistics are calculated from all visible saved predictions and refresh every five minutes.
        </div>
      </div>
    </div>
  )
}

function HeroStat({ value, label }) {
  return <div style={{ background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: '12px', padding: '11px 6px', textAlign: 'center' }}><div style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '20px' }}>{value}</div><div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.58)', marginTop: '3px', textTransform: 'uppercase' }}>{label}</div></div>
}

function Section({ title, sub, children }) {
  return <div className="card fade-in" style={{ marginBottom: '12px', padding: '15px' }}><div style={{ marginBottom: '10px' }}><div style={{ fontSize: '14px', fontWeight: 900 }}>{title}</div>{sub && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>{sub}</div>}</div>{children}</div>
}

function StatRow({ label, value }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--border-light)', fontSize: '12px' }}><span style={{ color: 'var(--text-secondary)' }}>{label}</span><b style={{ fontFamily: 'var(--font-mono)' }}>{value}</b></div>
}

function Record({ icon, value, label, name, wide = false }) {
  return <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '11px', textAlign: 'center', display: wide ? 'grid' : 'block', gridTemplateColumns: wide ? '44px 1fr auto' : undefined, gap: wide ? '10px' : undefined, alignItems: wide ? 'center' : undefined }}>
    <div style={{ fontSize: wide ? '22px' : '17px', fontWeight: 900 }}>{icon}</div>
    <div style={{ textAlign: wide ? 'left' : 'center' }}><div style={{ fontSize: '8.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</div><div style={{ fontSize: '9px', fontWeight: 800, color: 'var(--accent-gold-dark, #a9871f)', marginTop: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name || '—'}</div></div>
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '21px', fontWeight: 900, color: 'var(--scottish-navy)' }}>{value}</div>
  </div>
}

function TrendRow({ index, title, detail }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '25px 1fr', gap: '9px', padding: '10px 0', borderTop: index ? '1px solid var(--border-light)' : 'none' }}><div style={{ color: 'var(--text-muted)', fontWeight: 900 }}>{index + 1}</div><div><div style={{ fontSize: '12px', fontWeight: 800 }}>{title}</div><div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>{detail}</div></div></div>
}

function MiniInsight({ icon, label, value, detail }) {
  return <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '11px' }}>
    <div style={{ fontSize: '18px' }}>{icon}</div>
    <div style={{ fontSize: '8.5px', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '5px' }}>{label}</div>
    <div style={{ fontSize: '13px', fontWeight: 900, marginTop: '4px' }}>{value}</div>
    <div style={{ fontSize: '9px', color: 'var(--accent-gold-dark, #a9871f)', fontWeight: 800, marginTop: '3px' }}>{detail}</div>
  </div>
}

function Empty({ text }) {
  return <div style={{ color: 'var(--text-muted)', fontSize: '11px', padding: '8px 0' }}>{text}</div>
}
