import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/index.js'

const STAGE_LABELS = { r32: 'Round of 32', r16: 'Round of 16', qf: 'Quarter-final', sf: 'Semi-final', '3rd': 'Third-place', final: 'Final' }

export default function MatchStats() {
  const { matchId: matchRef } = useParams()
  const [searchParams] = useSearchParams()
  const leagueCode = searchParams.get('league')
  const koLeagueCode = searchParams.get('koLeague')
  const navigate = useNavigate()

  const [slotIds, setSlotIds] = useState(null)
  const [loadingSlot, setLoadingSlot] = useState(true)

  useEffect(() => {
    const loadSlot = async () => {
      setLoadingSlot(true)
      // Match links now use the stable FIFA match number. Keep UUID support so
      // older saved/shared links continue to work as well.
      const isMatchNumber = /^\d+$/.test(String(matchRef || ''))
      let matchQuery = supabase
        .from('matches')
        .select('id, match_number, kickoff_time')

      matchQuery = isMatchNumber
        ? matchQuery.eq('match_number', Number(matchRef))
        : matchQuery.eq('id', matchRef)

      const { data: m } = await matchQuery.maybeSingle()
      if (!m) { setSlotIds([]); setLoadingSlot(false); return }
      // every match kicking off at the same instant — shown together
      const { data: siblings } = await supabase
        .from('matches').select('id, match_number').eq('kickoff_time', m.kickoff_time).order('match_number')
      const ids = (siblings || []).map(s => s.id)
      setSlotIds([m.id, ...ids.filter(i => i !== m.id)])
      setLoadingSlot(false)
    }
    if (matchRef) loadSlot()
  }, [matchRef])

  if (loadingSlot) {
    return <div className="container" style={{ padding: '40px 16px', textAlign: 'center' }}>
      <div className="spinner" style={{ margin: '0 auto' }} />
    </div>
  }

  return (
    <div className="container" style={{ padding: '16px 16px 40px', maxWidth: '560px' }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: '12px', color: 'var(--scottish-navy)', fontWeight: '700', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>← Back</button>

      {slotIds && slotIds.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', marginBottom: '14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
          ⏱️ <span>{slotIds.length} games kicking off together — all shown below.</span>
        </div>
      )}

      {(slotIds || []).map((id, i) => (
        <MatchCentre key={id} matchId={id} leagueCode={leagueCode} koLeagueCode={koLeagueCode} divider={i > 0} />
      ))}

      {slotIds && slotIds.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Match not found.</p>
      )}
    </div>
  )
}

function MatchCentre({ matchId, leagueCode, koLeagueCode, divider }) {
  const { user } = useAuthStore()

  const [loading, setLoading] = useState(true)
  const [match, setMatch] = useState(null)
  const [stats, setStats] = useState(null)
  const [scopeLabel, setScopeLabel] = useState('Everyone')
  const [ranked, setRanked] = useState([])
  const [myLine, setMyLine] = useState(null)
  const [notLocked, setNotLocked] = useState(false)
  const [scopeDenied, setScopeDenied] = useState(false)
  const [scopeMessage, setScopeMessage] = useState('')
  const [koScopeLabel, setKoScopeLabel] = useState('Everyone')
  const [showKoRivals, setShowKoRivals] = useState(true)
  const [koMine, setKoMine] = useState(null)
  const [koRivals, setKoRivals] = useState([])
  const [bracketImpact, setBracketImpact] = useState([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setNotLocked(false)
      setScopeDenied(false)
      setScopeMessage('')
      setScopeLabel('Everyone')
      setKoScopeLabel('Everyone')
      setShowKoRivals(true)
      setStats(null)
      setRanked([])
      setMyLine(null)
      setKoMine(null)
      setKoRivals([])
      setBracketImpact([])

      const { data: m } = await supabase
        .from('matches')
        .select('id, match_number, stage, home_score, away_score, home_penalty_score, away_penalty_score, winner_team_id, status, kickoff_time, live_minute, injury_time, home_team_id, away_team_id, home_team:home_team_id(name, flag_emoji, short_code), away_team:away_team_id(name, flag_emoji, short_code)')
        .eq('id', matchId).maybeSingle()
      setMatch(m)

      const locked = m && (m.status === 'live' || m.status === 'completed' || new Date(m.kickoff_time) <= new Date())
      if (!locked) { setNotLocked(true); setLoading(false); return }

      // Scope tournament stats and KO Predictor stats separately.
      let userIdFilter = null
      if (m.stage === 'group' && leagueCode) {
        const { data: league } = await supabase.from('leagues').select('id, name').eq('invite_code', leagueCode).maybeSingle()
        if (!league) {
          setScopeDenied(true)
          setScopeMessage('League not found.')
          setLoading(false)
          return
        }
        const { data: members } = await supabase.from('league_members').select('user_id').eq('league_id', league.id)
        userIdFilter = (members || []).map(mm => mm.user_id)
        if (!user?.id || !userIdFilter.includes(user.id)) {
          setScopeDenied(true)
          setScopeMessage('You need to be a member of this league to view its predictions.')
          setLoading(false)
          return
        }
        setScopeLabel(league.name)
      }

      // ── Knockout match: KO Predictor picks + bracket impact ──
      if (m.stage !== 'group') {
        let koUserIds = null
        if (koLeagueCode) {
          const { data: koLeague } = await supabase.from('ko_leagues').select('id, name').eq('invite_code', koLeagueCode).maybeSingle()
          if (!koLeague) {
            setScopeDenied(true)
            setScopeMessage('KO Predictor league not found.')
            setLoading(false)
            return
          }
          const { data: koMembers } = await supabase.from('ko_league_members').select('user_id').eq('league_id', koLeague.id)
          koUserIds = (koMembers || []).map(mm => mm.user_id)
          if (!user?.id || !koUserIds.includes(user.id)) {
            setScopeDenied(true)
            setScopeMessage('You need to be a member of this KO Predictor league to view its picks.')
            setLoading(false)
            return
          }
          setKoScopeLabel(koLeague.name)
          setShowKoRivals(true)
        } else if (leagueCode) {
          // Tournament mini-leagues and KO Predictor are separate competitions.
          // Keep the viewer's own KO pick visible, but do not present unrelated KO standings.
          koUserIds = user?.id ? [user.id] : []
          setKoScopeLabel('KO Predictor')
          setShowKoRivals(false)
        }

        let koQ = supabase.from('ko_predictions')
          .select('user_id, home_score, away_score, winner_team_id, is_joker')
          .eq('match_id', matchId)
        if (koUserIds?.length) koQ = koQ.in('user_id', koUserIds)
        const koPreds = koUserIds && koUserIds.length === 0
          ? []
          : ((await koQ).data || [])
        const koIds = [...new Set(koPreds.map(p => p.user_id))]
        const koNames = {}
        if (koIds.length) {
          const { data: kp } = await supabase.from('profiles').select('id, username, display_name, avatar_emoji').in('id', koIds)
          ;(kp || []).forEach(pr => { koNames[pr.id] = pr })
        }
        const rivals = koPreds.map(p => {
          const prof = koNames[p.user_id] || {}
          const side = p.winner_team_id === m.home_team_id ? 'home' : p.winner_team_id === m.away_team_id ? 'away' : null
          return { userId: p.user_id, name: prof.display_name || prof.username || 'Player', avatar: prof.avatar_emoji, side, home: p.home_score, away: p.away_score, joker: !!p.is_joker }
        })
        setKoRivals(rivals)
        setKoMine(rivals.find(r => r.userId === user?.id) || null)

        const { data: kpicks } = user?.id
          ? await supabase.from('knockout_picks').select('match_number, winner_team_id').eq('user_id', user.id)
          : { data: [] }
        const deepest = {}
        ;(kpicks || []).forEach(k => {
          if (k.winner_team_id && (deepest[k.winner_team_id] == null || k.match_number > deepest[k.winner_team_id])) {
            deepest[k.winner_team_id] = k.match_number
          }
        })
        const reachLabel = (mn) => mn == null ? null
          : mn >= 104 ? 'win it all 🏆'
          : mn >= 101 ? 'the Final'
          : mn >= 97 ? 'the Semi-finals'
          : mn >= 89 ? 'the Quarter-finals'
          : 'the Round of 16'
        setBracketImpact([
          { team: m.home_team, side: 'home', reach: reachLabel(deepest[m.home_team_id]) },
          { team: m.away_team, side: 'away', reach: reachLabel(deepest[m.away_team_id]) },
        ])
        setLoading(false)
        return
      }

      // ── Group match: scoreline predictions ──
      let q = supabase.from('predictions')
        .select('user_id, home_score, away_score, is_confident, points_awarded')
        .eq('match_id', matchId).not('home_score', 'is', null)
      if (userIdFilter) q = q.in('user_id', userIdFilter)
      const { data: preds } = await q

      const { data: reactions } = await supabase.from('match_reactions').select('reaction').eq('match_id', matchId)

      const ids = [...new Set((preds || []).map(p => p.user_id))]
      const nameMap = {}
      if (ids.length) {
        const { data: profs } = await supabase.from('profiles').select('id, username, display_name, avatar_emoji').in('id', ids)
        ;(profs || []).forEach(pr => { nameMap[pr.id] = pr })
      }
      const rankedList = (preds || []).map(p => {
        const lp = livePts(p, m)
        const prof = nameMap[p.user_id] || {}
        const finalPts = (m?.status === 'completed' && p.points_awarded != null) ? p.points_awarded : lp.pts
        return { userId: p.user_id, name: prof.display_name || prof.username || 'Player', avatar: prof.avatar_emoji, home: p.home_score, away: p.away_score, joker: !!p.is_confident, status: lp.status, exact: lp.exact, pts: finalPts }
      }).sort((a, b) => b.pts - a.pts || (b.exact ? 1 : 0) - (a.exact ? 1 : 0) || a.name.localeCompare(b.name))
      setRanked(rankedList)
      setMyLine(rankedList.find(r => r.userId === user?.id) || null)
      setStats(computeStats(preds || [], reactions || [], m))
      setLoading(false)
    }
    if (matchId) load()
  }, [matchId, leagueCode, koLeagueCode, user?.id])

  const wrap = (children) => (
    <div style={{ marginTop: divider ? '6px' : 0, paddingTop: divider ? '18px' : 0, borderTop: divider ? '2px solid var(--border-light)' : 'none' }}>{children}</div>
  )

  if (loading) return wrap(<div style={{ textAlign: 'center', padding: '24px' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>)
  if (scopeDenied) return wrap(<p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '16px' }}>{scopeMessage || 'You do not have access to this view.'}</p>)
  if (!match) return wrap(<p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '16px' }}>Match not found.</p>)
  if (notLocked) return wrap(
    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
      <div style={{ fontSize: '30px', marginBottom: '6px' }}>🔒</div>
      <p>{match.home_team?.short_code} v {match.away_team?.short_code} — predictions appear once it kicks off.</p>
    </div>
  )

  const hasResult = match.home_score != null && match.away_score != null
  const live = match.status === 'live'
  const completed = match.status === 'completed'
  const scoreLead = hasResult ? (match.home_score > match.away_score ? 'home' : match.away_score > match.home_score ? 'away' : 'draw') : null
  const winnerSide = completed && match.winner_team_id
    ? match.winner_team_id === match.home_team_id
      ? 'home'
      : match.winner_team_id === match.away_team_id
        ? 'away'
        : null
    : null
  const lead = winnerSide || scoreLead

  // ── Knockout centre ──
  if (match.stage !== 'group') {
    const totalBackers = koRivals.length
    const homeBackers = koRivals.filter(r => r.side === 'home').length
    const awayBackers = koRivals.filter(r => r.side === 'away').length
    const myWinner = koMine ? (koMine.side === 'home' ? match.home_team : koMine.side === 'away' ? match.away_team : null) : null
    const myOnTrack = koMine && lead && lead === koMine.side
    return wrap(<>
      <KOHeader match={match} hasResult={hasResult} live={live} />

      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '8px 12px', marginBottom: '12px', background: 'rgba(230,81,0,0.08)', border: '1px solid rgba(230,81,0,0.2)', borderRadius: 'var(--radius-md)', fontSize: '11.5px', fontWeight: 700, color: '#e65100' }}>
        🔥 <span>{leagueCode && !koLeagueCode
          ? 'KO Predictor is separate from this Tournament mini-league. Open the KO Predictor leaderboard to compare other players.'
          : 'KO Predictor is a separate competition — it does not affect your Tournament score.'}</span>
      </div>

      <div className="card fade-up" style={{ marginBottom: '14px', border: `2px solid ${myOnTrack ? 'var(--accent-green)' : 'var(--border-light)'}` }}>
        <div style={{ fontSize: 'var(--t-tiny)', fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>Your KO Predictor pick</div>
        {koMine ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '26px' }}>{myWinner?.flag_emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '15px' }}>{myWinner?.name} to advance {koMine.joker && '🃏'}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Your score: {koMine.home}–{koMine.away}</div>
            </div>
            {hasResult && <span style={{ fontSize: '11px', fontWeight: 800, color: myOnTrack ? 'var(--accent-green)' : 'var(--text-muted)' }}>{live && lead === 'draw' ? 'Level' : myOnTrack ? (live ? 'On track' : '✓ Through') : (live ? 'Trailing' : '✗ Missed')}</span>}
          </div>
        ) : (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>You haven't predicted this one. <Link to="/ko-predictor" style={{ color: '#e65100', fontWeight: 700 }}>Make your KO pick →</Link></div>
        )}
      </div>

      {bracketImpact.some(b => b.reach) && (
        <StatCard title="What this means for your bracket">
          <div>
            {bracketImpact.map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: i === 0 ? '1px solid var(--border-light)' : 'none' }}>
                <span style={{ fontSize: '22px' }}>{b.team?.flag_emoji}</span>
                <div style={{ flex: 1, fontSize: '13px' }}>
                  <b>{b.team?.name}</b>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{b.reach ? `You predicted them to ${b.reach}` : 'Not one of your deep bracket picks'}</div>
                </div>
                {completed && winnerSide && (
                  <span style={{ fontSize: '11px', fontWeight: 800, color: lead === b.side ? 'var(--accent-green)' : '#c62828' }}>
                    {lead === b.side ? 'Advances ✓' : 'Out ✗'}
                  </span>
                )}
              </div>
            ))}
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', paddingTop: '10px' }}>Your bracket scores teams by how far they actually go — this game decides which of these two carries on.</div>
          </div>
        </StatCard>
      )}

      {showKoRivals && totalBackers > 0 && (
        <StatCard title={`${koScopeLabel} · who's backing who`}>
          <div>
            <div style={{ display: 'flex', height: '30px', borderRadius: '8px', overflow: 'hidden', fontWeight: 800, fontSize: '12px', color: '#fff', marginBottom: '12px' }}>
              <div style={{ width: `${homeBackers / totalBackers * 100}%`, background: 'var(--scottish-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: homeBackers ? '46px' : 0 }}>{match.home_team?.short_code} {homeBackers}</div>
              <div style={{ width: `${awayBackers / totalBackers * 100}%`, background: '#7a4fd0', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: awayBackers ? '46px' : 0 }}>{match.away_team?.short_code} {awayBackers}</div>
            </div>
            {koRivals.slice(0, 30).map((r, i) => {
              const me = r.userId === user?.id
              const winTeam = r.side === 'home' ? match.home_team : r.side === 'away' ? match.away_team : null
              return (
                <div key={r.userId} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: me ? '8px' : '8px 0', borderRadius: me ? 'var(--radius-sm)' : 0, background: me ? 'var(--bg-secondary)' : 'transparent', borderBottom: i < Math.min(koRivals.length, 30) - 1 ? '1px solid var(--border-light)' : 'none' }}>
                  <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--scottish-navy)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '10px', flexShrink: 0 }}>{r.avatar || (r.name[0] || '?').toUpperCase()}</span>
                  <span style={{ flex: 1, fontWeight: 700, fontSize: '13px' }}>{me ? 'You' : r.name}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700 }}>{winTeam?.flag_emoji} {winTeam?.short_code}{r.joker ? ' 🃏' : ''}</span>
                </div>
              )
            })}
          </div>
        </StatCard>
      )}

      {showKoRivals && totalBackers === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '8px 0' }}>No KO Predictor picks in yet for this match.</p>
      )}
    </>)
  }

  // ── Group centre ──
  if (!stats || stats.total === 0) {
    return wrap(<>
      <GroupHeader match={match} hasResult={hasResult} live={live} statsTotal={0} scopeLabel={scopeLabel} />
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '12px' }}>No predictions in yet for this match.</p>
    </>)
  }

  const actualResult = lead

  return wrap(<>
    <GroupHeader match={match} hasResult={hasResult} live={live} statsTotal={stats.total} scopeLabel={scopeLabel} />

    {myLine && (() => {
      const statusLabel = {
        exact: live ? 'On track · exact 🎯' : 'Exact score 🎯',
        result: live ? 'Result on track' : 'Correct result',
        miss: live ? 'Not landing yet' : 'Missed',
        pending: 'Locked in',
      }[myLine.status]
      const good = myLine.pts > 0
      return (
        <div className="card fade-up" style={{ marginBottom: '14px', border: `2px solid ${good ? 'var(--accent-green)' : 'var(--border-light)'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: 'var(--t-tiny)', fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Your prediction</span>
            {myLine.joker && <span style={{ fontSize: '12px' }}>🃏</span>}
            <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 800, color: good ? 'var(--accent-green)' : 'var(--text-muted)' }}>{statusLabel}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '16px', fontWeight: 800 }}>You picked <span className="stat-num">{myLine.home}–{myLine.away}</span></div>
            <div className="stat-num" style={{ fontSize: '26px', fontWeight: 800, color: good ? 'var(--accent-green)' : 'var(--text-muted)' }}>
              {good ? '+' : ''}{myLine.pts}<span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700 }}>{live ? ' live' : ' pts'}</span>
            </div>
          </div>
          {live && <div style={{ fontSize: 'var(--t-tiny)', color: 'var(--text-muted)', marginTop: '5px' }}>Updates as the score changes{myLine.joker ? ' · joker doubles it' : ''}.</div>}
        </div>
      )
    })()}

    {ranked.length > 0 && (
      <StatCard title={`${scopeLabel} · this match`}>
        <div>
          {ranked.slice(0, 30).map((r, i) => {
            const me = r.userId === user?.id
            const last = i === Math.min(ranked.length, 30) - 1
            return (
              <div key={r.userId} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: me ? '9px 8px' : '9px 0', borderBottom: last ? 'none' : '1px solid var(--border-light)', background: me ? 'var(--bg-secondary)' : 'transparent', borderRadius: me ? 'var(--radius-sm)' : 0 }}>
                <span className="stat-num" style={{ width: '20px', fontWeight: 800, color: 'var(--text-muted)', fontSize: '13px' }}>{i + 1}</span>
                <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--scottish-navy)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '11px', flexShrink: 0 }}>{r.avatar || (r.name[0] || '?').toUpperCase()}</span>
                <span style={{ flex: 1, fontWeight: 700, fontSize: '13px' }}>{me ? 'You' : r.name}</span>
                <span className="stat-num" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{r.home}–{r.away}{r.joker ? ' 🃏' : ''}</span>
                <span className="stat-num" style={{ width: '42px', textAlign: 'right', fontWeight: 800, fontSize: '13px', color: r.pts > 0 ? 'var(--accent-green)' : 'var(--text-muted)' }}>{r.pts > 0 ? '+' : ''}{r.pts}</span>
              </div>
            )
          })}
          {ranked.length > 30 && <div style={{ textAlign: 'center', fontSize: 'var(--t-tiny)', color: 'var(--text-muted)', paddingTop: '8px' }}>+ {ranked.length - 30} more</div>}
        </div>
      </StatCard>
    )}

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

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
      <MiniStat label="Most popular score" value={stats.topScore} sub={`${stats.topScorePct}% picked it`} />
      <MiniStat label="Jokers used 🃏" value={stats.jokers} sub={`${stats.jokerPct}% of players`} />
      <MiniStat label="Avg predicted goals" value={stats.avgGoals} sub={hasResult ? `actual: ${match.home_score + match.away_score}` : 'total'} />
      <MiniStat label="Boldest scoreline" value={stats.boldest} sub={`${stats.boldestGoals} goals`} />
    </div>

    {hasResult && (
      <StatCard title={live ? 'Currently spot on 🎯' : 'Got it spot on 🎯'}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span className="stat-num" style={{ fontSize: '32px', fontWeight: '700', color: 'var(--accent-green)' }}>{stats.exactPct}%</span>
          <span style={{ fontSize: 'var(--t-small)', color: 'var(--text-muted)' }}>
            {live ? 'currently match' : 'predicted'} {match.home_score}–{match.away_score} exactly ({stats.exactCount} {stats.exactCount === 1 ? 'person' : 'people'})
          </span>
        </div>
      </StatCard>
    )}

    {hasResult && stats.actualResultPct != null && (
      <StatCard title={live ? 'Live upset meter' : 'Upset meter'}>
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
          Only <span className="stat-num" style={{ fontWeight: '700' }}>{stats.actualResultPct}%</span> {live ? 'currently back this result' : 'predicted this result'}
        </div>
      </StatCard>
    )}

    {(stats.reactions.fire + stats.reactions.laugh + stats.reactions.skull) > 0 && (
      <StatCard title="Reactions">
        <div style={{ display: 'flex', gap: '16px' }}>
          <span style={{ fontSize: 'var(--t-body)' }}>🔥 <span className="stat-num" style={{ fontWeight: '700' }}>{stats.reactions.fire}</span></span>
          <span style={{ fontSize: 'var(--t-body)' }}>😂 <span className="stat-num" style={{ fontWeight: '700' }}>{stats.reactions.laugh}</span></span>
          <span style={{ fontSize: 'var(--t-body)' }}>💀 <span className="stat-num" style={{ fontWeight: '700' }}>{stats.reactions.skull}</span></span>
        </div>
      </StatCard>
    )}
  </>)
}

function GroupHeader({ match, hasResult, live, statsTotal, scopeLabel }) {
  return (
    <div className="card fade-up" style={{ marginBottom: '14px', textAlign: 'center' }}>
      <div style={{ fontSize: 'var(--t-tiny)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '12px' }}>
        M{match.match_number} · {live
          ? `🔴 Live ${match.live_minute != null ? `${match.live_minute}${match.injury_time ? `+${match.injury_time}` : ''}'` : ''}`.trim()
          : match.status === 'completed'
            ? 'Full time'
            : 'Predictions'}
      </div>
      <ScoreRow match={match} hasResult={hasResult} />
      <div style={{ fontSize: 'var(--t-tiny)', color: 'var(--text-muted)', marginTop: '12px' }}>
        📊 {statsTotal} predictions · {scopeLabel}
      </div>
    </div>
  )
}

function KOHeader({ match, hasResult, live }) {
  return (
    <div className="card fade-up" style={{ marginBottom: '12px', textAlign: 'center' }}>
      <div style={{ fontSize: 'var(--t-tiny)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '12px' }}>
        {STAGE_LABELS[match.stage] || 'Knockout'} · M{match.match_number} · {live
          ? `🔴 Live ${match.live_minute != null ? `${match.live_minute}${match.injury_time ? `+${match.injury_time}` : ''}'` : ''}`.trim()
          : match.status === 'completed'
            ? 'Full time'
            : 'KO Predictor'}
      </div>
      <ScoreRow match={match} hasResult={hasResult} />
    </div>
  )
}

function ScoreRow({ match, hasResult }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
      <div style={{ textAlign: 'center', width: '88px' }}>
        <div style={{ fontSize: '34px', lineHeight: 1 }}>{match.home_team?.flag_emoji}</div>
        <div style={{ fontWeight: '800', fontSize: 'var(--t-small)', marginTop: '4px' }}>{match.home_team?.short_code}</div>
      </div>
      <div style={{ minWidth: '92px', textAlign: 'center' }}>
        <div className="stat-num" style={{ fontSize: '32px', fontWeight: '500' }}>
          {hasResult ? `${match.home_score} – ${match.away_score}` : 'vs'}
        </div>
        {match.home_penalty_score != null && match.away_penalty_score != null && (
          <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', marginTop: '2px' }}>
            Pens {match.home_penalty_score}–{match.away_penalty_score}
          </div>
        )}
      </div>
      <div style={{ textAlign: 'center', width: '88px' }}>
        <div style={{ fontSize: '34px', lineHeight: 1 }}>{match.away_team?.flag_emoji}</div>
        <div style={{ fontWeight: '800', fontSize: 'var(--t-small)', marginTop: '4px' }}>{match.away_team?.short_code}</div>
      </div>
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

function livePts(pred, match) {
  const hasScore = match?.home_score != null && match?.away_score != null
  if (!hasScore) return { pts: 0, status: 'pending', exact: false }
  const exact = pred.home_score === match.home_score && pred.away_score === match.away_score
  const sgn = n => (n > 0 ? 1 : n < 0 ? -1 : 0)
  const hit = sgn(pred.home_score - pred.away_score) === sgn(match.home_score - match.away_score)
  let base = exact ? 5 : hit ? 3 : 0
  if (pred.is_confident) base *= 2
  return { pts: base, status: exact ? 'exact' : hit ? 'result' : 'miss', exact }
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

  let topScore = '–', topCount = 0
  Object.entries(scoreCounts).forEach(([k, c]) => { if (c > topCount) { topCount = c; topScore = k } })

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
  const awayPct = Math.round((away / total) * 100)

  return {
    total, homePct, drawPct, awayPct,
    topScore, topScorePct: Math.round((topCount / total) * 100),
    jokers, jokerPct: Math.round((jokers / total) * 100),
    avgGoals: (goalSum / total).toFixed(1),
    boldest, boldestGoals,
    exactCount,
    exactPct: hasResult ? Math.round((exactCount / total) * 100) : null,
    actualResultPct: hasResult ? Math.round((actualResultCount / total) * 100) : null,
    reactions: r,
  }
}
