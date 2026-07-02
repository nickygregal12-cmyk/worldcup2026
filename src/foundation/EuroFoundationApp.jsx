import { useCallback, useEffect, useMemo, useState } from 'react'
import EuroAuthFoundation from '../auth/EuroAuthFoundation.jsx'
import { useEuroSession } from '../auth/useEuroSession.js'
import PredictionJourneyFoundation from '../journey/PredictionJourneyFoundation.jsx'
import KoPredictorFoundation from '../koPredictor/KoPredictorFoundation.jsx'
import ResultsAndLeaderboardsFoundation from '../results/ResultsAndLeaderboardsFoundation.jsx'
import AdminOperationsFoundation from '../admin/AdminOperationsFoundation.jsx'
import LeaguesFoundation from '../leagues/LeaguesFoundation.jsx'
import HomeDashboard from '../home/HomeDashboard.jsx'
import TournamentOverview from '../tournament/TournamentOverview.jsx'
import EuroAppShell from '../app/EuroAppShell.jsx'
import { APP_ROUTE } from '../app/appRoutes.js'
import { deriveNavigationLifecycle } from '../app/navigationLifecycle.js'
import { useHashRoute } from '../app/useHashRoute.js'
import { useTheme } from '../app/useTheme.js'
import { VISUAL_FOUNDATION, VISUAL_HOME_DASHBOARD } from '../app/visualFixture.js'
import { Badge, Button, Card } from '../design-system/index.jsx'
import { loadEuroFoundation } from './loadEuroFoundation.js'
import { createFoundationClient } from './supabaseClient.js'

function isVisualFixture() {
  if (typeof window === 'undefined') return false
  if (window.__EURO28_VISUAL_FIXTURE__ === true) return true
  const fixtureRequested = new URLSearchParams(window.location.search).get('visual') === 'stage13a'
  return fixtureRequested && (import.meta.env.DEV || window.location.protocol === 'file:')
}

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

function FoundationError({ message, onRetry }) {
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

export default function EuroFoundationApp() {
  const visualFixture = useMemo(() => isVisualFixture(), [])
  const route = useHashRoute()
  const theme = useTheme()
  const clientState = useMemo(() => createFoundationClient(), [])
  const sessionState = useEuroSession(visualFixture ? null : clientState.client)
  const [state, setState] = useState(() => visualFixture
    ? { status: 'ready', data: VISUAL_FOUNDATION, error: null }
    : clientState.client
      ? { status: 'loading', data: null, error: null }
      : { status: 'error', data: null, error: clientState.error })

  const refresh = useCallback(async () => {
    if (visualFixture || !clientState.client) return
    setState(previous => ({ ...previous, status: 'loading', error: null }))
    try {
      const data = await loadEuroFoundation(clientState.client)
      setState({ status: 'ready', data, error: null })
    } catch (error) {
      setState({ status: 'error', data: null, error: error instanceof Error ? error.message : String(error) })
    }
  }, [clientState, visualFixture])

  useEffect(() => {
    if (visualFixture || !clientState.client) return undefined
    let active = true
    loadEuroFoundation(clientState.client)
      .then(data => { if (active) setState({ status: 'ready', data, error: null }) })
      .catch(error => { if (active) setState({ status: 'error', data: null, error: error instanceof Error ? error.message : String(error) }) })
    return () => { active = false }
  }, [clientState, visualFixture])

  if (state.status === 'loading') return <LoadingApplication />
  if (state.status === 'error' || !state.data) return <FoundationError message={state.error} onRetry={refresh} />

  const foundation = state.data
  const navigation = deriveNavigationLifecycle(foundation.guestReference)
  const visualSession = visualFixture
    ? { status: 'ready', session: { user: { id: 'visual-user', email: 'nicky@example.com' } }, profile: { display_name: 'Nicky' }, error: null }
    : sessionState

  let content
  if (route === APP_ROUTE.HOME) {
    content = <HomeDashboard client={clientState.client} foundation={foundation} sessionState={visualSession} fixture={visualFixture ? VISUAL_HOME_DASHBOARD : null} />
  } else if (route === APP_ROUTE.PREDICT) {
    content = (
      <div className="content-stack legacy-page">
        <PageIntro eyebrow="Original Predictor" title="Build your tournament prediction" description="Predict all group scores and complete your winner-only pre-tournament bracket." badge={{ tone: foundation.tournament.prediction_locked_at ? 'warning' : 'safe', label: foundation.tournament.prediction_locked_at ? 'Locked' : 'Open' }} />
        <PredictionJourneyFoundation key={`groups-${foundation.guestReference.referenceVersion}`} client={clientState.client} reference={foundation.guestReference} tournament={foundation.tournament} initialView="groups" />
      </div>
    )
  } else if (route === APP_ROUTE.BRACKET) {
    content = (
      <div className="content-stack legacy-page">
        <PageIntro eyebrow="Original Predictor" title="Your pre-tournament bracket" description="Choose the team that advances from every predicted knockout match. Scores and jokers do not apply here." />
        <PredictionJourneyFoundation key={`bracket-${foundation.guestReference.referenceVersion}`} client={clientState.client} reference={foundation.guestReference} tournament={foundation.tournament} initialView="bracket" />
      </div>
    )
  } else if (route === APP_ROUTE.KO_PREDICTOR) {
    content = (
      <div className="content-stack legacy-page">
        <PageIntro eyebrow="Separate competition" title="KO Predictor" description="Predict each real knockout fixture once its participants are confirmed." />
        <KoPredictorFoundation client={clientState.client} reference={foundation.guestReference} />
      </div>
    )
  } else if (route === APP_ROUTE.LEAGUES) {
    content = (
      <div className="content-stack legacy-page">
        <PageIntro eyebrow="Private competitions" title="Your leagues" description="One member list, with separate Original Predictor and KO Predictor tables." />
        <LeaguesFoundation client={clientState.client} tournamentId={foundation.tournament.id} />
      </div>
    )
  } else if (route === APP_ROUTE.RESULTS) {
    content = (
      <div className="content-stack legacy-page">
        <PageIntro eyebrow="Live tournament" title="Results and leaderboards" description="Canonical scores, live tables and two fully separate competition standings." />
        <ResultsAndLeaderboardsFoundation client={clientState.client} reference={foundation.guestReference} />
      </div>
    )
  } else if (route === APP_ROUTE.ACCOUNT) {
    content = (
      <div className="content-stack legacy-page">
        <PageIntro eyebrow="Account" title={visualSession.session ? 'Profile and security' : 'Sign in or create an account'} description="Your browser guest draft remains separate and safe until you explicitly import it." />
        <EuroAuthFoundation client={clientState.client} />
      </div>
    )
  } else if (route === APP_ROUTE.TOURNAMENT) {
    content = <TournamentOverview foundation={foundation} />
  } else if (route === APP_ROUTE.ADMIN) {
    content = (
      <div className="content-stack legacy-page">
        <PageIntro eyebrow="Restricted access" title="Tournament control room" description="Secure result operations, locks, grace windows and operational safeguards." />
        <AdminOperationsFoundation client={clientState.client} reference={foundation.guestReference} />
      </div>
    )
  } else {
    content = <HomeDashboard client={clientState.client} foundation={foundation} sessionState={visualSession} fixture={visualFixture ? VISUAL_HOME_DASHBOARD : null} />
  }

  return <EuroAppShell route={route} theme={theme} sessionState={visualSession} navigation={navigation}>{content}</EuroAppShell>
}
