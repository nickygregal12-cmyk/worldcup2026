import { useEffect, useState, useCallback, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuthStore, useAppStore } from '../store/index.js'
import { toApiName, normalise } from '../lib/teamNames.js'
import { ErrorState, SkeletonCard } from '../components/PageState.jsx'
import { StandingsRow, StandingsHeader, StandingsLegend } from '../components/GroupStandingsTable.jsx'
import { calcPredictedStandings, getBest3rdTeams, groupFullyPredicted } from '../lib/bracketUtils.js'

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']
const TOTAL_GROUP_MATCHES = 72 // 12 groups × 6 matches

// ELO-based autofill
const predictScore = (homeRank, awayRank) => {
  const homeStrength = 1 / (homeRank || 20)
  const awayStrength = 1 / (awayRank || 20)
  const total = homeStrength + awayStrength
  const homeWinProb = homeStrength / total
  const adjustedHomeProb = Math.min(0.75, homeWinProb * 1.1)
  const rand = Math.random()
  let result
  if (rand < adjustedHomeProb * 0.7) result = 'home'
  else if (rand < adjustedHomeProb * 0.7 + 0.28) result = 'draw'
  else result = 'away'
  const scoreOptions = {
    home: [[1,0],[2,0],[2,1],[3,0],[3,1],[1,0],[2,0]],
    draw: [[0,0],[1,1],[2,2],[1,1],[0,0]],
    away: [[0,1],[0,2],[1,2],[0,3],[1,2]],
  }
  const scores = scoreOptions[result]
  const [h, a] = scores[Math.floor(Math.random() * scores.length)]
  return { home: h, away: a }
}

const VENUE_FLAGS = {
  'New York/NJ': '🇺🇸', 'Los Angeles': '🇺🇸', 'Dallas': '🇺🇸',
  'Houston': '🇺🇸', 'San Francisco': '🇺🇸', 'Seattle': '🇺🇸',
  'Boston': '🇺🇸', 'Miami': '🇺🇸', 'Atlanta': '🇺🇸',
  'Philadelphia': '🇺🇸', 'Kansas City': '🇺🇸',
  'Toronto': '🇨🇦', 'Vancouver': '🇨🇦',
  'Mexico City': '🇲🇽', 'Guadalajara': '🇲🇽', 'Monterrey': '🇲🇽',
}

// Item 5: Group standings with proper 3rd place logic
// Only show "Possible 3rd" highlight if all 4 teams have played all 3 games
const calcGroupStandings = (matches, predictions) => {
  const teams = {}
  for (const match of matches) {
    const hId = match.home_team_id, aId = match.away_team_id
    if (!teams[hId]) teams[hId] = { team: match.home_team, id: hId, pts: 0, gd: 0, gf: 0, played: 0, h2h: {} }
    if (!teams[aId]) teams[aId] = { team: match.away_team, id: aId, pts: 0, gd: 0, gf: 0, played: 0, h2h: {} }
    const pred = predictions[match.id]
    let hs, as_
    if (match.status === 'completed') { hs = match.home_score; as_ = match.away_score }
    else if (pred?.home !== undefined && pred?.away !== undefined) { hs = Number(pred.home); as_ = Number(pred.away) }
    else continue
    const h = teams[hId], a = teams[aId]
    h.played++; a.played++
    h.gf += hs; h.gd += hs - as_
    a.gf += as_; a.gd += as_ - hs
    if (hs > as_) { h.pts += 3 }
    else if (hs === as_) { h.pts += 1; a.pts += 1 }
    else { a.pts += 3 }
    if (!h.h2h[aId]) h.h2h[aId] = { pts: 0, gd: 0, gf: 0 }
    if (!a.h2h[hId]) a.h2h[hId] = { pts: 0, gd: 0, gf: 0 }
    if (hs > as_) { h.h2h[aId].pts += 3 }
    else if (hs === as_) { h.h2h[aId].pts += 1; a.h2h[hId].pts += 1 }
    else { a.h2h[hId].pts += 3 }
    h.h2h[aId].gd += hs - as_; h.h2h[aId].gf += hs
    a.h2h[hId].gd += as_ - hs; a.h2h[hId].gf += as_
  }
  const sorted = Object.values(teams).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts
    const aH2H = a.h2h[b.id] || { pts: 0, gd: 0, gf: 0 }
    const bH2H = b.h2h[a.id] || { pts: 0, gd: 0, gf: 0 }
    if (bH2H.pts !== aH2H.pts) return bH2H.pts - aH2H.pts
    if (bH2H.gd !== aH2H.gd) return bH2H.gd - aH2H.gd
    if (bH2H.gf !== aH2H.gf) return bH2H.gf - aH2H.gf
    if (b.gd !== a.gd) return b.gd - a.gd
    if (b.gf !== a.gf) return b.gf - a.gf
    return 0
  })
  // Item 5: allGroupMatchesPredicted — only show 3rd place indicator when all 6 games predicted
  const allPredicted = sorted.every(t => t.played === 3)
  return { standings: sorted, allPredicted }
}

// Item 8: Score validation
const isHighScore = (val) => val !== '' && val !== undefined && Number(val) >= 7

function FinalStandingsView({ standings, matches, predictions, appSettings }) {
  const showReal = appSettings?.show_group_tables === 'true' && standings.length > 0
  const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']

  const getPredictedTable = (group) => {
    const gMatches = matches.filter(m => m.group?.name === group)
    const table = {}
    gMatches.forEach(m => {
      if (!table[m.home_team_id]) table[m.home_team_id] = { id: m.home_team_id, name: m.home_team?.short_code, flag: m.home_team?.flag_emoji, pts: 0, gf: 0, ga: 0, played: 0 }
      if (!table[m.away_team_id]) table[m.away_team_id] = { id: m.away_team_id, name: m.away_team?.short_code, flag: m.away_team?.flag_emoji, pts: 0, gf: 0, ga: 0, played: 0 }
    })
    // Use actual scores for completed matches, predictions for upcoming
    gMatches.forEach(m => {
      let h, a
      if (m.status === 'completed' && m.home_score !== null) {
        h = m.home_score; a = m.away_score
      } else {
        const pred = predictions[m.id]
        if (pred?.home === undefined || pred?.home === '') return
        h = parseInt(pred.home); a = parseInt(pred.away)
      }
      table[m.home_team_id].gf += h; table[m.home_team_id].ga += a; table[m.home_team_id].played++
      table[m.away_team_id].gf += a; table[m.away_team_id].ga += h; table[m.away_team_id].played++
      if (h > a) { table[m.home_team_id].pts += 3 }
      else if (h === a) { table[m.home_team_id].pts += 1; table[m.away_team_id].pts += 1 }
      else { table[m.away_team_id].pts += 3 }
    })
    return Object.values(table).sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga))
  }

  const getAccuracy = (group) => {
    const real = standings.filter(s => s.group_name?.includes(group)).sort((a, b) => a.position - b.position)
    const pred = getPredictedTable(group).filter(t => t.played > 0)
    if (!real.length || !pred.length) return null
    let correct = 0
    real.forEach((r, i) => { if (pred[i]?.id === r.team_id) correct++ })
    return { correct, perfect: correct === 4 }
  }

  // thirdPlace: use real standings if available, otherwise predictions-based
  const thirdPlace = showReal
    ? GROUPS.map(g => {
        const gTeams = standings.filter(s => s.group_name?.includes(g)).sort((a, b) => a.position - b.position)
        return gTeams[2] ? { ...gTeams[2], group: g } : null
      }).filter(Boolean).sort((a, b) => b.points - a.points || b.goal_difference - a.goal_difference)
    : GROUPS.map(g => {
        const predTable = getPredictedTable(g)
        if (predTable.length < 3) return null
        const t = predTable[2]
        return { id: t.id, team_name: t.name, team_flag: t.flag, points: t.pts, goal_difference: t.gf - t.ga, group: g, _predicted: true }
      }).filter(Boolean).sort((a, b) => b.points - a.points || b.goal_difference - a.goal_difference)

  // Pre-tournament — show predicted overview
  if (!showReal) {
    // Build predicted 3rd place ranking — include any group with at least 1 prediction
    const pred3rds = GROUPS.map(g => {
      const t = getPredictedTable(g)
      // Need at least 3 teams registered (even with 0 pts) and group has some predictions
      const hasAnyPicks = t.some(team => team.played > 0)
      if (!hasAnyPicks || t.length < 3) return null
      return { ...t[2], group: g }
    }).filter(Boolean).sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga))

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div className="card" style={{ background: 'var(--scottish-navy-light)', border: '1px solid rgba(0,48,135,0.15)', padding: '14px 16px' }}>
          <div style={{ fontWeight: '800', fontSize: '14px', color: 'var(--scottish-navy)', marginBottom: '4px' }}>🔮 Your Predicted Standings — All Groups</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Based on your score picks · <strong style={{ color: 'var(--accent-green)' }}>Green = qualifies top 2</strong> · <strong style={{ color: 'var(--accent-gold)' }}>Gold 🏅 = qualifying 3rd</strong>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', padding: '6px 10px', background: 'rgba(0,48,135,0.06)', borderRadius: 'var(--radius-sm)' }}>
            💡 See your full predicted table for each group in the <strong>Picks tab</strong> — scroll to the bottom of any group's matches
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
          {GROUPS.map(g => {
            const predTable = getPredictedTable(g)
            const hasPicks = predTable.some(t => t.played > 0)
            return (
              <div key={g} className="card" style={{ padding: '12px 14px' }}>
                <div style={{ fontWeight: '800', fontSize: '13px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ background: 'var(--scottish-navy)', color: 'white', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '800', flexShrink: 0 }}>{g}</span>
                  Group {g}
                </div>
                {!hasPicks ? (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No picks yet</div>
                ) : predTable.map((team, i) => {
                  const qualifies3rd = i === 2 && pred3rds.some((t, ri) => t.id === team.id && ri < 8)
                  const rowBg = i < 2 ? 'var(--accent-green-light)' : qualifies3rd ? 'var(--accent-gold-light)' : 'transparent'
                  const textColor = i < 2 ? 'var(--accent-green)' : qualifies3rd ? 'var(--accent-gold)' : 'var(--text-muted)'
                  return (
                    <div key={team.id} style={{
                      display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 5px',
                      borderTop: i > 0 ? '1px solid var(--border-light)' : 'none',
                      borderRadius: 'var(--radius-sm)',
                      background: rowBg,
                      opacity: team.played === 0 ? 0.4 : 1,
                    }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: textColor, width: '12px', flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ fontSize: '14px', lineHeight: 1, flexShrink: 0 }}>{team.flag}</span>
                      <span style={{ fontSize: '12px', flex: 1, color: i < 2 ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: i < 2 ? '700' : '400', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team.name}</span>
                      <span style={{ fontSize: '11px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: textColor, flexShrink: 0 }}>{team.played > 0 ? `${team.pts}pt` : '–'}</span>
                      {qualifies3rd && <span style={{ fontSize: '9px', color: 'var(--accent-gold)', fontWeight: '700', flexShrink: 0 }}>🏅</span>}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
        {/* Predicted best 3rd place */}
        {pred3rds.length > 0 && (
          <div className="card">
            <div style={{ fontWeight: '800', fontSize: '14px', marginBottom: '4px' }}>🏅 Best 3rd Place (Predicted)</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>Top 8 of 12 advance to the Round of 32</div>
            {pred3rds.map((team, i) => (
              <div key={`${team.group}-${i}`} style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 8px',
                borderRadius: 'var(--radius-sm)', marginBottom: '3px',
                background: i < 8 ? 'var(--accent-green-light)' : 'var(--bg-secondary)',
                border: i < 8 ? '1px solid rgba(0,122,51,0.15)' : '1px solid transparent',
              }}>
                <span style={{ fontWeight: '700', fontSize: '11px', width: '16px', color: 'var(--text-muted)', flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontSize: '16px', lineHeight: 1 }}>{team.flag}</span>
                <span style={{ fontSize: '12px', flex: 1, fontWeight: '600' }}>{team.name}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>Grp {team.group}</span>
                <span style={{ fontWeight: '800', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{team.pts}pt</span>
                <span style={{ fontSize: '12px', fontWeight: '700', color: i < 8 ? 'var(--accent-green)' : 'var(--text-muted)', flexShrink: 0 }}>{i < 8 ? '✓' : '✗'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Tournament live — real standings with accuracy
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', padding: '4px 0' }}>
        ✅ = correct position · 5pts each · +10 bonus for perfect group (all 4 correct)
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '10px' }}>
        {GROUPS.map(g => {
          const groupTeams = standings.filter(s => s.group_name?.includes(g)).sort((a, b) => a.position - b.position)
          const predTable = getPredictedTable(g)
          const accuracy = getAccuracy(g)
          if (groupTeams.length === 0) return null
          return (
            <div key={g} className="card" style={{ padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ fontWeight: '800', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ background: 'var(--scottish-navy)', color: 'white', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '800' }}>{g}</span>
                  Group {g}
                </div>
                {accuracy && (
                  <span style={{
                    fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: 'var(--radius-full)',
                    background: accuracy.perfect ? 'var(--accent-green-light)' : accuracy.correct >= 2 ? '#fff3e0' : 'var(--bg-tertiary)',
                    color: accuracy.perfect ? 'var(--accent-green)' : accuracy.correct >= 2 ? '#e65100' : 'var(--text-muted)',
                  }}>
                    {accuracy.perfect ? '🌟 Perfect!' : `${accuracy.correct}/4 · +${accuracy.correct * 5}pts`}
                  </span>
                )}
              </div>
              {groupTeams.map((team, i) => {
                const predTeam = predTable[i]
                const correct = predTeam?.id === team.team_id
                return (
                  <div key={team.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 0', borderTop: i > 0 ? '1px solid var(--border-light)' : 'none' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: team.position <= 2 ? 'var(--accent-green)' : 'var(--text-muted)', width: '14px' }}>{team.position}</span>
                    <span style={{ fontSize: '13px', flex: 1, fontWeight: team.position <= 2 ? '600' : '400' }}>{team.team_name}</span>
                    <span style={{ fontWeight: '800', fontSize: '12px', fontFamily: 'var(--font-mono)', minWidth: '28px', textAlign: 'right' }}>{team.points}pts</span>
                    <span style={{ fontSize: '13px', minWidth: '18px', textAlign: 'center' }}>
                      {predTeam ? (correct ? '✅' : '❌') : '—'}
                    </span>
                  </div>
                )
              })}
              {predTable.length > 0 && (
                <div style={{ marginTop: '5px', paddingTop: '5px', borderTop: '1px solid var(--border-light)', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '4px' }}>
                  <span>Your pick:</span>
                  {predTable.map(t => <span key={t.id}>{t.flag}</span>)}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {thirdPlace.length > 0 && (
        <div className="card">
          <div style={{ fontWeight: '800', fontSize: '14px', marginBottom: '4px' }}>🏅 Best 3rd Place Teams</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Top 8 of 12 advance · No points for predicting these</div>
          {thirdPlace.map((team, i) => (
            <div key={team.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 8px', borderRadius: 'var(--radius-sm)', marginBottom: '3px', background: i < 8 ? 'var(--accent-green-light)' : 'var(--bg-secondary)', border: i < 8 ? '1px solid rgba(0,122,51,0.15)' : 'none' }}>
              <span style={{ fontWeight: '700', fontSize: '11px', width: '16px', color: 'var(--text-muted)' }}>{i + 1}</span>
              <span style={{ fontSize: '13px', flex: 1, fontWeight: '600' }}>{team.team_name}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Grp {team.group}</span>
              <span style={{ fontWeight: '800', fontFamily: 'var(--font-mono)' }}>{team.points}pts</span>
              <span style={{ fontSize: '11px', fontWeight: '700', color: i < 8 ? 'var(--accent-green)' : 'var(--text-muted)' }}>{i < 8 ? '✓' : '✗'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StandingsView({ standings, activeGroup, matches, predictions, appSettings }) {
  const groupStandings = standings.filter(s => {
    const groupLetter = s.group_name?.replace('GROUP_', '').replace('Group ', '')
    return groupLetter === activeGroup
  })

  const allGroupMatches = matches.filter(m => m.group?.name === activeGroup)
  const completedGroupMatches = allGroupMatches.filter(m => m.status === 'completed')
  const showReal = appSettings?.show_group_tables === 'true' && groupStandings.length > 0

  // Pre-tournament: use ALL predicted matches to build table
  // Live: use only completed matches (apples-to-apples with real table)
  const matchesToSimulate = showReal ? completedGroupMatches : allGroupMatches

  const predictedStandings = {}
  allGroupMatches.forEach(match => {
    const homeId = match.home_team_id
    const awayId = match.away_team_id
    if (!predictedStandings[homeId]) predictedStandings[homeId] = { id: homeId, name: match.home_team?.short_code || '?', flag: match.home_team?.flag_emoji || '', pts: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, played: 0 }
    if (!predictedStandings[awayId]) predictedStandings[awayId] = { id: awayId, name: match.away_team?.short_code || '?', flag: match.away_team?.flag_emoji || '', pts: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, played: 0 }
  })

  matchesToSimulate.forEach(match => {
    const pred = predictions[match.id]
    if (pred?.home === undefined || pred?.away === undefined) return
    const h = parseInt(pred.home), a = parseInt(pred.away)
    const homeId = match.home_team_id, awayId = match.away_team_id
    if (!predictedStandings[homeId] || !predictedStandings[awayId]) return
    predictedStandings[homeId].gf += h; predictedStandings[homeId].ga += a; predictedStandings[homeId].played++
    predictedStandings[awayId].gf += a; predictedStandings[awayId].ga += h; predictedStandings[awayId].played++
    if (h > a) { predictedStandings[homeId].pts += 3; predictedStandings[homeId].w++; predictedStandings[awayId].l++ }
    else if (h === a) { predictedStandings[homeId].pts += 1; predictedStandings[awayId].pts += 1; predictedStandings[homeId].d++; predictedStandings[awayId].d++ }
    else { predictedStandings[awayId].pts += 3; predictedStandings[awayId].w++; predictedStandings[homeId].l++ }
  })

  const predTable = Object.values(predictedStandings).sort((a, b) =>
    b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf
  )

  const hasPredictions = predTable.some(t => t.played > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Real standings — only shown once tournament is live */}
      {showReal && (
        <div className="card">
          <div style={{ fontWeight: '800', fontSize: '14px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📊 Live Standings — Group {activeGroup}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>🟢 Top 2 qualify</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ textAlign: 'left', padding: '4px 6px' }}>#</th>
                  <th style={{ textAlign: 'left', padding: '4px 6px' }}>Team</th>
                  <th style={{ textAlign: 'center', padding: '4px 6px' }}>P</th>
                  <th style={{ textAlign: 'center', padding: '4px 6px' }}>W</th>
                  <th style={{ textAlign: 'center', padding: '4px 6px' }}>D</th>
                  <th style={{ textAlign: 'center', padding: '4px 6px' }}>L</th>
                  <th style={{ textAlign: 'center', padding: '4px 6px' }}>GD</th>
                  <th style={{ textAlign: 'center', padding: '4px 6px', fontWeight: '800', color: 'var(--text-primary)' }}>Pts</th>
                </tr>
              </thead>
              <tbody>
                {groupStandings.map((team) => {
                  const qualifies = team.position <= 2
                  return (
                    <tr key={team.id} style={{
                      borderTop: '1px solid var(--border-light)',
                      background: qualifies ? 'rgba(0,122,51,0.05)' : 'transparent',
                    }}>
                      <td style={{ padding: '8px 6px', fontWeight: '700', color: qualifies ? 'var(--accent-green)' : 'var(--text-muted)' }}>{team.position}</td>
                      <td style={{ padding: '8px 6px', fontWeight: '600' }}>{team.team_name}</td>
                      <td style={{ padding: '8px 6px', textAlign: 'center', color: 'var(--text-muted)' }}>{team.played}</td>
                      <td style={{ padding: '8px 6px', textAlign: 'center', color: 'var(--text-muted)' }}>{team.won}</td>
                      <td style={{ padding: '8px 6px', textAlign: 'center', color: 'var(--text-muted)' }}>{team.drawn}</td>
                      <td style={{ padding: '8px 6px', textAlign: 'center', color: 'var(--text-muted)' }}>{team.lost}</td>
                      <td style={{ padding: '8px 6px', textAlign: 'center', color: team.goal_difference > 0 ? 'var(--accent-green)' : team.goal_difference < 0 ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                        {team.goal_difference > 0 ? '+' : ''}{team.goal_difference}
                      </td>
                      <td style={{ padding: '8px 6px', textAlign: 'center', fontWeight: '800', fontSize: '14px' }}>{team.points}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Last synced from live data</div>
        </div>
      )}

      {/* Predicted standings — always shown, prominent pre-tournament */}
      <div className="card" style={{ border: showReal ? '1px solid var(--border-light)' : '1.5px solid var(--scottish-navy)' }}>
        <div style={{ marginBottom: '10px' }}>
          <div style={{ fontWeight: '800', fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🔮 Your Predicted Table</span>
            <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'var(--scottish-navy-light)', color: 'var(--scottish-navy)' }}>Group {activeGroup}</span>
          </div>
          {!showReal && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
              Based on your score picks · Live standings unlock 11 Jun · <strong style={{ color: 'var(--accent-green)' }}>Green = qualifies</strong>
            </div>
          )}
          {showReal && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
              Based on completed matches you predicted · vs Real column shows position difference
            </div>
          )}
        </div>
        {!hasPredictions ? (
          <div style={{ textAlign: 'center', padding: '20px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔮</div>
            Make your Group {activeGroup} picks to see your predicted table
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '600' }}>
                  <th style={{ textAlign: 'left', padding: '4px 6px' }}>#</th>
                  <th style={{ textAlign: 'left', padding: '4px 6px' }}>Team</th>
                  <th style={{ textAlign: 'center', padding: '4px 6px' }}>GD</th>
                  <th style={{ textAlign: 'center', padding: '4px 6px', fontWeight: '800', color: 'var(--text-primary)' }}>Pts</th>
                  {showReal && <th style={{ textAlign: 'center', padding: '4px 6px' }}>vs Real</th>}
                </tr>
              </thead>
              <tbody>
                {predTable.map((team, i) => {
                  const pos = i + 1
                  const qualifies = pos <= 2
                  // Find real position for comparison
                  const realEntry = groupStandings.find(s => s.team_id === team.id)
                  const realPos = realEntry?.position
                  const diff = realPos ? realPos - pos : null

                  return (
                    <tr key={team.id} style={{
                      borderTop: '1px solid var(--border-light)',
                      background: qualifies ? 'rgba(0,122,51,0.05)' : 'transparent',
                    }}>
                      <td style={{ padding: '8px 6px', fontWeight: '700', color: qualifies ? 'var(--accent-green)' : 'var(--text-muted)' }}>{pos}</td>
                      <td style={{ padding: '8px 6px', fontWeight: '600' }}>{team.flag} {team.name}</td>
                      <td style={{ padding: '8px 6px', textAlign: 'center', color: (team.gf - team.ga) > 0 ? 'var(--accent-green)' : (team.gf - team.ga) < 0 ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                        {(team.gf - team.ga) > 0 ? '+' : ''}{team.gf - team.ga}
                      </td>
                      <td style={{ padding: '8px 6px', textAlign: 'center', fontWeight: '800', fontSize: '14px' }}>{team.pts}</td>
                      {showReal && (
                        <td style={{ padding: '8px 6px', textAlign: 'center', fontSize: '12px', fontWeight: '700' }}>
                          {diff === null ? '—' : diff === 0 ? <span style={{ color: 'var(--accent-green)' }}>✅ Match</span>
                            : diff > 0 ? <span style={{ color: 'var(--accent-orange)' }}>▼{Math.abs(diff)}</span>
                            : <span style={{ color: '#e53935' }}>▲{Math.abs(diff)}</span>}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Based on your predicted scores for this group</div>
      </div>

      {/* Recent results */}
      {completedGroupMatches.length > 0 && (
        <div className="card">
          <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '10px' }}>📋 Results — Group {activeGroup}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {completedGroupMatches.map(match => {
              const pred = predictions[match.id]
              const predHome = pred?.home !== undefined ? parseInt(pred.home) : null
              const predAway = pred?.away !== undefined ? parseInt(pred.away) : null
              const exact = predHome === match.home_score && predAway === match.away_score
              const correctResult = predHome !== null && (
                (predHome > predAway && match.home_score > match.away_score) ||
                (predHome === predAway && match.home_score === match.away_score) ||
                (predHome < predAway && match.home_score < match.away_score)
              )
              return (
                <div key={match.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)' }}>
                  <span style={{ fontSize: '14px' }}>{match.home_team?.flag_emoji}</span>
                  <span style={{ fontSize: '12px', fontWeight: '600', flex: 1 }}>{match.home_team?.short_code}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '800', fontSize: '15px', minWidth: '48px', textAlign: 'center' }}>
                    {match.home_score} – {match.away_score}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: '600', flex: 1, textAlign: 'right' }}>{match.away_team?.short_code}</span>
                  <span style={{ fontSize: '14px' }}>{match.away_team?.flag_emoji}</span>
                  <span style={{ fontSize: '12px', marginLeft: '4px' }}>
                    {exact ? '🎯' : correctResult ? '✅' : predHome !== null ? '❌' : '—'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Predictions() {
  const { user, profile, loadProfile } = useAuthStore()
  const { appSettings } = useAppStore()
  const navigate = useNavigate()
  const [activeGroup, setActiveGroup] = useState('A')
  const [viewMode, setViewMode] = useState('group')
  const [activeTab, setActiveTab] = useState('picks') // picks | standings
  const [standings, setStandings] = useState([])
  const [matches, setMatches] = useState([])
  const [predictions, setPredictions] = useState({})
  const [odds, setOdds] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [saving, setSaving] = useState({})
  const [saved, setSaved] = useState({})
  const [jokersRemaining, setJokersRemaining] = useState(8)
  const [autoFilling, setAutoFilling] = useState(false)
  const [autoFillingDate, setAutoFillingDate] = useState(null)
  const [showJokerReminder, setShowJokerReminder] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [scoreWarning, setScoreWarning] = useState(null) // Item 8: {matchId, side, value}
  const [jokerConfirm, setJokerConfirm] = useState(null) // { matchId, currentJoker }

  useEffect(() => {
    loadMatches()
    loadOdds()
    loadStandings()
    if (user) {
      loadPredictions()
      loadFreshJokerCount()
      checkJokerReminder()
    }
  }, [user])

  const location = useLocation()

  // Always fetch joker count fresh from DB — never trust stale persisted profile
  const loadFreshJokerCount = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('jokers_group_remaining')
      .eq('id', user.id)
      .single()
    if (data) setJokersRemaining(data.jokers_group_remaining ?? 8)
  }

  const loadStandings = async () => {
    const { data, error } = await supabase
      .from('group_standings')
      .select('*')
      .order('group_name')
    if (!error) setStandings(data || [])
  }

  // Auto-scroll to first unpredicted match — runs once when matches first load
  const [hasAutoScrolled, setHasAutoScrolled] = useState(false)
  useEffect(() => {
    if (!matches.length || loading || hasAutoScrolled) return
    const firstUnpredicted = matches
      .filter(m => m.group && !isLocked(m.kickoff_time) && predictions[m.id]?.home === undefined)
      .sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time))[0]
    if (firstUnpredicted?.group?.name) {
      setActiveGroup(firstUnpredicted.group.name)
      setViewMode('group')
      setTimeout(() => {
        const el = document.getElementById(`match-${firstUnpredicted.id}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
    }
    setHasAutoScrolled(true)
  }, [matches.length, loading])
  // This picks up admin score changes immediately
  useEffect(() => {
    loadMatches()
  }, [location.key])

  const checkJokerReminder = async () => {
    const lastGroupMatch = new Date('2026-06-28T20:00:00Z')
    const now = new Date()
    const hoursUntilEnd = (lastGroupMatch - now) / (1000 * 60 * 60)
    if (hoursUntilEnd > 0 && hoursUntilEnd < 24 && (profile?.jokers_group_remaining ?? 8) > 0) {
      setShowJokerReminder(true)
    }
  }

  const loadOdds = async () => {
    try {
      const response = await fetch('/.netlify/functions/get-odds')
      if (!response.ok) return
      const data = await response.json()
      const oddsMap = {}
      data.forEach(game => { oddsMap[`${game.home_team}|${game.away_team}`] = game.odds })
      setOdds(oddsMap)
    } catch (e) { console.log('Odds unavailable', e) }
  }

  const loadMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`*, stage, home_team:home_team_id(id,name,flag_emoji,short_code,fifa_ranking), away_team:away_team_id(id,name,flag_emoji,short_code,fifa_ranking), group:group_id(name), venue:venue_id(city,country)`)
        .eq('stage', 'group')
        .order('kickoff_time', { ascending: true })
      if (error) throw error
      setMatches(data || [])
      setLoadError(false)
    } catch (e) {
      console.error('Failed to load matches:', e)
      setLoadError(true)
    } finally { setLoading(false) }
  }

  const loadPredictions = async () => {
    const { data } = await supabase.from('predictions').select('*').eq('user_id', user.id)
    if (data) {
      const predMap = {}
      data.forEach(p => { predMap[p.match_id] = { home: p.home_score, away: p.away_score, joker: p.is_confident } })
      setPredictions(predMap)
    }
  }

  const isLocked = (kickoffTime) => new Date() >= new Date(kickoffTime)

  const saveTimers = useRef({})
  const predictionsRef = useRef(predictions)
  const matchesRef = useRef(matches)
  const userRef = useRef(user)

  useEffect(() => { predictionsRef.current = predictions }, [predictions])
  useEffect(() => { matchesRef.current = matches }, [matches])
  useEffect(() => { userRef.current = user }, [user])

  // Save all dirty predictions when navigating away
  useEffect(() => {
    return () => {
      Object.values(saveTimers.current).forEach(t => clearTimeout(t))
      const currentUser = userRef.current
      if (!currentUser) return
      const dirtyPreds = Object.entries(predictionsRef.current)
        .filter(([, pred]) => pred._dirty && pred.home !== '' && pred.home !== undefined && pred.away !== '' && pred.away !== undefined)
      for (const [matchId, pred] of dirtyPreds) {
        const match = matchesRef.current.find(m => m.id === matchId)
        if (match && !isLocked(match.kickoff_time)) {
          supabase.from('predictions').upsert({
            user_id: currentUser.id,
            match_id: matchId,
            home_score: pred.home,
            away_score: pred.away,
            is_confident: pred.joker ?? false,
            bracket_type: 'main',
          }, { onConflict: 'user_id,match_id,bracket_type' })
        }
      }
    }
  }, [])

  const inputRefs = useRef({}) // store refs to all score inputs

  const handleScoreChange = (matchId, side, value) => {
    // Allow local state update for guests — just skip the DB save below
    const cleaned = value.replace(/[^0-9]/g, '')
    const num = cleaned === '' ? '' : Math.min(99, parseInt(cleaned))
    setPredictions(prev => ({ ...prev, [matchId]: { ...prev[matchId], [side]: num, _dirty: true } }))

    clearTimeout(saveTimers.current[matchId])
    saveTimers.current[matchId] = setTimeout(() => {
      if (!userRef.current) return // guest — local state only, no DB save
      const homeInput = inputRefs.current[`${matchId}-home`]
      const awayInput = inputRefs.current[`${matchId}-away`]
      const homeVal = homeInput ? parseInt(homeInput.value.replace(/[^0-9]/g, '')) : NaN
      const awayVal = awayInput ? parseInt(awayInput.value.replace(/[^0-9]/g, '')) : NaN
      if (isNaN(homeVal) || isNaN(awayVal)) return
      const match = matchesRef.current.find(m => m.id === matchId)
      if (!match || isLocked(match.kickoff_time)) return
      supabase.from('predictions').upsert({
        user_id: userRef.current.id,
        match_id: matchId,
        home_score: homeVal,
        away_score: awayVal,
        is_confident: predictionsRef.current[matchId]?.joker ?? false,
        bracket_type: 'main',
      }, { onConflict: 'user_id,match_id,bracket_type' }).then(({ error }) => {
        if (error) console.error('Save error:', error)
        else {
          setSaved(prev => ({ ...prev, [matchId]: true }))
          setPredictions(prev => ({ ...prev, [matchId]: { ...prev[matchId], _dirty: false } }))
          setTimeout(() => setSaved(prev => ({ ...prev, [matchId]: false })), 2000)
        }
      })
    }, 600)
  }

  const handleScoreBlur = (match, side) => {
    // Read from DOM ref for iOS reliability
    const homeInput = inputRefs.current[`${match.id}-home`]
    const awayInput = inputRefs.current[`${match.id}-away`]
    const homeVal = homeInput ? homeInput.value.replace(/[^0-9]/g, '') : ''
    const awayVal = awayInput ? awayInput.value.replace(/[^0-9]/g, '') : ''

    // Update state with DOM values
    if (homeVal !== '' && awayVal !== '') {
      const h = parseInt(homeVal)
      const a = parseInt(awayVal)
      setPredictions(prev => ({ ...prev, [match.id]: { ...prev[match.id], home: h, away: a } }))

      if (isHighScore(side === 'home' ? h : a)) {
        setScoreWarning({ matchId: match.id, match, side, value: side === 'home' ? h : a })
      } else {
        // Save directly from DOM values
        supabase.from('predictions').upsert({
          user_id: user.id, match_id: match.id,
          home_score: h, away_score: a,
          is_confident: predictions[match.id]?.joker ?? false,
          bracket_type: 'main',
        }, { onConflict: 'user_id,match_id,bracket_type' }).then(({ error }) => {
          if (!error) {
            setSaved(prev => ({ ...prev, [match.id]: true }))
            setTimeout(() => setSaved(prev => ({ ...prev, [match.id]: false })), 2000)
          }
        })
      }
    }
  }

  const handleJoker = async (matchId, currentJoker) => {
    if (!user) return
    const pred = predictions[matchId]
    if (!pred) return
    if (!currentJoker && jokersRemaining <= 0) return
    const newJoker = !currentJoker
    const newRemaining = newJoker ? jokersRemaining - 1 : jokersRemaining + 1
    // Optimistic update
    setPredictions(prev => ({ ...prev, [matchId]: { ...prev[matchId], joker: newJoker } }))
    setJokersRemaining(newRemaining)
    // Save prediction joker flag
    await supabase.from('predictions').upsert({
      user_id: user.id, match_id: matchId,
      home_score: pred.home ?? 0, away_score: pred.away ?? 0,
      is_confident: newJoker, bracket_type: 'main',
    }, { onConflict: 'user_id,match_id,bracket_type' })
    // Save count to DB and refresh store profile so it's never stale
    await supabase.from('profiles').update({ jokers_group_remaining: newRemaining }).eq('id', user.id)
    loadProfile(user.id)
  }

  const savePrediction = async (match, jokerOverride) => {
    if (!user) return
    const pred = predictions[match.id]
    if (pred?.home === '' || pred?.home === undefined || pred?.away === '' || pred?.away === undefined) return
    if (isLocked(match.kickoff_time)) return
    setSaving(prev => ({ ...prev, [match.id]: true }))
    const { error } = await supabase.from('predictions').upsert({
      user_id: user.id, match_id: match.id,
      home_score: pred.home, away_score: pred.away,
      is_confident: jokerOverride ?? pred.joker ?? false,
      bracket_type: 'main',
    }, { onConflict: 'user_id,match_id,bracket_type' })
    setSaving(prev => ({ ...prev, [match.id]: false }))
    if (!error) {
      setSaved(prev => ({ ...prev, [match.id]: true }))
      // Clear dirty flag — prediction is now saved to DB
      setPredictions(prev => ({ ...prev, [match.id]: { ...prev[match.id], _dirty: false } }))
      setTimeout(() => setSaved(prev => ({ ...prev, [match.id]: false })), 2000)
    }
  }

  // Item 2: autofill for By Date view
  const groupMatches = matches.filter(m => m.group?.name === activeGroup && activeGroup !== 'FINAL')

  const autoFillGroup = async () => {
    if (!user || autoFilling) return
    setAutoFilling(true)
    const groupMatchesToFill = matches.filter(m => m.group?.name === activeGroup && !isLocked(m.kickoff_time))
    await runAutofill(groupMatchesToFill)
    setAutoFilling(false)
  }

  const autoFillDate = async (dateMatches) => {
    if (!user) return
    const key = dateMatches[0]?.kickoff_time
    setAutoFillingDate(key)
    const toFill = dateMatches.filter(m => !isLocked(m.kickoff_time))
    await runAutofill(toFill)
    setAutoFillingDate(null)
  }

  const runAutofill = async (matchList) => {
    const newPreds = { ...predictions }
    const updates = []
    for (const match of matchList) {
      const score = predictScore(match.home_team?.fifa_ranking, match.away_team?.fifa_ranking)
      newPreds[match.id] = { ...newPreds[match.id], home: score.home, away: score.away }
      updates.push(supabase.from('predictions').upsert({
        user_id: user.id, match_id: match.id,
        home_score: score.home, away_score: score.away,
        is_confident: newPreds[match.id]?.joker ?? false, bracket_type: 'main',
      }, { onConflict: 'user_id,match_id,bracket_type' }))
    }
    setPredictions(newPreds)
    await Promise.all(updates)
  }

  const formatDate = (time) => new Date(time).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  const formatTime = (time) => new Date(time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const formatDateKey = (time) => new Date(time).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const clearPick = async (matchId) => {
    if (!user) return
    const hadJoker = predictions[matchId]?.joker === true
    setPredictions(prev => { const next = { ...prev }; delete next[matchId]; return next })
    await supabase.from('predictions').delete().eq('match_id', matchId).eq('user_id', user.id)
    if (hadJoker) {
      const newRemaining = jokersRemaining + 1
      setJokersRemaining(newRemaining)
      await supabase.from('profiles').update({ jokers_group_remaining: newRemaining }).eq('id', user.id)
    }
  }

  const clearGroupPredictions = async () => {
    if (!user) return
    const groupMatchIds = groupMatches.map(m => m.id).filter(id => {
      const m = matches.find(m => m.id === id)
      return m && !isLocked(m.kickoff_time)
    })
    const jokersToRefund = groupMatchIds.filter(id => predictions[id]?.joker === true).length
    setPredictions(prev => { const next = { ...prev }; groupMatchIds.forEach(id => delete next[id]); return next })
    await supabase.from('predictions').delete().in('match_id', groupMatchIds).eq('user_id', user.id)
    if (jokersToRefund > 0) {
      const newRemaining = Math.min(8, jokersRemaining + jokersToRefund)
      setJokersRemaining(newRemaining)
      await supabase.from('profiles').update({ jokers_group_remaining: newRemaining }).eq('id', user.id)
    }
    setShowClearConfirm(false)
    loadProfile(user.id)
  }

  const clearAllPredictions = async () => {
    if (!user) return
    const unlockedIds = matches.filter(m => !isLocked(m.kickoff_time)).map(m => m.id)
    const jokersToRefund = unlockedIds.filter(id => predictions[id]?.joker === true).length
    setPredictions(prev => { const next = { ...prev }; unlockedIds.forEach(id => delete next[id]); return next })
    await supabase.from('predictions').delete().in('match_id', unlockedIds).eq('user_id', user.id)
    if (jokersToRefund > 0) {
      const newRemaining = Math.min(8, jokersRemaining + jokersToRefund)
      setJokersRemaining(newRemaining)
      await supabase.from('profiles').update({ jokers_group_remaining: newRemaining }).eq('id', user.id)
    }
    setShowClearConfirm(false)
    loadProfile(user.id)
  }

  const clearDatePredictions = async (dateMatches) => {
    if (!user) return
    const ids = dateMatches.map(m => m.id).filter(id => !isLocked(matches.find(m => m.id === id)?.kickoff_time))
    setPredictions(prev => { const next = { ...prev }; ids.forEach(id => delete next[id]); return next })
    await supabase.from('predictions').delete().in('match_id', ids).eq('user_id', user.id)
    setShowClearConfirm(false)
  }

  const getMatchOdds = (match) => {
    const homeName = match.home_team?.name
    const awayName = match.away_team?.name
    if (!homeName || !awayName) return null
    const key1 = `${homeName}|${awayName}`
    if (odds[key1]) return odds[key1]
    const key2 = `${toApiName(homeName)}|${toApiName(awayName)}`
    if (odds[key2]) return odds[key2]
    const normHome = normalise(homeName), normAway = normalise(awayName)
    for (const key of Object.keys(odds)) {
      const [h, a] = key.split('|')
      if (normalise(h) === normHome && normalise(a) === normAway) return odds[key]
    }
    return null
  }

  const getPredictionCount = () =>
    Object.values(predictions).filter(p => p.home !== undefined && p.home !== '' && p.away !== undefined && p.away !== '').length

  const matchesByDate = matches.reduce((acc, match) => {
    const key = formatDateKey(match.kickoff_time)
    if (!acc[key]) acc[key] = []
    acc[key].push(match)
    return acc
  }, {})

  if (loading) {
    return (
      <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh', padding: '16px' }}>
        <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '16px' }}>
          <SkeletonCard rows={2} /><SkeletonCard rows={4} /><SkeletonCard rows={4} /><SkeletonCard rows={4} />
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>
        <ErrorState message="Couldn't load predictions" onRetry={() => { setLoading(true); setLoadError(false); loadMatches() }} />
      </div>
    )
  }

  // Item 7: colour coding for completed match result vs prediction
  const getResultColour = (match, pred) => {
    if ((!match.home_score && match.home_score !== 0) || pred?.home === undefined) return null
    const predHome = Number(pred.home), predAway = Number(pred.away)
    const actHome = match.home_score, actAway = match.away_score
    if (predHome === actHome && predAway === actAway) return 'gold'   // exact score
    const predResult = predHome > predAway ? 'H' : predHome < predAway ? 'A' : 'D'
    const actResult  = actHome  > actAway  ? 'H' : actHome  < actAway  ? 'A' : 'D'
    if (predResult === actResult) return 'green'  // correct result
    return 'red' // wrong
  }

  const renderMatch = (match) => {
    const pred = predictions[match.id] || {}
    const locked = isLocked(match.kickoff_time)
    const isSaving = saving[match.id]
    const isSaved = saved[match.id]
    const matchOdds = getMatchOdds(match)
    const hasPrediction = pred.home !== undefined && pred.home !== ''
    const isGuest = !user
    const hasJoker = pred.joker === true
    const canUseJoker = !locked && user && hasPrediction && (jokersRemaining > 0 || hasJoker)
    const resultColour = getResultColour(match, pred)

    const getFavourite = () => {
      if (!matchOdds) return null
      const homeD = matchOdds.home_decimal || 99, drawD = matchOdds.draw_decimal || 99, awayD = matchOdds.away_decimal || 99
      const minOdds = Math.min(homeD, drawD, awayD)
      if (homeD === minOdds) return 'home'
      if (awayD === minOdds) return 'away'
      return 'draw'
    }
    const favourite = getFavourite()

    // Card border & background based on state
    const cardBorderColor = resultColour === 'gold' ? 'var(--accent-gold)'
      : resultColour === 'green' ? 'var(--accent-green)'
      : resultColour === 'red'  ? 'var(--accent-red)'
      : hasJoker      ? 'var(--accent-gold)'
      : hasPrediction ? 'var(--accent-green)'
      : 'var(--border-light)'

    const cardBorderWidth = resultColour || hasJoker || hasPrediction ? '2px' : '1.5px'

    const cardBg = resultColour === 'gold' ? 'var(--accent-gold-light)'
      : resultColour === 'green' ? 'var(--accent-green-light)'
      : resultColour === 'red'   ? 'var(--accent-red-light)'
      : hasJoker ? 'var(--accent-gold-light)'
      : 'var(--bg-card)'

    // Left accent strip colour
    const accentColor = resultColour === 'gold' ? 'var(--accent-gold)'
      : resultColour === 'green' ? 'var(--accent-green)'
      : resultColour === 'red'   ? 'var(--accent-red)'
      : hasJoker      ? 'var(--accent-gold)'
      : hasPrediction ? 'var(--accent-green)'
      : 'transparent'

    return (
      <div key={match.id} id={`match-${match.id}`} style={{
        background: cardBg,
        border: `${cardBorderWidth} solid ${cardBorderColor}`,
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        opacity: locked && !hasPrediction ? 0.65 : 1,
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
      }}>

        {/* Coloured top accent strip */}
        <div style={{ height: '4px', background: accentColor, flexShrink: 0 }} />

        <div style={{ padding: '16px 18px 18px' }}>

          {/* Result badge */}
          {resultColour && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '14px', padding: '10px 14px', borderRadius: 'var(--radius-md)',
              background: resultColour === 'gold' ? 'rgba(184,134,11,0.12)' : resultColour === 'green' ? 'rgba(0,122,51,0.1)' : 'rgba(198,40,40,0.08)',
              border: `1px solid ${resultColour === 'gold' ? 'rgba(184,134,11,0.35)' : resultColour === 'green' ? 'rgba(0,122,51,0.25)' : 'rgba(198,40,40,0.2)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '22px' }}>
                  {resultColour === 'gold' ? '🎯' : resultColour === 'green' ? '✅' : '❌'}
                </span>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '14px',
                    color: resultColour === 'gold' ? 'var(--accent-gold)' : resultColour === 'green' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                    {resultColour === 'gold' ? 'Exact score!' : resultColour === 'green' ? 'Correct result' : 'Wrong result'}
                    {hasJoker && <span style={{ marginLeft: '6px', fontSize: '12px' }}>🃏</span>}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Result: <strong style={{ fontFamily: 'var(--font-mono)' }}>{match.home_team?.short_code} {match.home_score}–{match.away_score} {match.away_team?.short_code}</strong>
                  </div>
                </div>
              </div>
              <div style={{ fontWeight: '900', fontSize: '24px', fontFamily: 'var(--font-mono)', lineHeight: 1,
                color: resultColour === 'gold' ? 'var(--accent-gold)' : resultColour === 'green' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                {pred.points_awarded !== undefined ? `+${pred.points_awarded}` : resultColour === 'gold' ? '+10' : resultColour === 'green' ? '+5' : '+0'}
                <span style={{ fontSize: '11px', fontWeight: '600' }}>pts</span>
              </div>
            </div>
          )}

          {/* Joker indicator (non-completed) */}
          {hasJoker && !resultColour && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', padding: '7px 12px', background: 'rgba(184,134,11,0.1)', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: '700', color: 'var(--accent-gold)', border: '1px solid rgba(184,134,11,0.2)' }}>
              🃏 Joker applied — 2× points if correct!
            </div>
          )}

          {/* Match meta row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1.4 }}>
              {match.match_number && <span>M{match.match_number} · </span>}
              {viewMode === 'date'
                ? `Grp ${match.group?.name} · ${formatTime(match.kickoff_time)}`
                : `${formatDate(match.kickoff_time)} · ${formatTime(match.kickoff_time)}`}
              {match.venue?.city && <span> · {match.venue.city} {VENUE_FLAGS[match.venue.city] || ''}</span>}
            </div>
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              {locked && <span className="badge badge-red">🔒 Locked</span>}
              {!locked && hasPrediction && !hasJoker && <span className="badge badge-green">✓ Saved</span>}
              {(match.home_score !== null && match.home_score !== undefined) && (
                <span className="badge badge-gray">{match.home_score}–{match.away_score}</span>
              )}
            </div>
          </div>

          {/* Teams + score inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '10px', marginBottom: matchOdds && !locked && !resultColour ? '12px' : '0' }}>
            {/* Home team */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '42px', lineHeight: 1 }}>{match.home_team?.flag_emoji}</span>
              <span style={{ fontWeight: '800', fontSize: '14px', textAlign: 'center', letterSpacing: '-0.01em' }}>{match.home_team?.name}</span>
              {favourite === 'home' && matchOdds && <span style={{ fontSize: '10px', color: 'var(--accent-green)', fontWeight: '700', letterSpacing: '0.02em' }}>⭐ FAV</span>}
            </div>

            {/* Score area */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {resultColour ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '58px', height: '58px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', fontWeight: '900', fontFamily: 'var(--font-mono)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '2px solid var(--border-light)' }}>
                    {pred.home}
                  </div>
                  <span style={{ fontSize: '20px', color: 'var(--text-muted)', fontWeight: '300' }}>–</span>
                  <div style={{ width: '58px', height: '58px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', fontWeight: '900', fontFamily: 'var(--font-mono)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '2px solid var(--border-light)' }}>
                    {pred.away}
                  </div>
                </div>
              ) : (
                <>
                  <input type="text" inputMode="numeric" pattern="[0-9]*" className="score-input"
                    ref={el => { if (el) inputRefs.current[`${match.id}-home`] = el }}
                    value={pred.home ?? ''}
                    onChange={e => handleScoreChange(match.id, 'home', e.target.value)}
                    onInput={e => handleScoreChange(match.id, 'home', e.target.value)}
                    onBlur={() => handleScoreBlur(match, 'home')}
                    disabled={locked} placeholder="?"
                  />
                  <span style={{ fontSize: '20px', color: 'var(--text-muted)', fontWeight: '300', fontFamily: 'var(--font-mono)' }}>–</span>
                  <input type="text" inputMode="numeric" pattern="[0-9]*" className="score-input"
                    ref={el => { if (el) inputRefs.current[`${match.id}-away`] = el }}
                    value={pred.away ?? ''}
                    onChange={e => handleScoreChange(match.id, 'away', e.target.value)}
                    onInput={e => handleScoreChange(match.id, 'away', e.target.value)}
                    onBlur={() => handleScoreBlur(match, 'away')}
                    disabled={locked} placeholder="?"
                  />
                </>
              )}
            </div>

            {/* Away team */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '42px', lineHeight: 1 }}>{match.away_team?.flag_emoji}</span>
              <span style={{ fontWeight: '800', fontSize: '14px', textAlign: 'center', letterSpacing: '-0.01em' }}>{match.away_team?.name}</span>
              {favourite === 'away' && matchOdds && <span style={{ fontSize: '10px', color: 'var(--accent-green)', fontWeight: '700', letterSpacing: '0.02em' }}>⭐ FAV</span>}
            </div>
          </div>

          {/* Odds */}
          {matchOdds && !locked && !resultColour && (
            <div className="odds-row">
              <div className={`odds-item ${favourite === 'home' ? 'odds-favourite' : ''}`}>
                <span className="odds-label">{match.home_team?.short_code}</span>
                <span className="odds-value">{matchOdds.home}</span>
              </div>
              <div className={`odds-item ${favourite === 'draw' ? 'odds-favourite' : ''}`}>
                <span className="odds-label">Draw</span>
                <span className="odds-value">{matchOdds.draw}</span>
              </div>
              <div className={`odds-item ${favourite === 'away' ? 'odds-favourite' : ''}`}>
                <span className="odds-label">{match.away_team?.short_code}</span>
                <span className="odds-value">{matchOdds.away}</span>
              </div>
            </div>
          )}

          {/* Guest — no per-card CTA, handled by sticky banner */}

          {/* Joker + Clear + Save */}
          {!isGuest && !locked && !resultColour && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '14px', borderTop: `1px solid ${hasJoker ? 'rgba(184,134,11,0.25)' : 'var(--border-light)'}` }}>
              <button
                onClick={() => {
                  if (!hasPrediction || !canUseJoker) return
                  if (!hasJoker) {
                    setJokerConfirm({ matchId: match.id, currentJoker: hasJoker })
                  } else {
                    handleJoker(match.id, hasJoker)
                  }
                }}
                disabled={!hasPrediction || (!canUseJoker && !hasJoker)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '8px 14px', borderRadius: 'var(--radius-full)',
                  fontSize: '13px', fontWeight: '700',
                  background: hasJoker ? 'var(--accent-gold)' : 'var(--bg-tertiary)',
                  color: hasJoker ? 'white' : jokersRemaining > 0 ? 'var(--text-secondary)' : 'var(--text-muted)',
                  border: hasJoker ? '1px solid var(--accent-gold)' : '1px solid var(--border-light)',
                  transition: 'all 0.15s',
                  cursor: hasPrediction && (canUseJoker || hasJoker) ? 'pointer' : 'not-allowed',
                  opacity: !hasPrediction ? 0.45 : 1,
                }}
              >
                🃏 {hasJoker ? 'Joker ON' : 'Joker'}
              </button>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {hasPrediction && (
                  <button
                    onClick={() => clearPick(match.id)}
                    style={{
                      padding: '8px 14px', borderRadius: 'var(--radius-full)',
                      fontSize: '13px', fontWeight: '600',
                      border: '1px solid var(--border-medium)',
                      background: 'var(--bg-tertiary)', color: 'var(--text-muted)', cursor: 'pointer',
                    }}
                  >Clear</button>
                )}
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    const homeInput = inputRefs.current[`${match.id}-home`]
                    const awayInput = inputRefs.current[`${match.id}-away`]
                    const homeVal = homeInput ? parseInt(homeInput.value.replace(/[^0-9]/g, '')) : NaN
                    const awayVal = awayInput ? parseInt(awayInput.value.replace(/[^0-9]/g, '')) : NaN
                    if (!isNaN(homeVal) && !isNaN(awayVal)) {
                      setPredictions(prev => ({ ...prev, [match.id]: { ...prev[match.id], home: homeVal, away: awayVal } }))
                      supabase.from('predictions').upsert({
                        user_id: user.id, match_id: match.id,
                        home_score: homeVal, away_score: awayVal,
                        is_confident: pred.joker ?? false, bracket_type: 'main',
                      }, { onConflict: 'user_id,match_id,bracket_type' }).then(({ error }) => {
                        if (!error) {
                          setSaved(prev => ({ ...prev, [match.id]: true }))
                          setTimeout(() => setSaved(prev => ({ ...prev, [match.id]: false })), 2000)
                        } else console.error('Save error:', error)
                      })
                    } else {
                      savePrediction(match)
                    }
                  }}
                  disabled={isSaving}
                  className={`btn btn-sm ${isSaved ? 'btn-save-success' : 'btn-save'}`}
                  style={{ minWidth: '80px', borderRadius: 'var(--radius-full)' }}
                >
                  {isSaving
                    ? <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
                    : isSaved ? '✓ Saved' : 'Save'}
                </button>
              </div>
            </div>
          )}

          {/* Points summary after result */}
          {(match.home_score !== null && match.home_score !== undefined) && hasPrediction && (
            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-muted)' }}>
                Your pick: <strong style={{ fontFamily: 'var(--font-mono)' }}>{pred.home}–{pred.away}</strong>
                {hasJoker && <span style={{ marginLeft: '6px', color: 'var(--accent-gold)' }}>🃏</span>}
              </span>
              <span style={{ fontWeight: '700', color: 'var(--accent-green)' }}>+{predictions[match.id]?.points_total || 0} pts</span>
            </div>
          )}

        </div>
      </div>
    )
  }

  // Single group standings (By Group view)

  const renderGroupStandings = () => {
    if (groupMatches.length === 0) return null
    const { standings, allPredicted } = calcGroupStandings(groupMatches, predictions)
    const hasPreds = standings.some(s => s.played > 0)
    if (!hasPreds) return null

    const hasFairPlayTie = allPredicted && standings.some((s, i) => {
      if (i === 0) return false
      const prev = standings[i - 1]
      return s.pts === prev.pts && s.gd === prev.gd && s.gf === prev.gf
    })

    // Work out where this group's 3rd place team ranks among all groups
    const allStandings = calcPredictedStandings(matches, predictions)
    const best3rd = getBest3rdTeams(allStandings) || []
    const best3rdIds = new Set(best3rd.slice(0, 8).map(t => t?.id).filter(Boolean))
    const this3rd = standings[2]
    const this3rdRank = best3rd.findIndex(t => t?.id === this3rd?.id) + 1
    const this3rdQualifies = best3rdIds.has(this3rd?.id)
    const groupsWithPreds = Object.values(allStandings).filter(teams => teams.some(t => t.played > 0)).length

    return (
      <div className="card" style={{ marginTop: '4px' }}>
        <div style={{ marginBottom: '10px' }}>
          <div style={{ fontWeight: '800', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🔮 Your Predicted Standings</span>
            <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'var(--scottish-navy-light)', color: 'var(--scottish-navy)' }}>Group {activeGroup}</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
            Based on your score picks · not live data
          </div>
        </div>
        {hasFairPlayTie && (
          <div style={{ marginBottom: '8px', padding: '6px 10px', background: 'var(--accent-gold-light)', borderRadius: 'var(--radius-sm)', fontSize: '11px', color: 'var(--accent-gold)', fontWeight: '600' }}>
            ⚠️ Teams are level on all criteria — FIFA would use fair play points or a draw of lots. You may want to adjust your predictions.
          </div>
        )}
        <StandingsHeader />
        {standings.map((entry, i) => (
          <StandingsRow
            key={entry.id}
            entry={entry}
            position={i + 1}
            qualifies={i < 2}
            qualifies3rd={i === 2 && allPredicted && this3rdQualifies}
          />
        ))}
        {/* 3rd place context across all groups */}
        {allPredicted && this3rd && groupsWithPreds > 1 && (
          <div style={{
            marginTop: '8px', padding: '7px 10px',
            background: this3rdQualifies ? 'var(--accent-gold-light)' : 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-sm)', fontSize: '11px', fontWeight: '600',
            color: this3rdQualifies ? '#b8860b' : 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            border: this3rdQualifies ? '1px solid rgba(184,134,11,0.3)' : '1px solid var(--border-light)',
          }}>
            <span>
              {this3rd.team?.flag_emoji} {this3rd.team?.short_code} · {this3rdRank > 0 ? `${this3rdRank}${['st','nd','rd'][this3rdRank-1]||'th'} best 3rd` : 'unranked'} of {groupsWithPreds} groups
            </span>
            <span style={{ fontWeight: '800' }}>
              {this3rdQualifies ? '🏅 On track' : 'Needs improvement'}
            </span>
          </div>
        )}
        {allPredicted && this3rd && groupsWithPreds <= 1 && (
          <StandingsLegend allPredicted={allPredicted} />
        )}
        {!allPredicted && (
          <StandingsLegend allPredicted={false} />
        )}
      </div>
    )
  }

  // All-groups standings (By Date view)
  const renderAllGroupsStandings = () => {
    const allStandings = calcPredictedStandings(matches, predictions)
    const hasPreds = Object.values(allStandings).some(teams => teams.some(t => t.played > 0))
    if (!hasPreds) return null

    const best3rd = getBest3rdTeams(allStandings) || []
    const best3rdIds = new Set(best3rd.map(t => t?.id).filter(Boolean))
    const allGroupsComplete = Object.keys(allStandings).every(g => groupFullyPredicted(g, matches, predictions))

    return (
      <div style={{ marginTop: '32px' }}>
        <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: '4px' }}>📊 All Group Standings</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Based on your predictions across all groups
        </div>

        <div className="group-grid">
          {Object.entries(allStandings).sort(([a], [b]) => a.localeCompare(b)).map(([group, teams]) => {
            const groupComplete = groupFullyPredicted(group, matches, predictions)
            const hasPred = teams.some(t => t.played > 0)
            if (!hasPred) return null
            return (
              <div key={group} className="card" style={{ padding: '12px' }}>
                <div style={{ fontWeight: '800', fontSize: '13px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ background: 'var(--primary)', color: 'var(--text-inverse)', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', flexShrink: 0 }}>
                    {group}
                  </span>
                  Group {group}
                </div>
                <StandingsHeader />
                {teams.map((entry, i) => (
                  <StandingsRow
                    key={entry.id}
                    entry={entry}
                    position={i + 1}
                    qualifies={i < 2}
                    qualifies3rd={i === 2 && groupComplete && best3rdIds.has(entry.id)}
                  />
                ))}
                <StandingsLegend allPredicted={groupComplete} />
              </div>
            )
          })}
        </div>

        {/* Best 3rd place summary */}
        {best3rd.length > 0 && (
          <div className="card" style={{ marginTop: '16px' }}>
            <div style={{ fontWeight: '800', fontSize: '13px', marginBottom: '4px' }}>🏅 Best 3rd Place Teams</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
              Top 8 of 12 third-place teams advance to the Round of 32
              {!allGroupsComplete && <span style={{ fontStyle: 'italic' }}> · predict all groups to see final ranking</span>}
            </div>
            <StandingsHeader />
            {best3rd.map((entry, i) => (
              <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: 'var(--radius-sm)', marginBottom: '2px', background: i < 8 ? 'var(--accent-green-light)' : 'var(--bg-secondary)', border: i < 8 ? '1px solid rgba(0,122,51,0.15)' : '1px solid transparent' }}>
                <span style={{ width: '16px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>{i + 1}</span>
                <span style={{ fontSize: '18px' }}>{entry.team?.flag_emoji}</span>
                <span style={{ flex: 1, fontSize: '12px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.team?.short_code || entry.team?.name}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', marginRight: '4px' }}>Grp {entry.group}</span>
                <span style={{ width: '16px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{entry.played ?? '–'}</span>
                <span style={{ width: '28px', fontSize: '15px', fontWeight: '900', fontFamily: 'var(--font-mono)', textAlign: 'center', color: 'var(--text-primary)' }}>{entry.pts}</span>
                <span style={{ width: '30px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{entry.gd > 0 ? '+' : ''}{entry.gd}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>

      {/* Item 8: Score warning modal */}
      {scoreWarning && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ maxWidth: '320px', width: '100%' }}>
            <div style={{ fontWeight: '800', fontSize: '16px', marginBottom: '8px' }}>⚠️ High score entered</div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              You've entered <strong>{scoreWarning.value}</strong> goals — are you sure? That's unusually high for a World Cup match.
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => { setScoreWarning(null); savePrediction(scoreWarning.match) }}
                className="btn btn-primary" style={{ flex: 1 }}
              >Yes, save it</button>
              <button
                onClick={() => {
                  handleScoreChange(scoreWarning.matchId, scoreWarning.side, '')
                  setScoreWarning(null)
                }}
                className="btn btn-secondary" style={{ flex: 1 }}
              >Change it</button>
            </div>
          </div>
        </div>
      )}

      {/* Joker reminder */}
      {showJokerReminder && user && jokersRemaining > 0 && (
        <div style={{ background: 'linear-gradient(135deg, #b8860b, #ffd700)', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ color: 'white', fontSize: '13px', fontWeight: '600' }}>
            ⚠️ Group stage ends in less than 24hrs! You have <strong>{jokersRemaining} joker{jokersRemaining > 1 ? 's' : ''}</strong> left — use them!
          </div>
          <button onClick={() => setShowJokerReminder(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px' }}>✕</button>
        </div>
      )}

      {/* Guest banner — friendly, not a wall */}
      {!user && (
        <div style={{ background: 'var(--scottish-navy)', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ color: 'white', fontSize: '13px', lineHeight: 1.4 }}>
            <span style={{ fontWeight: '700' }}>👋 Try it out!</span>
            <span style={{ color: 'rgba(255,255,255,0.65)', marginLeft: '6px' }}>Picks are local only — join to save & compete</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <Link to="/register" className="btn btn-green btn-sm">Join free</Link>
            <Link to="/login" className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>Sign in</Link>
          </div>
        </div>
      )}

      {/* Sticky header */}
      <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)', position: 'sticky', top: 'var(--nav-height)', zIndex: 50, boxShadow: 'var(--shadow-sm)' }}>
        <div className="container">

          {/* Title row — centred */}
          <div style={{ textAlign: 'center', padding: '14px 0 0', position: 'relative' }}>
            <h1 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              ⚽ Group Predictions
            </h1>
            {user && (() => {
              const count = getPredictionCount()
              const total = matches.length || 72
              const pct = Math.round((count / total) * 100)
              const complete = count === total
              const barColor = complete ? 'var(--accent-green)' : count < 24 ? 'var(--accent-red)' : count < total ? '#f59e0b' : 'var(--accent-green)'
              return (
                <div style={{ marginTop: '8px' }}>
                  {/* Progress bar */}
                  <div style={{ height: '5px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', overflow: 'hidden', margin: '0 4px 6px' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`,
                      background: barColor,
                      borderRadius: 'var(--radius-full)',
                      transition: 'width 0.5s ease, background 0.3s ease',
                      boxShadow: complete ? `0 0 6px ${barColor}` : 'none',
                    }} />
                  </div>
                  {/* Subtitle */}
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{ color: complete ? 'var(--accent-green)' : 'var(--text-primary)', fontWeight: '700' }}>
                      {count}/{total} {complete ? '✓ complete' : 'picks'}
                    </span>
                    <span style={{ color: 'var(--border-medium)' }}>·</span>
                    <span style={{ color: jokersRemaining <= 2 ? 'var(--accent-red)' : 'var(--accent-gold)', fontWeight: '700' }}>
                      🃏 {jokersRemaining} joker{jokersRemaining !== 1 ? 's' : ''} left
                    </span>
                  </div>
                </div>
              )
            })()}
            {/* Picks / Tables switcher */}
            {appSettings?.show_group_tables === 'true' && (
              <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center' }}>
                <div className="pill-tabs" style={{ display: 'inline-flex', padding: '3px' }}>
                  {[{ key: 'picks', label: '⚽ Picks' }, { key: 'standings', label: '📊 Tables' }].map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`pill-tab ${activeTab === tab.key ? 'active' : ''}`} style={{ fontSize: '13px', padding: '7px 16px' }}>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* ? help link */}
            <Link to="/how-to-play" style={{ position: 'absolute', right: 0, top: '14px', width: '26px', height: '26px', borderRadius: '50%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-medium)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textDecoration: 'none' }}>?</Link>
          </div>

          {/* Row 2: Group / Date tabs */}
          <div style={{ display: 'flex', overflowX: 'auto', marginTop: '6px', borderBottom: '1px solid var(--border-light)', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>

            {viewMode === 'group' ? (
              <>
                {/* By Date switcher */}
                <button onClick={() => setViewMode('date')} style={{
                  padding: '10px 12px', fontSize: '12px', fontWeight: '600',
                  color: 'var(--text-muted)', borderBottom: '2px solid transparent',
                  background: 'none', border: 'none', borderBottom: '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                }}>
                  📅 By Date
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '500' }}>All groups</span>
                </button>
                <div style={{ width: '1px', background: 'var(--border-light)', margin: '8px 4px', flexShrink: 0 }} />
                {GROUPS.map(g => {
                  const gMatches = matches.filter(m => m.group?.name === g)
                  const gDone = gMatches.filter(m => predictions[m.id]?.home !== undefined && predictions[m.id]?.home !== '').length
                  const gComplete = gDone === gMatches.length && gMatches.length > 0
                  const isActive = activeGroup === g
                  return (
                    <button key={g} onClick={() => setActiveGroup(g)} style={{
                      padding: '10px 11px', fontSize: '12px', fontWeight: isActive ? '800' : '500',
                      color: isActive ? 'var(--scottish-navy)' : 'var(--text-muted)',
                      borderBottom: isActive ? '2px solid var(--scottish-navy)' : '2px solid transparent',
                      background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                    }}>
                      {g}
                      <span style={{ fontSize: '9px', color: gComplete ? 'var(--accent-green)' : 'var(--text-muted)', fontWeight: '700' }}>
                        {gComplete ? '✓' : `${gDone}/${gMatches.length}`}
                      </span>
                    </button>
                  )
                })}
                {user && (
                  <button onClick={() => setShowClearConfirm('group')} style={{
                    padding: '10px 10px', fontSize: '11px', color: 'var(--text-muted)',
                    background: 'none', border: 'none', borderBottom: '2px solid transparent',
                    cursor: 'pointer', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                    opacity: 0.6,
                  }}>🗑️<span style={{ fontSize: '9px', fontWeight: '600' }}>Clear</span>
                  </button>
                )}
                <div style={{ width: '1px', background: 'var(--border-light)', margin: '8px 4px', flexShrink: 0 }} />
                <button onClick={() => setActiveGroup('FINAL')} style={{
                  padding: '10px 12px', fontSize: '12px', fontWeight: activeGroup === 'FINAL' ? '800' : '500',
                  color: activeGroup === 'FINAL' ? 'var(--scottish-navy)' : 'var(--text-muted)',
                  borderBottom: activeGroup === 'FINAL' ? '2px solid var(--scottish-navy)' : '2px solid transparent',
                  background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                }}>
                  🌍
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '700' }}>Overview</span>
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setViewMode('group')} style={{
                  padding: '10px 14px', fontSize: '12px', fontWeight: '400',
                  color: 'var(--text-muted)', borderBottom: '2px solid transparent',
                  background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                }}>
                  By Group
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>A – L</span>
                </button>
                <div style={{ width: '1px', background: 'var(--border-light)', margin: '8px 2px', flexShrink: 0 }} />
                {Object.entries(matchesByDate).map(([dateKey, dayMatches]) => {
                  const firstMatch = dayMatches[0]
                  const shortDate = new Date(firstMatch.kickoff_time).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
                  const donePreds = dayMatches.filter(m => predictions[m.id]?.home !== undefined && predictions[m.id]?.home !== '').length
                  const complete = donePreds === dayMatches.length
                  return (
                    <button key={dateKey} onClick={() => {
                      const el = document.getElementById(`date-${dateKey.replace(/[^a-z0-9]/gi, '-')}`)
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }} style={{
                      padding: '10px 12px', fontSize: '11px', fontWeight: '500',
                      color: 'var(--text-muted)', borderBottom: '2px solid transparent',
                      background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                    }}>
                      {shortDate}
                      <span style={{ fontSize: '10px', color: complete ? 'var(--accent-green)' : 'var(--text-muted)', fontWeight: '600' }}>
                        {complete ? '✓' : `${donePreds}/${dayMatches.length}`}
                      </span>
                    </button>
                  )
                })}
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }`}</style>

      {/* Matches / Standings */}
      <div className="container" style={{ padding: '16px' }}>
        {activeTab === 'standings' ? (
          activeGroup === 'FINAL' ? (
            <FinalStandingsView standings={standings} matches={matches} predictions={predictions} appSettings={appSettings} />
          ) : (
          <StandingsView
            standings={standings}
            activeGroup={activeGroup}
            matches={matches}
            predictions={predictions}
            appSettings={appSettings}
          />
          )
        ) : activeGroup === 'FINAL' ? (
          <FinalStandingsView standings={standings} matches={matches} predictions={predictions} appSettings={appSettings} />
        ) : viewMode === 'group' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {groupMatches.map(renderMatch)}
            {groupMatches.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">⚽</div>
                <div className="empty-state-title">No matches in Group {activeGroup}</div>
              </div>
            )}
            {renderGroupStandings()}
            {/* Next group prompt */}
            {groupMatches.length > 0 && (() => {
              const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']
              const currentIdx = GROUPS.indexOf(activeGroup)
              // Find next group with unpredicted matches
              const nextGroup = GROUPS.slice(currentIdx + 1).find(g => {
                const gMatches = matches.filter(m => m.group?.name === g && !isLocked(m.kickoff_time))
                return gMatches.some(m => predictions[m.id]?.home === undefined)
              })
              if (!nextGroup) return null
              return (
                <button onClick={() => setActiveGroup(nextGroup)} style={{
                  background: 'none', border: '1px dashed var(--border-medium)',
                  borderRadius: 'var(--radius-md)', padding: '12px',
                  cursor: 'pointer', color: 'var(--text-muted)', fontSize: '13px',
                  fontWeight: '600', width: '100%', textAlign: 'center',
                }}>
                  Next unpredicted → Group {nextGroup}
                </button>
              )
            })()}
          </div>
        ) : (
          // By Date view — Overview tab check first
          activeGroup === 'FINAL' ? (
            <FinalStandingsView standings={standings} matches={matches} predictions={predictions} appSettings={appSettings} />
          ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {Object.entries(matchesByDate).map(([date, dayMatches]) => {
              const hasUnlocked = dayMatches.some(m => !isLocked(m.kickoff_time))
              const hasPreds = dayMatches.some(m => predictions[m.id])
              const isFillingThis = autoFillingDate === dayMatches[0]?.kickoff_time
              return (
                <div key={date} id={`date-${date.replace(/[^a-z0-9]/gi, '-')}`}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-light)' }} />
                    <span>{date}</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-light)' }} />
                    {/* Item 3: clear per day */}
                    {user && hasPreds && hasUnlocked && (
                      <button onClick={() => setShowClearConfirm(dayMatches)} style={{
                        fontSize: '11px', padding: '3px 8px', borderRadius: 'var(--radius-full)',
                        border: '1px solid var(--border-medium)', background: 'var(--bg-card)',
                        color: 'var(--text-muted)', cursor: 'pointer',
                      }}>🗑️ Clear</button>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {dayMatches.map(renderMatch)}
                  </div>
                </div>
              )
            })}
            {renderAllGroupsStandings()}
          </div>
          )
        )}
      </div>

      {/* ── Sticky guest save banner ── */}
      {!user && (
        <div style={{
          position: 'fixed', bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))',
          left: 0, right: 0, zIndex: 90,
          background: 'var(--scottish-navy)',
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
          boxShadow: '0 -4px 16px rgba(0,0,0,0.15)',
        }}>
          <div style={{ color: 'white', fontSize: '13px', lineHeight: 1.4 }}>
            <span style={{ fontWeight: '700' }}>💾 Save your picks</span>
            <span style={{ color: 'rgba(255,255,255,0.65)', marginLeft: '6px' }}>Join free to compete</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <Link to="/register" className="btn btn-green btn-sm">Join free</Link>
            <Link to="/login" className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>Sign in</Link>
          </div>
        </div>
      )}

      {/* Clear confirm modal */}
      {/* Joker confirm modal */}
      {jokerConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ maxWidth: '340px', width: '100%' }}>
            <div style={{ fontWeight: '800', fontSize: '16px', marginBottom: '8px' }}>🃏 Use a Joker?</div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              This doubles your points for this match if you get the result right.
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              You have <strong>{jokersRemaining}</strong> joker{jokersRemaining !== 1 ? 's' : ''} remaining. You can remove it before kickoff, but not after.
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => { handleJoker(jokerConfirm.matchId, jokerConfirm.currentJoker); setJokerConfirm(null) }}
                className="btn btn-primary" style={{ flex: 1 }}>
                Yes, use joker
              </button>
              <button onClick={() => setJokerConfirm(null)} className="btn btn-secondary" style={{ flex: 1 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showClearConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ maxWidth: '340px', width: '100%' }}>
            <div style={{ fontWeight: '800', fontSize: '16px', marginBottom: '8px' }}>🗑️ Clear Predictions</div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              {showClearConfirm === 'group'
                ? `Clear all unlocked predictions in Group ${activeGroup}? This cannot be undone.`
                : Array.isArray(showClearConfirm)
                ? 'Clear all unlocked predictions for this date? This cannot be undone.'
                : 'Clear ALL unlocked predictions? This cannot be undone.'}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => {
                if (showClearConfirm === 'group') clearGroupPredictions()
                else if (Array.isArray(showClearConfirm)) clearDatePredictions(showClearConfirm)
                else clearAllPredictions()
              }} className="btn btn-primary" style={{ background: '#e53935', flex: 1 }}>Clear</button>
              <button onClick={() => setShowClearConfirm(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
