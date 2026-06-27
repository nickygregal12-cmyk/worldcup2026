import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/index.js'
import { calcPredictedStandings, getBest3rdTeams } from '../lib/bracketUtils.js'

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
  const [open, setOpen] = useState({ match: true, group: false, bracket: false, awards: false })

  // search
  const [showSearch, setShowSearch] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])

  const load = useCallback(async (uid) => {
    setLoading(true)
    const [{ data: prof }, { data: preds }, { data: gpos }, { data: groupMatchRows }, { data: r32Rows }, { data: gsRows }] = await Promise.all([
      supabase.from('profiles').select('id, username, display_name, avatar_emoji, total_points, group_position_points, bracket_points, exact_scores, streak_current').eq('id', uid).maybeSingle(),
      supabase.from('predictions').select('home_score, away_score, is_confident, points_awarded, match:match_id(match_number, kickoff_time, stage, status, home_score, away_score, home_team:home_team_id(short_code, flag_emoji), away_team:away_team_id(short_code, flag_emoji))').eq('user_id', uid),
      supabase.from('predicted_group_positions').select('group_name, predicted_position, points_awarded, team:team_id(short_code, flag_emoji)').eq('user_id', uid).order('group_name').order('predicted_position'),
      supabase.from('matches').select('id, match_number, stage, status, home_score, away_score, home_team_id, away_team_id, group:group_id(name), home_team:home_team_id(id, name, short_code, flag_emoji), away_team:away_team_id(id, name, short_code, flag_emoji)').eq('stage', 'group'),
      supabase.from('matches').select('home_team_id, away_team_id, group:group_id(name)').eq('stage', 'r32'),
      supabase.from('group_standings').select('team_id, position, played, group:group_id(name)').eq('played', 3).lte('position', 2),
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

    // ── Bracket progression lines (predicted teams that reached the R32) ──
    const groupMatches = groupMatchRows || []
    // predictions keyed by match id for standings
    const { data: gp2 } = await supabase.from('predictions').select('match_id, home_score, away_score').eq('user_id', uid)
    const predMap = {}
    ;(gp2 || []).forEach(p => { if (p.home_score != null && p.away_score != null) predMap[p.match_id] = { home: p.home_score, away: p.away_score } })

    const standings = calcPredictedStandings(groupMatches, predMap, true)
    const confirmed = new Set()
    ;(r32Rows || []).forEach(r => { if (r.home_team_id) confirmed.add(r.home_team_id); if (r.away_team_id) confirmed.add(r.away_team_id) })
    ;(gsRows || []).forEach(r => { if (r.team_id) confirmed.add(r.team_id) })

    const teamMeta = {}
    groupMatches.forEach(m => {
      if (m.home_team) teamMeta[m.home_team_id] = { ...m.home_team, group: m.group?.name }
      if (m.away_team) teamMeta[m.away_team_id] = { ...m.away_team, group: m.group?.name }
    })

    const bl = []
    const seen = new Set()
    for (const [grp, arr] of Object.entries(standings)) {
      ;(arr || []).slice(0, 2).forEach((e, i) => {
        const tid = e?.id
        if (tid && !seen.has(tid)) {
          seen.add(tid)
          if (confirmed.has(tid)) bl.push({ id: tid, team: e.team || teamMeta[tid] || {}, detail: `${i === 0 ? 'Won' : 'Runner-up'} Group ${grp} → R32`, kind: 'pos' })
        }
      })
    }
    getBest3rdTeams(standings).slice(0, 8).forEach(t => {
      const tid = t?.id
      if (tid && !seen.has(tid)) {
        seen.add(tid)
        if (confirmed.has(tid)) bl.push({ id: tid, team: t.team || teamMeta[tid] || {}, detail: `Best third (Group ${t.group}) → R32`, kind: '3rd' })
      }
    })
    setBracketLines(bl)
    setLoading(false)
  }, [])

  useEffect(() => { if (targetId) load(targetId) }, [targetId, load])

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
    const match = Math.max(total - group - bracket, 0)
    return { total, group, bracket, match }
  }, [profile])

  const name = profile?.display_name || profile?.username || 'Player'
  const isMe = targetId === user?.id

  if (loading) return <div style={{ minHeight: '70vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><div className="spinner" /></div>

  const barTotal = Math.max(totals.match + totals.group + totals.bracket, 1)
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
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', marginTop: '8px', flexWrap: 'wrap' }}>
          <Legend c="#dfe6f5" label="Matches" v={totals.match} />
          <Legend c={GOLD} label="Groups" v={totals.group} />
          <Legend c="#4caf7d" label="Bracket" v={totals.bracket} />
        </div>
      </div>

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
          icon="🏆" iconBg="#fbf0d6" title="Bracket progression" sub={`${bracketLines.length} teams reached the R32 · 5pts each`} pts={totals.bracket}>
          {bracketLines.map(b => (
            <div key={b.id} style={lnStyle}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ fontWeight: '700', fontSize: '13px' }}>{b.team.flag_emoji} {b.team.short_code || b.team.name}</b>
                <span style={subLn}>{b.detail}</span>
              </div>
              {b.kind === '3rd' && <span style={tagStyle('3RD')}>3RD</span>}
              <span style={vStyle}>+5</span>
            </div>
          ))}
          {bracketLines.length === 0 && <Empty t="No teams through to the R32 yet" />}
        </Category>

        <Category open={open.awards} onToggle={() => setOpen(o => ({ ...o, awards: !o.awards }))}
          icon="🥇" iconBg="#f0f1f5" title="Awards & goals" sub="Settle after the final" pts={0} muted>
          <div style={lnStyle}><div style={{ flex: 1 }}><b style={{ fontWeight: '700', fontSize: '13px' }}>Golden Boot, Best Player…</b><span style={subLn}>Locked until the tournament ends</span></div><span style={{ ...vStyle, color: 'var(--text-muted)' }}>pending</span></div>
        </Category>

        <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', padding: '6px 24px' }}>
          Bracket points climb as more groups finish and the knockouts play out.
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
