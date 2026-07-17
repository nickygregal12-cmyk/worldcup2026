import { Badge, Icon, StatusBar, TeamLabel } from '../design-system/index.jsx'
import QualificationTables from '../tournament/QualificationTables.jsx'
import { LiveBracket, ResultsFeed } from './ResultsPresentation.jsx'
import styles from './ResultsExperience.module.css'

function formatFixtureTime(row) {
  const value = row.kickoffAt ?? row.scheduledDate
  if (!value) return 'Time to be confirmed'
  const date = new Date(String(value).includes('T') ? value : `${value}T12:00:00Z`)
  const dateText = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/London' }).format(date)
  if (!row.kickoffAt) return dateText
  const timeText = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/London' }).format(date)
  return `${dateText} · ${timeText}`
}

function FixtureCard({ row, reference }) {
  const home = row.homeTeamId ? reference.teamsById?.[row.homeTeamId] : null
  const away = row.awayTeamId ? reference.teamsById?.[row.awayTeamId] : null
  const stateLabel = row.state === 'completed' ? 'Full time' : row.state === 'live' ? 'Live' : row.state === 'upcoming' ? 'Upcoming' : 'Review'
  const tone = row.state === 'live' ? 'danger' : row.state === 'completed' ? 'safe' : row.state === 'upcoming' ? 'info' : 'warning'
  return (
    <a className={`${styles.fixtureCard} ${styles[row.state] ?? ''}`} data-results-fixture-card="true" href={`#/match-centre?match=${row.matchNumber}`} aria-label={`Open Match ${row.matchNumber} Match Centre`}>
      <header>
        <span>{row.stageLabel} · Match {row.matchNumber}</span>
        <Badge tone={tone}>{stateLabel}</Badge>
      </header>
      <div className={styles.fixtureTeams}>
        <TeamLabel team={home} label={row.homeLabel} compact profileDisabled />
        <strong className={styles.score}>{row.score ?? 'v'}</strong>
        <TeamLabel team={away} label={row.awayLabel} compact alignEnd profileDisabled />
      </div>
      <footer>
        <span>{row.detail ?? formatFixtureTime(row)}</span>
        <span className={styles.open}>Match Centre <Icon name="chevron" size={15} /></span>
      </footer>
    </a>
  )
}

function FixtureSection({ eyebrow, title, rows, reference }) {
  if (!rows.length) return null
  return (
    <section className={styles.fixtureSection} data-results-fixture-section={eyebrow}>
      <div className={styles.sectionHeading}>
        <div><span>{eyebrow}</span><h3>{title}</h3></div>
        <strong>{rows.length}</strong>
      </div>
      <div className={styles.fixtureGrid}>{rows.map(row => <FixtureCard key={row.matchId} row={row} reference={reference} />)}</div>
    </section>
  )
}

export default function ResultsExperience({ model, feed, liveSnapshot, bracketRounds, reference }) {
  return (
    <div className={styles.experience} data-results-experience="phase-aware">
      <StatusBar tone={model.phase.tone} title={model.phase.title}>{model.phase.body}</StatusBar>

      <FixtureSection eyebrow={model.phase.eyebrow} title={model.spotlightTitle} rows={model.spotlightRows} reference={reference} />
      <FixtureSection eyebrow="Coming next" title="Next fixtures" rows={model.nextRows} reference={reference} />

      {model.showQualification && liveSnapshot && (
        <section className={styles.dataSection}>
          <div className={styles.sectionHeading}>
            <div><span>As it stands</span><h3>Group qualification</h3></div>
            <Badge tone="info">Live tables</Badge>
          </div>
          <QualificationTables groupTables={liveSnapshot.groups} bestThird={liveSnapshot.bestThird} reference={reference} contextLabel="Live qualification" qualificationActive />
        </section>
      )}

      {model.showBracket && bracketRounds.length > 0 && (
        <section className={styles.dataSection}>
          <div className={styles.sectionHeading}>
            <div><span>Knockout picture</span><h3>Live bracket</h3></div>
            <Badge tone="safe">Real tournament</Badge>
          </div>
          <p className={styles.sectionCopy}>This is the real tournament path, kept separate from your Original Bracket.</p>
          <LiveBracket rounds={bracketRounds} />
        </section>
      )}

      {!model.showQualification && (
        <p className={styles.quietNote}>Group tables and the third-place race will appear here from the first official score.</p>
      )}

      <details className={styles.archive}>
        <summary>
          <span><small>Full tournament</small><strong>All fixtures and results</strong></span>
          <span>{model.counts.completed} completed · {model.counts.upcoming} upcoming <Icon name="chevron" size={17} /></span>
        </summary>
        <div className={styles.archiveBody}><ResultsFeed feed={feed} /></div>
      </details>
    </div>
  )
}
