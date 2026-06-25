import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { ALL_STAGES, calcPredictedStandings, resolveSlot } from '../lib/bracketUtils.js'

const TOURNAMENT_START = new Date('2026-06-11T19:00:00Z')

// ─── helpers ────────────────────────────────────────────────────────────────

export function getPredResult(pred) {
  const m = pred.match
  if (m?.status !== 'completed') return 'pending'
  const correct =
    (m.home_score > m.away_score && pred.home_score > pred.away_score) ||
    (m.home_score === m.away_score && pred.home_score === pred.away_score) ||
    (m.home_score < m.away_score && pred.home_score < pred.away_score)
  const exact = m.home_score === pred.home_score && m.away_score === pred.away_score
  if (exact) return 'exact'
  if (correct) return 'correct'
  return 'wrong'
}

// ─── sub-views ──────────────────────────────────────────────────────────────

function MemberStandingsView({ predictions }) {
  const standings = {}
  predictions.forEach(pred => {
    const match = pred.match
    if (!match) return
    const h = pred.home_score; const a = pred.away_score
    if (h === null || h === undefined || a === null || a === undefined) return
    const group = match.group?.name || match.group_name
    if (!group || (match.stage && match.stage !== 'group')) return
    const homeId = match.home_team?.name; const awayId = match.away_team?.name
    if (!homeId || !awayId) return
    if (!standings[group]) standings[group] = {}
    if (!standings[group][homeId]) standings[group][homeId] = { name: homeId, flag: match.home_team?.flag_emoji, pts: 0, gf: 0, ga: 0, played: 0 }
    if (!standings[group][awayId]) standings[group][awayId] = { name: awayId, flag: match.away_team?.flag_emoji, pts: 0, gf: 0, ga: 0, played: 0 }
    const hs = Number(h), as_ = Number(a)
    standings[group][homeId].gf += hs; standings[group][homeId].ga += as_; standings[group][homeId].played++
    standings[group][awayId].gf += as_; standings[group][awayId].ga += hs; standings[group][awayId].played++
    if (hs > as_) { standings[group][homeId].pts += 3 }
    else if (hs === as_) { standings[group][homeId].pts += 1; standings[group][awayId].pts += 1 }
    else { standings[group][awayId].pts += 3 }
  })
  const groupKeys = Object.keys(standings).sort()
  if (groupKeys.length === 0) return (
    <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
      <div style={{ fontWeight: '700' }}>No predictions to show standings</div>
    </div>
  )
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
      {groupKeys.map(group => {
        const teams = Object.values(standings[group]).sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf)
        return (
          <div key={group} style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '8px', border: '1px solid var(--border-light)' }}>
            <div style={{ fontWeight: '800', fontSize: '11px', color: 'var(--scottish-navy)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Group {group}</div>
            {teams.map((team, i) => (
              <div key={team.name} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 0', borderTop: i > 0 ? '1px solid var(--border-light)' : 'none' }}>
                <span style={{ fontSize: '9px', fontWeight: '700', color: i < 2 ? 'var(--accent-green)' : 'var(--text-muted)', width: '10px' }}>{i + 1}</span>
                <span style={{ fontSize: '13px', lineHeight: 1 }}>{team.flag}</span>
                <span style={{ fontSize: '10px', flex: 1, color: i < 2 ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: i < 2 ? '700' : '400', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team.name}</span>
                <span style={{ fontSize: '10px', fontWeight: '800', fontFamily: 'monospace', color: i < 2 ? 'var(--accent-green)' : 'var(--text-muted)' }}>{team.pts}pt</span>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function KnockoutPicksView({ userId, leagueId, lockedSnapshot = false }) {
  const [picks, setPicks] = useState({})
  const [groupPreds, setGroupPreds] = useState({})
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      const koTable = lockedSnapshot ? 'league_knockout_picks' : 'knockout_picks'
      let koQuery = supabase.from(koTable).select('match_number, stage, winner_team_id, is_joker').eq('user_id', userId)
      if (lockedSnapshot && leagueId) koQuery = koQuery.eq('league_id', leagueId)
      const predTable = lockedSnapshot ? 'league_predictions' : 'predictions'
      let predQuery = supabase.from(predTable).select('match_id, home_score, away_score').eq('user_id', userId)
      if (lockedSnapshot && leagueId) predQuery = predQuery.eq('league_id', leagueId)
      const [koRes, predRes, matchRes] = await Promise.all([
        koQuery.order('match_number', { ascending: true }),
        predQuery,
        supabase.from('matches').select('id, match_number, stage, home_team_id, away_team_id, group:group_id(name), home_team:home_team_id(id,name,flag_emoji,short_code), away_team:away_team_id(id,name,flag_emoji,short_code)'),
      ])
      if (cancelled) return
      const km = {};
      (koRes.data || []).forEach(p => { km[p.match_number] = { winner_id: p.winner_team_id, is_joker: p.is_joker, stage: p.stage } })
      const pm = {};
      (predRes.data || []).forEach(p => { if (p.home_score !== null && p.away_score !== null) pm[p.match_id] = { home: p.home_score, away: p.away_score } })
      setPicks(km); setGroupPreds(pm); setMatches(matchRes.data || []); setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [userId, leagueId, lockedSnapshot])

  const groupMatches = React.useMemo(() => matches.filter(m => m.stage === 'group'), [matches])
  const standings = React.useMemo(() => calcPredictedStandings(groupMatches, groupPreds, true), [groupMatches, groupPreds])
  const teamsById = React.useMemo(() => {
    const map = {}
    matches.forEach(m => { if (m.home_team) map[m.home_team.id] = m.home_team; if (m.away_team) map[m.away_team.id] = m.away_team })
    return map
  }, [matches])

  const resolveTeam = (slot) => {
    if (!slot) return null
    if (slot.startsWith('W')) { const mn = parseInt(slot.replace('W', '')); const wid = picks[mn]?.winner_id; return wid ? (teamsById[wid] || null) : null }
    if (slot.startsWith('L')) return null
    return resolveSlot(slot, standings, groupMatches, groupPreds)
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}><div className="spinner" /></div>
  if (Object.keys(picks).length === 0) return <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}><div style={{ fontSize: '32px', marginBottom: '8px' }}>🏆</div><div style={{ fontWeight: '700' }}>No knockout picks yet</div></div>

  const teamStyle = (won) => ({ fontSize: '13px', fontWeight: won ? '800' : '500', color: won ? 'var(--text-primary)' : 'var(--text-muted)' })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {ALL_STAGES.map(stage => {
        const stageMatches = stage.matches.filter(md => picks[md.match_number]?.winner_id)
        if (stageMatches.length === 0) return null
        return (
          <div key={stage.key}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{stage.label}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {stageMatches.map(md => {
                const pick = picks[md.match_number]
                const home = resolveTeam(md.home_slot); const away = resolveTeam(md.away_slot)
                const winner = teamsById[pick.winner_id]
                const isHomeWinner = home && home.id === pick.winner_id
                const isAwayWinner = away && away.id === pick.winner_id
                return (
                  <div key={md.match_number} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '24px' }}>#{md.match_number}</span>
                    {home && away ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: '16px', opacity: isHomeWinner ? 1 : 0.5 }}>{home.flag_emoji}</span>
                        <span style={teamStyle(isHomeWinner)}>{home.short_code || home.name}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 2px' }}>v</span>
                        <span style={{ fontSize: '16px', opacity: isAwayWinner ? 1 : 0.5 }}>{away.flag_emoji}</span>
                        <span style={teamStyle(isAwayWinner)}>{away.short_code || away.name}</span>
                        <span style={{ fontSize: '11px', color: 'var(--accent-green)', fontWeight: '700', marginLeft: '6px', whiteSpace: 'nowrap' }}>→ {winner?.short_code || winner?.name || '?'}</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>winner</span>
                        <span style={{ fontSize: '18px' }}>{winner?.flag_emoji}</span>
                        <span style={{ fontSize: '13px', fontWeight: '700' }}>{winner?.name || '?'}</span>
                      </div>
                    )}
                    {pick.is_joker && <span style={{ marginLeft: 'auto', fontSize: '12px' }}>🃏</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AwardPredsView({ userId, leagueId, lockedSnapshot = false }) {
  const [preds, setPreds] = useState([])
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const awardTable = lockedSnapshot ? 'league_award_predictions' : 'award_predictions'
    const goalTable = lockedSnapshot ? 'league_tournament_predictions' : 'tournament_predictions'
    let awardQuery = supabase.from(awardTable).select('award_type, predicted_player_name').eq('user_id', userId)
    let goalQuery = supabase.from(goalTable).select('prediction_type, int_value').eq('user_id', userId).eq('prediction_type', 'total_goals')
    if (lockedSnapshot && leagueId) { awardQuery = awardQuery.eq('league_id', leagueId); goalQuery = goalQuery.eq('league_id', leagueId) }
    Promise.all([awardQuery, goalQuery]).then(([{ data: awardData }, { data: goalData }]) => { setPreds(awardData || []); setGoals(goalData || []); setLoading(false) })
  }, [userId, leagueId, lockedSnapshot])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}><div className="spinner" /></div>
  if (preds.length === 0 && goals.length === 0) return <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}><div style={{ fontSize: '32px', marginBottom: '8px' }}>🥇</div><div style={{ fontWeight: '700' }}>No award predictions yet</div></div>

  const labels = { golden_boot: '⚽ Golden Boot', golden_glove: '🧤 Golden Glove', player_of_tournament: '🌟 Player of the Tournament' }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {preds.map(pred => (<div key={pred.award_type} style={{ padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}><div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '4px' }}>{labels[pred.award_type] || pred.award_type}</div><div style={{ fontSize: '14px', fontWeight: '700' }}>{pred.predicted_player_name || '—'}</div></div>))}
      {goals.map(g => (<div key={g.prediction_type} style={{ padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}><div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '4px' }}>🌍 Tournament Total Goals</div><div style={{ fontSize: '14px', fontWeight: '700' }}>{g.int_value} goals</div></div>))}
    </div>
  )
}

function CompareWithMeView({ myUserId, targetUserId, targetName, leagueId, lockedSnapshot = false, targetShowFuture = false }) {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [awards, setAwards] = useState([])
  const [totals, setTotals] = useState({ same: 0, different: 0 })

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      const table = lockedSnapshot ? 'league_predictions' : 'predictions'
      let query = supabase.from(table).select('user_id, match_id, home_score, away_score, match:match_id(id, match_number, kickoff_time, stage, status, home_team:home_team_id(name,flag_emoji,short_code), away_team:away_team_id(name,flag_emoji,short_code))').in('user_id', [myUserId, targetUserId])
      if (lockedSnapshot && leagueId) query = query.eq('league_id', leagueId)
      const awardTable = lockedSnapshot ? 'league_award_predictions' : 'award_predictions'
      const goalTable = lockedSnapshot ? 'league_tournament_predictions' : 'tournament_predictions'
      let myAwardQ = supabase.from(awardTable).select('award_type, predicted_player_name').eq('user_id', myUserId)
      let theirAwardQ = supabase.from(awardTable).select('award_type, predicted_player_name').eq('user_id', targetUserId)
      let myGoalQ = supabase.from(goalTable).select('prediction_type, int_value').eq('user_id', myUserId).eq('prediction_type', 'total_goals')
      let theirGoalQ = supabase.from(goalTable).select('prediction_type, int_value').eq('user_id', targetUserId).eq('prediction_type', 'total_goals')
      if (lockedSnapshot && leagueId) { myAwardQ = myAwardQ.eq('league_id', leagueId); theirAwardQ = theirAwardQ.eq('league_id', leagueId); myGoalQ = myGoalQ.eq('league_id', leagueId); theirGoalQ = theirGoalQ.eq('league_id', leagueId) }
      const [{ data: matchData }, { data: myAwards }, { data: targetAwards }, { data: myGoals }, { data: targetGoals }] = await Promise.all([query, myAwardQ, theirAwardQ, myGoalQ, theirGoalQ])
      if (cancelled) return
      const visible = (matchData || []).filter(p => { if (lockedSnapshot) return true; if (p.user_id === myUserId) return true; return new Date(p.match?.kickoff_time) <= new Date() || targetShowFuture })
      const mineByMatch = {}; const theirsByMatch = {}
      visible.forEach(p => { if (p.user_id === myUserId) mineByMatch[p.match_id] = p; if (p.user_id === targetUserId) theirsByMatch[p.match_id] = p })
      const comparisonRows = Object.keys(theirsByMatch).map(matchId => {
        const mine = mineByMatch[matchId]; const theirs = theirsByMatch[matchId]
        const same = mine && theirs && mine.home_score === theirs.home_score && mine.away_score === theirs.away_score
        const sameResult = mine && theirs && Math.sign(mine.home_score - mine.away_score) === Math.sign(theirs.home_score - theirs.away_score)
        return { matchId, mine, theirs, same, sameResult, match: theirs.match }
      }).sort((a, b) => (a.match?.match_number || 0) - (b.match?.match_number || 0))
      const awardLabels = { golden_boot: 'Golden Boot', golden_glove: 'Golden Glove', player_of_tournament: 'Player of the Tournament' }
      const myAwardMap = {}; const targetAwardMap = {}
      ;(myAwards || []).forEach(a => { myAwardMap[a.award_type] = a.predicted_player_name });
      (targetAwards || []).forEach(a => { targetAwardMap[a.award_type] = a.predicted_player_name })
      const awardRows = Object.keys(awardLabels).filter(k => myAwardMap[k] || targetAwardMap[k]).map(k => ({ label: awardLabels[k], mine: myAwardMap[k] || '—', theirs: targetAwardMap[k] || '—', same: myAwardMap[k] && targetAwardMap[k] && myAwardMap[k] === targetAwardMap[k] }))
      const myTG = (myGoals || [])[0]?.int_value; const theirTG = (targetGoals || [])[0]?.int_value
      if (myTG || theirTG) awardRows.push({ label: 'Total Goals', mine: myTG ? `${myTG}` : '—', theirs: theirTG ? `${theirTG}` : '—', same: myTG && theirTG && myTG === theirTG })
      setRows(comparisonRows); setAwards(awardRows); setTotals({ same: comparisonRows.filter(r => r.same).length, different: comparisonRows.filter(r => !r.same).length }); setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [myUserId, targetUserId, leagueId, lockedSnapshot, targetShowFuture])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}><div className="spinner" /></div>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ padding: '12px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}>
        <div style={{ fontSize: '13px', fontWeight: '800', marginBottom: '4px' }}>You vs {targetName}</div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
          <span style={{ fontSize: '11px', fontWeight: '800', padding: '4px 8px', borderRadius: 'var(--radius-full)', background: 'var(--accent-green-light)', color: 'var(--accent-green)' }}>Same: {totals.same}</span>
          <span style={{ fontSize: '11px', fontWeight: '800', padding: '4px 8px', borderRadius: 'var(--radius-full)', background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border-light)' }}>Different: {totals.different}</span>
        </div>
      </div>
      {awards.length > 0 && (<div>{awards.map(row => (<div key={row.label} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', alignItems: 'center', padding: '8px 10px', background: row.same ? 'var(--accent-green-light)' : 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', marginBottom: '6px' }}><span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>{row.label}</span><span style={{ fontSize: '12px', fontWeight: '800' }}>You: {row.mine}</span><span style={{ fontSize: '12px', fontWeight: '800' }}>{targetName}: {row.theirs}</span></div>))}</div>)}
      <div>
        {rows.length === 0 ? (<div style={{ textAlign: 'center', padding: '28px', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}><div style={{ fontSize: '28px', marginBottom: '6px' }}>🔒</div><div style={{ fontWeight: '700' }}>No comparable picks visible yet</div></div>
        ) : rows.map(row => (
          <div key={row.matchId} style={{ padding: '10px 12px', background: row.same ? 'var(--accent-green-light)' : row.sameResult ? 'var(--accent-blue-light)' : 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', marginBottom: '7px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '18px' }}>{row.match?.home_team?.flag_emoji}</span>
              <span style={{ flex: 1, fontSize: '12px', fontWeight: '800' }}>{row.match?.home_team?.short_code} vs {row.match?.away_team?.short_code}</span>
              <span style={{ fontSize: '18px' }}>{row.match?.away_team?.flag_emoji}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ fontSize: '12px', padding: '7px 9px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}><strong>You:</strong> {row.mine ? `${row.mine.home_score}–${row.mine.away_score}` : '—'}</div>
              <div style={{ fontSize: '12px', padding: '7px 9px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}><strong>{targetName}:</strong> {row.theirs ? `${row.theirs.home_score}–${row.theirs.away_score}` : '—'}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── data loading hook ───────────────────────────────────────────────────────

export function useMemberPredictions() {
  const [memberModal, setMemberModal] = useState(null)
  const [memberPredictions, setMemberPredictions] = useState([])
  const [memberReactions, setMemberReactions] = useState({})
  const [loadingPreds, setLoadingPreds] = useState(false)
  const [groupPositionBreakdown, setGroupPositionBreakdown] = useState([])

  const loadMemberPredictions = async (userId, showFuture) => {
    setLoadingPreds(true)
    const [{ data: preds }, { data: profileData }, { data: groupPosData }] = await Promise.all([
      supabase
        .from('predictions')
        .select('*, match:match_id(match_number, kickoff_time, stage, status, home_score, away_score, group:group_id(name), home_team:home_team_id(name,flag_emoji,short_code), away_team:away_team_id(name,flag_emoji,short_code))')
        .eq('user_id', userId),
      supabase
        .from('profiles')
        .select('group_position_points, bracket_points, total_points, exact_scores')
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('predicted_group_positions')
        .select('group_name, predicted_position, actual_position, points_awarded, team:team_id(name, flag_emoji, short_code)')
        .eq('user_id', userId)
        .order('group_name').order('predicted_position')
    ])
    const memberProfile = profileData || {}
    setGroupPositionBreakdown(groupPosData || [])

    const filtered = (preds || [])
      .filter(p => {
        const kicked = new Date(p.match?.kickoff_time) <= new Date()
        const isLocked = p.match?.status === 'completed' || p.match?.status === 'live'
        const groupName = p.match?.group?.name
        const groupLocked = groupName && (preds || []).some(other =>
          other.match?.group?.name === groupName &&
          other.match?.id !== p.match?.id &&
          new Date(other.match?.kickoff_time) <= new Date()
        )
        return kicked || isLocked || groupLocked || showFuture
      })
      .sort((a, b) => new Date(a.match?.kickoff_time) - new Date(b.match?.kickoff_time))
    setMemberPredictions(filtered)
    if (memberProfile) setMemberModal(prev => prev ? { ...prev, memberProfile } : prev)

    const completedMatchIds = filtered.filter(p => p.match?.status === 'completed').map(p => p.match_id || p.match?.id).filter(Boolean)
    if (completedMatchIds.length > 0) {
      const { data: reactionData } = await supabase.from('match_reactions').select('match_id, reaction').eq('user_id', userId).in('match_id', completedMatchIds)
      const reactionMap = {}
      reactionData?.forEach(r => { reactionMap[r.match_id] = r.reaction })
      setMemberReactions(reactionMap)
    } else {
      setMemberReactions({})
    }
    setLoadingPreds(false)
  }

  const openProfile = async (profile, currentUserId) => {
    const displayName = profile.display_name || profile.username || 'Unknown'
    const showFuture = profile.show_future_predictions !== false || profile.id === currentUserId
    setMemberModal({
      userId: profile.id,
      username: displayName,
      leagueId: null,
      isOffline: false,
      lockedSnapshot: false,
      leagueName: 'Overall Rankings',
      targetShowFuture: showFuture,
      canRemoveMember: false,
      memberName: displayName,
      memberProfile: {},
    })
    await loadMemberPredictions(profile.id, showFuture)
  }

  return { memberModal, setMemberModal, memberPredictions, setMemberPredictions, memberReactions, setMemberReactions, loadingPreds, setLoadingPreds, openProfile, groupPositionBreakdown, setGroupPositionBreakdown }
}

// ─── main modal component ────────────────────────────────────────────────────

export default function MemberPredictionsModal({ memberModal, setMemberModal, memberPredictions, memberReactions, loadingPreds, groupPositionBreakdown = [], currentUserId }) {
  const tournamentLive = new Date() >= TOURNAMENT_START

  if (!memberModal) return null

  const tabs = memberModal.isOffline ? ['group', 'standings'] : ['overview', 'group', 'knockout', 'awards', 'compare', 'standings']
  const activeTab = memberModal.tab || 'overview'

  const tabLabel = (tab) => {
    switch (tab) {
      case 'overview': return '👤 Overview'
      case 'group': return '⚽ Groups'
      case 'knockout': return '🏆 Knockout'
      case 'awards': return '🥇 Awards'
      case 'compare': return '⚔️ Compare'
      case 'standings': return '📊 Standings'
      default: return tab
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={() => setMemberModal(null)}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', width: '100%', maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: '800', fontSize: '16px' }}>{memberModal.isOffline ? '👤 ' : ''}{memberModal.username}'s Predictions</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {memberModal.lockedSnapshot
                ? `Locked league snapshot${memberModal.leagueName ? ` · ${memberModal.leagueName}` : ''}`
                : memberModal.isOffline ? 'Offline player · imported predictions'
                : 'Group picks visible once group kicks off · Future picks shown'}
            </div>
          </div>
          <button onClick={() => setMemberModal(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
        </div>

        {memberModal.lockedSnapshot && (
          <div style={{ padding: '10px 16px', background: 'rgba(245,158,11,0.10)', borderBottom: '1px solid var(--border-light)', fontSize: '12px', color: '#92400e', fontWeight: '700' }}>
            🔒 Showing frozen league predictions used for scoring.
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', overflowX: 'auto', WebkitOverflowScrolling: 'touch', flexShrink: 0 }}>
          {tabs.map(tab => (
            <button
              key={tab}
              type="button"
              onClick={e => { e.stopPropagation(); setMemberModal(prev => ({ ...prev, tab })) }}
              style={{
                flex: '0 0 auto', padding: '12px 14px', fontSize: '12px',
                fontWeight: activeTab === tab ? '700' : '500',
                color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                borderBottom: activeTab === tab ? '2px solid var(--scottish-navy)' : '2px solid transparent',
                borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                background: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                touchAction: 'manipulation', userSelect: 'none',
              }}
            >
              {tabLabel(tab)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ overflowY: 'auto', padding: '16px', flex: 1 }}>
          {loadingPreds ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}><div className="spinner" /></div>
          ) : activeTab === 'overview' ? ((() => {
            const mp = memberModal.memberProfile || {}
            const matchPts = (mp.total_points || 0) - (mp.group_position_points || 0) - (mp.bracket_points || 0)
            const groupPts = mp.group_position_points || 0
            const bracketPts = mp.bracket_points || 0
            const totalPts = mp.total_points || 0
            // Award points = remaining (total minus match, group, bracket)
            const awardPts = Math.max(0, totalPts - matchPts - groupPts - bracketPts)
            const sections = [
              { icon: '⚽', label: 'Match predictions', pts: matchPts, sub: `${mp.exact_scores || 0} exact scores`, tab: 'group', colour: 'var(--scottish-navy)' },
              { icon: '📊', label: 'Group position bonus', pts: groupPts, sub: '+2pts per position · +5pts perfect', tab: 'group', colour: 'var(--accent-green)', hide: groupPts === 0 },
              { icon: '🏆', label: 'Bracket progression', pts: bracketPts, sub: 'Teams predicted to reach each round', tab: 'knockout', colour: 'var(--scottish-navy)', hide: bracketPts === 0 },
              { icon: '🥇', label: 'Awards', pts: awardPts, sub: 'Golden boot, POTY etc', tab: 'awards', hide: awardPts === 0 },
            ].filter(s => !s.hide || totalPts === 0)
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Player card */}
                <div style={{ textAlign: 'center', padding: '14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'var(--scottish-navy)', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '900', marginBottom: '6px' }}>
                    {(memberModal.username || '?')[0].toUpperCase()}
                  </div>
                  <div style={{ fontSize: '17px', fontWeight: '900' }}>{memberModal.username}</div>
                  {totalPts > 0 && <div style={{ fontSize: '22px', fontWeight: '900', fontFamily: 'var(--font-mono)', color: 'var(--scottish-navy)', marginTop: '4px' }}>{totalPts}pts</div>}
                </div>

                {/* Points breakdown — clickable sections */}
                {totalPts > 0 && (
                  <div style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                    {sections.map((s, i) => (
                      <button key={s.tab + i} type="button"
                        onClick={() => setMemberModal(prev => ({ ...prev, tab: s.tab }))}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: 'var(--bg-card)', border: 'none', borderTop: i > 0 ? '1px solid var(--border-light)' : 'none', cursor: 'pointer', textAlign: 'left' }}>
                        <span style={{ fontSize: '20px', flexShrink: 0 }}>{s.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)' }}>{s.label}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>{s.sub}</div>
                        </div>
                        <div style={{ fontWeight: '900', fontSize: '18px', fontFamily: 'var(--font-mono)', color: s.pts > 0 ? s.colour : 'var(--text-muted)', letterSpacing: '-0.02em', flexShrink: 0 }}>
                          +{s.pts}
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', flexShrink: 0 }}>›</span>
                      </button>
                    ))}
                  </div>
                )}

                <button onClick={() => setMemberModal(prev => ({ ...prev, tab: 'compare' }))} className="btn btn-primary btn-full" style={{ marginTop: '2px' }}>⚔️ Compare with me</button>
              </div>
            )
          })()
          ) : activeTab === 'group' ? (
            memberPredictions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>{memberModal.isOffline ? '👤' : '🔒'}</div>
                <div style={{ fontWeight: '700', marginBottom: '4px' }}>{memberModal.isOffline ? 'No predictions entered yet' : 'Picks are private'}</div>
                <div style={{ fontSize: '13px' }}>
                  {tournamentLive ? 'This user has chosen to keep their predictions private' : 'Picks become visible once matches kick off'}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {memberPredictions.map(pred => {
                  const result = getPredResult(pred)
                  const match = pred.match
                  const kicked = new Date(match?.kickoff_time) <= new Date()
                  return (
                    <div key={pred.id || pred.match?.id} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 12px', borderRadius: 'var(--radius-md)',
                      background: result === 'exact' ? 'var(--accent-green-light)' : result === 'correct' ? 'var(--accent-blue-light)' : result === 'wrong' ? 'var(--accent-red-light)' : 'var(--bg-secondary)',
                      border: `1px solid ${result === 'exact' ? 'rgba(0,122,51,0.2)' : result === 'correct' ? 'rgba(21,88,176,0.2)' : result === 'wrong' ? 'rgba(198,40,40,0.2)' : 'var(--border-light)'}`,
                    }}>
                      <span style={{ fontSize: '18px' }}>{match?.home_team?.flag_emoji}</span>
                      <span style={{ fontSize: '12px', fontWeight: '700', flex: 1 }}>{match?.home_team?.short_code} vs {match?.away_team?.short_code} {pred.is_confident ? '🃏' : ''}</span>
                      <span style={{ fontSize: '18px' }}>{match?.away_team?.flag_emoji}</span>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: '800', fontSize: '14px', minWidth: '48px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {pred.home_score} – {pred.away_score}
                      </div>
                      {match?.status === 'completed' && (
                        <div style={{ fontSize: '11px', minWidth: '32px', textAlign: 'right' }}>
                          {result === 'exact' ? '🎯' : result === 'correct' ? '✓' : '✗'}
                          <div style={{ fontWeight: '700', color: result === 'exact' ? 'var(--accent-green)' : result === 'correct' ? 'var(--accent-blue)' : 'var(--accent-red)' }}>
                            {pred.points_awarded || 0}pts
                          </div>
                        </div>
                      )}
                      {!kicked && <span style={{ fontSize: '10px', color: 'var(--accent-blue)', fontWeight: '700' }}>🔮</span>}
                      {match?.status === 'completed' && memberReactions[pred.match_id || match?.id] && (
                        <span style={{ fontSize: '16px' }}>
                          {memberReactions[pred.match_id || match?.id] === 'fire' ? '🔥' : memberReactions[pred.match_id || match?.id] === 'laugh' ? '😂' : '💀'}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          ) : null}
          {/* Group position bonus breakdown — per group */}
          {activeTab === 'group' && groupPositionBreakdown.length > 0 && (() => {
            // Group by group_name
            const byGroup = {}
            groupPositionBreakdown.forEach(row => {
              if (!byGroup[row.group_name]) byGroup[row.group_name] = []
              byGroup[row.group_name].push(row)
            })
            // Calculate total including perfect bonuses
            const total = Object.values(byGroup).reduce((sum, rows) => {
              const pp = rows.reduce((s, r) => s + (r.points_awarded || 0), 0)
              const isPerfect = rows.filter(r => r.points_awarded > 0).length === 4
              return sum + pp + (isPerfect ? 5 : 0)
            }, 0)
            return (
              <div style={{ marginTop: '12px', border: '1px solid rgba(0,122,51,0.2)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ padding: '10px 14px', background: 'rgba(0,122,51,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--accent-green)' }}>📊 Group position bonus</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>+2pts per correct position · +5pts perfect group</div>
                  </div>
                  <div style={{ fontWeight: '900', fontSize: '20px', fontFamily: 'var(--font-mono)', color: 'var(--accent-green)', letterSpacing: '-0.02em' }}>+{total}</div>
                </div>
                {/* Per-group breakdown */}
                {Object.entries(byGroup).map(([groupName, rows]) => {
                  const positionPts = rows.reduce((sum, r) => sum + (r.points_awarded || 0), 0)
                  const correct = rows.filter(r => r.points_awarded > 0).length
                  const isPerfect = correct === 4
                  const groupPts = positionPts + (isPerfect ? 5 : 0)
                  return (
                    <div key={groupName} style={{ padding: '8px 14px', borderTop: '1px solid var(--border-light)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontWeight: '700', fontSize: '12px' }}>Group {groupName}</span>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: groupPts > 0 ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                          {isPerfect ? '🎯 Perfect! ' : ''}{groupPts > 0 ? `+${groupPts}pts` : '0pts'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {rows.map((row, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                            <span style={{ color: 'var(--text-muted)', minWidth: '16px', fontWeight: '700' }}>#{row.predicted_position}</span>
                            <span style={{ fontSize: '14px' }}>{row.team?.flag_emoji}</span>
                            <span style={{ flex: 1, color: row.points_awarded > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>{row.team?.short_code}</span>
                            <span style={{ fontWeight: '700', color: row.points_awarded > 0 ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                              {row.points_awarded > 0 ? `✓ +${row.points_awarded}pts` : '✗'}
                            </span>
                          </div>
                        ))}
                        {isPerfect && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', marginTop: '2px' }}>
                            <span style={{ minWidth: '16px' }}>🎯</span>
                            <span style={{ flex: 1, fontWeight: '700', color: 'var(--accent-gold)' }}>Perfect group bonus</span>
                            <span style={{ fontWeight: '800', color: 'var(--accent-gold)' }}>+5pts</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
          {activeTab === 'knockout' ? (
            <KnockoutPicksView userId={memberModal.userId} leagueId={memberModal.leagueId} lockedSnapshot={memberModal.lockedSnapshot} />
          ) : activeTab === 'awards' ? (
            <AwardPredsView userId={memberModal.userId} leagueId={memberModal.leagueId} lockedSnapshot={memberModal.lockedSnapshot} />
          ) : activeTab === 'compare' ? (
            <CompareWithMeView myUserId={currentUserId} targetUserId={memberModal.userId} targetName={memberModal.username} leagueId={memberModal.leagueId} lockedSnapshot={memberModal.lockedSnapshot} targetShowFuture={memberModal.targetShowFuture} />
          ) : activeTab === 'standings' ? (
            <>
              <MemberStandingsView predictions={memberPredictions} />
              {groupPositionBreakdown.length > 0 && (() => {
                const byGroup = {}
                groupPositionBreakdown.forEach(row => {
                  if (!byGroup[row.group_name]) byGroup[row.group_name] = []
                  byGroup[row.group_name].push(row)
                })
                const total = Object.values(byGroup).reduce((sum, rows) => {
                  const pp = rows.reduce((s, r) => s + (r.points_awarded || 0), 0)
                  const isPerfect = rows.filter(r => r.points_awarded > 0).length === 4
                  return sum + pp + (isPerfect ? 5 : 0)
                }, 0)
                return (
                  <div style={{ marginTop: '16px', border: '1px solid rgba(0,122,51,0.2)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                    <div style={{ padding: '10px 14px', background: 'rgba(0,122,51,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--accent-green)' }}>📊 Group position bonus</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>+2pts per correct position · +5pts perfect group</div>
                      </div>
                      <div style={{ fontWeight: '900', fontSize: '20px', fontFamily: 'var(--font-mono)', color: 'var(--accent-green)', letterSpacing: '-0.02em' }}>+{total}</div>
                    </div>
                    {Object.entries(byGroup).map(([groupName, rows]) => {
                      const correct = rows.filter(r => r.points_awarded > 0).length
                      const isPerfect = correct === 4
                      const groupPts = rows.reduce((s, r) => s + (r.points_awarded || 0), 0) + (isPerfect ? 5 : 0)
                      return (
                        <div key={groupName} style={{ padding: '8px 14px', borderTop: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: '700', fontSize: '12px', minWidth: '60px' }}>Group {groupName}</span>
                          <div style={{ flex: 1, display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {rows.map((r, i) => (
                              <span key={i} style={{ fontSize: '10px', padding: '2px 5px', borderRadius: '20px', background: r.points_awarded > 0 ? 'rgba(0,122,51,0.1)' : 'rgba(198,40,40,0.07)', color: r.points_awarded > 0 ? 'var(--accent-green)' : '#c62828', fontWeight: '700' }}>
                                {r.team?.flag_emoji} {r.points_awarded > 0 ? `+${r.points_awarded}` : '✗'}
                              </span>
                            ))}
                            {isPerfect && <span style={{ fontSize: '10px', padding: '2px 5px', borderRadius: '20px', background: 'rgba(184,134,11,0.1)', color: 'var(--accent-gold)', fontWeight: '700' }}>🎯+5</span>}
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: groupPts > 0 ? 'var(--accent-green)' : 'var(--text-muted)' }}>+{groupPts}pts</span>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
