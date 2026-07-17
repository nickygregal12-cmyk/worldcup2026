import { useEffect, useMemo, useState } from 'react'
import { Badge, Card, LinkButton, ProgressBar, SkeletonBlock, StatusBar, TeamLabel } from '../design-system/index.jsx'
import { buildLiveTournamentSnapshot } from '../results/resultModel.js'
import { loadCanonicalTournamentSnapshot } from '../results/resultService.js'
import QualificationTables from './QualificationTables.jsx'
import styles from './TournamentExperience.module.css'

function formatFixtureDate(value) {
  if (!value) return 'Date to be confirmed'
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'Europe/London' })
    .format(new Date(String(value).includes('T') ? value : `${value}T12:00:00Z`))
}

function formatKickoff(value) {
  if (!value) return 'Kick-off to be confirmed'
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }).format(new Date(value))
}

function FixtureStateBadge({ state }) {
  if (state === 'live') return <Badge tone="danger">Live</Badge>
  if (state === 'completed') return <Badge tone="safe">Final</Badge>
  if (state === 'manual_review' || state === 'awaiting_confirmation') return <Badge tone="warning">Under review</Badge>
  return <Badge tone="info">Next match</Badge>
}

function PriorityFixture({ fixture }) {
  if (!fixture) return null
  return (
    <Card as="article" className={styles.fixtureCard}>
      <header className={styles.fixtureHeader}>
        <div><span>{fixture.stageLabel}</span><strong>Match {fixture.matchNumber}</strong></div>
        <FixtureStateBadge state={fixture.state} />
      </header>
      <div className={styles.fixtureTeams}>
        <TeamLabel team={fixture.homeTeam} label={fixture.homeLabel} unresolved={!fixture.homeTeamId} stacked />
        <div className={styles.fixtureScore}>
          <strong>{fixture.score ?? 'vs'}</strong>
          {fixture.detail && <small>{fixture.detail}</small>}
        </div>
        <TeamLabel team={fixture.awayTeam} label={fixture.awayLabel} unresolved={!fixture.awayTeamId} stacked />
      </div>
      <footer className={styles.fixtureFooter}>
        <span>{formatFixtureDate(fixture.scheduledDate)} · {formatKickoff(fixture.kickoffAt)}</span>
        {fixture.venueName && <span>{fixture.venueName}{fixture.city ? `, ${fixture.city}` : ''}</span>}
        <LinkButton href={`#/match-centre?match=${fixture.matchNumber}&competition=${fixture.matchNumber > 36 ? 'ko_predictor' : 'original'}`} size="small" variant="secondary">Match Centre</LinkButton>
      </footer>
    </Card>
  )
}

function GroupDirectory({ groups }) {
  return (
    <div className={styles.groupGrid}>
      {groups.map(group => (
        <article key={group.code} className={styles.groupCard}>
          <header><strong>Group {group.code}</strong><span>{group.status}</span></header>
          <div className={styles.teamList}>
            {group.teams.map(team => <TeamLabel key={team.teamId ?? team.slotCode} team={team} compact />)}
          </div>
        </article>
      ))}
    </div>
  )
}

function TournamentFacts({ model }) {
  return (
    <section className={styles.factsGrid} aria-label="Tournament facts">
      <Card as="article" className={styles.factCard}>
        <span className="page-eyebrow">Tournament format</span>
        <h2>How the field narrows</h2>
        <div className={styles.formatList}>
          {model.format.map((item, index) => (
            <div key={item.label}><b>{index + 1}</b><span><strong>{item.label}</strong><small>{item.detail}</small></span><em>{item.count}</em></div>
          ))}
        </div>
      </Card>
      <Card as="article" className={styles.factCard}>
        <span className="page-eyebrow">Key dates</span>
        <h2>Opening night to the final</h2>
        <div className={styles.dateList}>
          {model.keyDates.map(item => <div key={item.label}><span>{item.label}</span><strong>{item.date}</strong><small>{item.detail}</small></div>)}
        </div>
      </Card>
      <Card as="article" className={`${styles.factCard} ${styles.venues}`}>
        <div className={styles.sectionHeading}>
          <div><span className="page-eyebrow">Hosts and venues</span><h2>Nine stadiums across eight cities</h2></div>
          <Badge tone="safe">Confirmed</Badge>
        </div>
        <div className={styles.venueGrid}>
          {model.venues.map(venue => (
            <div key={venue.name}><span><strong>{venue.name}</strong><small>{venue.city} · {venue.hostNation}</small></span>{venue.tags[0] && <Badge tone="info">{venue.tags[0]}</Badge>}</div>
          ))}
        </div>
      </Card>
    </section>
  )
}

export default function TournamentExperience({ foundation, client, lifecycle, buildModel, rulesAction }) {
  const reference = foundation.guestReference
  const emptySnapshot = useMemo(() => buildLiveTournamentSnapshot({ reference, resultRows: [] }), [reference])
  const [liveState, setLiveState] = useState({ status: client ? 'loading' : 'ready', data: emptySnapshot, error: null })

  useEffect(() => {
    let current = true
    if (!client) return () => { current = false }
    loadCanonicalTournamentSnapshot(client, reference)
      .then(data => { if (current) setLiveState({ status: 'ready', data, error: null }) })
      .catch(error => { if (current) setLiveState({ status: 'error', data: emptySnapshot, error: error instanceof Error ? error.message : String(error) }) })
    return () => { current = false }
  }, [client, emptySnapshot, reference])

  const model = buildModel(foundation, undefined, { lifecycle, liveSnapshot: liveState.data })

  return (
    <div className={`content-stack ${styles.experience}`} data-contract="product-experience-final-batch-1">
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <Badge tone={model.phase.tone}>{model.phase.eyebrow}</Badge>
          <h1>{model.phase.title}</h1>
          <p>{model.phase.detail}</p>
          <ProgressBar value={model.phase.completed} max={model.phase.total} label="Tournament matches with a visible official score" />
        </div>
        <div className={styles.heroAside}>
          <span>{model.heading}</span>
          <strong>{model.summary[0].value}</strong>
          <small>{model.summary[1].value}</small>
        </div>
      </section>

      <nav className={styles.actionDock} aria-label="Tournament destinations">
        <LinkButton href="#/groups" icon="predict">Groups</LinkButton>
        <LinkButton href="#/results" variant="secondary" icon="results">Results</LinkButton>
        <LinkButton href="#/bracket" variant="secondary" icon="bracket">Bracket</LinkButton>
        {rulesAction}
      </nav>

      {liveState.status === 'loading' && <SkeletonBlock height="14rem" label="Loading current tournament position" />}
      {liveState.status !== 'loading' && <PriorityFixture fixture={model.priorityFixture} />}
      {liveState.status === 'error' && <StatusBar tone="warning" title="Live tournament update is unavailable">Confirmed tournament facts remain available. Try again later.</StatusBar>}

      <Card as="section" className={styles.groupsSection}>
        <div className={styles.sectionHeading}>
          <div><span className="page-eyebrow">Six groups</span><h2>Teams and qualification</h2></div>
          <Badge tone={model.phase.key === 'pre_tournament' ? 'warning' : 'info'}>{model.phase.key === 'pre_tournament' ? 'Draw developing' : 'Live positions'}</Badge>
        </div>
        <p className={styles.sectionCopy}>Open any team for its profile. The group and six-team third-place tables always update together.</p>
        <GroupDirectory groups={model.groups} />
        {model.qualification && (
          <div className={styles.qualificationBlock}>
            <QualificationTables groupTables={model.qualification.groups} bestThird={model.qualification.bestThird} reference={reference} contextLabel={model.phase.key === 'pre_tournament' ? 'Qualification format' : 'Live qualification'} qualificationActive={model.phase.key !== 'pre_tournament'} />
          </div>
        )}
      </Card>

      <TournamentFacts model={model} />

      <StatusBar tone="info" title="Confirmed tournament source">{model.certainty.confirmed}. {model.certainty.provisional}</StatusBar>
    </div>
  )
}
