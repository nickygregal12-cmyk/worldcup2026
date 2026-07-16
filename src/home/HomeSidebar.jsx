import { Icon } from '../design-system/index.jsx'
import { formatPoints, formatRank, leaderGap } from './homeFormat.js'
import page from './HomeDashboard.module.css'
import styles from './HomeSidebar.module.css'

const COMPETITIONS = Object.freeze([
  { key: 'original', name: 'Original Predictor', href: '#/leaderboards?competition=original' },
  { key: 'koPredictor', name: 'KO Predictor', href: '#/leaderboards?competition=koPredictor' },
])

/**
 * CW1 — the Leaderboards entry point, present in EVERY state.
 *
 * Leaderboards is a More-nav destination: the bottom nav never exposes it, so
 * Home is its only primary entry point. Original and KO standings never
 * combine, so the two routes are always two rows and never merge into one tap.
 */
export function LeaderboardsCard({ dashboard }) {
  // Two competitions, two tables, two totals — said as copy for a player. The
  // prototype's own note line ("Original and KO standings and totals never
  // combine") is the spec sentence word for word, which is spec wording on a
  // player surface.
  const note = dashboard.signedIn
    ? 'Your Original and KO Predictor scores are ranked separately. They never add up into one total.'
    : 'Tables are open to everyone. Sign in to see where you sit.'

  return (
    <section className={page.card} aria-labelledby="home-leaderboards">
      <div className={page.cardRow}>
        <h2 id="home-leaderboards">Leaderboards</h2>
      </div>

      {COMPETITIONS.map(competition => (
        <a className={styles.lbRow} href={competition.href} key={competition.key}>
          <span className={styles.lbName}>{competition.name}</span>
          {dashboard.signedIn
            ? <span className={styles.lbRank}>{formatRank(dashboard[competition.key].rank)}</span>
            : <Icon name="chevron" size={16} />}
        </a>
      ))}

      <p className={styles.lbNote}>{note}</p>
    </section>
  )
}

/**
 * Competition ranks, each cell a Leaderboards deep link.
 *
 * Rank movement ("up 3 today") has no data source — no previous-rank column
 * exists — so it is not shown. The gap to the leader does have one, and it is
 * the storytelling the contract asks for.
 */
export function RankStrip({ dashboard }) {
  if (!dashboard.signedIn || dashboard.sectionErrors.results) return null

  const cells = [
    {
      key: 'original',
      label: 'Original',
      href: '#/leaderboards?competition=original',
      rank: formatRank(dashboard.original.rank),
      detail: `${formatPoints(dashboard.original.points, dashboard.original.dataAvailable)} pts${leaderGap(dashboard.original)}`,
    },
    {
      key: 'koPredictor',
      label: 'KO Predictor',
      href: '#/leaderboards?competition=koPredictor',
      rank: dashboard.koReadiness.open ? formatRank(dashboard.koPredictor.rank) : '—',
      detail: dashboard.koReadiness.open
        ? `${formatPoints(dashboard.koPredictor.points, dashboard.koPredictor.dataAvailable)} pts${leaderGap(dashboard.koPredictor)}`
        : dashboard.koReadiness.label,
    },
  ]

  return (
    <div className={styles.ranks}>
      {cells.map(cell => (
        <a
          className={styles.rankCell}
          href={cell.href}
          key={cell.key}
          aria-label={`${cell.label}: ${cell.rank}, ${cell.detail}. Open full leaderboard.`}
        >
          <span className={styles.rankEyebrow}>{cell.label}</span>
          <strong>{cell.rank}</strong>
          <small>{cell.detail}</small>
        </a>
      ))}
    </div>
  )
}

/**
 * Pre-tournament headline figures. A failed section shows a dash, never a zero.
 *
 * Each figure is gated on the section that actually feeds it, which is not
 * always the one named after it. Points and rank come from `results` (via
 * leaderboardStory/pointsValue), NOT from `original` — `original.dataAvailable`
 * tracks the prediction bundle, so gating points on it would print a confident
 * "0" for a user whose leaderboard fetch failed. Leagues has no dataAvailable
 * flag of its own, so it reads the section error directly.
 */
export function StatTiles({ dashboard }) {
  if (!dashboard.signedIn) return null

  const scoresLoaded = !dashboard.sectionErrors.results
  const leaguesLoaded = !dashboard.sectionErrors.leagues

  const tiles = [
    { key: 'rank', label: 'Rank', value: scoresLoaded ? formatRank(dashboard.original.rank) : '—' },
    { key: 'points', label: 'Points', value: formatPoints(dashboard.original.points, scoresLoaded) },
    { key: 'leagues', label: 'Leagues', value: leaguesLoaded ? `${dashboard.leagues.count}` : '—', accent: true },
  ]

  return (
    <div className={styles.stats}>
      {tiles.map(tile => (
        <div className={styles.stat} key={tile.key}>
          <strong className={tile.accent ? styles.statAccent : undefined}>{tile.value}</strong>
          <span>{tile.label}</span>
        </div>
      ))}
    </div>
  )
}

export function LeaguesTeaser({ dashboard, preTournament = false }) {
  // "Create or join a league" asserts an absence. If the leagues fetch failed we
  // do not know there are none, and telling a member of three leagues that they
  // have none is worse than saying nothing.
  const { count, members } = dashboard.leagues
  let detail
  if (dashboard.sectionErrors.leagues) detail = 'Your leagues could not be loaded just now.'
  else if (count > 0 && preTournament) detail = `${count} league${count === 1 ? '' : 's'} ready · invite people before kick-off`
  else if (count > 0) detail = `${count} league${count === 1 ? '' : 's'} · ${members} members`
  else detail = 'Create or join a league'

  return (
    <a className={styles.panel} href="#/leagues">
      <h3>Your leagues</h3>
      <p>{detail}</p>
      <span className={styles.panelGo}>{preTournament && count > 0 ? 'Share or manage leagues ›' : 'Open leagues ›'}</span>
    </a>
  )
}

/** Quiet from the start: useful context, never a rival to the Original entry. */
export function KoTeaser({ dashboard }) {
  const ready = dashboard.koReadiness.open
  const available = dashboard.koReadiness.available

  return (
    <a className={styles.koTeaser} href={ready ? '#/ko-predictor' : '#/how-to-play'}>
      <span className={styles.koIcon}><Icon name="trophy" size={18} /></span>
      <span className={styles.koCopy}>
        <strong>KO Predictor</strong>
        <small>
          {ready
            ? `${available} confirmed fixture${available === 1 ? '' : 's'} ready to predict`
            : 'A separate bonus game. Fixtures unlock as the knockout teams are confirmed.'}
        </small>
      </span>
      <Icon name="chevron" size={18} />
    </a>
  )
}

export function RulesCard() {
  return (
    <a className={styles.quiet} href="#/how-to-play">
      <h3>Rules, scoring &amp; trust</h3>
      <p>
        Group scores lock at the first kick-off. A joker doubles that match’s score points —
        group and KO Predictor only, never the Original Bracket.
      </p>
    </a>
  )
}

/** The signed-out visitor's route into the format and the full rules. */
export function TournamentCard({ dashboard }) {
  return (
    <a className={styles.quiet} href="#/tournament">
      <h3>Tournament &amp; how to play</h3>
      <p>
        {dashboard.tournament.totalTeams} teams · {dashboard.tournament.totalMatches} matches.
        Read the format and the complete rules.
      </p>
    </a>
  )
}
