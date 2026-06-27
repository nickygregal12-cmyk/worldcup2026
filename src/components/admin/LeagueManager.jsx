export default function LeagueManager({ admin }) {
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
<div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

            {/* Create League */}
            <button onClick={() => setShowCreateLeague(!showCreateLeague)} className="btn btn-primary">
              ➕ Create New League
            </button>
            {showCreateLeague && (
              <div className="card" style={{ border: '1px solid var(--accent-green)' }}>
                <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '12px' }}>Create League</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input className="input" placeholder="League name e.g. Office WC26"
                    value={newLeagueName} onChange={e => setNewLeagueName(e.target.value)} />
                  <input className="input" placeholder="Created by username (leave blank for admin)"
                    value={newLeagueCreatingFor} onChange={e => setNewLeagueCreatingFor(e.target.value)} />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={newLeagueIsGlobal || false}
                      onChange={e => setNewLeagueIsGlobal(e.target.checked)} />
                    🌍 Global league (visible to all users on Leagues page)
                  </label>

                  {/* Lock type */}
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '8px', color: 'var(--scottish-navy)' }}>🔒 Prediction Lock</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', padding: '8px', borderRadius: 'var(--radius-sm)', background: newLockType === 'rolling' ? 'var(--accent-blue-light)' : 'var(--bg-card)', border: `1.5px solid ${newLockType === 'rolling' ? 'var(--accent-blue)' : 'var(--border-light)'}` }}>
                        <input type="radio" name="lockType" value="rolling" checked={newLockType === 'rolling'}
                          onChange={() => setNewLockType('rolling')} style={{ marginTop: '2px' }} />
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '13px' }}>🔓 Always editable</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Predictions lock match by match at kickoff. Members can update future picks any time.</div>
                        </div>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', padding: '8px', borderRadius: 'var(--radius-sm)', background: newLockType === 'pre_tournament' ? 'var(--accent-blue-light)' : 'var(--bg-card)', border: `1.5px solid ${newLockType === 'pre_tournament' ? 'var(--accent-blue)' : 'var(--border-light)'}` }}>
                        <input type="radio" name="lockType" value="pre_tournament" checked={newLockType === 'pre_tournament'}
                          onChange={() => setNewLockType('pre_tournament')} style={{ marginTop: '2px' }} />
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '13px' }}>🔒 Lock before tournament</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>All predictions snapshot at 11 Jun 13:00. Scores frozen for league scoring. Members can still update their overall predictions after kickoff.</div>
                        </div>
                      </label>
                    </div>
                  </div>
                  {/* Quick preset buttons */}
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-muted)' }}>Quick Start Preset</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {[['standard','⚽ Standard'],['high_stakes','🔥 High Stakes'],['exact_only','🎯 Exact Only'],['excel','📊 Excel']].map(([key, label]) => (
                        <button key={key} onClick={() => applyPreset(key)} className="btn btn-sm"
                          style={{ background: newLeaguePreset === key ? 'var(--scottish-navy)' : 'var(--bg-secondary)', color: newLeaguePreset === key ? 'white' : 'var(--text-primary)', border: '1px solid var(--border-light)' }}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom scoring grid — collapsed by default */}
                  <div>
                    <button onClick={() => setShowCustomScoring(s => !s)}
                      style={{ background: 'none', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', width: '100%', textAlign: 'left' }}>
                      {showCustomScoring ? '▲ Hide custom scoring' : '⚙️ Customise scoring (optional) — Standard scoring pre-filled'}
                    </button>
                  </div>
                  {showCustomScoring && (
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '10px', color: 'var(--scottish-navy)' }}>⚙️ Custom Scoring (0–50pts each)</div>
                    {[
                      { label: '⚽ Group Stage', fields: [
                        { key: 'group_correct', label: 'Correct result' },
                        { key: 'group_exact', label: 'Exact score' },
                        { key: 'group_jokers', label: 'Jokers available' },
                        { key: 'joker_multiplier', label: 'Joker multiplier ×' },
                      ]},
                      { label: '🏆 Knockout', fields: [
                        { key: 'ko_correct', label: 'Correct result' },
                        { key: 'ko_exact', label: 'Exact score' },
                        { key: 'ko_jokers', label: 'Jokers available' },
                      ]},
                      { label: '📊 Group Positions', fields: [
                        { key: 'group_position', label: 'Per correct position' },
                        { key: 'perfect_group', label: 'Perfect group bonus' },
                      ]},
                      { label: '🥇 Awards', fields: [
                        { key: 'golden_boot', label: 'Golden Boot' },
                        { key: 'golden_glove', label: 'Golden Glove' },
                        { key: 'pott', label: 'Player of Tournament' },
                        { key: 'goals_exact', label: 'Goals total exact' },
                      ]},
                    ].map(section => (
                      <div key={section.label} style={{ marginBottom: '10px' }}>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{section.label}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                          {section.fields.map(f => (
                            <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', padding: '6px 8px' }}>
                              <span style={{ fontSize: '11px', flex: 1, color: 'var(--text-muted)' }}>{f.label}</span>
                              <input type="number" min="0" max="50" value={newLeagueScoring[f.key] ?? 0}
                                onChange={e => updateScoring(f.key, e.target.value)}
                                style={{ width: '44px', textAlign: 'center', padding: '3px', borderRadius: '4px', border: '1px solid var(--border-light)', fontSize: '13px', fontWeight: '700' }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={createLeague} disabled={!newLeagueName.trim()} className="btn btn-primary btn-sm">Create League</button>
                    <button onClick={() => setShowCreateLeague(false)} className="btn btn-secondary btn-sm">Cancel</button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{leagues.length} leagues total</div>

            {leagues.map(league => (
              <div key={league.id} className="card">
                {/* League header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ flex: 1 }}>
                    {/* Rename inline */}
                    {editingLeagueName === league.id ? (
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
                        <input className="input" value={editingLeagueNameVal}
                          onChange={e => setEditingLeagueNameVal(e.target.value)}
                          style={{ fontSize: '14px', fontWeight: '700' }} />
                        <button onClick={() => renameLeague(league.id, editingLeagueNameVal)} className="btn btn-primary btn-sm">Save</button>
                        <button onClick={() => setEditingLeagueName(null)} className="btn btn-secondary btn-sm">✕</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <div style={{ fontWeight: '700', fontSize: '15px' }}>{league.name}</div>
                        <button onClick={() => { setEditingLeagueName(league.id); setEditingLeagueNameVal(league.name) }}
                          style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>✏️</button>
                        {league.lock_type === 'pre_tournament' && (
                          <span style={{ fontSize: '10px', fontWeight: '700', background: league.snapshot_taken_at ? 'var(--accent-green)' : 'var(--accent-gold)', color: 'white', padding: '2px 6px', borderRadius: 'var(--radius-full)' }}>
                            {league.snapshot_taken_at ? '🔒 Locked' : '⏳ Pre-lock'}
                          </span>
                        )}
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Created by {league.creator?.username || '?'} · {fmt(league.created_at)}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Code: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: 'var(--text-primary)' }}>{league.invite_code}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: '800', fontSize: '16px', fontFamily: 'var(--font-mono)' }}>
                      {league.members?.length ?? 0} members
                    </div>
                  </div>
                </div>

                {/* Member list */}
                {league.members?.length > 0 && (
                  <div style={{ marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {league.members.map(m => (
                      <div key={m.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600' }}>{m.profile?.username || 'Unknown'}</span>
                        <button
                          onClick={() => setConfirmAction({ type: 'removeMember', leagueId: league.id, userId: m.user_id, username: m.profile?.username, leagueName: league.name })}
                          style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', border: '1px solid #e53935', color: '#e53935', background: 'none', cursor: 'pointer' }}
                        >Remove</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add member */}
                {addingMemberTo === league.id ? (
                  <div style={{ marginBottom: '10px', padding: '10px', background: 'var(--accent-blue-light)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Add member to {league.name}</div>
                    <input className="input" placeholder="Search username..."
                      value={addMemberSearch} onChange={e => setAddMemberSearch(e.target.value)}
                      style={{ marginBottom: '8px' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '150px', overflowY: 'auto' }}>
                      {users.filter(u =>
                        addMemberSearch.length > 1 &&
                        u.username?.toLowerCase().includes(addMemberSearch.toLowerCase()) &&
                        !league.members?.find(m => m.user_id === u.id)
                      ).map(u => (
                        <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)' }}>
                          <span style={{ fontSize: '13px' }}>{u.username}</span>
                          <button onClick={() => addMemberToLeague(league.id, league.name, u.id, u.username)}
                            className="btn btn-primary btn-sm">Add</button>
                        </div>
                      ))}
                      {addMemberSearch.length > 1 && users.filter(u =>
                        u.username?.toLowerCase().includes(addMemberSearch.toLowerCase()) &&
                        !league.members?.find(m => m.user_id === u.id)
                      ).length === 0 && (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '8px' }}>No matching users found</div>
                      )}
                    </div>
                    <button onClick={() => { setAddingMemberTo(null); setAddMemberSearch('') }} className="btn btn-secondary btn-sm" style={{ marginTop: '8px' }}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => { setAddingMemberTo(league.id); setAddMemberSearch('') }}
                    className="btn btn-sm" style={{ border: '1px solid var(--accent-blue)', color: 'var(--accent-blue)', background: 'none', marginBottom: '8px' }}>
                    ➕ Add Member
                  </button>
                )}

                {/* Delete */}
                <button onClick={() => setConfirmAction({ type: 'deleteLeague', leagueId: league.id, leagueName: league.name })}
                  className="btn btn-sm" style={{ background: '#e53935', color: 'white', border: 'none' }}>
                  🗑️ Delete League
                </button>

              </div>
            ))}
          </div>
  )
}
