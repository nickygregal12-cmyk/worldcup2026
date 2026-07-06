import { useCallback, useEffect, useState } from 'react'
import { EURO_SCORING_CONFIG } from '../config/scoringConfig.js'
import { GUEST_STATE_UPDATED_EVENT } from '../predictions/predictionSaveConfig.js'
import { Badge, Button, Card, Icon, LinkButton, ProgressBar, StatusBar, TeamLabel } from '../design-system/index.jsx'
import { loadHomeDashboard } from './homeDashboardService.js'
import styles from './HomeAccess.module.css'
import homeStyles from './HomeDashboard.module.css'

function dateFromValue(value) {
  if (!value) return null
  return new Date(String(value).includes('T') ? value : `${value}T12:00:00Z`)
}

function formatDate(value, fallback = 'To be confirmed') {
  const date = dateFromValue(value)
  if (!date || Number.isNaN(date.getTime())) return fallback
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

function formatDateTime(value, fallback = 'To be confirmed') {
  const date = dateFromValue(value)
  if (!date || Number.isNaN(date.getTime())) return fallback
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/London',
  }).format(date)
}

function formatRank(rank) {
  return rank ? `#${rank}` : '—'
}

function pointsStoryNote(competition, fallback) {
  if (!competition.rank) return fallback
  if (competition.isLeader) return `${formatRank(competition.rank)} overall · leading`
  return `${formatRank(competition.rank)} overall · ${competition.pointsBehindLeader} pts behind leader`
}

function Stat({ label, value, note, href = null }) {
  return (
    <Card
      className={`home-stat ${href ? styles.statLink : ''}`.trim()}
      as={href ? 'a' : 'article'}
      href={href ?? undefined}
      aria-label={href ? `${label}: ${value}. ${note}. Open full leaderboard.` : undefined}
    >
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{href ? `${note} · View full table` : note}</small>
    </Card>
  )
}

function CompetitionCard({ title, eyebrow, description, href, progress, secondaryProgress, points, rank, badge, cta, unavailable = false }) {
  return (
    <Card className="home-competition" as="article">
      <div className="home-competition__heading">
        <div>
          <span className="page-eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
        </div>
        <Badge tone={badge.tone}>{badge.label}</Badge>
      </div>
      <p>{description}</p>
      {unavailable ? (
        <StatusBar tone="warning" title="Progress temporarily unavailable">Your saved predictions have not been replaced or counted as zero.</StatusBar>
      ) : (
        <div className="home-competition__progress">
          <div><span>{progress.label}</span><ProgressBar value={progress.value} max={progress.max} label={`${title}: ${progress.label}`} /></div>
          {secondaryProgress && <div><span>{secondaryProgress.label}</span><ProgressBar value={secondaryProgress.value} max={secondaryProgress.max} label={`${title}: ${secondaryProgress.label}`} /></div>}
        </div>
      )}
      <div className="home-competition__footer">
        <div className="home-score-pair">
          <span><strong>{points ?? '—'}</strong><small>points</small></span>
          <span><strong>{formatRank(rank)}</strong><small>rank</small></span>
        </div>
        <LinkButton href={href} variant="secondary" size="small">{cta}<Icon name="chevron" size={16} /></LinkButton>
      </div>
    </Card>
  )
}

function LoadingDashboard() {
  return (
    <div className="home-dashboard home-dashboard--loading" aria-busy="true" aria-live="polite">
      <div className="home-skeleton home-skeleton--hero" />
      <div className="home-stat-grid">{[1, 2, 3].map(item => <div className="home-skeleton home-skeleton--stat" key={item} />)}</div>
      <div className="home-competition-grid">{[1, 2].map(item => <div className="home-skeleton home-skeleton--card" key={item} />)}</div>
      <span className="sr-only">Loading your Euro dashboard…</span>
    </div>
  )
}

export default function HomeDashboard({ client, foundation, sessionState, fixture = null }) {
  const [state, setState] = useState(() => fixture
    ? { status: 'ready', data: fixture, error: null }
    : { status: 'loading', data: null, error: null })

  const load = useCallback(async () => {
    if (fixture) {
      setState({ status: 'ready', data: fixture, error: null })
      return
    }
    setState(previous => ({ ...previous, status: 'loading', error: null }))
    try {
      const data = await loadHomeDashboard({
        client,
        tournament: foundation.tournament,
        reference: foundation.guestReference,
        session: sessionState.session,
        profile: sessionState.profile,
      })
      setState({ status: 'ready', data, error: null })
    } catch (error) {
      setState({ status: 'error', data: null, error: error instanceof Error ? error.message : String(error) })
    }
  }, [client, foundation, sessionState.session, sessionState.profile, fixture])

  useEffect(() => {
    if (!fixture && sessionState.status !== 'loading') void Promise.resolve().then(load)
  }, [fixture, load, sessionState.status])

  useEffect(() => {
    if (fixture) return undefined
    const refreshGuest = () => {
      if (!sessionState.session?.user) void load()
    }
    globalThis.addEventListener?.(GUEST_STATE_UPDATED_EVENT, refreshGuest)
    globalThis.addEventListener?.('storage', refreshGuest)
    return () => {
      globalThis.removeEventListener?.(GUEST_STATE_UPDATED_EVENT, refreshGuest)
      globalThis.removeEventListener?.('storage', refreshGuest)
    }
  }, [fixture, load, sessionState.session])

  if (!fixture && sessionState.status === 'loading') return <LoadingDashboard />
  if (state.status === 'loading') return <LoadingDashboard />
  if (state.status === 'error') {
    return (
      <div className="home-dashboard">
        <StatusBar tone="danger" title="Your dashboard could not load" action={<Button variant="secondary" size="small" icon="refresh" onClick={load}>Try again</Button>}>
          {state.error}
        </StatusBar>
      </div>
    )
  }

  const dashboard = state.data
  const firstName = dashboard.displayName?.split(' ')[0]
  const originalLocked = dashboard.lifecycle.phase !== 'build'
  const koOpen = dashboard.koReadiness.open
  const matchHub = dashboard.live.matchHub
  const heroPrompt = dashboard.signedIn
    ? 'Your Original Predictor and KO Predictor are tracked separately, with their own points, jokers and leaderboards.'
    : dashboard.original.totalComplete > 0
      ? 'Your device draft is underway. Create an account when you are ready to protect it and join leagues.'
      : 'Start as a guest, build the full predictor, then create an account when you are ready to save it online.'

  return (
    <div className="home-dashboard">
      <section className="home-hero">
        <div className="home-hero__content">
          <Badge tone={dashboard.lifecycle.phaseTone}>{dashboard.lifecycle.phaseLabel}</Badge>
          <h1>{dashboard.signedIn ? `Welcome back, ${firstName}` : 'Make every Euro 2028 match matter.'}</h1>
          <p>
            {heroPrompt}
          </p>
          <div className={homeStyles.lifecycleStrip} aria-label="Euro 2028 timing">
            <div><span>Prediction lock</span><strong>{dashboard.lifecycle.predictionLockCountdown}</strong><small>{formatDateTime(dashboard.lifecycle.predictionLockAt)}</small></div>
            <div><span>Tournament starts</span><strong>{dashboard.lifecycle.tournamentStartCountdown}</strong><small>{formatDateTime(dashboard.lifecycle.tournamentStartAt)}</small></div>
            <div><span>KO Predictor</span><strong>{dashboard.koReadiness.open ? `${dashboard.koReadiness.available} ready` : 'Later'}</strong><small>{dashboard.koReadiness.label}</small></div>
          </div>
          <div className="home-hero__actions">
            <LinkButton href="#/predict" icon="predict">{dashboard.original.totalComplete > 0 ? 'Continue predicting' : 'Start predicting'}</LinkButton>
            <LinkButton href={dashboard.signedIn ? '#/leagues' : '#/account'} variant="secondary" icon={dashboard.signedIn ? 'leagues' : 'account'}>
              {dashboard.signedIn ? 'View leagues' : 'Create an account'}
            </LinkButton>
            {dashboard.signedIn && <LinkButton href="#/leaderboards" variant="secondary" icon="results">Leaderboards</LinkButton>}
          </div>
        </div>
        <Card className="home-tournament-card" as="aside">
          <span className="page-eyebrow">Tournament timeline</span>
          <strong>{formatDate(dashboard.tournament.startsOn)} – {formatDate(dashboard.tournament.endsOn)}</strong>
          <div><span>{dashboard.tournament.totalMatches}</span><small>matches</small></div>
          <div><span>{dashboard.tournament.totalTeams}</span><small>team slots</small></div>
          <div><span>{dashboard.lifecycle.predictionLockCountdown}</span><small>until lock</small></div>
          <div><span>{dashboard.lifecycle.tournamentStartCountdown}</span><small>until kick-off</small></div>
          <p>{dashboard.tournament.unresolvedTeams > 0 ? `${dashboard.tournament.unresolvedTeams} team identities still await qualification and the final draw.` : 'All tournament teams are confirmed.'}</p>
        </Card>
      </section>

      {dashboard.hasPartialFailure && (
        <StatusBar tone="warning" title="Some live account data is temporarily unavailable">
          Your saved predictions remain safe. Unavailable cards are shown with a dash rather than a false zero and will refresh on the next lifecycle update.
        </StatusBar>
      )}

      <section className="home-stat-grid" aria-label="Your predictor summary">
        <Stat label="Original Predictor" value={dashboard.signedIn && !dashboard.sectionErrors.results ? dashboard.original.points : '—'} note={dashboard.signedIn ? pointsStoryNote(dashboard.original, 'Not ranked yet') : 'Guest drafts are unscored'} href={dashboard.signedIn ? '#/leaderboards?competition=original' : null} />
        <Stat label="KO Predictor" value={dashboard.signedIn && !dashboard.sectionErrors.results ? dashboard.koPredictor.points : '—'} note={koOpen ? pointsStoryNote(dashboard.koPredictor, 'Not ranked yet') : 'Opens as real knockout fixtures are known'} href={dashboard.signedIn ? '#/leaderboards?competition=koPredictor' : null} />
        <Stat label="Private leagues" value={dashboard.signedIn && !dashboard.sectionErrors.leagues ? dashboard.leagues.count : '—'} note={dashboard.signedIn ? `${dashboard.leagues.members} combined members` : 'Sign in to create or join'} />
      </section>

      <section className="home-competition-grid" aria-label="Competition progress">
        <CompetitionCard
          title="Original Predictor"
          eyebrow="Pre-tournament competition"
          description="Predict all 36 group scores, then choose the winner of every match in your pre-tournament bracket."
          href="#/predict"
          progress={{ label: 'Group matches', value: dashboard.original.groupComplete, max: dashboard.original.groupTotal }}
          secondaryProgress={{ label: 'Bracket picks', value: dashboard.original.bracketComplete, max: dashboard.original.bracketTotal }}
          points={dashboard.signedIn && !dashboard.sectionErrors.results ? dashboard.original.points : null}
          rank={dashboard.signedIn && !dashboard.sectionErrors.results ? dashboard.original.rank : null}
          badge={dashboard.original.dataAvailable
            ? { tone: originalLocked ? 'warning' : 'safe', label: originalLocked ? 'Locked' : `${dashboard.original.jokerCount}/${dashboard.original.jokerCap} jokers` }
            : { tone: 'warning', label: 'Unavailable' }}
          unavailable={!dashboard.original.dataAvailable}
          cta="Open predictor"
        />
        <CompetitionCard
          title="KO Predictor"
          eyebrow="Separate knockout competition"
          description="Once each real knockout fixture is known, predict its 90-minute score, advancing team and decision method."
          href="#/ko-predictor"
          progress={{ label: 'Available fixtures predicted', value: dashboard.koPredictor.complete, max: dashboard.koPredictor.available }}
          points={dashboard.signedIn && !dashboard.sectionErrors.results ? dashboard.koPredictor.points : null}
          rank={dashboard.signedIn && !dashboard.sectionErrors.results ? dashboard.koPredictor.rank : null}
          badge={dashboard.koPredictor.dataAvailable
            ? { tone: koOpen ? 'info' : 'neutral', label: koOpen ? `${dashboard.koPredictor.jokerCount}/${dashboard.koPredictor.jokerCap} jokers` : 'Opens later' }
            : { tone: 'warning', label: 'Unavailable' }}
          unavailable={!dashboard.koPredictor.dataAvailable}
          cta="Open KO Predictor"
        />
      </section>

      <section className="home-lower-grid">
        <Card className="home-live" as="article">
          <div className="home-section-heading">
            <div><span className="page-eyebrow">Today’s match hub</span><h2>{dashboard.live.liveMatches > 0 ? `${dashboard.live.liveMatches} match${dashboard.live.liveMatches === 1 ? '' : 'es'} live` : matchHub ? matchHub.title : 'Waiting for kick-off'}</h2></div>
            <Badge tone={dashboard.live.liveMatches > 0 ? 'danger' : 'neutral'}>{dashboard.live.confirmedMatches}/{dashboard.live.totalMatches} final</Badge>
          </div>
          {!dashboard.live.dataAvailable ? (
            <StatusBar tone="warning" title="Live tournament data unavailable">No result has been shown as zero or final.</StatusBar>
          ) : matchHub ? (
            <div className="home-next-match">
              <Icon name={matchHub.state === 'live' ? 'results' : 'clock'} />
              <div className={homeStyles.matchHubBody}>
                <strong>{matchHub.stageLabel} · Match {matchHub.matchNumber}</strong>
                <span>{matchHub.timeLabel} · {formatDateTime(matchHub.scheduledDate)}</span>
                <div className={homeStyles.matchHubTeams} aria-label="Match teams">
                  <TeamLabel team={matchHub.home} label={matchHub.home.label} unresolved={matchHub.home.unresolved} compact />
                  <span>v</span>
                  <TeamLabel team={matchHub.away} label={matchHub.away.label} unresolved={matchHub.away.unresolved} compact />
                </div>
                <small className={homeStyles.nextMatchHint}>{matchHub.note}</small>
              </div>
              <LinkButton href={matchHub.href} variant="ghost" size="small">{matchHub.cta}<Icon name="chevron" size={16} /></LinkButton>
            </div>
          ) : <p>All tournament matches are complete.</p>}
        </Card>

        <Card className="home-rules" as="article">
          <div className="home-section-heading"><div><span className="page-eyebrow">Scoring at a glance</span><h2>How points work</h2></div><LinkButton href="#/tournament" variant="ghost" size="small">Full rules</LinkButton></div>
          <div className="home-rules__grid">
            <div><strong>{EURO_SCORING_CONFIG.match.EXACT_SCORE}</strong><span>Exact score</span></div>
            <div><strong>{EURO_SCORING_CONFIG.match.CORRECT_OUTCOME}</strong><span>Correct outcome</span></div>
            <div><strong>{EURO_SCORING_CONFIG.joker.MULTIPLIER}×</strong><span>Joker multiplier</span></div>
          </div>
          <small>Original and KO Predictor have separate leaderboards.</small>
        </Card>
      </section>
    </div>
  )
}
