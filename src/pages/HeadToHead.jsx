import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/index.js'

const ME_C = 'var(--accent-gold)'
const THEM_C = '#7a4fd0'
const mono = { fontFamily: 'var(--font-mono, ui-monospace, monospace)' }
const sgn = n => (n > 0 ? 1 : n < 0 ? -1 : 0)
const leagueStored = lg => (lg.scoring_preset && lg.scoring_preset !== 'standard') || lg.lock_type === 'pre_tournament'

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
  const [leagues, setLeagues] = useState([]) // { id, name, stored, meRank, themRank, meLeaguePts, themLeaguePts, members }
  const [scope, setScope] = useState('overall')

  const load = useCallback(async () => {
    if (!meId || !themId) return
    setLoading(true)

    const [{ data: profs }, { data: allTotals }, { data: preds }, { data: myMemberships }] = await Promise.all([
      supabase.from('profiles').select('id, username, display_name, avatar_emoji, total_points, group_position_points, bracket_points, exact_scores').in('id', [meId, themId]),
      supabase.from('profiles').select('id, total_points'),
      supabase.from('predictions').select('user_id, match_id, home_score, away_score, points_awarded, is_confident, match:match_id(match_number, kickoff_time, status, home_score, away_score, home_team:home_team_id(short_code, flag_emoji), away_team:away_team_id(short_code, flag_emoji))').in('user_id', [meId, themId]),
      supabase.from('league_members').select('league_id').eq('user_id', meId),
    ])

    const pmap = {}
    ;(profs || []).forEach(p => { pmap[p.id] = p })
    setMe(pmap[meId]); setThem(pmap[themId])

    const totalMap = {}
    ;(allTotals || []).forEach(r => { totalMap[r.id] = r.total_points || 0 })

    // ── split predictions ──
    const mePreds = [], themPreds = []
    ;(preds || []).forEach(p => (p.user_id === meId ? mePreds : themPreds).push(p))

    // ── matchday record from dated, completed match points ──
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
    const meDay = dayMap(mePreds), themDay = dayMap(themPreds)
    const days = [...new Set([...Object.keys(meDay), ...Object.keys(themDay)])].sort()
    let win = 0, draw = 0, loss = 0
    const sw = []
    days.forEach(d => {
      const a = meDay[d] || 0, b = themDay[d] || 0
      if (a > b) win++; else if (a === b) draw++; else loss++
      sw.push({ date: d, me: a, them: b, diff: a - b })
    })
    setRecord({ win, draw, loss })
    setSwings([...sw].sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff)).slice(0, 2))

    // ── next deciders (upcoming, both predicted, result differs) ──
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
    setDeciders(dec.slice(0, 3))

    // ── shared leagues + ranks ──
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
        const rows = (memsByLeague[lid] || []).map(m => ({ uid: m.user_id, pts: stored ? (m.league_points || 0) : (totalMap[m.user_id] || 0) }))
        rows.sort((a, b) => b.pts - a.pts)
        const meRank = rows.findIndex(r => r.uid === meId) + 1
        const themRank = rows.findIndex(r => r.uid === themId) + 1
        const meRow = rows.find(r => r.uid === meId), themRow = rows.find(r => r.uid === themId)
        return { id: lid, name: lg.name || 'League', stored, meRank, themRank, members: rows.length, meLeaguePts: meRow?.pts || 0, themLeaguePts: themRow?.pts || 0 }
      }).filter(l => l.meRank && l.themRank)
      setLeagues(built)
    }

    setLoading(false)
  }, [meId, themId])

  useEffect(() => { load() }, [load])

  const meName = me?.display_name || me?.username || 'You'
  const themName = them?.display_name || them?.username || 'Player'

  const headline = useMemo(() => {
    if (scope === 'overall' || !me || !them) {
      return { meTotal: me?.total_points || 0, themTotal: them?.total_points || 0, meRank: null, themRank: null, label: 'Overall' }
    }
    const lg = leagues.find(l => l.id === scope)
    if (!lg) return { meTotal: me?.total_points || 0, themTotal: them?.total_points || 0 }
    return { meTotal: lg.meLeaguePts, themTotal: lg.themLeaguePts, meRank: lg.meRank, themRank: lg.themRank, members: lg.members, label: lg.name }
  }, [scope, me, them, leagues])

  const cats = useMemo(() => {
    if (!me || !them) return []
    const mk = p => ({ match: (p.total_points || 0) - (p.group_position_points || 0) - (p.bracket_points || 0), group: p.group_position_points || 0, bracket: p.bracket_points || 0 })
    const a = mk(me), b = mk(them)
    return [
      { key: 'match', label: 'Match predictions', me: a.match, them: b.match },
      { key: 'group', label: 'Group positions', me: a.group, them: b.group },
      { key: 'bracket', label: 'Bracket', me: a.bracket, them: b.bracket },
    ]
  }, [me, them])

  if (loading) return <div style={{ minHeight: '70vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><div className="spinner" /></div>

  if (themId === meId) {
    return <div className="container" style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
      <p>That's you! Pick another player to see a head-to-head.</p>
      <Link to="/leaderboard" style={{ color: 'var(--scottish-navy)', fontWeight: 700 }}>Go to leaderboard →</Link>
    </div>
  }

  const gap = headline.meTotal - headline.themTotal
  const gapLabel = gap > 0 ? `You lead by ${gap}` : gap < 0 ? `Behind by ${Math.abs(gap)}` : 'Dead level'
  const avatar = (p, c) => <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: c, color: c === ME_C ? 'var(--scottish-navy)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '20px', margin: '0 auto 7px' }}>{p?.avatar_emoji || ((p?.display_name || p?.username || '?')[0].toUpperCase())}</div>

  return (
    <div style={{ paddingBottom: '90px', background: 'var(--bg-secondary)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(160deg, var(--scottish-navy-light, #123089), var(--scottish-navy))', color: '#fff', padding: '14px 16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 0, color: 'rgba(255,255,255,0.85)', fontSize: '20px', cursor: 'pointer' }}>‹</button>
          <div style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' }}>Head to head</div>
        </div>

        {/* scope toggle */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '16px' }}>
          {['overall', ...leagues.map(l => l.id)].map(s => {
            const on = scope === s
            const lbl = s === 'overall' ? 'Overall' : leagues.find(l => l.id === s)?.name
            return <button key={s} onClick={() => setScope(s)} style={{ flex: '0 0 auto', border: 0, borderRadius: '20px', padding: '6px 14px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', background: on ? 'var(--accent-gold)' : 'rgba(255,255,255,0.12)', color: on ? 'var(--scottish-navy)' : '#fff' }}>{lbl}</button>
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
          <span style={{ display: 'inline-block', background: gap >= 0 ? 'rgba(242,183,5,0.18)' : 'rgba(122,79,208,0.25)', color: gap >= 0 ? 'var(--accent-gold)' : '#c9b3f0', fontWeight: 800, fontSize: '12px', padding: '5px 13px', borderRadius: '20px' }}>{gapLabel}{scope !== 'overall' ? ` · ${headline.label}` : ''}</span>
        </div>
      </div>

      {/* Category duel */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '16px', margin: '12px 14px', padding: '15px' }}>
        <div style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>Where the points come from</div>
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
      </div>

      {/* Matchday record */}
      {(record.win + record.draw + record.loss) > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '16px', margin: '12px 14px', padding: '15px' }}>
          <div style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>Matchday head-to-head</div>
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px' }}>
            {record.win > record.loss ? 'You win more matchdays' : record.win < record.loss ? `${themName} wins more matchdays` : 'Neck and neck'} · {record.win}–{record.draw}–{record.loss}
          </div>
          <div style={{ display: 'flex', height: '30px', borderRadius: '8px', overflow: 'hidden', fontWeight: 900, fontSize: '12px', color: '#fff' }}>
            <div style={{ width: `${record.win / (record.win + record.draw + record.loss) * 100}%`, background: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: record.win ? '36px' : 0 }}>{record.win || ''}</div>
            <div style={{ width: `${record.draw / (record.win + record.draw + record.loss) * 100}%`, background: '#aeb6c8', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: record.draw ? '30px' : 0 }}>{record.draw || ''}</div>
            <div style={{ width: `${record.loss / (record.win + record.draw + record.loss) * 100}%`, background: THEM_C, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: record.loss ? '36px' : 0 }}>{record.loss || ''}</div>
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
        </div>
      )}

      {/* Next deciders */}
      {deciders.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '16px', margin: '12px 14px', padding: '15px' }}>
          <div style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px' }}>Upcoming deciders · you disagree</div>
          {deciders.map((d, i) => (
            <div key={d.me.match_id} style={{ marginTop: i ? '12px' : 0 }}>
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
        </div>
      )}

      <div style={{ textAlign: 'center', padding: '4px 24px' }}>
        <Link to={`/points/${themId}`} style={{ fontSize: '12px', fontWeight: 700, color: 'var(--scottish-navy)', textDecoration: 'none' }}>See {themName}'s full points breakdown →</Link>
      </div>
    </div>
  )
}

function fmtDate(d) {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) } catch { return d }
}
