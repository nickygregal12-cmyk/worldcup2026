import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ALL_STAGES, calcPredictedStandings, resolveSlot } from '../lib/bracketUtils.js'
import { supabase } from '../lib/supabase.js'
import { avatarColor } from '../lib/avatarColor.js'
import { useAuthStore, useAppStore } from '../store/index.js'

const TOURNAMENT_START = new Date('2026-06-11T19:00:00Z')
const KO_OPEN_DATE = new Date('2026-06-27T22:00:00Z')

function MemberStandingsView({ predictions }) {
  const standings = {}

  predictions.forEach(pred => {
    const match = pred.match
    if (!match) return
    const h = pred.home_score ?? pred.home_score
    const a = pred.away_score ?? pred.away_score
    if (h === null || h === undefined || a === null || a === undefined) return

    // Handle both data structures — offline has group.name, real users have stage only
    const group = match.group?.name || match.group_name
    if (!group || (match.stage && match.stage !== 'group')) return

    const homeId = match.home_team?.name
    const awayId = match.away_team?.name
    if (!homeId || !awayId) return

    if (!standings[group]) standings[group] = {}
    if (!standings[group][homeId]) standings[group][homeId] = { name: homeId, flag: match.home_team?.flag_emoji, pts: 0, gf: 0, ga: 0, played: 0 }
    if (!standings[group][awayId]) standings[group][awayId] = { name: awayId, flag: match.away_team?.flag_emoji, pts: 0, gf: 0, ga: 0, played: 0 }

    const hs = Number(h), as = Number(a)
    standings[group][homeId].gf += hs; standings[group][homeId].ga += as; standings[group][homeId].played++
    standings[group][awayId].gf += as; standings[group][awayId].ga += hs; standings[group][awayId].played++
    if (hs > as) { standings[group][homeId].pts += 3 }
    else if (hs === as) { standings[group][homeId].pts += 1; standings[group][awayId].pts += 1 }
    else { standings[group][awayId].pts += 3 }
  })

  const groupKeys = Object.keys(standings).sort()

  if (groupKeys.length === 0) return (
    <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
      <div style={{ fontWeight: '700' }}>No predictions to show standings</div>
      <div style={{ fontSize: '12px', marginTop: '4px' }}>Predictions must be visible to calculate standings</div>
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
      {groupKeys.map(group => {
        const teams = Object.values(standings[group])
          .sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf)
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
  const [picks, setPicks] = React.useState({})       // match_number -> {winner_id, is_joker}
  const [groupPreds, setGroupPreds] = React.useState({}) // match_id -> {home, away}
  const [matches, setMatches] = React.useState([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      const koTable = lockedSnapshot ? 'league_knockout_picks' : 'knockout_picks'
      let koQuery = supabase.from(koTable)
        .select('match_number, stage, winner_team_id, is_joker')
        .eq('user_id', userId)
      if (lockedSnapshot && leagueId) koQuery = koQuery.eq('league_id', leagueId)

      // Group predictions: locked leagues snapshot to league_predictions, else live predictions
      const predTable = lockedSnapshot ? 'league_predictions' : 'predictions'
      let predQuery = supabase.from(predTable)
        .select('match_id, home_score, away_score')
        .eq('user_id', userId)
      if (lockedSnapshot && leagueId) predQuery = predQuery.eq('league_id', leagueId)

      const [koRes, predRes, matchRes] = await Promise.all([
        koQuery.order('match_number', { ascending: true }),
        predQuery,
        supabase.from('matches')
          .select('id, match_number, stage, home_team_id, away_team_id, group:group_id(name), home_team:home_team_id(id,name,flag_emoji,short_code), away_team:away_team_id(id,name,flag_emoji,short_code)'),
      ])
      if (cancelled) return

      const km = {}
      ;(koRes.data || []).forEach(p => { km[p.match_number] = { winner_id: p.winner_team_id, is_joker: p.is_joker, stage: p.stage } })
      const pm = {}
      ;(predRes.data || []).forEach(p => {
        if (p.home_score !== null && p.away_score !== null) pm[p.match_id] = { home: p.home_score, away: p.away_score }
      })
      setPicks(km)
      setGroupPreds(pm)
      setMatches(matchRes.data || [])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [userId, leagueId, lockedSnapshot])

  const groupMatches = React.useMemo(() => matches.filter(m => m.stage === 'group'), [matches])
  const standings = React.useMemo(() => calcPredictedStandings(groupMatches, groupPreds), [groupMatches, groupPreds])
  const teamsById = React.useMemo(() => {
    const map = {}
    matches.forEach(m => { if (m.home_team) map[m.home_team.id] = m.home_team; if (m.away_team) map[m.away_team.id] = m.away_team })
    return map
  }, [matches])

  // Resolve a slot live, same chain the bracket uses: group slots from this
  // member's standings, W-slots from the winner THEY picked in the prior round.
  const resolveTeam = (slot) => {
    if (!slot) return null
    if (slot.startsWith('W')) {
      const mn = parseInt(slot.replace('W', ''))
      const wid = picks[mn]?.winner_id
      return wid ? (teamsById[wid] || null) : null
    }
    if (slot.startsWith('L')) return null
    return resolveSlot(slot, standings, groupMatches, groupPreds)
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}><div className="spinner" /></div>
  if (Object.keys(picks).length === 0) return (
    <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏆</div>
      <div style={{ fontWeight: '700' }}>No knockout picks yet</div>
    </div>
  )

  const teamStyle = (won) => ({ fontSize: '13px', fontWeight: won ? '800' : '500', color: won ? 'var(--text-primary)' : 'var(--text-muted)' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {ALL_STAGES.map(stage => {
        const stageMatches = stage.matches.filter(md => picks[md.match_number]?.winner_id)
        if (stageMatches.length === 0) return null
        return (
          <div key={stage.key}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
              {stage.label}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {stageMatches.map(md => {
                const pick = picks[md.match_number]
                const home = resolveTeam(md.home_slot)
                const away = resolveTeam(md.away_slot)
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
                        <span style={{ fontSize: '11px', color: 'var(--accent-green)', fontWeight: '700', marginLeft: '6px', whiteSpace: 'nowrap' }}>
                          → {winner?.short_code || winner?.name || '?'}
                        </span>
                      </div>
                    ) : (
                      // Matchup can't be resolved (incomplete group preds) — show winner only
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
  const [preds, setPreds] = React.useState([])
  const [goals, setGoals] = React.useState([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const awardTable = lockedSnapshot ? 'league_award_predictions' : 'award_predictions'
    const goalTable = lockedSnapshot ? 'league_tournament_predictions' : 'tournament_predictions'

    let awardQuery = supabase.from(awardTable).select('award_type, predicted_player_name').eq('user_id', userId)
    let goalQuery = supabase.from(goalTable).select('prediction_type, int_value').eq('user_id', userId).eq('prediction_type', 'total_goals')

    if (lockedSnapshot && leagueId) {
      awardQuery = awardQuery.eq('league_id', leagueId)
      goalQuery = goalQuery.eq('league_id', leagueId)
    }

    Promise.all([awardQuery, goalQuery]).then(([{ data: awardData }, { data: goalData }]) => {
      setPreds(awardData || [])
      setGoals(goalData || [])
      setLoading(false)
    })
  }, [userId, leagueId, lockedSnapshot])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}><div className="spinner" /></div>
  if (preds.length === 0 && goals.length === 0) return (
    <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>🥇</div>
      <div style={{ fontWeight: '700' }}>No award predictions yet</div>
    </div>
  )

  const labels = { golden_boot: '⚽ Golden Boot', golden_glove: '🧤 Golden Glove', player_of_tournament: '🌟 Player of the Tournament' }
  const goalLabels = { total_goals: '🌍 Tournament Total Goals' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {preds.map(pred => (
        <div key={pred.award_type} style={{ padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '4px' }}>{labels[pred.award_type] || pred.award_type}</div>
          <div style={{ fontSize: '14px', fontWeight: '700' }}>{pred.predicted_player_name || '—'}</div>
        </div>
      ))}
      {goals.map(g => (
        <div key={g.prediction_type} style={{ padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '4px' }}>{goalLabels[g.prediction_type] || g.prediction_type}</div>
          <div style={{ fontSize: '14px', fontWeight: '700' }}>{g.int_value} goals</div>
        </div>
      ))}
    </div>
  )
}

function CompareWithMeView({ myUserId, targetUserId, targetName, leagueId, lockedSnapshot = false, targetShowFuture = false }) {
  const [loading, setLoading] = React.useState(true)
  const [rows, setRows] = React.useState([])
  const [awards, setAwards] = React.useState([])
  const [totals, setTotals] = React.useState({ same: 0, different: 0 })

  React.useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      const table = lockedSnapshot ? 'league_predictions' : 'predictions'
      let query = supabase.from(table)
        .select(`
          user_id, match_id, home_score, away_score,
          match:match_id(id, match_number, kickoff_time, stage, status,
            home_team:home_team_id(name,flag_emoji,short_code),
            away_team:away_team_id(name,flag_emoji,short_code))
        `)
        .in('user_id', [myUserId, targetUserId])

      if (lockedSnapshot && leagueId) query = query.eq('league_id', leagueId)

      const awardTable = lockedSnapshot ? 'league_award_predictions' : 'award_predictions'
      const goalTable = lockedSnapshot ? 'league_tournament_predictions' : 'tournament_predictions'
      let myAwardQuery = supabase.from(awardTable).select('award_type, predicted_player_name').eq('user_id', myUserId)
      let targetAwardQuery = supabase.from(awardTable).select('award_type, predicted_player_name').eq('user_id', targetUserId)
      let myGoalQuery = supabase.from(goalTable).select('prediction_type, int_value').eq('user_id', myUserId).eq('prediction_type', 'total_goals')
      let targetGoalQuery = supabase.from(goalTable).select('prediction_type, int_value').eq('user_id', targetUserId).eq('prediction_type', 'total_goals')
      if (lockedSnapshot && leagueId) {
        myAwardQuery = myAwardQuery.eq('league_id', leagueId)
        targetAwardQuery = targetAwardQuery.eq('league_id', leagueId)
        myGoalQuery = myGoalQuery.eq('league_id', leagueId)
        targetGoalQuery = targetGoalQuery.eq('league_id', leagueId)
      }
      const [{ data: matchData }, { data: myAwards }, { data: targetAwards }, { data: myGoals }, { data: targetGoals }] = await Promise.all([
        query,
        myAwardQuery,
        targetAwardQuery,
        myGoalQuery,
        targetGoalQuery,
      ])

      if (cancelled) return

      const visibleMatchData = (matchData || []).filter(p => {
        if (lockedSnapshot) return true
        if (p.user_id === myUserId) return true
        const kicked = new Date(p.match?.kickoff_time) <= new Date()
        return kicked || targetShowFuture
      })

      const mineByMatch = {}
      const theirsByMatch = {}
      visibleMatchData.forEach(p => {
        if (p.user_id === myUserId) mineByMatch[p.match_id] = p
        if (p.user_id === targetUserId) theirsByMatch[p.match_id] = p
      })

      const comparisonRows = Object.keys(theirsByMatch).map(matchId => {
        const mine = mineByMatch[matchId]
        const theirs = theirsByMatch[matchId]
        const same = mine && theirs && mine.home_score === theirs.home_score && mine.away_score === theirs.away_score
        const sameResult = mine && theirs && Math.sign(mine.home_score - mine.away_score) === Math.sign(theirs.home_score - theirs.away_score)
        return { matchId, mine, theirs, same, sameResult, match: theirs.match }
      }).sort((a, b) => (a.match?.match_number || 0) - (b.match?.match_number || 0))

      const awardLabels = { golden_boot: 'Golden Boot', golden_glove: 'Golden Glove', player_of_tournament: 'Player of the Tournament' }
      const myAwardMap = {}
      const targetAwardMap = {}
      ;(myAwards || []).forEach(a => { myAwardMap[a.award_type] = a.predicted_player_name })
      ;(targetAwards || []).forEach(a => { targetAwardMap[a.award_type] = a.predicted_player_name })
      const awardRows = Object.keys(awardLabels).filter(k => myAwardMap[k] || targetAwardMap[k]).map(k => ({
        label: awardLabels[k],
        mine: myAwardMap[k] || '—',
        theirs: targetAwardMap[k] || '—',
        same: myAwardMap[k] && targetAwardMap[k] && myAwardMap[k] === targetAwardMap[k]
      }))
      const myTotalGoals = (myGoals || [])[0]?.int_value
      const targetTotalGoals = (targetGoals || [])[0]?.int_value
      if (myTotalGoals || targetTotalGoals) awardRows.push({ label: 'Total Goals', mine: myTotalGoals ? `${myTotalGoals}` : '—', theirs: targetTotalGoals ? `${targetTotalGoals}` : '—', same: myTotalGoals && targetTotalGoals && myTotalGoals === targetTotalGoals })

      setRows(comparisonRows)
      setAwards(awardRows)
      setTotals({ same: comparisonRows.filter(r => r.same).length, different: comparisonRows.filter(r => !r.same).length })
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [myUserId, targetUserId, targetName, leagueId, lockedSnapshot, targetShowFuture])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}><div className="spinner" /></div>

  const hiddenMessage = !lockedSnapshot && !targetShowFuture

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ padding: '12px 14px', background: lockedSnapshot ? 'rgba(245,158,11,0.10)' : 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}>
        <div style={{ fontSize: '13px', fontWeight: '800', marginBottom: '4px' }}>You vs {targetName}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {lockedSnapshot ? 'Comparing frozen league predictions.' : hiddenMessage ? 'Only visible picks are compared. Future hidden picks stay private.' : 'Comparing visible live predictions.'}
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
          <span style={{ fontSize: '11px', fontWeight: '800', padding: '4px 8px', borderRadius: 'var(--radius-full)', background: 'var(--accent-green-light)', color: 'var(--accent-green)' }}>Same scores: {totals.same}</span>
          <span style={{ fontSize: '11px', fontWeight: '800', padding: '4px 8px', borderRadius: 'var(--radius-full)', background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border-light)' }}>Different: {totals.different}</span>
        </div>
      </div>

      {awards.length > 0 && (
        <div>
          <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Awards & totals</div>
          {awards.map(row => (
            <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', alignItems: 'center', padding: '8px 10px', background: row.same ? 'var(--accent-green-light)' : 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>{row.label}</span>
              <span style={{ fontSize: '12px', fontWeight: '800' }}>You: {row.mine}</span>
              <span style={{ fontSize: '12px', fontWeight: '800' }}>{targetName}: {row.theirs}</span>
            </div>
          ))}
        </div>
      )}

      <div>
        <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Match predictions</div>
        {rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '28px', marginBottom: '6px' }}>🔒</div>
            <div style={{ fontWeight: '700' }}>No comparable picks visible yet</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>Future rolling-league picks stay private unless sharing is enabled.</div>
          </div>
        ) : rows.map(row => (
          <div key={row.matchId} style={{ padding: '10px 12px', background: row.same ? 'var(--accent-green-light)' : row.sameResult ? 'var(--accent-blue-light)' : 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', marginBottom: '7px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '18px' }}>{row.match?.home_team?.flag_emoji}</span>
              <span style={{ flex: 1, fontSize: '12px', fontWeight: '800' }}>{row.match?.home_team?.short_code} vs {row.match?.away_team?.short_code}</span>
              <span style={{ fontSize: '18px' }}>{row.match?.away_team?.flag_emoji}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>#{row.match?.match_number}</span>
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


// Warns the logged-in user at the top of their leagues if their OWN
// predictions (groups / knockout bracket / awards) aren't finished — leagues
// are a common place people check, so we nudge here too.
function MyPredictionsProgress({ userId }) {
  const [state, setState] = React.useState(null)

  React.useEffect(() => {
    if (!userId) return
    let cancelled = false
    const load = async () => {
      const [groupRes, koRes, awardRes, goalRes] = await Promise.all([
        supabase.from('predictions').select('id', { count: 'exact', head: true })
          .eq('user_id', userId).not('home_score', 'is', null).not('away_score', 'is', null),
        supabase.from('knockout_picks').select('match_number', { count: 'exact', head: true })
          .eq('user_id', userId).not('winner_team_id', 'is', null),
        supabase.from('award_predictions').select('award_type', { count: 'exact', head: true })
          .eq('user_id', userId),
        supabase.from('tournament_predictions').select('id', { count: 'exact', head: true })
          .eq('user_id', userId).eq('prediction_type', 'total_goals').not('int_value', 'is', null),
      ])
      if (cancelled) return
      setState({
        groups: groupRes.count || 0,
        knockout: koRes.count || 0,
        awards: (awardRes.count || 0) + (goalRes.count || 0),
      })
    }
    load()
    return () => { cancelled = true }
  }, [userId])

  if (!state) return null

  const items = [
    { label: 'Group predictions', done: state.groups, total: 72, to: '/predictions' },
    { label: 'Knockout bracket', done: state.knockout, total: 31, to: '/knockout' },
    { label: 'Award picks', done: state.awards, total: 4, to: '/awards' },
  ]
  const unfinished = items.filter(i => i.done < i.total)
  if (unfinished.length === 0) return null

  return (
    <div style={{ background: 'rgba(230,81,0,0.1)', border: '1px solid rgba(255,152,0,0.5)', borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: '12px' }}>
      <div style={{ fontSize: '13px', fontWeight: '800', color: '#e65100', marginBottom: '8px' }}>
        ⚠️ Your predictions aren't finished
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px', lineHeight: 1.4 }}>
        Finish these so you score full points in every league you're in:
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {unfinished.map(i => (
          <Link key={i.label} to={i.to} style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{i.label}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', fontWeight: '700', color: '#e65100' }}>{i.done}/{i.total}</span>
                <span style={{ fontSize: '12px', color: 'var(--scottish-navy)', fontWeight: '700' }}>Finish →</span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default function Leagues() {
  const { user, isAdmin } = useAuthStore()
  const [activeGame, setActiveGame] = useState('tournament')
  const [overallRows, setOverallRows] = useState([])
  const [loadingOverall, setLoadingOverall] = useState(false)
  const [openLeagueMenu, setOpenLeagueMenu] = useState(null)
  const [myLeagues, setMyLeagues] = useState([])
  const [myKoLeagues, setMyKoLeagues] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [newLeagueName, setNewLeagueName] = useState('')
  const [newLeagueLockType, setNewLeagueLockType] = useState('rolling')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [expandedLeague, setExpandedLeague] = useState(null)
  const [leagueMembers, setLeagueMembers] = useState({})
  const [loadingMembers, setLoadingMembers] = useState({})
  const [confirmAction, setConfirmAction] = useState(null)
  const [memberModal, setMemberModal] = useState(null)
  const [memberPredictions, setMemberPredictions] = useState([])
  const [memberReactions, setMemberReactions] = useState({}) // matchId -> reaction emoji
  const [loadingPreds, setLoadingPreds] = useState(false)
  const [matchOdds, setMatchOdds] = useState({})
  const [showWelcome, setShowWelcome] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('wc26_seen_welcome') !== 'true'
  })

  const dismissWelcome = () => {
    window.localStorage.setItem('wc26_seen_welcome', 'true')
    setShowWelcome(false)
  }

  const { appSettings } = useAppStore()
  const phaseOverride = appSettings?.game_phase_override || ''
  const tournamentLive = new Date() >= TOURNAMENT_START
  const koLive = phaseOverride === 'ko_predictor' || phaseOverride === 'post_tournament'
    ? true
    : phaseOverride && phaseOverride !== 'ko_predictor' ? false
    : new Date() >= KO_OPEN_DATE

  useEffect(() => { if (user) { loadMyLeagues(); loadMyKoLeagues(); loadOverallRankings() } }, [user])

  const loadOverallRankings = async () => {
    setLoadingOverall(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, username, display_name, total_points, streak_current, exact_scores, avatar_emoji, show_future_predictions')
      .order('total_points', { ascending: false })
      .order('exact_scores', { ascending: false })
      .limit(100)
    setOverallRows(data || [])
    setLoadingOverall(false)
  }

  const openOverallProfile = async (profile) => {
    const displayName = profile.display_name || profile.username || 'Unknown'
    const showFuture = profile.show_future_predictions !== false || profile.id === user.id
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
    })
    await loadMemberPredictions(profile.id, showFuture)
  }

  const loadMyLeagues = async () => {
    const { data: memberships } = await supabase
      .from('league_members')
      .select('league_id, league:league_id(id, name, invite_code, is_global, created_by, scoring_preset, custom_scoring, lock_type, snapshot_taken_at)')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false })

    if (!memberships) { setLoading(false); return }

    const leagueIds = memberships.map(m => m.league_id)
    const { data: counts } = await supabase
      .from('league_members')
      .select('league_id')
      .in('league_id', leagueIds)

    const countMap = {}
    counts?.forEach(c => { countMap[c.league_id] = (countMap[c.league_id] || 0) + 1 })

    // Add offline players to counts
    const { data: offlineCounts } = await supabase
      .from('offline_players').select('league_id').in('league_id', leagueIds)
    offlineCounts?.forEach(c => { countMap[c.league_id] = (countMap[c.league_id] || 0) + 1 })

    const leagues = memberships.map(m => ({
      ...m,
      memberCount: countMap[m.league_id] || 1,
    }))
    leagues.sort((a, b) => (b.league?.is_global ? 1 : 0) - (a.league?.is_global ? 1 : 0))
    setMyLeagues(leagues)
    setLoading(false)

    // Auto-load all league members
    leagues.forEach(m => {
      if (m.league_id) loadLeagueMembers(m.league_id)
    })
  }

  const loadMyKoLeagues = async () => {
    const { data: memberships } = await supabase
      .from('ko_league_members')
      .select('league_id, league:league_id(id, name, invite_code, created_by)')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false })
    if (!memberships) return
    const leagueIds = memberships.map(m => m.league_id)
    const { data: counts } = await supabase
      .from('ko_league_members').select('league_id').in('league_id', leagueIds)
    const countMap = {}
    counts?.forEach(c => { countMap[c.league_id] = (countMap[c.league_id] || 0) + 1 })
    setMyKoLeagues(memberships.map(m => ({ ...m, memberCount: countMap[m.league_id] || 1 })))
  }

  const createKoLeague = async () => {
    if (!newLeagueName.trim()) { setError('Please enter a league name'); return }
    setError('')
    const code = generateCode()
    const { data: league, error: err } = await supabase
      .from('ko_leagues')
      .insert({ name: newLeagueName.trim(), invite_code: code, created_by: user.id, is_global: false })
      .select().single()
    if (err) { setError(err.message); return }
    await supabase.from('ko_league_members').insert({ league_id: league.id, user_id: user.id })
    setSuccess(`KO League created! Share code: ${code}`)
    setNewLeagueName(''); setShowCreate(false)
    loadMyKoLeagues()
  }

  const joinKoLeague = async () => {
    if (!joinCode.trim()) { setError('Enter an invite code'); return }
    setError('')
    const { data: league } = await supabase.from('ko_leagues').select('*').eq('invite_code', joinCode.toUpperCase().trim()).single()
    if (!league) { setError('KO League not found — check the code'); return }
    const { error: err } = await supabase.from('ko_league_members').insert({ league_id: league.id, user_id: user.id })
    if (err?.code === '23505') { setError('You are already in this league'); return }
    if (err) { setError(err.message); return }
    setSuccess(`Joined KO league "${league.name}"!`)
    setJoinCode(''); setShowJoin(false)
    loadMyKoLeagues()
  }

  const leaveKoLeague = async (leagueId, leagueName) => {
    await supabase.from('ko_league_members').delete().eq('league_id', leagueId).eq('user_id', user.id)
    setSuccess(`Left "${leagueName}"`)
    loadMyKoLeagues()
  }

  const deleteKoLeague = async (leagueId, leagueName) => {
    await supabase.from('ko_league_members').delete().eq('league_id', leagueId)
    await supabase.from('ko_leagues').delete().eq('id', leagueId)
    setSuccess(`Deleted "${leagueName}"`)
    loadMyKoLeagues()
  }

  const loadLeagueMembers = async (leagueId) => {
    setLoadingMembers(prev => ({ ...prev, [leagueId]: true }))
    const { data } = await supabase
      .from('league_members')
      .select('*, league_points, profile:user_id(id, username, total_points, display_name, streak_current, exact_scores, avatar_emoji)')
      .eq('league_id', leagueId)
      .order('joined_at', { ascending: true })

    // Also fetch offline players for this league
    const { data: offlinePlayers, error: offlineError } = await supabase
      .from('offline_players')
      .select('id, display_name, league_id')
      .eq('league_id', leagueId)

    if (offlineError) console.error('Offline players error:', offlineError)

    // Merge offline players as pseudo-members
    const offlineMembers = (offlinePlayers || []).map(p => ({
      user_id: p.id,
      league_id: leagueId,
      is_offline: true,
      profile: {
        id: p.id,
        display_name: p.display_name,
        username: p.display_name,
        total_points: 0,
        is_offline: true,
      }
    }))

    setLeagueMembers(prev => ({ ...prev, [leagueId]: [...(data || []), ...offlineMembers] }))
    setLoadingMembers(prev => ({ ...prev, [leagueId]: false }))

    if (tournamentLive) {
      loadPreMatchStats(leagueId, data || [])
    }
  }

  // Reload league members when leagues change to pick up offline players
  useEffect(() => {
    if (myLeagues.length > 0) {
      myLeagues.forEach(m => {
        if (m.league_id) loadLeagueMembers(m.league_id)
      })
    }
  }, [myLeagues.length])

  // Item 5: Pre-match % — what % of league picked each outcome for next matches
  const loadPreMatchStats = async (leagueId, members) => {
    const now = new Date().toISOString()
    const memberIds = members.map(m => m.user_id)
    if (!memberIds.length) return

    // Get next 3 upcoming matches
    const { data: upcoming } = await supabase
      .from('matches')
      .select('id, kickoff_time, home_team:home_team_id(name,flag_emoji,short_code), away_team:away_team_id(name,flag_emoji,short_code)')
      .eq('status', 'scheduled')
      .gt('kickoff_time', now)
      .order('kickoff_time', { ascending: true })
      .limit(3)

    if (!upcoming?.length) return

    // Get all member predictions for those matches
    const matchIds = upcoming.map(m => m.id)
    const { data: preds } = await supabase
      .from('predictions')
      .select('user_id, match_id, home_score, away_score')
      .in('match_id', matchIds)
      .in('user_id', memberIds)

    // Calculate % for each match
    const stats = {}
    upcoming.forEach(match => {
      const matchPreds = (preds || []).filter(p => p.match_id === match.id)
      const total = matchPreds.length
      if (!total) return
      const homeWins = matchPreds.filter(p => p.home_score > p.away_score).length
      const draws    = matchPreds.filter(p => p.home_score === p.away_score).length
      const awayWins = matchPreds.filter(p => p.home_score < p.away_score).length
      stats[match.id] = {
        match,
        total,
        home: Math.round((homeWins / total) * 100),
        draw: Math.round((draws / total) * 100),
        away: Math.round((awayWins / total) * 100),
      }
    })
    setMatchOdds(prev => ({ ...prev, [leagueId]: stats }))
  }

  const loadMemberPredictions = async (userId, showFuture) => {
    setLoadingPreds(true)
    const { data: preds, error } = await supabase
      .from('predictions')
      .select(`*, match:match_id(match_number, kickoff_time, stage, status, home_score, away_score, group:group_id(name), home_team:home_team_id(name,flag_emoji,short_code), away_team:away_team_id(name,flag_emoji,short_code))`)
      .eq('user_id', userId)

    const filtered = (preds || [])
      .filter(p => {
        const kicked = new Date(p.match?.kickoff_time) <= new Date()
        // Also show if match status is completed or live (locked regardless of toggle)
        const isLocked = p.match?.status === 'completed' || p.match?.status === 'live'
        return kicked || isLocked || showFuture
      })
      .sort((a, b) => new Date(a.match?.kickoff_time) - new Date(b.match?.kickoff_time))
    setMemberPredictions(filtered)

    // Load this member's reactions for completed matches
    const completedMatchIds = filtered
      .filter(p => p.match?.status === 'completed')
      .map(p => p.match_id || p.match?.id)
      .filter(Boolean)

    if (completedMatchIds.length > 0) {
      const { data: reactionData } = await supabase
        .from('match_reactions')
        .select('match_id, reaction')
        .eq('user_id', userId)
        .in('match_id', completedMatchIds)
      const reactionMap = {}
      reactionData?.forEach(r => { reactionMap[r.match_id] = r.reaction })
      setMemberReactions(reactionMap)
    } else {
      setMemberReactions({})
    }

    setLoadingPreds(false)
  }

  const loadLockedMemberPredictions = async (leagueId, userId) => {
    setLoadingPreds(true)
    const { data: preds } = await supabase
      .from('league_predictions')
      .select(`
        home_score, away_score, is_confident,
        match:match_id(id, match_number, kickoff_time, stage, status, home_score, away_score,
          group:group_id(name),
          home_team:home_team_id(name,flag_emoji,short_code),
          away_team:away_team_id(name,flag_emoji,short_code))
      `)
      .eq('league_id', leagueId)
      .eq('user_id', userId)

    const sorted = (preds || []).sort((a, b) => new Date(a.match?.kickoff_time) - new Date(b.match?.kickoff_time))
    setMemberPredictions(sorted)
    setLoadingPreds(false)
  }

  const openMemberModal = async (member, leagueId) => {
    const leagueEntry = myLeagues.find(m => m.league_id === leagueId)
    const league = leagueEntry?.league
    const lockedSnapshot = league?.lock_type === 'pre_tournament' && !!league?.snapshot_taken_at
    const isOffline = member.profile?.is_offline || member.is_offline
    const displayName = member.profile?.display_name || member.profile?.username || 'Unknown'
    const isMe = member.user_id === user.id
    const isLeagueCreator = league?.created_by === member.user_id
    const canRemoveMember = (league?.created_by === user?.id || isAdmin) && !isMe && !isLeagueCreator && !league?.is_global
    setMemberModal({ userId: member.user_id, username: displayName, leagueId, isOffline, lockedSnapshot, leagueName: league?.name, targetShowFuture: lockedSnapshot || false, canRemoveMember, memberName: displayName })

    if (lockedSnapshot) {
      await loadLockedMemberPredictions(leagueId, member.user_id)
    } else if (isOffline) {
      // Load from offline_predictions table
      const { data: preds } = await supabase
        .from('offline_predictions')
        .select(`
          home_score, away_score, is_confident,
          match:match_id(id, kickoff_time, home_score, away_score, status,
            home_team:home_team_id(name, flag_emoji, short_code),
            away_team:away_team_id(name, flag_emoji, short_code),
            group:group_id(name))
        `)
        .eq('offline_player_id', member.user_id)
        .order('match_id')
      setMemberPredictions(preds || [])
    } else {
      const { data: profile } = await supabase
        .from('profiles').select('show_future_predictions').eq('id', member.user_id).single()
      const showFuture = profile?.show_future_predictions !== false || member.user_id === user.id
      setMemberModal(prev => ({ ...prev, targetShowFuture: showFuture }))
      await loadMemberPredictions(member.user_id, showFuture)
    }
  }

  const toggleExpand = async (leagueId) => {
    if (expandedLeague === leagueId) {
      setExpandedLeague(null)
    } else {
      setExpandedLeague(leagueId)
      if (!leagueMembers[leagueId]) await loadLeagueMembers(leagueId)
    }
  }

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  }

  const createLeague = async () => {
    if (!newLeagueName.trim()) { setError('Please enter a league name'); return }
    setError('')
    // Refresh session first to prevent stale token RLS errors
    await supabase.auth.refreshSession()
    const code = generateCode()
    const { data: league, error: err } = await supabase
      .from('leagues')
      .insert({ name: newLeagueName.trim(), invite_code: code, created_by: user.id, is_global: false, lock_type: newLeagueLockType })
      .select().single()
    if (err) { setError(err.message); return }
    await supabase.from('league_members').insert({ league_id: league.id, user_id: user.id })
    setSuccess(`League created! Share this code: ${code}`)
    setNewLeagueName(''); setNewLeagueLockType('rolling'); setShowCreate(false)
    loadMyLeagues()
  }

  const joinLeague = async () => {
    if (!joinCode.trim()) { setError('Enter an invite code'); return }
    setError('')
    // Refresh session first to prevent stale token RLS errors
    await supabase.auth.refreshSession()
    const { data: league } = await supabase.from('leagues').select('*').eq('invite_code', joinCode.toUpperCase().trim()).single()
    if (!league) { setError('League not found — check the code'); return }
    const { error: err } = await supabase.from('league_members').insert({ league_id: league.id, user_id: user.id })
    if (err?.code === '23505') { setError('You are already in this league'); return }
    if (err) { setError(err.message); return }
    setSuccess(`Joined "${league.name}"!`)
    setJoinCode(''); setShowJoin(false)
    loadMyLeagues()
  }

  const leaveLeague = async (leagueId, leagueName) => {
    await supabase.from('league_members').delete().eq('league_id', leagueId).eq('user_id', user.id)
    setSuccess(`Left "${leagueName}"`)
    setExpandedLeague(null)
    loadMyLeagues()
  }

  const removeMember = async (leagueId, memberId, memberName) => {
    await supabase.from('league_members').delete().eq('league_id', leagueId).eq('user_id', memberId)
    setSuccess(`Removed ${memberName} from league`)
    await loadLeagueMembers(leagueId)
    loadMyLeagues()
  }

  const deleteLeague = async (leagueId, leagueName) => {
    await supabase.from('leagues').delete().eq('id', leagueId)
    setSuccess(`Deleted "${leagueName}"`)
    setExpandedLeague(null)
    loadMyLeagues()
  }

  const copyInviteCode = (code) => {
    navigator.clipboard?.writeText(code)
    setSuccess(`Copied invite code: ${code}`)
    setTimeout(() => setSuccess(''), 3000)
  }

  const copyLeagueLink = (leagueName, code) => {
    const link = `${window.location.origin}/league/${code}`
    navigator.clipboard?.writeText(link)
    setSuccess(`Copied link for "${leagueName}"!`)
    setTimeout(() => setSuccess(''), 3000)
  }

  const shareWhatsApp = (leagueName, code) => {
    const link = `${window.location.origin}/league/${code}`
    const text = `Join my WC26 Predictor league "${leagueName}"! 🏆⚽\n${link}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const sortedMembers = (leagueId) => {
    const league = myLeagues.find(m => m.league_id === leagueId)
    const hasCustomScoring = league?.league?.scoring_preset && league.league.scoring_preset !== 'standard'
    return [...(leagueMembers[leagueId] || [])].sort((a, b) => {
      // Use league_points if any member has them, otherwise total_points
      const aLeaguePts = a.league_points ?? 0
      const bLeaguePts = b.league_points ?? 0
      const hasLeaguePts = (leagueMembers[leagueId] || []).some(m => (m.league_points ?? 0) > 0)
      if (hasLeaguePts || hasCustomScoring) return bLeaguePts - aLeaguePts
      return (b.profile?.total_points || 0) - (a.profile?.total_points || 0)
    })
  }

  const getPredResult = (pred) => {
    const m = pred.match
    if (m?.status !== 'completed') return 'pending'
    const correct = (m.home_score > m.away_score && pred.home_score > pred.away_score) ||
      (m.home_score === m.away_score && pred.home_score === pred.away_score) ||
      (m.home_score < m.away_score && pred.home_score < pred.away_score)
    const exact = m.home_score === pred.home_score && m.away_score === pred.away_score
    if (exact) return 'exact'
    if (correct) return 'correct'
    return 'wrong'
  }

  // Guest view
  if (!user) {
    return (
      <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(0,20,60,0.88) 0%, rgba(0,50,120,0.85) 100%), url(/hero-bg.jpg) center/cover no-repeat',
          padding: '40px 20px 32px', color: 'white', textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>👥</div>
          <h1 style={{ fontSize: '26px', fontWeight: '900', marginBottom: '8px' }}>Mini Leagues</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>
            Compete against your friends in a private league
          </p>
        </div>
        <div className="container" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="card" style={{ textAlign: 'center', padding: '32px 24px' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🏆</div>
            <div style={{ fontWeight: '800', fontSize: '18px', marginBottom: '8px' }}>Create your own league</div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '20px' }}>
              Set up a private league, share your invite code with friends, and see who predicted the tournament best. Up to unlimited members per league.
            </div>
            <Link to="/register" className="btn btn-primary btn-full" style={{ marginBottom: '10px' }}>🚀 Join free to create a league</Link>
            <Link to="/login" className="btn btn-secondary btn-full">Sign in</Link>
          </div>
          {[
            { icon: '🔒', title: 'Private & invite-only', desc: 'Only people with your code can join' },
            { icon: '📊', title: 'Your own leaderboard', desc: 'See exactly where you rank vs friends' },
            { icon: '💬', title: 'Share via WhatsApp', desc: 'One tap to invite your mates' },
            { icon: '🏆', title: 'Overall rankings too', desc: 'Compete on the main rankings once points go live' },
          ].map(item => (
            <div key={item.title} className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ fontSize: '28px', flexShrink: 0 }}>{item.icon}</div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '14px' }}>{item.title}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, rgba(0,30,80,0.88) 0%, rgba(0,94,184,0.82) 100%), url(/leagues-bg.jpg) center/cover no-repeat', padding: '20px' }}>
        <div className="container">
          <div style={{ marginBottom: '12px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'white' }}>👥 Leagues</h1>
          </div>

          {/* Page toggle */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button onClick={() => { setActiveGame('tournament'); setShowCreate(false); setShowJoin(false); setError('') }} style={{
              flex: 1, padding: '8px', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: '700',
              background: activeGame === 'tournament' ? 'var(--scottish-navy)' : 'rgba(255,255,255,0.15)',
              color: activeGame === 'tournament' ? 'white' : 'rgba(255,255,255,0.8)',
              border: activeGame === 'tournament' ? '1px solid var(--scottish-navy)' : '1px solid rgba(255,255,255,0.3)',
              cursor: 'pointer',
            }}>🌍 Tournament Leagues</button>
            <button onClick={() => { setActiveGame('overall'); setShowCreate(false); setShowJoin(false); setError('') }} style={{
              flex: 1, padding: '8px', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: '700',
              background: activeGame === 'overall' ? 'var(--scottish-navy)' : 'rgba(255,255,255,0.15)',
              color: activeGame === 'overall' ? 'white' : 'rgba(255,255,255,0.8)',
              border: activeGame === 'overall' ? '1px solid var(--scottish-navy)' : '1px solid rgba(255,255,255,0.3)',
              cursor: 'pointer',
            }}>🏆 Overall Rankings</button>
            {koLive && (
              <button onClick={() => { setActiveGame('ko'); setShowCreate(false); setShowJoin(false); setError('') }} style={{
                flex: 1, padding: '8px', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: '700',
                background: activeGame === 'ko' ? '#e65100' : 'rgba(255,255,255,0.15)',
                color: activeGame === 'ko' ? 'white' : 'rgba(255,255,255,0.8)',
                border: activeGame === 'ko' ? '1px solid #e65100' : '1px solid rgba(255,255,255,0.3)',
                cursor: 'pointer',
              }}>🔥 KO Predictor <span style={{ fontSize: '10px', opacity: 0.8 }}>NEW</span></button>
            )}
          </div>

          {success && (
            <div style={{ padding: '12px 16px', background: 'var(--accent-green-light)', color: 'var(--accent-green)', borderRadius: 'var(--radius-md)', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
              ✅ {success}
              <button onClick={() => setSuccess('')} style={{ background: 'none', border: 'none', marginLeft: '8px', cursor: 'pointer', color: 'inherit' }}>×</button>
            </div>
          )}

          {showCreate && activeGame !== 'overall' && (
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '12px', border: `1px solid ${activeGame === 'ko' ? '#e65100' : 'var(--scottish-navy)'}` }}>
              <div style={{ fontWeight: '700', marginBottom: '4px' }}>
                {activeGame === 'ko' ? '🔥 Create a KO Predictor League' : '🌍 Create a League'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                {activeGame === 'ko' ? 'Separate from Tournament leagues — KO points only' : 'Group + knockout + awards predictions'}
              </div>
              <input className="input" placeholder="League name e.g. Office WC26" value={newLeagueName}
                onChange={e => setNewLeagueName(e.target.value)} style={{ marginBottom: activeGame === 'ko' ? '12px' : '10px' }} />
              {activeGame === 'tournament' && (
                <div style={{ marginBottom: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {[
                    { key: 'rolling', title: '🔄 Standard League', desc: 'Most leagues use this mode' },
                    { key: 'pre_tournament', title: '🔒 One-Shot League', desc: 'Uses everyone’s tournament-start predictions' },
                  ].map(option => (
                    <button key={option.key} type="button" onClick={() => setNewLeagueLockType(option.key)} style={{
                      textAlign: 'left', padding: '10px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                      border: newLeagueLockType === option.key ? '2px solid var(--scottish-navy)' : '1px solid var(--border-light)',
                      background: newLeagueLockType === option.key ? 'rgba(0,48,135,0.06)' : 'var(--bg-card)',
                    }}>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '3px' }}>{option.title}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.3 }}>{option.desc}</div>
                    </button>
                  ))}
                </div>
              )}
              {error && <div style={{ color: 'var(--accent-red)', fontSize: '13px', marginBottom: '8px' }}>{error}</div>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={activeGame === 'ko' ? createKoLeague : createLeague}
                  className="btn btn-primary btn-sm"
                  style={{ background: activeGame === 'ko' ? '#e65100' : 'var(--scottish-navy)' }}>Create</button>
                <button onClick={() => { setShowCreate(false); setNewLeagueLockType('rolling') }} className="btn btn-secondary btn-sm">Cancel</button>
              </div>
            </div>
          )}

          {showJoin && activeGame !== 'overall' && (
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '12px' }}>
              <div style={{ fontWeight: '700', marginBottom: '4px' }}>
                {activeGame === 'ko' ? '🔥 Join a KO Predictor League' : '🌍 Join a League'}
              </div>
              <input className="input" placeholder="Enter invite code e.g. AB1234" value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', fontSize: '18px', fontWeight: '700', marginBottom: '12px' }} />
              {error && <div style={{ color: 'var(--accent-red)', fontSize: '13px', marginBottom: '8px' }}>{error}</div>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={activeGame === 'ko' ? joinKoLeague : joinLeague} className="btn btn-primary btn-sm">Join</button>
                <button onClick={() => setShowJoin(false)} className="btn btn-secondary btn-sm">Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="container" style={{ padding: '16px' }}>
        {showWelcome && (
          <div className="card" style={{ padding: '18px', marginBottom: '12px', border: '1px solid rgba(0,48,135,0.16)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
              <div style={{ fontSize: '30px', lineHeight: 1 }}>👋</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '18px', fontWeight: '900', marginBottom: '4px' }}>Welcome to World Cup 2026 Predictor</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.45 }}>Here’s where everything lives before kickoff.</div>
              </div>
              <button onClick={dismissWelcome} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            {[
              { icon: '👥', title: 'Join or create a league', desc: 'Compete with friends and family.' },
              { icon: '⚽', title: 'Make your predictions', desc: 'Predict scores, tournament outcomes and awards.' },
              { icon: '👤', title: 'Check out your profile', desc: 'View your stats, predictions and league activity.' },
              { icon: '🏆', title: 'Overall Rankings', desc: 'Unlock when the tournament begins.' },
              { icon: '🎯', title: 'Earn More Points', desc: 'Learn how scoring, jokers and bonuses work.' },
            ].map(item => (
              <div key={item.title} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '8px 0', borderTop: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '20px', width: '24px', textAlign: 'center', flexShrink: 0 }}>{item.icon}</div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>{item.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.35, marginTop: '2px' }}>{item.desc}</div>
                </div>
              </div>
            ))}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '14px' }}>
              <Link to="/how-to-play" onClick={dismissWelcome} className="btn btn-secondary">How To Play</Link>
              <button onClick={dismissWelcome} className="btn btn-primary">Let’s Go</button>
            </div>
          </div>
        )}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}><div className="spinner" /></div>
        ) : activeGame === 'overall' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {!tournamentLive ? (
              <div className="card" style={{ textAlign: 'center', padding: '28px 20px' }}>
                <div style={{ fontSize: '42px', marginBottom: '10px' }}>🏆</div>
                <div style={{ fontSize: '20px', fontWeight: '900', marginBottom: '8px' }}>Overall Rankings</div>
                <div style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: '16px' }}>
                  Rankings unlock when the tournament begins. Complete your predictions and join leagues before kickoff.
                </div>
                {myLeagues.filter(m => !m.league?.is_global).length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
                    <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
                      <div style={{ fontSize: '18px', fontWeight: '900' }}>{myLeagues.filter(m => !m.league?.is_global).length}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>Entered leagues</div>
                    </div>
                    <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
                      <div style={{ fontSize: '18px', fontWeight: '900' }}>{myLeagues.filter(m => !m.league?.is_global).reduce((sum, m) => sum + Math.max((m.memberCount || 1) - 1, 0), 0)}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>Opponents</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '12px' }}>
                    <button onClick={() => { setActiveGame('tournament'); setShowCreate(true); setShowJoin(false) }} className="btn btn-primary btn-sm">Create League</button>
                    <button onClick={() => { setActiveGame('tournament'); setShowJoin(true); setShowCreate(false) }} className="btn btn-secondary btn-sm">Join League</button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="card" style={{ padding: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '700' }}>Your overall rank</div>
                      <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--scottish-navy)' }}>
                        #{Math.max((overallRows.findIndex(p => p.id === user.id) + 1), 1)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '700' }}>Points</div>
                      <div style={{ fontSize: '28px', fontWeight: '900' }}>{overallRows.find(p => p.id === user.id)?.total_points || 0}</div>
                    </div>
                  </div>
                </div>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-light)', fontWeight: '900' }}>🏆 Overall Rankings</div>
                  {loadingOverall ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}><div className="spinner" /></div>
                  ) : overallRows.length === 0 ? (
                    <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-muted)' }}>No rankings yet</div>
                  ) : overallRows.map((profile, i) => {
                    const isMe = profile.id === user.id
                    return (
                      <div key={profile.id} onClick={() => openOverallProfile(profile)} role="button" tabIndex={0} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 16px', borderBottom: '1px solid var(--border-light)', background: isMe ? 'rgba(0,48,135,0.05)' : 'transparent', borderLeft: isMe ? '3px solid var(--scottish-navy)' : '3px solid transparent', cursor: 'pointer' }}>
                        <span style={{ fontSize: '13px', fontWeight: '900', width: '24px', color: i < 3 ? ['#d4a017','#64748b','#b06a2c'][i] : 'var(--text-muted)' }}>{i + 1}</span>
                        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: isMe ? 'var(--scottish-navy)' : avatarColor(profile.display_name || profile.username).bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '800', color: isMe ? 'white' : avatarColor(profile.display_name || profile.username).fg, flexShrink: 0 }}>
                          {profile.avatar_emoji || (profile.display_name || profile.username || '?')[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: isMe ? '800' : '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.display_name || profile.username || 'Unknown'} {isMe && <span style={{ fontSize: '9px', background: 'var(--scottish-navy)', color: 'white', padding: '1px 5px', borderRadius: '3px', fontWeight: '700' }}>YOU</span>}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>{profile.exact_scores > 0 ? `🎯 ${profile.exact_scores} exact` : 'Overall player'}</div>
                        </div>
                        <span style={{ fontWeight: '900', fontSize: '15px', fontVariantNumeric: 'tabular-nums' }}>{profile.total_points || 0}<span style={{ fontSize: '10px', fontWeight: '500', color: 'var(--text-muted)' }}>pts</span></span>
                        <span style={{ fontSize: '18px', color: 'var(--text-muted)' }}>›</span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        ) : activeGame === 'ko' && !koLive ? (
          /* KO not live yet */
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔥</div>
            <div style={{ fontWeight: '800', fontSize: '18px', marginBottom: '8px' }}>KO Predictor Leagues launch 27 Jun</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>
              Once the group stage finishes you can create or join KO Predictor leagues — completely separate from your Tournament leagues with a fresh start.
            </div>
            <button onClick={() => setActiveGame('tournament')} className="btn btn-secondary">
              ← Back to Tournament Leagues
            </button>
          </div>
        ) : activeGame === 'ko' && koLive ? (
          /* ── KO Leagues section ── */
          myKoLeagues.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔥</div>
              <div className="empty-state-title">No KO Predictor leagues yet</div>
              <div className="empty-state-desc">Create or join a KO Predictor league — completely separate from your Tournament leagues</div>
              <button onClick={() => { setShowCreate(true); setShowJoin(false) }}
                className="btn btn-primary" style={{ marginTop: '16px', background: '#e65100' }}>
                + Create KO League
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {myKoLeagues.map(({ league_id, league, memberCount }) => {
                const isCreator = league?.created_by === user?.id
                return (
                  <div key={league_id} className="card" style={{ border: '1px solid rgba(230,81,0,0.3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '14px' }}>🔥</span>
                          <span style={{ fontWeight: '700', fontSize: '15px' }}>{league?.name}</span>
                          {isCreator && <span style={{ fontSize: '10px', background: '#e65100', color: 'white', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>CREATOR</span>}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Code: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '0.1em' }}>{league?.invite_code}</span>
                          · {memberCount} member{memberCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#e65100' }}>KO Predictor</div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button onClick={() => navigator.clipboard?.writeText(league?.invite_code).then(() => setSuccess(`Copied: ${league?.invite_code}`))}
                        className="btn btn-secondary btn-sm">📋 Copy Code</button>
                      <button onClick={() => {
                        const text = `Join my WC26 KO Predictor league "${league?.name}"! Code: ${league?.invite_code} at https://wc26predictor1.netlify.app`
                        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
                      }} className="btn btn-sm" style={{ background: '#25d366', color: 'white', border: 'none' }}>WhatsApp</button>
                      {isCreator ? (
                        <button onClick={() => setConfirmAction({ type: 'deleteKoLeague', leagueId: league_id, leagueName: league?.name })}
                          className="btn btn-sm" style={{ background: 'none', border: '1px solid #e53935', color: '#e53935' }}>Delete</button>
                      ) : (
                        <button onClick={() => setConfirmAction({ type: 'leaveKoLeague', leagueId: league_id, leagueName: league?.name })}
                          className="btn btn-secondary btn-sm">Leave</button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        ) : myLeagues.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '32px 22px' }}>
            <div style={{ fontSize: '42px', marginBottom: '12px' }}>🏆</div>
            <div style={{ fontSize: '20px', fontWeight: '900', marginBottom: '8px' }}>Play With Friends</div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: '18px' }}>Create a league and challenge friends, or join an existing competition.</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button onClick={() => { setShowCreate(true); setShowJoin(false); setError('') }} className="btn btn-primary">+ Create</button>
              <button onClick={() => { setShowJoin(true); setShowCreate(false); setError('') }} className="btn btn-secondary">Join</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <MyPredictionsProgress userId={user?.id} />
            <div className="card" style={{ padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button onClick={() => { setShowCreate(true); setShowJoin(false); setError(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="btn btn-primary btn-sm">+ Create League</button>
              <button onClick={() => { setShowJoin(true); setShowCreate(false); setError(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="btn btn-secondary btn-sm">Join League</button>
            </div>
            {[...myLeagues].sort((a, b) => {
              if (a.league?.is_global && !b.league?.is_global) return -1
              if (!a.league?.is_global && b.league?.is_global) return 1
              return 0
            }).filter(({ league }) => !league?.is_global).map(({ league, memberCount }) => {
              if (!league) return null
              const isCreator = league.created_by === user.id
              const isExpanded = expandedLeague === league.id
              const members = sortedMembers(league.id)
              const leagueStats = matchOdds[league.id] || {}

              const myRank = members.findIndex(m => m.user_id === user?.id) + 1
              const showAll = expandedLeague === `${league.id}-all`
              const visibleMembers = league.is_global && !showAll ? members.slice(0, 5) : members

              return (
                <div key={league.id} style={{
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-sm)',
                  border: '1px solid var(--border-light)',
                }}>
                  {/* League header */}
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px' }}>{league.is_global ? '🌍' : isCreator ? '👑' : '👥'}</span>
                        <div>
                          <div style={{ fontWeight: '800', fontSize: '15px', color: 'var(--text-primary)' }}>
                            {league.is_global ? 'Overall Rankings' : league.name}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}{!league.is_global && ` · ${isCreator ? 'Creator' : 'Member'}`}</span>
                            {!league.is_global && (
                              <span title={league.lock_type === 'pre_tournament' ? 'League scoring uses predictions frozen before kickoff' : 'Future unlocked predictions can still be edited'} style={{
                                fontSize: '10px', fontWeight: '800', padding: '1px 6px', borderRadius: 'var(--radius-full)',
                                background: league.lock_type === 'pre_tournament' ? 'rgba(245,158,11,0.14)' : 'rgba(21,88,176,0.10)',
                                color: league.lock_type === 'pre_tournament' ? '#b45309' : 'var(--accent-blue)',
                              }}>
                                {league.lock_type === 'pre_tournament' ? '🔒 One-Shot' : '🔄 Standard'}
                              </span>
                            )}
                            {league.custom_scoring && league.scoring_preset !== 'standard' && (
                              <span style={{ fontSize: '10px', fontWeight: '700', padding: '1px 5px', borderRadius: 'var(--radius-full)', background: 'var(--scottish-navy-light)', color: 'var(--scottish-navy)', cursor: 'pointer' }}
                                title={league.custom_scoring ? `Correct: ${league.custom_scoring.group_correct}pts | Exact: ${league.custom_scoring.group_exact}pts | Joker: ${league.custom_scoring.joker_multiplier}×` : ''}>
                                {league.scoring_preset === 'high_stakes' ? '🔥 High Stakes' :
                                 league.scoring_preset === 'exact_only' ? '🎯 Exact Only' :
                                 league.scoring_preset === 'excel' ? '📊 Excel Format' : '⚙️ Custom'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {myRank > 0 && (
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Your rank</div>
                          <div style={{ fontSize: '18px', fontWeight: '900', color: myRank <= 3 ? ['#d4a017','#64748b','#b06a2c'][myRank-1] : 'var(--scottish-navy)' }}>#{myRank}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {!league.is_global && (
                    <div style={{ padding: '8px 16px', background: league.lock_type === 'pre_tournament' ? 'rgba(245,158,11,0.08)' : 'rgba(21,88,176,0.05)', borderBottom: '1px solid var(--border-light)', fontSize: '12px', color: league.lock_type === 'pre_tournament' ? '#92400e' : 'var(--accent-blue)', fontWeight: '800' }}>
                      {league.lock_type === 'pre_tournament'
                        ? `🔒 One-Shot League • ${league.snapshot_taken_at ? 'Snapshot taken' : 'Freezes at tournament start'}`
                        : `🔄 Standard League${!tournamentLive ? ' • Points start 11 Jun' : ''}`}
                    </div>
                  )}

                  {/* League table — always visible */}
                  <div>
                    {loadingMembers[league.id] ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}><div className="spinner" /></div>
                    ) : (
                      <>
                        {visibleMembers.map((member, i) => {
                          const isMe = member.user_id === user.id
                          const isLeagueCreator = league.created_by === member.user_id
                          const canRemove = (isCreator || isAdmin) && !isMe && !isLeagueCreator && !league.is_global
                          const hasLeaguePts = members.some(m => (m.league_points ?? 0) > 0)
                          const pts = hasLeaguePts ? (member.league_points || 0) : (member.profile?.total_points || 0)
                          const leaderPts = members[0]?.profile?.total_points || 0
                          const gap = i > 0 && pts !== leaderPts ? leaderPts - pts : null
                          const rankColours = ['#f59e0b', '#9ca3af', '#cd7f32']

                          return (
                            <div key={member.user_id} onClick={() => openMemberModal(member, league.id)} role="button" tabIndex={0} style={{
                              display: 'flex', alignItems: 'center', gap: '10px',
                              padding: '11px 16px',
                              borderBottom: '1px solid var(--border-light)',
                              background: isMe ? 'rgba(0,48,135,0.05)' : 'transparent',
                              borderLeft: isMe ? '3px solid var(--scottish-navy)' : '3px solid transparent',
                              cursor: 'pointer',
                            }}>
                              {/* Rank */}
                              <span style={{ fontSize: '13px', fontWeight: '800', width: '20px', flexShrink: 0, color: i < 3 ? rankColours[i] : 'var(--text-muted)' }}>
                                {i + 1}
                              </span>

                              {/* Avatar */}
                              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: isMe ? 'var(--scottish-navy)' : avatarColor(member.profile?.display_name || member.profile?.username).bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '800', color: isMe ? 'white' : avatarColor(member.profile?.display_name || member.profile?.username).fg, flexShrink: 0 }}>
                                {(member.profile?.display_name || member.profile?.username || '?')[0].toUpperCase()}
                              </div>

                              {/* Name + sub */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '13px', fontWeight: isMe ? '700' : '500', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {member.profile?.display_name || member.profile?.username || 'Unknown'}
                                  </span>
                                  {isMe && <span style={{ fontSize: '9px', background: 'var(--scottish-navy)', color: 'white', padding: '1px 5px', borderRadius: '3px', fontWeight: '700', flexShrink: 0 }}>YOU</span>}
                                  {isLeagueCreator && !league.is_global && <span style={{ fontSize: '11px' }}>👑</span>}
                                  {member.profile?.is_offline && <span style={{ fontSize: '9px', background: 'var(--bg-tertiary)', color: 'var(--text-muted)', padding: '1px 5px', borderRadius: '3px', fontWeight: '700', flexShrink: 0, border: '1px solid var(--border-light)' }}>👤 Offline</span>}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '6px', marginTop: '1px' }}>
                                  {gap !== null && pts !== leaderPts && <span>-{gap}pts</span>}
                                  {member.profile?.streak_current > 0 && <span>🔥{member.profile.streak_current}</span>}
                                  {member.profile?.exact_scores > 0 && <span>🎯{member.profile.exact_scores}</span>}
                                </div>
                              </div>

                              {/* Points */}
                              <span style={{ fontWeight: '800', fontSize: '15px', fontVariantNumeric: 'tabular-nums', color: pts > 0 ? 'var(--text-primary)' : 'var(--text-muted)', flexShrink: 0 }}>
                                {pts}<span style={{ fontSize: '10px', fontWeight: '500', color: 'var(--text-muted)' }}>pts</span>
                              </span>

                              {/* Row chevron */}
                              <span style={{ fontSize: '18px', color: 'var(--text-muted)', flexShrink: 0 }}>›</span>
                            </div>
                          )
                        })}

                        {/* Show more / less for global league */}
                        {league.is_global && members.length > 5 && (
                          <button onClick={() => setExpandedLeague(showAll ? null : `${league.id}-all`)} style={{
                            width: '100%', padding: '12px', background: 'none', border: 'none',
                            fontSize: '13px', fontWeight: '600', color: 'var(--accent-blue)',
                            cursor: 'pointer', borderTop: showAll ? '1px solid var(--border-light)' : 'none',
                          }}>
                            {showAll ? '▲ Show less' : `▼ Show all ${members.length} members`}
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Invite + actions */}
                  {!league.is_global && (
                    <div style={{ padding: '10px 16px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-light)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button onClick={() => copyInviteCode(league.invite_code)} style={{ flex: 1, fontSize: '13px', padding: '9px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', background: 'var(--bg-card)', color: 'var(--scottish-navy)', fontWeight: '800', cursor: 'pointer' }}>
                          📋 Copy Code
                        </button>
                        <button onClick={() => shareWhatsApp(league.name, league.invite_code)} style={{ flex: 1, fontSize: '13px', padding: '9px 10px', borderRadius: 'var(--radius-md)', border: 'none', background: '#25d366', color: 'white', fontWeight: '800', cursor: 'pointer' }}>
                          💬 Share
                        </button>
                        <div style={{ position: 'relative' }}>
                          <button onClick={() => setOpenLeagueMenu(openLeagueMenu === league.id ? null : league.id)} style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', background: 'var(--bg-card)', fontSize: '18px', cursor: 'pointer', color: 'var(--text-muted)' }}>⋯</button>
                          {openLeagueMenu === league.id && (
                            <div style={{ position: 'absolute', right: 0, bottom: '44px', minWidth: '180px', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)', zIndex: 20, overflow: 'hidden' }}>
                              <button onClick={() => { copyLeagueLink(league.name, league.invite_code); setOpenLeagueMenu(null) }} style={{ width: '100%', textAlign: 'left', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}>🔗 Copy invite link</button>
                              <button onClick={() => { copyInviteCode(league.invite_code); setOpenLeagueMenu(null) }} style={{ width: '100%', textAlign: 'left', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}>🏷️ Code: {league.invite_code}</button>
                              {isCreator ? (
                                <button onClick={() => { setOpenLeagueMenu(null); setConfirmAction({ type: 'deleteLeague', leagueId: league.id, leagueName: league.name }) }} style={{ width: '100%', textAlign: 'left', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '800', color: 'var(--accent-red)' }}>🗑️ Delete league</button>
                              ) : (
                                <button onClick={() => { setOpenLeagueMenu(null); setConfirmAction({ type: 'leave', leagueId: league.id, leagueName: league.name }) }} style={{ width: '100%', textAlign: 'left', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>Leave league</button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Member predictions modal */}
      {memberModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setMemberModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', width: '100%', maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '800', fontSize: '16px' }}>
                  {memberModal.isOffline ? '👤 ' : ''}{memberModal.username}'s Predictions
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {memberModal.lockedSnapshot ? `Locked league snapshot${memberModal.leagueName ? ` · ${memberModal.leagueName}` : ''}` : memberModal.isOffline ? 'Offline player · imported predictions' : 'Past picks always visible · Future picks if they\'ve enabled sharing'}
                </div>
              </div>
              <button onClick={() => setMemberModal(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
            </div>

            {memberModal.lockedSnapshot && (
              <div style={{ padding: '10px 16px', background: 'rgba(245,158,11,0.10)', borderBottom: '1px solid var(--border-light)', fontSize: '12px', color: '#92400e', fontWeight: '700' }}>
                🔒 Showing frozen league predictions used for scoring. Profile privacy does not hide locked league picks.
              </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)' }}>
              {(memberModal.isOffline ? ['group', 'standings'] : ['overview', 'group', 'knockout', 'awards', 'compare', 'standings']).map(tab => (
                <button key={tab} onClick={() => setMemberModal(prev => ({ ...prev, tab }))} style={{
                  flex: 1, padding: '10px', fontSize: '12px', fontWeight: memberModal.tab === tab || (!memberModal.tab && tab === 'overview') ? '700' : '400',
                  color: memberModal.tab === tab || (!memberModal.tab && tab === 'overview') ? 'var(--text-primary)' : 'var(--text-muted)',
                  borderBottom: memberModal.tab === tab || (!memberModal.tab && tab === 'overview') ? '2px solid var(--scottish-navy)' : '2px solid transparent',
                  background: 'none', border: 'none', cursor: 'pointer', textTransform: 'capitalize',
                }}>
                  {tab === 'overview' ? '👤 Overview' : tab === 'group' ? '⚽ Groups' : tab === 'knockout' ? '🏆 Knockout' : tab === 'awards' ? '🥇 Awards' : tab === 'compare' ? '⚔️ Compare' : '📊 Standings'}
                </button>
              ))}
            </div>

            <div style={{ overflowY: 'auto', padding: '16px', flex: 1 }}>
              {loadingPreds ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}><div className="spinner" /></div>
              ) : (!memberModal.tab || memberModal.tab === 'overview') ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--scottish-navy)', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: '900', marginBottom: '8px' }}>{(memberModal.username || '?')[0].toUpperCase()}</div>
                    <div style={{ fontSize: '18px', fontWeight: '900' }}>{memberModal.username}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{memberModal.lockedSnapshot ? 'Locked league profile' : 'League member profile'}</div>
                  </div>
                  <button onClick={() => setMemberModal(prev => ({ ...prev, tab: 'compare' }))} className="btn btn-primary btn-full">⚔️ Compare with me</button>
                  <button onClick={() => setMemberModal(prev => ({ ...prev, tab: 'group' }))} className="btn btn-secondary btn-full">View predictions</button>
                  {memberModal.canRemoveMember && (
                    <button onClick={() => { setConfirmAction({ type: 'removeMember', leagueId: memberModal.leagueId, memberId: memberModal.userId, memberName: memberModal.memberName }); setMemberModal(null) }} className="btn btn-sm" style={{ background: 'none', border: '1px solid var(--accent-red)', color: 'var(--accent-red)' }}>Remove from league</button>
                  )}
                </div>
              ) : memberModal.tab === 'group' ? (
                memberPredictions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>{memberModal.isOffline ? '👤' : '🔒'}</div>
                    <div style={{ fontWeight: '700', marginBottom: '4px' }}>{memberModal.isOffline ? 'No predictions entered yet' : 'Picks are private'}</div>
                    <div style={{ fontSize: '13px' }}>
                      {memberModal.isOffline
                        ? 'Admin can enter predictions via the Offline tab in Admin Panel'
                        : tournamentLive
                          ? 'This user has chosen to keep their predictions private'
                          : 'Picks become visible once matches kick off on 11 Jun — unless the user enables "Show Future Predictions" in their profile'}
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
                          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: '800', fontSize: '14px', minWidth: '48px', textAlign: 'center' }}>
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
                              {memberReactions[pred.match_id || match?.id] === 'fire' ? '🔥' :
                               memberReactions[pred.match_id || match?.id] === 'laugh' ? '😂' : '💀'}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              ) : memberModal.tab === 'knockout' ? (
                <KnockoutPicksView userId={memberModal.userId} leagueId={memberModal.leagueId} lockedSnapshot={memberModal.lockedSnapshot} />
              ) : memberModal.tab === 'awards' ? (
                <AwardPredsView userId={memberModal.userId} leagueId={memberModal.leagueId} lockedSnapshot={memberModal.lockedSnapshot} />
              ) : memberModal.tab === 'compare' ? (
                <CompareWithMeView myUserId={user.id} targetUserId={memberModal.userId} targetName={memberModal.username} leagueId={memberModal.leagueId} lockedSnapshot={memberModal.lockedSnapshot} targetShowFuture={memberModal.targetShowFuture} />
              ) : memberModal.tab === 'standings' ? (
                <MemberStandingsView predictions={memberPredictions} />
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Confirm dialog */}

      {confirmAction && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ maxWidth: '340px', width: '100%' }}>
            <div style={{ fontWeight: '800', fontSize: '16px', marginBottom: '8px' }}>
              {confirmAction.type === 'leave' ? 'Leave League?' :
               confirmAction.type === 'deleteLeague' ? 'Delete League?' :
               confirmAction.type === 'leaveKoLeague' ? 'Leave KO League?' :
               confirmAction.type === 'deleteKoLeague' ? 'Delete KO League?' :
               'Remove Member?'}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              {confirmAction.type === 'leave' ? `Leave "${confirmAction.leagueName}"? You can rejoin with the invite code.` :
               confirmAction.type === 'deleteLeague' ? `Delete "${confirmAction.leagueName}"? This cannot be undone.` :
               confirmAction.type === 'leaveKoLeague' ? `Leave KO league "${confirmAction.leagueName}"?` :
               confirmAction.type === 'deleteKoLeague' ? `Delete KO league "${confirmAction.leagueName}"? This cannot be undone.` :
               `Remove ${confirmAction.memberName}? They can rejoin with the invite code.`}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => {
                if (confirmAction.type === 'leave') leaveLeague(confirmAction.leagueId, confirmAction.leagueName)
                else if (confirmAction.type === 'deleteLeague') deleteLeague(confirmAction.leagueId, confirmAction.leagueName)
                else if (confirmAction.type === 'leaveKoLeague') leaveKoLeague(confirmAction.leagueId, confirmAction.leagueName)
                else if (confirmAction.type === 'deleteKoLeague') deleteKoLeague(confirmAction.leagueId, confirmAction.leagueName)
                else if (confirmAction.type === 'removeMember') removeMember(confirmAction.leagueId, confirmAction.memberId, confirmAction.memberName)
                setConfirmAction(null)
              }} className="btn btn-primary" style={{ background: '#e53935', flex: 1 }}>Confirm</button>
              <button onClick={() => setConfirmAction(null)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
