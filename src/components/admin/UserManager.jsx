import { useState } from 'react'

export default function UserManager({ admin }) {
  const {
    filteredUsers, userSearch, setUserSearch, fmt, setEditingUserPreds, loadUserPredictions,
    pointAdjUser, setPointAdjUser, pointAdjAmount, setPointAdjAmount, pointAdjReason, setPointAdjReason,
    applyPointAdjustment, setConfirmAction, sendBanWarning, unbanUser, makeLeagueAdmin,
    removeLeagueAdmin, makeAdmin, supabase, logAudit, loadUsers, setActionResult,
  } = admin
  const [accountOpen, setAccountOpen] = useState(null)

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
      </div>

      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>{filteredUsers.length} users</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
        {filteredUsers.map(u => (
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
                </div>
              </div>
              <div style={{ textAlign: 'right' }}><div style={{ fontSize: '18px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--accent-green)' }}>{u.total_points || 0}</div><div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>points</div></div>
            </div>

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
