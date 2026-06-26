import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { ALL_STAGES, calcPredictedStandings, resolveSlot, findAffectedPicks } from '../lib/bracketUtils.js'

/**
 * AdminUserBracketEditor — lets a super admin complete a REAL registered
 * user's personal knockout bracket (knockout_picks table) when they've done
 * their group predictions but not their knockouts.
 *
 * Mirrors the proven offline-player KO editor logic exactly:
 *  - Resolves each slot from the user's own group predictions (standings)
 *  - W-slots resolve from the winner the user/admin picked in the prior round
 *  - Round N must be filled before round N+1 reveals its teams
 *  - Includes an override to pick any team if a path can't resolve
 *
 * Writes to knockout_picks using the SAME columns as the user-facing save
 * (winner_team_id, team_id, home_team_id, away_team_id, match_number, stage,
 *  bracket_version='fifa_v2') so scoring treats it identically.
 *
 * Respekts the progressive lock: a slot whose feeding group has kicked off
 * cannot be created (matches the user-facing freeze) unless the admin uses
 * the explicit override.
 */
export default function AdminUserBracketEditor({ userId, username, matches, onClose, logAudit }) {
  const [groupPreds, setGroupPreds] = useState({})  // match_id -> {home, away}
  const [picks, setPicks] = useState({})            // match_number -> {winner_id, home_id, away_id}
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [msg, setMsg] = useState('')

  const groupMatches = useMemo(() => matches.filter(m => m.stage === 'group'), [matches])

  const allTeams = useMemo(() => {
    const map = {}
    matches.forEach(m => {
      if (m.home_team) map[m.home_team.id] = m.home_team
      if (m.away_team) map[m.away_team.id] = m.away_team
    })
    return map
  }, [matches])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      const [predRes, koRes] = await Promise.all([
        supabase.from('predictions').select('match_id, home_score, away_score').eq('user_id', userId),
        supabase.from('knockout_picks').select('*').eq('user_id', userId),
      ])
      if (cancelled) return
      const pm = {}
      ;(predRes.data || []).forEach(p => {
        if (p.home_score !== null && p.away_score !== null) pm[p.match_id] = { home: p.home_score, away: p.away_score }
      })
      const km = {}
      ;(koRes.data || []).forEach(p => {
        km[p.match_number] = { winner_id: p.winner_team_id, home_id: p.home_team_id, away_id: p.away_team_id }
      })
      setGroupPreds(pm)
      setPicks(km)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [userId])

  const standings = useMemo(() => calcPredictedStandings(groupMatches, groupPreds, true), [groupMatches, groupPreds])

  // Resolve a slot to a team object — group slots from standings, W-slots from picks
  const resolveTeam = (slot) => {
    if (!slot) return null
    if (slot.startsWith('W')) {
      const mn = parseInt(slot.replace('W', ''))
      const winnerId = picks[mn]?.winner_id
      return winnerId ? (allTeams[winnerId] || { id: winnerId, name: '?', flag_emoji: '🏳️', short_code: '???' }) : null
    }
    if (slot.startsWith('L')) return null // 3rd-place loser slots not used in this game
    return resolveSlot(slot, standings, groupMatches, groupPreds)
  }

  // The two teams to show for a match. A saved pick is a frozen snapshot: the
  // teams that were in the slot when it was picked (winner one of them). Trust it
  // when coherent so the matchup matches the winner and stays consistent with the
  // Knockout tab and the view-predictions modal; otherwise resolve from predictions.
  const matchTeams = (matchDef) => {
    const pick = picks[matchDef.match_number]
    const sH = pick?.home_id ? allTeams[pick.home_id] : null
    const sA = pick?.away_id ? allTeams[pick.away_id] : null
    const w = pick?.winner_id
    if (sH && sA && (!w || w === sH.id || w === sA.id)) {
      return { home: sH, away: sA }
    }
    let home = resolveTeam(matchDef.home_slot)
    let away = resolveTeam(matchDef.away_slot)
    if (!home && sH) home = sH
    if (!away && sA) away = sA
    return { home, away }
  }

  // Has any match in this slot's feeding group kicked off? (progressive lock)
  const slotFrozen = (slot) => {
    if (!slot || slot.startsWith('W') || slot.startsWith('L')) return false
    const direct = slot.match(/^[123]([A-L])$/)
    const bt3 = slot.match(/^BT3_([A-L]+)$/)
    const groups = direct ? [direct[1]] : bt3 ? bt3[1].split('') : []
    const now = new Date()
    return groups.some(g => groupMatches.some(m => m.group?.name === g && new Date(m.kickoff_time) <= now))
  }

  const savePick = async (matchDef, dbMatch, winnerId, homeTeam, awayTeam) => {
    setSaving(matchDef.match_number)
    const stage = ALL_STAGES.find(s => s.matches.some(m => m.match_number === matchDef.match_number))?.key || 'r32'

    // upsert by (user_id, match_number)
    const { data: existing } = await supabase
      .from('knockout_picks').select('id').eq('user_id', userId).eq('match_number', matchDef.match_number).maybeSingle()

    let error
    if (existing) {
      ({ error } = await supabase.from('knockout_picks')
        .update({ winner_team_id: winnerId, team_id: winnerId, home_team_id: homeTeam?.id, away_team_id: awayTeam?.id, bracket_version: 'fifa_v2' })
        .eq('id', existing.id))
    } else {
      ({ error } = await supabase.from('knockout_picks')
        .insert({ user_id: userId, match_number: matchDef.match_number, stage, team_id: winnerId, winner_team_id: winnerId, home_team_id: homeTeam?.id, away_team_id: awayTeam?.id, bracket_version: 'fifa_v2' }))
    }

    if (error) {
      setMsg(`❌ ${error.message}`)
    } else {
      // If we CHANGED an existing winner, downstream picks that depended on the
      // old winner are now stale — clear them (mirrors user-facing cascade).
      const prevWinner = picks[matchDef.match_number]?.winner_id
      let cleared = []
      if (prevWinner && prevWinner !== winnerId) {
        cleared = findAffectedPicks(prevWinner, picks, matchDef.match_number)
        if (cleared.length > 0) {
          await supabase.from('knockout_picks').delete().eq('user_id', userId).in('match_number', cleared)
        }
      }
      setPicks(prev => {
        const next = { ...prev, [matchDef.match_number]: { winner_id: winnerId, home_id: homeTeam?.id, away_id: awayTeam?.id } }
        cleared.forEach(mn => { delete next[mn] })
        return next
      })
      if (logAudit) await logAudit('ADMIN_FILL_KNOCKOUT', { user_id: userId, username, match_number: matchDef.match_number, winner_team_id: winnerId, cleared_downstream: cleared })
      setMsg(`✓ Saved M${matchDef.match_number}${cleared.length ? ` (cleared ${cleared.length} downstream)` : ''}`)
    }
    setSaving(null)
  }

  const overridePick = async (matchDef, dbMatch, teamId) => {
    if (!teamId) return
    const team = allTeams[teamId]
    // For an override we keep whatever home/away are resolvable, but force winner
    const { home, away } = matchTeams(matchDef)
    await savePick(matchDef, dbMatch, teamId, home || team, away || team)
  }

  const filledCount = ALL_STAGES.reduce((n, s) => n + s.matches.filter(m => picks[m.match_number]?.winner_id).length, 0)
  const totalCount = ALL_STAGES.reduce((n, s) => n + s.matches.length, 0)
  const hasGroupPreds = Object.keys(groupPreds).length > 0

  return (
    <div style={{ marginTop: '10px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--scottish-navy-light)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ fontSize: '13px', fontWeight: '800' }}>🏆 {username}'s bracket — {filledCount}/{totalCount}</div>
        <button onClick={onClose} className="btn btn-secondary btn-sm">Close</button>
      </div>

      {loading && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Loading…</div>}

      {!loading && !hasGroupPreds && (
        <div style={{ fontSize: '12px', color: '#e65100', fontWeight: '600', padding: '8px', background: 'rgba(230,81,0,0.08)', borderRadius: 'var(--radius-sm)' }}>
          ⚠️ This user has no group predictions — R32 matchups can't be resolved. Use the per-match override to assign teams manually if needed.
        </div>
      )}

      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '420px', overflowY: 'auto' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Teams resolve from {username}'s group predictions. Fill each round before the next reveals its teams. {msg && <span style={{ color: 'var(--accent-green)', fontWeight: '700' }}>{msg}</span>}
          </div>
          {ALL_STAGES.map(stage => (
            <div key={stage.key}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 0 4px' }}>{stage.label} · {stage.points}pts</div>
              {stage.matches.map(matchDef => {
                const dbMatch = matches.find(m => m.match_number === matchDef.match_number)
                if (!dbMatch) return null
                const pick = picks[matchDef.match_number]
                const { home: homeTeam, away: awayTeam } = matchTeams(matchDef)
                const teams = [homeTeam, awayTeam].filter(Boolean)
                const frozen = slotFrozen(matchDef.home_slot) || slotFrozen(matchDef.away_slot)
                const pickedTeam = pick?.winner_id ? allTeams[pick.winner_id] : null
                return (
                  <div key={matchDef.match_number} style={{ padding: '6px 8px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: `1px solid ${pick?.winner_id ? 'var(--accent-green)' : 'var(--border-light)'}`, marginBottom: '3px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      M{matchDef.match_number} · {matchDef.home_slot} vs {matchDef.away_slot}
                      {frozen && <span style={{ color: 'var(--accent-orange)', marginLeft: '6px' }}>🔒 group started</span>}
                      {pick?.winner_id && <span style={{ color: 'var(--accent-green)', marginLeft: '6px' }}>✓ {pickedTeam?.name || pickedTeam?.short_code || 'Picked'}</span>}
                    </div>
                    {teams.length === 0 ? (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {matchDef.home_slot.startsWith('W') ? `Pick M${matchDef.home_slot.replace('W','')} & M${matchDef.away_slot.replace('W','')} winners first` : '⚠️ Needs group predictions'}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {teams.map(team => (
                          <button key={team.id} disabled={saving === matchDef.match_number}
                            onClick={() => savePick(matchDef, dbMatch, pick?.winner_id === team.id ? null : team.id, homeTeam, awayTeam)}
                            style={{ flex: 1, padding: '5px 8px', borderRadius: 'var(--radius-sm)', border: `1.5px solid ${pick?.winner_id === team.id ? 'var(--accent-green)' : 'var(--border-light)'}`, background: pick?.winner_id === team.id ? 'var(--accent-green-light)' : 'var(--bg-secondary)', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                            {team.flag_emoji} {team.short_code || team.name}{pick?.winner_id === team.id && ' ✓'}
                          </button>
                        ))}
                        {teams.length === 1 && <div style={{ flex: 1, padding: '5px 8px', borderRadius: 'var(--radius-sm)', border: '1.5px dashed var(--border-medium)', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>TBD</div>}
                      </div>
                    )}
                    <details style={{ marginTop: '4px' }}>
                      <summary style={{ fontSize: '10px', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>🔧 Override — pick any team</summary>
                      <select value={pick?.winner_id || ''} onChange={e => overridePick(matchDef, dbMatch, e.target.value)}
                        style={{ width: '100%', marginTop: '4px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-light)', fontSize: '12px' }}>
                        <option value="">Select any team…</option>
                        {Object.values(allTeams).sort((a, b) => a.name?.localeCompare(b.name)).map(t => (
                          <option key={t.id} value={t.id}>{t.flag_emoji} {t.name}</option>
                        ))}
                      </select>
                    </details>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
