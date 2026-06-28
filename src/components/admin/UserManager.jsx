import { useMemo, useState } from 'react'
import { ALL_STAGES, calcPredictedStandings, resolveSlot } from '../../lib/bracketUtils.js'

export default function UserManager({ admin }) {
  const {
    filteredUsers, userSearch, setUserSearch, fmt, setEditingUserPreds, loadUserPredictions,
    pointAdjUser, setPointAdjUser, pointAdjAmount, setPointAdjAmount, pointAdjReason, setPointAdjReason,
    applyPointAdjustment, setConfirmAction, sendBanWarning, unbanUser, makeLeagueAdmin,
    removeLeagueAdmin, makeAdmin, supabase, logAudit, loadUsers, setActionResult,
  } = admin
  const [accountOpen, setAccountOpen] = useState(null)
  const [scanLoading, setScanLoading] = useState(false)
  const [bracketIssues, setBracketIssues] = useState({})
  const [issuesOnly, setIssuesOnly] = useState(false)
  const [showLegacyWarnings, setShowLegacyWarnings] = useState(false)

  const visibleUsers = useMemo(
    () => {
      if (!issuesOnly) return filteredUsers
      return filteredUsers.filter(u => {
        const issue = bracketIssues[u.id]
        if (!issue) return false
        return issue.criticalCount > 0 || (showLegacyWarnings && issue.legacyCount > 0)
      })
    },
    [filteredUsers, issuesOnly, showLegacyWarnings, bracketIssues]
  )

  const fetchAll = async (table, select) => {
    const rows = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from(table).select(select).range(from, from + 999)
      if (error) throw error
      rows.push(...(data || []))
      if (!data || data.length < 1000) break
    }
    return rows
  }

  const scanBracketHealth = async () => {
    setScanLoading(true)
    try {
      const [matches, predictions, picks] = await Promise.all([
        fetchAll('matches', 'id,match_number,stage,home_team_id,away_team_id,group:group_id(name),home_team:home_team_id(id,name,short_code,flag_emoji),away_team:away_team_id(id,name,short_code,flag_emoji)'),
        fetchAll('predictions', 'user_id,match_id,home_score,away_score'),
        fetchAll('knockout_picks', 'id,user_id,match_number,stage,home_team_id,away_team_id,winner_team_id,team_id,team:team_id(id,name,short_code,flag_emoji),home_team:home_team_id(id,name,short_code,flag_emoji),away_team:away_team_id(id,name,short_code,flag_emoji)'),
      ])
      const groupMatches = matches.filter(m => m.stage === 'group')
      const predsByUser = {}
      predictions.forEach(p => {
        if (p.home_score == null || p.away_score == null) return
        if (!predsByUser[p.user_id]) predsByUser[p.user_id] = {}
        predsByUser[p.user_id][p.match_id] = { home: p.home_score, away: p.away_score }
      })
      const picksByUser = {}
      picks.forEach(p => {
        if (!picksByUser[p.user_id]) picksByUser[p.user_id] = {}
        picksByUser[p.user_id][Number(p.match_number)] = p
      })
      const next = {}
      for (const u of filteredUsers) {
        const userPicks = picksByUser[u.id] || {}
        if (!Object.keys(userPicks).length) continue
        const predMap = predsByUser[u.id] || {}
        const standings = calcPredictedStandings(groupMatches, predMap, true)
        const teamsById = {}
        matches.forEach(m => { if(m.home_team?.id) teamsById[m.home_team.id]=m.home_team; if(m.away_team?.id) teamsById[m.away_team.id]=m.away_team })
        Object.values(userPicks).forEach(p => { if(p.team?.id) teamsById[p.team.id]=p.team; if(p.home_team?.id) teamsById[p.home_team.id]=p.home_team; if(p.away_team?.id) teamsById[p.away_team.id]=p.away_team })
        const resolve = slot => {
          if (slot?.startsWith('W')) { const p=userPicks[Number(slot.slice(1))]; return p?.winner_team_id ? teamsById[p.winner_team_id] || p.team || null : null }
          if (slot?.startsWith('L')) return null
          return resolveSlot(slot, standings, groupMatches, predMap)
        }
        const critical=[]
        const legacy=[]
        const pickNumbers = Object.keys(userPicks).map(Number).filter(Number.isFinite)
        if (pickNumbers.length > 0 && pickNumbers.length < 31) {
          critical.push(`Bracket incomplete: ${pickNumbers.length}/31 picks saved`)
        }
        ALL_STAGES.forEach(stage => stage.matches.forEach(def => {
          const p=userPicks[def.match_number]
          if(!p) return
          const home=resolve(def.home_slot), away=resolve(def.away_slot)
          if(home&&away){
            if(p.winner_team_id && ![home.id,away.id].includes(p.winner_team_id)) critical.push(`M${def.match_number}: saved winner is outside the reconstructed matchup`)
            if(!p.winner_team_id) critical.push(`M${def.match_number}: winner is missing`)
            if((p.home_team_id&&p.home_team_id!==home.id)||(p.away_team_id&&p.away_team_id!==away.id)) legacy.push(`M${def.match_number}: legacy stored matchup differs`)
          } else if(p.winner_team_id){
            critical.push(`M${def.match_number}: saved winner exists but the matchup cannot be reconstructed`)
          }
        }))
        if(critical.length || legacy.length) next[u.id]={
          criticalCount: critical.length,
          legacyCount: legacy.length,
          count: critical.length + legacy.length,
          critical,
          legacy,
        }
      }
      setBracketIssues(next)
      const criticalUsers = Object.values(next).filter(item => item.criticalCount > 0).length
      const legacyUsers = Object.values(next).filter(item => item.legacyCount > 0).length
      setActionResult(`Bracket scan complete — ${criticalUsers} user${criticalUsers===1?'':'s'} need review; ${legacyUsers} have legacy snapshot differences.`)
      if(criticalUsers) setIssuesOnly(true)
    } catch (error) {
      setActionResult(`Bracket health scan failed: ${error.message}`)
    } finally {
      setScanLoading(false)
    }
  }

  const openInspector = (u) => {
    setEditingUserPreds(u.id)
    loadUserPredictions(u.id)
  }

  return (
    <div>
      <div className="card" style={{ padding: '14px', marginBottom: '14px' }}>
        <div style={{ fontWeight: 900, fontSize: '16px' }}>User inspector</div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '3px 0 11px' }}>Open one user workspace to inspect and amend predictions, bracket picks, KO picks, awards and totals.</div>
        <input className="input" placeholder="Search display name, username or email…" value={userSearch} onChange={e => setUserSearch(e.target.value)} />
        <div style={{display:'flex',gap:'7px',flexWrap:'wrap',marginTop:'9px'}}>
          <button className="btn btn-secondary btn-sm" onClick={scanBracketHealth} disabled={scanLoading}>{scanLoading?'Scanning all users…':'Scan for bracket issues'}</button>
          {Object.keys(bracketIssues).length>0 && <>
            <button className="btn btn-sm" onClick={()=>setIssuesOnly(v=>!v)} style={{background:issuesOnly?'#c62828':'var(--bg-secondary)',color:issuesOnly?'white':'var(--text-secondary)'}}>{issuesOnly?'Showing review required':'Show review required'} · {Object.values(bracketIssues).filter(i=>i.criticalCount>0).length}</button>
            <button className="btn btn-secondary btn-sm" onClick={()=>setShowLegacyWarnings(v=>!v)}>{showLegacyWarnings?'Hide legacy snapshot notes':'Show legacy snapshot notes'} · {Object.values(bracketIssues).filter(i=>i.legacyCount>0).length}</button>
          </>}
        </div>
      </div>

      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>{visibleUsers.length} users{issuesOnly ? (showLegacyWarnings ? ' requiring review or carrying legacy snapshot notes' : ' requiring bracket review') : ''}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
        {visibleUsers.map(u => (
          <div key={u.id} className="card" style={{ padding: '14px', opacity: u.is_banned ? 0.72 : 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr) auto', gap: '11px', alignItems: 'center' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--scottish-navy)', color: 'white', display: 'grid', placeItems: 'center', fontWeight: 900 }}>{(u.display_name || u.username || '?')[0].toUpperCase()}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 900, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.display_name || u.username} <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>@{u.username}</span></div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>{u.email || 'No email shown'} · Joined {fmt(u.created_at)}</div>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '6px' }}>
                  {u.is_admin && <span className="badge badge-red">Super admin</span>}
                  {!u.is_admin && u.admin_level === 'league_admin' && <span className="badge badge-gray">League admin</span>}
                  {u.is_banned && <span className="badge badge-red">Banned</span>}
                  {u.lock_bypass && <span className="badge badge-gray">Lock bypass</span>}
                  {(bracketIssues[u.id]?.criticalCount||0)>0 && <span className="badge badge-red">Review required · {bracketIssues[u.id].criticalCount}</span>}
                  {showLegacyWarnings && (bracketIssues[u.id]?.legacyCount||0)>0 && <span className="badge badge-gray">Legacy snapshot · {bracketIssues[u.id].legacyCount}</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}><div style={{ fontSize: '18px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--accent-green)' }}>{u.total_points || 0}</div><div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>points</div></div>
            </div>

            {(bracketIssues[u.id]?.criticalCount||0)>0 && <div style={{marginTop:'10px',padding:'9px 10px',borderRadius:'9px',background:'rgba(198,40,40,.08)',fontSize:'11px',color:'#b3261e'}}><div style={{fontWeight:900,marginBottom:'4px'}}>Review required</div>{bracketIssues[u.id].critical.slice(0,3).map(d=><div key={d}>• {d}</div>)}{bracketIssues[u.id].critical.length>3&&<div>+ {bracketIssues[u.id].critical.length-3} more</div>}</div>}
            {showLegacyWarnings && (bracketIssues[u.id]?.legacyCount||0)>0 && <div style={{marginTop:'8px',padding:'9px 10px',borderRadius:'9px',background:'var(--bg-secondary)',fontSize:'11px',color:'var(--text-muted)'}}><div style={{fontWeight:900,marginBottom:'4px',color:'var(--text-secondary)'}}>Legacy snapshot note — no automatic repair needed</div>{bracketIssues[u.id].legacy.slice(0,3).map(d=><div key={d}>• {d}</div>)}{bracketIssues[u.id].legacy.length>3&&<div>+ {bracketIssues[u.id].legacy.length-3} more</div>}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '8px', marginTop: '12px' }}>
              <button className="btn btn-primary btn-sm" onClick={() => openInspector(u)}>Manage all user data</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setAccountOpen(accountOpen === u.id ? null : u.id)}>{accountOpen === u.id ? 'Close actions' : 'Account actions'}</button>
            </div>

            {accountOpen === u.id && (
              <div style={{ marginTop: '10px', padding: '11px', borderRadius: '10px', background: 'var(--bg-secondary)' }}>
                <div style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Account and access</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {u.is_banned
                    ? <button className="btn btn-sm" style={{ background: 'var(--accent-green)', color: 'white' }} onClick={() => unbanUser(u.id, u.username)}>Unban</button>
                    : <button className="btn btn-sm" style={{ background: '#e53935', color: 'white' }} onClick={() => setConfirmAction({ type: 'ban', userId: u.id, username: u.username })}>Ban</button>}
                  {!u.is_banned && <button className="btn btn-secondary btn-sm" onClick={() => sendBanWarning(u.id, u.username)}>Send warning</button>}
                  <button className="btn btn-secondary btn-sm" onClick={() => setPointAdjUser(pointAdjUser === u.id ? null : u.id)}>Adjust points</button>
                  <button className="btn btn-secondary btn-sm" onClick={async () => {
                    const next = !u.lock_bypass
                    await supabase.from('profiles').update({ lock_bypass: next }).eq('id', u.id)
                    await logAudit('TOGGLE_LOCK_BYPASS', { user_id: u.id, bypass: next })
                    setActionResult(`${next ? 'Enabled' : 'Disabled'} lock bypass for ${u.username}`)
                    loadUsers()
                  }}>{u.lock_bypass ? 'Disable bypass' : 'Enable bypass'}</button>
                  {!u.is_admin && u.admin_level !== 'league_admin' && <button className="btn btn-secondary btn-sm" onClick={() => setConfirmAction({ type: 'makeLeagueAdmin', userId: u.id, username: u.username })}>Make league admin</button>}
                  {!u.is_admin && u.admin_level === 'league_admin' && <button className="btn btn-secondary btn-sm" onClick={() => removeLeagueAdmin(u.id, u.username)}>Remove league admin</button>}
                  {!u.is_admin && <button className="btn btn-secondary btn-sm" onClick={() => setConfirmAction({ type: 'makeAdmin', userId: u.id, username: u.username })}>Make super admin</button>}
                  <button className="btn btn-secondary btn-sm" onClick={() => setConfirmAction({ type: 'reset', userId: u.id, username: u.username })}>Reset predictions</button>
                </div>
                {pointAdjUser === u.id && (
                  <div style={{ display: 'grid', gridTemplateColumns: '100px minmax(0,1fr) auto', gap: '7px', marginTop: '10px' }}>
                    <input className="input" type="number" placeholder="+/- pts" value={pointAdjAmount} onChange={e => setPointAdjAmount(e.target.value)} />
                    <input className="input" placeholder="Reason" value={pointAdjReason} onChange={e => setPointAdjReason(e.target.value)} />
                    <button className="btn btn-primary btn-sm" onClick={applyPointAdjustment}>Apply</button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
