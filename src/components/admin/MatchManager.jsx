export default function MatchManager({ admin }) {
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
            <div className="card" style={{ padding: '12px', marginBottom: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 150px', gap: '8px', marginBottom: '10px' }}>
                <input className="input" value={matchSearch} onChange={e => setMatchSearch(e.target.value)} placeholder="Search match, team, stadium or city…" />
                <select className="input" value={matchStatusFilter} onChange={e => setMatchStatusFilter(e.target.value)}>
                  <option value="all">All statuses</option><option value="scheduled">Scheduled</option><option value="live">Live</option><option value="completed">Completed</option><option value="postponed">Postponed</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['group', 'r32', 'r16', 'qf', 'sf', '3rd', 'final'].map(stage => (
                  <button key={stage} onClick={() => setStageFilter(stage)} className="btn btn-sm" style={{
                    background: stageFilter === stage ? 'var(--scottish-navy)' : 'var(--bg-card)',
                    color: stageFilter === stage ? 'white' : 'var(--text-secondary)',
                    border: '1px solid var(--border-light)',
                  }}>{stage === 'group' ? 'Groups' : stage.toUpperCase()}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredMatches.map(match => {
                const isEditing = editingMatch === match.id
                const s = scores[match.id] || { home: match.home_score ?? '', away: match.away_score ?? '' }
                return (
                  <div key={match.id} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                        #{match.match_number} · {fmt(match.kickoff_time)}
                        {match.venue?.city && <span> · {match.venue?.name || match.venue?.stadium_name || 'Stadium'}, {match.venue.city}</span>}
                        {match.use_manual_override && <span style={{ marginLeft: '6px', color: 'var(--accent-orange)', fontWeight: '700' }}>MANUAL</span>}
                      </div>
                      <span className={`badge ${match.status === 'completed' ? 'badge-green' : match.status === 'live' ? 'badge-red' : 'badge-gray'}`}>
                        {match.status}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '24px' }}>{match.home_team?.flag_emoji}</div>
                        <div style={{ fontSize: '12px', fontWeight: '700' }}>{match.home_team?.short_code}</div>
                      </div>
                      <div style={{ textAlign: 'center', fontSize: '20px', fontWeight: '800', fontFamily: 'var(--font-mono)' }}>
                        {match.status === 'completed' || match.status === 'live'
                          ? `${match.home_score ?? '?'} – ${match.away_score ?? '?'}`
                          : 'vs'}
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '24px' }}>{match.away_team?.flag_emoji}</div>
                        <div style={{ fontSize: '12px', fontWeight: '700' }}>{match.away_team?.short_code}</div>
                      </div>
                    </div>
                    {isEditing && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                        <input type="number" min="0" max="20" value={s.home} onChange={e => setScores(prev => ({ ...prev, [match.id]: { ...s, home: e.target.value } }))}
                          className="score-input" style={{ width: '52px', height: '40px', fontSize: '18px', fontWeight: '700', textAlign: 'center', border: '2px solid var(--border-medium)', borderRadius: 'var(--radius-sm)' }} />
                        <span style={{ fontWeight: '800', color: 'var(--text-muted)' }}>–</span>
                        <input type="number" min="0" max="20" value={s.away} onChange={e => setScores(prev => ({ ...prev, [match.id]: { ...s, away: e.target.value } }))}
                          className="score-input" style={{ width: '52px', height: '40px', fontSize: '18px', fontWeight: '700', textAlign: 'center', border: '2px solid var(--border-medium)', borderRadius: 'var(--radius-sm)' }} />
                        <button onClick={async () => {
                          // Preview only — set score but keep scheduled, no points
                          const homeScore = parseInt(s.home)
                          const awayScore = parseInt(s.away)
                          await supabase.from('matches').update({
                            home_score: homeScore, away_score: awayScore,
                            use_manual_override: true,
                          }).eq('id', match.id)
                          setActionResult('👁 Preview score set — status still scheduled, no points awarded. Use Revert to API to undo.')
                          setEditingMatch(null)
                          loadMatches()
                        }} disabled={saving[match.id]} className="btn btn-sm" style={{ background: 'var(--accent-orange)', color: 'white', border: 'none' }}>
                          👁 Preview Only
                        </button>
                        <button onClick={() => saveMatchResult(match)} disabled={saving[match.id]} className="btn btn-primary btn-sm">
                          {saving[match.id] ? '...' : '✅ Save & Award Points'}
                        </button>
                        <button onClick={() => setEditingMatch(null)} className="btn btn-secondary btn-sm">Cancel</button>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button onClick={() => setFixtureEditorMatch(match)} className="btn btn-primary btn-sm">⚙️ Edit fixture</button>
                      {/* Set Score */}
                      <button onClick={() => { setEditingMatch(match.id); setScores(prev => ({ ...prev, [match.id]: { home: match.home_score ?? '', away: match.away_score ?? '' } })) }}
                        className="btn btn-secondary btn-sm">✏️ Set Score</button>

                      {/* Set Live */}
                      {match.status !== 'live' && match.status !== 'completed' && (
                        <button onClick={() => setMatchLive(match.id)}
                          className="btn btn-sm" style={{ background: '#e53935', color: 'white', border: 'none' }}>
                          🔴 Set Live
                        </button>
                      )}

                      {/* Set Scheduled (revert from live) */}
                      {match.status === 'live' && (
                        <button onClick={async () => {
                          await supabase.from('matches').update({ status: 'scheduled' }).eq('id', match.id)
                          await logAudit('SET_SCHEDULED', { match_id: match.id })
                          setActionResult('Match set back to scheduled')
                          loadMatches()
                        }} className="btn btn-sm" style={{ background: 'var(--accent-blue)', color: 'white', border: 'none' }}>
                          📅 Set Scheduled
                        </button>
                      )}

                      {/* Revert to API */}
                      {match.use_manual_override && (
                        <button onClick={() => resetMatchOverride(match.id)}
                          className="btn btn-sm" style={{ background: '#fff3e0', color: '#e65100', border: '1px solid #e65100' }}>
                          🔄 Revert to API
                        </button>
                      )}

                      {/* Mark completed (for testing) */}
                      {match.status !== 'completed' && match.home_score !== null && (
                        <button onClick={async () => {
                          const winnerId = match.home_score > match.away_score ? match.home_team_id : match.away_score > match.home_score ? match.away_team_id : null
                          await supabase.from('matches').update({ status: 'completed', winner_team_id: winnerId, use_manual_override: true }).eq('id', match.id)
                          await supabase.rpc('calculate_prediction_points', { p_match_id: match.id })
                          await logAudit('MARK_COMPLETED', { match_id: match.id })
                          setActionResult(`✅ Match ${match.match_number} marked complete — points calculated`)
                          loadMatches()
                        }} className="btn btn-sm" style={{ background: 'var(--accent-green)', color: 'white', border: 'none' }}>
                          ✅ Mark Complete
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
  )
}
