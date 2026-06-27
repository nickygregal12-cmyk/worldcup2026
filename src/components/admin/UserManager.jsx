export default function UserManager({ admin }) {
  const {
    user, isAdmin, profile, setProfile, isSuperAdmin, isLeagueAdmin, hasAdminAccess, navigate,
    primarySection, setPrimarySection, activeTab, setActiveTab, visiblePrimarySections, visibleSectionTabs, selectPrimarySection, loading,
    setLoading, matches, setMatches, users, setUsers, leagues, setLeagues, auditLog,
    setAuditLog, settings, setSettings, health, setHealth, allPlayers, setAllPlayers, allTeams,
    setAllTeams, allGroups, setAllGroups, allVenues, setAllVenues, fixtureEditorMatch, setFixtureEditorMatch, matchSearch,
    setMatchSearch, matchStatusFilter, setMatchStatusFilter, stageFilter, setStageFilter, editingMatch, setEditingMatch, scores,
    setScores, saving, setSaving, userSearch, setUserSearch, pointAdjUser, setPointAdjUser, pointAdjAmount,
    setPointAdjAmount, pointAdjReason, setPointAdjReason, confirmAction, setConfirmAction, actionResult, setActionResult, awardResults,
    setAwardResults, awardSaving, setAwardSaving, koMatches, setKoMatches, koLeagues, setKoLeagues, koUsers,
    setKoUsers, jokerManageUser, setJokerManageUser, jokerPreds, setJokerPreds, jokerLoading, setJokerLoading, jokerSaving,
    setJokerSaving, koEditingMatch, setKoEditingMatch, koScores, setKoScores, koSaving, setKoSaving, koStageFilter,
    setKoStageFilter, koPointAdjUser, setKoPointAdjUser, koPointAdjAmount, setKoPointAdjAmount, koPointAdjReason, setKoPointAdjReason, testMatchId,
    setTestMatchId, testHome, setTestHome, testAway, setTestAway, testResult, setTestResult, testLoading,
    setTestLoading, editingUserPreds, setEditingUserPreds, editingUserBracket, setEditingUserBracket, userPredictions, setUserPredictions, userKoPicks,
    setUserKoPicks, userAwardPreds, setUserAwardPreds, userTournamentPreds, setUserTournamentPreds, editingAwardPred, setEditingAwardPred, editingAwardValue,
    setEditingAwardValue, allMatches, setAllMatches, loadingUserPreds, setLoadingUserPreds, editedPreds, setEditedPreds, editModalTab,
    setEditModalTab, editingLeagueName, setEditingLeagueName, editingLeagueNameVal, setEditingLeagueNameVal, addingMemberTo, setAddingMemberTo, addMemberSearch,
    setAddMemberSearch, showCreateLeague, setShowCreateLeague, newLeagueName, setNewLeagueName, newLeagueCreatingFor, setNewLeagueCreatingFor, newLeagueIsGlobal,
    setNewLeagueIsGlobal, newLeaguePreset, setNewLeaguePreset, showCustomScoring, setShowCustomScoring, newLockType, setNewLockType, newLeagueScoring,
    setNewLeagueScoring, SCORING_PRESETS, applyPreset, updateScoring, offlinePlayers, setOfflinePlayers, offlineLeagueId, setOfflineLeagueId,
    offlineDisplayName, setOfflineDisplayName, offlineCreating, setOfflineCreating, offlineImporting, setOfflineImporting, offlineImportPreview, setOfflineImportPreview,
    offlineSelectedPlayer, setOfflineSelectedPlayer, offlineManualScores, setOfflineManualScores, offlineKoMode, setOfflineKoMode, offlineSearch, setOfflineSearch,
    offlineLeagueFilter, setOfflineLeagueFilter, collapsedPlayers, setCollapsedPlayers, leagueAmendLeagueId, setLeagueAmendLeagueId, playerAdjLeagueId, setPlayerAdjLeagueId,
    playerAdjUserId, setPlayerAdjUserId, playerAdjAmount, setPlayerAdjAmount, playerAdjReason, setPlayerAdjReason, playerAdjSaving, setPlayerAdjSaving,
    playerAdjLeagueMembers, setPlayerAdjLeagueMembers, leagueAmendAmount, setLeagueAmendAmount, leagueAmendReason, setLeagueAmendReason, leagueAmendSaving, setLeagueAmendSaving,
    loadAll, loadHealth, loadMatches, loadUsers, loadJokerPreds, toggleAdminJoker, loadLeagues, loadAudit,
    loadSettings, loadAwardResults, syncScoresNow, prepopulateMatchIds, saveAwardResult, loadKoData, saveKoMatchResult, recalcAllKoPoints,
    applyKoPointAdjustment, deleteKoLeague, loadUserPredictions, saveEditedPrediction, editingUsername, setEditingUsername, newUsername, setNewUsername,
    usernameSaving, setUsernameSaving, saveUsername, sendBanWarning, runTestPreview, logAudit, saveMatchResult, setMatchLive,
    resetMatchOverride, banUser, unbanUser, resetUserPredictions, makeLeagueAdmin, removeLeagueAdmin, makeAdmin, applyPointAdjustment,
    deleteLeague, updateSetting, snapshotKickoffRanks, backfillKnockoutMatchups, recalcAllPoints, removeMemberFromLeague, renameLeague, addMemberToLeague,
    createLeague, loadOfflinePlayers, createOfflinePlayer, deleteOfflinePlayer, generateInviteLink, saveManualScore, TEAM_ALIASES, normaliseTeam,
    downloadOfflineTemplate, parseExcelFile, confirmImport, parsePdfFile, filteredUsers, filteredMatches, fmt, Link,
    supabase, ALL_STAGES, calcPredictedStandings, resolveSlot, BracketHealth, AdminUserBracketEditor, AdminKOFixtures, calculateGroupPredictionPoints,
    DATES, AwardsTab, AWARD_DEFS,
  } = admin

  return (
<div>
            <BracketHealth />
            <input className="input" placeholder="Search by display name, username or email..." value={userSearch} onChange={e => setUserSearch(e.target.value)} style={{ marginBottom: '16px' }} />
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>{filteredUsers.length} users</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredUsers.map(u => (
                <div key={u.id} className="card" style={{ opacity: u.is_banned ? 0.6 : 1, border: u.is_banned ? '1px solid #e53935' : '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '800' }}>
                        {(u.username || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '14px' }}>
                          {u.display_name && u.display_name !== u.username
                            ? <>{u.display_name} <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>(@{u.username})</span></>
                            : u.username}
                          {u.is_admin && <span style={{ marginLeft: '6px', fontSize: '10px', background: 'var(--accent-orange)', color: 'white', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>SUPER ADMIN</span>}
                          {!u.is_admin && u.admin_level === 'league_admin' && <span style={{ marginLeft: '6px', fontSize: '10px', background: 'var(--scottish-navy)', color: 'white', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>LEAGUE ADMIN</span>}
                          {u.is_banned && <span style={{ marginLeft: '6px', fontSize: '10px', background: '#e53935', color: 'white', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>BANNED</span>}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{u.email}</div>
                        {u.created_at && (
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', opacity: 0.7 }}>
                            Joined {new Date(u.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '800', fontSize: '16px', color: 'var(--accent-green)', fontFamily: 'var(--font-mono)' }}>{u.total_points || 0} pts</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Joined {fmt(u.created_at)}</div>
                    </div>
                  </div>
                  {/* Edit display name / username inline form */}
                  {/* Joker management panel */}
                  {jokerManageUser?.id === u.id && (
                    <div style={{ marginTop: '10px', padding: '12px 14px', background: 'rgba(184,134,11,0.06)', border: '1px solid rgba(184,134,11,0.2)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--accent-gold)', marginBottom: '10px' }}>
                        🃏 Joker Management — {u.username}
                        <span style={{ fontWeight: '500', fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                          {jokerPreds.filter(p => p.is_confident).length}/8 jokers used · {u.jokers_group_remaining ?? 8} remaining
                        </span>
                      </div>
                      {jokerLoading ? (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Loading predictions...</div>
                      ) : jokerPreds.length === 0 ? (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No predictions found for this user.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '300px', overflowY: 'auto' }}>
                          {jokerPreds.map(p => {
                            const m = p.match
                            const isLocked = m?.status === 'completed' || m?.status === 'live'
                            return (
                              <div key={p.match_id} style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                                background: p.is_confident ? 'rgba(184,134,11,0.1)' : 'var(--bg-secondary)',
                                border: `1px solid ${p.is_confident ? 'rgba(184,134,11,0.3)' : 'var(--border-light)'}`,
                                opacity: isLocked ? 0.7 : 1,
                              }}>
                                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', minWidth: '28px' }}>#{m?.match_number}</span>
                                <span style={{ fontSize: '13px' }}>{m?.home_team?.flag_emoji}</span>
                                <span style={{ fontSize: '11px', flex: 1 }}>{m?.home_team?.short_code} vs {m?.away_team?.short_code}</span>
                                <span style={{ fontSize: '13px' }}>{m?.away_team?.flag_emoji}</span>
                                <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)', minWidth: '36px', textAlign: 'center' }}>
                                  {p.home_score}–{p.away_score}
                                </span>
                                <button
                                  onClick={() => toggleAdminJoker(u.id, p.match_id, p.is_confident, u.username)}
                                  disabled={jokerSaving[p.match_id]}
                                  style={{
                                    fontSize: '10px', padding: '3px 8px', borderRadius: '20px', cursor: 'pointer',
                                    fontWeight: '700', border: 'none',
                                    background: p.is_confident ? 'var(--accent-gold)' : 'var(--bg-tertiary)',
                                    color: p.is_confident ? 'white' : 'var(--text-muted)',
                                  }}>
                                  {jokerSaving[p.match_id] ? '...' : p.is_confident ? '🃏 ON' : 'OFF'}
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {editingUsername?.userId === u.id && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px', padding: '10px 12px', background: 'rgba(124,58,237,0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(124,58,237,0.2)' }}>
                      <div style={{ fontSize: '11px', color: '#7c3aed', fontWeight: '700' }}>
                        ✏️ Edit display name — shown in leagues &amp; leaderboard
                        <span style={{ color: 'var(--text-muted)', fontWeight: '500', marginLeft: '6px' }}>
                          (username @{editingUsername.current} stays as login identifier)
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input className="input" value={newUsername}
                          onChange={e => setNewUsername(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && saveUsername()}
                          placeholder="New display name"
                          style={{ flex: 1, fontSize: '13px', padding: '6px 10px' }} />
                        <button onClick={saveUsername} disabled={usernameSaving} className="btn btn-primary btn-sm">
                          {usernameSaving ? '...' : 'Save'}
                        </button>
                        <button onClick={() => { setEditingUsername(null); setNewUsername('') }} className="btn btn-secondary btn-sm">Cancel</button>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {u.is_banned
                      ? <button onClick={() => unbanUser(u.id, u.username)} className="btn btn-sm" style={{ background: 'var(--accent-green)', color: 'white', border: 'none' }}>✓ Unban</button>
                      : <button onClick={() => setConfirmAction({ type: 'ban', userId: u.id, username: u.username })} className="btn btn-sm" style={{ background: '#e53935', color: 'white', border: 'none' }}>🚫 Ban</button>
                    }
                    {!u.is_banned && (
                      <button onClick={() => sendBanWarning(u.id, u.username)} className="btn btn-sm" style={{ border: '1px solid #e53935', color: '#e53935', background: 'none' }}>⚠️ Warn</button>
                    )}
                    <button onClick={async () => {
                      const newVal = !u.lock_bypass
                      await supabase.from('profiles').update({ lock_bypass: newVal }).eq('id', u.id)
                      await logAudit('TOGGLE_LOCK_BYPASS', { user_id: u.id, username: u.username, bypass: newVal })
                      setActionResult(`${newVal ? '🔓 Lock bypass enabled' : '🔒 Lock bypass disabled'} for ${u.username}`)
                      loadUsers()
                    }} className="btn btn-sm" style={{ border: `1px solid ${u.lock_bypass ? '#e65100' : 'var(--border-light)'}`, color: u.lock_bypass ? '#e65100' : 'var(--text-muted)', background: u.lock_bypass ? 'rgba(230,81,0,0.08)' : 'none' }}>
                      {u.lock_bypass ? '🔓 Bypass ON' : '🔒 Bypass'}
                    </button>
                    <button onClick={() => setConfirmAction({ type: 'reset', userId: u.id, username: u.username })} className="btn btn-secondary btn-sm">↺ Reset</button>
                    {!u.is_admin && <button onClick={() => setConfirmAction({ type: 'makeAdmin', userId: u.id, username: u.username })} className="btn btn-sm" style={{ border: '1px solid var(--accent-orange)', color: 'var(--accent-orange)', background: 'none' }}>⭐ Super Admin</button>}
                    {!u.is_admin && u.admin_level !== 'league_admin' && <button onClick={() => setConfirmAction({ type: 'makeLeagueAdmin', userId: u.id, username: u.username })} className="btn btn-sm" style={{ border: '1px solid var(--scottish-navy)', color: 'var(--scottish-navy)', background: 'none' }}>🏆 League Admin</button>}
                    {!u.is_admin && u.admin_level === 'league_admin' && <button onClick={() => removeLeagueAdmin(u.id, u.username)} className="btn btn-sm" style={{ border: '1px solid var(--accent-red)', color: 'var(--accent-red)', background: 'none' }}>✕ Remove League Admin</button>}
                    <button onClick={() => setPointAdjUser(u.id)} className="btn btn-sm" style={{ border: '1px solid var(--accent-blue)', color: 'var(--accent-blue)', background: 'none' }}>🎯 Points</button>
                    <button onClick={() => { setEditingUserPreds(u.id); loadUserPredictions(u.id) }} className="btn btn-sm" style={{ border: '1px solid var(--scottish-navy)', color: 'var(--scottish-navy)', background: 'none' }}>✏️ Predictions</button>
                    <button onClick={() => {
                      if (jokerManageUser?.id === u.id) { setJokerManageUser(null); setJokerPreds([]) }
                      else { setJokerManageUser({ id: u.id, username: u.username }); loadJokerPreds(u.id) }
                    }} className="btn btn-sm" style={{ border: '1px solid var(--accent-gold)', color: 'var(--accent-gold)', background: jokerManageUser?.id === u.id ? 'rgba(184,134,11,0.1)' : 'none' }}>🃏 Jokers ({8 - (u.jokers_group_remaining ?? 8)} used)</button>
                    <button onClick={async () => {
                      const newVal = !u.display_name_locked
                      await supabase.from('profiles').update({ display_name_locked: newVal }).eq('id', u.id)
                      loadUsers()
                    }} className="btn btn-sm" style={{ border: `1px solid ${u.display_name_locked ? '#e53935' : 'var(--border-light)'}`, color: u.display_name_locked ? '#e53935' : 'var(--text-muted)', background: u.display_name_locked ? 'rgba(229,57,53,0.08)' : 'none' }}>
                      {u.display_name_locked ? '🔒 Name Locked' : '🔓 Lock Name'}
                    </button>
                    <button onClick={() => setEditingUserBracket(editingUserBracket === u.id ? null : u.id)} className="btn btn-sm" style={{ border: '1px solid #e65100', color: '#e65100', background: editingUserBracket === u.id ? 'rgba(230,81,0,0.08)' : 'none' }}>🏆 Bracket</button>
                    <button onClick={() => { setEditingUsername({ userId: u.id, current: u.username }); setNewUsername(u.display_name || u.username) }} className="btn btn-sm" style={{ border: '1px solid #7c3aed', color: '#7c3aed', background: 'none' }}>✏️ Name</button>
                  </div>
                  {pointAdjUser === u.id && (
                    <div style={{ marginTop: '10px', padding: '12px', background: 'var(--accent-blue-light)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600' }}>Adjust points for {u.username}</div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input type="number" placeholder="+10 or -5" value={pointAdjAmount} onChange={e => setPointAdjAmount(e.target.value)}
                          className="input" style={{ width: '100px' }} />
                        <input type="text" placeholder="Reason..." value={pointAdjReason} onChange={e => setPointAdjReason(e.target.value)}
                          className="input" style={{ flex: 1 }} />
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={applyPointAdjustment} className="btn btn-primary btn-sm">Apply</button>
                        <button onClick={() => setPointAdjUser(null)} className="btn btn-secondary btn-sm">Cancel</button>
                      </div>
                    </div>
                  )}
                  {editingUserBracket === u.id && (
                    <AdminUserBracketEditor
                      userId={u.id}
                      username={u.display_name || u.username}
                      matches={matches}
                      onClose={() => setEditingUserBracket(null)}
                      logAudit={logAudit}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
  )
}
