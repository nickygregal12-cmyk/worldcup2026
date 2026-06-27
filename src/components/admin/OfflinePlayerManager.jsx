export default function OfflinePlayerManager({ admin }) {
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

            {/* Add + Search controls */}
            <div className="card" style={{ border: '1px solid var(--scottish-navy)' }}>
              <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: '12px' }}>👤 Add Offline Player</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input className="input" placeholder="Display name (e.g. Dave's Picks)"
                  value={offlineDisplayName} onChange={e => setOfflineDisplayName(e.target.value)} />
                <select className="input" value={offlineLeagueId} onChange={e => setOfflineLeagueId(e.target.value)}>
                  <option value="">Select a league...</option>
                  {leagues.filter(l => !l.is_global).map(l => (
                    <option key={l.id} value={l.id}>{l.name} ({l.members?.length || 0} members)</option>
                  ))}
                </select>
                <button onClick={createOfflinePlayer}
                  disabled={offlineCreating || !offlineDisplayName.trim() || !offlineLeagueId}
                  className="btn btn-primary">
                  {offlineCreating ? '⏳ Creating...' : '➕ Create Offline Player'}
                </button>
              </div>
            </div>

            {/* Filter controls */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input className="input" placeholder="🔍 Search by name..." style={{ flex: 1 }}
                value={offlineSearch} onChange={e => setOfflineSearch(e.target.value)} />
              <select className="input" style={{ flex: 1 }}
                value={offlineLeagueFilter} onChange={e => setOfflineLeagueFilter(e.target.value)}>
                <option value="">All leagues</option>
                {leagues.filter(l => !l.is_global).map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            {/* Import preview */}
            {offlineImportPreview && (
              <div className="card" style={{ border: '2px solid var(--accent-green)' }}>
                <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: '10px' }}>📋 Import Preview</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '14px' }}>✅ <strong>{offlineImportPreview.predictions.length}</strong> / 72 predictions found</div>
                  <div style={{ fontSize: '14px' }}>🃏 <strong>{offlineImportPreview.jokersFound}</strong> jokers applied</div>
                  {offlineImportPreview.missingNums?.length > 0 && (
                    <div style={{ padding: '8px', background: 'rgba(184,134,11,0.1)', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--accent-gold)' }}>
                      ⚠️ <strong>{offlineImportPreview.missingNums.length} missing:</strong> M{offlineImportPreview.missingNums.join(', M')} — enter these manually after importing
                    </div>
                  )}
                  {offlineImportPreview.unmatched?.length > 0 && (
                    <div style={{ padding: '8px', background: 'var(--accent-red-light)', borderRadius: 'var(--radius-md)', fontSize: '12px' }}>
                      ⚠️ <strong>{offlineImportPreview.unmatched.length} unmatched teams:</strong> {offlineImportPreview.unmatched.join(', ')}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={confirmImport} disabled={offlineImporting} className="btn btn-primary btn-sm">
                    {offlineImporting ? '⏳ Saving...' : '✅ Confirm Import'}
                  </button>
                  <button onClick={() => setOfflineImportPreview(null)} className="btn btn-secondary btn-sm">Cancel</button>
                </div>
              </div>
            )}

            {/* Existing offline players */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>
                {offlinePlayers.length} offline player{offlinePlayers.length !== 1 ? 's' : ''}
              </div>
              <button onClick={downloadOfflineTemplate}
                className="btn btn-sm"
                style={{ fontSize: '12px', background: 'var(--accent-green)', color: 'white', border: 'none' }}>
                ⬇️ Download blank Excel template
              </button>
            </div>

            {/* Compact table */}
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
              {/* Header row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px', gap: '8px', padding: '8px 12px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <span>Player</span>
                <span>League</span>
                <span style={{ textAlign: 'right' }}>Actions</span>
              </div>
              {offlinePlayers
                .filter(p => {
                  const matchSearch = !offlineSearch || p.display_name?.toLowerCase().includes(offlineSearch.toLowerCase())
                  const matchLeague = !offlineLeagueFilter || p.league_id === offlineLeagueFilter
                  return matchSearch && matchLeague
                })
                .map((player, idx, arr) => {
                const isCollapsed = collapsedPlayers[player.id] !== false
                return (
                <div key={player.id}>
                  {/* Compact row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px', gap: '8px', padding: '10px 12px', borderBottom: idx < arr.length - 1 || !isCollapsed ? '1px solid var(--border-light)' : 'none', alignItems: 'center' }}>
                    <div style={{ fontWeight: '700', fontSize: '13px' }}>👤 {player.display_name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{player.league?.name || '—'}</div>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                      <button onClick={() => generateInviteLink(player.id, player.display_name)}
                        title="Generate & copy a unique signup link for this player. They click it, create an account, and their predictions are linked automatically. Valid for 7 days." className="btn btn-sm" style={{ background: 'var(--scottish-navy)', color: 'white', border: 'none', fontSize: '11px', padding: '3px 7px' }}>
                        📧
                      </button>
                      <button onClick={() => setCollapsedPlayers(prev => ({ ...prev, [player.id]: !isCollapsed }))}
                        className="btn btn-sm" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', fontSize: '11px', padding: '3px 7px' }}>
                        {isCollapsed ? '▼' : '▲'}
                      </button>
                      <button onClick={() => setConfirmAction({ type: 'deleteOfflinePlayer', playerId: player.id, displayName: player.display_name })}
                        className="btn btn-sm" style={{ background: '#e53935', color: 'white', border: 'none', padding: '3px 7px' }}>
                        🗑️
                      </button>
                    </div>
                  </div>
                  {/* Expanded detail */}
                  {!isCollapsed && <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)' }}>

                {/* Import section */}
                <div style={{ marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>
                      📥 Import predictions
                    </div>
                    <button onClick={downloadOfflineTemplate}
                      className="btn btn-sm"
                      style={{ fontSize: '11px', padding: '3px 10px', background: 'var(--accent-green)', color: 'white', border: 'none' }}>
                      ⬇️ Download blank template
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>📊 Excel / CSV</div>
                      <input type="file" accept=".xlsx,.xls,.csv"
                        onChange={e => { if (e.target.files[0]) parseExcelFile(e.target.files[0], player.id) }}
                        style={{ fontSize: '11px', width: '100%' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>📄 PDF predictor sheet</div>
                      <input type="file" accept=".pdf"
                        onChange={e => { if (e.target.files[0]) parsePdfFile(e.target.files[0], player.id) }}
                        style={{ fontSize: '11px', width: '100%' }} />
                    </div>
                  </div>
                  {offlineImporting && (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div className="spinner" style={{ width: '12px', height: '12px' }} />
                      Parsing file with AI — this may take 15-30 seconds...
                    </div>
                  )}
                </div>

                {/* Manual score entry toggle buttons */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                  <button onClick={async () => {
                    const newPlayer = offlineSelectedPlayer?.id === player.id ? null : player
                    setOfflineSelectedPlayer(newPlayer)
                    setOfflineKoMode(null)
                    if (newPlayer) {
                      const { data: preds } = await supabase.from('offline_predictions')
                        .select('offline_player_id, match_id, home_score, away_score, is_confident, picked_team_id')
                        .eq('offline_player_id', player.id)
                      const updates = {}
                      ;(preds || []).forEach(p => {
                        updates[`${p.offline_player_id}-${p.match_id}`] = {
                          home: p.home_score ?? '', away: p.away_score ?? '',
                          joker: p.is_confident || false,
                          picked_team_id: p.picked_team_id || null,
                          saved: true
                        }
                      })
                      setOfflineManualScores(prev => ({ ...prev, ...updates }))
                    }
                  }}
                    className="btn btn-sm" style={{ flex: 1, border: '1px solid var(--scottish-navy)', color: offlineSelectedPlayer?.id === player.id ? 'white' : 'var(--scottish-navy)', background: offlineSelectedPlayer?.id === player.id ? 'var(--scottish-navy)' : 'none' }}>
                    ⚽ {offlineSelectedPlayer?.id === player.id ? '▲ Hide groups' : '⌨️ Group scores'}
                  </button>
                  <button onClick={async () => {
                    const newMode = offlineKoMode === player.id ? null : player.id
                    setOfflineKoMode(newMode)
                    setOfflineSelectedPlayer(null)
                    // Load this player's predictions into state if not already loaded
                    if (newMode) {
                      const { data: preds } = await supabase.from('offline_predictions')
                        .select('offline_player_id, match_id, home_score, away_score, is_confident, picked_team_id')
                        .eq('offline_player_id', player.id)
                      const updates = {}
                      ;(preds || []).forEach(p => {
                        updates[`${p.offline_player_id}-${p.match_id}`] = {
                          home: p.home_score ?? '', away: p.away_score ?? '',
                          joker: p.is_confident || false,
                          picked_team_id: p.picked_team_id || null,
                          saved: true
                        }
                      })
                      setOfflineManualScores(prev => ({ ...prev, ...updates }))
                    }
                  }}
                    className="btn btn-sm" style={{ flex: 1, border: '1px solid var(--scottish-navy)', color: offlineKoMode === player.id ? 'white' : 'var(--scottish-navy)', background: offlineKoMode === player.id ? 'var(--scottish-navy)' : 'none' }}>
                    🏆 {offlineKoMode === player.id ? '▲ Hide knockouts' : 'Knockout picks'}
                  </button>
                </div>

                {/* Knockout picks mode */}
                {offlineKoMode === player.id && (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '4px' }}>
                      Pick which team advances — teams resolved from group predictions
                    </div>
                    {(() => {
                      // Build predMap from group predictions
                      const predMap = {}
                      const groupMatches = matches.filter(m => m.stage === 'group')
                      groupMatches.forEach(m => {
                        const key = `${player.id}-${m.id}`
                        const val = offlineManualScores[key]
                        if (val?.home !== undefined && val?.home !== '' && val?.away !== undefined && val?.away !== '') {
                          predMap[m.id] = { home: parseInt(val.home), away: parseInt(val.away) }
                        }
                      })
                      const standings = calcPredictedStandings(groupMatches, predMap, true)

                      // Resolve a slot — handles both group slots (1A, 2B) and W slots (W73, W74)
                      const resolveOfflineSlot = (slot) => {
                        if (!slot) return null
                        if (slot.startsWith('W')) {
                          // Look up who the player picked to win that match
                          const matchNum = parseInt(slot.replace('W', ''))
                          const koMatch = matches.find(m => m.match_number === matchNum)
                          if (!koMatch) return null
                          const koKey = `${player.id}-${koMatch.id}`
                          const koVal = offlineManualScores[koKey]
                          if (!koVal?.picked_team_id) return null
                          // Find the team object
                          const allTeams = matches.flatMap(m => [m.home_team, m.away_team]).filter(Boolean)
                          return allTeams.find(t => t?.id === koVal.picked_team_id) || null
                        }
                        return resolveSlot(slot, standings, groupMatches, predMap)
                      }

                      return ALL_STAGES.map(stage => (
                        <div key={stage.key}>
                          <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 0 4px' }}>{stage.label} · {stage.points}pts</div>
                          {stage.matches.map(matchDef => {
                            const dbMatch = matches.find(m => m.match_number === matchDef.match_number)
                            if (!dbMatch) return null
                            const key = `${player.id}-${dbMatch.id}`
                            const val = offlineManualScores[key] || {}
                            const homeTeam = resolveOfflineSlot(matchDef.home_slot)
                            const awayTeam = resolveOfflineSlot(matchDef.away_slot)
                            const teams = [homeTeam, awayTeam].filter(Boolean)
                            const pickedTeam = teams.find(t => t?.id === val.picked_team_id)
                            return (
                              <div key={matchDef.match_number} style={{ padding: '6px 8px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: `1px solid ${val.picked_team_id ? 'var(--accent-green)' : 'var(--border-light)'}`, marginBottom: '3px' }}>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                  M{matchDef.match_number} · {matchDef.home_slot} vs {matchDef.away_slot}
                                  {val.picked_team_id && <span style={{ color: 'var(--accent-green)', marginLeft: '6px' }}>✓ {pickedTeam?.name || 'Picked'}</span>}
                                </div>
                                {teams.length === 0 ? (
                                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                    {matchDef.home_slot.startsWith('W') ? `Pick M${matchDef.home_slot.replace('W','')} winner first` : '⚠️ Enter group predictions first'}
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    {teams.map(team => (
                                      <button key={team.id}
                                        onClick={async () => {
                                          const newPickId = val.picked_team_id === team.id ? null : team.id
                                          setOfflineManualScores(prev => ({ ...prev, [key]: { ...prev[key], picked_team_id: newPickId } }))
                                          await supabase.from('offline_predictions').upsert({
                                            offline_player_id: player.id, match_id: dbMatch.id, picked_team_id: newPickId,
                                          }, { onConflict: 'offline_player_id,match_id' })
                                        }}
                                        style={{ flex: 1, padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: `1.5px solid ${val.picked_team_id === team.id ? 'var(--accent-green)' : 'var(--border-light)'}`, background: val.picked_team_id === team.id ? 'var(--accent-green-light)' : 'var(--bg-secondary)', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                                        {team.flag_emoji} {team.short_code || team.name}{val.picked_team_id === team.id && ' ✓'}
                                      </button>
                                    ))}
                                    {teams.length === 1 && <div style={{ flex: 1, padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1.5px dashed var(--border-medium)', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>TBD</div>}
                                  </div>
                                )}
                                {/* Override — pick any team if bracket prediction was wrong */}
                                <details style={{ marginTop: '4px' }}>
                                  <summary style={{ fontSize: '10px', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>🔧 Override — pick any team</summary>
                                  <select onChange={async e => {
                                    if (!e.target.value) return
                                    const newId = e.target.value
                                    setOfflineManualScores(prev => ({ ...prev, [key]: { ...prev[key], picked_team_id: newId } }))
                                    await supabase.from('offline_predictions').upsert({
                                      offline_player_id: player.id, match_id: dbMatch.id, picked_team_id: newId,
                                    }, { onConflict: 'offline_player_id,match_id' })
                                  }} value={val.picked_team_id || ''}
                                    style={{ width: '100%', marginTop: '4px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-light)', fontSize: '12px' }}>
                                    <option value="">Select any team...</option>
                                    {matches.reduce((acc, m) => {
                                      if (m.home_team && !acc.find(t => t.id === m.home_team.id)) acc.push(m.home_team)
                                      if (m.away_team && !acc.find(t => t.id === m.away_team.id)) acc.push(m.away_team)
                                      return acc
                                    }, []).sort((a,b) => a.name?.localeCompare(b.name)).map(t => (
                                      <option key={t.id} value={t.id}>{t.flag_emoji} {t.name}</option>
                                    ))}
                                  </select>
                                </details>
                              </div>
                            )
                          })}
                        </div>
                      ))
                    })()}
                  </div>
                )}

                {/* Group scores section */}
                {offlineSelectedPlayer?.id === player.id && (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Enter scores — saves on blur</span>
                      <span style={{ color: 'var(--accent-gold)' }}>
                        🃏 {Object.keys(offlineManualScores).filter(k => k.startsWith(player.id) && offlineManualScores[k]?.joker).length} / {
                          (() => { const league = leagues.find(l => l.id === player.league_id); return league?.custom_scoring?.group_jokers ?? 8 })()
                        } jokers used
                      </span>
                    </div>
                    {matches.filter(m => m.stage === 'group').map(match => {
                      const key = `${player.id}-${match.id}`
                      const val = offlineManualScores[key] || {}
                      const hasPred = val.home !== '' && val.away !== '' && val.home !== undefined
                      const maxJokers = (() => { const league = leagues.find(l => l.id === player.league_id); return league?.custom_scoring?.group_jokers ?? 8 })()
                      const jokersUsed = Object.keys(offlineManualScores).filter(k => k.startsWith(player.id) && offlineManualScores[k]?.joker).length
                      const canAddJoker = !val.joker && jokersUsed >= maxJokers
                      return (
                        <div key={match.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 8px', background: hasPred ? 'rgba(0,122,51,0.05)' : 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: val.joker ? '1px solid var(--accent-gold)' : hasPred ? '1px solid rgba(0,122,51,0.15)' : '1px solid var(--border-light)' }}>
                          <span style={{ fontSize: '11px', flex: 1, fontWeight: hasPred ? '600' : '400' }}>
                            {match.home_team?.flag_emoji} {match.home_team?.short_code}
                            <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>vs</span>
                            {match.away_team?.short_code} {match.away_team?.flag_emoji}
                          </span>
                          <input type="number" min="0" max="20" placeholder="0"
                            value={val.home ?? ''}
                            onChange={e => setOfflineManualScores(prev => ({ ...prev, [key]: { ...prev[key], home: e.target.value, saved: false } }))}
                            onBlur={() => saveManualScore(player.id, match.id, val.home, val.away, val.joker || false)}
                            style={{ width: '36px', textAlign: 'center', padding: '3px', borderRadius: '4px', border: '1px solid var(--border-light)', fontSize: '13px', fontWeight: '700' }} />
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>–</span>
                          <input type="number" min="0" max="20" placeholder="0"
                            value={val.away ?? ''}
                            onChange={e => setOfflineManualScores(prev => ({ ...prev, [key]: { ...prev[key], away: e.target.value, saved: false } }))}
                            onBlur={() => saveManualScore(player.id, match.id, val.home, val.away, val.joker || false)}
                            style={{ width: '36px', textAlign: 'center', padding: '3px', borderRadius: '4px', border: '1px solid var(--border-light)', fontSize: '13px', fontWeight: '700' }} />
                          <button
                            disabled={canAddJoker}
                            title={canAddJoker ? 'Joker limit reached' : val.joker ? 'Remove joker' : 'Add joker'}
                            onClick={() => {
                              const newJoker = !val.joker
                              setOfflineManualScores(prev => ({ ...prev, [key]: { ...prev[key], joker: newJoker } }))
                              if (hasPred) saveManualScore(player.id, match.id, val.home, val.away, newJoker)
                            }}
                            style={{ fontSize: '14px', background: 'none', border: 'none', cursor: canAddJoker ? 'not-allowed' : 'pointer', opacity: canAddJoker ? 0.3 : 1, padding: '0 2px' }}>
                            🃏
                          </button>
                          {val.saved && <span style={{ fontSize: '11px', color: 'var(--accent-green)', minWidth: '12px' }}>✓</span>}
                        </div>
                      )
                    })}
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>
                      {Object.keys(offlineManualScores).filter(k => k.startsWith(player.id) && offlineManualScores[k]?.home !== '').length} / {matches.filter(m => m.stage === 'group').length} predictions entered
                    </div>
                  </div>
                )}
                </div>}
                </div>
              )})}
            </div>

            {offlinePlayers.filter(p => {
              const matchSearch = !offlineSearch || p.display_name?.toLowerCase().includes(offlineSearch.toLowerCase())
              const matchLeague = !offlineLeagueFilter || p.league_id === offlineLeagueFilter
              return matchSearch && matchLeague
            }).length === 0 && (
              <div className="card" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>👤</div>
                <div style={{ fontWeight: '700' }}>No offline players yet</div>
                <div style={{ fontSize: '13px', marginTop: '4px' }}>Add one above to include non-registered players in a mini league</div>
              </div>
            )}
          </div>
  )
}
