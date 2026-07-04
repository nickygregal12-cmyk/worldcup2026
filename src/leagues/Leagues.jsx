import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createLeague, deleteLeague, getMyLeagues, joinLeague, leaveLeague, loadLeagueHeadToHead, loadLeagueOverview, readLeagueSession } from './leagueService.js'
import { buildLeagueLifecycleState, buildStandingComparison, LEAGUE_COMPETITION, validateJoinCode, validateLeagueName } from './leagueModel.js'
import { createLatestRequestGuard } from '../lib/latestRequest.js'
import { CompetitionLifecycleNote, CompetitionTabs, LeagueActionConfirmation, LeagueCompetitionHeading, LeagueKoReadinessCard, LeagueLifecycleBanner, LeaguePicker, LeagueSummaryCard, MemberPicker, StandingsTable } from './LeaguePresentation.jsx'
import { PlayerHeadToHead, PLAYER_COMPARISON_CONTEXT } from '../player/index.js'

function messageForError(error) {
  const message = error instanceof Error ? error.message : String(error)
  if (/League code was not found/i.test(message)) return 'That league code was not found for Euro 2028.'
  if (/League membership is required/i.test(message)) return 'You are no longer a member of that league.'
  return message
}

export default function Leagues({ client, tournamentId, reference, lifecycle, koReadiness }) {
  const [session, setSession] = useState(null)
  const [loadingSession, setLoadingSession] = useState(Boolean(client))
  const [leagues, setLeagues] = useState([])
  const [leagueListStatus, setLeagueListStatus] = useState('idle')
  const [selectedLeagueId, setSelectedLeagueId] = useState(null)
  const [competitionKey, setCompetitionKey] = useState(LEAGUE_COMPETITION.ORIGINAL)
  const [overview, setOverview] = useState({ status: 'idle', data: null, leagueId: null })
  const [actionStatus, setActionStatus] = useState('idle')
  const [notice, setNotice] = useState(null)
  const [createName, setCreateName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [comparison, setComparison] = useState(null)
  const [comparisonMemberId, setComparisonMemberId] = useState('')
  const [pendingLeagueAction, setPendingLeagueAction] = useState(null)
  const overviewRequests = useRef(createLatestRequestGuard())
  const comparisonRequests = useRef(createLatestRequestGuard())

  const selectedLeague = useMemo(
    () => leagues.find(league => league.id === selectedLeagueId) ?? leagues[0] ?? null,
    [leagues, selectedLeagueId],
  )

  const refreshLeagues = useCallback(async preferredId => {
    if (!client || !session?.user || !tournamentId) return []
    setLeagueListStatus('loading')
    try {
      const nextLeagues = await getMyLeagues(client, tournamentId)
      setLeagues(nextLeagues)
      setSelectedLeagueId(previous => {
        if (preferredId && nextLeagues.some(league => league.id === preferredId)) return preferredId
        return nextLeagues.some(league => league.id === previous) ? previous : nextLeagues[0]?.id ?? null
      })
      setLeagueListStatus('ready')
      return nextLeagues
    } catch (error) {
      setLeagueListStatus('error')
      throw error
    }
  }, [client, session, tournamentId])

  const refreshOverview = useCallback(async () => {
    if (!client || !selectedLeague?.id) {
      overviewRequests.current.cancel()
      setOverview({ status: 'idle', data: null, leagueId: null })
      return
    }
    const leagueId = selectedLeague.id
    const requestToken = overviewRequests.current.begin()
    setOverview(previous => ({ ...previous, status: 'loading', leagueId }))
    try {
      const data = await loadLeagueOverview(client, leagueId)
      if (!overviewRequests.current.isCurrent(requestToken)) return
      setOverview({ status: data.status, data, leagueId })
    } catch (error) {
      if (!overviewRequests.current.isCurrent(requestToken)) return
      setOverview(previous => ({
        status: previous.data ? 'partial' : 'error',
        data: previous.data,
        leagueId,
      }))
      setNotice({ tone: 'danger', message: messageForError(error) })
    }
  }, [client, selectedLeague])

  useEffect(() => {
    if (!client) return undefined
    let active = true
    readLeagueSession(client)
      .then(nextSession => {
        if (!active) return
        setSession(nextSession)
        setLoadingSession(false)
      })
      .catch(error => {
        if (!active) return
        setLoadingSession(false)
        setNotice({ tone: 'danger', message: messageForError(error) })
      })

    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setLoadingSession(false)
      if (!nextSession) {
        setLeagues([])
        setSelectedLeagueId(null)
        setOverview({ status: 'idle', data: null, leagueId: null })
        comparisonRequests.current.cancel()
        overviewRequests.current.cancel()
        setComparison(null)
        setComparisonMemberId('')
        setPendingLeagueAction(null)
      }
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [client])

  useEffect(() => {
    if (!client || !session?.user || !tournamentId) return undefined
    let active = true
    getMyLeagues(client, tournamentId)
      .then(nextLeagues => {
        if (!active) return
        setLeagues(nextLeagues)
        setSelectedLeagueId(previous => (
          nextLeagues.some(league => league.id === previous) ? previous : nextLeagues[0]?.id ?? null
        ))
        setLeagueListStatus('ready')
      })
      .catch(error => {
        if (!active) return
        setLeagueListStatus('error')
        setNotice({ tone: 'danger', message: messageForError(error) })
      })
    return () => { active = false }
  }, [client, session, tournamentId])

  useEffect(() => {
    if (!client || !selectedLeague?.id) return undefined
    const requestGuard = overviewRequests.current
    void refreshOverview()
    return () => { requestGuard.cancel() }
  }, [client, refreshOverview, selectedLeague])

  const run = async action => {
    setNotice(null)
    setActionStatus('loading')
    try {
      await action()
      setActionStatus('ready')
      return true
    } catch (error) {
      setActionStatus('error')
      setNotice({ tone: 'danger', message: messageForError(error) })
      return false
    }
  }

  const submitCreate = event => {
    event.preventDefault()
    const checked = validateLeagueName(createName)
    if (!checked.valid) {
      setNotice({ tone: 'danger', message: checked.error })
      return
    }
    run(async () => {
      const created = await createLeague(client, { tournamentId, name: checked.value })
      setCreateName('')
      await refreshLeagues(created.league_id)
      setNotice({ tone: 'safe', message: `${created.name} was created.` })
    })
  }

  const submitJoin = event => {
    event.preventDefault()
    const checked = validateJoinCode(joinCode)
    if (!checked.valid) {
      setNotice({ tone: 'danger', message: checked.error })
      return
    }
    run(async () => {
      const joined = await joinLeague(client, { tournamentId, joinCode: checked.value })
      setJoinCode('')
      await refreshLeagues(joined.league_id)
      setNotice({ tone: 'safe', message: `Joined ${joined.name}.` })
    })
  }

  const confirmLeagueAction = async () => {
    if (!selectedLeague || !pendingLeagueAction) return
    const leagueName = selectedLeague.name
    const action = pendingLeagueAction
    const succeeded = await run(async () => {
      if (action === 'delete') await deleteLeague(client, selectedLeague.id)
      else await leaveLeague(client, selectedLeague.id)
      clearComparison()
      await refreshLeagues()
    })
    if (!succeeded) return
    setPendingLeagueAction(null)
    setNotice({
      tone: 'safe',
      message: action === 'delete' ? `${leagueName} was deleted.` : `You left ${leagueName}.`,
    })
  }

  const clearComparison = () => {
    comparisonRequests.current.cancel()
    setComparison(null)
    setComparisonMemberId('')
  }

  const compareMember = async (row, requestedCompetitionKey = competitionKey) => {
    if (!selectedLeague || !session?.user) return
    const requestToken = comparisonRequests.current.begin()
    const leagueId = selectedLeague.id
    const section = requestedCompetitionKey === LEAGUE_COMPETITION.ORIGINAL
      ? overview.data?.sections.original
      : overview.data?.sections.koPredictor
    const standings = buildStandingComparison(section?.data ?? [], row.userId)
    setComparisonMemberId(row.userId)
    setComparison({
      status: 'loading',
      otherName: row.displayName,
      otherUserId: row.userId,
      competitionKey: requestedCompetitionKey,
      leagueId,
      standings,
      standingsRows: (section?.data ?? []).map(candidate => ({ ...candidate, isCurrentUser: candidate.userId === session.user.id })),
      data: null,
      error: null,
    })
    try {
      const data = await loadLeagueHeadToHead(client, {
        leagueId,
        currentUserId: session.user.id,
        otherUserId: row.userId,
        competitionKey: requestedCompetitionKey,
        tournamentId,
        reference,
      })
      if (!comparisonRequests.current.isCurrent(requestToken)) return
      setComparison(previous => ({ ...previous, status: 'ready', data, error: null }))
    } catch (error) {
      if (!comparisonRequests.current.isCurrent(requestToken)) return
      setComparison(previous => ({ ...previous, status: 'error', data: null, error: messageForError(error) }))
    }
  }
  const overviewLoading = Boolean(selectedLeague?.id) && overview.leagueId !== selectedLeague.id
  const activeOverview = overviewLoading ? null : overview.data
  const koLeagueReady = Boolean(koReadiness?.open)
  const effectiveCompetitionKey = competitionKey === LEAGUE_COMPETITION.KO_PREDICTOR && !koLeagueReady
    ? LEAGUE_COMPETITION.ORIGINAL
    : competitionKey
  const activeSection = effectiveCompetitionKey === LEAGUE_COMPETITION.ORIGINAL ? activeOverview?.sections.original : activeOverview?.sections.koPredictor
  const standings = activeSection?.data ?? []
  const leagueLifecycle = activeOverview
    ? buildLeagueLifecycleState({ lifecycle, originalSummary: activeOverview.summaries.original, koSummary: activeOverview.summaries.koPredictor, koReadiness })
    : buildLeagueLifecycleState({ lifecycle, koReadiness })
  const activeSummary = effectiveCompetitionKey === LEAGUE_COMPETITION.ORIGINAL ? activeOverview?.summaries.original : activeOverview?.summaries.koPredictor
  const leagueListLoading = ['idle', 'loading'].includes(leagueListStatus)

  useEffect(() => {
    if (competitionKey === LEAGUE_COMPETITION.KO_PREDICTOR && !koLeagueReady) {
      setCompetitionKey(LEAGUE_COMPETITION.ORIGINAL)
      clearComparison()
    }
  }, [competitionKey, koLeagueReady])

  const chooseComparisonMember = memberUserId => {
    if (!memberUserId) {
      clearComparison()
      return
    }
    const member = activeOverview?.members.find(candidate => candidate.userId === memberUserId)
    if (member) compareMember(member)
  }

  const copyLeagueCode = async () => {
    if (!selectedLeague?.joinCode) return
    try {
      await navigator.clipboard.writeText(selectedLeague.joinCode)
      setNotice({ tone: 'safe', message: 'League code copied.' })
    } catch {
      setNotice({ tone: 'info', message: `League code: ${selectedLeague.joinCode}` })
    }
  }

  return (
    <section className="foundation-panel foundation-leagues" aria-labelledby="euro28-leagues-heading">
      <div className="foundation-section-heading">
        <div>
          <span className="foundation-kicker">Private leagues</span>
          <h2 id="euro28-leagues-heading">One member list, two separate competitions</h2>
          <p>Original Predictor and KO Predictor ranks and points are always shown separately. Original Predictor and KO Predictor ranks, comparisons and release rules stay separate at every lifecycle phase.</p>
        </div>
      </div>

      <LeagueLifecycleBanner lifecycleState={leagueLifecycle} />

      {notice && <p className={`auth-notice auth-notice--${notice.tone}`}>{notice.message}</p>}
      {loadingSession && <p className="foundation-empty-copy">Checking your league access…</p>}
      {!loadingSession && !session?.user && (
        <p className="foundation-empty-copy">Sign in to create or join private leagues. Guest predictions remain browser-only and cannot enter a leaderboard.</p>
      )}

      {!loadingSession && session?.user && (
        <>
          <details className="foundation-league-manage" open={leagues.length === 0}>
            <summary>Manage leagues</summary>
            <div className="foundation-league-actions">
              <form onSubmit={submitCreate}>
                <span className="foundation-kicker">Create</span>
                <h3>Start a private league</h3>
                <label className="auth-field">
                  <span>League name</span>
                  <input value={createName} onChange={event => setCreateName(event.target.value)} maxLength={40} required />
                </label>
                <button type="submit" disabled={actionStatus === 'loading'}>Create league</button>
              </form>

              <form onSubmit={submitJoin}>
                <span className="foundation-kicker">Join</span>
                <h3>Enter a league code</h3>
                <label className="auth-field">
                  <span>10-character code</span>
                  <input value={joinCode} onChange={event => setJoinCode(event.target.value.toUpperCase())} maxLength={12} required />
                </label>
                <button type="submit" disabled={actionStatus === 'loading'}>Join league</button>
              </form>
            </div>
          </details>

          {leagueListLoading && <p className="foundation-empty-copy">Loading your leagues…</p>}
          {!leagueListLoading && leagues.length === 0 ? (
            <p className="foundation-empty-copy">You have not created or joined a league yet.</p>
          ) : selectedLeague && (
            <>
              <div className="foundation-league-toolbar">
                <LeaguePicker leagues={leagues} selectedId={selectedLeague.id} onSelect={value => { overviewRequests.current.cancel(); setSelectedLeagueId(value); clearComparison(); setPendingLeagueAction(null) }} />
                <CompetitionTabs value={effectiveCompetitionKey} koReadiness={koReadiness} onChange={value => { setCompetitionKey(value); clearComparison() }} />
              </div>

              <article className="foundation-league-card">
                <div className="foundation-section-heading">
                  <div>
                    <span className="foundation-kicker">{selectedLeague.memberCount} member{selectedLeague.memberCount === 1 ? '' : 's'}</span>
                    <h3>{selectedLeague.name}</h3>
                    <div className="foundation-league-code"><span>League code</span><strong>{selectedLeague.joinCode}</strong><button type="button" className="foundation-secondary-button" onClick={copyLeagueCode}>Copy</button></div>
                  </div>
                  <div className="foundation-inline-actions">
                    {selectedLeague.memberRole === 'owner' ? (
                      <button type="button" className="foundation-danger-button" onClick={() => setPendingLeagueAction('delete')} disabled={actionStatus === 'loading'}>Delete league</button>
                    ) : (
                      <button type="button" className="foundation-secondary-button" onClick={() => setPendingLeagueAction('leave')} disabled={actionStatus === 'loading'}>Leave league</button>
                    )}
                  </div>
                </div>

                <LeagueActionConfirmation action={pendingLeagueAction} leagueName={selectedLeague.name} actionStatus={actionStatus} onConfirm={confirmLeagueAction} onCancel={() => setPendingLeagueAction(null)} />

                {(overview.status === 'loading' || overviewLoading) && !overview.data && <p className="foundation-empty-copy">Loading both competition tables…</p>}
                {activeOverview && (
                  <>
                    {overview.status === 'partial' && <p className="foundation-warning-text">One competition table could not be loaded. The available table remains usable.</p>}
                    <div className="foundation-league-summary-grid">
                      <LeagueSummaryCard title="Original Predictor" summary={activeOverview.summaries.original} section={activeOverview.sections.original} />
                      {koLeagueReady ? (
                        <LeagueSummaryCard title="KO Predictor" summary={activeOverview.summaries.koPredictor} section={activeOverview.sections.koPredictor} />
                      ) : (
                        <LeagueKoReadinessCard koReadiness={koReadiness} />
                      )}
                    </div>
                    <div className="foundation-shared-member-row">
                      <p className="foundation-member-count">Shared member list: <strong>{activeOverview.members.length}</strong></p>
                      <MemberPicker members={activeOverview.members} selectedId={comparisonMemberId} onSelect={chooseComparisonMember} />
                    </div>
                  </>
                )}

                <LeagueCompetitionHeading competitionKey={effectiveCompetitionKey} />
                <CompetitionLifecycleNote competitionKey={effectiveCompetitionKey} lifecycle={lifecycle} summary={activeSummary} koReadiness={koReadiness} />

                {activeSection?.status === 'error' && <p className="foundation-warning-text">{activeSection.error}</p>}
                {(overview.status === 'loading' || overviewLoading) && <p className="foundation-empty-copy">Refreshing standings…</p>}
                {overview.status !== 'loading' && !overviewLoading && activeSection?.status === 'ready' && standings.length === 0 && <p className="foundation-empty-copy">No league members were returned.</p>}
                {standings.length > 0 && <StandingsTable rows={standings} competitionKey={effectiveCompetitionKey} onCompare={compareMember} />}
              </article>

              <PlayerHeadToHead state={comparison} reference={reference} lifecycle={lifecycle} onClose={clearComparison} context={PLAYER_COMPARISON_CONTEXT.LEAGUE} />
            </>
          )}
        </>
      )}
    </section>
  )
}
