import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { ALL_STAGES, calcPredictedStandings, resolveSlot } from '../lib/bracketUtils.js'
import { DATES } from '../lib/tournamentDates.js'
import { buildBracketHealthByStage } from '../lib/bracketHealth.js'


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


const KO_SCORING = {
  correctResult: 5,
  exactScore: 10,
  firstGoalBand: 3,
  extraTime: 3,
  penalties: 5,
}

const KO_POINT_LABELS = {
  correct_winner: 'Correct 90-minute result',
  winner: 'Correct 90-minute result',
  result: 'Correct 90-minute result',
  exact_score: 'Exact 90-minute score',
  exact: 'Exact 90-minute score',
  first_goal_band: 'First-goal band',
  first_goal: 'First-goal band',
  first_goal_time: 'First-goal time',
  first_goal_minute: 'First-goal time',
  first_goal_time_band: 'First-goal time',
  extra_time: 'Correct method',
  et_bonus: 'Correct method',
  method_bonus: 'Method bonus',
  correct_method: 'Correct method',
  penalties: 'Correct method',
  penalties_bonus: 'Correct method',
  pen_bonus: 'Correct method',
  joker: 'Joker multiplier',
  joker_bonus: 'Joker bonus',
}

const KO_OUTCOME_LABELS = {
  '90mins': 'in 90 minutes',
  et: 'after extra time',
  penalties: 'on penalties',
}

const KO_GOAL_BAND_LABELS = {
  '1-15': '1–15',
  '16-30': '16–30',
  '31-45': '31–45',
  '46-60': '46–60',
  '61-75': '61–75',
  '76-90': '76–90+',
  et: 'Extra time',
  no_goals: 'No goals',
}

function normaliseKoPointsBreakdown(breakdown, prediction, match) {
  if (!breakdown) return []

  let value = breakdown
  if (typeof value === 'string') {
    try { value = JSON.parse(value) } catch { return [] }
  }

  const entries = Array.isArray(value)
    ? value.reduce((acc, item, index) => {
        if (item && typeof item === 'object') {
          const key = item.key || item.type || item.name || `item-${index}`
          acc[key] = item.points ?? item.value ?? item.amount ?? 0
        }
        return acc
      }, {})
    : typeof value === 'object'
      ? value
      : {}

  const numeric = key => {
    const number = Number(entries?.[key])
    return Number.isFinite(number) ? number : 0
  }

  const highest = keys => Math.max(0, ...keys.map(numeric))

  // The saved JSON currently contains several historic aliases for the same
  // award. Collapse those aliases into the four real scoring categories so a
  // single five-point award is not displayed three or four times.
  const scorePoints = highest([
    'score_points',
    'exact_score',
    'exact',
    'correct_90_result',
    'correct_winner',
    'winner',
    'result',
    'base',
  ])

  const advancePoints = highest([
    'advance_points',
    'advancing_team',
    'correct_advancing_team',
    'team_to_advance',
  ])

  const methodPoints = highest([
    'method_points',
    'method_bonus',
    'correct_method',
    'extra_time_bonus',
    'et_bonus',
    'penalties_bonus',
    'pen_bonus',
    'extra_time',
    'penalties',
  ])

  const firstGoalPoints = highest([
    'first_goal_points',
    'first_goal_band',
    'first_goal',
    'first_goal_time',
    'first_goal_minute',
    'first_goal_time_band',
  ])

  const jokerMultiplier = highest([
    'joker_multiplier',
    'joker',
  ])

  const predictedMethod = String(prediction?.outcome_type || '90mins')
  const actualMethod = String(match?.outcome_type || '90mins')
  const predictedDraw = Number(prediction?.home_score) === Number(prediction?.away_score)

  const rows = [
    { key: 'score_points', label: '90-minute score', points: scorePoints },
  ]

  // For a straightforward normal-time prediction, the advancing team is
  // already represented by the 90-minute result and there is no separate
  // method award. Hiding those zero-value rows avoids making a correct pick
  // look partly wrong.
  if (advancePoints > 0 || predictedDraw || predictedMethod !== '90mins') {
    rows.push({ key: 'advance_points', label: 'Advancing team', points: advancePoints })
  }

  if (methodPoints > 0 || actualMethod !== '90mins' || predictedMethod !== '90mins') {
    rows.push({ key: 'method_points', label: 'Method', points: methodPoints })
  }

  rows.push({ key: 'first_goal_points', label: 'First-goal band', points: firstGoalPoints })

  if (jokerMultiplier > 1) {
    rows.push({ key: 'joker_multiplier', label: 'Joker', points: jokerMultiplier })
  }

  return rows
}

function resolveKoWinner(prediction, match) {
  if (!prediction || !match) return null

  if (prediction.winner_team_id === match.home_team?.id) return match.home_team
  if (prediction.winner_team_id === match.away_team?.id) return match.away_team

  if (prediction.home_score != null && prediction.away_score != null) {
    if (Number(prediction.home_score) > Number(prediction.away_score)) return match.home_team
    if (Number(prediction.away_score) > Number(prediction.home_score)) return match.away_team
  }

  return null
}

function koMaximumBasePoints(prediction, match) {
  if (!prediction) return 0

  // Once a match is complete, the true maximum depends on how the match was
  // actually decided, not on the method the member happened to predict.
  const method = match?.status === 'completed'
    ? String(match?.outcome_type || '90mins')
    : String(prediction?.outcome_type || '90mins')

  const hasSeparateAdvanceAward = method === 'et' || method === 'penalties'
  const methodBonus = method === 'et'
    ? KO_SCORING.extraTime
    : method === 'penalties'
      ? KO_SCORING.penalties
      : 0

  return KO_SCORING.exactScore
    + (hasSeparateAdvanceAward ? 5 : 0)
    + methodBonus
    + KO_SCORING.firstGoalBand
}

function koMaximumPoints(prediction, match) {
  const baseMaximum = koMaximumBasePoints(prediction, match)
  return baseMaximum * (prediction?.is_joker ? 2 : 1)
}

function koPredictionDescription(prediction, match) {
  if (!prediction) return 'No prediction made'

  const winner = resolveKoWinner(prediction, match)
  if (!winner) return 'Advancing team not recorded'

  const outcome = KO_OUTCOME_LABELS[prediction.outcome_type] || 'in 90 minutes'
  return `${winner.flag_emoji || ''} ${winner.short_code || winner.name} to advance ${outcome}`.trim()
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


function GroupTablesScoreView({ predictions, breakdown = [], totalPoints = 0 }) {
  if (!breakdown.length) {
    return <MemberStandingsView predictions={predictions} />
  }

  const byGroup = breakdown.reduce((acc, row) => {
    const groupName = row.group_name || 'Other'
    if (!acc[groupName]) acc[groupName] = []
    acc[groupName].push(row)
    return acc
  }, {})

  const groupNames = Object.keys(byGroup).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

  return (
    <div>
      <section style={{ marginBottom: '12px', background: 'var(--bg-card)', border: '1px solid rgba(0,122,51,0.22)', borderRadius: '14px', overflow: 'hidden' }}>
        <div style={{ padding: '12px 14px', background: 'rgba(0,122,51,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <div>
            <div style={{ fontWeight: '900', fontSize: '13px', color: 'var(--accent-green)' }}>Group position bonus</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>+2 per correct position · +5 for a perfect group</div>
          </div>
          <div style={{ fontWeight: '950', fontSize: '22px', fontFamily: 'var(--font-mono)', color: 'var(--accent-green)' }}>+{Number(totalPoints || 0)}</div>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '10px' }}>
        {groupNames.map(groupName => {
          const rows = [...byGroup[groupName]].sort((a, b) => Number(a.predicted_position || 99) - Number(b.predicted_position || 99))
          const decidedRows = rows.filter(row => row.actual_position != null)
          const perfect = rows.length === 4 && decidedRows.length === 4 && rows.every(row => Number(row.points_awarded || 0) > 0)
          const positionPoints = rows.reduce((sum, row) => sum + Number(row.points_awarded || 0), 0)
          const groupTotal = positionPoints + (perfect ? 5 : 0)

          return (
            <section key={groupName} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '14px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '10px 12px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)' }}>
                <strong style={{ fontSize: '13px', color: 'var(--scottish-navy)' }}>GROUP {groupName}</strong>
                <strong style={{ fontSize: '14px', fontFamily: 'var(--font-mono)', color: groupTotal > 0 ? 'var(--accent-green)' : 'var(--text-muted)' }}>+{groupTotal}</strong>
              </div>

              <div style={{ padding: '3px 12px 7px' }}>
                {rows.map((row, index) => {
                  const awarded = Number(row.points_awarded || 0)
                  const decided = row.actual_position != null
                  const correct = awarded > 0
                  return (
                    <div key={`${groupName}-${row.team?.short_code || index}`} style={{ display: 'grid', gridTemplateColumns: '20px minmax(0, 1fr) 68px 34px', gap: '7px', alignItems: 'center', padding: '8px 0', borderTop: index > 0 ? '1px solid var(--border-light)' : 'none' }}>
                      <span style={{ fontSize: '10px', fontWeight: '850', color: correct ? 'var(--accent-green)' : 'var(--text-muted)' }}>{row.predicted_position}</span>
                      <span style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', overflow: 'hidden' }}>
                        <span style={{ fontSize: '15px', flexShrink: 0 }}>{row.team?.flag_emoji}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.team?.name || row.team?.short_code || 'Team'}</span>
                      </span>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)', textAlign: 'center', whiteSpace: 'nowrap' }}>{decided ? `Actual ${row.actual_position}` : 'Pending'}</span>
                      <span style={{ fontSize: '10px', fontWeight: '900', textAlign: 'right', color: correct ? 'var(--accent-green)' : decided ? 'var(--accent-red)' : 'var(--text-muted)' }}>{decided ? (correct ? `+${awarded}` : '0') : '—'}</span>
                    </div>
                  )
                })}
                {perfect && (
                  <div style={{ marginTop: '5px', padding: '7px 9px', borderRadius: '9px', background: 'rgba(184,134,11,0.10)', color: 'var(--accent-gold)', fontSize: '10px', fontWeight: '900' }}>🎯 Perfect group +5</div>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function KnockoutPicksView({ userId, leagueId, lockedSnapshot = false }) {
  const [picks, setPicks] = useState({})
  const [groupPreds, setGroupPreds] = useState({})
  const [matches, setMatches] = useState([])
  const [allTeams, setAllTeams] = useState([])
  const [actualParticipantsByStage, setActualParticipantsByStage] = useState({})
  const [actualGroupPositions, setActualGroupPositions] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeStageKey, setActiveStageKey] = useState('r32')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      const koTable = lockedSnapshot ? 'league_knockout_picks' : 'knockout_picks'
      let koQuery = supabase
        .from(koTable)
        .select('match_number, stage, winner_team_id, home_team_id, away_team_id, is_joker')
        .eq('user_id', userId)
      if (lockedSnapshot && leagueId) koQuery = koQuery.eq('league_id', leagueId)

      const predTable = lockedSnapshot ? 'league_predictions' : 'predictions'
      let predQuery = supabase
        .from(predTable)
        .select('match_id, home_score, away_score')
        .eq('user_id', userId)
      if (lockedSnapshot && leagueId) predQuery = predQuery.eq('league_id', leagueId)

      const [koRes, predRes, matchRes, teamsRes, standingsRes] = await Promise.all([
        koQuery.order('match_number', { ascending: true }),
        predQuery,
        supabase.from('matches').select('id, match_number, stage, status, kickoff_time, home_score, away_score, outcome_type, home_team_id, away_team_id, winner_team_id, group:group_id(name), home_team:home_team_id(id,name,flag_emoji,short_code), away_team:away_team_id(id,name,flag_emoji,short_code)'),
        supabase.from('teams').select('id, name, flag_emoji, short_code'),
        supabase.from('group_standings').select('team_id, position, played').eq('played', 3),
      ])

      if (cancelled) return

      const pickMap = {}
      ;(koRes.data || []).forEach(pick => {
        pickMap[pick.match_number] = {
          winner_id: pick.winner_team_id,
          home_team_id: pick.home_team_id,
          away_team_id: pick.away_team_id,
          is_joker: pick.is_joker,
          stage: pick.stage,
        }
      })

      const predictionMap = {}
      ;(predRes.data || []).forEach(prediction => {
        if (prediction.home_score != null && prediction.away_score != null) {
          predictionMap[prediction.match_id] = { home: prediction.home_score, away: prediction.away_score }
        }
      })

      const participantMap = { r32: new Set(), r16: new Set(), qf: new Set(), sf: new Set(), final: new Set() }
      ;(matchRes.data || []).forEach(match => {
        if (participantMap[match.stage]) {
          if (match.home_team_id) participantMap[match.stage].add(match.home_team_id)
          if (match.away_team_id) participantMap[match.stage].add(match.away_team_id)
        }
        if (match.status === 'completed' && match.winner_team_id) {
          const nextStage = { r32: 'r16', r16: 'qf', qf: 'sf', sf: 'final' }[match.stage]
          if (nextStage) participantMap[nextStage].add(match.winner_team_id)
        }
      })
      const groupPositionMap = {}
      ;(standingsRes.data || []).forEach(row => {
        if (!row.team_id) return
        groupPositionMap[row.team_id] = Number(row.position)
        if (Number(row.position) <= 2) participantMap.r32.add(row.team_id)
      })

      setPicks(pickMap)
      setGroupPreds(predictionMap)
      setMatches(matchRes.data || [])
      setAllTeams(teamsRes.data || [])
      setActualParticipantsByStage(participantMap)
      setActualGroupPositions(groupPositionMap)
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [userId, leagueId, lockedSnapshot])

  const groupMatches = React.useMemo(() => matches.filter(match => match.stage === 'group'), [matches])
  const standings = React.useMemo(() => calcPredictedStandings(groupMatches, groupPreds, true), [groupMatches, groupPreds])
  const teamsById = React.useMemo(() => {
    const map = {}
    matches.forEach(match => {
      if (match.home_team) map[match.home_team.id] = match.home_team
      if (match.away_team) map[match.away_team.id] = match.away_team
    })
    allTeams.forEach(team => { if (team.id) map[team.id] = team })
    return map
  }, [matches, allTeams])

  const resolveTeam = (slot) => {
    if (!slot) return null
    if (slot.startsWith('W')) {
      const matchNumber = parseInt(slot.replace('W', ''), 10)
      const winnerId = picks[matchNumber]?.winner_id
      return winnerId ? teamsById[winnerId] || null : null
    }
    if (slot.startsWith('L')) return null
    return resolveSlot(slot, standings, groupMatches, groupPreds)
  }

  const resolvedFor = (matchDefinition) => {
    const pick = picks[matchDefinition.match_number]
    const pureHome = resolveTeam(matchDefinition.home_slot)
    const pureAway = resolveTeam(matchDefinition.away_slot)
    const winnerId = pick?.winner_id

    if (!winnerId || winnerId === pureHome?.id || winnerId === pureAway?.id) {
      return { home: pureHome, away: pureAway }
    }

    const savedWinner = teamsById[winnerId] || null
    if (pick?.away_team_id === winnerId && pick?.home_team_id !== winnerId) {
      return { home: pureHome, away: savedWinner }
    }
    return { home: savedWinner, away: pureAway }
  }

  const availableStages = ALL_STAGES.filter(stage => stage.matches.some(match => picks[match.match_number]?.winner_id))
  const activeStage = availableStages.find(stage => stage.key === activeStageKey) || availableStages[0]

  const previousStageKey = { r16: 'r32', qf: 'r16', sf: 'qf', final: 'sf' }
  const stageIsSettled = (stageKey) => {
    if (stageKey === 'r32') {
      const groupFixtures = matches.filter(match => match.stage === 'group')
      return groupFixtures.length > 0 && groupFixtures.every(match => match.status === 'completed')
    }
    const previous = previousStageKey[stageKey]
    const previousMatches = matches.filter(match => match.stage === previous)
    return previousMatches.length > 0 && previousMatches.every(match => match.status === 'completed')
  }

  const actualMatchForTeam = (teamId, stageKey) => matches.find(match =>
    match.stage === stageKey && (match.home_team_id === teamId || match.away_team_id === teamId)
  )

  const teamOutcome = (team, stage) => {
    if (!team) return { points: 0, status: 'pending', label: '—', actualMatch: null }
    const reached = actualParticipantsByStage[stage.key]?.has(team.id) || false
    const actualMatch = actualMatchForTeam(team.id, stage.key)

    if (!reached) {
      if (stage.key === 'r32') {
        const groupPosition = actualGroupPositions[team.id]
        const r32Matches = matches.filter(match => match.stage === 'r32')
        const r32FieldResolved = r32Matches.length === 16 && r32Matches.every(match => match.home_team_id && match.away_team_id)

        // A completed fourth-place finish is an immediate elimination. A third-place
        // team stays pending until the best-third-place field has been finalised.
        if (groupPosition >= 4) {
          return { points: 0, status: 'missed', label: 'Eliminated', actualMatch }
        }
        if (groupPosition === 3 && (r32FieldResolved || stageIsSettled('r32'))) {
          return { points: 0, status: 'missed', label: 'Eliminated', actualMatch }
        }
      } else {
        const stageOrder = ['r32', 'r16', 'qf', 'sf', 'final']
        const currentIndex = stageOrder.indexOf(stage.key)
        const earlierStages = currentIndex > 0 ? stageOrder.slice(0, currentIndex).reverse() : []

        // A team can appear in a user's later-round prediction even when it never
        // reached the immediately previous real round. Search every earlier real
        // knockout round for the match where the team was eliminated.
        const eliminationMatch = earlierStages
          .map(stageKey => actualMatchForTeam(team.id, stageKey))
          .find(match => match?.winner_team_id && match.winner_team_id !== team.id)

        if (eliminationMatch) {
          return { points: 0, status: 'missed', label: 'Eliminated', actualMatch: eliminationMatch }
        }

        // Once all 16 Round-of-32 matchups are populated, any team absent from that
        // field was eliminated in the groups. Mark its R16 and later cards immediately.
        const r32Matches = matches.filter(match => match.stage === 'r32')
        const r32FieldResolved = r32Matches.length === 16 && r32Matches.every(match => match.home_team_id && match.away_team_id)
        const reachedR32 = actualParticipantsByStage.r32?.has(team.id) || false

        if (r32FieldResolved && !reachedR32) {
          return { points: 0, status: 'missed', label: 'Eliminated', actualMatch: null }
        }
      }

      if (stageIsSettled(stage.key)) {
        return { points: 0, status: 'missed', label: 'Eliminated', actualMatch }
      }
      return { points: 0, status: 'pending', label: '—', actualMatch }
    }

    if (actualMatch?.status === 'completed' && actualMatch.winner_team_id) {
      if (actualMatch.winner_team_id === team.id) {
        return { points: stage.points, status: 'advanced', label: stage.key === 'final' ? 'Champion' : 'Advanced', actualMatch }
      }
      return { points: stage.points, status: 'eliminated', label: 'Eliminated', actualMatch }
    }

    return { points: stage.points, status: 'reached', label: 'In round', actualMatch }
  }

  const healthByStage = React.useMemo(() => {
    const r32Matches = matches.filter(match => match.stage === 'r32')
    const r32FieldResolved = r32Matches.length === 16 && r32Matches.every(match => match.home_team_id && match.away_team_id)
    const r32Participants = actualParticipantsByStage.r32 || new Set()
    const completedLosers = new Set()
    matches.forEach(match => {
      if (match.status !== 'completed' || !match.winner_team_id) return
      if (match.home_team_id && match.home_team_id !== match.winner_team_id) completedLosers.add(match.home_team_id)
      if (match.away_team_id && match.away_team_id !== match.winner_team_id) completedLosers.add(match.away_team_id)
    })

    const isOut = teamId => {
      if (!teamId) return false
      if (completedLosers.has(teamId)) return true
      if (r32FieldResolved && !r32Participants.has(teamId)) return true
      const groupPosition = actualGroupPositions[teamId]
      if (groupPosition >= 4) return true
      if (groupPosition === 3 && r32FieldResolved && !r32Participants.has(teamId)) return true
      return false
    }

    return buildBracketHealthByStage({
      allStages: ALL_STAGES,
      knockoutPicks: picks,
      getMatchTeams: resolvedFor,
      matches,
      isTeamOut: isOut,
    })
  }, [matches, picks, actualParticipantsByStage, actualGroupPositions, standings, teamsById])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}><div className="spinner" /></div>
  if (!availableStages.length) return <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}><div style={{ fontSize: '32px', marginBottom: '8px' }}>🏆</div><div style={{ fontWeight: '700' }}>No knockout picks yet</div></div>

  const stageMatches = activeStage.matches.filter(match => picks[match.match_number]?.winner_id)
  const uniqueStageTeams = new Map()
  stageMatches.forEach(matchDefinition => {
    const { home, away } = resolvedFor(matchDefinition)
    if (home?.id) uniqueStageTeams.set(home.id, home)
    if (away?.id) uniqueStageTeams.set(away.id, away)
  })
  const completedFinal = matches.find(match => match.match_number === 104 && match.stage === 'final' && match.status === 'completed')
  const championBonus = activeStage.key === 'final'
    && completedFinal?.winner_team_id
    && picks[104]?.winner_id === completedFinal.winner_team_id ? 25 : 0
  const stagePoints = [...uniqueStageTeams.values()].reduce((sum, team) => sum + teamOutcome(team, activeStage).points, 0) + championBonus

  const outcomeStyle = (outcome) => {
    if (outcome.status === 'advanced') return { colour: 'var(--accent-green)', bg: 'rgba(0,122,51,0.09)', border: 'rgba(0,122,51,0.24)' }
    if (outcome.status === 'eliminated' || outcome.status === 'missed') return { colour: 'var(--accent-red)', bg: 'rgba(198,40,40,0.06)', border: 'rgba(198,40,40,0.18)' }
    if (outcome.status === 'reached') return { colour: 'var(--accent-green)', bg: 'rgba(0,122,51,0.06)', border: 'rgba(0,122,51,0.18)' }
    return { colour: 'var(--text-muted)', bg: 'var(--bg-secondary)', border: 'var(--border-light)' }
  }

  const activeStageIndex = availableStages.findIndex(stage => stage.key === activeStage.key)
  const previousStage = activeStageIndex > 0 ? availableStages[activeStageIndex - 1] : null
  const nextStage = activeStageIndex < availableStages.length - 1 ? availableStages[activeStageIndex + 1] : null

  return (
    <div>
      <div style={{
        position: 'sticky', top: '-12px', zIndex: 8,
        display: 'flex', gap: '6px', overflowX: 'auto',
        margin: '-12px -12px 12px', padding: '10px 12px 9px',
        background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)',
        boxShadow: '0 4px 10px rgba(4,14,31,0.05)',
        scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
      }}>
        {availableStages.map(stage => (
          <button
            key={stage.key}
            type="button"
            onClick={() => setActiveStageKey(stage.key)}
            style={{
              whiteSpace: 'nowrap', padding: '7px 11px', borderRadius: '999px', cursor: 'pointer',
              border: stage.key === activeStage.key ? '1px solid var(--scottish-navy)' : '1px solid var(--border-light)',
              background: stage.key === activeStage.key ? 'var(--scottish-navy)' : 'var(--bg-card)',
              color: stage.key === activeStage.key ? 'white' : 'var(--text-muted)',
              fontSize: '10px', fontWeight: '850',
            }}
          >
            {stage.label}
          </button>
        ))}
      </div>

      {healthByStage[activeStage.key] && (() => {
        const health = healthByStage[activeStage.key]
        return (
          <section style={{ marginBottom: '11px', padding: '13px', background: 'var(--bg-card)', border: '1px solid rgba(0,122,51,0.18)', borderRadius: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{activeStage.label} bracket health</div>
                <div style={{ marginTop: '4px', fontSize: '16px', fontWeight: '950', color: 'var(--text-primary)' }}><span style={{ color: 'var(--accent-green)' }}>{health.alive}/{health.total}</span> predicted teams still alive</div>
                <div style={{ marginTop: '3px', fontSize: '10px', color: 'var(--text-muted)' }}>{health.out} out{health.guaranteedLosses ? ` · ${health.guaranteedLosses} guaranteed route-conflict loss${health.guaranteedLosses === 1 ? '' : 'es'}` : ''}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '22px', lineHeight: 1, fontWeight: '950', color: 'var(--accent-green)' }}>{health.healthPct}%</div>
                <div style={{ marginTop: '3px', fontSize: '8px', color: 'var(--text-muted)', fontWeight: '850', textTransform: 'uppercase' }}>Health</div>
              </div>
            </div>
            <div style={{ height: '5px', marginTop: '11px', background: 'var(--bg-tertiary)', borderRadius: '999px', overflow: 'hidden' }}><div style={{ height: '100%', width: `${health.healthPct}%`, background: 'var(--accent-green)', borderRadius: '999px' }} /></div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
              <span style={{ padding: '5px 8px', borderRadius: '999px', background: 'rgba(0,122,51,0.08)', color: 'var(--accent-green)', fontSize: '9px', fontWeight: '900' }}>{health.alive} alive</span>
              <span style={{ padding: '5px 8px', borderRadius: '999px', background: 'rgba(198,40,40,0.07)', color: 'var(--accent-red)', fontSize: '9px', fontWeight: '900' }}>{health.out} out</span>
              {health.guaranteedLosses > 0 && <span style={{ padding: '5px 8px', borderRadius: '999px', background: 'rgba(184,134,11,0.10)', color: 'var(--accent-gold)', fontSize: '9px', fontWeight: '900' }}>{health.guaranteedLosses} guaranteed loss</span>}
              <span style={{ padding: '5px 8px', borderRadius: '999px', background: 'rgba(11,63,145,0.07)', color: 'var(--scottish-navy)', fontSize: '9px', fontWeight: '900' }}>Up to {health.maxPoints} pts remain</span>
            </div>
          </section>
        )
      })()}

      <section style={{ marginBottom: '11px', padding: '11px 13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '13px' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: '900' }}>{activeStage.label}</div>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>Teams score for reaching this round, even if they are later eliminated.</div>
        </div>
        <strong style={{ fontSize: '18px', fontFamily: 'var(--font-mono)', color: stagePoints > 0 ? 'var(--accent-green)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>+{stagePoints}</strong>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: '10px' }}>
        {stageMatches.map(matchDefinition => {
          const pick = picks[matchDefinition.match_number]
          const { home, away } = resolvedFor(matchDefinition)
          const homeOutcome = teamOutcome(home, activeStage)
          const awayOutcome = teamOutcome(away, activeStage)
          const sharedActualMatch = homeOutcome.actualMatch && awayOutcome.actualMatch && homeOutcome.actualMatch.id === awayOutcome.actualMatch.id
            ? homeOutcome.actualMatch
            : null

          const renderTeamCard = (team, outcome) => {
            const selected = team?.id === pick.winner_id
            const teamChampionBonus = activeStage.key === 'final' && selected && team?.id === completedFinal?.winner_team_id ? 25 : 0
            const displayedPoints = outcome.points + teamChampionBonus
            const style = outcomeStyle(outcome)
            return (
              <div style={{ position: 'relative', minHeight: '128px', padding: '13px 10px 11px', borderRadius: '13px', textAlign: 'center', background: selected ? 'rgba(11,63,145,0.06)' : style.bg, border: `2px solid ${selected ? 'var(--scottish-navy)' : style.border}` }}>
                {selected && <span style={{ position: 'absolute', top: '7px', right: '7px', padding: '3px 6px', borderRadius: '999px', background: 'var(--scottish-navy)', color: 'white', fontSize: '8px', fontWeight: '900' }}>YOUR PICK</span>}
                <div style={{ fontSize: '27px', lineHeight: 1, marginTop: selected ? '13px' : '4px' }}>{team?.flag_emoji || '🏳️'}</div>
                <div style={{ marginTop: '7px', fontSize: '12px', fontWeight: '900', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team?.name || team?.short_code || 'TBC'}</div>
                <div style={{ marginTop: '12px', fontSize: '12px', fontWeight: '900', color: style.colour }}>
                  {displayedPoints > 0 ? `+${displayedPoints} pts` : outcome.status === 'pending' ? '—' : '0 pts'}
                </div>
                <div style={{ marginTop: '2px', fontSize: '9px', fontWeight: '800', color: style.colour }}>{teamChampionBonus ? 'Champion · includes +25 bonus' : outcome.label}</div>
              </div>
            )
          }

          return (
            <article key={matchDefinition.match_number} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '14px', padding: '11px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '9px', color: 'var(--text-muted)', fontSize: '9px', fontWeight: '850', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <span>Predicted M{matchDefinition.match_number}</span>
                <span>{activeStage.label}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {renderTeamCard(home, homeOutcome)}
                {renderTeamCard(away, awayOutcome)}
              </div>
              <div style={{ marginTop: '8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px', lineHeight: 1.4 }}>
                {sharedActualMatch?.status === 'completed' && sharedActualMatch.home_score != null && sharedActualMatch.away_score != null
                  ? `${sharedActualMatch.home_team?.short_code} ${sharedActualMatch.home_score}–${sharedActualMatch.away_score} ${sharedActualMatch.away_team?.short_code}`
                  : 'Original predicted matchup · each team is tracked in its real fixture'}
              </div>
              {pick.is_joker && <div style={{ marginTop: '6px', textAlign: 'center', fontSize: '9px', fontWeight: '850', color: 'var(--accent-gold)' }}>🃏 Joker selection</div>}
            </article>
          )
        })}
      </div>

      <nav style={{
        display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '8px',
        marginTop: '14px', padding: '10px', borderRadius: '13px',
        background: 'var(--bg-card)', border: '1px solid var(--border-light)',
        boxShadow: '0 -2px 10px rgba(4,14,31,0.04)',
      }}>
        <button
          type="button"
          disabled={!previousStage}
          onClick={() => previousStage && setActiveStageKey(previousStage.key)}
          style={{
            minHeight: '38px', padding: '8px 10px', borderRadius: '10px', cursor: previousStage ? 'pointer' : 'default',
            border: '1px solid var(--border-light)', background: previousStage ? 'var(--bg-secondary)' : 'transparent',
            color: previousStage ? 'var(--scottish-navy)' : 'var(--text-muted)', opacity: previousStage ? 1 : 0.45,
            fontSize: '10px', fontWeight: '850', textAlign: 'left',
          }}
        >
          {previousStage ? `← ${previousStage.label}` : '← Previous'}
        </button>

        <div style={{ textAlign: 'center', minWidth: '58px' }}>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '750' }}>ROUND</div>
          <div style={{ marginTop: '2px', fontSize: '11px', color: 'var(--text-primary)', fontWeight: '900' }}>{activeStage.label}</div>
        </div>

        <button
          type="button"
          disabled={!nextStage}
          onClick={() => nextStage && setActiveStageKey(nextStage.key)}
          style={{
            minHeight: '38px', padding: '8px 10px', borderRadius: '10px', cursor: nextStage ? 'pointer' : 'default',
            border: '1px solid var(--border-light)', background: nextStage ? 'var(--scottish-navy)' : 'transparent',
            color: nextStage ? 'white' : 'var(--text-muted)', opacity: nextStage ? 1 : 0.45,
            fontSize: '10px', fontWeight: '850', textAlign: 'right',
          }}
        >
          {nextStage ? `${nextStage.label} →` : 'Next →'}
        </button>
      </nav>
    </div>
  )
}


function KOPredictorScoresView({ userId, currentUserId, targetName = 'Member' }) {
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
        .select('id, match_number, stage, kickoff_time, status, home_score, away_score, aet_home_score, aet_away_score, home_score_pens, away_score_pens, winner_team_id, outcome_type, first_goal_band, home_team:home_team_id(id,name,flag_emoji,short_code), away_team:away_team_id(id,name,flag_emoji,short_code)')
        .in('stage', ['r32', 'r16', 'qf', 'sf', '3rd', 'final'])
        .order('kickoff_time', { ascending: true })

      if (matchError) {
        if (!cancelled) {
          setError(matchError.message)
          setLoading(false)
        }
        return
      }

      const now = new Date()
      const isOwnProfile = !!currentUserId && userId === currentUserId
      const visibleMatches = isOwnProfile
        ? (matchData || []).filter(match => match.home_team?.id && match.away_team?.id)
        : (matchData || []).filter(match =>
            match.status === 'live' ||
            match.status === 'completed' ||
            new Date(match.kickoff_time) <= now
          )

      const visibleIds = visibleMatches.map(match => match.id)
      if (visibleIds.length === 0) {
        if (!cancelled) {
          setRows([])
          setLoading(false)
        }
        return
      }

      const requestedUserIds = [...new Set(
        [userId, currentUserId].filter(Boolean)
      )]

      const { data: predData, error: predError } = await supabase
        .from('ko_predictions')
        .select('user_id, match_id, home_score, away_score, outcome_type, winner_team_id, first_goal_band, is_joker, points_awarded, points_breakdown')
        .in('user_id', requestedUserIds)
        .in('match_id', visibleIds)

      if (predError) {
        if (!cancelled) {
          setError(predError.message)
          setLoading(false)
        }
        return
      }

      const predictionsByUser = {}
      ;(predData || []).forEach(prediction => {
        if (!predictionsByUser[prediction.user_id]) {
          predictionsByUser[prediction.user_id] = {}
        }
        predictionsByUser[prediction.user_id][prediction.match_id] = prediction
      })

      if (!cancelled) {
        setRows(visibleMatches.map(match => ({
          match,
          prediction: predictionsByUser[userId]?.[match.id] || null,
          myPrediction: currentUserId && currentUserId !== userId
            ? predictionsByUser[currentUserId]?.[match.id] || null
            : null,
        })))
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [userId, currentUserId])

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}><div className="spinner" /></div>
  }

  if (error) {
    return <div style={{ textAlign: 'center', padding: '28px', color: 'var(--accent-red)' }}>Could not load KO Predictor picks: {error}</div>
  }

  if (rows.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔒</div>
        <div style={{ fontWeight: '700' }}>No KO Predictor matches have locked yet</div>
      </div>
    )
  }

  const stageLabels = {
    r32: 'Round of 32',
    r16: 'Round of 16',
    qf: 'Quarter-finals',
    sf: 'Semi-finals',
    '3rd': 'Third-place play-off',
    final: 'Final',
  }

  const isComparing = Boolean(currentUserId && currentUserId !== userId)

  return (
    <div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: 1.45 }}>
        {userId === currentUserId
          ? 'Your saved KO Predictor picks are visible before kickoff. Other players remain hidden until each match locks.'
          : `Showing ${targetName}'s locked KO Predictor picks. Your matching picks are compared underneath.`}
      </div>

      {rows.map(({ match, prediction, myPrediction }, index) => {
        const showStage = index === 0 || rows[index - 1]?.match?.stage !== match.stage
        const completed = match.status === 'completed'
        const live = match.status === 'live'
        const winner = resolveKoWinner(prediction, match)
        const myWinner = resolveKoWinner(myPrediction, match)
        const actualWinner = match.winner_team_id === match.home_team?.id
          ? match.home_team
          : match.winner_team_id === match.away_team?.id
            ? match.away_team
            : null

        const totalEarned = Number(prediction?.points_awarded || 0)
        const maximumBasePoints = koMaximumBasePoints(prediction, match)
        const maximumPoints = koMaximumPoints(prediction, match)
        const storedBreakdown = prediction?.points_breakdown && typeof prediction.points_breakdown === 'string'
          ? (() => { try { return JSON.parse(prediction.points_breakdown) } catch { return {} } })()
          : (prediction?.points_breakdown || {})

        const totalBeforeJoker = Number(
          storedBreakdown?.total_before_joker ??
          (prediction?.is_joker ? totalEarned / 2 : totalEarned)
        )

        // "Points missed" is shown before the Joker multiplier. This keeps the
        // figure tied to the match's real scoring ceiling (13 in a normal-time
        // game) rather than making missed opportunities look doubled.
        const pointsMissed = completed
          ? Math.max(0, maximumBasePoints - totalBeforeJoker)
          : 0

        const breakdown = completed && prediction
          ? normaliseKoPointsBreakdown(prediction.points_breakdown, prediction, match)
              .filter(item => {
                const key = String(item.key).toLowerCase()
                if (['total', 'points_total', 'total_points'].includes(key)) return false
                if (key.includes('joker') && !prediction.is_joker) return false
                return true
              })
          : []

        const predictedGoalBand = prediction?.first_goal_band
        const actualGoalBand = match.first_goal_band
        const goalBandResolved = Boolean(actualGoalBand)
        const goalBandCorrect = Boolean(
          predictedGoalBand &&
          actualGoalBand &&
          String(predictedGoalBand) === String(actualGoalBand)
        )

        const sameScore = Boolean(
          prediction &&
          myPrediction &&
          Number(prediction.home_score) === Number(myPrediction.home_score) &&
          Number(prediction.away_score) === Number(myPrediction.away_score)
        )
        const sameWinner = Boolean(
          winner?.id &&
          myWinner?.id &&
          winner.id === myWinner.id
        )
        const sameMethod = Boolean(
          prediction &&
          myPrediction &&
          String(prediction.outcome_type || '90mins') === String(myPrediction.outcome_type || '90mins')
        )
        const sameGoalBand = Boolean(
          prediction?.first_goal_band &&
          myPrediction?.first_goal_band &&
          String(prediction.first_goal_band) === String(myPrediction.first_goal_band)
        )

        const statusColour = completed
          ? totalEarned > 0
            ? 'var(--accent-green)'
            : 'var(--text-muted)'
          : live
            ? 'var(--accent-red)'
            : 'var(--scottish-navy)'

        return (
          <React.Fragment key={match.id}>
            {showStage && (
              <div style={{
                fontSize: '11px',
                fontWeight: '800',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                margin: '12px 0 6px',
              }}>
                {stageLabels[match.stage] || match.stage}
              </div>
            )}

            <article style={{
              padding: '11px 12px',
              marginBottom: '9px',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: completed && totalEarned > 0
                ? '1px solid rgba(0,122,51,0.25)'
                : '1px solid var(--border-light)',
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '32px minmax(0, 1fr) auto minmax(0, 1fr)',
                alignItems: 'center',
                gap: '8px',
              }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>M{match.match_number}</span>

                <span style={{
                  minWidth: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: '800',
                }}>
                  <span style={{ fontSize: '18px', flexShrink: 0 }}>{match.home_team?.flag_emoji}</span>
                  <span>{match.home_team?.short_code}</span>
                </span>

                <span style={{
                  minWidth: '44px',
                  textAlign: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '14px',
                  fontWeight: '900',
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                }}>
                  {(live || completed) &&
                  match.home_score != null &&
                  match.away_score != null
                    ? `${match.home_score}–${match.away_score}`
                    : 'v'}
                </span>

                <span style={{
                  minWidth: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: '800',
                }}>
                  <span>{match.away_team?.short_code}</span>
                  <span style={{ fontSize: '18px', flexShrink: 0 }}>{match.away_team?.flag_emoji}</span>
                </span>
              </div>

              {prediction ? (
                <div style={{ marginTop: '9px', paddingTop: '9px', borderTop: '1px solid var(--border-light)' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '7px',
                        flexWrap: 'wrap',
                      }}>
                        <span style={{
                          fontSize: '9px',
                          fontWeight: '850',
                          color: 'var(--text-muted)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}>
                          Prediction
                        </span>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '16px',
                          fontWeight: '900',
                        }}>
                          {prediction.home_score}–{prediction.away_score}
                        </span>
                        {prediction.is_joker && <span title="Joker">🃏</span>}
                      </div>

                      <div style={{
                        marginTop: '4px',
                        fontSize: '11px',
                        fontWeight: '800',
                        color: 'var(--text-primary)',
                        lineHeight: 1.4,
                      }}>
                        {koPredictionDescription(prediction, match)}
                      </div>
                    </div>

                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      {completed ? (
                        <>
                          <div style={{
                            fontSize: '12px',
                            fontWeight: '950',
                            fontFamily: 'var(--font-mono)',
                            color: statusColour,
                            whiteSpace: 'nowrap',
                          }}>
                            {totalEarned} pts earned
                          </div>
                          <div style={{
                            marginTop: '2px',
                            fontSize: '9px',
                            fontWeight: '800',
                            color: pointsMissed > 0 ? 'var(--accent-red)' : 'var(--text-muted)',
                            whiteSpace: 'nowrap',
                          }}>
                            {pointsMissed} base pts missed
                          </div>
                        </>
                      ) : live ? (
                        <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--accent-red)' }}>● LIVE</span>
                      ) : (
                        <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--scottish-navy)' }}>
                          Up to {maximumPoints} pts
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{
                    marginTop: '8px',
                    padding: '8px 9px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-light)',
                    fontSize: '10px',
                    lineHeight: 1.45,
                  }}>
                    <div style={{ fontWeight: '850', color: 'var(--text-secondary)' }}>
                      First-goal band
                    </div>
                    <div style={{ marginTop: '2px', color: 'var(--text-muted)' }}>
                      Predicted: {predictedGoalBand
                        ? KO_GOAL_BAND_LABELS[predictedGoalBand] || predictedGoalBand
                        : 'No prediction'}
                      {' · '}
                      Actual: {actualGoalBand
                        ? KO_GOAL_BAND_LABELS[actualGoalBand] || actualGoalBand
                        : live
                          ? 'Waiting for first goal'
                          : completed
                            ? 'Not recorded'
                            : 'Pending'}
                    </div>

                    {(live || completed) && goalBandResolved && (
                      <div style={{
                        marginTop: '3px',
                        fontWeight: '900',
                        color: goalBandCorrect ? 'var(--accent-green)' : 'var(--accent-red)',
                      }}>
                        {goalBandCorrect
                          ? `✓ Correct${prediction.is_joker ? ' · joker doubled' : ''}`
                          : predictedGoalBand
                            ? '✗ Missed'
                            : '✗ No prediction made'}
                      </div>
                    )}
                  </div>

                  {completed && (
                    <div style={{
                      marginTop: '8px',
                      padding: '8px 9px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-light)',
                      fontSize: '10px',
                      color: 'var(--text-muted)',
                      lineHeight: 1.4,
                    }}>
                      Actual outcome: {actualWinner
                        ? match.outcome_type === 'penalties' && match.home_score_pens != null && match.away_score_pens != null
                          ? `${actualWinner.flag_emoji || ''} ${actualWinner.short_code || actualWinner.name} win ${match.home_score_pens}–${match.away_score_pens} on penalties`
                          : `${actualWinner.flag_emoji || ''} ${actualWinner.short_code || actualWinner.name} advanced${match.outcome_type === 'et' ? ' after extra time' : ' in 90 minutes'}`
                        : 'Winner not recorded'}
                    </div>
                  )}

                  {completed && breakdown.length > 0 ? (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                      gap: '6px',
                      marginTop: '8px',
                    }}>
                      {breakdown.map(item => (
                        <div key={item.key} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          padding: '7px 9px',
                          borderRadius: 'var(--radius-sm)',
                          background: Number(item.points || 0) > 0
                            ? 'var(--accent-green-light)'
                            : 'var(--bg-card)',
                          border: '1px solid var(--border-light)',
                          fontSize: '10px',
                        }}>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: '750' }}>{item.label}</span>
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontWeight: '900',
                            color: Number(item.points || 0) > 0
                              ? 'var(--accent-green)'
                              : 'var(--text-muted)',
                          }}>
                            {item.points == null
                              ? '—'
                              : String(item.key).toLowerCase().includes('joker')
                                ? `×${item.points}`
                                : Number(item.points) > 0
                                  ? `+${item.points}`
                                  : '0'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : completed ? (
                    <div style={{
                      marginTop: '7px',
                      fontSize: '10px',
                      color: 'var(--text-muted)',
                      lineHeight: 1.4,
                    }}>
                      Total points are confirmed above. A component breakdown was not returned for this saved prediction.
                    </div>
                  ) : null}

                  {isComparing && (
                    <div style={{
                      marginTop: '9px',
                      paddingTop: '9px',
                      borderTop: '1px solid var(--border-light)',
                    }}>
                      <div style={{
                        fontSize: '9px',
                        fontWeight: '900',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '6px',
                      }}>
                        Compared with you
                      </div>

                      {myPrediction ? (
                        <>
                          <div style={{
                            padding: '8px 9px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-light)',
                          }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px',
                            }}>
                              <span style={{ fontSize: '10px', fontWeight: '850', color: 'var(--text-muted)' }}>Your pick</span>
                              {completed && (
                                <span style={{
                                  fontSize: '10px',
                                  fontWeight: '900',
                                  color: Number(myPrediction.points_awarded || 0) > 0
                                    ? 'var(--accent-green)'
                                    : 'var(--text-muted)',
                                }}>
                                  {Number(myPrediction.points_awarded || 0)} pts
                                </span>
                              )}
                            </div>
                            <div style={{
                              marginTop: '3px',
                              fontSize: '11px',
                              fontWeight: '850',
                              color: 'var(--text-primary)',
                              lineHeight: 1.4,
                            }}>
                              {myPrediction.home_score}–{myPrediction.away_score} · {koPredictionDescription(myPrediction, match)}
                              {myPrediction.first_goal_band
                                ? ` · First goal ${KO_GOAL_BAND_LABELS[myPrediction.first_goal_band] || myPrediction.first_goal_band}`
                                : ' · No first-goal pick'}
                              {myPrediction.is_joker ? ' 🃏' : ''}
                            </div>
                          </div>

                          <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '5px',
                            marginTop: '6px',
                          }}>
                            {[
                              { label: 'Score', same: sameScore },
                              { label: 'Advancing team', same: sameWinner },
                              { label: 'Method', same: sameMethod },
                              { label: 'First goal', same: sameGoalBand },
                            ].map(item => (
                              <span key={item.label} style={{
                                padding: '4px 7px',
                                borderRadius: '999px',
                                background: item.same
                                  ? 'var(--accent-green-light)'
                                  : 'var(--bg-card)',
                                border: '1px solid var(--border-light)',
                                color: item.same
                                  ? 'var(--accent-green)'
                                  : 'var(--text-muted)',
                                fontSize: '9px',
                                fontWeight: '850',
                              }}>
                                {item.same ? '✓' : '≠'} {item.label}
                              </span>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          You did not make a prediction for this match.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{
                  marginTop: '8px',
                  paddingTop: '8px',
                  borderTop: '1px solid var(--border-light)',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                }}>
                  No prediction made
                </div>
              )}
            </article>
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
  const [groupOrder, setGroupOrder] = useState('group')
  const tournamentLive = new Date() >= DATES.TOURNAMENT_START

  useEffect(() => {
    setShowOptions(false)
    setCompactRows(false)
    setOnlyScoring(false)
    setGroupOrder('group')
  }, [memberModal?.userId])

  if (!memberModal) return null

  const viewContext = memberModal.viewContext || 'tournament'
  const isKoContext = viewContext === 'ko'
  const tabs = memberModal.isOffline
    ? ['group', 'standings']
    : isKoContext
      ? ['koPredictor']
      : ['overview', 'group', 'standings', 'knockout', 'awards']
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
    if (pred.match?.stage && pred.match.stage !== 'group') return false
    if (!onlyScoring) return true
    return ['exact', 'correct'].includes(getPredResult(pred))
  })
  const predictionsByGroup = visibleGroupPredictions.reduce((acc, pred) => {
    const groupName = pred.match?.group?.name || 'Other'
    if (!acc[groupName]) acc[groupName] = []
    acc[groupName].push(pred)
    return acc
  }, {})
  const predictionsByDate = visibleGroupPredictions.reduce((acc, pred) => {
    const kickoff = pred.match?.kickoff_time ? new Date(pred.match.kickoff_time) : null
    const key = kickoff && !Number.isNaN(kickoff.getTime())
      ? kickoff.toISOString().slice(0, 10)
      : 'unknown'
    if (!acc[key]) acc[key] = []
    acc[key].push(pred)
    return acc
  }, {})
  const formatDateHeading = (key) => {
    if (key === 'unknown') return 'Date not available'
    return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${key}T12:00:00`))
  }

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
      className="member-predictions-backdrop"
      role="presentation"
      style={{ position: 'fixed', inset: 0, background: 'rgba(4,14,31,0.72)', backdropFilter: 'blur(3px)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '12px 12px 0' }}
      onClick={() => setMemberModal(null)}
    >
      <div
        className="member-predictions-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`${memberModal.username} predictions`}
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
        <header style={{ flexShrink: 0, padding: '13px 16px 11px', color: 'white', background: 'linear-gradient(135deg, var(--scottish-navy), #0b356b)', position: 'relative' }}>
          <div style={{ position: 'absolute', right: '12px', top: '10px', display: 'flex', gap: '6px' }}>
            {!isKoContext && <button type="button" onClick={() => setShowOptions(true)} aria-label="View options" style={{ width: '32px', height: '32px', display: 'grid', placeItems: 'center', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.24)', background: 'rgba(255,255,255,0.10)', color: 'white', fontSize: '15px', cursor: 'pointer' }}>⋯</button>}
            <button type="button" onClick={() => setMemberModal(null)} aria-label="Close" style={{ width: '32px', height: '32px', display: 'grid', placeItems: 'center', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.24)', background: 'rgba(255,255,255,0.10)', color: 'white', fontSize: '21px', cursor: 'pointer' }}>×</button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '11px', paddingRight: '76px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0, background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.22)', fontSize: '19px', fontWeight: '900' }}>
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
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '10px', margin: '2px 2px 10px' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '13px', color: 'var(--text-primary)' }}>Group-stage predictions</strong>
                  <span style={{ display: 'block', marginTop: '2px', fontSize: '9px', color: 'var(--text-muted)' }}>{onlyScoring ? 'Only scoring picks shown' : groupOrder === 'group' ? 'Ordered by tournament group' : 'Ordered by match date'}</span>
                </div>
                <div style={{ display: 'flex', padding: '3px', gap: '3px', borderRadius: '10px', background: 'var(--bg-tertiary)' }}>
                  {[
                    { key: 'group', label: 'By group' },
                    { key: 'date', label: 'By date' },
                  ].map(option => (
                    <button key={option.key} type="button" onClick={() => setGroupOrder(option.key)} style={{ padding: '6px 9px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: groupOrder === option.key ? 'var(--bg-card)' : 'transparent', color: groupOrder === option.key ? 'var(--scottish-navy)' : 'var(--text-muted)', fontSize: '9px', fontWeight: '850', boxShadow: groupOrder === option.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>{option.label}</button>
                  ))}
                </div>
              </div>

              {memberPredictions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '34px 18px', color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '14px' }}>
                  <div style={{ fontSize: '30px', marginBottom: '7px' }}>{memberModal.isOffline ? '👤' : '🔒'}</div>
                  <div style={{ fontWeight: '800', marginBottom: '4px' }}>{memberModal.isOffline ? 'No predictions entered yet' : 'Picks are private'}</div>
                  <div style={{ fontSize: '11px' }}>{tournamentLive ? 'This user has chosen to keep their predictions private' : 'Picks become visible once matches kick off'}</div>
                </div>
              ) : visibleGroupPredictions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 18px', color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '800' }}>No group predictions match this filter</div>
                </div>
              ) : groupOrder === 'group' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {Object.entries(predictionsByGroup).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })).map(([groupName, predictions]) => {
                    const orderedPredictions = [...predictions].sort((a, b) => new Date(a.match?.kickoff_time || 0) - new Date(b.match?.kickoff_time || 0))
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
                        {orderedPredictions.map(renderPredictionRow)}
                      </section>
                    )
                  })}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {Object.entries(predictionsByDate).sort(([a], [b]) => a.localeCompare(b)).map(([dateKey, predictions]) => {
                    const dayTotal = predictions.reduce((sum, pred) => sum + Number(pred.points_awarded || 0), 0)
                    return (
                      <section key={dateKey} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '14px', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)' }}>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: '850' }}>{formatDateHeading(dateKey)}</div>
                            <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '1px' }}>{predictions.length} visible predictions</div>
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: '900', fontFamily: 'var(--font-mono)', color: dayTotal > 0 ? 'var(--accent-green)' : 'var(--text-muted)' }}>+{dayTotal}</span>
                        </div>
                        {[...predictions].sort((a, b) => new Date(a.match?.kickoff_time || 0) - new Date(b.match?.kickoff_time || 0)).map(renderPredictionRow)}
                      </section>
                    )
                  })}
                </div>
              )}
            </div>
          ) : activeTab === 'knockout' ? (
            <KnockoutPicksView userId={memberModal.userId} leagueId={memberModal.leagueId} lockedSnapshot={memberModal.lockedSnapshot} />
          ) : activeTab === 'koPredictor' ? (
            <KOPredictorScoresView userId={memberModal.userId} currentUserId={currentUserId} targetName={memberModal.username} />
          ) : activeTab === 'awards' ? (
            <AwardPredsView userId={memberModal.userId} leagueId={memberModal.leagueId} lockedSnapshot={memberModal.lockedSnapshot} />
          ) : activeTab === 'compare' ? (
            <CompareWithMeView myUserId={currentUserId} targetUserId={memberModal.userId} targetName={memberModal.username} leagueId={memberModal.leagueId} lockedSnapshot={memberModal.lockedSnapshot} targetShowFuture={memberModal.targetShowFuture} />
          ) : activeTab === 'standings' ? (
            <div>
              {sectionTitle('Predicted group tables & points', groupPositionBreakdown.length ? 'Predicted finish, actual finish and points awarded' : 'Based on this player’s score predictions')}
              <GroupTablesScoreView predictions={memberPredictions} breakdown={groupPositionBreakdown} totalPoints={groupPts} />
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
