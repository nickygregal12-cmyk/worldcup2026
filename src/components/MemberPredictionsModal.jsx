import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { ALL_STAGES, calcPredictedStandings, resolveSlot, getBest3rdTeams } from '../lib/bracketUtils.js'
import { DATES } from '../lib/tournamentDates.js'


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
  const [realConfirmedByStage, setRealConfirmedByStage] = useState({}) // stage -> Set of confirmed team IDs
  const [confirmedFixtures, setConfirmedFixtures] = useState({}) // match_number -> {homeTeam, awayTeam}
  const [allTeams, setAllTeams] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      const koTable = lockedSnapshot ? 'league_knockout_picks' : 'knockout_picks'
      let koQuery = supabase.from(koTable).select('match_number, stage, winner_team_id, home_team_id, away_team_id, is_joker').eq('user_id', userId)
      if (lockedSnapshot && leagueId) koQuery = koQuery.eq('league_id', leagueId)
      const predTable = lockedSnapshot ? 'league_predictions' : 'predictions'
      let predQuery = supabase.from(predTable).select('match_id, home_score, away_score').eq('user_id', userId)
      if (lockedSnapshot && leagueId) predQuery = predQuery.eq('league_id', leagueId)
      const [koRes, predRes, matchRes, teamsRes] = await Promise.all([
        koQuery.order('match_number', { ascending: true }),
        predQuery,
        supabase.from('matches').select('id, match_number, stage, status, home_team_id, away_team_id, winner_team_id, group:group_id(name), home_team:home_team_id(id,name,flag_emoji,short_code), away_team:away_team_id(id,name,flag_emoji,short_code)'),
        supabase.from('teams').select('id, name, flag_emoji, short_code'),
      ])
      if (cancelled) return
      const km = {};
      (koRes.data || []).forEach(p => { km[p.match_number] = { winner_id: p.winner_team_id, home_team_id: p.home_team_id, away_team_id: p.away_team_id, is_joker: p.is_joker, stage: p.stage } })
      const pm = {};
      (predRes.data || []).forEach(p => { if (p.home_score !== null && p.away_score !== null) pm[p.match_id] = { home: p.home_score, away: p.away_score } })
      // Load real confirmed R32 teams
      const { data: r32Fixtures } = await supabase
        .from('matches')
        .select('stage, home_team_id, away_team_id, status, winner_team_id')
        .neq('stage', 'group')
      if (!cancelled && r32Fixtures) {
        // Build per-stage confirmed teams:
        // R32: teams with home_team_id/away_team_id set
        // R16+: teams that WON their previous round (winner_team_id)
        const byStage = {
          r32: new Set(),
          r16: new Set(),
          qf: new Set(),
          sf: new Set(),
          final: new Set(),
        }
        r32Fixtures.forEach(m => {
          if (m.stage === 'r32') {
            if (m.home_team_id) byStage.r32.add(m.home_team_id)
            if (m.away_team_id) byStage.r32.add(m.away_team_id)
          } else if (m.status === 'completed' && m.winner_team_id) {
            const nextStage = { r32: 'r16', r16: 'qf', qf: 'sf', sf: 'final' }[m.stage]
            if (nextStage && byStage[nextStage]) byStage[nextStage].add(m.winner_team_id)
          }
        })
        // Also add top-2 finishers from completed groups
        const { data: gsData } = await supabase
          .from('group_standings').select('team_id, position, played')
          .eq('played', 3).lte('position', 2)
        ;(gsData || []).forEach(gs => { if (gs.team_id) byStage.r32.add(gs.team_id) })
        setRealConfirmedByStage(byStage)
      }
      if (!cancelled) {
        const confMap = {}
        ;(matchRes.data || []).forEach(m => {
          if (m.home_team_id && m.away_team_id && m.stage !== 'group') {
            confMap[m.match_number] = { homeTeam: m.home_team, awayTeam: m.away_team }
          }
        })
        setPicks(km)
        setGroupPreds(pm)
        setMatches(matchRes.data || [])
        setConfirmedFixtures(confMap)
        setAllTeams(teamsRes.data || [])
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [userId, leagueId, lockedSnapshot])

  const groupMatches = React.useMemo(() => matches.filter(m => m.stage === 'group'), [matches])
  const standings = React.useMemo(() => calcPredictedStandings(groupMatches, groupPreds, true), [groupMatches, groupPreds])
  const teamsById = React.useMemo(() => {
    const map = {}
    // From matches (group stage)
    matches.forEach(m => { if (m.home_team) map[m.home_team.id] = m.home_team; if (m.away_team) map[m.away_team.id] = m.away_team })
    // From allTeams fetch (includes all 48 teams for KO display)
    allTeams.forEach(t => { if (t.id) map[t.id] = t })
    return map
  }, [matches, allTeams])

  // Map of match_number -> {home, away} team IDs from stored knockout_picks
  const pickHomeAway = React.useMemo(() => {
    const map = {}
    Object.entries(picks).forEach(([matchNum, pick]) => {
      map[parseInt(matchNum)] = {
        home: pick.home_team_id || null,
        away: pick.away_team_id || null,
        winner: pick.winner_id,
      }
    })
    return map
  }, [picks])

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
        const confirmedSet = realConfirmedByStage[stage.key] || new Set()
        // Resolve each match's two teams from the user's OWN group predictions
        // (resolveTeam) — this is the bracket they predicted, and it never puts the
        // same team in two slots (unlike the stored snapshot columns, whose
        // best-third teams were corrupted by an old backfill). The winner they
        // chose is always shown inside the match: normally it's already one of the
        // two resolved teams; if their group prediction for that slot changed after
        // they picked, we keep their actual winner and pair it with the resolved
        // opponent, so we never drop or contradict the team they chose.
        const resolvedFor = (md) => {
          const pick = picks[md.match_number]
          const pureHome = resolveTeam(md.home_slot)
          const pureAway = resolveTeam(md.away_slot)
          const winnerId = pick?.winner_id
          if (!winnerId) return { home: pureHome, away: pureAway }
          if (winnerId === pureHome?.id || winnerId === pureAway?.id) {
            return { home: pureHome, away: pureAway }
          }
          const winner = teamsById[winnerId] || null
          // Orphan: drop the winner onto the side it was saved on, keep the other
          // side as the resolved opponent.
          if (pick?.away_team_id === winnerId && pick?.home_team_id !== winnerId) {
            return { home: pureHome, away: winner }
          }
          return { home: winner, away: pureAway }
        }
        // Points earned this stage. For the R32 we mirror the server scorer
        // exactly: 5pts per team the user predicted to reach the R32 (predicted
        // top-2 of every group + 8 best predicted thirds) that actually got
        // there. This is slot-independent — a predicted best-third can qualify
        // before FIFA's allocation fixes which bracket slot it fills, so we must
        // credit it even though it can't be painted into a match yet. Later
        // rounds still score off the winner picks shown in their slots.
        const isR32 = stage.key === 'r32'
        let r32CreditTeams = []
        if (isR32) {
          const top2 = Object.values(standings).flatMap(arr => (arr || []).slice(0, 2).map(e => e.team))
          const thirds = getBest3rdTeams(standings).slice(0, 8).map(t => t.team)
          const seen = new Set()
          const predicted = [...top2, ...thirds].filter(t => t && !seen.has(t.id) && (seen.add(t.id), true))
          r32CreditTeams = predicted.filter(t => confirmedSet.has(t.id))
        }
        let stagePtsEarned = 0
        if (isR32) {
          stagePtsEarned = r32CreditTeams.length * stage.points
        } else {
          stageMatches.forEach(md => {
            const { home, away } = resolvedFor(md)
            if (home && confirmedSet.has(home.id)) stagePtsEarned += stage.points
            if (away && confirmedSet.has(away.id)) stagePtsEarned += stage.points
            if (!home && !away && confirmedSet.has(picks[md.match_number].winner_id)) stagePtsEarned += stage.points
          })
        }
        // Credited R32 teams not shown in any slotted match (e.g. a best-third
        // whose bracket slot isn't fixed yet) — listed below so the visible
        // total matches the header.
        const shownIds = new Set()
        if (isR32) {
          stageMatches.forEach(md => {
            const { home, away } = resolvedFor(md)
            if (home) shownIds.add(home.id)
            if (away) shownIds.add(away.id)
          })
        }
        const unslottedCredits = isR32 ? r32CreditTeams.filter(t => !shownIds.has(t.id)) : []
        return (
          <div key={stage.key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stage.label}</div>
              {stagePtsEarned > 0 && (
                <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--accent-green)', background: 'rgba(0,122,51,0.1)', padding: '2px 8px', borderRadius: '20px' }}>
                  +{stagePtsEarned}pts earned
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {stageMatches.map(md => {
                const pick = picks[md.match_number]
                const { home, away } = resolvedFor(md)
                const bothKnown = !!(home && away)
                const winner = teamsById[pick.winner_id]
                // Is the saved winner still one of this match's two teams? If the
                // user edited their group picks after choosing a winner, it may
                // not be — show it as "no longer in this match" rather than as a
                // pick that makes no sense next to the two teams shown.
                const winnerInMatch = winner && (winner.id === home?.id || winner.id === away?.id)
                const homeEarned = home && confirmedSet.has(home.id)
                const awayEarned = away && confirmedSet.has(away.id)
                const winnerEarned = winner && confirmedSet.has(winner.id)
                const earnedPts = bothKnown
                  ? [homeEarned, awayEarned].filter(Boolean).length * stage.points
                  : (winnerEarned ? stage.points : 0)
                const anyEarned = earnedPts > 0
                return (
                  <div key={md.match_number} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 10px',
                    background: anyEarned ? 'rgba(0,122,51,0.05)' : 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${anyEarned ? 'rgba(0,122,51,0.2)' : 'transparent'}`,
                  }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', minWidth: '26px', fontWeight: '600' }}>#{md.match_number}</span>
                    {bothKnown && winnerInMatch ? (
                      <>
                        <span style={{ fontSize: '18px', opacity: homeEarned ? 1 : 0.45 }}>{home.flag_emoji}</span>
                        <span style={{ fontSize: '13px', fontWeight: home.id === pick.winner_id ? '700' : '400', color: homeEarned ? 'var(--accent-green)' : home.id === pick.winner_id ? 'var(--text-primary)' : 'var(--text-muted)' }}>{home.short_code}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 2px' }}>v</span>
                        <span style={{ fontSize: '18px', opacity: awayEarned ? 1 : 0.45 }}>{away.flag_emoji}</span>
                        <span style={{ fontSize: '13px', fontWeight: away.id === pick.winner_id ? '700' : '400', color: awayEarned ? 'var(--accent-green)' : away.id === pick.winner_id ? 'var(--text-primary)' : 'var(--text-muted)' }}>{away.short_code}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 4px' }}>·</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>pick:</span>
                        <span style={{ fontSize: '18px', marginLeft: '2px' }}>{winner?.flag_emoji}</span>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: winnerEarned ? 'var(--accent-green)' : 'var(--text-primary)', flex: 1 }}>{winner?.short_code}</span>
                      </>
                    ) : bothKnown ? (
                      // Winner pick predates a group-prediction change, so it isn't one
                      // of these two teams. R32 points come from the predicted teams that
                      // reach the round (shown here), not the KO winner — so we show the
                      // matchup cleanly and just omit the now-inconsistent winner segment,
                      // rather than printing a contradictory "pick: OTHER_TEAM".
                      <>
                        <span style={{ fontSize: '18px', opacity: homeEarned ? 1 : 0.45 }}>{home.flag_emoji}</span>
                        <span style={{ fontSize: '13px', fontWeight: '400', color: homeEarned ? 'var(--accent-green)' : 'var(--text-muted)' }}>{home.short_code}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 2px' }}>v</span>
                        <span style={{ fontSize: '18px', opacity: awayEarned ? 1 : 0.45 }}>{away.flag_emoji}</span>
                        <span style={{ fontSize: '13px', fontWeight: '400', color: awayEarned ? 'var(--accent-green)' : 'var(--text-muted)', flex: 1 }}>{away.short_code}</span>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: '18px' }}>{winner?.flag_emoji}</span>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: winnerEarned ? 'var(--accent-green)' : 'var(--text-primary)', flex: 1 }}>{winner?.short_code || winner?.name}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>· pick to win</span>
                      </>
                    )}
                    {earnedPts > 0 && (
                      <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--accent-green)', background: 'rgba(0,122,51,0.12)', padding: '1px 7px', borderRadius: '20px', whiteSpace: 'nowrap', marginLeft: '4px' }}>
                        +{earnedPts}pts
                      </span>
                    )}
                    {pick.is_joker && <span style={{ fontSize: '11px', marginLeft: '2px' }}>🃏</span>}
                  </div>
                )
              })}
              {unslottedCredits.map(t => (
                <div key={`credit-${t.id}`} style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px',
                  background: 'rgba(0,122,51,0.05)', borderRadius: 'var(--radius-md)',
                  border: '1px dashed rgba(0,122,51,0.25)',
                }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', minWidth: '26px', fontWeight: '600' }}>3rd</span>
                  <span style={{ fontSize: '18px' }}>{t.flag_emoji}</span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent-green)' }}>{t.short_code}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', flex: 1 }}>best-3rd qualified · slot confirmed once groups finish</span>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--accent-green)', background: 'rgba(0,122,51,0.12)', padding: '1px 7px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                    +{stage.points}pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}


function KOPredictorScoresView({ userId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError('')
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('id, match_number, stage, kickoff_time, status, home_score, away_score, winner_team_id, outcome_type, home_team:home_team_id(id,name,flag_emoji,short_code), away_team:away_team_id(id,name,flag_emoji,short_code)')
        .in('stage', ['r32', 'r16', 'qf', 'sf', '3rd', 'final'])
        .order('kickoff_time', { ascending: true })

      if (matchError) {
        if (!cancelled) { setError(matchError.message); setLoading(false) }
        return
      }

      const now = new Date()
      const lockedMatches = (matchData || []).filter(match =>
        match.status === 'live' || match.status === 'completed' || new Date(match.kickoff_time) <= now
      )
      const lockedIds = lockedMatches.map(match => match.id)
      if (lockedIds.length === 0) {
        if (!cancelled) { setRows([]); setLoading(false) }
        return
      }

      const { data: predData, error: predError } = await supabase
        .from('ko_predictions')
        .select('match_id, home_score, away_score, outcome_type, winner_team_id, first_goal_band, is_joker, points_awarded, points_breakdown')
        .eq('user_id', userId)
        .in('match_id', lockedIds)

      if (predError) {
        if (!cancelled) { setError(predError.message); setLoading(false) }
        return
      }

      const predictionsByMatch = Object.fromEntries((predData || []).map(pred => [pred.match_id, pred]))
      if (!cancelled) {
        setRows(lockedMatches.map(match => ({ match, prediction: predictionsByMatch[match.id] || null })))
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [userId])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}><div className="spinner" /></div>
  if (error) return <div style={{ textAlign: 'center', padding: '28px', color: 'var(--accent-red)' }}>Could not load KO Predictor picks: {error}</div>
  if (rows.length === 0) return <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}><div style={{ fontSize: '32px', marginBottom: '8px' }}>🔒</div><div style={{ fontWeight: '700' }}>No KO Predictor matches have locked yet</div></div>

  const stageLabels = { r32: 'Round of 32', r16: 'Round of 16', qf: 'Quarter-finals', sf: 'Semi-finals', '3rd': 'Third-place play-off', final: 'Final' }
  const outcomeLabels = { '90mins': '90 mins', et: 'Extra time', penalties: 'Penalties' }
  const goalBandLabels = { '1-15': '1–15', '16-30': '16–30', '31-45': '31–45', '46-60': '46–60', '61-75': '61–75', '76-90': '76–90+', et: 'Extra time', no_goals: 'No goals' }

  return (
    <div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px' }}>Only matches that have kicked off are shown.</div>
      {rows.map(({ match, prediction }, index) => {
        const showStage = index === 0 || rows[index - 1]?.match?.stage !== match.stage
        const winner = prediction?.winner_team_id === match.home_team?.id
          ? match.home_team
          : prediction?.winner_team_id === match.away_team?.id ? match.away_team : null
        return (
          <React.Fragment key={match.id}>
            {showStage && <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '12px 0 6px' }}>{stageLabels[match.stage] || match.stage}</div>}
            <div style={{ padding: '10px 12px', marginBottom: '7px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', minWidth: '28px' }}>M{match.match_number}</span>
                <span style={{ fontSize: '18px' }}>{match.home_team?.flag_emoji}</span>
                <span style={{ fontSize: '12px', fontWeight: '800', flex: 1 }}>{match.home_team?.short_code} v {match.away_team?.short_code}</span>
                <span style={{ fontSize: '18px' }}>{match.away_team?.flag_emoji}</span>
                {match.status === 'completed' && <span style={{ fontSize: '12px', fontWeight: '800' }}>{match.home_score}–{match.away_score}</span>}
              </div>
              {prediction ? (
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', fontWeight: '900' }}>{prediction.home_score}–{prediction.away_score}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{outcomeLabels[prediction.outcome_type] || prediction.outcome_type || '90 mins'}</span>
                  {winner && <span style={{ fontSize: '11px', fontWeight: '700' }}>Winner: {winner.flag_emoji} {winner.short_code}</span>}
                  {prediction.first_goal_band && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>First goal: {goalBandLabels[prediction.first_goal_band] || prediction.first_goal_band}</span>}
                  {prediction.is_joker && <span title="Joker">🃏</span>}
                  {match.status === 'completed' && <span style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: '900', color: (prediction.points_awarded || 0) > 0 ? 'var(--accent-green)' : 'var(--text-muted)' }}>{prediction.points_awarded || 0}pts</span>}
                </div>
              ) : (
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-light)', fontSize: '11px', color: 'var(--text-muted)' }}>No prediction made</div>
              )}
            </div>
          </React.Fragment>
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
        .select('*, match:match_id(id, match_number, kickoff_time, stage, status, home_score, away_score, group:group_id(name), home_team:home_team_id(name,flag_emoji,short_code), away_team:away_team_id(name,flag_emoji,short_code))')
        .eq('user_id', userId),
      supabase
        .from('profiles')
        .select('group_position_points, bracket_points, total_points, exact_scores, ko_points, ko_exact_scores, ko_streak_current')
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

  const openProfile = async (profile, currentUserId, viewContext = 'tournament') => {
    const displayName = profile.display_name || profile.username || 'Unknown'
    const showFuture = profile.show_future_predictions !== false || profile.id === currentUserId
    setMemberModal({
      userId: profile.id,
      username: displayName,
      leagueId: null,
      isOffline: false,
      lockedSnapshot: false,
      leagueName: viewContext === 'ko' ? 'KO Predictor Leaderboard' : 'Overall Rankings',
      viewContext,
      tab: viewContext === 'ko' ? 'koPredictor' : 'overview',
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
  const navigate = useNavigate()
  const [showOptions, setShowOptions] = useState(false)
  const [compactRows, setCompactRows] = useState(false)
  const [onlyScoring, setOnlyScoring] = useState(false)
  const tournamentLive = new Date() >= DATES.TOURNAMENT_START

  useEffect(() => {
    setShowOptions(false)
    setCompactRows(false)
    setOnlyScoring(false)
  }, [memberModal?.userId])

  if (!memberModal) return null

  const viewContext = memberModal.viewContext || 'tournament'
  const isKoContext = viewContext === 'ko'
  const tabs = memberModal.isOffline
    ? ['group', 'standings']
    : isKoContext
      ? ['koPredictor']
      : ['overview', 'group', 'knockout', 'awards', 'standings']
  const requestedTab = memberModal.tab || (memberModal.isOffline ? 'group' : isKoContext ? 'koPredictor' : 'overview')
  const activeTab = tabs.includes(requestedTab) ? requestedTab : tabs[0]
  const mp = memberModal.memberProfile || {}
  const totalPts = Number(mp.total_points || 0)
  const groupPts = Number(mp.group_position_points || 0)
  const bracketPts = Number(mp.bracket_points || 0)
  const matchPts = Math.max(0, totalPts - groupPts - bracketPts)
  const koPts = Number(mp.ko_points || 0)
  const koExactScores = Number(mp.ko_exact_scores || 0)
  const koStreak = Number(mp.ko_streak_current || 0)

  const completedPredictions = memberPredictions
    .filter(pred => pred.match?.status === 'completed')
    .sort((a, b) => new Date(b.match?.kickoff_time || 0) - new Date(a.match?.kickoff_time || 0))
  const correctPredictions = completedPredictions.filter(pred => ['exact', 'correct'].includes(getPredResult(pred)))
  const exactScores = Number(mp.exact_scores ?? completedPredictions.filter(pred => getPredResult(pred) === 'exact').length)
  const outcomeAccuracy = completedPredictions.length
    ? Math.round((correctPredictions.length / completedPredictions.length) * 100)
    : 0
  let currentStreak = 0
  for (const pred of completedPredictions) {
    if (['exact', 'correct'].includes(getPredResult(pred))) currentStreak += 1
    else break
  }
  const latestPredictions = completedPredictions.slice(0, 4)

  const visibleGroupPredictions = memberPredictions.filter(pred => {
    if (!onlyScoring) return true
    return ['exact', 'correct'].includes(getPredResult(pred))
  })
  const predictionsByGroup = visibleGroupPredictions.reduce((acc, pred) => {
    const groupName = pred.match?.group?.name || 'Other'
    if (!acc[groupName]) acc[groupName] = []
    acc[groupName].push(pred)
    return acc
  }, {})

  const tabLabel = (tab) => {
    switch (tab) {
      case 'overview': return 'Overview'
      case 'group': return 'Groups'
      case 'knockout': return 'Bracket'
      case 'koPredictor': return 'KO Pred'
      case 'awards': return 'Awards'
      case 'compare': return 'Compare'
      case 'standings': return 'Tables'
      default: return tab
    }
  }

  const sectionTitle = (title, note) => (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', margin: '2px 2px 8px' }}>
      <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{title}</strong>
      {note && <span style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right' }}>{note}</span>}
    </div>
  )

  const resultBadge = (result) => {
    if (result === 'exact') return { text: 'EXACT', colour: 'var(--accent-green)', bg: 'rgba(0,122,51,0.12)' }
    if (result === 'correct') return { text: 'HIT', colour: 'var(--accent-blue)', bg: 'rgba(0,102,204,0.10)' }
    if (result === 'wrong') return { text: 'MISS', colour: 'var(--text-muted)', bg: 'var(--bg-tertiary)' }
    return { text: 'PENDING', colour: 'var(--text-muted)', bg: 'var(--bg-tertiary)' }
  }

  const renderPredictionRow = (pred, index = 0) => {
    const match = pred.match
    const result = getPredResult(pred)
    const badge = resultBadge(result)
    const kicked = match?.kickoff_time ? new Date(match.kickoff_time) <= new Date() : false
    const isCompleted = match?.status === 'completed'
    const actualText = isCompleted && match?.home_score != null && match?.away_score != null
      ? `Actual ${match.home_score}–${match.away_score}`
      : kicked ? 'Match in progress or awaiting result' : 'Prediction locked for this viewer'
    const reaction = memberReactions[pred.match_id || match?.id]

    return (
      <div
        key={pred.id || pred.match_id || match?.id || index}
        style={{
          display: 'flex', alignItems: 'center', gap: compactRows ? '7px' : '10px',
          padding: compactRows ? '7px 10px' : '10px 12px',
          borderTop: index > 0 ? '1px solid var(--border-light)' : 'none',
          background: result === 'exact' || result === 'correct' ? 'rgba(0,122,51,0.035)' : 'var(--bg-card)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: compactRows ? '78px' : '94px' }}>
          <span style={{ fontSize: compactRows ? '16px' : '19px' }}>{match?.home_team?.flag_emoji}</span>
          <span style={{ fontSize: compactRows ? '11px' : '12px', fontWeight: '800' }}>{match?.home_team?.short_code}</span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>v</span>
          <span style={{ fontSize: compactRows ? '11px' : '12px', fontWeight: '800' }}>{match?.away_team?.short_code}</span>
          <span style={{ fontSize: compactRows ? '16px' : '19px' }}>{match?.away_team?.flag_emoji}</span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: compactRows ? '13px' : '15px', fontWeight: '900', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
              {pred.home_score}–{pred.away_score}
            </span>
            {pred.is_confident && <span title="Joker" style={{ fontSize: '13px' }}>🃏</span>}
            {reaction && <span style={{ fontSize: '14px' }}>{reaction === 'fire' ? '🔥' : reaction === 'laugh' ? '😂' : '💀'}</span>}
          </div>
          {!compactRows && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{actualText}</div>}
        </div>

        <span style={{ fontSize: '9px', fontWeight: '900', color: badge.colour, background: badge.bg, padding: '3px 6px', borderRadius: '999px', whiteSpace: 'nowrap' }}>{badge.text}</span>
        <span style={{ minWidth: '30px', textAlign: 'right', fontSize: '12px', fontWeight: '900', fontFamily: 'var(--font-mono)', color: Number(pred.points_awarded || 0) > 0 ? 'var(--accent-green)' : 'var(--text-muted)' }}>
          {isCompleted ? `+${pred.points_awarded || 0}` : '—'}
        </span>
      </div>
    )
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(4,14,31,0.72)', backdropFilter: 'blur(3px)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '12px 12px 0' }}
      onClick={() => setMemberModal(null)}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative', width: '100%', maxWidth: '640px', maxHeight: '92vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          background: 'var(--bg-secondary)', borderRadius: '20px 20px 0 0',
          boxShadow: '0 -12px 45px rgba(0,0,0,0.28)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Player summary */}
        <header style={{ flexShrink: 0, padding: '17px 18px 13px', color: 'white', background: 'linear-gradient(135deg, var(--scottish-navy), #0b356b)', position: 'relative' }}>
          <div style={{ position: 'absolute', right: '12px', top: '10px', display: 'flex', gap: '6px' }}>
            {!isKoContext && <button type="button" onClick={() => setShowOptions(true)} aria-label="View options" style={{ width: '32px', height: '32px', display: 'grid', placeItems: 'center', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.24)', background: 'rgba(255,255,255,0.10)', color: 'white', fontSize: '15px', cursor: 'pointer' }}>⋯</button>}
            <button type="button" onClick={() => setMemberModal(null)} aria-label="Close" style={{ width: '32px', height: '32px', display: 'grid', placeItems: 'center', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.24)', background: 'rgba(255,255,255,0.10)', color: 'white', fontSize: '21px', cursor: 'pointer' }}>×</button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '11px', paddingRight: '76px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0, background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.22)', fontSize: '19px', fontWeight: '900' }}>
              {(memberModal.username || '?')[0].toUpperCase()}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '17px', fontWeight: '900', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{memberModal.username}</div>
              <div style={{ fontSize: '11px', opacity: 0.76, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {isKoContext
                  ? 'KO Predictor · separate competition'
                  : memberModal.lockedSnapshot
                    ? `Locked snapshot${memberModal.leagueName ? ` · ${memberModal.leagueName}` : ''}`
                    : memberModal.isOffline
                      ? 'Offline player · imported predictions'
                      : memberModal.leagueName || 'Overall Rankings'}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '25px', lineHeight: 1, fontWeight: '950', fontFamily: 'var(--font-mono)' }}>{isKoContext ? koPts : totalPts}</div>
              <div style={{ fontSize: '9px', opacity: 0.72, marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{isKoContext ? 'KO points' : 'total points'}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isKoContext ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: '7px', marginTop: '13px' }}>
            {(isKoContext
              ? [
                  { label: 'Exact scores', value: koExactScores },
                  { label: 'KO streak', value: koStreak ? `${koStreak}🔥` : 0 },
                ]
              : [
                  { label: 'Matches', value: matchPts },
                  { label: 'Groups', value: groupPts },
                  { label: 'Bracket', value: bracketPts },
                ]
            ).map(item => (
              <div key={item.label} style={{ textAlign: 'center', padding: '7px 5px', background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.13)', borderRadius: '10px' }}>
                <div style={{ fontSize: '16px', fontWeight: '900', fontFamily: 'var(--font-mono)' }}>{item.value}</div>
                <div style={{ fontSize: '9px', opacity: 0.72, marginTop: '1px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
              </div>
            ))}
          </div>
        </header>

        {memberModal.lockedSnapshot && (
          <div style={{ padding: '9px 14px', background: 'rgba(245,158,11,0.12)', borderBottom: '1px solid var(--border-light)', fontSize: '11px', color: '#92400e', fontWeight: '750', flexShrink: 0 }}>
            🔒 Showing the frozen league predictions used for scoring.
          </div>
        )}

        {!memberModal.isOffline && !isKoContext && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '10px 12px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)', flexShrink: 0 }}>
            <button type="button" onClick={() => { setMemberModal(null); navigate(`/points/${memberModal.userId}`) }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '9px 11px', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}>
              <span>Full points breakdown</span><span style={{ color: 'var(--text-muted)' }}>→</span>
            </button>
            <button type="button" onClick={() => { setMemberModal(null); navigate(`/h2h/${memberModal.userId}`) }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '9px 11px', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}>
              <span>Compare head-to-head</span><span style={{ color: 'var(--text-muted)' }}>→</span>
            </button>
          </div>
        )}

        {/* Tabs */}
        <nav style={{ display: 'flex', overflowX: 'auto', WebkitOverflowScrolling: 'touch', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)', flexShrink: 0, scrollbarWidth: 'none' }}>
          {tabs.map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setMemberModal(prev => ({ ...prev, tab }))}
              style={{
                flex: '1 0 auto', minWidth: '76px', padding: '11px 12px 10px',
                fontSize: '11px', fontWeight: activeTab === tab ? '850' : '650',
                color: activeTab === tab ? 'var(--scottish-navy)' : 'var(--text-muted)',
                background: 'none', border: 'none',
                borderBottom: activeTab === tab ? '3px solid var(--scottish-navy)' : '3px solid transparent',
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {tabLabel(tab)}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div style={{ overflowY: 'auto', padding: '12px', flex: 1, background: 'var(--bg-secondary)' }}>
          {loadingPreds ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '42px' }}><div className="spinner" /></div>
          ) : activeTab === 'overview' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
              <section>
                {sectionTitle('At a glance', 'Detailed scoring stays on the Points page')}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '14px', overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    {[
                      { value: exactScores, label: 'Exact scores' },
                      { value: `${outcomeAccuracy}%`, label: 'Correct outcome' },
                      { value: currentStreak ? `${currentStreak}🔥` : '0', label: 'Current streak' },
                    ].map((item, i) => (
                      <div key={item.label} style={{ textAlign: 'center', padding: '14px 6px', borderLeft: i > 0 ? '1px solid var(--border-light)' : 'none' }}>
                        <div style={{ fontSize: '20px', fontWeight: '950', fontFamily: 'var(--font-mono)', color: 'var(--scottish-navy)' }}>{item.value}</div>
                        <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: '9px 12px', borderTop: '1px solid var(--border-light)', background: 'var(--bg-secondary)', fontSize: '10px', lineHeight: 1.45, color: 'var(--text-muted)' }}>
                    This view focuses on the player’s actual picks. Use Points for the full ledger and Head to Head for direct comparisons.
                  </div>
                </div>
              </section>

              <section>
                {sectionTitle('Latest scored predictions', latestPredictions.length ? `Most recent ${latestPredictions.length}` : '')}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '14px', overflow: 'hidden' }}>
                  {latestPredictions.length > 0 ? latestPredictions.map(renderPredictionRow) : (
                    <div style={{ textAlign: 'center', padding: '30px 18px', color: 'var(--text-muted)' }}>
                      <div style={{ fontSize: '26px', marginBottom: '6px' }}>⚽</div>
                      <div style={{ fontSize: '12px', fontWeight: '800' }}>No completed predictions yet</div>
                    </div>
                  )}
                </div>
              </section>
            </div>
          ) : activeTab === 'group' ? (
            <div>
              {sectionTitle('Match predictions', onlyScoring ? 'Only scoring picks shown' : 'Grouped by tournament group')}
              {memberPredictions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '34px 18px', color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '14px' }}>
                  <div style={{ fontSize: '30px', marginBottom: '7px' }}>{memberModal.isOffline ? '👤' : '🔒'}</div>
                  <div style={{ fontWeight: '800', marginBottom: '4px' }}>{memberModal.isOffline ? 'No predictions entered yet' : 'Picks are private'}</div>
                  <div style={{ fontSize: '11px' }}>{tournamentLive ? 'This user has chosen to keep their predictions private' : 'Picks become visible once matches kick off'}</div>
                </div>
              ) : Object.keys(predictionsByGroup).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 18px', color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '800' }}>No scoring picks match this filter</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {Object.entries(predictionsByGroup).sort(([a], [b]) => a.localeCompare(b)).map(([groupName, predictions]) => {
                    const groupTotal = predictions.reduce((sum, pred) => sum + Number(pred.points_awarded || 0), 0)
                    return (
                      <section key={groupName} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '14px', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '25px', height: '25px', display: 'grid', placeItems: 'center', borderRadius: '8px', background: 'var(--scottish-navy)', color: 'white', fontSize: '11px', fontWeight: '900' }}>{groupName}</span>
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: '850' }}>Group {groupName}</div>
                              <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{predictions.length} visible predictions</div>
                            </div>
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: '900', fontFamily: 'var(--font-mono)', color: groupTotal > 0 ? 'var(--accent-green)' : 'var(--text-muted)' }}>+{groupTotal}</span>
                        </div>
                        {predictions.map(renderPredictionRow)}
                      </section>
                    )
                  })}
                </div>
              )}

              {groupPositionBreakdown.length > 0 && (() => {
                const byGroup = {}
                groupPositionBreakdown.forEach(row => {
                  if (!byGroup[row.group_name]) byGroup[row.group_name] = []
                  byGroup[row.group_name].push(row)
                })
                const total = Object.values(byGroup).reduce((sum, rows) => {
                  const positionPoints = rows.reduce((s, row) => s + Number(row.points_awarded || 0), 0)
                  const perfect = rows.filter(row => Number(row.points_awarded || 0) > 0).length === 4
                  return sum + positionPoints + (perfect ? 5 : 0)
                }, 0)
                return (
                  <section style={{ marginTop: '12px', background: 'var(--bg-card)', border: '1px solid rgba(0,122,51,0.22)', borderRadius: '14px', overflow: 'hidden' }}>
                    <div style={{ padding: '10px 12px', background: 'rgba(0,122,51,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: '850', fontSize: '12px', color: 'var(--accent-green)' }}>Group position bonus</div>
                        <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>+2 per correct position · +5 perfect group</div>
                      </div>
                      <div style={{ fontWeight: '950', fontSize: '18px', fontFamily: 'var(--font-mono)', color: 'var(--accent-green)' }}>+{total}</div>
                    </div>
                    {Object.entries(byGroup).map(([groupName, rows]) => {
                      const correct = rows.filter(row => Number(row.points_awarded || 0) > 0).length
                      const perfect = correct === 4
                      const points = rows.reduce((sum, row) => sum + Number(row.points_awarded || 0), 0) + (perfect ? 5 : 0)
                      return (
                        <div key={groupName} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderTop: '1px solid var(--border-light)' }}>
                          <strong style={{ minWidth: '54px', fontSize: '10px' }}>Group {groupName}</strong>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', flex: 1 }}>
                            {rows.map((row, index) => (
                              <span key={index} style={{ padding: '2px 5px', borderRadius: '999px', background: Number(row.points_awarded || 0) > 0 ? 'rgba(0,122,51,0.10)' : 'rgba(198,40,40,0.07)', color: Number(row.points_awarded || 0) > 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontSize: '9px', fontWeight: '850' }}>
                                {row.team?.flag_emoji} {Number(row.points_awarded || 0) > 0 ? `+${row.points_awarded}` : '✕'}
                              </span>
                            ))}
                            {perfect && <span style={{ padding: '2px 5px', borderRadius: '999px', background: 'rgba(184,134,11,0.10)', color: 'var(--accent-gold)', fontSize: '9px', fontWeight: '850' }}>🎯 +5</span>}
                          </div>
                          <strong style={{ fontSize: '10px', color: points > 0 ? 'var(--accent-green)' : 'var(--text-muted)' }}>+{points}</strong>
                        </div>
                      )
                    })}
                  </section>
                )
              })()}
            </div>
          ) : activeTab === 'knockout' ? (
            <KnockoutPicksView userId={memberModal.userId} leagueId={memberModal.leagueId} lockedSnapshot={memberModal.lockedSnapshot} />
          ) : activeTab === 'koPredictor' ? (
            <KOPredictorScoresView userId={memberModal.userId} />
          ) : activeTab === 'awards' ? (
            <AwardPredsView userId={memberModal.userId} leagueId={memberModal.leagueId} lockedSnapshot={memberModal.lockedSnapshot} />
          ) : activeTab === 'compare' ? (
            <CompareWithMeView myUserId={currentUserId} targetUserId={memberModal.userId} targetName={memberModal.username} leagueId={memberModal.leagueId} lockedSnapshot={memberModal.lockedSnapshot} targetShowFuture={memberModal.targetShowFuture} />
          ) : activeTab === 'standings' ? (
            <div>
              {sectionTitle('Predicted group tables', 'Based on this player’s score predictions')}
              <MemberStandingsView predictions={memberPredictions} />
            </div>
          ) : null}
        </div>

        {showOptions && (
          <div
            onClick={() => setShowOptions(false)}
            style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', alignItems: 'flex-end', background: 'rgba(4,14,31,0.50)' }}
          >
            <div onClick={event => event.stopPropagation()} style={{ width: '100%', padding: '16px 16px calc(16px + env(safe-area-inset-bottom, 0px))', background: 'var(--bg-card)', borderRadius: '18px 18px 0 0', boxShadow: '0 -12px 35px rgba(0,0,0,0.18)' }}>
              <div style={{ fontSize: '16px', fontWeight: '900' }}>View options</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px', marginBottom: '12px' }}>Display preferences only. They do not change any predictions.</div>

              {[
                { label: 'Compact rows', note: 'Fit more predictions on screen', value: compactRows, onChange: setCompactRows },
                { label: 'Only show scoring picks', note: 'Hide misses and pending group predictions', value: onlyScoring, onChange: setOnlyScoring },
              ].map(option => (
                <button key={option.label} type="button" onClick={() => option.onChange(!option.value)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 0', border: 'none', borderTop: '1px solid var(--border-light)', background: 'none', color: 'var(--text-primary)', textAlign: 'left', cursor: 'pointer' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: '850' }}>{option.label}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{option.note}</div>
                  </div>
                  <span style={{ width: '40px', height: '23px', padding: '3px', borderRadius: '999px', display: 'flex', justifyContent: option.value ? 'flex-end' : 'flex-start', background: option.value ? 'var(--accent-green)' : 'var(--bg-tertiary)', transition: '0.15s ease' }}>
                    <span style={{ width: '17px', height: '17px', borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
                  </span>
                </button>
              ))}

              <button type="button" onClick={() => setShowOptions(false)} className="btn btn-primary btn-full" style={{ marginTop: '8px' }}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

