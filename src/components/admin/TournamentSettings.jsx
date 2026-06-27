export default function TournamentSettings({ admin }) {
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
<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* ── GAME PHASE CONTROL ── */}
            <div className="card" style={{ border: '2px solid var(--scottish-navy)' }}>
              <div style={{ fontWeight: '800', fontSize: '16px', marginBottom: '4px' }}>🎮 Game Phase Control</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                Override the automatic date-based phase for testing. Set to "Auto" to use real dates.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                {[
                  { key: 'auto', label: '🔄 Auto (use real dates)', desc: `Currently: ${new Date() < DATES.TOURNAMENT_START ? 'Pre-Tournament' : new Date() < DATES.GROUP_STAGE_END ? 'Group Stage' : 'KO Predictor'}` },
                  { key: 'pre_tournament', label: '⏳ Pre-Tournament', desc: 'Before 11 Jun — predictions open, no scores yet' },
                  { key: 'group_stage', label: '⚽ Group Stage', desc: '11–27 Jun — matches live, scores coming in' },
                  { key: 'knockout_banner', label: '📣 KO Banner Live', desc: '20 Jun+ — teaser banner showing on home' },
                  { key: 'ko_predictor', label: '🔥 KO Predictor Live', desc: '27 Jun+ — second game fully open' },
                  { key: 'post_tournament', label: '🏆 Post Tournament', desc: 'After 19 Jul — all results locked' },
                ].map(phase => {
                  const currentVal = settings.game_phase_override || 'auto'
                  const isActive = currentVal === phase.key
                  return (
                    <button key={phase.key} onClick={() => updateSetting('game_phase_override', phase.key === 'auto' ? '' : phase.key)} style={{
                      padding: '10px 14px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                      background: isActive ? 'var(--scottish-navy)' : 'var(--bg-secondary)',
                      border: isActive ? '2px solid var(--scottish-navy)' : '2px solid var(--border-light)',
                      color: isActive ? 'white' : 'var(--text-primary)',
                      textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '2px',
                    }}>
                      <span style={{ fontWeight: '700', fontSize: '13px' }}>{phase.label}</span>
                      <span style={{ fontSize: '11px', opacity: isActive ? 0.8 : 0.6 }}>{phase.desc}</span>
                    </button>
                  )
                })}
              </div>

              {settings.game_phase_override && (
                <div style={{ padding: '8px 12px', background: '#fff3e0', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: '#e65100', fontWeight: '600' }}>
                  ⚠️ Phase override active: <strong>{settings.game_phase_override}</strong> — real dates are ignored. Set to Auto to restore.
                </div>
              )}
            </div>

            {/* ── TEST MODE ── */}
            <div className="card" style={{ border: '1px solid var(--accent-orange)' }}>
              <div style={{ fontWeight: '800', fontSize: '16px', marginBottom: '4px' }}>🧪 Test Mode</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                Preview how a match result will look without writing to the database or awarding points.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Match picker */}
                <div>
                  <label className="label">Pick a match to preview</label>
                  <select className="input" value={testMatchId || ''} onChange={e => setTestMatchId(e.target.value)}>
                    <option value="">Select a match...</option>
                    {matches.filter(m => m.stage === 'group').slice(0, 20).map(m => (
                      <option key={m.id} value={m.id}>
                        Match {m.match_number} · {m.home_team?.short_code} vs {m.away_team?.short_code}
                      </option>
                    ))}
                  </select>
                </div>

                {testMatchId && (
                  <>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input type="number" min="0" max="20" placeholder="Home" value={testHome}
                        onChange={e => setTestHome(e.target.value)}
                        style={{ width: '60px', height: '40px', fontSize: '20px', fontWeight: '800', textAlign: 'center', border: '2px solid var(--border-medium)', borderRadius: 'var(--radius-sm)' }} />
                      <span style={{ fontWeight: '800', color: 'var(--text-muted)', fontSize: '20px' }}>–</span>
                      <input type="number" min="0" max="20" placeholder="Away" value={testAway}
                        onChange={e => setTestAway(e.target.value)}
                        style={{ width: '60px', height: '40px', fontSize: '20px', fontWeight: '800', textAlign: 'center', border: '2px solid var(--border-medium)', borderRadius: 'var(--radius-sm)' }} />
                      <button onClick={runTestPreview} disabled={!testHome || !testAway || testLoading}
                        className="btn btn-primary btn-sm" style={{ background: 'var(--accent-orange)' }}>
                        {testLoading ? '⏳' : '👁 Preview'}
                      </button>
                    </div>

                    {testResult && (
                      <div style={{ padding: '14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
                        <div style={{ fontWeight: '700', marginBottom: '8px' }}>Preview Result (no DB changes)</div>
                        {testResult.map((r, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border-light)' }}>
                            <span>{r.username}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
                              picked {r.home}–{r.away}
                            </span>
                            <span style={{ fontWeight: '700', color: r.points > 0 ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                              +{r.points}pts {r.exact ? '🎯' : r.correct ? '✅' : '❌'}
                            </span>
                          </div>
                        ))}
                        <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                          This is a preview only — no points have been awarded
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* ── EXISTING SETTINGS ── */}
            {[
              { section: '⚽ Predictions' },
              { key: 'predictions_open', label: 'Group Predictions Open', desc: 'Allow users to make/edit group stage predictions', type: 'toggle' },
              { key: 'awards_locked', label: 'Awards Locked', desc: 'Override: lock award predictions early', type: 'toggle' },
              { key: 'knockout_picks_open', label: 'Knockout Picks Open', desc: 'Allow users to make/edit knockout bracket picks', type: 'toggle' },
              { section: '🔄 Live Data' },
              { key: 'live_api_enabled', label: 'Live Score Sync', desc: 'Enable automatic score syncing from football-data.org', type: 'toggle' },
              { key: 'show_odds', label: 'Show Betting Odds', desc: 'Display odds on prediction cards', type: 'toggle' },
              { section: '🔧 Platform' },
              { key: 'maintenance_mode', label: 'Maintenance Mode', desc: 'Show maintenance message to all non-admin users', type: 'toggle' },
              { key: 'points_maintenance', label: '🔧 Points Maintenance Mode', desc: 'Hide all points/scores from users — show "points being updated" message instead. Use when recalculating or fixing scores.', type: 'toggle' },
              { key: 'registration_open', label: 'Registration Open', desc: 'Allow new user registrations', type: 'toggle' },
              { section: '📊 Group Standings' },
              { key: 'show_group_tables', label: 'Show Group Tables', desc: 'Show real vs predicted standings tab on predictions page', type: 'toggle' },
              { section: '🔥 Knockout Predictor' },
              { key: 'ko_predictor_enabled', label: 'KO Predictor Enabled', desc: 'Show KO Predictor to users (launches 27 Jun)', type: 'toggle' },
              { key: 'ko_predictions_open', label: 'KO Predictions Open', desc: 'Allow users to make/edit KO predictions', type: 'toggle' },
              { key: 'ko_banner_visible', label: 'KO Banner Visible', desc: 'Show "Coming 28 Jun" banner on home page', type: 'toggle' },
              { key: 'ko_autofill_enabled', label: 'KO Autofill Enabled', desc: 'Allow lucky dip autofill for KO predictions', type: 'toggle' },
              { key: 'ko_first_goal_scorer_enabled', label: 'First Goal Scorer', desc: 'Enable first goal scorer predictions (post-launch)', type: 'toggle' },
            ].map((setting, idx) => (
              setting.section ? (
                <div key={idx} style={{ fontWeight: '800', fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: idx > 0 ? '8px' : 0 }}>
                  {setting.section}
                </div>
              ) :
              <div key={setting.key} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '2px' }}>{setting.label}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{setting.desc}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>key: {setting.key}</div>
                  </div>
                  {setting.type === 'toggle' ? (
                    <button
                      onClick={() => updateSetting(setting.key, settings[setting.key] === 'true' ? 'false' : 'true')}
                      style={{
                        width: '48px', height: '26px', borderRadius: '13px', border: 'none', cursor: 'pointer', flexShrink: 0,
                        background: settings[setting.key] === 'true' ? 'var(--accent-green)' : 'var(--bg-tertiary)',
                        position: 'relative', transition: 'background 0.2s',
                      }}
                    >
                      <span style={{
                        position: 'absolute', top: '3px',
                        left: settings[setting.key] === 'true' ? '25px' : '3px',
                        width: '20px', height: '20px', borderRadius: '50%',
                        background: 'white', transition: 'left 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }} />
                    </button>
                  ) : (
                    <input
                      type="text"
                      value={settings[setting.key] || ''}
                      onChange={e => setSettings(prev => ({ ...prev, [setting.key]: e.target.value }))}
                      onBlur={e => updateSetting(setting.key, e.target.value)}
                      className="input"
                      style={{ width: '160px' }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
  )
}
