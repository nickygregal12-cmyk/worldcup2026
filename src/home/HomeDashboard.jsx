import React, { useCallback, useEffect, useState } from 'react' // eslint-disable-line no-unused-vars -- React is required for JSX under the current lint config
import { GUEST_STATE_UPDATED_EVENT } from '../predictions/predictionSaveConfig.js'
import { Button, Card, Icon, LinkButton, MatchCard, ProgressBar, StatusBar, TeamLabel } from '../design-system/index.jsx'
import { getNow } from '../lib/clock.js'
import { countdownParts, HOME_STATE } from './homeDashboardModel.js'
import { loadHomeDashboard } from './homeDashboardService.js'
import styles from './HomeDashboard.module.css'

function dateFromValue(value) {
  return value ? new Date(String(value).includes('T') ? value : `${value}T12:00:00Z`) : null
}

function formatKickoffTime(value, fallback = 'TBC') {
  const date = dateFromValue(value)
  if (!date || Number.isNaN(date.getTime())) return fallback
  return new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/London' })
    .format(date)
    .replace(' ', '')
}

function formatKickoffDateTime(value, fallback = 'To be confirmed') {
  const date = dateFromValue(value)
  if (!date || Number.isNaN(date.getTime())) return fallback
  const day = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' }).format(date)
  return `${day} · ${formatKickoffTime(value)}`
}

function formatDayLabel(dayKey, fallback = 'Tomorrow') {
  const date = dateFromValue(dayKey)
  if (!date || Number.isNaN(date.getTime())) return fallback
  return new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone: 'Europe/London' }).format(date)
}

function formatRank(rank) { return rank ? `${rank}` : '—' }

/** Concise leader-gap storytelling per the Home v2 contract ("6 behind Craig"). */
function leaderGap({ isLeader, pointsBehindLeader }) {
  if (isLeader) return ' · Leading'
  return pointsBehindLeader > 0 ? ` · ${pointsBehindLeader} behind leader` : ''
}

/** Ticks the countdown without re-fetching the dashboard. Minute granularity. */
function useCountdown(lockAt, initial) {
  const [parts, setParts] = useState(initial)
  useEffect(() => {
    if (!lockAt) return undefined
    const tick = () => setParts(countdownParts(lockAt, getNow()))
    tick()
    const timer = setInterval(tick, 15000)
    return () => clearInterval(timer)
  }, [lockAt])
  return parts
}

function CountdownHero({ lockAt, countdown, openingMatch, provisional = false }) {
  const live = useCountdown(lockAt, countdown)
  const title = openingMatch && !openingMatch.home.unresolved && !openingMatch.away.unresolved
    ? `${openingMatch.home.label} v ${openingMatch.away.label} · Match ${openingMatch.matchNumber}`
    : openingMatch
      ? `Match ${openingMatch.matchNumber}`
      : 'Opening match'

  const units = live
    ? [{ value: live.days, label: 'Days' }, { value: live.hours, label: 'Hours' }, { value: live.minutes, label: 'Mins' }]
    : null

  return (
    <section className={styles.countHero} aria-label="Countdown to prediction lock">
      <span className={styles.countEyebrow}>Predictions lock at kick-off</span>
      <h1 className={styles.countWhat}>{title}</h1>
      {units ? (
        <div className={styles.countBig}>
          {units.map(unit => (
            <span className={styles.countUnit} key={unit.label}>
              <strong>{String(unit.value).padStart(2, '0')}</strong>
              <small>{unit.label}</small>
            </span>
          ))}
        </div>
      ) : (
        <div className={styles.countBig}><span className={styles.countUnit}><strong>Locked</strong></span></div>
      )}
      <p className={styles.countSub}>
        {formatKickoffDateTime(lockAt)}
        {openingMatch?.venueName ? ` · ${openingMatch.venueName}` : ''}
        {provisional ? ' · Provisional — kick-off time not confirmed' : ''}
      </p>
    </section>
  )
}

/**
 * The featured match card. Rendered as an anchor into the real Match Centre
 * route with a visible hint, because this is many users' first encounter with
 * Match Centre. TeamLabel is profile-disabled so it renders a <span> rather
 * than a <button> — an interactive element cannot nest inside this link.
 */
function HomeMatchCard({ card }) {
  const kickoff = formatKickoffTime(card.kickoffAt)
  const meta = [card.venueName, card.state === 'completed' ? 'Full time' : card.stageLabel].filter(Boolean).join(' · ')

  let badge
  if (card.state === 'live') {
    badge = <span className="match-card__chip match-card__chip--live"><span className="match-card__pulse" aria-hidden="true" />LIVE</span>
  } else if (card.state === 'completed') {
    badge = <span className="match-card__chip match-card__chip--fulltime">FT</span>
  } else {
    badge = <span className="match-card__chip match-card__chip--kickoff">{kickoff}</span>
  }

  const centre = (
    <span className="match-card__centre">
      {card.scoreLabel ? <span className="match-card__centre-score">{card.scoreLabel}</span> : <span className="match-card__centre-versus">v</span>}
    </span>
  )

  const ariaState = card.state === 'live' ? ', live' : card.state === 'completed' ? ', full time' : ''

  return (
    <MatchCard
      as="a"
      href={card.href}
      className="match-card--readonly match-card--tappable"
      aria-label={`Open Match Centre for ${card.home.label} v ${card.away.label}${ariaState}`}
      meta={<span>{meta}</span>}
      badge={badge}
      home={<TeamLabel team={card.home} label={card.home.label} unresolved={card.home.unresolved} compact profileDisabled />}
      away={<TeamLabel team={card.away} label={card.away.label} unresolved={card.away.unresolved} compact profileDisabled />}
      centre={centre}
      note={<span>{card.predictedScore ? <>You predicted {card.predictedScore}</> : 'No prediction saved'}</span>}
      action={<span className="match-card__hint">Match Centre <Icon name="chevron" size={15} /></span>}
    />
  )
}

function SectionHeading({ title, link }) {
  return (
    <div className={styles.sect}>
      <h2>{title}</h2>
      {link && <a href={link.href}>{link.label} →</a>}
    </div>
  )
}

function LeaguesTeaser({ dashboard }) {
  const names = dashboard.leagues.count > 0
    ? `${dashboard.leagues.count} league${dashboard.leagues.count === 1 ? '' : 's'} · ${dashboard.leagues.members} members`
    : 'Create or join a league'

  return (
    <Card className={`${styles.teaser} ${styles.tappable}`} as="a" href="#/leagues">
      <div>
        <h3>Your leagues</h3>
        <span>{names}</span>
      </div>
      <Icon name="chevron" size={18} />
    </Card>
  )
}

/**
 * Overall standing only. The contract's league cell shows a league rank and a
 * gap to the player above, and its post-match cells show rank movement — none
 * of which have a data source. leagueModel already refuses to fake rank
 * movement for want of trustworthy previous-rank data, and Home does the same.
 */
function RankStrip({ dashboard }) {
  if (!dashboard.signedIn || dashboard.sectionErrors.results) return null

  return (
    <div className={styles.rankStrip}>
      <a className={styles.rankCell} href="#/leaderboards?competition=original" aria-label={`Overall: ${formatRank(dashboard.original.rank)}, ${dashboard.original.points ?? 0} points${leaderGap(dashboard.original)}. Open full leaderboard.`}>
        <span className={styles.rankEyebrow}>Overall</span>
        <strong>{formatRank(dashboard.original.rank)}</strong>
        <small>{dashboard.original.points ?? 0} pts{leaderGap(dashboard.original)}</small>
      </a>
      <a className={styles.rankCell} href="#/leaderboards?competition=koPredictor" aria-label={`KO Predictor: ${formatRank(dashboard.koPredictor.rank)}, ${dashboard.koPredictor.points ?? 0} points${leaderGap(dashboard.koPredictor)}. Open full leaderboard.`}>
        <span className={styles.rankEyebrow}>KO Predictor</span>
        <strong>{formatRank(dashboard.koPredictor.rank)}</strong>
        <small>{dashboard.koPredictor.points ?? 0} pts{leaderGap(dashboard.koPredictor)}</small>
      </a>
    </div>
  )
}

/**
 * Leaderboard access from every state. RankStrip is signed-in-only and absent
 * pre-tournament, so without this Home offered no route to the leaderboards in
 * the state every user currently sees. Muted, so it does not compete with the
 * state's primary card.
 */
function LeaderboardsLink() {
  return (
    <div className={styles.secondaryActions}>
      <LinkButton href="#/leaderboards?competition=original" variant="secondary" size="small" icon="results">Leaderboards</LinkButton>
    </div>
  )
}

function PreTournament({ dashboard }) {
  const { original, home } = dashboard
  const done = original.totalComplete
  const total = original.total
  const remaining = Math.max(0, total - done)

  return (
    <>
      <CountdownHero lockAt={home.lockAt} countdown={home.countdown} openingMatch={home.openingMatch} provisional={dashboard.lifecycle.provisional} />

      <Card className={styles.card} as="section">
        <div className={styles.cardRow}>
          <h3>Your predictions</h3>
          <span className={styles.muted}>{done} / {total} matches</span>
        </div>
        <ProgressBar value={done} max={total} label={`Your predictions: ${done} of ${total} complete`} />
        <div className={styles.statLine}>
          <span>{original.bracketComplete === original.bracketTotal ? 'Bracket complete' : `${original.bracketComplete}/${original.bracketTotal} bracket picks`}</span>
          <span>{remaining === 0 ? 'All done' : `${remaining} to go`}</span>
        </div>
        {home.predictionCta
          ? (
            <LinkButton href={home.predictionCta.href} className={styles.cta}>
              {done > 0 ? 'Finish your predictions' : 'Start your predictions'}
            </LinkButton>
          )
          : (
            <p className={styles.ctaDone}>
              All predictions in. You can still change them until the lock.
            </p>
          )}
        <div className={styles.scoringLink}>
          <a href="#/how-to-play">How scoring works</a>
        </div>
      </Card>

      {home.openingMatch && (
        <>
          <SectionHeading title="Opening match" />
          <HomeMatchCard card={home.openingMatch} />
        </>
      )}

      <LeaguesTeaser dashboard={dashboard} />
      <LeaderboardsLink />
    </>
  )
}

function MatchdayLive({ dashboard }) {
  const { home } = dashboard
  const hasFootball = home.liveMatches.length > 0 || home.upcomingMatches.length > 0

  return (
    <>
      <SectionHeading title="Today at the Euros" link={{ href: '#/results', label: 'All results' }} />
      {hasFootball
        ? (
          <>
            {home.liveMatches.map(card => <HomeMatchCard card={card} key={card.matchNumber} />)}
            {home.upcomingMatches.map(card => <HomeMatchCard card={card} key={card.matchNumber} />)}
          </>
        )
        : <Card className={styles.card} as="section"><p className={styles.muted}>No matches scheduled today.</p></Card>}

      <RankStrip dashboard={dashboard} />
      <LeaguesTeaser dashboard={dashboard} />
      <LeaderboardsLink />
    </>
  )
}

function PostMatch({ dashboard }) {
  const { home } = dashboard
  const played = home.completedMatches.length

  return (
    <>
      <SectionHeading title="Today’s results" link={{ href: '#/results', label: 'All results' }} />
      {home.completedMatches.map(card => <HomeMatchCard card={card} key={card.matchNumber} />)}

      {dashboard.signedIn && !dashboard.sectionErrors.results && (
        <Card className={styles.card} as="section">
          <div className={styles.cardRow}>
            <h3>Your day</h3>
            <span className={styles.muted}>{dashboard.original.points ?? 0} pts total</span>
          </div>
          <div className={styles.statLine}>
            <span>{played} match{played === 1 ? '' : 'es'} played today</span>
            <span>Overall {formatRank(dashboard.original.rank)}</span>
          </div>
        </Card>
      )}

      <RankStrip dashboard={dashboard} />

      {home.tomorrow && (
        <Card className={`${styles.teaser} ${styles.tappable}`} as="a" href="#/results">
          <div>
            <h3>{formatDayLabel(home.tomorrow.dayKey)}</h3>
            <span>
              {home.tomorrow.matchCount} match{home.tomorrow.matchCount === 1 ? '' : 'es'}
              {home.tomorrow.firstKickoffAt ? ` · first kick-off ${formatKickoffTime(home.tomorrow.firstKickoffAt)}` : ''}
            </span>
          </div>
          <Icon name="chevron" size={18} />
        </Card>
      )}

      <LeaguesTeaser dashboard={dashboard} />
      <LeaderboardsLink />
    </>
  )
}

function LoadingDashboard() {
  return (
    <div className="home-dashboard home-dashboard--loading" aria-busy="true" aria-live="polite">
      <div className="home-skeleton home-skeleton--hero" />
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

  if (state.status === 'loading' || (!fixture && sessionState.status === 'loading')) return <LoadingDashboard />
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

  return (
    <div className={`home-dashboard ${styles.home}`}>
      {dashboard.hasPartialFailure && (
        <StatusBar tone="warning" title="Some live data is temporarily unavailable">
          Your saved predictions remain safe. Unavailable cards are shown with a dash rather than a false zero.
        </StatusBar>
      )}

      {!dashboard.live.dataAvailable && dashboard.home.state !== HOME_STATE.PRE && (
        <StatusBar tone="warning" title="Live tournament data unavailable">
          No result has been shown as zero or final.
        </StatusBar>
      )}

      {dashboard.home.state === HOME_STATE.PRE && <PreTournament dashboard={dashboard} />}
      {dashboard.home.state === HOME_STATE.LIVE && <MatchdayLive dashboard={dashboard} />}
      {dashboard.home.state === HOME_STATE.POST && <PostMatch dashboard={dashboard} />}
    </div>
  )
}
