import { Badge, Card, LinkButton } from '../design-system/index.jsx'
import { buildHowToPlayPageModel, buildTournamentPageModel } from './tournamentPageModel.js'
import styles from './TournamentOverview.module.css'

function SummaryGrid({ items }) {
  return (
    <div className="tournament-summary-grid">
      {items.map(item => (
        <Card key={item.label} as="article">
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <small>{item.note}</small>
        </Card>
      ))}
    </div>
  )
}

function TournamentVenueList({ venues }) {
  return (
    <div className={styles.venueGrid}>
      {venues.map(venue => (
        <article key={`${venue.city}-${venue.name}`} className={styles.venueCard}>
          <div>
            <strong>{venue.name}</strong>
            <span>{venue.city} · {venue.hostNation}</span>
          </div>
          {venue.tags.length > 0 && (
            <div className={styles.venueTags}>
              {venue.tags.map(tag => <Badge key={tag} tone="info">{tag}</Badge>)}
            </div>
          )}
        </article>
      ))}
    </div>
  )
}

function FormatLadder({ steps }) {
  return (
    <div className={styles.formatLadder}>
      {steps.map((step, index) => (
        <div key={step.label} className={styles.formatRung}>
          <span className={styles.formatNumber}>{index + 1}</span>
          <div>
            <strong>{step.label}</strong>
            <span>{step.detail}</span>
          </div>
          <b>{step.count}</b>
        </div>
      ))}
    </div>
  )
}

function ProvisionalGroups({ groups }) {
  return (
    <div className={styles.groupsGrid}>
      {groups.map(group => (
        <Card key={group.code} as="article" className={styles.groupCard}>
          <div className="home-section-heading">
            <div>
              <span className="page-eyebrow">Group {group.code}</span>
              <h2>Four qualifying slots</h2>
            </div>
            <Badge tone="warning">{group.status}</Badge>
          </div>
          <div className={styles.slotGrid}>
            {group.slots.map(slot => (
              <span key={slot.code} className={styles.slotPill}><strong>{slot.code}</strong>{slot.label}</span>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}

export default function TournamentOverview({ foundation }) {
  const model = buildTournamentPageModel(foundation)
  return (
    <div className="content-stack tournament-overview">
      <section className="page-intro">
        <div>
          <Badge tone="info">Tournament</Badge>
          <h1>{model.heading}</h1>
          <p>Hosts, venues, dates, format and group slots for Euro 2028.</p>
        </div>
        <LinkButton href="#/how-to-play" variant="secondary" icon="info">How to play</LinkButton>
      </section>

      <SummaryGrid items={model.summary} />

      <section className={`tournament-content-grid ${styles.wideLeft}`}>
        <Card as="section">
          <div className="home-section-heading">
            <div><span className="page-eyebrow">Confirmed venues</span><h2>Nine stadiums across eight cities</h2></div>
            <Badge tone="safe">Confirmed</Badge>
          </div>
          <TournamentVenueList venues={model.venues} />
        </Card>

        <Card as="section">
          <div className="home-section-heading">
            <div><span className="page-eyebrow">Key dates</span><h2>Opening match and final week</h2></div>
            <Badge tone="safe">Confirmed</Badge>
          </div>
          <div className={styles.dateList}>
            {model.keyDates.map(item => (
              <div key={`${item.label}-${item.date}`}>
                <span>{item.label}</span>
                <strong>{item.date}</strong>
                <small>{item.detail}</small>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <Card as="section">
        <div className="home-section-heading">
          <div><span className="page-eyebrow">Format</span><h2>How the tournament narrows</h2></div>
          <Badge tone="info">No third-place play-off</Badge>
        </div>
        <FormatLadder steps={model.format} />
      </Card>

      <section className="content-stack">
        <div className="home-section-heading">
          <div><span className="page-eyebrow">Groups</span><h2>Provisional group slots</h2></div>
          <Badge tone="warning">Qualifying under way</Badge>
        </div>
        <p className={styles.sectionCopy}>Slots fill automatically when the final draw and qualified teams are confirmed. Prediction surfaces keep using stable slot codes until then.</p>
        <ProvisionalGroups groups={model.groups} />
      </section>

      <Card as="section">
        <div className="home-section-heading">
          <div><span className="page-eyebrow">Certainty</span><h2>What is confirmed now</h2></div>
          <Badge tone="info">Tournament source</Badge>
        </div>
        <p className={styles.sectionCopy}><strong>{model.certainty.confirmed}.</strong> {model.certainty.provisional}</p>
      </Card>
    </div>
  )
}

function PointsTable({ rows }) {
  return (
    <table className={styles.pointsTable}>
      <tbody>
        {rows.map(row => (
          <tr key={row.label}>
            <th scope="row">{row.label}</th>
            <td>{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function HowToPlayOverview({ foundation }) {
  const model = buildHowToPlayPageModel(foundation)
  return (
    <div className="content-stack tournament-overview how-to-play-overview">
      <section className="page-intro">
        <div>
          <Badge tone="info">How to play</Badge>
          <h1>{model.heading}</h1>
          <p>Fast lookup for the two competitions, scoring values, lock timing and mechanics questions.</p>
        </div>
        <LinkButton href="#/tournament" variant="secondary" icon="info">Tournament facts</LinkButton>
      </section>

      <section className="tournament-content-grid">
        {model.competitions.map(competition => (
          <Card key={competition.title} as="article">
            <span className="page-eyebrow">Competition</span>
            <h2>{competition.title}</h2>
            <p className={styles.sectionCopy}>{competition.summary}</p>
            <ul className="content-list">
              {competition.bullets.map(item => <li key={item}>{item}</li>)}
            </ul>
            <PointsTable rows={competition.points} />
          </Card>
        ))}
      </section>

      <Card as="section">
        <div className="home-section-heading">
          <div><span className="page-eyebrow">Locks</span><h2>When choices close</h2></div>
          <Badge tone="warning">Tournament timing</Badge>
        </div>
        <div className={styles.lockList}>
          {model.locks.map(lock => (
            <div key={lock.title}>
              <span className={styles.lockDot} aria-hidden="true" />
              <div><strong>{lock.title}</strong><small>{lock.detail}</small></div>
            </div>
          ))}
        </div>
      </Card>

      <Card as="section">
        <div className="home-section-heading">
          <div><span className="page-eyebrow">FAQ</span><h2>Mechanics only</h2></div>
          <Badge tone="info">{model.scoringStatus}</Badge>
        </div>
        <div className={styles.faqList}>
          {model.faqs.map(item => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </Card>
    </div>
  )
}
