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

const sectionStyle = {
  padding: '14px',
  borderRadius: '14px',
  border: '1px solid var(--border-light)',
  background: 'var(--bg-secondary)',
}

export default function MatchFixtureEditor({ match, teams, groups, venues, onClose, onSaved, setActionResult, logAudit }) {
  const def = DEFAULT_DEF.get(Number(match.match_number)) || {}
  const [form, setForm] = useState({
    match_number: match.match_number ?? '',
    stage: match.stage || 'group',
    group_id: match.group_id || '',
    home_team_id: match.home_team_id || '',
    away_team_id: match.away_team_id || '',
    venue_id: match.venue_id || '',
    kickoff_time: toLocalInput(match.kickoff_time),
    status: match.status || 'scheduled',
    live_minute: match.live_minute ?? '',
    home_score: match.home_score ?? '',
    away_score: match.away_score ?? '',
    aet_home_score: match.aet_home_score ?? match.home_score_aet ?? '',
    aet_away_score: match.aet_away_score ?? match.away_score_aet ?? '',
    home_score_pens: match.home_score_pens ?? '',
    away_score_pens: match.away_score_pens ?? '',
    winner_team_id: match.winner_team_id || '',
    outcome_type: match.outcome_type || '90mins',
    first_goal_band: match.first_goal_band === '0-15' ? '1-15' : (match.first_goal_band || ''),
    external_match_id: match.external_match_id || '',
    use_manual_override: match.use_manual_override ?? true,
    home_slot: def.home_slot || '',
    away_slot: def.away_slot || '',
  })
  const [teamGroups, setTeamGroups] = useState({})
  const [savingMode, setSavingMode] = useState('')

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }))
  const num = value => value === '' ? null : Number(value)
  const isKo = form.stage !== 'group'
  const isCompleted = match.status === 'completed'

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

  const validateTeams = () => {
    if (form.home_team_id && form.away_team_id && form.home_team_id === form.away_team_id) {
      setActionResult('Home and away team cannot be the same.')
      return false
    }
    return true
  }

  const deriveWinner = ({ home90, away90, aetHome, aetAway, pensHome, pensAway }) => {
    if (!isKo) return null
    if (form.outcome_type === '90mins') return home90 > away90 ? form.home_team_id : form.away_team_id
    if (form.outcome_type === 'et') return aetHome > aetAway ? form.home_team_id : form.away_team_id
    return pensHome > pensAway ? form.home_team_id : form.away_team_id
  }

  const validateFinalResult = ({ home90, away90, aetHome, aetAway, pensHome, pensAway }) => {
    if (home90 === null || away90 === null) {
      setActionResult('Enter the score after 90 minutes for both teams.')
      return false
    }

    if (!isKo) return true

    if (!form.home_team_id || !form.away_team_id) {
      setActionResult('Both knockout teams must be confirmed before completing the match.')
      return false
    }

    if (form.outcome_type === '90mins' && home90 === away90) {
      setActionResult('A knockout match cannot finish level after 90 minutes. Select Extra time or Penalties.')
      return false
    }

    if (form.outcome_type === 'et') {
      if (home90 !== away90) {
        setActionResult('Extra time requires the score after 90 minutes to be level.')
        return false
      }
      if (aetHome === null || aetAway === null || aetHome === aetAway) {
        setActionResult('Enter a non-level score after 120 minutes for an extra-time result.')
        return false
      }
    }

    if (form.outcome_type === 'penalties') {
      if (home90 !== away90) {
        setActionResult('Penalties require the score after 90 minutes to be level.')
        return false
      }
      if (aetHome === null || aetAway === null || aetHome !== aetAway) {
        setActionResult('A penalty shootout requires the score after 120 minutes to be level.')
        return false
      }
      if (pensHome === null || pensAway === null || pensHome === pensAway) {
        setActionResult('Enter a non-level penalty shootout score.')
        return false
      }
    }

    return true
  }

  const basePayload = () => ({
    match_number: Number(form.match_number),
    stage: form.stage,
    group_id: form.stage === 'group' ? (form.group_id || null) : null,
    home_team_id: form.home_team_id || null,
    away_team_id: form.away_team_id || null,
    venue_id: form.venue_id || null,
    kickoff_time: form.kickoff_time ? new Date(form.kickoff_time).toISOString() : null,
    status: form.status,
    live_minute: num(form.live_minute),
    external_match_id: form.external_match_id ? String(form.external_match_id) : null,
    use_manual_override: Boolean(form.use_manual_override),
  })

  const saveSlots = async (matchNumber) => {
    if (form.stage === 'group') return null
    const { error } = await supabase.from('app_settings').upsert({
      key: `ko_slot_override_${matchNumber}`,
      value: JSON.stringify({ home_slot: form.home_slot, away_slot: form.away_slot }),
    }, { onConflict: 'key' })
    return error
  }

  const saveFixtureDetails = async () => {
    if (!validateTeams()) return
    setSavingMode('details')

    const payload = basePayload()
    const { error } = await supabase.from('matches').update(payload).eq('id', match.id)
    if (error) {
      setSavingMode('')
      setActionResult(`Fixture details failed to save: ${error.message}`)
      return
    }

    const slotError = await saveSlots(payload.match_number)
    await logAudit('EDIT_MATCH_FIXTURE_DETAILS', {
      match_id: match.id,
      match_number: payload.match_number,
      changes: payload,
      slots: { home_slot: form.home_slot, away_slot: form.away_slot },
      slot_error: slotError?.message || null,
    })

    setActionResult(slotError
      ? `Match ${payload.match_number} details saved, but bracket slots failed: ${slotError.message}`
      : `Match ${payload.match_number} fixture details saved.`)

    await onSaved()
    setSavingMode('')
    onClose()
  }


  const saveLiveUpdate = async () => {
    if (!validateTeams()) return

    const homeScore = num(form.home_score)
    const awayScore = num(form.away_score)
    const liveMinute = num(form.live_minute)

    if (homeScore === null || awayScore === null) {
      setActionResult('Enter the current live score for both teams.')
      return
    }

    if (!form.home_team_id || !form.away_team_id) {
      setActionResult('Both teams must be confirmed before saving a live score.')
      return
    }

    setSavingMode('live')

    const payload = {
      ...basePayload(),
      status: 'live',
      live_minute: liveMinute,
      home_score: homeScore,
      away_score: awayScore,
      winner_team_id: null,
      first_goal_band: form.first_goal_band || null,
      use_manual_override: true,
    }

    const { error } = await supabase.from('matches').update(payload).eq('id', match.id)
    if (error) {
      setSavingMode('')
      setActionResult(`Live score failed to save: ${error.message}`)
      return
    }

    const slotError = await saveSlots(payload.match_number)
    await logAudit('UPDATE_LIVE_MATCH', {
      match_id: match.id,
      match_number: payload.match_number,
      live_score: `${homeScore}-${awayScore}`,
      live_minute: liveMinute,
      first_goal_band: payload.first_goal_band,
      slot_error: slotError?.message || null,
    })

    setActionResult(slotError
      ? `Live score saved for Match ${payload.match_number}, but bracket slots failed: ${slotError.message}`
      : `Match ${payload.match_number} live score updated to ${homeScore}-${awayScore}${liveMinute !== null ? ` at ${liveMinute} minutes` : ''}. No final points were awarded.`)

    await onSaved()
    setSavingMode('')
    onClose()
  }

  const completeAndCalculate = async () => {
    if (!validateTeams()) return

    const home90 = num(form.home_score)
    const away90 = num(form.away_score)
    const aetHome = num(form.aet_home_score)
    const aetAway = num(form.aet_away_score)
    const pensHome = num(form.home_score_pens)
    const pensAway = num(form.away_score_pens)

    if (!validateFinalResult({ home90, away90, aetHome, aetAway, pensHome, pensAway })) return

    const winnerId = deriveWinner({ home90, away90, aetHome, aetAway, pensHome, pensAway })
    setSavingMode('result')

    const payload = {
      ...basePayload(),
      status: 'completed',
      live_minute: null,
      home_score: home90,
      away_score: away90,
      aet_home_score: isKo && form.outcome_type !== '90mins' ? aetHome : null,
      aet_away_score: isKo && form.outcome_type !== '90mins' ? aetAway : null,
      home_score_aet: isKo && form.outcome_type !== '90mins' ? aetHome : null,
      away_score_aet: isKo && form.outcome_type !== '90mins' ? aetAway : null,
      home_score_pens: isKo && form.outcome_type === 'penalties' ? pensHome : null,
      away_score_pens: isKo && form.outcome_type === 'penalties' ? pensAway : null,
      winner_team_id: isKo ? winnerId : (home90 > away90 ? form.home_team_id : away90 > home90 ? form.away_team_id : null),
      outcome_type: isKo ? form.outcome_type : '90mins',
      first_goal_band: form.first_goal_band || null,
      use_manual_override: true,
    }

    const { error } = await supabase.from('matches').update(payload).eq('id', match.id)
    if (error) {
      setSavingMode('')
      setActionResult(`Final result failed to save: ${error.message}`)
      return
    }

    const slotError = await saveSlots(payload.match_number)
    const followUpErrors = []
    if (slotError) followUpErrors.push(`bracket slots: ${slotError.message}`)

    if (isKo) {
      const { error: originalKoErr } = await supabase.rpc('calculate_knockout_points', { p_match_id: match.id })
      if (originalKoErr) followUpErrors.push(`original tournament KO: ${originalKoErr.message}`)

      const { error: koPredictorErr } = await supabase.rpc('calculate_ko_prediction_points', { p_match_id: match.id })
      if (koPredictorErr) followUpErrors.push(`KO Predictor: ${koPredictorErr.message}`)
    } else {
      const { error: groupErr } = await supabase.rpc('calculate_prediction_points', { p_match_id: match.id })
      if (groupErr) followUpErrors.push(`group match points: ${groupErr.message}`)

      const { error: bonusErr } = await supabase.rpc('check_group_bonuses', { p_match_id: match.id })
      if (bonusErr && !String(bonusErr.message || '').toLowerCase().includes('function')) {
        followUpErrors.push(`group bonuses: ${bonusErr.message}`)
      }
    }

    const { data: profiles, error: profilesErr } = await supabase.from('profiles').select('id')
    if (profilesErr) {
      followUpErrors.push(`profile totals: ${profilesErr.message}`)
    } else {
      for (const profile of profiles || []) {
        const { error: totalErr } = await supabase.rpc('recalculate_user_total_points', { p_user_id: profile.id })
        if (totalErr) {
          followUpErrors.push(`total points for ${profile.id}: ${totalErr.message}`)
          break
        }
      }
    }

    await logAudit('COMPLETE_MATCH_AND_CALCULATE', {
      match_id: match.id,
      match_number: payload.match_number,
      result: payload,
      slots: { home_slot: form.home_slot, away_slot: form.away_slot },
      follow_up_errors: followUpErrors,
    })

    setActionResult(followUpErrors.length
      ? `Match ${payload.match_number} completed, but follow-up failed: ${followUpErrors.join(' · ')}`
      : `Match ${payload.match_number} completed — all relevant points recalculated.`)

    await onSaved()
    setSavingMode('')
    onClose()
  }

  const Field = ({ label, children }) => <label><span className="admin-field-label">{label}</span>{children}</label>
  const TeamSelect = ({ side, options }) => (
    <select className="input" value={form[`${side}_team_id`]} onChange={e => update(`${side}_team_id`, e.target.value)}>
      <option value="">Use bracket slot / TBC</option>
      {options.map(t => <option key={t.id} value={t.id}>{t.flag_emoji || ''} {t.name}</option>)}
    </select>
  )

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1400, background:'rgba(0,0,0,.62)', display:'flex', alignItems:'flex-end', justifyContent:'center' }} onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="card" style={{ width:'min(860px,100%)', maxHeight:'94dvh', overflowY:'auto', borderRadius:'20px 20px 0 0', padding:'18px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
          <div>
            <div style={{ fontSize:'10px', color:'var(--text-muted)', fontWeight:900, textTransform:'uppercase' }}>Single match control</div>
            <h2 style={{ margin:'4px 0 0' }}>Match {match.match_number}</h2>
            <div style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:'3px' }}>Fixture setup and final scoring are managed here. There is no separate quick-score entry.</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
        </div>

        <div style={{ ...sectionStyle, marginBottom:'14px' }}>
          <div style={{ fontWeight:900, marginBottom:'3px' }}>1. Match details</div>
          <div style={{ fontSize:'11px', color:'var(--text-muted)', marginBottom:'12px' }}>Use this section for teams, bracket slots, venue, kickoff, API ID and live status.</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))', gap:'12px' }}>
            <Field label="Match number"><input className="input" type="number" value={form.match_number} onChange={e=>update('match_number',e.target.value)} /></Field>
            <Field label="Stage"><select className="input" value={form.stage} onChange={e=>update('stage',e.target.value)}>{[['group','Group stage'],['r32','Round of 32'],['r16','Round of 16'],['qf','Quarter-final'],['sf','Semi-final'],['3rd','Third place'],['final','Final']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field>
            <Field label="Group"><select className="input" disabled={form.stage!=='group'} value={form.group_id} onChange={e=>update('group_id',e.target.value)}><option value="">No group</option>{groups.map(g=><option key={g.id} value={g.id}>Group {g.name}</option>)}</select></Field>
            {form.stage !== 'group' && <>
              <Field label="Home bracket slot"><select className="input" value={form.home_slot} onChange={e=>{update('home_slot',e.target.value);update('home_team_id','')}}><option value="">Unassigned</option>{SLOT_OPTIONS.map(v=><option key={v} value={v}>{v} · {slotLabel(v)}</option>)}</select></Field>
              <Field label="Away bracket slot"><select className="input" value={form.away_slot} onChange={e=>{update('away_slot',e.target.value);update('away_team_id','')}}><option value="">Unassigned</option>{SLOT_OPTIONS.map(v=><option key={v} value={v}>{v} · {slotLabel(v)}</option>)}</select></Field>
            </>}
            <Field label={`Home team${form.stage !== 'group' && form.home_slot ? ` — eligible from ${slotLabel(form.home_slot)}` : ''}`}><TeamSelect side="home" options={homeTeams} /></Field>
            <Field label={`Away team${form.stage !== 'group' && form.away_slot ? ` — eligible from ${slotLabel(form.away_slot)}` : ''}`}><TeamSelect side="away" options={awayTeams} /></Field>
            <Field label="Stadium"><select className="input" value={form.venue_id} onChange={e=>update('venue_id',e.target.value)}><option value="">Choose stadium</option>{venues.map(v=><option key={v.id} value={v.id}>{v.name || v.stadium_name || v.city} · {v.city}</option>)}</select></Field>
            <Field label="Kickoff date and time"><input className="input" type="datetime-local" value={form.kickoff_time} onChange={e=>update('kickoff_time',e.target.value)} /></Field>
            <Field label="Current status"><select className="input" value={form.status} onChange={e=>update('status',e.target.value)}>{['scheduled','live','paused','postponed','cancelled','completed'].map(v=><option key={v} value={v}>{v[0].toUpperCase()+v.slice(1)}</option>)}</select></Field>
            <Field label="Live minute"><input className="input" type="number" min="0" max="130" value={form.live_minute} onChange={e=>update('live_minute',e.target.value)} /></Field>
            <Field label="External API ID"><input className="input" value={form.external_match_id} onChange={e=>update('external_match_id',e.target.value)} /></Field>
          </div>
          <label style={{ display:'flex', gap:'9px', alignItems:'center', marginTop:'14px', fontWeight:800 }}>
            <input type="checkbox" checked={form.use_manual_override} onChange={e=>update('use_manual_override',e.target.checked)} /> Protect manual changes from API overwrite
          </label>
          <button className="btn btn-secondary" style={{ width:'100%', marginTop:'12px' }} onClick={saveFixtureDetails} disabled={Boolean(savingMode)}>
            {savingMode === 'details' ? 'Saving fixture details…' : 'Save fixture details only'}
          </button>
        </div>

        <div style={{ ...sectionStyle, border:'1px solid rgba(0,48,135,.25)', background:'rgba(0,48,135,.04)' }}>
          <div style={{ fontWeight:900, marginBottom:'3px' }}>2. Score control</div>
          <div style={{ fontSize:'11px', color:'var(--text-muted)', marginBottom:'12px' }}>
            Use these score fields for both live updates and the final result. Updating a live score does not award points. Completing the match saves the final result and recalculates every relevant points system.
          </div>

          {isKo && (
            <div style={{ marginBottom:'12px' }}>
              <Field label="How was the match decided?"><select className="input" value={form.outcome_type} onChange={e=>update('outcome_type',e.target.value)}><option value="90mins">90 minutes</option><option value="et">Extra time</option><option value="penalties">Penalties</option></select></Field>
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:'10px' }}>
            {[['home_score','Current / 90 mins · home'],['away_score','Current / 90 mins · away']].map(([k,l])=><Field key={k} label={l}><input className="input" type="number" min="0" max="30" value={form[k]} onChange={e=>update(k,e.target.value)} /></Field>)}
            {isKo && form.outcome_type !== '90mins' && [['aet_home_score','120 mins · home'],['aet_away_score','120 mins · away']].map(([k,l])=><Field key={k} label={l}><input className="input" type="number" min="0" max="30" value={form[k]} onChange={e=>update(k,e.target.value)} /></Field>)}
            {isKo && form.outcome_type === 'penalties' && [['home_score_pens','Shootout · home'],['away_score_pens','Shootout · away']].map(([k,l])=><Field key={k} label={l}><input className="input" type="number" min="0" max="30" value={form[k]} onChange={e=>update(k,e.target.value)} /></Field>)}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))', gap:'10px', marginTop:'10px' }}>
            <Field label="First-goal band"><select className="input" value={form.first_goal_band} onChange={e=>update('first_goal_band',e.target.value)}><option value="">Not set</option>{['1-15','16-30','31-45','46-60','61-75','76-90','et','no_goal'].map(v=><option key={v} value={v}>{v==='no_goal'?'No goal':v==='et'?'Extra time':`${v} mins`}</option>)}</select></Field>
            {isKo && (
              <Field label="Advancing team (calculated from the scores)">
                <select className="input" value={deriveWinner({ home90:num(form.home_score), away90:num(form.away_score), aetHome:num(form.aet_home_score), aetAway:num(form.aet_away_score), pensHome:num(form.home_score_pens), pensAway:num(form.away_score_pens) }) || ''} disabled>
                  <option value="">Complete the relevant scores</option>
                  {teams.filter(t=>[form.home_team_id,form.away_team_id].includes(t.id)).map(t=><option key={t.id} value={t.id}>{t.flag_emoji || ''} {t.name}</option>)}
                </select>
              </Field>
            )}
          </div>

          {form.status !== 'completed' && (
            <div style={{ padding:'10px 12px', borderRadius:'10px', background:'rgba(21,88,176,.06)', border:'1px solid rgba(21,88,176,.20)', marginTop:'12px', fontSize:'11px', color:'var(--text-muted)', lineHeight:1.5 }}>
              <b style={{ color:'var(--text-primary)' }}>Live update:</b> save the current score, minute and first-goal band without completing the match or awarding final points.
              <button className="btn btn-secondary" style={{ width:'100%', marginTop:'10px' }} onClick={saveLiveUpdate} disabled={Boolean(savingMode)}>
                {savingMode === 'live' ? 'Saving live score…' : 'Update live score'}
              </button>
            </div>
          )}

          <div style={{ padding:'10px 12px', borderRadius:'10px', background:'var(--bg-card)', border:'1px solid var(--border-light)', marginTop:'12px', fontSize:'11px', color:'var(--text-muted)', lineHeight:1.5 }}>
            <b style={{ color:'var(--text-primary)' }}>Final result:</b> save the complete result, set the match to completed, calculate original tournament points, calculate KO Predictor points for knockout matches, and rebuild user totals.
          </div>

          <button className="btn btn-primary" style={{ width:'100%', marginTop:'12px' }} onClick={completeAndCalculate} disabled={Boolean(savingMode)}>
            {savingMode === 'result'
              ? 'Completing match and calculating points…'
              : isCompleted
                ? 'Save corrected result and recalculate all points'
                : 'Complete match and calculate all points'}
          </button>
        </div>

        <div style={{ display:'flex', justifyContent:'flex-end', position:'sticky', bottom:0, background:'var(--bg-card)', paddingTop:'14px', marginTop:'8px' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
