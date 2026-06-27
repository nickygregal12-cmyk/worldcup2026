import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/index.js'

const ME_C = 'var(--accent-gold)'
const THEM_C = '#7a4fd0'
const mono = { fontFamily: 'var(--font-mono, ui-monospace, monospace)' }
const sgn = n => (n > 0 ? 1 : n < 0 ? -1 : 0)
const leagueStored = lg => (lg.scoring_preset && lg.scoring_preset !== 'standard') || lg.lock_type === 'pre_tournament'

const STAGE_LABELS = {
  r32: 'Round of 16 picks',
  r16: 'Quarter-final picks',
  qf: 'Semi-final picks',
  sf: 'Final picks',
  final: 'Champion pick',
}

const AWARD_LABELS = {
  golden_boot: 'Golden Boot',
  golden_glove: 'Golden Glove',
  player_of_tournament: 'Player of the Tournament',
}

export default function HeadToHead() {
  const { userId: themId } = useParams()
  const { user } = useAuthStore()
  const meId = user?.id
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState(null)
  const [them, setThem] = useState(null)
  const [record, setRecord] = useState({ win: 0, draw: 0, loss: 0 })
  const [swings, setSwings] = useState([])
  const [deciders, setDeciders] = useState([])
  const [leagues, setLeagues] = useState([])
  const [scope, setScope] = useState('overall')
  const [accuracy, setAccuracy] = useState({
    me: { exact: 0, result: 0, jokers: 0, completed: 0 },
    them: { exact: 0, result: 0, jokers: 0, completed: 0 },
  })
  const [bracketRows, setBracketRows] = useState([])
  const [awardRows, setAwardRows] = useState([])
  const [goalComparison, setGoalComparison] = useState(null)
  const [koDifferences, setKoDifferences] = useState([])

  const load = useCallback(async () => {
    if (!meId || !themId) return
    setLoading(true)

    const [
      { data: profs },
      { data: allTotals },
      { data: preds },
      { data: myMemberships },
      { data: koPicks },
      { data: koMatches },
      { data: awardPreds },
      { data: awardResults },
      { data: goalPreds },
      { data: scorerRows },
    ] = await Promise.all([
      supabase.from('profiles')
        .select('id, username, display_name, avatar_emoji, total_points, group_position_points, bracket_points, exact_scores')
        .in('id', [meId, themId]),
      supabase.from('profiles').select('id, total_points'),
      supabase.from('predictions')
        .select('user_id, match_id, home_score, away_score, points_awarded, is_confident, match:match_id(id, match_number, kickoff_time, stage, status, home_score, away_score, winner_team_id, home_team_id, away_team_id, home_team:home_team_id(short_code, flag_emoji, name), away_team:away_team_id(short_code, flag_emoji, name))')
        .in('user_id', [meId, themId]),
      supabase.from('league_members').select('league_id').eq('user_id', meId),
      supabase.from('knockout_picks')
        .select('user_id, match_number, stage, winner_team_id, team:winner_team_id(id, name, short_code, flag_emoji)')
        .in('user_id', [meId, themId]),
      supabase.from('matches')
        .select('id, match_number, stage, status, kickoff_time, home_team_id, away_team_id, winner_team_id, home_team:home_team_id(id,name,short_code,flag_emoji), away_team:away_team_id(id,name,short_code,flag_emoji)')
        .in('stage', ['r32', 'r16', 'qf', 'sf', 'final']),
      supabase.from('award_predictions')
        .select('user_id, award_type, predicted_player_name')
        .in('user_id', [meId, themId]),
      supabase.from('award_results')
        .select('award_type, winner_name, points_value'),
      supabase.from('tournament_predictions')
        .select('user_id, prediction_type, int_value')
        .in('user_id', [meId, themId])
        .eq('prediction_type', 'total_goals'),
      supabase.from('tournament_scorers')
        .select('name, goals')
        .order('goals', { ascending: false })
        .limit(8),
    ])

    const pmap = {}
    ;(profs || []).forEach(p => { pmap[p.id] = p })
    setMe(pmap[meId])
    setThem(pmap[themId])

    const totalMap = {}
    ;(allTotals || []).forEach(r => { totalMap[r.id] = r.total_points || 0 })

    const mePreds = []
    const themPreds = []
    ;(preds || []).forEach(p => (p.user_id === meId ? mePreds : themPreds).push(p))

    const statsFor = list => {
      let exact = 0
      let result = 0
      let jokers = 0
      let completed = 0

      list.forEach(p => {
        const mt = p.match
        if (!mt || mt.status !== 'completed' || mt.home_score == null || mt.away_score == null) return
        completed++
        const isExact = p.home_score === mt.home_score && p.away_score === mt.away_score
        const isResult = sgn(p.home_score - p.away_score) === sgn(mt.home_score - mt.away_score)
        if (isExact) exact++
        else if (isResult) result++
        if (p.is_confident && (p.points_awarded || 0) > 0) jokers++
      })

      return { exact, result, jokers, completed }
    }

    setAccuracy({ me: statsFor(mePreds), them: statsFor(themPreds) })

    const dayMap = list => {
      const m = {}
      list.forEach(p => {
        const mt = p.match
        if (mt && mt.status === 'completed' && p.points_awarded != null) {
          const d = (mt.kickoff_time || '').slice(0, 10)
          m[d] = (m[d] || 0) + p.points_awarded
        }
      })
      return m
    }

    const meDay = dayMap(mePreds)
    const themDay = dayMap(themPreds)
    const days = [...new Set([...Object.keys(meDay), ...Object.keys(themDay)])].sort()
    let win = 0
    let draw = 0
    let loss = 0
    const sw = []

    days.forEach(d => {
      const a = meDay[d] || 0
      const b = themDay[d] || 0
      if (a > b) win++
      else if (a === b) draw++
      else loss++
      sw.push({ date: d, me: a, them: b, diff: a - b })
    })

    setRecord({ win, draw, loss })
    setSwings([...sw].sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff)).slice(0, 3))

    const themByMatch = {}
    themPreds.forEach(p => { themByMatch[p.match_id] = p })
    const dec = []

    mePreds.forEach(p => {
      const mt = p.match
      if (!mt) return
      const upcoming = mt.status === 'scheduled' || (mt.status !== 'completed' && new Date(mt.kickoff_time) > new Date())
      if (!upcoming) return
      const tp = themByMatch[p.match_id]
      if (!tp) return
      const resultDiffers = sgn(p.home_score - p.away_score) !== sgn(tp.home_score - tp.away_score)
      const scoreDiffers = p.home_score !== tp.home_score || p.away_score !== tp.away_score
      if (resultDiffers || scoreDiffers) dec.push({ match: mt, me: p, them: tp, resultDiffers })
    })

    dec.sort((a, b) => (b.resultDiffers - a.resultDiffers) || (new Date(a.match.kickoff_time) - new Date(b.match.kickoff_time)))
    setDeciders(dec.slice(0, 4))

    const completedKo = (koMatches || []).filter(m => m.status === 'completed' && m.winner_team_id)
    const eliminated = new Set()
    completedKo.forEach(m => {
      if (m.home_team_id && m.home_team_id !== m.winner_team_id) eliminated.add(m.home_team_id)
      if (m.away_team_id && m.away_team_id !== m.winner_team_id) eliminated.add(m.away_team_id)
    })

    const byUserStage = {}
    ;(koPicks || []).forEach(p => {
      if (!p.user_id || !p.stage || !p.winner_team_id) return
      const key = `${p.user_id}:${p.stage}`
      ;(byUserStage[key] ||= []).push(p)
    })

    const rows = ['r32', 'r16', 'qf', 'sf', 'final'].map(stage => {
      const mine = byUserStage[`${meId}:${stage}`] || []
      const theirs = byUserStage[`${themId}:${stage}`] || []
      const mineIds = new Set(mine.map(p => p.winner_team_id))
      const theirIds = new Set(theirs.map(p => p.winner_team_id))
      const shared = [...mineIds].filter(id => theirIds.has(id))
      const myOnly = mine.filter(p => !theirIds.has(p.winner_team_id))
      const theirOnly = theirs.filter(p => !mineIds.has(p.winner_team_id))
      return {
        stage,
        label: STAGE_LABELS[stage],
        meCount: mineIds.size,
        themCount: theirIds.size,
        meAlive: mine.filter(p => !eliminated.has(p.winner_team_id)).length,
        themAlive: theirs.filter(p => !eliminated.has(p.winner_team_id)).length,
        shared,
        myOnly,
        theirOnly,
      }
    })
    setBracketRows(rows)

    const koDiffs = []
    const allMatchNums = [...new Set((koPicks || []).map(p => p.match_number).filter(Boolean))]
    allMatchNums.forEach(matchNumber => {
      const mine = (koPicks || []).find(p => p.user_id === meId && p.match_number === matchNumber)
      const theirs = (koPicks || []).find(p => p.user_id === themId && p.match_number === matchNumber)
      if (!mine || !theirs || mine.winner_team_id === theirs.winner_team_id) return
      const actual = (koMatches || []).find(m => m.match_number === matchNumber)
      koDiffs.push({ matchNumber, mine, theirs, actual })
    })
    setKoDifferences(koDiffs.slice(0, 6))

    const awardsByUser = {}
    ;(awardPreds || []).forEach(a => {
      awardsByUser[`${a.user_id}:${a.award_type}`] = a.predicted_player_name
    })
    const resultMap = {}
    ;(awardResults || []).forEach(r => { resultMap[r.award_type] = r })

    const scorerMap = {}
    ;(scorerRows || []).forEach(s => { scorerMap[String(s.name || '').toLowerCase()] = s.goals })

    setAwardRows(['golden_boot', 'golden_glove', 'player_of_tournament'].map(type => {
      const myPick = awardsByUser[`${meId}:${type}`] || 'Not set'
      const theirPick = awardsByUser[`${themId}:${type}`] || 'Not set'
      return {
        type,
        label: AWARD_LABELS[type],
        myPick,
        theirPick,
        myGoals: type === 'golden_boot' ? scorerMap[String(myPick).toLowerCase()] : null,
        theirGoals: type === 'golden_boot' ? scorerMap[String(theirPick).toLowerCase()] : null,
        actual: resultMap[type]?.winner_name || null,
      }
    }))

    const goalMap = {}
    ;(goalPreds || []).forEach(g => { goalMap[g.user_id] = g.int_value })
    const uniqueCompleted = {}
    ;(preds || []).forEach(p => {
      const mt = p.match
      if (mt?.status === 'completed' && mt.home_score != null && mt.away_score != null) uniqueCompleted[mt.id] = mt
    })
    const actualGoals = Object.values(uniqueCompleted).reduce((sum, m) => sum + m.home_score + m.away_score, 0)
    setGoalComparison({
      me: goalMap[meId] ?? null,
      them: goalMap[themId] ?? null,
      actual: actualGoals,
      completedMatches: Object.keys(uniqueCompleted).length,
    })

    const myLeagueIds = (myMemberships || []).map(r => r.league_id)
    if (myLeagueIds.length) {
      const [{ data: theirMems }, { data: leagueMeta }, { data: allMems }] = await Promise.all([
        supabase.from('league_members').select('league_id').eq('user_id', themId).in('league_id', myLeagueIds),
        supabase.from('leagues').select('id, name, scoring_preset, lock_type').in('id', myLeagueIds),
        supabase.from('league_members').select('league_id, user_id, league_points').in('league_id', myLeagueIds),
      ])

      const sharedIds = new Set((theirMems || []).map(r => r.league_id))
      const metaMap = {}
      ;(leagueMeta || []).forEach(l => { metaMap[l.id] = l })
      const memsByLeague = {}
      ;(allMems || []).forEach(m => { (memsByLeague[m.league_id] ||= []).push(m) })

      const built = [...sharedIds].map(lid => {
        const lg = metaMap[lid] || {}
        const stored = leagueStored(lg)
        const rowsForLeague = (memsByLeague[lid] || []).map(m => ({
          uid: m.user_id,
          pts: stored ? (m.league_points || 0) : (totalMap[m.user_id] || 0),
        }))
        rowsForLeague.sort((a, b) => b.pts - a.pts)
        const meRank = rowsForLeague.findIndex(r => r.uid === meId) + 1
        const themRank = rowsForLeague.findIndex(r => r.uid === themId) + 1
        const meRow = rowsForLeague.find(r => r.uid === meId)
        const themRow = rowsForLeague.find(r => r.uid === themId)
        return {
          id: lid,
          name: lg.name || 'League',
          stored,
          meRank,
          themRank,
          members: rowsForLeague.length,
          meLeaguePts: meRow?.pts || 0,
          themLeaguePts: themRow?.pts || 0,
        }
      }).filter(l => l.meRank && l.themRank)

      setLeagues(built)
    }

    setLoading(false)
  }, [meId, themId])

  useEffect(() => { load() }, [load])

  const themName = them?.display_name || them?.username || 'Player'

  const headline = useMemo(() => {
    if (scope === 'overall' || !me || !them) {
      return {
        meTotal: me?.total_points || 0,
        themTotal: them?.total_points || 0,
        meRank: null,
        themRank: null,
        label: 'Overall',
      }
    }
    const lg = leagues.find(l => l.id === scope)
    if (!lg) return { meTotal: me?.total_points || 0, themTotal: them?.total_points || 0 }
    return {
      meTotal: lg.meLeaguePts,
      themTotal: lg.themLeaguePts,
      meRank: lg.meRank,
      themRank: lg.themRank,
      members: lg.members,
      label: lg.name,
    }
  }, [scope, me, them, leagues])

  const cats = useMemo(() => {
    if (!me || !them) return []
    const mk = p => ({
      match: (p.total_points || 0) - (p.group_position_points || 0) - (p.bracket_points || 0),
      group: p.group_position_points || 0,
      bracket: p.bracket_points || 0,
    })
    const a = mk(me)
    const b = mk(them)
    return [
      { key: 'match', label: 'Match predictions', me: a.match, them: b.match },
      { key: 'group', label: 'Group positions', me: a.group, them: b.group },
      { key: 'bracket', label: 'Bracket', me: a.bracket, them: b.bracket },
    ]
  }, [me, them])

  if (loading) {
    return <div style={{ minHeight: '70vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><div className="spinner" /></div>
  }

  if (themId === meId) {
    return (
      <div className="container" style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>That's you! Pick another player to see a head-to-head.</p>
        <Link to="/leaderboard" style={{ color: 'var(--scottish-navy)', fontWeight: 700 }}>Go to leaderboard →</Link>
      </div>
    )
  }

  const gap = headline.meTotal - headline.themTotal
  const gapLabel = gap > 0 ? `You lead by ${gap}` : gap < 0 ? `Behind by ${Math.abs(gap)}` : 'Dead level'
  const avatar = (p, c) => (
    <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: c, color: c === ME_C ? 'var(--scottish-navy)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '20px', margin: '0 auto 7px' }}>
      {p?.avatar_emoji || ((p?.display_name || p?.username || '?')[0].toUpperCase())}
    </div>
  )

  const totalMatchdays = record.win + record.draw + record.loss

  return (
    <div style={{ paddingBottom: '90px', background: 'var(--bg-secondary)', minHeight: '100vh' }}>
      <div style={{ background: 'linear-gradient(160deg, var(--scottish-navy-light, #123089), var(--scottish-navy))', color: '#fff', padding: '14px 16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 0, color: 'rgba(255,255,255,0.85)', fontSize: '20px', cursor: 'pointer' }}>‹</button>
          <div style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' }}>Head to head</div>
        </div>

        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '16px' }}>
          {['overall', ...leagues.map(l => l.id)].map(s => {
            const on = scope === s
            const lbl = s === 'overall' ? 'Overall' : leagues.find(l => l.id === s)?.name
            return (
              <button key={s} onClick={() => setScope(s)} style={{ flex: '0 0 auto', border: 0, borderRadius: '20px', padding: '6px 14px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', background: on ? 'var(--accent-gold)' : 'rgba(255,255,255,0.12)', color: on ? 'var(--scottish-navy)' : '#fff' }}>
                {lbl}
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            {avatar(me, ME_C)}
            <div style={{ fontWeight: 800, fontSize: '14px' }}>You</div>
            <div style={{ ...mono, fontSize: '26px', fontWeight: 800, color: 'var(--accent-gold)' }}>{headline.meTotal}</div>
            {headline.meRank && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>#{headline.meRank} of {headline.members}</div>}
          </div>
          <div style={{ fontWeight: 900, fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>VS</div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            {avatar(them, THEM_C)}
            <div style={{ fontWeight: 800, fontSize: '14px' }}>{themName}</div>
            <div style={{ ...mono, fontSize: '26px', fontWeight: 800 }}>{headline.themTotal}</div>
            {headline.themRank && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>#{headline.themRank} of {headline.members}</div>}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '12px' }}>
          <span style={{ display: 'inline-block', background: gap >= 0 ? 'rgba(242,183,5,0.18)' : 'rgba(122,79,208,0.25)', color: gap >= 0 ? 'var(--accent-gold)' : '#c9b3f0', fontWeight: 800, fontSize: '12px', padding: '5px 13px', borderRadius: '20px' }}>
            {gapLabel}{scope !== 'overall' ? ` · ${headline.label}` : ''}
          </span>
        </div>
      </div>

      <Card title="Where the points come from">
        {cats.map(c => {
          const tot = Math.max(c.me + c.them, 1)
          return (
            <div key={c.key} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 800, marginBottom: '4px' }}>
                <span style={{ ...mono, color: c.me >= c.them ? 'var(--scottish-navy)' : 'var(--text-muted)' }}>{c.me}</span>
                <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>{c.label}</span>
                <span style={{ ...mono, color: c.them >= c.me ? THEM_C : 'var(--text-muted)' }}>{c.them}</span>
              </div>
              <div style={{ display: 'flex', height: '8px', borderRadius: '5px', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
                <div style={{ width: `${c.me / tot * 100}%`, background: ME_C }} />
                <div style={{ width: `${c.them / tot * 100}%`, background: THEM_C }} />
              </div>
            </div>
          )
        })}
      </Card>

      <Card title="Prediction accuracy">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px' }}>
          <ComparisonStat label="Exact scores" me={accuracy.me.exact} them={accuracy.them.exact} themName={themName} />
          <ComparisonStat label="Correct results" me={accuracy.me.result} them={accuracy.them.result} themName={themName} />
          <ComparisonStat label="Successful jokers" me={accuracy.me.jokers} them={accuracy.them.jokers} themName={themName} />
          <ComparisonStat label="Matches scored" me={accuracy.me.completed} them={accuracy.them.completed} themName={themName} />
        </div>
        <div style={{ marginTop: '10px', padding: '9px 10px', borderRadius: '10px', background: 'var(--bg-secondary)', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.45 }}>
          Exact scores and correct results are counted separately, so this explains how either player built their match-prediction total.
        </div>
      </Card>

      {totalMatchdays > 0 && (
        <Card title="Matchday head-to-head">
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px' }}>
            {record.win > record.loss ? 'You win more matchdays' : record.win < record.loss ? `${themName} wins more matchdays` : 'Neck and neck'} · {record.win}–{record.draw}–{record.loss}
          </div>
          <div style={{ display: 'flex', height: '30px', borderRadius: '8px', overflow: 'hidden', fontWeight: 900, fontSize: '12px', color: '#fff' }}>
            <div style={{ width: `${record.win / totalMatchdays * 100}%`, background: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: record.win ? '36px' : 0 }}>{record.win || ''}</div>
            <div style={{ width: `${record.draw / totalMatchdays * 100}%`, background: '#aeb6c8', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: record.draw ? '30px' : 0 }}>{record.draw || ''}</div>
            <div style={{ width: `${record.loss / totalMatchdays * 100}%`, background: THEM_C, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: record.loss ? '36px' : 0 }}>{record.loss || ''}</div>
          </div>

          {swings.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '2px' }}>Biggest swings</div>
              {swings.map(s => (
                <div key={s.date} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ ...mono, fontWeight: 800, fontSize: '12px', color: 'var(--text-muted)', width: '52px' }}>{fmtDate(s.date)}</span>
                  <span style={{ flex: 1, fontSize: '12.5px', fontWeight: 700, color: s.diff >= 0 ? 'var(--accent-green)' : THEM_C }}>{s.diff >= 0 ? 'You' : themName} +{Math.abs(s.diff)}</span>
                  <span style={{ ...mono, fontSize: '12px', color: 'var(--text-muted)' }}>{s.me} — {s.them}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {bracketRows.some(r => r.meCount || r.themCount) && (
        <Card title="Bracket comparison">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '9px' }}>
            {bracketRows.map(row => (
              <div key={row.stage} style={{ border: '1px solid var(--border-light)', borderRadius: '12px', padding: '11px 12px', background: 'var(--bg-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800 }}>{row.label}</div>
                  <div style={{ display: 'flex', gap: '10px', ...mono, fontWeight: 900 }}>
                    <span style={{ color: 'var(--scottish-navy)' }}>{row.meAlive}/{row.meCount}</span>
                    <span style={{ color: 'var(--text-muted)' }}>vs</span>
                    <span style={{ color: THEM_C }}>{row.themAlive}/{row.themCount}</span>
                  </div>
                </div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '4px' }}>Still alive / selected</div>
                {(row.myOnly.length > 0 || row.theirOnly.length > 0) && (
                  <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <TeamMiniList label="Your unique picks" picks={row.myOnly} colour="var(--scottish-navy)" />
                    <TeamMiniList label={`${themName}'s unique picks`} picks={row.theirOnly} colour={THEM_C} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {koDifferences.length > 0 && (
        <Card title="Knockout picks you disagree on">
          {koDifferences.map((d, index) => (
            <div key={d.matchNumber} style={{ padding: '10px 0', borderTop: index ? '1px solid var(--border-light)' : 'none' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '7px' }}>M{d.matchNumber}{d.actual?.stage ? ` · ${String(d.actual.stage).toUpperCase()}` : ''}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 34px 1fr', gap: '7px', alignItems: 'center' }}>
                <PickBox label="You" pick={d.mine} colour="var(--scottish-navy)" />
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontWeight: 900 }}>vs</div>
                <PickBox label={themName} pick={d.theirs} colour={THEM_C} />
              </div>
            </div>
          ))}
        </Card>
      )}

      {(awardRows.some(r => r.myPick !== 'Not set' || r.theirPick !== 'Not set') || goalComparison) && (
        <Card title="Awards & tournament totals">
          {awardRows.map((row, index) => (
            <div key={row.type} style={{ display: 'grid', gridTemplateColumns: '1fr 92px 92px', gap: '8px', alignItems: 'center', padding: '11px 0', borderTop: index ? '1px solid var(--border-light)' : 'none' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 800 }}>{row.label}</div>
                {row.actual && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>Result: {row.actual}</div>}
              </div>
              <AwardPick value={row.myPick} sub={row.myGoals != null ? `${row.myGoals} goals` : 'Your pick'} colour="var(--scottish-navy)" />
              <AwardPick value={row.theirPick} sub={row.theirGoals != null ? `${row.theirGoals} goals` : themName} colour={THEM_C} />
            </div>
          ))}

          {goalComparison && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 92px 92px', gap: '8px', alignItems: 'center', padding: '11px 0', borderTop: '1px solid var(--border-light)' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 800 }}>Total tournament goals</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>Actual so far: {goalComparison.actual} from {goalComparison.completedMatches} completed matches</div>
              </div>
              <AwardPick value={goalComparison.me ?? '—'} sub={goalComparison.me == null ? 'Not set' : `${Math.abs(goalComparison.me - goalComparison.actual)} away`} colour="var(--scottish-navy)" />
              <AwardPick value={goalComparison.them ?? '—'} sub={goalComparison.them == null ? 'Not set' : `${Math.abs(goalComparison.them - goalComparison.actual)} away`} colour={THEM_C} />
            </div>
          )}
        </Card>
      )}

      {deciders.length > 0 && (
        <Card title="Upcoming group-stage deciders">
          {deciders.map((d, i) => (
            <div key={d.me.match_id} style={{ marginTop: i ? '12px' : 0, paddingTop: i ? '12px' : 0, borderTop: i ? '1px solid var(--border-light)' : 'none' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, marginBottom: '6px' }}>
                {d.match.home_team?.flag_emoji} {d.match.home_team?.short_code} vs {d.match.away_team?.short_code} {d.match.away_team?.flag_emoji}
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}> · {fmtDate(d.match.kickoff_time)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '10px' }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800 }}>YOU</div>
                  <div style={{ ...mono, fontSize: '15px', fontWeight: 800, color: 'var(--accent-gold-dark, #a9871f)' }}>{d.me.home_score}–{d.me.away_score}{d.me.is_confident ? ' 🃏' : ''}</div>
                </div>
                <div style={{ color: 'var(--text-muted)', fontWeight: 900, fontSize: '12px' }}>vs</div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800 }}>{themName.toUpperCase()}</div>
                  <div style={{ ...mono, fontSize: '15px', fontWeight: 800, color: THEM_C }}>{d.them.home_score}–{d.them.away_score}{d.them.is_confident ? ' 🃏' : ''}</div>
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}

      <div style={{ textAlign: 'center', padding: '4px 24px' }}>
        <Link to={`/points/${themId}`} style={{ fontSize: '12px', fontWeight: 700, color: 'var(--scottish-navy)', textDecoration: 'none' }}>
          See {themName}'s full points breakdown →
        </Link>
      </div>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '16px', margin: '12px 14px', padding: '15px' }}>
      <div style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>{title}</div>
      {children}
    </div>
  )
}

function ComparisonStat({ label, me, them, themName }) {
  const lead = me - them
  const sub = lead > 0 ? `You lead by ${lead}` : lead < 0 ? `${themName} leads by ${Math.abs(lead)}` : 'Level'
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '11px' }}>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '7px', ...mono }}>
        <strong style={{ color: 'var(--scottish-navy)', fontSize: '20px' }}>{me}</strong>
        <strong style={{ color: THEM_C, fontSize: '20px' }}>{them}</strong>
      </div>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '5px' }}>{sub}</div>
    </div>
  )
}

function TeamMiniList({ label, picks, colour }) {
  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: '9px', padding: '8px' }}>
      <div style={{ fontSize: '9px', fontWeight: 800, color: colour, textTransform: 'uppercase', marginBottom: '5px' }}>{label}</div>
      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', lineHeight: 1.45 }}>
        {picks.length ? picks.slice(0, 5).map(p => `${p.team?.flag_emoji || ''} ${p.team?.short_code || p.team?.name || 'Team'}`).join(', ') : 'None'}
        {picks.length > 5 ? ` +${picks.length - 5}` : ''}
      </div>
    </div>
  )
}

function PickBox({ label, pick, colour }) {
  return (
    <div style={{ border: `1px solid ${colour}`, borderRadius: '10px', padding: '8px', textAlign: 'center', background: 'var(--bg-secondary)' }}>
      <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 800 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: '12px', fontWeight: 800, color: colour, marginTop: '4px' }}>
        {pick?.team?.flag_emoji} {pick?.team?.short_code || pick?.team?.name || '—'}
      </div>
    </div>
  )
}

function AwardPick({ value, sub, colour }) {
  return (
    <div style={{ textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '10px', padding: '8px 5px' }}>
      <div style={{ fontSize: '11px', fontWeight: 800, color: colour, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
      <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '3px' }}>{sub}</div>
    </div>
  )
}

function fmtDate(d) {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  } catch {
    return d
  }
}
