import { useState } from 'react'
import { supabase } from '../../lib/supabase.js'

const toLocalInput = (value) => {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16)
}

export default function MatchFixtureEditor({ match, teams, groups, venues, onClose, onSaved, setActionResult, logAudit }) {
  const [form, setForm] = useState({
    match_number: match.match_number ?? '', stage: match.stage || 'group', group_id: match.group_id || '',
    home_team_id: match.home_team_id || '', away_team_id: match.away_team_id || '', venue_id: match.venue_id || '',
    kickoff_time: toLocalInput(match.kickoff_time), status: match.status || 'scheduled', live_minute: match.live_minute ?? '',
    home_score: match.home_score ?? '', away_score: match.away_score ?? '', aet_home_score: match.aet_home_score ?? '',
    aet_away_score: match.aet_away_score ?? '',
    outcome_type: match.outcome_type || '90mins', first_goal_band: match.first_goal_band || '',
    external_match_id: match.external_match_id || '', use_manual_override: match.use_manual_override ?? true,
  })
  const [saving, setSaving] = useState(false)
  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }))
  const num = value => value === '' ? null : Number(value)

  const save = async () => {
    if (!form.home_team_id || !form.away_team_id) return setActionResult('Choose both teams before saving.')
    if (form.home_team_id === form.away_team_id) return setActionResult('Home and away team cannot be the same.')
    setSaving(true)
    const payload = {
      match_number: Number(form.match_number), stage: form.stage,
      group_id: form.stage === 'group' ? (form.group_id || null) : null,
      home_team_id: form.home_team_id, away_team_id: form.away_team_id, venue_id: form.venue_id || null,
      kickoff_time: form.kickoff_time ? new Date(form.kickoff_time).toISOString() : null,
      status: form.status, live_minute: num(form.live_minute), home_score: num(form.home_score), away_score: num(form.away_score),
      aet_home_score: num(form.aet_home_score), aet_away_score: num(form.aet_away_score),
      outcome_type: form.outcome_type || null, first_goal_band: form.first_goal_band || null,
      external_match_id: form.external_match_id ? String(form.external_match_id) : null,
      use_manual_override: Boolean(form.use_manual_override),
    }
    const { error } = await supabase.from('matches').update(payload).eq('id', match.id)
    if (error) { setSaving(false); return setActionResult(`Fixture save failed: ${error.message}`) }
    await logAudit('EDIT_MATCH_FIXTURE', { match_id: match.id, match_number: payload.match_number, changes: payload })
    setActionResult(`Match ${payload.match_number} updated.`)
    await onSaved()
    setSaving(false)
    onClose()
  }

  const Field = ({ label, children }) => <label><span className="admin-field-label">{label}</span>{children}</label>
  return (
    <div style={{ position:'fixed', inset:0, zIndex:1400, background:'rgba(0,0,0,.62)', display:'flex', alignItems:'flex-end', justifyContent:'center' }} onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="card" style={{ width:'min(820px,100%)', maxHeight:'94dvh', overflowY:'auto', borderRadius:'20px 20px 0 0', padding:'18px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
          <div><div style={{ fontSize:'10px', color:'var(--text-muted)', fontWeight:900, textTransform:'uppercase' }}>Tournament match control</div><h2 style={{ margin:'4px 0 0' }}>Match {match.match_number}</h2></div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))', gap:'12px' }}>
          <Field label="Match number"><input className="input" type="number" value={form.match_number} onChange={e=>update('match_number',e.target.value)} /></Field>
          <Field label="Stage"><select className="input" value={form.stage} onChange={e=>update('stage',e.target.value)}>{[['group','Group stage'],['r32','Round of 32'],['r16','Round of 16'],['qf','Quarter-final'],['sf','Semi-final'],['3rd','Third place'],['final','Final']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field>
          <Field label="Group"><select className="input" disabled={form.stage!=='group'} value={form.group_id} onChange={e=>update('group_id',e.target.value)}><option value="">No group</option>{groups.map(g=><option key={g.id} value={g.id}>Group {g.name}</option>)}</select></Field>
          <Field label="Status"><select className="input" value={form.status} onChange={e=>update('status',e.target.value)}>{['scheduled','live','paused','completed','postponed','cancelled'].map(v=><option key={v} value={v}>{v[0].toUpperCase()+v.slice(1)}</option>)}</select></Field>
          <Field label="Home team"><select className="input" value={form.home_team_id} onChange={e=>update('home_team_id',e.target.value)}><option value="">Choose team</option>{teams.map(t=><option key={t.id} value={t.id}>{t.flag_emoji || ''} {t.name}</option>)}</select></Field>
          <Field label="Away team"><select className="input" value={form.away_team_id} onChange={e=>update('away_team_id',e.target.value)}><option value="">Choose team</option>{teams.map(t=><option key={t.id} value={t.id}>{t.flag_emoji || ''} {t.name}</option>)}</select></Field>
          <Field label="Stadium"><select className="input" value={form.venue_id} onChange={e=>update('venue_id',e.target.value)}><option value="">Choose stadium</option>{venues.map(v=><option key={v.id} value={v.id}>{v.name || v.stadium_name || v.city} · {v.city}</option>)}</select></Field>
          <Field label="Kickoff date and time"><input className="input" type="datetime-local" value={form.kickoff_time} onChange={e=>update('kickoff_time',e.target.value)} /></Field>
          <Field label="Live minute"><input className="input" type="number" min="0" max="130" value={form.live_minute} onChange={e=>update('live_minute',e.target.value)} /></Field>
          <Field label="Outcome"><select className="input" value={form.outcome_type} onChange={e=>update('outcome_type',e.target.value)}><option value="90mins">90 minutes</option><option value="et">Extra time</option><option value="penalties">Penalties</option></select></Field>
          <Field label="First goal"><select className="input" value={form.first_goal_band} onChange={e=>update('first_goal_band',e.target.value)}><option value="">Not set</option>{['0-15','16-30','31-45','46-60','61-75','76-90','no_goal'].map(v=><option key={v} value={v}>{v==='no_goal'?'No goal':`${v} mins`}</option>)}</select></Field>
          <Field label="External API ID"><input className="input" value={form.external_match_id} onChange={e=>update('external_match_id',e.target.value)} /></Field>
        </div>
        <div style={{ marginTop:'14px', padding:'14px', background:'var(--bg-secondary)', borderRadius:'12px' }}>
          <div style={{ fontWeight:900, marginBottom:'10px' }}>Result details</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:'10px' }}>
            {[['home_score','Home score'],['away_score','Away score'],['aet_home_score','AET home'],['aet_away_score','AET away']].map(([k,l])=><Field key={k} label={l}><input className="input" type="number" min="0" max="30" value={form[k]} onChange={e=>update(k,e.target.value)} /></Field>)}
          </div>
        </div>
        <label style={{ display:'flex', gap:'9px', alignItems:'center', marginTop:'14px', fontWeight:800 }}><input type="checkbox" checked={form.use_manual_override} onChange={e=>update('use_manual_override',e.target.checked)} /> Protect manual changes from API overwrite</label>
        <div style={{ display:'flex', gap:'8px', position:'sticky', bottom:0, background:'var(--bg-card)', paddingTop:'14px', marginTop:'8px' }}><button className="btn btn-primary" style={{ flex:1 }} onClick={save} disabled={saving}>{saving?'Saving…':'Save all match changes'}</button><button className="btn btn-secondary" onClick={onClose}>Cancel</button></div>
      </div>
    </div>
  )
}
