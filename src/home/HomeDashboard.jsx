import { useCallback, useEffect, useState } from 'react'
import { GUEST_STATE_UPDATED_EVENT } from '../predictions/predictionSaveConfig.js'
import { Button, Icon, StatusBar } from '../design-system/index.jsx'
import { HOME_STATE } from './homeDashboardModel.js'
import { loadHomeDashboard } from './homeDashboardService.js'
import CountdownHero from './HomeHero.jsx'
import HomeMatchCard from './HomeMatchCard.jsx'
import { LeaderboardsCard, LeaguesTeaser, RankStrip, RulesCard, StatTiles, TournamentCard } from './HomeSidebar.jsx'
import { formatDayLabel, formatKickoffTime, formatPoints, summariseDay } from './homeFormat.js'
import styles from './HomeDashboard.module.css'

function SectionHeading({ title, link, lead = false }) {
  const Title = lead ? 'h1' : 'h2'
  return (
    <div className={styles.sect}>
      <span className={styles.sectLead}>
        <span className={styles.sectBar} aria-hidden="true" />
        <Title>{title}</Title>
      </span>
      {link && <a className={styles.sectMore} href={link.href}>{link.label} ›</a>}
    </div>
  )
}

/** The prediction meter, shared by the signed-in and guest pre-tournament cards. */
function PredictionProgress({ original }) {
  const done = original.totalComplete
  const total = original.total
  const remaining = Math.max(0, total - done)
  const percent = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <>
      <div className={styles.cardRow}>
        <h2>Your predictions</h2>
        <span className={styles.progCount}>{done}<span>/{total}</span></span>
      </div>
      <div
        className={styles.meter}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-label={`Your predictions: ${done} of ${total} complete`}
      >
        <span className={styles.meterFill} style={{ width: `${percent}%` }} />
      </div>
      <div className={styles.progLine}>
        <span>
          {original.bracketComplete === original.bracketTotal
            ? 'Bracket complete'
            : `${original.bracketComplete}/${original.bracketTotal} bracket picks`}
        </span>
        <span>{remaining === 0 ? 'All done' : `${remaining} to go`}</span>
      </div>
    </>
  )
}

function OpeningMatch({ dashboard }) {
  const { home } = dashboard
  if (!home.openingMatch) return null

  return (
    <>
      <SectionHeading title="Opening match" link={{ href: home.openingMatch.href, label: 'Match Centre' }} />
      <HomeMatchCard card={home.openingMatch} showPrediction={dashboard.signedIn} />
    </>
  )
}

function PreTournament({ dashboard }) {
  const { original, home } = dashboard

  return (
    <>
      <CountdownHero lockAt={home.lockAt} countdown={home.countdown} openingMatch={home.openingMatch} provisional={dashboard.lifecycle.provisional} />

      <div className={styles.grid}>
        <div className={styles.column}>
          <section className={styles.card}>
            <PredictionProgress original={original} />
            {home.predictionCta
              ? (
                <a className={styles.cta} href={home.predictionCta.href}>
                  {original.totalComplete > 0 ? 'Finish your predictions' : 'Start your predictions'}
                </a>
              )
              : <p className={styles.ctaDone}>All predictions in. You can still change them until the lock.</p>}
            <a className={styles.howto} href="#/how-to-play">How scoring works</a>
          </section>

          <OpeningMatch dashboard={dashboard} />
        </div>

        <div className={styles.column}>
          <StatTiles dashboard={dashboard} />
          <LeaderboardsCard dashboard={dashboard} />
          <LeaguesTeaser dashboard={dashboard} />
          <RulesCard />
        </div>
      </div>
    </>
  )
}

/**
 * The signed-out visitor.
 *
 * The prototype draws this state for a first-time visitor, with no progress and
 * an account CTA. A guest who has already predicted in this browser is the same
 * state with real progress behind it, and Home has always shown it. Withdrawing
 * the meter and the route back into the flow would lose work they can see they
 * did, so the card keeps both: their progress when there is any, the invitation
 * when there is not.
 */
function SignedOut({ dashboard }) {
  const { original, home } = dashboard
  const started = original.totalComplete > 0

  return (
    <>
      <CountdownHero lockAt={home.lockAt} countdown={home.countdown} openingMatch={home.openingMatch} provisional={dashboard.lifecycle.provisional} />

      <div className={styles.grid}>
        <div className={styles.column}>
          <section className={styles.card}>
            {started
              ? (
                <>
                  <PredictionProgress original={original} />
                  {home.predictionCta && (
                    <a className={styles.cta} href={home.predictionCta.href}>Finish your predictions</a>
                  )}
                  <p className={styles.ctaDone}>Create an account to keep them and join a league.</p>
                  <div className={styles.ctaPair}>
                    <a className={styles.ctaGhost} href="#/account">Create an account</a>
                  </div>
                </>
              )
              : (
                <>
                  <div className={styles.cardRow}><h2>Predict all {original.total} matches</h2></div>
                  <p className={styles.muted}>
                    Enter a score for all {original.groupTotal} group matches, build your bracket, and pick a top
                    scorer. Everything locks at the first kick-off.
                  </p>
                  <div className={styles.ctaPair}>
                    <a className={styles.cta} href="#/account">Create an account</a>
                    <a className={styles.ctaGhost} href="#/account">Sign in</a>
                  </div>
                </>
              )}
            <a className={styles.howto} href="#/how-to-play">How scoring works</a>
          </section>

          <OpeningMatch dashboard={dashboard} />
        </div>

        <div className={styles.column}>
          <LeaderboardsCard dashboard={dashboard} />
          <TournamentCard dashboard={dashboard} />
        </div>
      </div>
    </>
  )
}

function MatchdayLive({ dashboard }) {
  const { home } = dashboard
  const hasFootball = home.liveMatches.length > 0 || home.upcomingMatches.length > 0

  return (
    <div className={styles.grid}>
      <div className={styles.column}>
        <SectionHeading lead title="Today at the Euros" link={{ href: '#/results', label: 'All fixtures' }} />
        {home.liveMatches.map(card => <HomeMatchCard card={card} key={card.matchNumber} showPrediction={dashboard.signedIn} />)}

        {home.upcomingMatches.length > 0 && <SectionHeading title="Next up" />}
        {home.upcomingMatches.map(card => <HomeMatchCard card={card} key={card.matchNumber} showPrediction={dashboard.signedIn} />)}

        {!hasFootball && (
          <section className={styles.card}><p className={styles.muted}>No matches scheduled today.</p></section>
        )}
      </div>

      <div className={styles.column}>
        <RankStrip dashboard={dashboard} />
        <LeaderboardsCard dashboard={dashboard} />
        {dashboard.signedIn ? <LeaguesTeaser dashboard={dashboard} /> : <RulesCard />}
      </div>
    </div>
  )
}

/**
 * The day's football is done.
 *
 * The prototype prints a points chip on each finished card ("Exact +5") and a
 * "+8 pts today" figure. Neither has a data source: the result columns carry no
 * per-match points, and the model refuses to invent them. What the data does
 * support is how each pick turned out, so that is what is told — in words, not
 * in numbers nobody can stand behind. Flagged for owner decision.
 */
function PostMatch({ dashboard }) {
  const { home } = dashboard
  const played = home.completedMatches.length
  const day = summariseDay(home.completedMatches)

  return (
    <div className={styles.grid}>
      <div className={styles.column}>
        <SectionHeading lead title="Today’s results" link={{ href: '#/results', label: 'All results' }} />
        {home.completedMatches.map(card => <HomeMatchCard card={card} key={card.matchNumber} showPrediction={dashboard.signedIn} />)}

        {dashboard.signedIn && !dashboard.sectionErrors.results && (
          <section className={styles.card}>
            <div className={styles.cardRow}>
              <h2>Your day</h2>
              <span className={styles.muted}>{formatPoints(dashboard.original.points, dashboard.original.dataAvailable)} pts total</span>
            </div>
            <div className={styles.progLine}>
              <span>{played} match{played === 1 ? '' : 'es'} played today</span>
              <span>{day.exact} exact · {day.result} result · {day.miss} misses</span>
            </div>
          </section>
        )}

        {home.tomorrow && (
          <a className={`${styles.card} ${styles.tappable}`} href="#/results">
            <span>
              <h2>{formatDayLabel(home.tomorrow.dayKey)}</h2>
              <span className={styles.muted}>
                {home.tomorrow.matchCount} match{home.tomorrow.matchCount === 1 ? '' : 'es'}
                {home.tomorrow.firstKickoffAt ? ` · first kick-off ${formatKickoffTime(home.tomorrow.firstKickoffAt)}` : ''}
              </span>
            </span>
            <Icon name="chevron" size={18} />
          </a>
        )}
      </div>

      <div className={styles.column}>
        <RankStrip dashboard={dashboard} />
        <LeaderboardsCard dashboard={dashboard} />
        {dashboard.signedIn ? <LeaguesTeaser dashboard={dashboard} /> : <RulesCard />}
      </div>
    </div>
  )
}

function LoadingDashboard() {
  return (
    <div className={styles.home} aria-busy="true" aria-live="polite">
      <div className={`${styles.skeleton} ${styles.skeletonHero}`} />
      <div className={styles.grid}>
        <div className={`${styles.skeleton} ${styles.skeletonCard}`} />
        <div className={`${styles.skeleton} ${styles.skeletonCard}`} />
      </div>
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

  if (state.status === 'loading' || (!fixture && sessionState.status === 'loading')) return <LoadingDashboard />
  if (state.status === 'error') {
    return (
      <div className={styles.home}>
        <StatusBar tone="danger" title="Your dashboard could not load" action={<Button variant="secondary" size="small" icon="refresh" onClick={load}>Try again</Button>}>
          {state.error}
        </StatusBar>
      </div>
    )
  }

  const dashboard = state.data
  const preTournament = dashboard.home.state === HOME_STATE.PRE

  return (
    <div className={styles.home}>
      {dashboard.hasPartialFailure && (
        <StatusBar tone="warning" title="Some live data is temporarily unavailable">
          Your saved predictions remain safe. Unavailable cards are shown with a dash rather than a false zero.
        </StatusBar>
      )}

      {!dashboard.live.dataAvailable && !preTournament && (
        <StatusBar tone="warning" title="Live tournament data unavailable">
          No result has been shown as zero or final.
        </StatusBar>
      )}

      {preTournament && dashboard.signedIn && <PreTournament dashboard={dashboard} />}
      {preTournament && !dashboard.signedIn && <SignedOut dashboard={dashboard} />}
      {dashboard.home.state === HOME_STATE.LIVE && <MatchdayLive dashboard={dashboard} />}
      {dashboard.home.state === HOME_STATE.POST && <PostMatch dashboard={dashboard} />}
    </div>
  )
}
