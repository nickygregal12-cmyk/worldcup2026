import { useCallback, useEffect, useMemo, useState } from 'react'
import AccountAccess from './auth/AccountAccess.jsx'
import { useEuroSession } from './auth/useEuroSession.js'
import PredictionJourney from './journey/PredictionJourney.jsx'
import KoPredictor from './koPredictor/KoPredictor.jsx'
import ResultsAndLeaderboards from './results/ResultsAndLeaderboards.jsx'
import MatchCentre from './matchCentre/MatchCentre.jsx'
import PlayerView from './player/PlayerView.jsx'
import AdminOperations from './admin/AdminOperations.jsx'
import AdminRouteGate from './admin/AdminRouteGate.jsx'
import { ADMIN_VISIBILITY_STATUS } from './admin/adminVisibilityModel.js'
import { useAdminVisibility } from './admin/useAdminVisibility.js'
import Leagues from './leagues/Leagues.jsx'
import HomeDashboard from './home/HomeDashboard.jsx'
import Welcome from './welcome/Welcome.jsx'
import TournamentOverview, { HowToPlayOverview } from './tournament/TournamentOverview.jsx'
import EuroAppShell from './app/EuroAppShell.jsx'
import { APP_ROUTE, isKnownAppHash, leaderboardCompetitionFromHash, matchCentreParamsFromHash, playerViewParamsFromHash } from './app/appRoutes.js'
import { deriveNavigationLifecycle } from './app/navigationLifecycle.js'
import { buildKoReadiness } from './app/koReadiness.js'
import { useHashLocation } from './app/useHashRoute.js'
import { UNKNOWN_ROUTE_COPY } from './app/unknownRouteCopy.js'
import { useTheme } from './app/useTheme.js'
import { Badge, Button, Card, LinkButton } from './design-system/index.jsx'
import TeamProfileProvider from './teamProfile/TeamProfileProvider.jsx'
import { StagingTimeBanner, useTournamentTimeControl } from './timePhase/index.js'
import { loadEuroApp } from './runtime/loadEuroApp.js'
import { createAppClient } from './runtime/appClient.js'
import { resolveTournamentLifecycle } from './config/index.js'

function PageIntro({ eyebrow, title, description, badge = null }) {
  return (
    <section className="page-intro">
      <div>
        <span className="page-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {badge && <Badge tone={badge.tone}>{badge.label}</Badge>}
    </section>
  )
}

function LoadingApplication() {
  return (
    <div className="bootstrap-screen" role="status" aria-live="polite">
      <span className="app-brand__mark" aria-hidden="true">28</span>
      <strong>Loading Euro 2028 Predictor…</strong>
    </div>
  )
}

function AppLoadError({ message, onRetry }) {
  return (
    <div className="bootstrap-screen bootstrap-screen--error">
      <Card>
        <Badge tone="danger">Connection problem</Badge>
        <h1>Euro 2028 Predictor could not load</h1>
        <p>{message}</p>
        <Button icon="refresh" onClick={onRetry}>Try again</Button>
      </Card>
    </div>
  )
}

function UnknownDestination({ requestedHash }) {
  const requested = requestedHash || '#/'
  return (
    <div className="content-stack legacy-page">
      <PageIntro
        eyebrow={UNKNOWN_ROUTE_COPY.eyebrow}
        title={UNKNOWN_ROUTE_COPY.title}
        description={`${UNKNOWN_ROUTE_COPY.description} ${UNKNOWN_ROUTE_COPY.predictionsSafe}`}
        badge={{ tone: 'warning', label: UNKNOWN_ROUTE_COPY.badge }}
      />
      <Card className="empty-state">
        <Badge tone="warning">{UNKNOWN_ROUTE_COPY.label}</Badge>
        <h2>{UNKNOWN_ROUTE_COPY.heading}</h2>
        <p>{UNKNOWN_ROUTE_COPY.requestedPrefix} <code>{requested}</code></p>
        <p>{UNKNOWN_ROUTE_COPY.guidance}</p>
        <div className="button-row">
          <LinkButton href="#/" icon="home">{UNKNOWN_ROUTE_COPY.homeAction}</LinkButton>
          <LinkButton href="#/groups" variant="secondary" icon="predict">{UNKNOWN_ROUTE_COPY.groupsAction}</LinkButton>
          <LinkButton href="#/how-to-play" variant="ghost" icon="info">{UNKNOWN_ROUTE_COPY.rulesAction}</LinkButton>
        </div>
      </Card>
    </div>
  )
}

export default function App() {
  const hashLocation = useHashLocation()
  const route = hashLocation.route
  const theme = useTheme()
  const clientState = useMemo(() => createAppClient(), [])
  const activeClient = clientState.client
  const sessionState = useEuroSession(activeClient)
  const [state, setState] = useState(() => clientState.client
    ? { status: 'loading', data: null, error: null }
    : { status: 'error', data: null, error: clientState.error })

  const refresh = useCallback(async () => {
    if (!clientState.client) return
    setState(previous => ({ ...previous, status: 'loading', error: null }))
    try {
      const data = await loadEuroApp(clientState.client)
      setState({ status: 'ready', data, error: null })
    } catch (error) {
      setState({ status: 'error', data: null, error: error instanceof Error ? error.message : String(error) })
    }
  }, [clientState])

  useEffect(() => {
    if (!clientState.client) return undefined
    let active = true
    loadEuroApp(clientState.client)
      .then(data => { if (active) setState({ status: 'ready', data, error: null }) })
      .catch(error => { if (active) setState({ status: 'error', data: null, error: error instanceof Error ? error.message : String(error) }) })
    return () => { active = false }
  }, [clientState])

  const activeSession = sessionState
  const timeState = useTournamentTimeControl({
    client: activeClient,
    tournamentId: state.data?.tournament?.id ?? null,
    disabled: false,
  })
  const adminVisibility = useAdminVisibility({
    client: activeClient,
    tournamentId: state.data?.tournament?.id ?? null,
    sessionState: activeSession,
    fixtureAccess: null,
  })

  if (state.status === 'loading') return <LoadingApplication />
  if (state.status === 'error' || !state.data) return <AppLoadError message={state.error} onRetry={refresh} />

  const appData = state.data
  const unknownDestinationRequested = hashLocation.hash.startsWith('#/') && !isKnownAppHash(hashLocation.hash)
  const koReadiness = buildKoReadiness(appData.guestReference)
  const navigation = deriveNavigationLifecycle(appData.guestReference, { koReadiness })
  const lifecycle = resolveTournamentLifecycle(appData.tournament)

  let content
  if (unknownDestinationRequested) {
    content = <UnknownDestination requestedHash={hashLocation.hash} />
  } else if (route === APP_ROUTE.HOME) {
    content = <HomeDashboard client={activeClient} foundation={appData} sessionState={activeSession} />
  } else if (route === APP_ROUTE.WELCOME) {
    content = <Welcome theme={theme} />
  } else if (route === APP_ROUTE.PREDICT) {
    content = (
      <div className="content-stack groups-page groups-page--focused">
        <PredictionJourney key={`groups-${appData.guestReference.referenceVersion}`} client={activeClient} reference={appData.guestReference} tournament={appData.tournament} scoring={appData.scoring} initialView="groups" surface="groups" />
      </div>
    )
  } else if (route === APP_ROUTE.BRACKET) {
    content = (
      <div className="content-stack knockout-page">
        <PageIntro eyebrow="Original Predictor" title="Your pre-tournament bracket" description="Choose the team that advances from every predicted knockout match. Scores and jokers do not apply here." />
        <PredictionJourney key={`bracket-${appData.guestReference.referenceVersion}`} client={activeClient} reference={appData.guestReference} tournament={appData.tournament} scoring={appData.scoring} initialView="bracket" surface="bracket" />
      </div>
    )
  } else if (route === APP_ROUTE.REVIEW) {
    content = (
      <div className="content-stack">
        <PredictionJourney key={`review-${appData.guestReference.referenceVersion}`} client={activeClient} reference={appData.guestReference} tournament={appData.tournament} scoring={appData.scoring} initialView="review" surface="review" />
      </div>
    )
  } else if (route === APP_ROUTE.KO_PREDICTOR) {
    content = (
      <div className="content-stack knockout-page">
        <PageIntro eyebrow="Separate competition" title="KO Predictor" description="Predict each real knockout fixture once its participants are confirmed." />
        <KoPredictor client={activeClient} reference={appData.guestReference} tournament={appData.tournament} scoring={appData.scoring} />
      </div>
    )
  } else if (route === APP_ROUTE.LEAGUES) {
    content = (
      <div className="content-stack legacy-page">
        <PageIntro eyebrow="Private competitions" title="Your leagues" description="One member list, two separate competitions." />
        <Leagues client={activeClient} tournamentId={appData.tournament.id} reference={appData.guestReference} lifecycle={lifecycle} koReadiness={koReadiness} />
      </div>
    )
  } else if (route === APP_ROUTE.PLAYER) {
    const playerView = playerViewParamsFromHash(hashLocation.hash)
    content = (
      <div className="content-stack legacy-page">
        <PageIntro eyebrow="Player View" title="Player predictions" description="Open released picks, bracket context and predicted table evidence without combining competitions." />
        <PlayerView
          client={activeClient}
          reference={appData.guestReference}
          lifecycle={lifecycle}
          memberUserId={playerView.userId}
          initialCompetition={playerView.competition}
        />
      </div>
    )
  } else if (route === APP_ROUTE.MATCH_CENTRE) {
    const matchCentre = matchCentreParamsFromHash(hashLocation.hash)
    content = (
      <div className="content-stack legacy-page">
        <PageIntro eyebrow="Fixture intelligence" title="Euro Match Centre" description="Follow the fixture, community selections and points available without combining the Original and KO Predictor competitions." />
        <MatchCentre
          client={activeClient}
          reference={appData.guestReference}
          scoring={appData.scoring}
          requestedMatchNumber={matchCentre.matchNumber}
          initialCompetition={matchCentre.competition}
          initialLeagueId={matchCentre.leagueId}
          lifecycle={lifecycle}
        />
      </div>
    )
  } else if (route === APP_ROUTE.RESULTS) {
    content = (
      <div className="content-stack legacy-page">
        <PageIntro eyebrow="Live tournament" title="Results" description="Official scores, live group tables and the live knockout bracket." />
        <ResultsAndLeaderboards view="results" client={activeClient} reference={appData.guestReference} lifecycle={lifecycle} />
      </div>
    )
  } else if (route === APP_ROUTE.LEADERBOARDS) {
    content = (
      <div className="content-stack legacy-page">
        <PageIntro eyebrow="Separate competition standings" title="Leaderboards" description="View the full Original Predictor or KO Predictor table and your matching points breakdown." />
        <ResultsAndLeaderboards
          view="leaderboards"
          initialCompetition={leaderboardCompetitionFromHash(hashLocation.hash)}
          client={activeClient}
          reference={appData.guestReference}
          lifecycle={lifecycle}
        />
      </div>
    )
  } else if (route === APP_ROUTE.ACCOUNT) {
    content = (
      <div className="content-stack legacy-page">
        <PageIntro eyebrow="Account" title={activeSession.session ? 'Profile and security' : 'Sign in or create an account'} description="Sign in without losing predictions already saved on this device." />
        <AccountAccess client={activeClient} reference={appData.guestReference} tournament={appData.tournament} lifecycle={lifecycle} />
      </div>
    )
  } else if (route === APP_ROUTE.TOURNAMENT) {
    content = <TournamentOverview foundation={appData} />
  } else if (route === APP_ROUTE.HOW_TO_PLAY) {
    content = <HowToPlayOverview foundation={appData} />
  } else if (route === APP_ROUTE.ADMIN) {
    content = (
      <AdminRouteGate visibility={adminVisibility}>
        <div className="content-stack legacy-page">
          <PageIntro eyebrow="Restricted access" title="Tournament control room" description="Secure result operations, locks, grace windows and operational safeguards." />
          <AdminOperations client={activeClient} reference={appData.guestReference} hash={hashLocation.hash} />
        </div>
      </AdminRouteGate>
    )
  } else {
    content = <HomeDashboard client={activeClient} foundation={appData} sessionState={activeSession} />
  }

  const teamProfileReference = appData.guestReference

  // Welcome is a focused, single-path screen with no persistent navigation, per its
  // approved contract — it renders its own minimal header instead of the full app shell.
  if (route === APP_ROUTE.WELCOME) {
    return (
      <TeamProfileProvider client={activeClient} reference={teamProfileReference} lifecycle={lifecycle}>
        <StagingTimeBanner state={timeState} />
        {content}
      </TeamProfileProvider>
    )
  }

  return (
    <TeamProfileProvider client={activeClient} reference={teamProfileReference} lifecycle={lifecycle}>
      <StagingTimeBanner state={timeState} />
      <EuroAppShell
        route={route === APP_ROUTE.ADMIN && adminVisibility.status !== ADMIN_VISIBILITY_STATUS.ALLOWED ? APP_ROUTE.HOME : route}
        theme={theme}
        sessionState={activeSession}
        navigation={navigation}
        adminVisibility={adminVisibility}
      >{content}</EuroAppShell>
    </TeamProfileProvider>
  )
}
