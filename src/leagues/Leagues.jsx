import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createLeague, deleteLeague, getMyLeagues, joinLeague, leaveLeague, loadLeagueOverview, readLeagueSession } from './leagueService.js'
import { buildInviteLink, buildLeagueLifecycleState, LEAGUE_COMPETITION, normaliseInboundJoinCode, validateJoinCode, validateLeagueName } from './leagueModel.js'
import { buildLeagueCollections, reconcileLeagueSelections } from './leagueCollections.js'
import { createLatestRequestGuard } from '../lib/latestRequest.js'
import { loadCanonicalTournamentSnapshot } from '../results/resultService.js'
import { buildMatchCentreNavigation, defaultMatchNumber } from '../matchCentre/matchCentreModel.js'
import {
  LeagueActionsCard,
  LeagueHero,
  LeagueManagePanel,
  LeagueNotice,
  LeagueStandingsPanel,
  MiniMatchStrip,
} from './LeaguePresentation.jsx'
import { EmptyLeagueCollection, LeagueCollectionTabs } from './LeagueCollectionTabs.jsx'
import PlayerQuickView from '../player/PlayerQuickView.jsx'
import { hashSearchParams } from '../app/appRoutes.js'
import layoutStyles from './LeagueLayout.module.css'

const PENDING_JOIN_KEY = 'euro28:pendingJoin'

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
  const [liveFixture, setLiveFixture] = useState(null)
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
    refreshLeagues().catch(error => { if (active) setNotice({ tone: 'danger', message: messageForError(error) }) })
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

  const copyToClipboard = async text => {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      setNotice({ tone: 'info', message: text })
      return false
    }
  }

  const copyLeagueCode = async () => {
    if (!selectedLeague?.joinCode) return null
    return (await copyToClipboard(selectedLeague.joinCode)) ? 'Copied' : null
  }

  const shareLeague = async () => {
    if (!selectedLeague?.joinCode) return null
    const url = buildInviteLink(window.location.origin, selectedLeague.joinCode)
    const shareText = `Join my Euro 2028 Predictor league "${selectedLeague.name}" — open this link and your invite code is filled in ready to join: ${url}`
    if (navigator.share) {
      try {
        await navigator.share({ title: selectedLeague.name, text: shareText, url })
        return null // the native sheet is its own confirmation
      } catch (error) {
        if (error?.name === 'AbortError') return null
      }
    }
    return (await copyToClipboard(url)) ? 'Link copied' : null
  }

  const liveFixtureCompetition = liveFixture?.matchNumber <= 36
    ? LEAGUE_COMPETITION.ORIGINAL
    : LEAGUE_COMPETITION.KO_PREDICTOR
  const matchStripLeague = selectedLeague?.competition === liveFixtureCompetition ? selectedLeague.id : null
  const matchStripHref = liveFixture
    ? `#/match-centre?match=${liveFixture.matchNumber}&competition=${liveFixtureCompetition}${matchStripLeague ? `&league=${matchStripLeague}` : ''}`
    : null

  return (
    <section className={layoutStyles.page} aria-label="Private leagues">
      <LeagueNotice notice={notice} />
      {loadingSession && <p className={layoutStyles.emptyCopy}>Checking your league access…</p>}
      {!loadingSession && !session?.user && (
        <p className={layoutStyles.emptyCopy}>Sign in to create or join private leagues. Guest predictions remain browser-only and cannot enter a leaderboard.</p>
      )}

      {!loadingSession && session?.user && (
        <>
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

          <LeagueManagePanel
            open={visibleLeagues.length === 0 || manageOpen}
            createName={createName}
            onCreateNameChange={setCreateName}
            competitionKey={activeCompetition}
            onSubmitCreate={submitCreate}
            joinCode={joinCode}
            onJoinCodeChange={setJoinCode}
            onSubmitJoin={submitJoin}
            busy={actionStatus === 'loading'}
          />

          <div id="league-collection-panel" role={koLeagueReady ? 'tabpanel' : undefined} className={layoutStyles.collectionPanel}>
            {leagueListLoading && <p className={layoutStyles.emptyCopy}>Loading your leagues…</p>}
            {!leagueListLoading && visibleLeagues.length === 0 ? (
              <EmptyLeagueCollection competitionKey={activeCompetition} />
            ) : selectedLeague && (
            <>
              <LeagueHero
                league={selectedLeague}
                leagues={visibleLeagues}
                onSelectLeague={value => {
                  overviewRequests.current.cancel()
                  setSelectedLeagueIds(previous => ({ ...previous, [activeCompetition]: value }))
                  setPendingLeagueAction(null)
                }}
              />

              <MiniMatchStrip fixture={liveFixture} href={matchStripHref} />

              <div className={layoutStyles.layout}>
                <div>
                  <LeagueStandingsPanel
                    competitionKey={activeCompetitionKey}
                    overview={overview}
                    overviewLoading={overviewLoading}
                    activeOverview={activeOverview}
                    standings={standings}
                    onOpenPlayer={openMemberPlayerView}
                    leagueLifecycle={leagueLifecycle}
                    lifecycle={lifecycle}
                    activeSummary={activeSummary}
                    koReadiness={koReadiness}
                    selectedLeague={selectedLeague}
                    pendingLeagueAction={pendingLeagueAction}
                    actionStatus={actionStatus}
                    onRequestAction={setPendingLeagueAction}
                    onConfirmAction={confirmLeagueAction}
                  />
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
          </div>
        </>
      )}
      <PlayerQuickView player={quickPlayer} competitionKey={selectedLeague?.competition ?? activeCompetition} onClose={() => setQuickPlayer(null)} />
    </section>
  )
}
