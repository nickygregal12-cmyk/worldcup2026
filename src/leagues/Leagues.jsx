import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createLeague, deleteLeague, getMyLeagues, joinLeague, leaveLeague, loadLeagueOverview, readLeagueSession } from './leagueService.js'
import { buildInviteLink, buildLeagueLifecycleState, canCreateKoLeague, LEAGUE_COMPETITION, normaliseInboundJoinCode, validateJoinCode, validateLeagueName } from './leagueModel.js'
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
import { openPlayerView } from '../player/index.js'
import { hashSearchParams } from '../app/appRoutes.js'
import layoutStyles from './LeagueLayout.module.css'

// A pending inbound invite code, stashed so it survives the sign-in/sign-up round-trip a signed-out
// recipient makes before they can join.
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
  const [selectedLeagueId, setSelectedLeagueId] = useState(null)
  const [overview, setOverview] = useState({ status: 'idle', data: null, leagueId: null })
  const [actionStatus, setActionStatus] = useState('idle')
  const [notice, setNotice] = useState(null)
  const [createName, setCreateName] = useState('')
  const [createCompetition, setCreateCompetition] = useState(LEAGUE_COMPETITION.ORIGINAL)
  const [joinCode, setJoinCode] = useState('')
  const [manageOpen, setManageOpen] = useState(false)
  const [pendingLeagueAction, setPendingLeagueAction] = useState(null)
  const [liveFixture, setLiveFixture] = useState(null)
  const overviewRequests = useRef(createLatestRequestGuard())

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
        overviewRequests.current.cancel()
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setNotice runs in a deferred promise rejection, not synchronously during the effect
    refreshLeagues().catch(error => { if (active) setNotice({ tone: 'danger', message: messageForError(error) }) })
    return () => { active = false }
  }, [refreshLeagues])

  // Inbound invite link (#/leagues?join=CODE): capture the code and clear it from the URL so a refresh
  // won't re-fire. It is applied by the effect below — immediately if signed in, or after the
  // signed-out recipient signs in/up and continues.
  useEffect(() => {
    const code = hashSearchParams(typeof window === 'undefined' ? '' : window.location.hash).get('join')
    if (!code) return
    try { window.sessionStorage.setItem(PENDING_JOIN_KEY, code.toUpperCase()) } catch { /* storage unavailable */ }
    try { window.history.replaceState(null, '', '#/leagues') } catch { /* history unavailable */ }
  }, [])

  // Consume the pending join once a session exists: prefill the join field and open the create/join
  // panel so the recipient lands on "join this league", not the homepage or a bare code to retype.
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

  // Reuses the canonical live snapshot/fixture-picking used by Home & Match Centre; no minute-level clock exists in this data.
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
      const created = await createLeague(client, { tournamentId, name: checked.value, competition: createCompetition, koReadiness })
      setCreateName('')
      setCreateCompetition(LEAGUE_COMPETITION.ORIGINAL)
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
      await refreshLeagues()
    })
    if (!succeeded) return
    setPendingLeagueAction(null)
    setNotice({ tone: 'safe', message: action === 'delete' ? `${leagueName} was deleted.` : `You left ${leagueName}.` })
  }

  // Opening a member row navigates straight to their dedicated Player View, carrying the
  // league's fixed competition so Original and KO Predictor context is preserved.
  const openMemberPlayerView = row => {
    if (!row?.userId || !selectedLeague) return
    openPlayerView({ userId: row.userId, competitionKey: selectedLeague.competition })
  }

  const overviewLoading = Boolean(selectedLeague?.id) && overview.leagueId !== selectedLeague.id
  const activeOverview = overviewLoading ? null : overview.data
  const koLeagueReady = Boolean(koReadiness?.open)
  const activeCompetitionKey = selectedLeague?.competition ?? LEAGUE_COMPETITION.ORIGINAL
  const activeSection = activeCompetitionKey === LEAGUE_COMPETITION.ORIGINAL ? activeOverview?.sections.original : activeOverview?.sections.koPredictor
  const standings = activeSection?.data ?? []
  const activeSummary = activeCompetitionKey === LEAGUE_COMPETITION.ORIGINAL ? activeOverview?.summaries.original : activeOverview?.summaries.koPredictor
  const leagueLifecycle = activeOverview
    ? buildLeagueLifecycleState({ lifecycle, originalSummary: activeOverview.summaries.original, koSummary: activeOverview.summaries.koPredictor, koReadiness })
    : buildLeagueLifecycleState({ lifecycle, koReadiness })
  const leagueListLoading = ['idle', 'loading'].includes(leagueListStatus)

  useEffect(() => {
    if (createCompetition === LEAGUE_COMPETITION.KO_PREDICTOR && !canCreateKoLeague(koReadiness)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- corrects the create form when KO readiness regresses; intentional guarded reset
      setCreateCompetition(LEAGUE_COMPETITION.ORIGINAL)
    }
  }, [createCompetition, koReadiness])

  // Copy handlers return a short confirmation label on success (rendered on the button) or null on
  // failure; success no longer routes through the up-the-page notice. Failures still notice.
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
    const shareText = `Join my Euro 2028 Predictor league "${selectedLeague.name}". Tap to join: ${url}`
    if (navigator.share) {
      try {
        await navigator.share({ title: selectedLeague.name, text: shareText, url })
        return null // the native sheet is its own confirmation
      } catch (error) {
        if (error?.name === 'AbortError') return null
      }
    }
    // No native share sheet: fall back to copying the LINK (not a bare code) with on-button feedback.
    return (await copyToClipboard(url)) ? 'Link copied' : null
  }

  const matchStripHref = liveFixture
    ? `#/match-centre?match=${liveFixture.matchNumber}&competition=${liveFixture.matchNumber <= 36 ? LEAGUE_COMPETITION.ORIGINAL : LEAGUE_COMPETITION.KO_PREDICTOR}${selectedLeague?.id ? `&league=${selectedLeague.id}` : ''}`
    : null

  return (
    <section className={layoutStyles.page} aria-label="Private leagues">
      {/* The page title is owned by App.jsx's standard PageIntro ("Your leagues …"); the re-cut
          drops the duplicate in-surface heading and keeps only this one-line explainer. */}
      <p className={layoutStyles.lead}>Track Original Predictor and KO Predictor separately. Each table has its own points race.</p>
      <LeagueNotice notice={notice} />
      {loadingSession && <p className={layoutStyles.emptyCopy}>Checking your league access…</p>}
      {!loadingSession && !session?.user && (
        <p className={layoutStyles.emptyCopy}>Sign in to create or join private leagues. Guest predictions remain browser-only and cannot enter a leaderboard.</p>
      )}

      {!loadingSession && session?.user && (
        <>
          <LeagueManagePanel
            open={leagues.length === 0 || manageOpen}
            createName={createName}
            onCreateNameChange={setCreateName}
            createCompetition={createCompetition}
            onCreateCompetitionChange={setCreateCompetition}
            onSubmitCreate={submitCreate}
            joinCode={joinCode}
            onJoinCodeChange={setJoinCode}
            onSubmitJoin={submitJoin}
            busy={actionStatus === 'loading'}
            koReadiness={koReadiness}
          />

          {leagueListLoading && <p className={layoutStyles.emptyCopy}>Loading your leagues…</p>}
          {!leagueListLoading && leagues.length === 0 ? (
            <p className={layoutStyles.emptyCopy}>You have not created or joined a league yet.</p>
          ) : selectedLeague && (
            <>
              <LeagueHero
                league={selectedLeague}
                leagues={leagues}
                onSelectLeague={value => { overviewRequests.current.cancel(); setSelectedLeagueId(value); setPendingLeagueAction(null) }}
              />

              <MiniMatchStrip fixture={liveFixture} href={matchStripHref} />

              <div className={layoutStyles.layout}>
                <div>
                  <LeagueStandingsPanel
                    competitionKey={activeCompetitionKey}
                    overview={overview}
                    overviewLoading={overviewLoading}
                    activeOverview={activeOverview}
                    activeSection={activeSection}
                    standings={standings}
                    onOpenPlayer={openMemberPlayerView}
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
