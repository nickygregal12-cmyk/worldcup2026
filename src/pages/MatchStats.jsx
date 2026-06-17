import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/index.js'

export default function MatchStats() {
  const { matchId } = useParams()
  const [searchParams] = useSearchParams()
  const leagueCode = searchParams.get('league')
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [loading, setLoading] = useState(true)
  const [match, setMatch] = useState(null)
  const [stats, setStats] = useState(null)
  const [scopeLabel, setScopeLabel] = useState('Everyone')
  const [leagueName, setLeagueName] = useState(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      // 1. The match
      const { data: m } = await supabase
        .from('matches')
        .select('id, match_number, stage, home_score, away_score, status, kickoff_time, home_team:home_team_id(name, flag_emoji, short_code), away_team:away_team_id(name, flag_emoji, short_code)')
        .eq('id', matchId)
        .maybeSingle()
      setMatch(m)

      // 2. Determine scope — league members or everyone
      let userIdFilter = null
      if (leagueCode) {
        const { data: league } = await supabase
          .from('leagues').select('id, name').eq('code', leagueCode).maybeSingle()
        if (league) {
          setLeagueName(league.name)
          setScopeLabel(league.name)
          const { data: members } = await supabase
            .from('league_members').select('user_id').eq('league_id', league.id)
          userIdFilter = (members || []).map(mm => mm.user_id)
        }
      }

      // 3. All predictions for this match (optionally scoped to league members)
      let q = supabase
        .from('predictions')
        .select('user_id, home_score, away_score, is_confident, points_awarded')
        .eq('match_id', matchId)
        .not('home_score', 'is', null)
      if (userIdFilter) q = q.in('user_id', userIdFilter)
      const { data: preds } = await q

      // 4. Reactions
      const { data: reactions } = await supabase
        .from('match_reactions').select('reaction').eq('match_id', matchId)

      setStats(computeStats(preds || [], reactions || [], m))
      setLoading(false)
    }
    if (matchId) load()
  }, [matchId, leagueCode])

  if (loading) {
    return <div className="container" style={{ padding: '40px 16px', textAlign: 'center' }}>
      <div className="spinner" style={{ margin: '0 auto' }} />
    </div>
  }

  if (!match || !stats || stats.total === 0) {
    return <div className="container" style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: '16px', color: 'var(--scottish-navy)', fontWeight: '700', fontSize: '14px' }}>← Back</button>
      <p>No prediction stats available for this match yet.</p>
    </div>
  }

  const hasResult = match.home_score != null && match.away_score != null
  const actualResult = hasResult
    ? match.home_score > match.away_score ? 'home' : match.home_score === match.away_score ? 'draw' : 'away'
    : null

  return (
    <div className="container" style={{ padding: '16px 16px 40px', maxWidth: '560px' }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: '12px', color: 'var(--scottish-navy)', fontWeight: '700', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>← Back</button>

      {/* Match header */}
      <div className="card fade-up" style={{ marginBottom: '14px', textAlign: 'center' }}>
        <div style={{ fontSize: 'var(--t-tiny)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '12px' }}>
          M{match.match_number} · {hasResult ? 'Full time' : match.status === 'live' ? '🔴 Live' : 'Predictions'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
          <div style={{ textAlign: 'center', width: '88px' }}>
            <div style={{ fontSize: '34px', lineHeight: 1 }}>{match.home_team?.flag_emoji}</div>
            <div style={{ fontWeight: '800', fontSize: 'var(--t-small)', marginTop: '4px' }}>{match.home_team?.short_code}</div>
          </div>
          <div className="stat-num" style={{ fontSize: '32px', fontWeight: '500', minWidth: '80px' }}>
            {hasResult ? `${match.home_score} – ${match.away_score}` : 'vs'}
          </div>
          <div style={{ textAlign: 'center', width: '88px' }}>
            <div style={{ fontSize: '34px', lineHeight: 1 }}>{match.away_team?.flag_emoji}</div>
            <div style={{ fontWeight: '800', fontSize: 'var(--t-small)', marginTop: '4px' }}>{match.away_team?.short_code}</div>
          </div>
        </div>
        <div style={{ fontSize: 'var(--t-tiny)', color: 'var(--text-muted)', marginTop: '12px' }}>
          📊 {stats.total} predictions · {scopeLabel}
        </div>
      </div>

      {/* Result split */}
      <StatCard title="How people predicted">
        <div style={{ display: 'flex', gap: '3px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', height: '8px', marginBottom: '9px' }}>
          <div style={{ width: `${stats.homePct}%`, background: 'var(--scottish-navy)' }} />
          <div style={{ width: `${stats.drawPct}%`, background: 'var(--text-muted)', opacity: 0.4 }} />
          <div style={{ width: `${stats.awayPct}%`, background: '#c62828' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--t-small)', fontWeight: '700' }}>
          <span style={{ color: actualResult === 'home' ? 'var(--scottish-navy)' : 'var(--text-secondary)' }}>
            {match.home_team?.short_code} <span className="stat-num">{stats.homePct}%</span>{actualResult === 'home' ? ' ✓' : ''}
          </span>
          <span style={{ color: actualResult === 'draw' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            Draw <span className="stat-num">{stats.drawPct}%</span>{actualResult === 'draw' ? ' ✓' : ''}
          </span>
          <span style={{ color: actualResult === 'away' ? '#c62828' : 'var(--text-secondary)' }}>
            {match.away_team?.short_code} <span className="stat-num">{stats.awayPct}%</span>{actualResult === 'away' ? ' ✓' : ''}
          </span>
        </div>
      </StatCard>

      {/* Key number grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
        <MiniStat label="Most popular score" value={stats.topScore} sub={`${stats.topScorePct}% picked it`} />
        <MiniStat label="Jokers used 🃏" value={stats.jokers} sub={`${stats.jokerPct}% of players`} />
        <MiniStat label="Avg predicted goals" value={stats.avgGoals} sub={hasResult ? `actual: ${match.home_score + match.away_score}` : 'total'} />
        <MiniStat label="Boldest scoreline" value={stats.boldest} sub={`${stats.boldestGoals} goals`} />
      </div>

      {/* Post-match: exact score % */}
      {hasResult && (
        <StatCard title="Got it spot on 🎯">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span className="stat-num" style={{ fontSize: '32px', fontWeight: '700', color: 'var(--accent-green)' }}>{stats.exactPct}%</span>
            <span style={{ fontSize: 'var(--t-small)', color: 'var(--text-muted)' }}>
              predicted {match.home_score}–{match.away_score} exactly ({stats.exactCount} {stats.exactCount === 1 ? 'person' : 'people'})
            </span>
          </div>
        </StatCard>
      )}

      {/* Upset meter */}
      {hasResult && stats.actualResultPct != null && (
        <StatCard title="Upset meter">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ height: '8px', borderRadius: 'var(--radius-full)', background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                <div style={{ width: `${100 - stats.actualResultPct}%`, height: '100%', background: stats.actualResultPct <= 20 ? '#e65100' : stats.actualResultPct <= 45 ? 'var(--accent-gold)' : 'var(--accent-green)', transition: 'width 0.5s' }} />
              </div>
            </div>
            <span style={{ fontSize: 'var(--t-small)', fontWeight: '800', color: stats.actualResultPct <= 20 ? '#e65100' : 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              {stats.actualResultPct <= 5 ? '🚨 Massive upset' : stats.actualResultPct <= 20 ? '😲 Upset' : stats.actualResultPct <= 45 ? 'Mild surprise' : '✓ As expected'}
            </span>
          </div>
          <div style={{ fontSize: 'var(--t-tiny)', color: 'var(--text-muted)', marginTop: '6px' }}>
            Only <span className="stat-num" style={{ fontWeight: '700' }}>{stats.actualResultPct}%</span> predicted this result
          </div>
        </StatCard>
      )}

      {/* Reactions */}
      {(stats.reactions.fire + stats.reactions.laugh + stats.reactions.skull) > 0 && (
        <StatCard title="Reactions">
          <div style={{ display: 'flex', gap: '16px' }}>
            <span style={{ fontSize: 'var(--t-body)' }}>🔥 <span className="stat-num" style={{ fontWeight: '700' }}>{stats.reactions.fire}</span></span>
            <span style={{ fontSize: 'var(--t-body)' }}>😂 <span className="stat-num" style={{ fontWeight: '700' }}>{stats.reactions.laugh}</span></span>
            <span style={{ fontSize: 'var(--t-body)' }}>💀 <span className="stat-num" style={{ fontWeight: '700' }}>{stats.reactions.skull}</span></span>
          </div>
        </StatCard>
      )}
    </div>
  )
}

function StatCard({ title, children }) {
  return (
    <div className="card fade-up" style={{ marginBottom: '14px' }}>
      <div style={{ fontSize: 'var(--t-tiny)', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>{title}</div>
      {children}
    </div>
  )
}

function MiniStat({ label, value, sub }) {
  return (
    <div className="card fade-up" style={{ padding: '14px' }}>
      <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{label}</div>
      <div className="stat-num" style={{ fontSize: 'var(--t-h2)', fontWeight: '700', color: 'var(--text-primary)' }}>{value}</div>
      {sub && <div style={{ fontSize: 'var(--t-tiny)', color: 'var(--text-muted)', marginTop: '2px' }}>{sub}</div>}
    </div>
  )
}

function computeStats(preds, reactions, match) {
  const total = preds.length
  if (total === 0) return { total: 0 }

  let home = 0, draw = 0, away = 0, jokers = 0, goalSum = 0
  const scoreCounts = {}
  let boldest = '0–0', boldestGoals = -1

  preds.forEach(p => {
    if (p.home_score > p.away_score) home++
    else if (p.home_score === p.away_score) draw++
    else away++
    if (p.is_confident) jokers++
    const g = p.home_score + p.away_score
    goalSum += g
    if (g > boldestGoals) { boldestGoals = g; boldest = `${p.home_score}–${p.away_score}` }
    const key = `${p.home_score}–${p.away_score}`
    scoreCounts[key] = (scoreCounts[key] || 0) + 1
  })

  // Most popular scoreline
  let topScore = '–', topCount = 0
  Object.entries(scoreCounts).forEach(([k, c]) => { if (c > topCount) { topCount = c; topScore = k } })

  // Exact score (post-match)
  let exactCount = 0, actualResultCount = 0
  const hasResult = match?.home_score != null && match?.away_score != null
  if (hasResult) {
    const ar = match.home_score > match.away_score ? 'home' : match.home_score === match.away_score ? 'draw' : 'away'
    preds.forEach(p => {
      if (p.home_score === match.home_score && p.away_score === match.away_score) exactCount++
      const pr = p.home_score > p.away_score ? 'home' : p.home_score === p.away_score ? 'draw' : 'away'
      if (pr === ar) actualResultCount++
    })
  }

  const r = { fire: 0, laugh: 0, skull: 0 }
  reactions.forEach(x => {
    if (x.reaction === 'fire') r.fire++
    else if (x.reaction === 'laugh') r.laugh++
    else if (x.reaction === 'skull') r.skull++
  })

  const homePct = Math.round((home / total) * 100)
  const drawPct = Math.round((draw / total) * 100)

  return {
    total,
    homePct,
    drawPct,
    awayPct: 100 - homePct - drawPct,
    topScore,
    topScorePct: Math.round((topCount / total) * 100),
    jokers,
    jokerPct: Math.round((jokers / total) * 100),
    avgGoals: (goalSum / total).toFixed(1),
    boldest,
    boldestGoals,
    exactCount,
    exactPct: hasResult ? Math.round((exactCount / total) * 100) : null,
    actualResultPct: hasResult ? Math.round((actualResultCount / total) * 100) : null,
    reactions: r,
  }
}
