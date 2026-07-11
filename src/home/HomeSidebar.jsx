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

/** Pre-tournament headline figures. A failed section shows a dash, never a zero. */
export function StatTiles({ dashboard }) {
  if (!dashboard.signedIn) return null

  const tiles = [
    { key: 'rank', label: 'Rank', value: formatRank(dashboard.original.rank) },
    { key: 'points', label: 'Points', value: formatPoints(dashboard.original.points, dashboard.original.dataAvailable) },
    { key: 'leagues', label: 'Leagues', value: `${dashboard.leagues.count}`, accent: true },
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

export function LeaguesTeaser({ dashboard }) {
  const detail = dashboard.leagues.count > 0
    ? `${dashboard.leagues.count} league${dashboard.leagues.count === 1 ? '' : 's'} · ${dashboard.leagues.members} members`
    : 'Create or join a league'

  return (
    <a className={styles.panel} href="#/leagues">
      <h3>Your leagues</h3>
      <p>{detail}</p>
      <span className={styles.panelGo}>Open leagues ›</span>
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
