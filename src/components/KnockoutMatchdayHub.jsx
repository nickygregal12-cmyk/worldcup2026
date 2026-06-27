import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

const KO_STAGES = ['r32', 'r16', 'qf', 'sf', '3rd', 'final']
const ADVANCEMENT_STAGES = ['r32', 'r16', 'qf', 'sf', 'final']
const STAGE_POINTS = { r32: 8, r16: 12, qf: 16, sf: 20, final: 25, '3rd': 0 }
const STAGE_LABELS = {
  r32: 'Round of 32',
  r16: 'Round of 16',
  qf: 'Quarter-final',
  sf: 'Semi-final',
  '3rd': 'Third-place play-off',
  final: 'Final',
}
const NEXT_ROUND_LABELS = {
  r32: 'Round of 16',
  r16: 'Quarter-finals',
  qf: 'Semi-finals',
  sf: 'Final',
  final: 'World Cup winner',
}

const isMatchRevealed = (match) => (
  match?.status === 'live' ||
  match?.status === 'completed' ||
  (match?.kickoff_time && new Date(match.kickoff_time) <= new Date())
)

const actualAdvancerId = (match) => {
  if (!match) return null
  if (match.winner_team_id) return match.winner_team_id
  if (match.home_score == null || match.away_score == null) return null
  if (match.home_score > match.away_score) return match.home_team_id
  if (match.away_score > match.home_score) return match.away_team_id
  return null
}

const koPredictedAdvancerId = (prediction, match) => {
  if (!prediction || !match) return null
  const home = Number(prediction.home_score)
  const away = Number(prediction.away_score)
  if (Number.isFinite(home) && Number.isFinite(away)) {
    if (home > away) return match.home_team_id
    if (away > home) return match.away_team_id
  }
  return prediction.winner_team_id || null
}

const fmtTime = (time) => new Date(time).toLocaleTimeString('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/London',
})

const fmtDate = (time) => new Date(time).toLocaleDateString('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'Europe/London',
})

function buildPredictedAdvancementSets(picks) {
  const sets = Object.fromEntries(ADVANCEMENT_STAGES.map(stage => [stage, new Set()]))
  ;(picks || []).forEach(pick => {
    if (pick?.winner_team_id && sets[pick.stage]) sets[pick.stage].add(pick.winner_team_id)
  })
  return sets
}

function evaluateTeam(teamId, currentStage, sets) {
  if (!teamId || !sets) return { immediate: 0, future: 0, totalAlive: 0 }
  const immediate = sets[currentStage]?.has(teamId) ? (STAGE_POINTS[currentStage] || 0) : 0
  const currentIndex = ADVANCEMENT_STAGES.indexOf(currentStage)
  let future = 0
  if (currentIndex >= 0) {
    ADVANCEMENT_STAGES.slice(currentIndex + 1).forEach(stage => {
      if (sets[stage]?.has(teamId)) future += STAGE_POINTS[stage] || 0
    })
  }
  return { immediate, future, totalAlive: immediate + future }
}

function chooseBestImpact(homeImpact, awayImpact, match) {
  if (match.stage === '3rd') return { side: null, equal: true, reason: 'none' }
  if (homeImpact.immediate !== awayImpact.immediate) {
    return { side: homeImpact.immediate > awayImpact.immediate ? 'home' : 'away', equal: false, reason: 'immediate' }
  }
  if (homeImpact.future !== awayImpact.future) {
    return { side: homeImpact.future > awayImpact.future ? 'home' : 'away', equal: false, reason: 'future' }
  }
  return { side: null, equal: true, reason: 'equal' }
}

function MatchStatus({ match }) {
  if (match.status === 'live') {
    const minute = match.live_minute != null
      ? `${match.live_minute}${match.injury_time ? `+${match.injury_time}` : ''}'`
      : 'LIVE'
    return <span style={{ color: '#d32f2f', fontSize: '10px', fontWeight: 900 }}>● {minute}</span>
  }
  if (match.status === 'completed') {
    return <span style={{ color: 'var(--accent-green)', fontSize: '10px', fontWeight: 900 }}>FULL TIME</span>
  }
  return <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 800 }}>{fmtTime(match.kickoff_time)} BST</span>
}

function ImpactOption({ team, impact, highlighted, match, side }) {
  const winnerId = actualAdvancerId(match)
  const completed = match.status === 'completed'
  const won = completed && winnerId === team?.id
  const lost = completed && winnerId && winnerId !== team?.id
  const nextRound = NEXT_ROUND_LABELS[match.stage]

  let badge = null
  if (won && impact.immediate > 0) badge = `+${impact.immediate} earned`
  else if (won) badge = 'Advanced'
  else if (lost) badge = 'Eliminated'
  else if (highlighted) badge = impact.immediate > 0 ? 'Best for your score' : 'Higher future value'
  else if (impact.immediate > 0) badge = `+${impact.immediate} available`

  return (
    <div style={{
      flex: 1,
      minWidth: 0,
      borderRadius: 'var(--radius-md)',
      padding: '12px',
      background: highlighted ? 'rgba(46,125,50,0.07)' : 'var(--bg-secondary)',
      border: highlighted ? '2px solid var(--accent-green)' : '1px solid var(--border-light)',
      opacity: lost ? 0.64 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
        <span style={{ fontSize: '22px' }}>{team?.flag_emoji}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {team?.name || (side === 'home' ? 'Home team' : 'Away team')} win
          </div>
          <div style={{ color: impact.immediate > 0 ? 'var(--accent-green)' : 'var(--text-muted)', fontSize: '22px', fontWeight: 900, fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
            +{impact.immediate}
          </div>
        </div>
      </div>

      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', lineHeight: 1.42, marginTop: '7px' }}>
        {match.stage === '3rd'
          ? 'The third-place match does not change tournament bracket points.'
          : impact.immediate > 0
            ? `You predicted ${team?.short_code || team?.name} to reach the ${nextRound}.`
            : `You did not predict ${team?.short_code || team?.name} to reach the ${nextRound}.`}
        {impact.future > 0 && (
          <span> They also keep <b style={{ color: 'var(--text-primary)' }}>{impact.future}</b> later-round points alive.</span>
        )}
      </div>

      {badge && (
        <span style={{
          display: 'inline-flex', marginTop: '8px', padding: '3px 7px', borderRadius: 'var(--radius-full)',
          background: won || highlighted ? 'rgba(46,125,50,0.12)' : 'var(--bg-tertiary)',
          color: won || highlighted ? 'var(--accent-green)' : 'var(--text-muted)',
          fontSize: '9px', fontWeight: 900,
        }}>
          {badge}
        </span>
      )}
    </div>
  )
}

function KnockoutMatchCard({ match, bracketPick, teamsById, advancementSets, koPrediction, publicPredictions }) {
  const homeImpact = evaluateTeam(match.home_team_id, match.stage, advancementSets)
  const awayImpact = evaluateTeam(match.away_team_id, match.stage, advancementSets)
  const best = chooseBestImpact(homeImpact, awayImpact, match)
  const bestTeamId = best.side === 'home' ? match.home_team_id : best.side === 'away' ? match.away_team_id : null
  const koWinnerId = koPredictedAdvancerId(koPrediction, match)
  const revealed = isMatchRevealed(match)

  const originalHome = teamsById[bracketPick?.home_team_id]
  const originalAway = teamsById[bracketPick?.away_team_id]
  const originalWinner = teamsById[bracketPick?.winner_team_id]
  const originalIds = [bracketPick?.home_team_id, bracketPick?.away_team_id].filter(Boolean).sort().join('|')
  const actualIds = [match.home_team_id, match.away_team_id].filter(Boolean).sort().join('|')
  const pathChanged = bracketPick && originalIds && actualIds && originalIds !== actualIds

  const sideCounts = { home: 0, away: 0 }
  ;(publicPredictions || []).forEach(pred => {
    const winner = koPredictedAdvancerId(pred, match)
    if (winner === match.home_team_id) sideCounts.home += 1
    if (winner === match.away_team_id) sideCounts.away += 1
  })
  const splitTotal = sideCounts.home + sideCounts.away
  const homePct = splitTotal ? Math.round((sideCounts.home / splitTotal) * 100) : 0
  const awayPct = splitTotal ? 100 - homePct : 0

  const splitLoyalties = bestTeamId && koWinnerId && bestTeamId !== koWinnerId
  const aligned = bestTeamId && koWinnerId && bestTeamId === koWinnerId

  const hasScore = match.home_score != null && match.away_score != null
  const koScore = koPrediction && koPrediction.home_score != null && koPrediction.away_score != null
    ? `${koPrediction.home_score}–${koPrediction.away_score}`
    : null
  const koWinner = koWinnerId === match.home_team_id ? match.home_team : koWinnerId === match.away_team_id ? match.away_team : null

  return (
    <div className="card fade-in" style={{ overflow: 'hidden', border: match.status === 'live' ? '2px solid #d32f2f' : '1px solid var(--border-light)' }}>
      <div style={{ padding: '14px 14px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '11px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 800 }}>
            {STAGE_LABELS[match.stage] || match.stage} · M{match.match_number}
          </div>
          <MatchStatus match={match} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
            <span style={{ fontSize: '27px' }}>{match.home_team?.flag_emoji}</span>
            <span style={{ fontSize: '12px', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.home_team?.short_code}</span>
          </div>
          <div style={{ textAlign: 'center', minWidth: '70px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '20px' }}>
              {hasScore ? `${match.home_score}–${match.away_score}` : 'vs'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '7px', minWidth: 0 }}>
            <span style={{ fontSize: '12px', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.away_team?.short_code}</span>
            <span style={{ fontSize: '27px' }}>{match.away_team?.flag_emoji}</span>
          </div>
        </div>

        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '8px' }}>
          {fmtDate(match.kickoff_time)} · <Link to={`/match/${match.id}/stats`} style={{ color: 'var(--scottish-navy)', fontWeight: 800 }}>Match centre →</Link>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border-light)', padding: '13px 14px' }}>
        <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '9px' }}>
          Tournament bracket impact
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <ImpactOption team={match.home_team} impact={homeImpact} highlighted={best.side === 'home'} match={match} side="home" />
          <ImpactOption team={match.away_team} impact={awayImpact} highlighted={best.side === 'away'} match={match} side="away" />
        </div>

        {best.equal && match.stage !== '3rd' && (
          <div style={{ marginTop: '9px', padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', color: 'var(--text-muted)', fontSize: '10.5px', lineHeight: 1.4 }}>
            {homeImpact.totalAlive > 0
              ? 'Either result helps your tournament bracket equally.'
              : 'Neither result adds tournament bracket progression points for you.'}
          </div>
        )}

        {pathChanged && (
          <div style={{ marginTop: '9px', padding: '9px 10px', borderRadius: 'var(--radius-sm)', background: 'rgba(0,48,135,0.06)', border: '1px solid rgba(0,48,135,0.12)', fontSize: '10.5px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            <b style={{ color: 'var(--scottish-navy)' }}>Your original M{match.match_number}:</b>{' '}
            {originalHome?.short_code || 'TBC'} v {originalAway?.short_code || 'TBC'}{originalWinner ? ` · you picked ${originalWinner.short_code}` : ''}.
            {' '}That old matchup is ignored now — each predicted team follows its real fixture.
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px solid rgba(230,81,0,0.18)', padding: '13px 14px', background: 'rgba(230,81,0,0.045)' }}>
        <div style={{ fontSize: '10px', fontWeight: 800, color: '#e65100', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '9px' }}>
          🔥 KO Predictor · separate competition
        </div>

        {koPrediction ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <span style={{ fontSize: '24px' }}>{koWinner?.flag_emoji || '⚽'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: 800 }}>
                {koWinner ? `${koWinner.name} to advance` : 'KO pick saved'} {koPrediction.is_joker ? '🃏' : ''}
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {koScore ? `Predicted score ${koScore}` : 'Winner prediction'}
                {koPrediction.outcome_type && koPrediction.outcome_type !== '90mins'
                  ? ` · ${koPrediction.outcome_type === 'et' ? 'after extra time' : 'on penalties'}`
                  : ''}
                {koPrediction.points_awarded != null && match.status === 'completed' ? ` · ${koPrediction.points_awarded}pts` : ''}
              </div>
            </div>
            {koScore && <div style={{ color: '#e65100', fontSize: '18px', fontWeight: 900, fontFamily: 'var(--font-mono)' }}>{koScore}</div>}
          </div>
        ) : (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            No KO Predictor pick yet.{' '}
            {!revealed && <Link to="/ko-predictor" style={{ color: '#e65100', fontWeight: 800 }}>Make your pick →</Link>}
          </div>
        )}

        {revealed && splitTotal > 0 && (
          <div style={{ marginTop: '10px' }}>
            <div style={{ display: 'flex', height: '7px', borderRadius: 'var(--radius-full)', overflow: 'hidden', background: 'var(--bg-tertiary)' }}>
              <div style={{ width: `${homePct}%`, background: 'var(--scottish-navy)' }} />
              <div style={{ width: `${awayPct}%`, background: '#7a4fd0' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', color: 'var(--text-muted)', fontSize: '9.5px', fontWeight: 800 }}>
              <span>{match.home_team?.short_code} {homePct}%</span>
              <span>{match.away_team?.short_code} {awayPct}%</span>
            </div>
          </div>
        )}

        {splitLoyalties && (
          <div style={{ marginTop: '9px', padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: '#fff4d6', border: '1px solid rgba(230,163,0,0.28)', color: '#7a5700', fontSize: '10.5px', fontWeight: 700, lineHeight: 1.4 }}>
            ⚖️ Split loyalties: your tournament bracket benefits more from {best.side === 'home' ? match.home_team?.name : match.away_team?.name}, but your KO Predictor pick backs {koWinner?.name}.
          </div>
        )}
        {aligned && (
          <div style={{ marginTop: '9px', color: 'var(--accent-green)', fontSize: '10.5px', fontWeight: 800 }}>
            ✓ Your tournament bracket and KO Predictor pick are aligned.
          </div>
        )}
      </div>
    </div>
  )
}

export default function KnockoutMatchdayHub({ user, profile }) {
  const [matches, setMatches] = useState([])
  const [bracketPicks, setBracketPicks] = useState([])
  const [koPredictions, setKoPredictions] = useState([])
  const [publicKoPredictions, setPublicKoPredictions] = useState([])
  const [teamsById, setTeamsById] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!user?.id) return
      setLoading(true)
      setError('')

      try {
        const now = new Date()
        const windowStart = new Date(now.getTime() - 10 * 60 * 60 * 1000)
        const windowEnd = new Date(now.getTime() + 32 * 60 * 60 * 1000)
        const matchSelect = 'id, match_number, stage, status, kickoff_time, home_score, away_score, live_minute, injury_time, home_team_id, away_team_id, winner_team_id, home_team:home_team_id(id,name,flag_emoji,short_code), away_team:away_team_id(id,name,flag_emoji,short_code)'

        let matchRes = await supabase
          .from('matches')
          .select(matchSelect)
          .in('stage', KO_STAGES)
          .not('home_team_id', 'is', null)
          .not('away_team_id', 'is', null)
          .gte('kickoff_time', windowStart.toISOString())
          .lte('kickoff_time', windowEnd.toISOString())
          .order('kickoff_time', { ascending: true })

        if (matchRes.error) throw matchRes.error

        let matchData = matchRes.data || []
        if (matchData.length === 0) {
          const nextRes = await supabase
            .from('matches')
            .select(matchSelect)
            .in('stage', KO_STAGES)
            .not('home_team_id', 'is', null)
            .not('away_team_id', 'is', null)
            .gte('kickoff_time', now.toISOString())
            .order('kickoff_time', { ascending: true })
            .limit(4)
          if (nextRes.error) throw nextRes.error
          matchData = nextRes.data || []
        }

        const matchIds = matchData.map(match => match.id)
        const [bracketRes, ownKoRes] = await Promise.all([
          supabase
            .from('knockout_picks')
            .select('match_number, stage, winner_team_id, home_team_id, away_team_id')
            .eq('user_id', user.id),
          matchIds.length
            ? supabase
              .from('ko_predictions')
              .select('match_id, home_score, away_score, outcome_type, winner_team_id, is_joker, points_awarded')
              .eq('user_id', user.id)
              .in('match_id', matchIds)
            : Promise.resolve({ data: [], error: null }),
        ])
        if (bracketRes.error) throw bracketRes.error
        if (ownKoRes.error) throw ownKoRes.error

        const bracketData = bracketRes.data || []
        const extraTeamIds = [...new Set(bracketData.flatMap(pick => [pick.home_team_id, pick.away_team_id, pick.winner_team_id]).filter(Boolean))]
        const teamMap = {}
        if (extraTeamIds.length) {
          const teamRes = await supabase.from('teams').select('id,name,flag_emoji,short_code').in('id', extraTeamIds)
          if (teamRes.error) throw teamRes.error
          ;(teamRes.data || []).forEach(team => { teamMap[team.id] = team })
        }
        matchData.forEach(match => {
          if (match.home_team?.id) teamMap[match.home_team.id] = match.home_team
          if (match.away_team?.id) teamMap[match.away_team.id] = match.away_team
        })

        const revealedIds = matchData.filter(isMatchRevealed).map(match => match.id)
        let publicData = []
        if (revealedIds.length) {
          const publicRes = await supabase
            .from('ko_predictions')
            .select('match_id, home_score, away_score, winner_team_id')
            .in('match_id', revealedIds)
          if (!publicRes.error) publicData = publicRes.data || []
        }

        if (!cancelled) {
          setMatches(matchData)
          setBracketPicks(bracketData)
          setKoPredictions(ownKoRes.data || [])
          setPublicKoPredictions(publicData)
          setTeamsById(teamMap)
        }
      } catch (e) {
        console.error('Knockout matchday hub failed to load:', e)
        if (!cancelled) setError(e.message || 'Could not load knockout matchday data.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    const interval = window.setInterval(load, 60000)
    const onVisible = () => { if (!document.hidden) load() }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [user?.id])

  const advancementSets = useMemo(() => buildPredictedAdvancementSets(bracketPicks), [bracketPicks])
  const bracketByMatch = useMemo(() => {
    const map = {}
    bracketPicks.forEach(pick => { map[pick.match_number] = pick })
    return map
  }, [bracketPicks])
  const koByMatch = useMemo(() => {
    const map = {}
    koPredictions.forEach(prediction => { map[prediction.match_id] = prediction })
    return map
  }, [koPredictions])
  const publicByMatch = useMemo(() => {
    const map = {}
    publicKoPredictions.forEach(prediction => {
      if (!map[prediction.match_id]) map[prediction.match_id] = []
      map[prediction.match_id].push(prediction)
    })
    return map
  }, [publicKoPredictions])

  if (loading) {
    return (
      <div className="card fade-in" style={{ padding: '28px', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="card fade-in" style={{ padding: '16px', color: 'var(--accent-red)', fontSize: '12px' }}>
        Knockout hub could not load: {error}
      </div>
    )
  }

  if (matches.length === 0) return null

  const liveCount = matches.filter(match => match.status === 'live').length
  const nextMatch = matches.find(match => match.status !== 'completed') || matches[0]

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{
        background: 'linear-gradient(145deg, var(--scottish-navy), #163d6a)',
        color: 'white', borderRadius: 'var(--radius-lg)', padding: '18px 16px', overflow: 'hidden', position: 'relative',
      }}>
        <div style={{ position: 'absolute', width: '150px', height: '150px', borderRadius: '50%', right: '-55px', top: '-75px', background: 'radial-gradient(circle, rgba(255,193,7,0.28), transparent 70%)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.66)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em' }}>
            Knockout matchday
          </div>
          <div style={{ fontSize: '21px', fontWeight: 900, marginTop: '4px' }}>Who helps your bracket most?</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.45, marginTop: '5px', maxWidth: '520px' }}>
            Your original matchups no longer matter. Each team follows its real fixture, while KO Predictor remains a separate competition.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '14px' }}>
            <div style={{ background: 'rgba(255,255,255,0.09)', borderRadius: 'var(--radius-md)', padding: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.58)', textTransform: 'uppercase', fontWeight: 800 }}>Tournament</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 900, marginTop: '2px' }}>{profile?.total_points || 0}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.09)', borderRadius: 'var(--radius-md)', padding: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.58)', textTransform: 'uppercase', fontWeight: 800 }}>KO Predictor</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 900, marginTop: '2px', color: '#ffcc80' }}>{profile?.ko_points || 0}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.09)', borderRadius: 'var(--radius-md)', padding: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.58)', textTransform: 'uppercase', fontWeight: 800 }}>Status</div>
              <div style={{ fontSize: '12px', fontWeight: 900, marginTop: '6px', color: liveCount ? '#ff8a80' : 'white' }}>
                {liveCount ? `● ${liveCount} live` : nextMatch ? `${fmtDate(nextMatch.kickoff_time)}` : 'No games'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {matches.map(match => (
        <KnockoutMatchCard
          key={match.id}
          match={match}
          bracketPick={bracketByMatch[match.match_number]}
          teamsById={teamsById}
          advancementSets={advancementSets}
          koPrediction={koByMatch[match.id]}
          publicPredictions={publicByMatch[match.id] || []}
        />
      ))}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Link to="/knockout" className="btn btn-outline" style={{ textDecoration: 'none', textAlign: 'center', justifyContent: 'center' }}>
          View tournament bracket
        </Link>
        <Link to="/ko-predictor" className="btn" style={{ textDecoration: 'none', textAlign: 'center', justifyContent: 'center', background: '#e65100', color: 'white' }}>
          Open KO Predictor
        </Link>
      </div>
    </section>
  )
}
