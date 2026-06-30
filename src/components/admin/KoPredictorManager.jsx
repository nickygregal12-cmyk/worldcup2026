export default function KoPredictorManager({ admin }) {
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

            {/* Info banner */}
            <div className="card" style={{ background: '#fff3e0', border: '1px solid #ff9800' }}>
              <div style={{ fontSize: '13px', color: '#e65100', fontWeight: '600' }}>
                🔥 Knockout Predictor — "Your Second Chance" launches 27 Jun 23:00 BST when all teams are confirmed.
                Use this panel to enter match results, manage leagues, and adjust points.
              </div>
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#8a4b00', lineHeight: 1.5 }}>
                Display target: exact 90-minute score 10 pts · correct 90-minute result 5 pts · correct advancing team +5 pts · correct method +3 pts · first-goal band +3 pts · joker doubles the total.
              </div>
            </div>

            {/* Quick actions */}
            <div className="card">
              <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '12px' }}>Quick Actions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button onClick={recalcAllKoPoints} disabled={koSaving.recalc} className="btn btn-primary" style={{ background: '#e65100' }}>
                  {koSaving.recalc ? '⏳ Recalculating...' : '🔄 Recalculate All KO Points'}
                </button>
                <button onClick={loadKoData} className="btn btn-secondary">🔃 Refresh KO Data</button>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {[
                { label: 'KO Leagues', value: koLeagues.length, icon: '🏆' },
                { label: 'Players', value: koUsers.length, icon: '👥' },
                { label: 'Predictions', value: '—', icon: '🎯' },
              ].map(s => (
                <div key={s.label} className="card" style={{ textAlign: 'center', padding: '14px' }}>
                  <div style={{ fontSize: '24px' }}>{s.icon}</div>
                  <div style={{ fontWeight: '800', fontSize: '20px', fontFamily: 'var(--font-mono)' }}>{s.value}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Match results entry */}
            <div className="card">
              <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '12px' }}>🔥 KO Match Results</div>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
                {['r32','r16','qf','sf','3rd','final'].map(stage => (
                  <button key={stage} onClick={() => setKoStageFilter(stage)} className="btn btn-sm" style={{
                    background: koStageFilter === stage ? '#e65100' : 'var(--bg-card)',
                    color: koStageFilter === stage ? 'white' : 'var(--text-secondary)',
                    border: '1px solid var(--border-light)',
                  }}>
                    {stage.toUpperCase()}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {koMatches.filter(m => m.stage === koStageFilter).map(match => {
                  const isEditing = koEditingMatch === match.id
                  const s = koScores[match.id] || {}
                  const outcomeType = s.outcome_type || '90mins'
                  const hasAetResult = outcomeType === 'et' || outcomeType === 'penalties'
                  const completedAetHome = match.aet_home_score ?? match.home_score_aet
                  const completedAetAway = match.aet_away_score ?? match.away_score_aet
                  const completedPensHome = match.home_score_pens
                  const completedPensAway = match.away_score_pens
                  const displayedWinner = match.winner_team_id === match.home_team_id
                    ? match.home_team?.short_code
                    : match.winner_team_id === match.away_team_id
                      ? match.away_team?.short_code
                      : null

                  return (
                    <div key={match.id} className="card" style={{ border: match.status === 'completed' ? '1px solid var(--accent-green)' : '1px solid var(--border-light)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                          Match #{match.match_number} · {fmt(match.kickoff_time)}
                          {match.use_manual_override && <span style={{ marginLeft: '6px', color: 'var(--accent-orange)' }}>MANUAL</span>}
                        </div>
                        <span className={`badge ${match.status === 'completed' ? 'badge-green' : match.status === 'live' ? 'badge-red' : 'badge-gray'}`}>
                          {match.status}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '22px' }}>{match.home_team?.flag_emoji || '🏳️'}</div>
                          <div style={{ fontSize: '12px', fontWeight: '700' }}>{match.home_team?.short_code || '?'}</div>
                        </div>
                        <div style={{ textAlign: 'center', fontSize: '18px', fontWeight: '800', fontFamily: 'var(--font-mono)' }}>
                          {match.status === 'completed' ? `${match.home_score ?? '?'} – ${match.away_score ?? '?'}` : 'vs'}
                          {match.status === 'completed' && (
                            <div style={{ marginTop: '3px', display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700' }}>
                              <span>{match.outcome_type === '90mins' || !match.outcome_type ? 'FULL TIME' : 'AFTER 90 MINS'}</span>
                              {match.outcome_type === 'et' && completedAetHome != null && completedAetAway != null && (
                                <span>AET {completedAetHome}–{completedAetAway}</span>
                              )}
                              {match.outcome_type === 'penalties' && (
                                <>
                                  {completedAetHome != null && completedAetAway != null && <span>AET {completedAetHome}–{completedAetAway}</span>}
                                  <span>
                                    PENS{completedPensHome != null && completedPensAway != null ? ` ${completedPensHome}–${completedPensAway}` : ''}
                                  </span>
                                </>
                              )}
                              {displayedWinner && <span style={{ color: '#e65100' }}>WINNER: {displayedWinner}</span>}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '22px' }}>{match.away_team?.flag_emoji || '🏳️'}</div>
                          <div style={{ fontSize: '12px', fontWeight: '700' }}>{match.away_team?.short_code || '?'}</div>
                        </div>
                      </div>

                      {isEditing && (
                        <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', marginBottom: '10px' }}>
                          <div style={{ marginBottom: '12px', padding: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                            Enter the result in order: <strong>score after 90 minutes</strong>, how the match ended, then the <strong>score after extra time</strong> and winner where required.
                          </div>

                          {/* Score after 90 minutes */}
                          <div style={{ marginBottom: '12px' }}>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px' }}>Score after 90 minutes</div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <input type="number" min="0" max="20" placeholder="H"
                                value={s.home ?? ''}
                                onChange={e => setKoScores(p => ({ ...p, [match.id]: { ...s, home: e.target.value } }))}
                                style={{ width: '58px', height: '40px', fontSize: '18px', fontWeight: '700', textAlign: 'center', border: '2px solid var(--border-medium)', borderRadius: 'var(--radius-sm)' }} />
                              <span style={{ fontWeight: '800', color: 'var(--text-muted)' }}>–</span>
                              <input type="number" min="0" max="20" placeholder="A"
                                value={s.away ?? ''}
                                onChange={e => setKoScores(p => ({ ...p, [match.id]: { ...s, away: e.target.value } }))}
                                style={{ width: '58px', height: '40px', fontSize: '18px', fontWeight: '700', textAlign: 'center', border: '2px solid var(--border-medium)', borderRadius: 'var(--radius-sm)' }} />
                            </div>
                          </div>

                          {/* Outcome type */}
                          <div style={{ marginBottom: '12px' }}>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px' }}>How did the match end?</div>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {[
                                { key: '90mins', label: '90 minutes' },
                                { key: 'et', label: 'Extra time' },
                                { key: 'penalties', label: 'Penalties' },
                              ].map(option => (
                                <button key={option.key}
                                  onClick={() => setKoScores(p => ({
                                    ...p,
                                    [match.id]: {
                                      ...s,
                                      outcome_type: option.key,
                                      winner_id: s.winner_id,
                                    },
                                  }))}
                                  style={{
                                    padding: '7px 11px', fontSize: '12px', fontWeight: '700', borderRadius: '6px', cursor: 'pointer',
                                    background: outcomeType === option.key ? '#e65100' : 'var(--bg-card)',
                                    color: outcomeType === option.key ? 'white' : 'var(--text-secondary)',
                                    border: '1px solid var(--border-light)',
                                  }}>
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Score after extra time */}
                          {hasAetResult && (
                            <div style={{ marginBottom: '12px' }}>
                              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '3px' }}>Score after extra time</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                                This is the total score after 120 minutes, not just the goals scored during extra time.
                              </div>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <input type="number" min="0" max="30" placeholder="H"
                                  value={s.aet_home ?? ''}
                                  onChange={e => setKoScores(p => ({ ...p, [match.id]: { ...s, aet_home: e.target.value } }))}
                                  style={{ width: '58px', height: '40px', fontSize: '18px', fontWeight: '700', textAlign: 'center', border: '2px solid var(--border-medium)', borderRadius: 'var(--radius-sm)' }} />
                                <span style={{ fontWeight: '800', color: 'var(--text-muted)' }}>–</span>
                                <input type="number" min="0" max="30" placeholder="A"
                                  value={s.aet_away ?? ''}
                                  onChange={e => setKoScores(p => ({ ...p, [match.id]: { ...s, aet_away: e.target.value } }))}
                                  style={{ width: '58px', height: '40px', fontSize: '18px', fontWeight: '700', textAlign: 'center', border: '2px solid var(--border-medium)', borderRadius: 'var(--radius-sm)' }} />
                              </div>
                            </div>
                          )}

                          {/* Penalty shootout score */}
                          {outcomeType === 'penalties' && (
                            <div style={{ marginBottom: '12px' }}>
                              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '3px' }}>Penalty shootout score</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                                Enter the final shootout score. The selected winner must match this score.
                              </div>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <input type="number" min="0" max="30" placeholder="H"
                                  value={s.pens_home ?? ''}
                                  onChange={e => setKoScores(p => ({ ...p, [match.id]: { ...s, pens_home: e.target.value } }))}
                                  style={{ width: '58px', height: '40px', fontSize: '18px', fontWeight: '700', textAlign: 'center', border: '2px solid var(--border-medium)', borderRadius: 'var(--radius-sm)' }} />
                                <span style={{ fontWeight: '800', color: 'var(--text-muted)' }}>–</span>
                                <input type="number" min="0" max="30" placeholder="A"
                                  value={s.pens_away ?? ''}
                                  onChange={e => setKoScores(p => ({ ...p, [match.id]: { ...s, pens_away: e.target.value } }))}
                                  style={{ width: '58px', height: '40px', fontSize: '18px', fontWeight: '700', textAlign: 'center', border: '2px solid var(--border-medium)', borderRadius: 'var(--radius-sm)' }} />
                              </div>
                            </div>
                          )}

                          {/* Winner picker */}
                          <div style={{ marginBottom: '12px' }}>
                              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                Select match winner
                              </div>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                {[
                                  { id: match.home_team_id, label: match.home_team?.short_code, flag: match.home_team?.flag_emoji },
                                  { id: match.away_team_id, label: match.away_team?.short_code, flag: match.away_team?.flag_emoji },
                                ].map(team => (
                                  <button key={team.id} onClick={() => setKoScores(p => ({ ...p, [match.id]: { ...s, winner_id: team.id } }))}
                                    style={{
                                      padding: '7px 14px', fontSize: '13px', fontWeight: '700', borderRadius: '6px', cursor: 'pointer',
                                      background: s.winner_id === team.id ? '#e65100' : 'var(--bg-card)',
                                      color: s.winner_id === team.id ? 'white' : 'var(--text-secondary)',
                                      border: '1px solid var(--border-light)',
                                    }}>
                                    {team.flag} {team.label}
                                  </button>
                                ))}
                              </div>
                              <div style={{ marginTop: '5px', fontSize: '10px', color: 'var(--text-muted)' }}>
                                {outcomeType === '90mins' && 'The selected winner must match the score after 90 minutes.'}
                                {outcomeType === 'et' && 'The selected winner must match the score after extra time.'}
                                {outcomeType === 'penalties' && 'The selected winner must match the penalty shootout score.'}
                              </div>
                            </div>

                          {/* First goal band */}
                          <div style={{ marginBottom: '12px' }}>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '3px' }}>First-goal band</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>Select the band containing the first goal. This is worth +3 pts when correct.</div>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {['0-15','16-30','31-45','46-60','61-75','76-90','et','no_goal'].map(band => (
                                <button key={band} onClick={() => setKoScores(p => ({ ...p, [match.id]: { ...s, first_goal_band: s.first_goal_band === band ? null : band } }))}
                                  style={{
                                    padding: '3px 8px', fontSize: '11px', borderRadius: '4px', cursor: 'pointer',
                                    background: s.first_goal_band === band ? 'var(--accent-blue)' : 'var(--bg-card)',
                                    color: s.first_goal_band === band ? 'white' : 'var(--text-muted)',
                                    border: '1px solid var(--border-light)',
                                  }}>
                                  {band === 'et' ? 'Extra time' : band === 'no_goal' ? 'No goal' : `${band} mins`}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => saveKoMatchResult(match)} disabled={koSaving[match.id]} className="btn btn-primary btn-sm" style={{ background: '#e65100' }}>
                              {koSaving[match.id] ? '...' : 'Save result & recalculate'}
                            </button>
                            <button onClick={() => setKoEditingMatch(null)} className="btn btn-secondary btn-sm">Cancel</button>
                          </div>
                        </div>
                      )}

                      {!isEditing && (
                        <button onClick={() => {
                          setKoEditingMatch(match.id)
                          setKoScores(p => ({ ...p, [match.id]: {
                            home: match.home_score ?? '',
                            away: match.away_score ?? '',
                            outcome_type: match.outcome_type || '90mins',
                            winner_id: match.winner_team_id || null,
                            aet_home: match.aet_home_score ?? match.home_score_aet ?? '',
                            aet_away: match.aet_away_score ?? match.away_score_aet ?? '',
                            pens_home: match.home_score_pens ?? '',
                            pens_away: match.away_score_pens ?? '',
                            first_goal_band: match.first_goal_band || null,
                          }}))
                        }} className="btn btn-secondary btn-sm">
                          ✏️ {match.status === 'completed' ? 'Edit Result' : 'Enter Result'}
                        </button>
                      )}
                    </div>
                  )
                })}
                {koMatches.filter(m => m.stage === koStageFilter).length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No matches found for this stage
                  </div>
                )}
              </div>
            </div>

            {/* KO Leaderboard */}
            <div className="card">
              <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '12px' }}>🔥 KO Leaderboard</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {koUsers.filter(u => u.ko_points > 0).slice(0, 20).map((u, i) => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', width: '24px' }}>#{i + 1}</span>
                    <span style={{ flex: 1, fontSize: '13px', fontWeight: '600' }}>{u.username}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '800', fontSize: '14px', color: '#e65100' }}>{u.ko_points}</span>
                    <button onClick={() => setKoPointAdjUser(u.id)}
                      style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--accent-blue)', color: 'var(--accent-blue)', background: 'none', cursor: 'pointer' }}>
                      Adjust
                    </button>
                    {koPointAdjUser === u.id && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <input type="number" placeholder="±pts" value={koPointAdjAmount} onChange={e => setKoPointAdjAmount(e.target.value)}
                          style={{ width: '70px', padding: '3px 6px', border: '1px solid var(--border-medium)', borderRadius: '4px', fontSize: '12px' }} />
                        <input type="text" placeholder="reason" value={koPointAdjReason} onChange={e => setKoPointAdjReason(e.target.value)}
                          style={{ width: '100px', padding: '3px 6px', border: '1px solid var(--border-medium)', borderRadius: '4px', fontSize: '12px' }} />
                        <button onClick={applyKoPointAdjustment} style={{ padding: '3px 8px', background: '#e65100', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>✓</button>
                        <button onClick={() => setKoPointAdjUser(null)} style={{ padding: '3px 8px', background: 'var(--bg-tertiary)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>×</button>
                      </div>
                    )}
                  </div>
                ))}
                {koUsers.filter(u => u.ko_points > 0).length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No KO points awarded yet — launches 27 Jun
                  </div>
                )}
              </div>
            </div>

            {/* KO Leagues */}
            <div className="card">
              <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '12px' }}>🏆 KO Leagues ({koLeagues.length})</div>
              {koLeagues.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No KO leagues created yet
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {koLeagues.map(league => (
                    <div key={league.id} style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '14px' }}>{league.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Code: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700' }}>{league.invite_code}</span>
                            · Created by {league.creator?.username || '?'}
                            · {league.members?.length || 0} members
                          </div>
                        </div>
                        <button onClick={() => setConfirmAction({ type: 'deleteKoLeague', leagueId: league.id, leagueName: league.name })}
                          className="btn btn-sm" style={{ background: '#e53935', color: 'white', border: 'none' }}>
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
  )
}
