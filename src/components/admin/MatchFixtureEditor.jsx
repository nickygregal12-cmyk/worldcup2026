import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { ALL_STAGES } from '../../lib/bracketUtils.js'

const toLocalInput = (value) => {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16)
}

const DEFAULT_DEF = new Map(ALL_STAGES.flatMap(s => (s.matches || []).map(m => [Number(m.match_number), m])))
const SLOT_OPTIONS = [
  ...['A','B','C','D','E','F','G','H','I','J','K','L'].flatMap(g => [`1${g}`, `2${g}`]),
  'BT3_ABCDF','BT3_CDFGH','BT3_CEFHI','BT3_EHIJK','BT3_BEFIJ','BT3_AEHIJ','BT3_DEIJL','BT3_EFGIJ',
  ...Array.from({ length: 32 }, (_, i) => `W${73 + i}`),
  'L101','L102',
]

const slotLabel = (slot) => {
  if (!slot) return 'Unassigned'
  if (/^[12][A-L]$/.test(slot)) return `${slot[0] === '1' ? 'Winner' : 'Runner-up'} Group ${slot[1]}`
  if (/^BT3_/.test(slot)) return `Best 3rd (${slot.slice(4).split('').join('/')})`
  if (/^W\d+$/.test(slot)) return `Winner M${slot.slice(1)}`
  if (/^L\d+$/.test(slot)) return `Loser M${slot.slice(1)}`
  return slot
}

export default function MatchFixtureEditor({ match, teams, groups, venues, onClose, onSaved, setActionResult, logAudit }) {
  const def = DEFAULT_DEF.get(Number(match.match_number)) || {}
  const [form, setForm] = useState({
    match_number: match.match_number ?? '', stage: match.stage || 'group', group_id: match.group_id || '',
    home_team_id: match.home_team_id || '', away_team_id: match.away_team_id || '', venue_id: match.venue_id || '',
    kickoff_time: toLocalInput(match.kickoff_time), status: match.status || 'scheduled', live_minute: match.live_minute ?? '',
    home_score: match.home_score ?? '', away_score: match.away_score ?? '', aet_home_score: match.aet_home_score ?? '',
    aet_away_score: match.aet_away_score ?? '', outcome_type: match.outcome_type || '90mins', first_goal_band: match.first_goal_band || '',
    external_match_id: match.external_match_id || '', use_manual_override: match.use_manual_override ?? true,
    home_slot: def.home_slot || '', away_slot: def.away_slot || '',
  })
  const [teamGroups, setTeamGroups] = useState({})
  const [saving, setSaving] = useState(false)
  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }))
  const num = value => value === '' ? null : Number(value)

  useEffect(() => {
    if (form.stage === 'group') return
    Promise.all([
      supabase.from('group_teams').select('team_id, group_id'),
      supabase.from('app_settings').select('value').eq('key', `ko_slot_override_${match.match_number}`).maybeSingle(),
    ]).then(([gt, override]) => {
      const groupById = Object.fromEntries(groups.map(g => [g.id, g.name]))
      const map = {}
      ;(gt.data || []).forEach(row => { map[row.team_id] = groupById[row.group_id] })
      setTeamGroups(map)
      if (override.data?.value) {
        try {
          const parsed = JSON.parse(override.data.value)
          setForm(prev => ({ ...prev, home_slot: parsed.home_slot || prev.home_slot, away_slot: parsed.away_slot || prev.away_slot }))
        } catch {}
      }
    })
  }, [form.stage, groups, match.match_number])

  const eligibleTeams = (slot) => {
    if (form.stage === 'group' || !slot) return teams
    const direct = slot.match(/^[12]([A-L])$/)
    if (direct) return teams.filter(t => teamGroups[t.id] === direct[1])
    const bestThird = slot.match(/^BT3_([A-L]+)$/)
    if (bestThird) return teams.filter(t => bestThird[1].includes(teamGroups[t.id]))
    return teams
  }
  const homeTeams = useMemo(() => eligibleTeams(form.home_slot), [teams, teamGroups, form.home_slot, form.stage])
  const awayTeams = useMemo(() => eligibleTeams(form.away_slot), [teams, teamGroups, form.away_slot, form.stage])

  const save = async () => {
    if (form.home_team_id && form.away_team_id && form.home_team_id === form.away_team_id) return setActionResult('Home and away team cannot be the same.')
    setSaving(true)
    const payload = {
      match_number: Number(form.match_number), stage: form.stage,
      group_id: form.stage === 'group' ? (form.group_id || null) : null,
      home_team_id: form.home_team_id || null, away_team_id: form.away_team_id || null, venue_id: form.venue_id || null,
      kickoff_time: form.kickoff_time ? new Date(form.kickoff_time).toISOString() : null,
      status: form.status, live_minute: num(form.live_minute), home_score: num(form.home_score), away_score: num(form.away_score),
      aet_home_score: num(form.aet_home_score), aet_away_score: num(form.aet_away_score),
      outcome_type: form.outcome_type || null, first_goal_band: form.first_goal_band || null,
      external_match_id: form.external_match_id ? String(form.external_match_id) : null,
      use_manual_override: Boolean(form.use_manual_override),
    }
    const { error } = await supabase.from('matches').update(payload).eq('id', match.id)
    if (error) { setSaving(false); return setActionResult(`Fixture save failed: ${error.message}`) }
    if (form.stage !== 'group') {
      await supabase.from('app_settings').upsert({
        key: `ko_slot_override_${payload.match_number}`,
        value: JSON.stringify({ home_slot: form.home_slot, away_slot: form.away_slot }),
      }, { onConflict: 'key' })
    }
    await logAudit('EDIT_MATCH_FIXTURE', { match_id: match.id, match_number: payload.match_number, changes: payload, slots: { home_slot: form.home_slot, away_slot: form.away_slot } })
    setActionResult(`Match ${payload.match_number} updated.`)
    await onSaved(); setSaving(false); onClose()
  }

  const Field = ({ label, children }) => <label><span className="admin-field-label">{label}</span>{children}</label>
  const TeamSelect = ({ side, options }) => <select className="input" value={form[`${side}_team_id`]} onChange={e=>update(`${side}_team_id`,e.target.value)}><option value="">Use bracket slot / TBC</option>{options.map(t=><option key={t.id} value={t.id}>{t.flag_emoji || ''} {t.name}</option>)}</select>

  return <div style={{ position:'fixed', inset:0, zIndex:1400, background:'rgba(0,0,0,.62)', display:'flex', alignItems:'flex-end', justifyContent:'center' }} onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <div className="card" style={{ width:'min(820px,100%)', maxHeight:'94dvh', overflowY:'auto', borderRadius:'20px 20px 0 0', padding:'18px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}><div><div style={{ fontSize:'10px', color:'var(--text-muted)', fontWeight:900, textTransform:'uppercase' }}>Tournament match control</div><h2 style={{ margin:'4px 0 0' }}>Match {match.match_number}</h2></div><button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button></div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))', gap:'12px' }}>
        <Field label="Match number"><input className="input" type="number" value={form.match_number} onChange={e=>update('match_number',e.target.value)} /></Field>
        <Field label="Stage"><select className="input" value={form.stage} onChange={e=>update('stage',e.target.value)}>{[['group','Group stage'],['r32','Round of 32'],['r16','Round of 16'],['qf','Quarter-final'],['sf','Semi-final'],['3rd','Third place'],['final','Final']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field>
        <Field label="Group"><select className="input" disabled={form.stage!=='group'} value={form.group_id} onChange={e=>update('group_id',e.target.value)}><option value="">No group</option>{groups.map(g=><option key={g.id} value={g.id}>Group {g.name}</option>)}</select></Field>
        {form.stage !== 'group' && <><Field label="Home bracket slot"><select className="input" value={form.home_slot} onChange={e=>{update('home_slot',e.target.value);update('home_team_id','')}}><option value="">Unassigned</option>{SLOT_OPTIONS.map(v=><option key={v} value={v}>{v} · {slotLabel(v)}</option>)}</select></Field><Field label="Away bracket slot"><select className="input" value={form.away_slot} onChange={e=>{update('away_slot',e.target.value);update('away_team_id','')}}><option value="">Unassigned</option>{SLOT_OPTIONS.map(v=><option key={v} value={v}>{v} · {slotLabel(v)}</option>)}</select></Field></>}
        <Field label="Status"><select className="input" value={form.status} onChange={e=>update('status',e.target.value)}>{['scheduled','live','paused','completed','postponed','cancelled'].map(v=><option key={v} value={v}>{v[0].toUpperCase()+v.slice(1)}</option>)}</select></Field>
        <Field label={`Home team${form.stage !== 'group' && form.home_slot ? ` — eligible from ${slotLabel(form.home_slot)}` : ''}`}><TeamSelect side="home" options={homeTeams} /></Field>
        <Field label={`Away team${form.stage !== 'group' && form.away_slot ? ` — eligible from ${slotLabel(form.away_slot)}` : ''}`}><TeamSelect side="away" options={awayTeams} /></Field>
        <Field label="Stadium"><select className="input" value={form.venue_id} onChange={e=>update('venue_id',e.target.value)}><option value="">Choose stadium</option>{venues.map(v=><option key={v.id} value={v.id}>{v.name || v.stadium_name || v.city} · {v.city}</option>)}</select></Field>
        <Field label="Kickoff date and time"><input className="input" type="datetime-local" value={form.kickoff_time} onChange={e=>update('kickoff_time',e.target.value)} /></Field>
        <Field label="Live minute"><input className="input" type="number" min="0" max="130" value={form.live_minute} onChange={e=>update('live_minute',e.target.value)} /></Field>
        <Field label="Outcome"><select className="input" value={form.outcome_type} onChange={e=>update('outcome_type',e.target.value)}><option value="90mins">90 minutes</option><option value="et">Extra time</option><option value="penalties">Penalties</option></select></Field>
        <Field label="First goal"><select className="input" value={form.first_goal_band} onChange={e=>update('first_goal_band',e.target.value)}><option value="">Not set</option>{['0-15','16-30','31-45','46-60','61-75','76-90','no_goal'].map(v=><option key={v} value={v}>{v==='no_goal'?'No goal':`${v} mins`}</option>)}</select></Field>
        <Field label="External API ID"><input className="input" value={form.external_match_id} onChange={e=>update('external_match_id',e.target.value)} /></Field>
      </div>
      <div style={{ marginTop:'14px', padding:'14px', background:'var(--bg-secondary)', borderRadius:'12px' }}><div style={{ fontWeight:900, marginBottom:'10px' }}>Result details</div><div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:'10px' }}>{[['home_score','Home score'],['away_score','Away score'],['aet_home_score','AET home'],['aet_away_score','AET away']].map(([k,l])=><Field key={k} label={l}><input className="input" type="number" min="0" max="30" value={form[k]} onChange={e=>update(k,e.target.value)} /></Field>)}</div></div>
      <label style={{ display:'flex', gap:'9px', alignItems:'center', marginTop:'14px', fontWeight:800 }}><input type="checkbox" checked={form.use_manual_override} onChange={e=>update('use_manual_override',e.target.checked)} /> Protect manual changes from API overwrite</label>
      <div style={{ display:'flex', gap:'8px', position:'sticky', bottom:0, background:'var(--bg-card)', paddingTop:'14px', marginTop:'8px' }}><button className="btn btn-primary" style={{ flex:1 }} onClick={save} disabled={saving}>{saving?'Saving…':'Save all match changes'}</button><button className="btn btn-secondary" onClick={onClose}>Cancel</button></div>
    </div>
  </div>
}
