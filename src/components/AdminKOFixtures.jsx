import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

// Human-readable slot descriptors for the R32 (so admin knows who each side
// SHOULD be). "BT3" = a best-third-placed team (decided by FIFA's Annex C
// allocation once all groups finish). r16+ are "winner of match N".
const R32_SLOTS = {
  73: ['2A', '2B'], 76: ['1C', '2F'], 77: ['1I', 'BT3'], 74: ['1E', 'BT3'],
  79: ['1A', 'BT3'], 75: ['1F', '2C'], 80: ['1L', 'BT3'], 78: ['2E', '2I'],
  81: ['1D', 'BT3'], 82: ['1G', 'BT3'], 83: ['2K', '2L'], 87: ['1K', 'BT3'],
  84: ['1H', '2J'], 85: ['1B', 'BT3'], 88: ['2D', '2G'], 86: ['1J', '2H'],
}

const STAGE_LABEL = { r32: 'Round of 32', r16: 'Round of 16', qf: 'Quarter-finals', sf: 'Semi-finals', '3rd': '3rd-place', final: 'Final' }
const STAGE_ORDER = ['r32', 'r16', 'qf', 'sf', '3rd', 'final']

export default function AdminKOFixtures() {
  const [matches, setMatches] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState({})        // matchId -> { home, away }
  const [savingId, setSavingId] = useState(null)
  const [savedId, setSavedId] = useState(null)
  const [error, setError] = useState('')
  const [activeStage, setActiveStage] = useState('r32')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError('')
    const [{ data: matchData, error: mErr }, { data: teamData, error: tErr }] = await Promise.all([
      supabase.from('matches')
        .select('id, match_number, stage, kickoff_time, home_team_id, away_team_id, status')
        .in('stage', STAGE_ORDER)
        .order('match_number', { ascending: true }),
      supabase.from('teams').select('id, name, short_code, flag_emoji').order('name'),
    ])
    if (mErr || tErr) setError((mErr || tErr).message)
    setMatches(matchData || [])
    setTeams(teamData || [])
    // seed drafts from current DB values
    const d = {}
    ;(matchData || []).forEach(m => { d[m.id] = { home: m.home_team_id || '', away: m.away_team_id || '' } })
    setDraft(d)
    setLoading(false)
  }

  const teamLabel = (id) => {
    const t = teams.find(x => x.id === id)
    return t ? `${t.flag_emoji || ''} ${t.short_code || t.name}`.trim() : '—'
  }

  const setSide = (matchId, side, value) => {
    setDraft(d => ({ ...d, [matchId]: { ...d[matchId], [side]: value } }))
    setSavedId(null)
  }

  const isDirty = (m) => {
    const d = draft[m.id] || {}
    return (d.home || '') !== (m.home_team_id || '') || (d.away || '') !== (m.away_team_id || '')
  }

  async function saveRow(m) {
    setSavingId(m.id)
    setError('')
    const d = draft[m.id] || {}
    const home = d.home || null
    const away = d.away || null
    if (home && away && home === away) {
      setError(`Match ${m.match_number}: home and away can't be the same team.`)
      setSavingId(null)
      return
    }
    const { error: upErr } = await supabase.from('matches')
      .update({ home_team_id: home, away_team_id: away })
      .eq('id', m.id)
    if (upErr) { setError(upErr.message); setSavingId(null); return }
    setMatches(ms => ms.map(x => x.id === m.id ? { ...x, home_team_id: home, away_team_id: away } : x))
    setSavingId(null)
    setSavedId(m.id)
  }

  async function clearRow(m) {
    setSavingId(m.id)
    setError('')
    const { error: upErr } = await supabase.from('matches')
      .update({ home_team_id: null, away_team_id: null })
      .eq('id', m.id)
    if (upErr) { setError(upErr.message); setSavingId(null); return }
    setMatches(ms => ms.map(x => x.id === m.id ? { ...x, home_team_id: null, away_team_id: null } : x))
    setDraft(d => ({ ...d, [m.id]: { home: '', away: '' } }))
    setSavingId(null)
    setSavedId(m.id)
  }

  const stageMatches = matches.filter(m => m.stage === activeStage)

  const Dropdown = ({ matchId, side, slotHint }) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      {slotHint && (
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 2 }}>
          {slotHint === 'BT3' ? 'Best 3rd' : slotHint}
        </div>
      )}
      <select
        value={(draft[matchId]?.[side]) || ''}
        onChange={e => setSide(matchId, side, e.target.value)}
        style={{ width: '100%', padding: '7px 8px', fontSize: '13px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
      >
        <option value="">— TBD —</option>
        {teams.map(t => (
          <option key={t.id} value={t.id}>{t.flag_emoji || ''} {t.name}</option>
        ))}
      </select>
    </div>
  )

  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}><div className="spinner" /></div>

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>🏟️ KO Fixture Editor</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Manual fallback for when the live API hasn't filled a knockout matchup yet. Set the real teams here and they'll show in the KO Predictor straight away.
          The hourly sync only fills <em>empty</em> slots, so anything you set here is kept — it won't be overwritten.
          To hand a match back to the API (e.g. you entered it by mistake), use <strong>Clear</strong> to blank it and the next sync will repopulate it from real results.
        </div>
      </div>

      {/* Stage tabs */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 14 }}>
        {STAGE_ORDER.map(s => {
          const n = matches.filter(m => m.stage === s).length
          if (n === 0) return null
          const active = activeStage === s
          return (
            <button key={s} onClick={() => setActiveStage(s)} style={{
              padding: '6px 12px', fontSize: 12, fontWeight: active ? 700 : 500, whiteSpace: 'nowrap',
              borderRadius: 'var(--radius-full)', cursor: 'pointer',
              border: active ? '1px solid var(--primary)' : '1px solid var(--border-light)',
              background: active ? 'var(--primary)' : 'var(--bg-secondary)',
              color: active ? '#fff' : 'var(--text-muted)',
            }}>{STAGE_LABEL[s] || s}</button>
          )
        })}
      </div>

      {error && (
        <div style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {stageMatches.map(m => {
          const slots = R32_SLOTS[m.match_number] || [null, null]
          const dirty = isDirty(m)
          const busy = savingId === m.id
          const justSaved = savedId === m.id && !dirty
          const filled = m.home_team_id && m.away_team_id
          return (
            <div key={m.id} className="card" style={{ padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>
                  Match {m.match_number}
                  <span style={{ fontWeight: 500, color: 'var(--text-muted)', marginLeft: 8 }}>
                    {filled ? `${teamLabel(m.home_team_id)} v ${teamLabel(m.away_team_id)}` : 'not set'}
                  </span>
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-full)',
                  background: filled ? 'rgba(16,185,129,0.12)' : 'rgba(148,163,184,0.15)',
                  color: filled ? '#059669' : 'var(--text-muted)' }}>
                  {filled ? 'CONFIRMED' : 'PENDING'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <Dropdown matchId={m.id} side="home" slotHint={slots[0]} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, paddingBottom: 8 }}>v</span>
                <Dropdown matchId={m.id} side="away" slotHint={slots[1]} />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => clearRow(m)} disabled={busy || (!m.home_team_id && !m.away_team_id)}
                  className="btn btn-sm" style={{ border: '1px solid var(--border-light)', background: 'none', color: 'var(--text-muted)', opacity: (busy || (!m.home_team_id && !m.away_team_id)) ? 0.5 : 1 }}>
                  Clear
                </button>
                <button onClick={() => saveRow(m)} disabled={busy || !dirty}
                  className="btn btn-sm" style={{ border: 'none', background: dirty ? 'var(--primary)' : 'var(--border-light)', color: dirty ? '#fff' : 'var(--text-muted)', opacity: busy ? 0.6 : 1 }}>
                  {busy ? 'Saving…' : justSaved ? '✓ Saved' : 'Save'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
