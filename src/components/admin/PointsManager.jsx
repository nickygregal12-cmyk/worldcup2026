export default function PointsManager({ admin }) {
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
<div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Rank Snapshot — run before and after each match window */}
            <div className="card" style={{ border: '2px solid var(--accent-gold)', background: 'rgba(245,158,11,0.04)' }}>
              <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: '4px' }}>📸 Snapshot Ranks</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.5 }}>
                Run <strong>before</strong> a match window to set the baseline, and <strong>after</strong> results come in to show movement. Updates ↑↓ arrows on the global leaderboard and all mini leagues.
              </div>
              <button onClick={snapshotKickoffRanks} disabled={saving.snapshot} className="btn btn-primary"
                style={{ background: 'var(--accent-gold)', color: 'white', border: 'none', width: '100%' }}>
                {saving.snapshot ? '⏳ Snapshotting...' : '📸 Snapshot All Ranks Now'}
              </button>
            </div>
            <div className="card" style={{ border: '1px solid var(--scottish-navy)' }}>
              <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '4px' }}>📊 League Points Amendment</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Adjust points for all members of a specific league — useful for applying Excel-format scoring corrections.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <select className="input" value={leagueAmendLeagueId} onChange={e => setLeagueAmendLeagueId(e.target.value)}>
                  <option value="">Select league...</option>
                  {leagues.filter(l => !l.is_global).map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="number" className="input" placeholder="±pts per member" style={{ flex: 1 }}
                    value={leagueAmendAmount} onChange={e => setLeagueAmendAmount(e.target.value)} />
                  <input type="text" className="input" placeholder="Reason (e.g. Excel bonus)" style={{ flex: 2 }}
                    value={leagueAmendReason} onChange={e => setLeagueAmendReason(e.target.value)} />
                </div>
                <button className="btn btn-primary" disabled={leagueAmendSaving || !leagueAmendLeagueId || !leagueAmendAmount || !leagueAmendReason}
                  onClick={async () => {
                    const amount = parseInt(leagueAmendAmount)
                    if (isNaN(amount)) { setActionResult('❌ Invalid amount'); return }
                    setLeagueAmendSaving(true)
                    const { data: members } = await supabase.from('league_members').select('user_id, league_points').eq('league_id', leagueAmendLeagueId)
                    if (!members?.length) { setActionResult('❌ No members found'); setLeagueAmendSaving(false); return }
                    for (const m of members) {
                      await supabase.from('league_members')
                        .update({ league_points: (m.league_points || 0) + amount })
                        .eq('league_id', leagueAmendLeagueId)
                        .eq('user_id', m.user_id)
                      await logAudit('LEAGUE_POINTS_AMENDMENT', { league_id: leagueAmendLeagueId, user_id: m.user_id, amount, reason: leagueAmendReason })
                    }
                    setActionResult(`✅ Applied ${amount > 0 ? '+' : ''}${amount}pts to ${members.length} members · ${leagueAmendReason}`)
                    setLeagueAmendAmount('')
                    setLeagueAmendReason('')
                    setLeagueAmendSaving(false)
                  }}>
                  {leagueAmendSaving ? '⏳ Applying...' : 'Apply to all league members'}
                </button>
              </div>
            </div>

            {/* Individual player points adjustment */}
            <div className="card" style={{ border: '1px solid var(--scottish-navy)' }}>
              <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '4px' }}>🎯 Individual Player Points</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Add or deduct points for a specific player in a league with a reason (e.g. "Harry Kane goal bonus +5pts")
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <select className="input" value={playerAdjLeagueId} onChange={async e => {
                  setPlayerAdjLeagueId(e.target.value)
                  setPlayerAdjUserId('')
                  if (e.target.value) {
                    // Fetch real members
                    const { data: realMembers } = await supabase.from('league_members')
                      .select('user_id, league_points, profile:user_id(id, username, display_name, is_offline)')
                      .eq('league_id', e.target.value)
                    // Fetch offline players in this league
                    const { data: offlineInLeague } = await supabase.from('offline_players')
                      .select('id, display_name, league_points')
                      .eq('league_id', e.target.value)
                    // Merge — offline players as pseudo-members
                    const offlineAsMembers = (offlineInLeague || []).map(op => ({
                      user_id: op.id,
                      league_points: op.league_points || 0,
                      profile: { id: op.id, display_name: op.display_name, username: op.display_name, is_offline: true }
                    }))
                    setPlayerAdjLeagueMembers([...(realMembers || []), ...offlineAsMembers])
                  }
                }}>
                  <option value="">Select league...</option>
                  {leagues.filter(l => !l.is_global).map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
                {playerAdjLeagueId && (
                  <select className="input" value={playerAdjUserId} onChange={e => setPlayerAdjUserId(e.target.value)}>
                    <option value="">Select player...</option>
                    {playerAdjLeagueMembers.map(m => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.profile?.display_name || m.profile?.username || '?'} {m.profile?.is_offline ? '(offline)' : ''} · {m.league_points || 0}pts
                      </option>
                    ))}
                  </select>
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="number" className="input" placeholder="±pts (e.g. +5 or -3)" style={{ flex: 1 }}
                    value={playerAdjAmount} onChange={e => setPlayerAdjAmount(e.target.value)} />
                  <input type="text" className="input" placeholder="Reason (e.g. Harry Kane goal bonus)" style={{ flex: 2 }}
                    value={playerAdjReason} onChange={e => setPlayerAdjReason(e.target.value)} />
                </div>
                <button className="btn btn-primary" disabled={playerAdjSaving || !playerAdjLeagueId || !playerAdjUserId || !playerAdjAmount || !playerAdjReason}
                  onClick={async () => {
                    const amount = parseInt(playerAdjAmount)
                    if (isNaN(amount)) { setActionResult('❌ Invalid amount'); return }
                    setPlayerAdjSaving(true)
                    const member = playerAdjLeagueMembers.find(m => m.user_id === playerAdjUserId)
                    const isOffline = member?.profile?.is_offline
                    if (isOffline) {
                      // Update offline_players table
                      await supabase.from('offline_players')
                        .update({ league_points: (member?.league_points || 0) + amount })
                        .eq('id', playerAdjUserId)
                    } else {
                      // Update league_members table
                      await supabase.from('league_members')
                        .update({ league_points: (member?.league_points || 0) + amount })
                        .eq('league_id', playerAdjLeagueId).eq('user_id', playerAdjUserId)
                    }
                    await logAudit('PLAYER_POINTS_ADJUSTMENT', { league_id: playerAdjLeagueId, user_id: playerAdjUserId, amount, reason: playerAdjReason })
                    setActionResult(`✅ ${amount > 0 ? '+' : ''}${amount}pts applied to ${member?.profile?.display_name || member?.profile?.username} · ${playerAdjReason}`)
                    setPlayerAdjAmount('')
                    setPlayerAdjReason('')
                    setPlayerAdjUserId('')
                    // Refresh members list
                    const { data: refreshed } = await supabase.from('league_members')
                      .select('user_id, league_points, profile:user_id(id, username, display_name, is_offline)')
                      .eq('league_id', playerAdjLeagueId)
                    const { data: refreshedOffline } = await supabase.from('offline_players')
                      .select('id, display_name, league_points').eq('league_id', playerAdjLeagueId)
                    const offlineAsMembers = (refreshedOffline || []).map(op => ({
                      user_id: op.id, league_points: op.league_points || 0,
                      profile: { id: op.id, display_name: op.display_name, username: op.display_name, is_offline: true }
                    }))
                    setPlayerAdjLeagueMembers([...(refreshed || []), ...offlineAsMembers])
                    setPlayerAdjSaving(false)
                  }}>
                  {playerAdjSaving ? '⏳ Saving...' : 'Apply to player'}
                </button>
              </div>
            </div>

            <div className="card">
              <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '12px' }}>Leaderboard Overview</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {users.slice(0, 20).map((u, i) => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', width: '24px' }}>#{i + 1}</span>
                    <span style={{ flex: 1, fontSize: '13px', fontWeight: '600' }}>{u.username}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '800', fontSize: '14px', color: 'var(--accent-green)' }}>{u.total_points || 0}</span>
                    <button onClick={() => setPointAdjUser(u.id)} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--accent-blue)', color: 'var(--accent-blue)', background: 'none', cursor: 'pointer' }}>
                      Adjust
                    </button>
                    {pointAdjUser === u.id && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <input type="number" placeholder="±pts" value={pointAdjAmount} onChange={e => setPointAdjAmount(e.target.value)}
                          style={{ width: '70px', padding: '3px 6px', border: '1px solid var(--border-medium)', borderRadius: '4px', fontSize: '12px' }} />
                        <input type="text" placeholder="reason" value={pointAdjReason} onChange={e => setPointAdjReason(e.target.value)}
                          style={{ width: '100px', padding: '3px 6px', border: '1px solid var(--border-medium)', borderRadius: '4px', fontSize: '12px' }} />
                        <button onClick={applyPointAdjustment} style={{ padding: '3px 8px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>✓</button>
                        <button onClick={() => setPointAdjUser(null)} style={{ padding: '3px 8px', background: 'var(--bg-tertiary)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>×</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <button onClick={recalcAllPoints} disabled={saving.recalc} className="btn btn-primary">
              {saving.recalc ? '⏳ Recalculating...' : '🔄 Recalculate All Points'}
            </button>

            <div className="card" style={{ border: '1px solid var(--border-light)', marginTop: '8px' }}>
              <div style={{ fontWeight: '800', fontSize: '14px', marginBottom: '4px' }}>🔧 Rebuild Knockout Matchups</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: 1.5 }}>
                Recomputes every saved knockout pick's displayed teams from each user's <strong>predicted</strong> group standings. Fixes any matchups that showed wrong teams (e.g. "ENG vs CRO" displaying a Norway result). Winner picks and points are untouched — display only. Safe to run anytime.
              </div>
              <button onClick={backfillKnockoutMatchups} disabled={saving.backfillKo} className="btn btn-secondary" style={{ width: '100%' }}>
                {saving.backfillKo ? '⏳ Rebuilding...' : '🔧 Rebuild All Knockout Matchups'}
              </button>
            </div>
          </div>
  )
}
