import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createLeague, deleteLeague, getMyLeagues, joinLeague, leaveLeague, loadLeagueOverview, readLeagueSession } from './leagueService.js'
import { buildLeagueActivityEntries, buildLeagueLifecycleState, LEAGUE_COMPETITION, normaliseInboundJoinCode, validateJoinCode, validateLeagueName } from './leagueModel.js'
import { buildLeagueCollections, reconcileLeagueSelections } from './leagueCollections.js'
import { buildLeagueShareActions } from './leagueShareActions.js'
import { createLatestRequestGuard } from '../lib/latestRequest.js'
import { loadCanonicalTournamentSnapshot } from '../results/resultService.js'
import {
  LeagueActivityPanel,
  LeagueHero,
  LeagueManagePanel,
  LeagueNotice,
  LeagueSignedOut,
  LeagueStandingsPanel,
  LeagueViewToggle,
} from './LeaguePresentation.jsx'
import { EmptyLeagueCollection, LeagueCollectionTabs } from './LeagueCollectionTabs.jsx'
import LeagueToolbar from './LeagueToolbar.jsx'
import { messageForLeagueError, PENDING_JOIN_KEY } from './leaguePageHelpers.js'
import PlayerQuickView from '../player/PlayerQuickView.jsx'
import { hashSearchParams } from '../app/appRoutes.js'
import { SkeletonPage } from '../design-system/index.jsx'
import layoutStyles from './LeagueLayout.module.css'

export default function Leagues({ client, tournamentId, reference, lifecycle, koReadiness }) {
  const [session, setSession] = useState(null)
  const [loadingSession, setLoadingSession] = useState(Boolean(client))
  const [leagues, setLeagues] = useState([])
  const [leagueListStatus, setLeagueListStatus] = useState('idle')
  const [activeCompetition, setActiveCompetition] = useState(LEAGUE_COMPETITION.ORIGINAL)
  const [selectedLeagueIds, setSelectedLeagueIds] = useState({ [LEAGUE_COMPETITION.ORIGINAL]: null, [LEAGUE_COMPETITION.KO_PREDICTOR]: null })
  const [overview, setOverview] = useState({ status: 'idle', data: null, leagueId: null, competitionKey: null })
  const [actionStatus, setActionStatus] = useState('idle')
  const [notice, setNotice] = useState(null)
  const [createName, setCreateName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [manageOpen, setManageOpen] = useState(false)
  const [pendingLeagueAction, setPendingLeagueAction] = useState(null)
  const [quickPlayer, setQuickPlayer] = useState(null)
  const [liveSnapshotState, setLiveSnapshotState] = useState(null)
  const [leagueView, setLeagueView] = useState('standings')
  const overviewRequests = useRef(createLatestRequestGuard())

  const koLeagueReady = Boolean(koReadiness?.open)
  const leagueCollections = useMemo(() => buildLeagueCollections(leagues), [leagues])
  const visibleLeagues = leagueCollections[activeCompetition]
  const selectedLeague = useMemo(
    () => visibleLeagues.find(league => league.id === selectedLeagueIds[activeCompetition]) ?? visibleLeagues[0] ?? null,
    [activeCompetition, selectedLeagueIds, visibleLeagues],
  )

  const refreshLeagues = useCallback(async preferredId => {
    if (!client || !session?.user || !tournamentId) return []
    setLeagueListStatus('loading')
    try {
      const nextLeagues = await getMyLeagues(client, tournamentId)
      setLeagues(nextLeagues)
      setSelectedLeagueIds(previous => reconcileLeagueSelections(nextLeagues, previous, preferredId).selectedIds)
      const preferredLeague = preferredId ? nextLeagues.find(league => league.id === preferredId) : null
      if (preferredLeague && (preferredLeague.competition === LEAGUE_COMPETITION.ORIGINAL || koLeagueReady)) {
        setActiveCompetition(preferredLeague.competition)
      }
      setLeagueListStatus('ready')
      return nextLeagues
    } catch (error) {
      setLeagueListStatus('error')
      throw error
    }
  }, [client, koLeagueReady, session, tournamentId])

  const refreshOverview = useCallback(async () => {
    if (!client || !selectedLeague?.id) {
      overviewRequests.current.cancel()
      setOverview({ status: 'idle', data: null, leagueId: null, competitionKey: null })
      return
    }
    const leagueId = selectedLeague.id
    const competitionKey = selectedLeague.competition
    const requestToken = overviewRequests.current.begin()
    setOverview(previous => ({ status: 'loading', data: previous.leagueId === leagueId && previous.competitionKey === competitionKey ? previous.data : null, leagueId, competitionKey }))
    try {
      const data = await loadLeagueOverview(client, { leagueId, competitionKey })
      if (!overviewRequests.current.isCurrent(requestToken)) return
      setOverview({ status: data.status, data, leagueId, competitionKey })
    } catch (error) {
      if (!overviewRequests.current.isCurrent(requestToken)) return
      setOverview({ status: 'error', data: null, leagueId, competitionKey })
      setNotice({ tone: 'danger', message: messageForLeagueError(error) })
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
        setNotice({ tone: 'danger', message: messageForLeagueError(error) })
      })

    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setLoadingSession(false)
      if (!nextSession) {
        setLeagues([])
        setSelectedLeagueIds({ [LEAGUE_COMPETITION.ORIGINAL]: null, [LEAGUE_COMPETITION.KO_PREDICTOR]: null })
        setActiveCompetition(LEAGUE_COMPETITION.ORIGINAL)
        setOverview({ status: 'idle', data: null, leagueId: null, competitionKey: null })
        overviewRequests.current.cancel()
        setPendingLeagueAction(null)
        setQuickPlayer(null)
      }
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [client])

  useEffect(() => {
    let active = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setNotice runs in a deferred promise rejection, not synchronously during the effect
    refreshLeagues().catch(error => { if (active) setNotice({ tone: 'danger', message: messageForLeagueError(error) }) })
    return () => { active = false }
  }, [refreshLeagues])

  useEffect(() => {
    if (koLeagueReady || activeCompetition === LEAGUE_COMPETITION.ORIGINAL) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a closed KO collection is never a reachable page state
    setActiveCompetition(LEAGUE_COMPETITION.ORIGINAL)
  }, [activeCompetition, koLeagueReady])

  useEffect(() => {
    const code = hashSearchParams(typeof window === 'undefined' ? '' : window.location.hash).get('join')
    if (!code) return
    try { window.sessionStorage.setItem(PENDING_JOIN_KEY, code.toUpperCase()) } catch { /* storage unavailable */ }
    try { window.history.replaceState(null, '', '#/leagues') } catch { /* history unavailable */ }
  }, [])

  useEffect(() => {
    if (!session?.user) return
    let pending = null
    try { pending = window.sessionStorage.getItem(PENDING_JOIN_KEY) } catch { /* storage unavailable */ }
    if (!pending) return
    try { window.sessionStorage.removeItem(PENDING_JOIN_KEY) } catch { /* storage unavailable */ }
    const code = normaliseInboundJoinCode(pending)
    if (!code) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- applying the captured invite once a session exists is the intended continuation
    setJoinCode(code)
    setManageOpen(true)
  }, [session])

  useEffect(() => {
    if (!client || !selectedLeague?.id) return undefined
    const requestGuard = overviewRequests.current
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refreshOverview only flips a loading flag before an async fetch resolves
    void refreshOverview()
    return () => { requestGuard.cancel() }
  }, [client, refreshOverview, selectedLeague])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing the stale live fixture when preconditions drop is an intentional reset
    if (!client || !session?.user || !reference?.tournamentId) { setLiveSnapshotState(null); return undefined }
    let active = true
    loadCanonicalTournamentSnapshot(client, reference)
      .then(liveSnapshot => { if (active) setLiveSnapshotState(liveSnapshot) })
      .catch(() => { if (active) setLiveSnapshotState(null) })
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
      setNotice({ tone: 'danger', message: messageForLeagueError(error) })
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
      const created = await createLeague(client, { tournamentId, name: checked.value, competition: activeCompetition, koReadiness })
      setCreateName('')
      await refreshLeagues(created.league_id)
      setManageOpen(false)
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
      setManageOpen(false)
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
      await refreshLeagues()
    })
    if (!succeeded) return
    setPendingLeagueAction(null)
    setNotice({ tone: 'safe', message: action === 'delete' ? `${leagueName} was deleted.` : `You left ${leagueName}.` })
  }

  const openMemberPlayerView = row => {
    if (!row?.userId || !selectedLeague) return
    setQuickPlayer(row)
  }

  const overviewLoading = Boolean(selectedLeague?.id) && (
    overview.leagueId !== selectedLeague.id || overview.competitionKey !== selectedLeague.competition
  )
  const activeOverview = overviewLoading ? null : overview.data
  const activeCompetitionKey = selectedLeague?.competition ?? LEAGUE_COMPETITION.ORIGINAL
  const standings = activeOverview?.standings ?? []
  const activeSummary = activeOverview?.summary ?? null
  const leagueLifecycle = activeOverview
    ? buildLeagueLifecycleState({ lifecycle, competitionKey: activeCompetitionKey, summary: activeSummary, koReadiness })
    : buildLeagueLifecycleState({ lifecycle, competitionKey: activeCompetitionKey, koReadiness })
  const leagueListLoading = ['idle', 'loading'].includes(leagueListStatus)

  const { copyLeagueCode, shareLeague } = buildLeagueShareActions({
    league: selectedLeague,
    onUnavailable: text => setNotice({ tone: 'info', message: text }),
  })

  return (
    <section className={layoutStyles.page} aria-label="Private leagues">
      <LeagueNotice notice={notice} />
      {loadingSession && <SkeletonPage cards={1} label="Checking your league access" />}
      {!loadingSession && !session?.user && <LeagueSignedOut />}

      {!loadingSession && session?.user && (
        <>
          <div className={layoutStyles.contextDock} aria-label="League context">
            {koLeagueReady && (
              <LeagueCollectionTabs
                activeCompetition={activeCompetition}
                collections={leagueCollections}
                onChange={competitionKey => {
                  overviewRequests.current.cancel()
                  setActiveCompetition(competitionKey)
                  setPendingLeagueAction(null)
                  setQuickPlayer(null)
                }}
              />
            )}
            {visibleLeagues.length > 0 && (
              <LeagueToolbar
                leagues={visibleLeagues}
                selectedLeagueId={selectedLeague?.id}
                manageOpen={manageOpen}
                onToggleManage={() => setManageOpen(previous => !previous)}
                onSelectLeague={value => {
                  overviewRequests.current.cancel()
                  setSelectedLeagueIds(previous => ({ ...previous, [activeCompetition]: value }))
                  setPendingLeagueAction(null)
                }}
              />
            )}
          </div>

          {manageOpen && visibleLeagues.length > 0 && (
            <LeagueManagePanel
              open
              createName={createName}
              onCreateNameChange={setCreateName}
              competitionKey={activeCompetition}
              onSubmitCreate={submitCreate}
              joinCode={joinCode}
              onJoinCodeChange={setJoinCode}
              onSubmitJoin={submitJoin}
              busy={actionStatus === 'loading'}
              selectedLeague={selectedLeague}
              pendingLeagueAction={pendingLeagueAction}
              actionStatus={actionStatus}
              onRequestAction={setPendingLeagueAction}
              onConfirmAction={confirmLeagueAction}
            />
          )}

          <div id="league-collection-panel" role={koLeagueReady ? 'tabpanel' : undefined} className={layoutStyles.collectionPanel}>
            {leagueListLoading && <SkeletonPage cards={1} label="Loading your leagues" />}
            {!leagueListLoading && visibleLeagues.length === 0 ? (
              <>
                <EmptyLeagueCollection competitionKey={activeCompetition} />
                <LeagueManagePanel
                  open
                  createName={createName}
                  onCreateNameChange={setCreateName}
                  competitionKey={activeCompetition}
                  onSubmitCreate={submitCreate}
                  joinCode={joinCode}
                  onJoinCodeChange={setJoinCode}
                  onSubmitJoin={submitJoin}
                  busy={actionStatus === 'loading'}
                />
              </>
            ) : selectedLeague && (
            <>
              <LeagueHero league={selectedLeague} summary={activeSummary} lifecycleState={leagueLifecycle} onShare={shareLeague} onCopyCode={copyLeagueCode} />

              {/* Prototype flow: identity card, Standings | Live activity, then the table. */}
              <LeagueViewToggle view={leagueView} onChange={setLeagueView} />
              {leagueView === 'activity' ? (
                <LeagueActivityPanel entries={buildLeagueActivityEntries({ reference, snapshot: liveSnapshotState })} tournamentStarted={leagueLifecycle.tournamentStarted} />
              ) : (
              <LeagueStandingsPanel
                competitionKey={activeCompetitionKey}
                overview={overview}
                overviewLoading={overviewLoading}
                activeOverview={activeOverview}
                standings={standings}
                onOpenPlayer={openMemberPlayerView}
              />
              )}
            </>
            )}
          </div>
        </>
      )}
      <PlayerQuickView player={quickPlayer} competitionKey={selectedLeague?.competition ?? activeCompetition} onClose={() => setQuickPlayer(null)} />
    </section>
  )
}
