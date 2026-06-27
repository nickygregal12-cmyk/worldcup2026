export default function AdminDashboard({ admin }) {
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
    loadSettings, loadAwardResults, callAdminFunction, syncScoresNow, prepopulateMatchIds, saveAwardResult, loadKoData, saveKoMatchResult, recalcAllKoPoints,
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
            {/* Status cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {[
                { label: 'Database', ok: health.dbOk, detail: 'Supabase connection' },
                { label: 'Score Sync', ok: health.syncOk, detail: health.syncAge !== null ? `Last sync ${health.syncAge}m ago` : 'Never synced' },
                { label: 'Live Matches', ok: true, detail: `${health.liveMatches} in progress`, neutral: true },
                { label: 'Users', ok: true, detail: `${health.totalUsers} registered`, neutral: true },
              ].map(item => (
                <div key={item.label} className="card" style={{ border: `1px solid ${item.neutral ? 'var(--border-light)' : item.ok ? 'var(--accent-green)' : '#e53935'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: '700', fontSize: '14px' }}>{item.label}</span>
                    <span style={{ fontSize: '18px' }}>{item.neutral ? '📊' : item.ok ? '✅' : '🔴'}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.detail}</div>
                </div>
              ))}
            </div>

            {/* Match stats */}
            <div className="card">
              <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '12px' }}>Match Status</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { label: 'Scheduled', count: health.scheduledMatches, color: 'var(--accent-blue)' },
                  { label: 'Live', count: health.liveMatches, color: '#e53935' },
                  { label: 'Completed', count: health.completedMatches, color: 'var(--accent-green)' },
                  { label: 'Total', count: health.totalMatches, color: 'var(--text-primary)' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{row.label}</span>
                    <span style={{ fontWeight: '800', fontSize: '16px', color: row.color, fontFamily: 'var(--font-mono)' }}>{row.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div className="card">
              <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '12px' }}>Quick Actions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button onClick={syncScoresNow} disabled={saving.sync} className="btn btn-primary" style={{ background: '#e53935' }}>
                  {saving.sync ? '⏳ Syncing...' : '🔄 Sync Scores Now'}
                </button>
                <button onClick={async () => {
                  setSaving(prev => ({ ...prev, standings: true }))
                  try {
                    const data = await callAdminFunction('/.netlify/functions/sync-standings', { method: 'POST' })
                    setActionResult(`✅ Standings synced: ${data.updated || 0} rows updated, ${data.skipped || 0} skipped${data.firstSkipped ? ` (first skip: "${data.firstSkipped}")` : ''}${data.note ? ` | ${data.note}` : ''}${data.v ? ` [v${data.v}]` : ''}`)
                  } catch (e) {
                    setActionResult(`❌ Standings sync failed: ${e.message}`)
                  }
                  setSaving(prev => ({ ...prev, standings: false }))
                }} disabled={saving.standings} className="btn btn-secondary">
                  {saving.standings ? '⏳ Syncing...' : '📊 Sync Standings'}
                </button>
                <button onClick={prepopulateMatchIds} disabled={saving.prepopulate} className="btn btn-primary" style={{ background: 'var(--accent-orange)' }}>
                  {saving.prepopulate ? '⏳ Running...' : '🔗 Pre-populate Match IDs'}
                </button>
                <button onClick={async () => {
                  setSaving(prev => ({ ...prev, backfillBracket: true }))
                  try {
                    const data = await callAdminFunction('/.netlify/functions/backfill-bracket-teams', { method: 'POST' })
                    setActionResult(`✅ Bracket backfill: ${data.updated} updated, ${data.skipped} already done, ${data.total} total picks`)
                  } catch (e) {
                    setActionResult(`❌ Bracket backfill failed: ${e.message}`)
                  } finally {
                    setSaving(prev => ({ ...prev, backfillBracket: false }))
                  }
                }} disabled={saving.backfillBracket} className="btn btn-primary" style={{ background: 'var(--scottish-navy)' }}>
                  {saving.backfillBracket ? '⏳ Backfilling...' : '🏆 Backfill R32 Bracket Teams'}
                </button>
                <button onClick={recalcAllPoints} disabled={saving.recalc} className="btn btn-secondary">
                  {saving.recalc ? 'Recalculating...' : '🔄 Recalculate All Points'}
                </button>
                <button onClick={loadAll} className="btn btn-secondary">🔃 Refresh All Data</button>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                ⚠️ Run "Pre-populate Match IDs" once before 11 Jun to ensure score sync works reliably
              </div>
            </div>

            {/* Last sync time */}
            <div className="card">
              <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '8px' }}>Score Sync Status</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Last sync: {health.lastSync ? fmt(health.lastSync) : 'Never'}
                {health.syncAge !== null && <span style={{ marginLeft: '8px', color: health.syncOk ? 'var(--accent-green)' : '#e53935', fontWeight: '700' }}>
                  ({health.syncAge}m ago)
                </span>}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Free tier: trigger sync manually using "Sync Scores Now" above. Run after each match finishes.
              </div>
            </div>
          </div>
  )
}
