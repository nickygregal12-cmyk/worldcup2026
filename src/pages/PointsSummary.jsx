import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/index.js'
import { ALL_STAGES, calcPredictedStandings, getBest3rdTeams } from '../lib/bracketUtils.js'
import { tournamentGoalTotal } from '../lib/goalTotals.js'

const NAVY = 'var(--scottish-navy)'
const GOLD = '#c8a430'
const GREEN = 'var(--accent-green)'

const mono = { fontFamily: 'var(--font-mono, ui-monospace, monospace)' }

export default function PointsSummary() {
  const { userId: routeUserId } = useParams()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const targetId = routeUserId || user?.id

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [matchLines, setMatchLines] = useState([])
  const [groupLines, setGroupLines] = useState([])
  const [bracketLines, setBracketLines] = useState([])
  const [bonusPoints, setBonusPoints] = useState({ champion: 0, awards: 0, goals: 0, awardLines: [], goalsReady: false })
  const [stats, setStats] = useState(null)
  const [open, setOpen] = useState({ match: true, group: false, bracket: false, awards: false })

  // search
  const [showSearch, setShowSearch] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])

  const load = useCallback(async (uid, silent = false) => {
    if (!silent) setLoading(true)
    const [
      { data: prof },
      { data: preds },
      { data: gpos },
      { data: groupMatchRows },
      { data: r32Rows },
      { data: gsRows },
      { data: allTotals },
      { data: knockoutPickRows },
      { data: knockoutMatchRows },
      { data: awardPredictionRows },
      { data: awardResultRows },
      { data: goalPredictionRows },
      { data: tournamentMatchRows },
    ] = await Promise.all([
      supabase.from('profiles').select('id, username, display_name, avatar_emoji, total_points, group_position_points, bracket_points, exact_scores, streak_current').eq('id', uid).maybeSingle(),
      supabase.from('predictions').select('home_score, away_score, is_confident, points_awarded, match:match_id(match_number, kickoff_time, stage, status, home_score, away_score, home_team:home_team_id(short_code, flag_emoji), away_team:away_team_id(short_code, flag_emoji))').eq('user_id', uid),
      supabase.from('predicted_group_positions').select('group_name, predicted_position, points_awarded, team:team_id(short_code, flag_emoji)').eq('user_id', uid).order('group_name').order('predicted_position'),
      supabase.from('matches').select('id, match_number, stage, status, home_score, away_score, home_team_id, away_team_id, group:group_id(name), home_team:home_team_id(id, name, short_code, flag_emoji), away_team:away_team_id(id, name, short_code, flag_emoji)').eq('stage', 'group'),
      supabase.from('matches').select('home_team_id, away_team_id, group:group_id(name)').eq('stage', 'r32'),
      supabase.from('group_standings').select('team_id, position, played, group:group_id(name)').eq('played', 3).lte('position', 2),
      supabase.from('profiles').select('total_points'),
      supabase.from('knockout_picks').select('match_number, stage, winner_team_id').eq('user_id', uid),
      supabase.from('matches')
        .select('id, match_number, stage, status, home_team_id, away_team_id, winner_team_id, home_score, away_score, home_team:home_team_id(id, name, short_code, flag_emoji), away_team:away_team_id(id, name, short_code, flag_emoji)')
        .neq('stage', 'group'),
      supabase.from('award_predictions').select('award_type, predicted_player_name').eq('user_id', uid),
      supabase.from('award_results').select('award_type, winner_name'),
      supabase.from('tournament_predictions').select('int_value').eq('user_id', uid).eq('prediction_type', 'total_goals').maybeSingle(),
      supabase.from('matches').select('match_number, status, home_score, away_score, outcome_type, aet_home_score, aet_away_score').gte('match_number', 1).lte('match_number', 104),
    ])
    setProfile(prof)

    // ── Match prediction lines (scored matches only) ──
    const ml = (preds || [])
      .filter(p => p.match && p.match.status === 'completed' && p.points_awarded != null)
      .map(p => {
        const m = p.match
        const exact = p.home_score === m.home_score && p.away_score === m.away_score
        return {
          key: m.match_number,
          kickoff: m.kickoff_time,
          home: m.home_team, away: m.away_team,
          result: `${m.home_score}–${m.away_score}`,
          you: `${p.home_score}–${p.away_score}`,
          pts: p.points_awarded,
          exact,
          joker: !!p.is_confident,
        }
      })
      .filter(x => x.pts > 0)
      .sort((a, b) => new Date(b.kickoff) - new Date(a.kickoff))
    setMatchLines(ml)

    // ── Group position lines (per group) ──
    const byGroup = {}
    ;(gpos || []).forEach(r => {
      const g = r.group_name
      if (!byGroup[g]) byGroup[g] = { group: g, base: 0, correct: 0, teams: [] }
      byGroup[g].base += r.points_awarded || 0
      if (r.points_awarded > 0) byGroup[g].correct++
      byGroup[g].teams.push({ ...r.team, hit: r.points_awarded > 0 })
    })
    const gl = Object.values(byGroup).map(g => {
      const perfect = g.correct === 4
      return { ...g, perfect, pts: g.base + (perfect ? 5 : 0) }
    }).filter(g => g.pts > 0).sort((a, b) => b.pts - a.pts)
    setGroupLines(gl)

    // ── Bracket progression lines across every knockout round ──
    // profiles.bracket_points remains the scoring source of truth. These lines
    // only explain which predicted teams have already reached each real round.
    const groupMatches = groupMatchRows || []
    const { data: gp2 } = await supabase
      .from('predictions')
      .select('match_id, home_score, away_score')
      .eq('user_id', uid)

    const predMap = {}
    ;(gp2 || []).forEach(p => {
      if (p.home_score != null && p.away_score != null) {
        predMap[p.match_id] = { home: p.home_score, away: p.away_score }
      }
    })

    const standings = calcPredictedStandings(groupMatches, predMap, true)
    const scoringStages = ALL_STAGES.filter(stage =>
      ['r32', 'r16', 'qf', 'sf', 'final'].includes(stage.key)
    )
    const stageByMatchNumber = new Map(
      scoringStages.flatMap(stage =>
        (stage.matches || []).map(match => [Number(match.match_number), stage.key])
      )
    )

    const teamMeta = {}
    groupMatches.forEach(match => {
      if (match.home_team_id && match.home_team) {
        teamMeta[match.home_team_id] = { ...match.home_team, group: match.group?.name }
      }
      if (match.away_team_id && match.away_team) {
        teamMeta[match.away_team_id] = { ...match.away_team, group: match.group?.name }
      }
    })
    ;(knockoutMatchRows || []).forEach(match => {
      if (match.home_team_id && match.home_team) teamMeta[match.home_team_id] = match.home_team
      if (match.away_team_id && match.away_team) teamMeta[match.away_team_id] = match.away_team
    })

    const predictedByStage = Object.fromEntries(
      scoringStages.map(stage => [stage.key, new Set()])
    )

    // The user's predicted R32 field comes from their frozen group standings.
    for (const arr of Object.values(standings)) {
      ;(arr || []).slice(0, 2).forEach(entry => {
        if (entry?.id) predictedByStage.r32.add(entry.id)
      })
    }
    getBest3rdTeams(standings).slice(0, 8).forEach(entry => {
      if (entry?.id) predictedByStage.r32.add(entry.id)
    })

    // A winner selected in one round is the team predicted to reach the next.
    const nextStageForPick = {
      r32: 'r16',
      r16: 'qf',
      qf: 'sf',
      sf: 'final',
    }
    ;(knockoutPickRows || []).forEach(pick => {
      if (!pick.winner_team_id) return
      const pickStage = pick.stage || stageByMatchNumber.get(Number(pick.match_number))
      const nextStage = nextStageForPick[pickStage]
      if (nextStage && predictedByStage[nextStage]) {
        predictedByStage[nextStage].add(pick.winner_team_id)
      }
    })

    const confirmedByStage = Object.fromEntries(
      scoringStages.map(stage => [stage.key, new Set()])
    )

    ;(r32Rows || []).forEach(row => {
      if (row.home_team_id) confirmedByStage.r32.add(row.home_team_id)
      if (row.away_team_id) confirmedByStage.r32.add(row.away_team_id)
    })
    ;(gsRows || []).forEach(row => {
      if (row.team_id) confirmedByStage.r32.add(row.team_id)
    })

    ;(knockoutMatchRows || []).forEach(match => {
      if (confirmedByStage[match.stage]) {
        if (match.home_team_id) confirmedByStage[match.stage].add(match.home_team_id)
        if (match.away_team_id) confirmedByStage[match.stage].add(match.away_team_id)
      }

      if (match.status === 'completed' && match.winner_team_id) {
        const nextStage = nextStageForPick[match.stage]
        if (nextStage && confirmedByStage[nextStage]) {
          confirmedByStage[nextStage].add(match.winner_team_id)
        }
      }
    })

    const bl = []
    scoringStages.forEach(stage => {
      const confirmed = confirmedByStage[stage.key]
      const predicted = predictedByStage[stage.key]

      ;[...predicted].forEach(teamId => {
        if (!confirmed.has(teamId)) return
        const team = teamMeta[teamId] || {}
        bl.push({
          id: `${stage.key}:${teamId}`,
          team,
          stageKey: stage.key,
          stageLabel: stage.label,
          points: Number(stage.points || 0),
          detail: `Reached ${stage.label}`,
        })
      })
    })

    setBracketLines(bl)

    const finalMatch = (knockoutMatchRows || []).find(match => match.match_number === 104 && match.stage === 'final')
    const finalPick = (knockoutPickRows || []).find(pick => pick.match_number === 104 && pick.stage === 'final')
    const championPoints = finalMatch?.status === 'completed'
      && finalMatch?.winner_team_id
      && finalPick?.winner_team_id === finalMatch.winner_team_id ? 25 : 0

    const awardValues = { golden_boot: 15, golden_glove: 10, player_of_tournament: 10 }
    const resultByType = Object.fromEntries((awardResultRows || []).map(result => [result.award_type, result]))
    const awardLines = (awardPredictionRows || []).map(prediction => {
      const result = resultByType[prediction.award_type]
      const correct = Boolean(result?.winner_name)
        && prediction.predicted_player_name?.trim().toLowerCase() === result.winner_name.trim().toLowerCase()
      return { ...prediction, winner: result?.winner_name, points: correct ? (awardValues[prediction.award_type] || 0) : 0 }
    }).filter(line => line.winner)
    const awardPoints = awardLines.reduce((sum, line) => sum + line.points, 0)

    const completedTournamentMatches = (tournamentMatchRows || []).filter(match => match.status === 'completed')
    const uniqueCompleted = new Set(completedTournamentMatches.map(match => match.match_number))
    const goalsReady = completedTournamentMatches.length === 104 && uniqueCompleted.size === 104
    const actualGoals = goalsReady ? tournamentGoalTotal(completedTournamentMatches) : null
    const goalPrediction = goalPredictionRows?.int_value
    const goalDifference = actualGoals == null || goalPrediction == null ? null : Math.abs(goalPrediction - actualGoals)
    const goalsPoints = goalDifference == null ? 0 : goalDifference === 0 ? 15 : goalDifference <= 5 ? 5 : goalDifference <= 10 ? 3 : 0
    setBonusPoints({ champion: championPoints, awards: awardPoints, goals: goalsReady ? goalsPoints : 0, awardLines, goalsReady, actualGoals, goalPrediction })

    // ── Your Tournament stats ──
    const completed = (preds || []).filter(p => p.match && p.match.status === 'completed' && p.points_awarded != null)
    const correct = completed.filter(p => p.points_awarded > 0).length
    const accuracy = completed.length ? Math.round((correct / completed.length) * 100) : 0
    const jokersPlayed = (preds || []).filter(p => p.is_confident).length
    const jokersPaid = completed.filter(p => p.is_confident && p.points_awarded > 0).length
    const byDay = {}
    completed.forEach(p => { const d = (p.match.kickoff_time || '').slice(0, 10); byDay[d] = (byDay[d] || 0) + p.points_awarded })
    let bestDay = null
    Object.entries(byDay).forEach(([d, v]) => { if (!bestDay || v > bestDay.pts) bestDay = { date: d, pts: v } })
    let best = null
    completed.forEach(p => { if (p.points_awarded > 0 && (!best || p.points_awarded > best.points_awarded)) best = p })
    let miss = null
    completed.forEach(p => { if (p.points_awarded === 0) { if (!miss || (p.is_confident && !miss.is_confident)) miss = p } })
    const totals = (allTotals || []).map(r => r.total_points || 0)
    const myTotal = prof?.total_points || 0
    const rank = totals.filter(t => t > myTotal).length + 1
    const players = totals.length
    const beaten = players > 1 ? Math.round(((players - rank) / (players - 1)) * 100) : 100
    const fieldAvg = totals.length ? Math.round(totals.reduce((s, t) => s + t, 0) / totals.length) : 0
    const fieldAcc = null
    const fmtCall = (p) => p ? {
      label: `${p.match.home_team?.flag_emoji || ''} ${p.match.home_team?.short_code} ${p.match.home_score}–${p.match.away_score} ${p.match.away_team?.short_code} ${p.match.away_team?.flag_emoji || ''}`,
      you: `${p.home_score}–${p.away_score}`,
      pts: p.points_awarded, joker: !!p.is_confident,
      exact: p.home_score === p.match.home_score && p.away_score === p.match.away_score,
    } : null
    setStats({
      accuracy, correct, completed: completed.length,
      exact: prof?.exact_scores || 0,
      jokersPlayed, jokersPaid,
      bestDay, streak: prof?.streak_current || 0,
      rank, players, beaten, fieldAvg,
      best: fmtCall(best), miss: fmtCall(miss),
    })

    if (!silent) setLoading(false)
  }, [])

  useEffect(() => {
    if (!targetId) return

    load(targetId)

    const refresh = () => {
      if (!document.hidden) load(targetId, true)
    }
    const interval = window.setInterval(refresh, 60000)
    document.addEventListener('visibilitychange', refresh)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [targetId, load])

  // search players
  useEffect(() => {
    if (!showSearch || query.trim().length < 2) { setResults([]); return }
    let cancel = false
    const t = setTimeout(async () => {
      const { data } = await supabase.from('profiles')
        .select('id, username, display_name, avatar_emoji, total_points')
        .or(`username.ilike.%${query.trim()}%,display_name.ilike.%${query.trim()}%`)
        .order('total_points', { ascending: false }).limit(8)
      if (!cancel) setResults(data || [])
    }, 220)
    return () => { cancel = true; clearTimeout(t) }
  }, [query, showSearch])

  const totals = useMemo(() => {
    const total = profile?.total_points || 0
    const group = profile?.group_position_points || 0
    const bracket = profile?.bracket_points || 0
    const bonus = bonusPoints.champion + bonusPoints.awards + bonusPoints.goals
    const match = Math.max(total - group - bracket - bonus, 0)
    return { total, group, bracket, match, bonus }
  }, [profile, bonusPoints])

  const name = profile?.display_name || profile?.username || 'Player'
  const isMe = targetId === user?.id

  if (loading) return <div style={{ minHeight: '70vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><div className="spinner" /></div>

  const barTotal = Math.max(totals.match + totals.group + totals.bracket + totals.bonus, 1)
  const w = (v) => `${(v / barTotal * 100).toFixed(1)}%`

  return (
    <div style={{ paddingBottom: '90px', background: 'var(--bg-secondary)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: NAVY, color: '#fff', padding: '14px 16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Link to="/" style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'none', fontSize: '20px' }}>‹</Link>
          <div style={{ fontWeight: '800', fontSize: '16px', flex: 1 }}>Points breakdown</div>
          <button onClick={() => setShowSearch(s => !s)} style={{ background: 'rgba(255,255,255,0.12)', border: 0, color: '#fff', borderRadius: '10px', padding: '7px 10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>🔍 {isMe ? 'View a player' : 'Change'}</button>
        </div>

        {showSearch && (
          <div style={{ marginBottom: '14px' }}>
            <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search any player…"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '11px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '14px', outline: 'none' }} />
            {results.length > 0 && (
              <div style={{ marginTop: '6px', background: '#fff', borderRadius: '11px', overflow: 'hidden' }}>
                {results.map(r => (
                  <div key={r.id} onClick={() => { setShowSearch(false); setQuery(''); navigate(`/points/${r.id}`) }}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)', color: 'var(--text-primary)' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: NAVY, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '12px' }}>{r.avatar_emoji || (r.display_name || r.username || '?')[0].toUpperCase()}</div>
                    <span style={{ flex: 1, fontWeight: '700', fontSize: '14px' }}>{r.display_name || r.username}</span>
                    <span style={{ ...mono, fontWeight: '800', fontSize: '13px', color: 'var(--text-muted)' }}>{r.total_points}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: '700' }}>{name}{!isMe && ' · their score'}</div>
          <div style={{ ...mono, fontSize: '54px', fontWeight: '800', lineHeight: 1, letterSpacing: '-0.03em' }}>
            {totals.total}<span style={{ fontSize: '18px', color: GOLD }}> pts</span>
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', fontWeight: '600', marginTop: '4px' }}>
            {profile?.exact_scores || 0} exact scores{profile?.streak_current ? ` · ${profile.streak_current}🔥 streak` : ''}
          </div>
        </div>

        {/* stacked bar */}
        <div style={{ display: 'flex', height: '14px', borderRadius: '8px', overflow: 'hidden', marginTop: '16px', background: 'rgba(255,255,255,0.1)' }}>
          <div style={{ width: w(totals.match), background: '#dfe6f5' }} />
          <div style={{ width: w(totals.group), background: GOLD }} />
          <div style={{ width: w(totals.bracket), background: '#4caf7d' }} />
          <div style={{ width: w(totals.bonus), background: '#8b5cf6' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', marginTop: '8px', flexWrap: 'wrap' }}>
          <Legend c="#dfe6f5" label="Matches" v={totals.match} />
          <Legend c={GOLD} label="Groups" v={totals.group} />
          <Legend c="#4caf7d" label="Bracket" v={totals.bracket} />
          <Legend c="#8b5cf6" label="Final bonuses" v={totals.bonus} />
        </div>
      </div>

      {/* Your tournament stats */}
      {stats && (
        <div style={{ padding: '6px 0 0' }}>
          <div style={{ padding: '6px 16px 2px', display: 'flex', alignItems: 'baseline' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{isMe ? 'Your tournament' : `${name}'s tournament`}</span>
            <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)' }}>#{stats.rank} of {stats.players}</span>
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '16px', margin: '8px 16px', padding: '15px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <svg width="84" height="84" viewBox="0 0 84 84" style={{ flexShrink: 0 }}>
              <circle cx="42" cy="42" r="36" fill="none" stroke="var(--border-light)" strokeWidth="9" />
              <circle cx="42" cy="42" r="36" fill="none" stroke="var(--accent-green)" strokeWidth="9" strokeLinecap="round"
                strokeDasharray="226" strokeDashoffset={226 * (1 - stats.accuracy / 100)} transform="rotate(-90 42 42)" />
              <text x="42" y="40" textAnchor="middle" fontSize="19" fontWeight="800" fill="var(--text-primary)" style={mono}>{stats.accuracy}%</text>
              <text x="42" y="54" textAnchor="middle" fontSize="8" fontWeight="700" fill="var(--text-muted)">CORRECT</text>
            </svg>
            <div>
              <div style={{ fontWeight: 800, fontSize: '14px' }}>{stats.correct} of {stats.completed} results right</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>
                {isMe ? 'You\u2019re' : 'They\u2019re'} ahead of {stats.beaten}% of the field · field avg {stats.fieldAvg} pts
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '0 16px' }}>
            <Tile n={stats.exact} l="Exact scores" s="🎯 spot on" />
            <Tile n={stats.jokersPlayed} l="Jokers played" s={`${stats.jokersPaid} paid off 🃏`} />
            <Tile n={stats.bestDay ? `+${stats.bestDay.pts}` : '—'} l="Best matchday" s={stats.bestDay ? fmtDate(stats.bestDay.date) : ''} />
            <Tile n={stats.streak ? `${stats.streak}🔥` : '0'} l="Scoring streak" s="matchdays" />
          </div>

          {(stats.best || stats.miss) && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '16px', margin: '10px 16px', padding: '13px' }}>
              <div style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '2px' }}>Best &amp; toughest calls</div>
              {stats.best && <Call tone="good" c={stats.best} />}
              {stats.miss && <Call tone="bad" c={stats.miss} />}
            </div>
          )}
        </div>
      )}

      {/* Ledger */}
      <div style={{ padding: '12px 0' }}>
        <Category open={open.match} onToggle={() => setOpen(o => ({ ...o, match: !o.match }))}
          icon="⚽" iconBg="var(--scottish-navy-light)" title="Match predictions" sub={`${matchLines.filter(m => m.exact).length} exact · ${matchLines.length} scored`} pts={totals.match}>
          {matchLines.map(m => (
            <div key={m.key} style={lnStyle}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ fontWeight: '700', fontSize: '13px' }}>{m.home?.flag_emoji} {m.home?.short_code} {m.result} {m.away?.short_code} {m.away?.flag_emoji}</b>
                <span style={subLn}>You: {m.you}{m.joker && ' · joker'}</span>
              </div>
              {m.joker && <span title="Joker — points doubled" style={{ fontSize: '13px' }}>🃏</span>}
              {m.exact && <span style={tagStyle('EXACT')}>EXACT</span>}
              <span style={vStyle}>+{m.pts}</span>
            </div>
          ))}
          {matchLines.length === 0 && <Empty t="No scored matches yet" />}
        </Category>

        <Category open={open.group} onToggle={() => setOpen(o => ({ ...o, group: !o.group }))}
          icon="📊" iconBg="var(--accent-green-light, #e7f5ec)" title="Group position bonus" sub="+2 / correct position · +5 perfect group" pts={totals.group}>
          {groupLines.map(g => (
            <div key={g.group} style={lnStyle}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ fontWeight: '700', fontSize: '13px' }}>Group {g.group}</b>
                <span style={subLn}>{g.teams.map(t => `${t.flag_emoji || ''}${t.hit ? '✓' : '✗'}`).join(' ')}</span>
              </div>
              {g.perfect && <span style={tagStyle('PERFECT')}>PERFECT</span>}
              <span style={vStyle}>+{g.pts}</span>
            </div>
          ))}
          {groupLines.length === 0 && <Empty t="No group points yet" />}
        </Category>

        <Category open={open.bracket} onToggle={() => setOpen(o => ({ ...o, bracket: !o.bracket }))}
          icon="🏆" iconBg="#fbf0d6" title="Bracket progression"
          sub={`${bracketLines.length} scoring team-round${bracketLines.length === 1 ? '' : 's'} · ${bracketLines.reduce((sum, row) => sum + Number(row.points || 0), 0)} pts itemised`}
          pts={totals.bracket}>
          {bracketLines.map(b => (
            <div key={b.id} style={lnStyle}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ fontWeight: '700', fontSize: '13px' }}>{b.team.flag_emoji} {b.team.short_code || b.team.name || 'Team'}</b>
                <span style={subLn}>{b.detail}</span>
              </div>
              <span style={tagStyle()}>{b.stageLabel}</span>
              <span style={vStyle}>+{b.points}</span>
            </div>
          ))}
          {bracketLines.length === 0 && <Empty t="No bracket progression points yet" />}
          {bracketLines.length > 0 &&
            bracketLines.reduce((sum, row) => sum + Number(row.points || 0), 0) !== Number(totals.bracket || 0) && (
              <div style={{
                padding: '10px 14px',
                background: 'rgba(184,134,11,0.08)',
                borderTop: '1px solid rgba(184,134,11,0.18)',
                color: 'var(--text-muted)',
                fontSize: '10.5px',
                lineHeight: 1.45,
              }}>
                Profile bracket total: <strong style={{ color: 'var(--accent-gold)' }}>+{totals.bracket}</strong>.
                The visible round records currently itemise +{bracketLines.reduce((sum, row) => sum + Number(row.points || 0), 0)}.
                The stored profile total remains the official score.
              </div>
            )}
        </Category>

        <Category open={open.awards} onToggle={() => setOpen(o => ({ ...o, awards: !o.awards }))}
          icon="🥇" iconBg="#f0f1f5" title="Champion, awards & goals" sub="Final tournament bonuses" pts={totals.bonus} muted={totals.bonus === 0}>
          {bonusPoints.champion > 0 && (
            <div style={lnStyle}><div style={{ flex: 1 }}><b style={{ fontWeight: '700', fontSize: '13px' }}>World Cup champion</b><span style={subLn}>Correct winner in the original bracket</span></div><span style={vStyle}>+25</span></div>
          )}
          {bonusPoints.awardLines.map(line => (
            <div key={line.award_type} style={lnStyle}>
              <div style={{ flex: 1 }}><b style={{ fontWeight: '700', fontSize: '13px' }}>{({ golden_boot: 'Golden Boot', golden_glove: 'Golden Glove', player_of_tournament: 'Player of the Tournament' })[line.award_type] || line.award_type}</b><span style={subLn}>Pick: {line.predicted_player_name} · Winner: {line.winner}</span></div>
              <span style={{ ...vStyle, color: line.points ? 'var(--accent-green)' : 'var(--text-muted)' }}>{line.points ? `+${line.points}` : '0'}</span>
            </div>
          ))}
          {bonusPoints.goalsReady ? (
            <div style={lnStyle}><div style={{ flex: 1 }}><b style={{ fontWeight: '700', fontSize: '13px' }}>Total tournament goals</b><span style={subLn}>Predicted {bonusPoints.goalPrediction ?? '—'} · Actual {bonusPoints.actualGoals}</span></div><span style={{ ...vStyle, color: bonusPoints.goals ? 'var(--accent-green)' : 'var(--text-muted)' }}>{bonusPoints.goals ? `+${bonusPoints.goals}` : '0'}</span></div>
          ) : (
            <div style={lnStyle}><div style={{ flex: 1 }}><b style={{ fontWeight: '700', fontSize: '13px' }}>Final bonuses</b><span style={subLn}>Pending final settlement</span></div><span style={{ ...vStyle, color: 'var(--text-muted)' }}>pending</span></div>
          )}
        </Category>

        <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', padding: '6px 24px' }}>
          Bracket points are awarded each time one of your predicted teams reaches a scored round.
        </div>
      </div>
    </div>
  )
}

const lnStyle = { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderBottom: '1px solid var(--border-light)', fontSize: '13px' }
const subLn = { display: 'block', color: 'var(--text-muted)', fontSize: '11px', marginTop: '1px' }
const vStyle = { ...mono, fontWeight: '800', fontSize: '13.5px', color: 'var(--accent-green)', whiteSpace: 'nowrap' }
const tagStyle = () => ({ fontSize: '9px', fontWeight: '900', letterSpacing: '0.04em', padding: '2px 6px', borderRadius: '20px', background: 'rgba(0,122,51,0.1)', color: 'var(--accent-green)', whiteSpace: 'nowrap' })

function Legend({ c, label, v }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.8)' }}>
      <i style={{ width: '9px', height: '9px', borderRadius: '3px', background: c, display: 'inline-block' }} />{label} {v}
    </span>
  )
}

function Category({ icon, iconBg, title, sub, pts, muted, open, onToggle, children }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '16px', margin: '10px 16px', overflow: 'hidden' }}>
      <div onClick={onToggle} role="button" tabIndex={0} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 15px', cursor: 'pointer' }}>
        <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <b style={{ fontSize: '14.5px', fontWeight: '800', display: 'block' }}>{title}</b>
          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: '600' }}>{sub}</span>
        </div>
        <span style={{ ...mono, fontWeight: '800', fontSize: '17px', color: muted ? 'var(--text-muted)' : 'var(--accent-green)' }}>{pts > 0 ? `+${pts}` : '0'}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '12px', transform: open ? 'rotate(90deg)' : 'none', transition: '0.2s' }}>▶</span>
      </div>
      {open && <div style={{ borderTop: '1px solid var(--border-light)', background: 'var(--bg-secondary)' }}>{children}</div>}
    </div>
  )
}

function Empty({ t }) {
  return <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>{t}</div>
}

function Tile({ n, l, s }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '15px', padding: '13px' }}>
      <div style={{ ...mono, fontSize: '24px', fontWeight: 800, color: 'var(--scottish-navy)' }}>{n}</div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, marginTop: '1px' }}>{l}</div>
      {s && <div style={{ fontSize: '10.5px', color: 'var(--accent-green)', fontWeight: 800, marginTop: '3px' }}>{s}</div>}
    </div>
  )
}

function Call({ tone, c }) {
  const good = tone === 'good'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '10px', borderRadius: '12px', background: good ? '#e7f5ec' : '#fbeae6', marginTop: '8px' }}>
      <span style={{ fontSize: '20px' }}>{good ? (c.exact ? '🎯' : '✅') : '😬'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '12.5px' }}>{c.label}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>You: {c.you}{c.joker ? ' · 🃏' : ''}{good ? '' : ' · didn\u2019t land'}</div>
      </div>
      <span style={{ ...mono, fontWeight: 800, fontSize: '13px', color: good ? 'var(--accent-green)' : 'var(--text-muted)' }}>{c.pts > 0 ? '+' : ''}{c.pts}</span>
    </div>
  )
}

function fmtDate(d) {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) } catch { return d }
}
