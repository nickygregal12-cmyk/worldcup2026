import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase.js'

const STAGES = [['group','Group predictions'],['bracket','Original bracket'],['ko','KO Predictor'],['awards','Awards & totals']]

export default function UserInspectorModal({ userId, users, onClose, onChanged, setActionResult, logAudit }) {
  const user = users.find(u => u.id === userId)
  const [tab, setTab] = useState('group')
  const [loading, setLoading] = useState(true)
  const [matches, setMatches] = useState([])
  const [groupPreds, setGroupPreds] = useState([])
  const [bracketPicks, setBracketPicks] = useState([])
  const [koPreds, setKoPreds] = useState([])
  const [awards, setAwards] = useState([])
  const [totals, setTotals] = useState([])
  const [players, setPlayers] = useState([])
  const [saving, setSaving] = useState({})

  const load = async () => {
    setLoading(true)
    const [matchRes, groupRes, bracketRes, koRes, awardRes, totalRes, playerRes] = await Promise.all([
      supabase.from('matches').select('id,match_number,stage,status,kickoff_time,home_score,away_score,home_team:home_team_id(id,name,short_code,flag_emoji),away_team:away_team_id(id,name,short_code,flag_emoji)').order('match_number'),
      supabase.from('predictions').select('*').eq('user_id',userId),
      supabase.from('knockout_picks').select('*,team:team_id(id,name,short_code,flag_emoji),home_team:home_team_id(id,name,short_code,flag_emoji),away_team:away_team_id(id,name,short_code,flag_emoji)').eq('user_id',userId).order('match_number'),
      supabase.from('ko_predictions').select('*').eq('user_id',userId),
      supabase.from('award_predictions').select('*').eq('user_id',userId),
      supabase.from('tournament_predictions').select('*').eq('user_id',userId),
      supabase.from('players').select('id,name,team:team_id(name,flag_emoji)').order('name'),
    ])
    setMatches(matchRes.data || []); setGroupPreds(groupRes.data || []); setBracketPicks(bracketRes.data || []); setKoPreds(koRes.data || []); setAwards(awardRes.data || []); setTotals(totalRes.data || []); setPlayers(playerRes.data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [userId])

  const groupMatches = useMemo(() => matches.filter(m=>m.stage==='group'),[matches])
  const koMatches = useMemo(() => matches.filter(m=>m.stage!=='group'),[matches])
  const byMatch = (rows,id) => rows.find(p=>p.match_id===id)
  const setBusy = (key,val) => setSaving(p=>({...p,[key]:val}))
  const notify = async message => supabase.from('profiles').update({ admin_message:message, admin_message_read:false }).eq('id',userId)

  const saveGroup = async (match, values) => {
    const key=`g-${match.id}`; setBusy(key,true)
    const payload={user_id:userId,match_id:match.id,home_score:Number(values.home),away_score:Number(values.away),is_confident:Boolean(values.joker),bracket_type:'main'}
    const {error}=await supabase.from('predictions').upsert(payload,{onConflict:'user_id,match_id,bracket_type'})
    if (!error && match.status==='completed') await supabase.rpc('calculate_prediction_points',{p_match_id:match.id})
    if (error) setActionResult(error.message); else { await logAudit('ADMIN_EDIT_GROUP_PREDICTION',{user_id:userId,match_id:match.id,...payload}); await notify(`An admin updated your prediction for Match ${match.match_number}.`); setActionResult(`Match ${match.match_number} prediction updated.`); await load(); onChanged() }
    setBusy(key,false)
  }
  const saveKo = async (match, values) => {
    const key=`ko-${match.id}`; setBusy(key,true)
    const payload={user_id:userId,match_id:match.id,home_score:Number(values.home),away_score:Number(values.away),outcome_type:values.outcome_type||'90mins',winner_team_id:values.winner_team_id||null,first_goal_band:values.first_goal_band||null,is_joker:Boolean(values.joker),bracket_type:'main'}
    const {error}=await supabase.from('ko_predictions').upsert(payload,{onConflict:'user_id,match_id,bracket_type'})
    if (!error && match.status==='completed') await supabase.rpc('calculate_ko_prediction_points',{p_match_id:match.id})
    if (error) setActionResult(error.message); else { const {count}=await supabase.from('ko_predictions').select('id',{count:'exact',head:true}).eq('user_id',userId).eq('is_joker',true); await supabase.from('profiles').update({ko_jokers_remaining:Math.max(0,5-(count||0))}).eq('id',userId); await logAudit('ADMIN_EDIT_KO_PREDICTION',{user_id:userId,match_id:match.id,...payload}); await notify(`An admin updated your KO Predictor pick for Match ${match.match_number}.`); setActionResult(`KO prediction for Match ${match.match_number} updated.`); await load(); onChanged() }
    setBusy(key,false)
  }
  const deleteKo = async match => { if(!confirm(`Remove this user's KO prediction for Match ${match.match_number}?`)) return; await supabase.from('ko_predictions').delete().eq('user_id',userId).eq('match_id',match.id); await logAudit('ADMIN_DELETE_KO_PREDICTION',{user_id:userId,match_id:match.id}); await load(); onChanged() }

  return <div style={{position:'fixed',inset:0,zIndex:1500,background:'rgba(0,0,0,.68)',display:'flex',justifyContent:'center',alignItems:'flex-start',padding:'18px',overflowY:'auto'}}>
    <div className="card" style={{width:'min(980px,100%)',marginTop:'10px',padding:0,overflow:'hidden'}}>
      <div style={{padding:'18px',background:'linear-gradient(135deg,#003087,#005eb8)',color:'white',display:'flex',justifyContent:'space-between',gap:'12px'}}><div><div style={{fontSize:'11px',opacity:.72,fontWeight:900,textTransform:'uppercase'}}>User control centre</div><h2 style={{margin:'4px 0 2px'}}>{user?.display_name||user?.username}</h2><div style={{fontSize:'12px',opacity:.72}}>@{user?.username} · {user?.total_points||0} points</div></div><button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button></div>
      <div style={{display:'flex',gap:'6px',padding:'10px 14px',overflowX:'auto',borderBottom:'1px solid var(--border-light)'}}>{STAGES.map(([k,l])=><button key={k} className="btn btn-sm" onClick={()=>setTab(k)} style={{whiteSpace:'nowrap',background:tab===k?'var(--scottish-navy)':'var(--bg-secondary)',color:tab===k?'white':'var(--text-secondary)'}}>{l}</button>)}</div>
      <div style={{padding:'14px',maxHeight:'72dvh',overflowY:'auto'}}>
        {loading ? <div style={{padding:'40px',display:'grid',placeItems:'center'}}><div className="spinner"/></div> : <>
          {tab==='group' && <div style={{display:'grid',gap:'8px'}}>{groupMatches.map(m=><PredictionRow key={m.id} match={m} pred={byMatch(groupPreds,m.id)} kind="group" saving={saving[`g-${m.id}`]} onSave={v=>saveGroup(m,v)} />)}</div>}
          {tab==='ko' && <div><div style={{padding:'10px 12px',background:'var(--accent-blue-light)',borderRadius:'10px',fontSize:'12px',marginBottom:'10px'}}>This is the live KO Predictor data, including score, winner, first-goal band and Joker. Original bracket picks are kept separately.</div><div style={{display:'grid',gap:'8px'}}>{koMatches.map(m=><PredictionRow key={m.id} match={m} pred={byMatch(koPreds,m.id)} kind="ko" saving={saving[`ko-${m.id}`]} onSave={v=>saveKo(m,v)} onDelete={()=>deleteKo(m)} />)}</div></div>}
          {tab==='bracket' && <div style={{display:'grid',gap:'8px'}}>{bracketPicks.length?bracketPicks.map(p=><BracketRow key={p.id} pick={p} userId={userId} reload={load} logAudit={logAudit} setActionResult={setActionResult}/>):<Empty text="No original knockout bracket picks saved."/>}</div>}
          {tab==='awards' && <AwardsEditor userId={userId} awards={awards} totals={totals} players={players} reload={load} logAudit={logAudit} setActionResult={setActionResult}/>} 
        </>}
      </div>
    </div>
  </div>
}

function PredictionRow({match,pred,kind,saving,onSave,onDelete}){
  const [v,setV]=useState({home:pred?.home_score??'',away:pred?.away_score??'',joker:Boolean(kind==='ko'?pred?.is_joker:pred?.is_confident),outcome_type:pred?.outcome_type||'90mins',winner_team_id:pred?.winner_team_id||'',first_goal_band:pred?.first_goal_band||''})
  useEffect(()=>setV({home:pred?.home_score??'',away:pred?.away_score??'',joker:Boolean(kind==='ko'?pred?.is_joker:pred?.is_confident),outcome_type:pred?.outcome_type||'90mins',winner_team_id:pred?.winner_team_id||'',first_goal_band:pred?.first_goal_band||''}),[pred?.id,pred?.home_score,pred?.away_score,pred?.is_joker,pred?.is_confident])
  const confirmed=match.home_team&&match.away_team
  return <div style={{padding:'12px',border:'1px solid var(--border-light)',borderRadius:'12px',background:'var(--bg-card)'}}>
    <div style={{display:'flex',justifyContent:'space-between',gap:'8px',marginBottom:'9px'}}><b>M{match.match_number} · {match.home_team?.flag_emoji}{match.home_team?.short_code||'TBC'} v {match.away_team?.short_code||'TBC'}{match.away_team?.flag_emoji}</b><span style={{fontSize:'10px',color:'var(--text-muted)'}}>{pred?`${pred.points_awarded||0} pts`:'No pick'}</span></div>
    <div style={{display:'grid',gridTemplateColumns:'70px 70px minmax(110px,1fr)',gap:'7px',alignItems:'center'}}><input className="input" type="number" min="0" value={v.home} onChange={e=>setV({...v,home:e.target.value})}/><input className="input" type="number" min="0" value={v.away} onChange={e=>setV({...v,away:e.target.value})}/><label style={{display:'flex',alignItems:'center',gap:'7px',fontWeight:800,fontSize:'12px'}}><input type="checkbox" checked={v.joker} onChange={e=>setV({...v,joker:e.target.checked})}/> 🃏 Joker</label></div>
    {kind==='ko'&&<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:'7px',marginTop:'8px'}}><select className="input" value={v.outcome_type} onChange={e=>setV({...v,outcome_type:e.target.value})}><option value="90mins">90 minutes</option><option value="et">Extra time</option><option value="penalties">Penalties</option></select><select className="input" value={v.winner_team_id} onChange={e=>setV({...v,winner_team_id:e.target.value})}><option value="">No winner selected</option>{[match.home_team,match.away_team].filter(Boolean).map(t=><option key={t.id} value={t.id}>{t.flag_emoji} {t.name}</option>)}</select><select className="input" value={v.first_goal_band} onChange={e=>setV({...v,first_goal_band:e.target.value})}><option value="">First goal not set</option>{['0-15','16-30','31-45','46-60','61-75','76-90','no_goal'].map(x=><option key={x} value={x}>{x==='no_goal'?'No goal':x}</option>)}</select></div>}
    <div style={{display:'flex',gap:'7px',marginTop:'9px'}}><button className="btn btn-primary btn-sm" disabled={!confirmed||v.home===''||v.away===''||saving} onClick={()=>onSave(v)}>{saving?'Saving…':pred?'Save changes':'Add prediction'}</button>{kind==='ko'&&pred&&<button className="btn btn-secondary btn-sm" onClick={onDelete}>Remove</button>}</div>
  </div>
}

function BracketRow({pick,userId,reload,logAudit,setActionResult}){
 const teams=[pick.home_team,pick.away_team].filter(Boolean); const [team,setTeam]=useState(pick.winner_team_id||pick.team_id||'')
 const save=async()=>{const {error}=await supabase.from('knockout_picks').update({team_id:team,winner_team_id:team}).eq('user_id',userId).eq('match_number',pick.match_number); if(error)return setActionResult(error.message); await logAudit('ADMIN_EDIT_BRACKET_PICK',{user_id:userId,match_number:pick.match_number,team_id:team}); setActionResult(`Bracket pick M${pick.match_number} updated.`); reload()}
 return <div style={{padding:'12px',border:'1px solid var(--border-light)',borderRadius:'12px'}}><b>M{pick.match_number} · {pick.stage?.toUpperCase()}</b><div style={{display:'flex',gap:'7px',marginTop:'8px'}}><select className="input" value={team} onChange={e=>setTeam(e.target.value)}><option value="">No selection</option>{teams.map(t=><option key={t.id} value={t.id}>{t.flag_emoji} {t.name}</option>)}</select><button className="btn btn-primary btn-sm" onClick={save}>Save</button></div></div>
}

function AwardsEditor({userId,awards,totals,players,reload,logAudit,setActionResult}){
 const defs=[['golden_boot','Golden Boot'],['golden_glove','Golden Glove'],['player_of_tournament','Player of tournament']]
 return <div style={{display:'grid',gap:'9px'}}>{defs.map(([key,label])=><AwardRow key={key} userId={userId} type={key} label={label} current={awards.find(a=>a.award_type===key)?.predicted_player_name||''} players={players} reload={reload} logAudit={logAudit} setActionResult={setActionResult}/>)}<TotalRow userId={userId} current={totals.find(t=>t.prediction_type==='total_goals')?.int_value??''} reload={reload} logAudit={logAudit} setActionResult={setActionResult}/></div>
}
function AwardRow({userId,type,label,current,players,reload,logAudit,setActionResult}){const [value,setValue]=useState(current); return <div style={{padding:'12px',border:'1px solid var(--border-light)',borderRadius:'12px'}}><b>{label}</b><div style={{display:'flex',gap:'7px',marginTop:'8px'}}><input className="input" list={`players-${type}`} value={value} onChange={e=>setValue(e.target.value)}/><datalist id={`players-${type}`}>{players.map(p=><option key={p.id} value={p.name}/>)}</datalist><button className="btn btn-primary btn-sm" onClick={async()=>{await supabase.from('award_predictions').upsert({user_id:userId,award_type:type,predicted_player_name:value,bracket_type:'main'},{onConflict:'user_id,award_type,bracket_type'});await logAudit('ADMIN_EDIT_AWARD',{user_id:userId,award_type:type,value});setActionResult(`${label} updated.`);reload()}}>Save</button></div></div>}
function TotalRow({userId,current,reload,logAudit,setActionResult}){const [value,setValue]=useState(current);return <div style={{padding:'12px',border:'1px solid var(--border-light)',borderRadius:'12px'}}><b>Total tournament goals</b><div style={{display:'flex',gap:'7px',marginTop:'8px'}}><input className="input" type="number" value={value} onChange={e=>setValue(e.target.value)}/><button className="btn btn-primary btn-sm" onClick={async()=>{await supabase.from('tournament_predictions').upsert({user_id:userId,prediction_type:'total_goals',int_value:Number(value)},{onConflict:'user_id,prediction_type,team_id'});await logAudit('ADMIN_EDIT_TOTAL_GOALS',{user_id:userId,value});setActionResult('Total goals prediction updated.');reload()}}>Save</button></div></div>}
function Empty({text}){return <div style={{padding:'28px',textAlign:'center',color:'var(--text-muted)'}}>{text}</div>}
