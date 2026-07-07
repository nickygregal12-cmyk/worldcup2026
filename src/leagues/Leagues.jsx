import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createLeague, deleteLeague, getMyLeagues, joinLeague, leaveLeague, loadLeagueHeadToHead, loadLeagueOverview, readLeagueSession } from './leagueService.js'
import { buildLeagueLifecycleState, buildStandingComparison, LEAGUE_COMPETITION, validateJoinCode, validateLeagueName } from './leagueModel.js'
import { createLatestRequestGuard } from '../lib/latestRequest.js'
import { loadCanonicalTournamentSnapshot } from '../results/resultService.js'
import { buildMatchCentreNavigation, defaultMatchNumber } from '../matchCentre/matchCentreModel.js'
import {
  LeagueActionsCard,
  LeagueDetailDestination,
  LeagueHero,
  LeagueManagePanel,
  LeagueNotice,
  LeagueStandingsPanel,
  MiniMatchStrip,
} from './LeaguePresentation.jsx'
import { PlayerHeadToHead, PLAYER_COMPARISON_CONTEXT, openPlayerView } from '../player/index.js'
import layoutStyles from './LeagueLayout.module.css'

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
  const [liveFixture, setLiveFixture] = useState(null)
  const overviewRequests = useRef(createLatestRequestGuard())
  const comparisonRequests = useRef(createLatestRequestGuard())
  const detailRef = useRef(null)

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
      setOverview(previous => ({ status: previous.data ? 'partial' : 'error', data: previous.data, leagueId }))
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
    let active = true
    refreshLeagues().catch(error => { if (active) setNotice({ tone: 'danger', message: messageForError(error) }) })
    return () => { active = false }
  }, [refreshLeagues])

  useEffect(() => {
    if (!client || !selectedLeague?.id) return undefined
    const requestGuard = overviewRequests.current
    void refreshOverview()
    return () => { requestGuard.cancel() }
  }, [client, refreshOverview, selectedLeague])

  // Reuses the canonical live snapshot/fixture-picking used by Home & Match Centre; no minute-level clock exists in this data.
  useEffect(() => {
    if (!client || !session?.user || !reference?.tournamentId) { setLiveFixture(null); return undefined }
    let active = true
    loadCanonicalTournamentSnapshot(client, reference)
      .then(liveSnapshot => {
        if (!active) return
        const matchNumber = defaultMatchNumber(reference, liveSnapshot)
        setLiveFixture(buildMatchCentreNavigation({ reference, liveSnapshot, matchNumber }).current)
      })
      .catch(() => { if (active) setLiveFixture(null) })
    return () => { active = false }
  }, [client, session, reference])

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
    setNotice({ tone: 'safe', message: action === 'delete' ? `${leagueName} was deleted.` : `You left ${leagueName}.` })
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
    const section = requestedCompetitionKey === LEAGUE_COMPETITION.ORIGINAL ? overview.data?.sections.original : overview.data?.sections.koPredictor
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

  useEffect(() => {
    if (!comparison?.otherUserId) return
    detailRef.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' })
  }, [comparison?.otherUserId])

  const copyText = async (text, successMessage) => {
    try {
      await navigator.clipboard.writeText(text)
      setNotice({ tone: 'safe', message: successMessage })
    } catch {
      setNotice({ tone: 'info', message: text })
    }
  }

  const copyLeagueCode = () => selectedLeague?.joinCode && copyText(selectedLeague.joinCode, 'League code copied.')

  const shareLeague = async () => {
    if (!selectedLeague?.joinCode) return
    const shareText = `Join my Euro 2028 Predictor league "${selectedLeague.name}" with code ${selectedLeague.joinCode}.`
    if (navigator.share) {
      try {
        await navigator.share({ title: selectedLeague.name, text: shareText })
        return
      } catch (error) {
        if (error?.name === 'AbortError') return
      }
    }
    await copyText(shareText, 'Share text copied.')
  }

  const matchStripHref = liveFixture
    ? `#/match-centre?match=${liveFixture.matchNumber}&competition=${liveFixture.matchNumber <= 36 ? LEAGUE_COMPETITION.ORIGINAL : LEAGUE_COMPETITION.KO_PREDICTOR}${selectedLeague?.id ? `&league=${selectedLeague.id}` : ''}`
    : null

  return (
    <section className={layoutStyles.page} aria-labelledby="euro28-leagues-heading">
      <div className={layoutStyles.sectionHeading}>
        <span className={layoutStyles.kicker}>Private leagues</span>
        <h2 id="euro28-leagues-heading">Private leagues</h2>
        <p>Track Original Predictor and KO Predictor separately. Each table has its own points race.</p>
      </div>

      <LeagueNotice notice={notice} />
      {loadingSession && <p className={layoutStyles.emptyCopy}>Checking your league access…</p>}
      {!loadingSession && !session?.user && (
        <p className={layoutStyles.emptyCopy}>Sign in to create or join private leagues. Guest predictions remain browser-only and cannot enter a leaderboard.</p>
      )}

      {!loadingSession && session?.user && (
        <>
          <LeagueManagePanel
            open={leagues.length === 0}
            createName={createName}
            onCreateNameChange={setCreateName}
            onSubmitCreate={submitCreate}
            joinCode={joinCode}
            onJoinCodeChange={setJoinCode}
            onSubmitJoin={submitJoin}
            busy={actionStatus === 'loading'}
          />

          {leagueListLoading && <p className={layoutStyles.emptyCopy}>Loading your leagues…</p>}
          {!leagueListLoading && leagues.length === 0 ? (
            <p className={layoutStyles.emptyCopy}>You have not created or joined a league yet.</p>
          ) : selectedLeague && (
            <>
              <LeagueHero
                league={selectedLeague}
                leagues={leagues}
                onSelectLeague={value => { overviewRequests.current.cancel(); setSelectedLeagueId(value); clearComparison(); setPendingLeagueAction(null) }}
                competitionKey={effectiveCompetitionKey}
                onCompetitionChange={value => { setCompetitionKey(value); clearComparison() }}
                koReadiness={koReadiness}
                currentRank={activeSummary?.currentRank ?? null}
              />

              <MiniMatchStrip fixture={liveFixture} href={matchStripHref} />

              <div className={layoutStyles.layout}>
                <div>
                  <LeagueStandingsPanel
                    competitionKey={effectiveCompetitionKey}
                    overview={overview}
                    overviewLoading={overviewLoading}
                    activeOverview={activeOverview}
                    activeSection={activeSection}
                    standings={standings}
                    comparisonMemberId={comparisonMemberId}
                    onOpenDetail={row => compareMember(row, effectiveCompetitionKey)}
                    leagueLifecycle={leagueLifecycle}
                    lifecycle={lifecycle}
                    activeSummary={activeSummary}
                    koReadiness={koReadiness}
                    koLeagueReady={koLeagueReady}
                    selectedLeague={selectedLeague}
                    pendingLeagueAction={pendingLeagueAction}
                    actionStatus={actionStatus}
                    onRequestAction={setPendingLeagueAction}
                    onConfirmAction={confirmLeagueAction}
                  />

                  <div ref={detailRef}>
                    <LeagueDetailDestination
                      comparison={comparison}
                      onOpenProfile={comparison?.otherUserId ? () => openPlayerView({ userId: comparison.otherUserId, competitionKey: comparison.competitionKey }) : null}
                    >
                      <PlayerHeadToHead state={comparison} reference={reference} lifecycle={lifecycle} onClose={clearComparison} context={PLAYER_COMPARISON_CONTEXT.LEAGUE} />
                    </LeagueDetailDestination>
                  </div>
                </div>

                <LeagueActionsCard
                  joinCode={selectedLeague.joinCode}
                  onCopyInvite={copyLeagueCode}
                  onShareLeague={shareLeague}
                  hasSettings={false}
                  onOpenSettings={null}
                />
              </div>
            </>
          )}
        </>
      )}
    </section>
  )
}
