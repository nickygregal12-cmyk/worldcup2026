import { useEffect, useState } from 'react'
import { ALL_STAGES } from '../../lib/bracketUtils.js'
import { supabase } from '../../lib/supabase.js'

const MATCH_DEFS = new Map(
  ALL_STAGES.flatMap(stage => (stage.matches || []).map(match => [match.match_number, match]))
)

const formatSlot = (slot) => {
  if (!slot) return 'TBC'
  if (/^[12][A-L]$/.test(slot)) {
    const position = slot[0] === '1' ? 'Winner' : 'Runner-up'
    return `${position} Group ${slot[1]}`
  }
  if (/^BT3_[A-L]+$/.test(slot)) {
    return `Best 3rd (${slot.slice(4).split('').join('/')})`
  }
  if (/^W\d+$/.test(slot)) return `Winner M${slot.slice(1)}`
  if (/^L\d+$/.test(slot)) return `Loser M${slot.slice(1)}`
  return slot
}

function TeamOrSlot({ team, slot }) {
  if (team) {
    return (
      <>
        <div style={{ fontSize: '24px' }}>{team.flag_emoji || '🏳️'}</div>
        <b style={{ fontSize: '13px' }}>{team.short_code || team.name}</b>
      </>
    )
  }

  return (
    <>
      <div style={{ fontSize: '20px', opacity: 0.65 }}>◌</div>
      <b style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.25 }}>{formatSlot(slot)}</b>
    </>
  )
}

export default function MatchManager({ admin }) {
  const [slotOverrides, setSlotOverrides] = useState({})
  const [healthFilter, setHealthFilter] = useState(() => {
    if (typeof window === 'undefined') return ''
    return window.sessionStorage.getItem('wc26_admin_match_health_filter') || ''
  })
  const {
    matches, filteredMatches, matchSearch, setMatchSearch,
    matchStatusFilter, setMatchStatusFilter, stageFilter, setStageFilter,
    setFixtureEditorMatch, editingMatch, setEditingMatch, scores, setScores,
    saving, saveMatchResult, setMatchLive, resetMatchOverride, loadMatches, fmt, prepopulateMatchIds,
  } = admin

  useEffect(() => {
    supabase.from('app_settings').select('key, value').like('key', 'ko_slot_override_%').then(({ data }) => {
      const map = {}
      ;(data || []).forEach(row => {
        const number = Number(row.key.replace('ko_slot_override_', ''))
        try { map[number] = JSON.parse(row.value) } catch {}
      })
      setSlotOverrides(map)
    })
  }, [matches])


  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.sessionStorage.getItem('wc26_admin_match_health_filter') || ''
    setHealthFilter(stored)
    if (stored) {
      setStageFilter('all')
      setMatchStatusFilter('all')
      setMatchSearch('')
    }
  }, [])

  const healthFilterLabels = {
    'missing-external-id': 'API-managed fixtures missing an external match ID',
    'unresolved-ko': 'Knockout fixtures still awaiting one or both teams',
    'missing-venue': 'Fixtures missing a venue',
    'completed-missing-score': 'Completed fixtures missing a complete score',
    'live-missing-minute': 'Live fixtures missing the current minute',
  }

  const healthFilteredMatches = healthFilter
    ? filteredMatches.filter(match => {
        if (healthFilter === 'missing-external-id') return !match.external_match_id && !match.use_manual_override
        if (healthFilter === 'unresolved-ko') return match.stage !== 'group' && (!match.home_team_id || !match.away_team_id)
        if (healthFilter === 'missing-venue') return !match.venue_id && !match.venue?.id
        if (healthFilter === 'completed-missing-score') return match.status === 'completed' && (match.home_score == null || match.away_score == null)
        if (healthFilter === 'live-missing-minute') return match.status === 'live' && match.live_minute == null
        return true
      })
    : filteredMatches

  const clearHealthFilter = () => {
    setHealthFilter('')
    if (typeof window !== 'undefined') window.sessionStorage.removeItem('wc26_admin_match_health_filter')
  }

  const stageOptions = [
    ['all', 'All stages'], ['group', 'Groups'], ['r32', 'R32'], ['r16', 'R16'],
    ['qf', 'QF'], ['sf', 'SF'], ['3rd', '3rd'], ['final', 'Final'],
  ]

  const selectStage = (value) => {
    setStageFilter(value)
    // A status such as “Live” should not make an entire round look missing.
    // Switching rounds therefore returns to all fixtures for that round.
    if (matchStatusFilter !== 'all') setMatchStatusFilter('all')
  }

  return (
    <div>
      <div className="card" style={{ padding: '14px', marginBottom: '14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(150px,220px)', gap: '8px' }}>
          <input className="input" value={matchSearch} onChange={e => setMatchSearch(e.target.value)} placeholder="Search match, team, stadium or city…" />
          <select className="input" value={matchStatusFilter} onChange={e => setMatchStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="live">Live</option>
            <option value="completed">Completed</option>
            <option value="postponed">Postponed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
          {stageOptions.map(([value, label]) => (
            <button key={value} onClick={() => selectStage(value)} className="btn btn-sm" style={{
              background: stageFilter === value ? 'var(--scottish-navy)' : 'var(--bg-card)',
              color: stageFilter === value ? 'white' : 'var(--text-secondary)',
              border: '1px solid var(--border-light)',
            }}>{label}</button>
          ))}
          <button onClick={loadMatches} className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }}>↻ Refresh</button>
        </div>
      </div>

      <div style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 2px 10px' }}>
        Showing {healthFilteredMatches.length} of {matches.length} fixtures
      </div>

      {healthFilter && (
        <div className="card" style={{ padding: '11px 13px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(21,88,176,0.06)', border: '1px solid rgba(21,88,176,0.20)' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', fontWeight: 900, color: 'var(--scottish-navy)' }}>Health filter active</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{healthFilterLabels[healthFilter] || healthFilter}</div>
          </div>
          {healthFilter === 'missing-external-id' && prepopulateMatchIds && (
            <button className="btn btn-primary btn-sm" disabled={saving.prepopulate} onClick={prepopulateMatchIds}>
              {saving.prepopulate ? 'Finding IDs…' : 'Find API IDs'}
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={clearHealthFilter}>Clear filter</button>
        </div>
      )}

      {!matches.length ? (
        <div className="card" style={{ textAlign: 'center', padding: '30px 18px' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>⚠️</div>
          <div style={{ fontWeight: 900, marginBottom: '5px' }}>Fixtures did not load</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
            The fixture query is isolated from venue fields, so a venue schema change cannot blank this screen.
          </div>
          <button className="btn btn-primary" onClick={loadMatches}>Retry loading fixtures</button>
        </div>
      ) : healthFilteredMatches.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '28px 18px', color: 'var(--text-muted)' }}>
          <div style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: '5px' }}>No fixtures match these filters</div>
          <button className="btn btn-secondary btn-sm" onClick={() => { setMatchStatusFilter('all'); setMatchSearch('') }} style={{ marginTop: '8px' }}>
            Show every {stageFilter === 'all' ? '' : stageOptions.find(([value]) => value === stageFilter)?.[1] || ''} fixture
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '10px' }}>
          {healthFilteredMatches.map(match => {
            const isEditing = editingMatch === match.id
            const s = scores[match.id] || { home: match.home_score ?? '', away: match.away_score ?? '' }
            const venueName = match.venue?.name || match.venue?.stadium_name || match.venue?.city || 'Venue not set'
            const matchDef = { ...(MATCH_DEFS.get(Number(match.match_number)) || {}), ...(slotOverrides[Number(match.match_number)] || {}) }
            return (
              <div key={match.id} className="card" style={{ padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>
                      Match {match.match_number} · {match.stage === 'group' ? `Group ${match.group?.name || '—'}` : match.stage?.toUpperCase()}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>{fmt(match.kickoff_time)} · {venueName}</div>
                  </div>
                  <span className={`badge ${match.status === 'completed' ? 'badge-green' : match.status === 'live' ? 'badge-red' : 'badge-gray'}`}>{match.status}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '10px', alignItems: 'center', padding: '14px 0 12px' }}>
                  <div style={{ textAlign: 'center' }}><TeamOrSlot team={match.home_team} slot={matchDef?.home_slot} /></div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '20px' }}>
                    {['live','completed'].includes(match.status) ? `${match.home_score ?? 0}–${match.away_score ?? 0}` : 'vs'}
                  </div>
                  <div style={{ textAlign: 'center' }}><TeamOrSlot team={match.away_team} slot={matchDef?.away_slot} /></div>
                </div>

                {!match.home_team && !match.away_team && matchDef && (
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', margin: '-5px 0 10px' }}>
                    Teams will replace these bracket slots automatically when confirmed.
                  </div>
                )}

                {isEditing && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px', background: 'var(--bg-secondary)', borderRadius: '10px', marginBottom: '10px' }}>
                    <input className="input" type="number" min="0" max="30" value={s.home} onChange={e => setScores(prev => ({ ...prev, [match.id]: { ...s, home: e.target.value } }))} style={{ width: '72px', textAlign: 'center', fontWeight: 900 }} />
                    <span>–</span>
                    <input className="input" type="number" min="0" max="30" value={s.away} onChange={e => setScores(prev => ({ ...prev, [match.id]: { ...s, away: e.target.value } }))} style={{ width: '72px', textAlign: 'center', fontWeight: 900 }} />
                    <button className="btn btn-primary btn-sm" disabled={saving[match.id]} onClick={() => saveMatchResult(match)}>Save result</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditingMatch(null)}>Cancel</button>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => setFixtureEditorMatch(match)}>Edit match</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setEditingMatch(isEditing ? null : match.id); setScores(prev => ({ ...prev, [match.id]: { home: match.home_score ?? '', away: match.away_score ?? '' } })) }}>{isEditing ? 'Close score' : 'Enter result'}</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setMatchLive(match)}>{match.status === 'live' ? 'Update live' : 'Mark live'}</button>
                  {match.use_manual_override ? <button className="btn btn-secondary btn-sm" onClick={() => resetMatchOverride(match)}>Return to API control</button> : <button className="btn btn-secondary btn-sm" onClick={() => setFixtureEditorMatch(match)}>Set manual control</button>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
