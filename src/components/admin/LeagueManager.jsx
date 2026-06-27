import { useMemo, useState } from 'react'

export default function LeagueManager({ admin }) {
  const {
    leagues, users, fmt, showCreateLeague, setShowCreateLeague,
    newLeagueName, setNewLeagueName, newLeagueCreatingFor, setNewLeagueCreatingFor,
    newLeagueIsGlobal, setNewLeagueIsGlobal, newLeaguePreset, applyPreset,
    newLockType, setNewLockType, showCustomScoring, setShowCustomScoring,
    newLeagueScoring, updateScoring, createLeague,
    editingLeagueName, setEditingLeagueName, editingLeagueNameVal, setEditingLeagueNameVal,
    renameLeague, addingMemberTo, setAddingMemberTo, addMemberSearch, setAddMemberSearch,
    addMemberToLeague, setConfirmAction, supabase, loadLeagues, logAudit, setActionResult,
  } = admin

  const [search, setSearch] = useState('')
  const [openLeague, setOpenLeague] = useState(null)
  const [drafts, setDrafts] = useState({})
  const [savingLeague, setSavingLeague] = useState(null)

  const visibleLeagues = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return leagues
    return leagues.filter(l =>
      l.name?.toLowerCase().includes(q) ||
      l.invite_code?.toLowerCase().includes(q) ||
      l.creator?.username?.toLowerCase().includes(q) ||
      l.members?.some(m => (m.profile?.username || '').toLowerCase().includes(q))
    )
  }, [leagues, search])

  const getDraft = league => drafts[league.id] || {
    lock_type: league.lock_type || 'rolling',
    scoring_preset: league.scoring_preset || 'standard',
    is_global: Boolean(league.is_global),
    custom_scoring: league.custom_scoring || {},
  }

  const patchDraft = (league, patch) => setDrafts(prev => ({ ...prev, [league.id]: { ...getDraft(league), ...prev[league.id], ...patch } }))

  const saveLeagueSettings = async league => {
    const draft = getDraft(league)
    setSavingLeague(league.id)
    const { error } = await supabase.from('leagues').update({
      lock_type: draft.lock_type,
      scoring_preset: draft.scoring_preset,
      is_global: draft.is_global,
      custom_scoring: draft.custom_scoring,
    }).eq('id', league.id)
    if (error) setActionResult(`League settings failed: ${error.message}`)
    else {
      await logAudit('EDIT_LEAGUE_SETTINGS', { league_id: league.id, ...draft })
      setActionResult(`${league.name} settings saved`)
      await loadLeagues()
    }
    setSavingLeague(null)
  }

  return (
    <div>
      <div className="card" style={{ padding: '14px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
          <div><div style={{ fontWeight: 900, fontSize: '16px' }}>League control</div><div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Manage members, ownership, lock mode and scoring from one workspace.</div></div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreateLeague(!showCreateLeague)}>{showCreateLeague ? 'Close' : '+ New league'}</button>
        </div>
        <input className="input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search league, code, creator or member…" />
      </div>

      {showCreateLeague && (
        <div className="card" style={{ padding: '15px', marginBottom: '14px', border: '1px solid var(--scottish-navy)' }}>
          <div style={{ fontWeight: 900, marginBottom: '11px' }}>Create league</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: '9px' }}>
            <label><span className="admin-field-label">League name</span><input className="input" value={newLeagueName} onChange={e => setNewLeagueName(e.target.value)} /></label>
            <label><span className="admin-field-label">Create for user</span><select className="input" value={newLeagueCreatingFor} onChange={e => setNewLeagueCreatingFor(e.target.value)}><option value="">Current admin</option>{users.map(u => <option key={u.id} value={u.id}>{u.display_name || u.username}</option>)}</select></label>
            <label><span className="admin-field-label">Lock mode</span><select className="input" value={newLockType} onChange={e => setNewLockType(e.target.value)}><option value="rolling">Rolling locks</option><option value="pre_tournament">Pre-tournament snapshot</option></select></label>
            <label><span className="admin-field-label">Scoring preset</span><select className="input" value={newLeaguePreset} onChange={e => applyPreset(e.target.value)}><option value="standard">Standard</option><option value="high_stakes">High stakes</option><option value="exact_only">Exact only</option><option value="excel">Excel</option></select></label>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, marginTop: '10px' }}><input type="checkbox" checked={newLeagueIsGlobal} onChange={e => setNewLeagueIsGlobal(e.target.checked)} /> Global/public league</label>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowCustomScoring(!showCustomScoring)} style={{ marginTop: '10px' }}>{showCustomScoring ? 'Hide custom scoring' : 'Custom scoring'}</button>
          {showCustomScoring && <ScoringGrid scoring={newLeagueScoring} onChange={updateScoring} />}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}><button className="btn btn-primary" disabled={!newLeagueName.trim()} onClick={createLeague}>Create league</button><button className="btn btn-secondary" onClick={() => setShowCreateLeague(false)}>Cancel</button></div>
        </div>
      )}

      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>{visibleLeagues.length} of {leagues.length} leagues</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
        {visibleLeagues.map(league => {
          const open = openLeague === league.id
          const draft = getDraft(league)
          return (
            <div key={league.id} className="card" style={{ padding: '14px' }}>
              <button onClick={() => setOpenLeague(open ? null : league.id)} style={{ width: '100%', border: 0, padding: 0, background: 'none', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto auto', gap: '12px', alignItems: 'center' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{league.name}</div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '3px' }}>@{league.creator?.username || '?'} · Code {league.invite_code} · {fmt(league.created_at)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 900, fontFamily: 'var(--font-mono)' }}>{league.members?.length || 0}</div><div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>members</div></div>
                  <span style={{ fontSize: '18px', color: 'var(--text-muted)' }}>{open ? '−' : '+'}</span>
                </div>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '8px' }}>
                  <span className="badge badge-gray">{league.lock_type === 'pre_tournament' ? (league.snapshot_taken_at ? 'Locked snapshot' : 'Pre-lock') : 'Rolling lock'}</span>
                  <span className="badge badge-gray">{league.scoring_preset || 'standard'} scoring</span>
                  {league.is_global && <span className="badge badge-green">Global</span>}
                </div>
              </button>

              {open && (
                <div style={{ marginTop: '14px', borderTop: '1px solid var(--border-light)', paddingTop: '14px' }}>
                  <div style={{ fontWeight: 900, fontSize: '13px', marginBottom: '9px' }}>League settings</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '8px' }}>
                    <label><span className="admin-field-label">Lock mode</span><select className="input" value={draft.lock_type} onChange={e => patchDraft(league, { lock_type: e.target.value })}><option value="rolling">Rolling locks</option><option value="pre_tournament">Pre-tournament snapshot</option></select></label>
                    <label><span className="admin-field-label">Scoring preset</span><select className="input" value={draft.scoring_preset} onChange={e => patchDraft(league, { scoring_preset: e.target.value })}><option value="standard">Standard</option><option value="high_stakes">High stakes</option><option value="exact_only">Exact only</option><option value="excel">Excel</option><option value="custom">Custom</option></select></label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '24px', fontSize: '12px', fontWeight: 700 }}><input type="checkbox" checked={draft.is_global} onChange={e => patchDraft(league, { is_global: e.target.checked })} /> Global/public league</label>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => saveLeagueSettings(league)} disabled={savingLeague === league.id} style={{ marginTop: '9px' }}>{savingLeague === league.id ? 'Saving…' : 'Save league settings'}</button>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 8px' }}><div style={{ fontWeight: 900, fontSize: '13px' }}>Members</div><button className="btn btn-secondary btn-sm" onClick={() => { setAddingMemberTo(addingMemberTo === league.id ? null : league.id); setAddMemberSearch('') }}>+ Add member</button></div>
                  {addingMemberTo === league.id && (
                    <div style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: '10px', marginBottom: '8px' }}>
                      <input className="input" value={addMemberSearch} onChange={e => setAddMemberSearch(e.target.value)} placeholder="Search user…" />
                      <div style={{ maxHeight: '180px', overflowY: 'auto', marginTop: '7px' }}>
                        {users.filter(u => addMemberSearch.length > 1 && `${u.username} ${u.display_name || ''}`.toLowerCase().includes(addMemberSearch.toLowerCase()) && !league.members?.some(m => m.user_id === u.id)).slice(0,12).map(u => <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 4px', borderTop: '1px solid var(--border-light)' }}><span style={{ fontSize: '12px' }}>{u.display_name || u.username} <span style={{ color: 'var(--text-muted)' }}>@{u.username}</span></span><button className="btn btn-primary btn-sm" onClick={() => addMemberToLeague(league.id, league.name, u.id, u.username)}>Add</button></div>)}
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {(league.members || []).map(m => <div key={m.user_id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '8px', alignItems: 'center', padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: '8px' }}><span style={{ fontSize: '12px', fontWeight: 700 }}>{m.profile?.display_name || m.profile?.username || 'Unknown'} {m.is_offline && <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>(offline)</span>}</span><button className="btn btn-secondary btn-sm" onClick={() => setConfirmAction({ type: 'removeMember', leagueId: league.id, userId: m.user_id, username: m.profile?.username, leagueName: league.name })}>Remove</button></div>)}
                  </div>

                  <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', marginTop: '14px' }}>
                    {editingLeagueName === league.id ? <><input className="input" value={editingLeagueNameVal} onChange={e => setEditingLeagueNameVal(e.target.value)} style={{ maxWidth: '260px' }} /><button className="btn btn-primary btn-sm" onClick={() => renameLeague(league.id, editingLeagueNameVal)}>Save name</button><button className="btn btn-secondary btn-sm" onClick={() => setEditingLeagueName(null)}>Cancel</button></> : <button className="btn btn-secondary btn-sm" onClick={() => { setEditingLeagueName(league.id); setEditingLeagueNameVal(league.name) }}>Rename league</button>}
                    <button className="btn btn-sm" style={{ background: '#e53935', color: 'white' }} onClick={() => setConfirmAction({ type: 'deleteLeague', leagueId: league.id, leagueName: league.name })}>Delete league</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ScoringGrid({ scoring, onChange }) {
  const fields = [
    ['group_correct','Group result'], ['group_exact','Group exact'], ['group_jokers','Group jokers'], ['joker_multiplier','Joker multiplier'],
    ['ko_correct','KO result'], ['ko_exact','KO exact'], ['ko_jokers','KO jokers'], ['group_position','Group position'],
    ['perfect_group','Perfect group'], ['golden_boot','Golden Boot'], ['golden_glove','Golden Glove'], ['pott','POTT'], ['goals_exact','Goals exact'],
  ]
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '7px', marginTop: '10px', padding: '10px', background: 'var(--bg-secondary)', borderRadius: '10px' }}>{fields.map(([key,label]) => <label key={key}><span className="admin-field-label">{label}</span><input className="input" type="number" min="0" max="50" value={scoring[key] ?? 0} onChange={e => onChange(key, e.target.value)} /></label>)}</div>
}
