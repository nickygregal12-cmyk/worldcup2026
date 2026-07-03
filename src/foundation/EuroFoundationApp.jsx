import { useCallback, useEffect, useMemo, useState } from 'react'
import EuroAuthFoundation from '../auth/EuroAuthFoundation.jsx'
import { useEuroSession } from '../auth/useEuroSession.js'
import PredictionJourneyFoundation from '../journey/PredictionJourneyFoundation.jsx'
import KoPredictorFoundation from '../koPredictor/KoPredictorFoundation.jsx'
import ResultsAndLeaderboardsFoundation from '../results/ResultsAndLeaderboardsFoundation.jsx'
import MatchCentreFoundation from '../matchCentre/MatchCentreFoundation.jsx'
import AdminOperationsFoundation from '../admin/AdminOperationsFoundation.jsx'
import LeaguesFoundation from '../leagues/LeaguesFoundation.jsx'
import HomeDashboard from '../home/HomeDashboard.jsx'
import TournamentOverview from '../tournament/TournamentOverview.jsx'
import EuroAppShell from '../app/EuroAppShell.jsx'
import { APP_ROUTE, leaderboardCompetitionFromHash, matchCentreParamsFromHash } from '../app/appRoutes.js'
import { deriveNavigationLifecycle } from '../app/navigationLifecycle.js'
import { useHashLocation } from '../app/useHashRoute.js'
import { useTheme } from '../app/useTheme.js'
import { VISUAL_BRACKET_DRAFT, VISUAL_FOUNDATION, VISUAL_GROUP_DRAFT, VISUAL_HOME_DASHBOARD, VISUAL_KO_BUNDLE, VISUAL_KO_REFERENCE, VISUAL_KO_STANDING } from '../app/visualFixture.js'
import { createStage13dVisualClient, STAGE13D_VISUAL_SCENARIO, VISUAL_STAGE13D_FOUNDATION, VISUAL_STAGE13D_REFERENCE } from '../app/stage13dVisualFixture.js'
import { Badge, Button, Card } from '../design-system/index.jsx'
import TeamProfileProvider from '../teamProfile/TeamProfileProvider.jsx'
import { loadEuroFoundation } from './loadEuroFoundation.js'
import { createFoundationClient } from './supabaseClient.js'

function visualFixtureName() {
  if (typeof window === 'undefined') return null
  if (window.__EURO28_VISUAL_FIXTURE__ === true) return 'stage13a'
  const requested = new URLSearchParams(window.location.search).get('visual')
  const supported = ['stage13a', 'stage13b', 'stage13c', 'stage13d', 'stage13e']
  return supported.includes(requested) && (import.meta.env.DEV || window.location.protocol === 'file:')
    ? requested
    : null
}

function stage13dVisualScenario(fixtureName) {
  if (!['stage13d', 'stage13e'].includes(fixtureName) || typeof window === 'undefined') return STAGE13D_VISUAL_SCENARIO.ACTIVE
  const requested = new URLSearchParams(window.location.search).get('scenario')
  return Object.values(STAGE13D_VISUAL_SCENARIO).includes(requested)
    ? requested
    : STAGE13D_VISUAL_SCENARIO.ACTIVE
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
  const fixtureName = useMemo(() => visualFixtureName(), [])
  const visualFixture = Boolean(fixtureName)
  const fixtureScenario = useMemo(() => stage13dVisualScenario(fixtureName), [fixtureName])
  const hashLocation = useHashLocation()
  const route = hashLocation.route
  const theme = useTheme()
  const clientState = useMemo(() => createFoundationClient(), [])
  const stage13dClient = useMemo(() => ['stage13d', 'stage13e'].includes(fixtureName) ? createStage13dVisualClient({ scenario: fixtureScenario }) : null, [fixtureName, fixtureScenario])
  const activeClient = stage13dClient ?? clientState.client
  const sessionState = useEuroSession(visualFixture ? null : activeClient)
  const [state, setState] = useState(() => visualFixture
    ? { status: 'ready', data: ['stage13d', 'stage13e'].includes(fixtureName) ? VISUAL_STAGE13D_FOUNDATION : VISUAL_FOUNDATION, error: null }
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
    content = <HomeDashboard client={activeClient} foundation={foundation} sessionState={visualSession} fixture={visualFixture ? VISUAL_HOME_DASHBOARD : null} />
  } else if (route === APP_ROUTE.PREDICT) {
    content = (
      <div className="content-stack groups-page">
        <PageIntro eyebrow="Original Predictor" title="Predict the group stage" description="Enter all 36 group scores, place up to five jokers and review your progress at any time." badge={{ tone: foundation.tournament.prediction_locked_at ? 'warning' : 'safe', label: foundation.tournament.prediction_locked_at ? 'Locked' : 'Open' }} />
        <PredictionJourneyFoundation key={`groups-${foundation.guestReference.referenceVersion}`} client={activeClient} reference={foundation.guestReference} tournament={foundation.tournament} initialView="groups" fixtureDraft={visualFixture ? VISUAL_GROUP_DRAFT : null} />
      </div>
    )
  } else if (route === APP_ROUTE.BRACKET) {
    content = (
      <div className="content-stack knockout-page">
        <PageIntro eyebrow="Original Predictor" title="Your pre-tournament bracket" description="Choose the team that advances from every predicted knockout match. Scores and jokers do not apply here." />
        <PredictionJourneyFoundation key={`bracket-${foundation.guestReference.referenceVersion}`} client={activeClient} reference={foundation.guestReference} tournament={foundation.tournament} initialView="bracket" fixtureDraft={visualFixture ? VISUAL_BRACKET_DRAFT : null} />
      </div>
    )
  } else if (route === APP_ROUTE.KO_PREDICTOR) {
    content = (
      <div className="content-stack knockout-page">
        <PageIntro eyebrow="Separate competition" title="KO Predictor" description="Predict each real knockout fixture once its participants are confirmed." />
        <KoPredictorFoundation client={activeClient} reference={visualFixture ? VISUAL_KO_REFERENCE : foundation.guestReference} fixtureBundle={visualFixture ? VISUAL_KO_BUNDLE : undefined} fixtureStanding={visualFixture ? VISUAL_KO_STANDING : undefined} />
      </div>
    )
  } else if (route === APP_ROUTE.LEAGUES) {
    content = (
      <div className="content-stack legacy-page">
        <PageIntro eyebrow="Private competitions" title="Your leagues" description="One member list, with separate Original Predictor and KO Predictor tables." />
        <LeaguesFoundation client={activeClient} tournamentId={foundation.tournament.id} reference={['stage13d', 'stage13e'].includes(fixtureName) ? VISUAL_STAGE13D_REFERENCE : foundation.guestReference} />
      </div>
    )
  } else if (route === APP_ROUTE.MATCH_CENTRE) {
    const matchCentre = matchCentreParamsFromHash(hashLocation.hash)
    content = (
      <div className="content-stack legacy-page">
        <PageIntro eyebrow="Fixture intelligence" title="Euro Match Centre" description="Follow the fixture, community selections and points available without combining the Original and KO Predictor competitions." />
        <MatchCentreFoundation
          client={activeClient}
          reference={['stage13d', 'stage13e'].includes(fixtureName) ? VISUAL_STAGE13D_REFERENCE : foundation.guestReference}
          requestedMatchNumber={matchCentre.matchNumber}
          initialCompetition={matchCentre.competition}
          initialLeagueId={matchCentre.leagueId}
        />
      </div>
    )
  } else if (route === APP_ROUTE.RESULTS) {
    content = (
      <div className="content-stack legacy-page">
        <PageIntro eyebrow="Live tournament" title="Results" description="Canonical scores, live group tables and the live knockout bracket." />
        <ResultsAndLeaderboardsFoundation view="results" client={activeClient} reference={['stage13d', 'stage13e'].includes(fixtureName) ? VISUAL_STAGE13D_REFERENCE : foundation.guestReference} />
      </div>
    )
  } else if (route === APP_ROUTE.LEADERBOARDS) {
    content = (
      <div className="content-stack legacy-page">
        <PageIntro eyebrow="Separate competition standings" title="Leaderboards" description="View the full Original Predictor or KO Predictor table and your matching points breakdown." />
        <ResultsAndLeaderboardsFoundation
          view="leaderboards"
          initialCompetition={leaderboardCompetitionFromHash(hashLocation.hash)}
          client={activeClient}
          reference={['stage13d', 'stage13e'].includes(fixtureName) ? VISUAL_STAGE13D_REFERENCE : foundation.guestReference}
        />
      </div>
    )
  } else if (route === APP_ROUTE.ACCOUNT) {
    content = (
      <div className="content-stack legacy-page">
        <PageIntro eyebrow="Account" title={visualSession.session ? 'Profile and security' : 'Sign in or create an account'} description="Sign in without losing predictions already saved on this device." />
        <EuroAuthFoundation client={activeClient} reference={foundation.guestReference} />
      </div>
    )
  } else if (route === APP_ROUTE.TOURNAMENT) {
    content = <TournamentOverview foundation={foundation} />
  } else if (route === APP_ROUTE.ADMIN) {
    content = (
      <div className="content-stack legacy-page">
        <PageIntro eyebrow="Restricted access" title="Tournament control room" description="Secure result operations, locks, grace windows and operational safeguards." />
        <AdminOperationsFoundation client={activeClient} reference={foundation.guestReference} />
      </div>
    )
  } else {
    content = <HomeDashboard client={activeClient} foundation={foundation} sessionState={visualSession} fixture={visualFixture ? VISUAL_HOME_DASHBOARD : null} />
  }

  const teamProfileReference = ['stage13d', 'stage13e'].includes(fixtureName) ? VISUAL_STAGE13D_REFERENCE : foundation.guestReference
  const autoOpenTeam = fixtureName === 'stage13e'
    ? Object.values(teamProfileReference.teamsById ?? {}).find(team => team.isoCode === 'SCO') ?? null
    : null

  return (
    <TeamProfileProvider client={activeClient} reference={teamProfileReference} autoOpenTeam={autoOpenTeam}>
      <EuroAppShell route={route} theme={theme} sessionState={visualSession} navigation={navigation}>{content}</EuroAppShell>
    </TeamProfileProvider>
  )
}
