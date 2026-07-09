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

function RulesHeroStats({ items }) {
  return (
    <div className={styles.rulesHeroStats}>
      {items.map(item => (
        <div key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <small>{item.note}</small>
        </div>
      ))}
    </div>
  )
}

function TrustCards({ cards }) {
  return (
    <section className={styles.trustGrid} aria-label="Rules and trust summary">
      {cards.map(card => (
        <Card key={card.title} as="article" className={styles.trustCard}>
          <span className="page-eyebrow">{card.label}</span>
          <h2>{card.title}</h2>
          <p>{card.detail}</p>
        </Card>
      ))}
    </section>
  )
}

function SignupGatePanel({ gate }) {
  return (
    <Card as="section" className={styles.signupGatePanel}>
      <div className="home-section-heading">
        <div>
          <span className="page-eyebrow">{gate.eyebrow}</span>
          <h2>{gate.title}</h2>
        </div>
        <Badge tone="warning">{gate.badge}</Badge>
      </div>
      <p>{gate.detail}</p>
      <div className={styles.signupGateGrid}>
        {gate.items.map(item => (
          <div key={item.label} className={styles.signupGateItem}>
            <span>{item.status}</span>
            <strong>{item.label}</strong>
            <small>{item.detail}</small>
          </div>
        ))}
      </div>
    </Card>
  )
}

function PolicyCard({ policy }) {
  return (
    <Card as="article" className={styles.policyCard}>
      <div className="home-section-heading">
        <div>
          <span className="page-eyebrow">Player trust</span>
          <h2>{policy.title}</h2>
        </div>
        <Badge tone={policy.badge === 'Official results' ? 'safe' : policy.badge === 'Support' ? 'warning' : 'info'}>{policy.badge}</Badge>
      </div>
      <p>{policy.detail}</p>
      <ul className="content-list">
        {policy.bullets.map(item => <li key={item}>{item}</li>)}
      </ul>
    </Card>
  )
}

function TieBreakPanel({ tieBreaks }) {
  return (
    <Card as="section" className={styles.tieBreakPanel}>
      <div className="home-section-heading">
        <div>
          <span className="page-eyebrow">Final standings</span>
          <h2>{tieBreaks.title}</h2>
        </div>
        <Badge tone="warning">{tieBreaks.status}</Badge>
      </div>
      <p>{tieBreaks.detail}</p>
      <div className={styles.tieBreakSteps}>
        {tieBreaks.steps.map((step, index) => (
          <div key={step}>
            <span>{index + 1}</span>
            <strong>{step}</strong>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function HowToPlayOverview({ foundation }) {
  const model = buildHowToPlayPageModel(foundation, foundation.scoring ?? null)
  return (
    <div className={`content-stack tournament-overview how-to-play-overview ${styles.rulesHub}`}>
      <section className={styles.rulesHero}>
        <div className={styles.rulesHeroCopy}>
          <Badge tone="info">Rules hub</Badge>
          <h1>{model.heading}</h1>
          <p>{model.intro}</p>
          <div className={styles.rulesHeroActions}>
            <LinkButton href="#/groups" icon="predict">Start predicting</LinkButton>
            <LinkButton href="#/tournament" variant="secondary" icon="info">Tournament facts</LinkButton>
          </div>
        </div>
        <aside className={styles.rulesHeroPanel} aria-label="Rules snapshot">
          <Badge tone="warning">{model.status}</Badge>
          {model.scoringNotes.map(note => <p className={styles.sectionCopy} key={note}>{note}</p>)}
          <RulesHeroStats items={model.heroStats} />
        </aside>
      </section>

      <TrustCards cards={model.trustCards} />

      <SignupGatePanel gate={model.signupGateStatus} />

      <section className={styles.rulesCompetitionGrid}>
        {model.competitions.map(competition => (
          <Card key={competition.title} as="article" className={styles.rulesCompetitionCard}>
            <div className="home-section-heading">
              <div>
                <span className="page-eyebrow">{competition.eyebrow}</span>
                <h2>{competition.title}</h2>
              </div>
              <Badge tone={competition.title === 'Original Predictor' ? 'info' : 'safe'}>{competition.title === 'Original Predictor' ? 'Pre-tournament' : 'Knockouts'}</Badge>
            </div>
            <p className={styles.sectionCopy}>{competition.summary}</p>
            <ul className="content-list">
              {competition.bullets.map(item => <li key={item}>{item}</li>)}
            </ul>
            <PointsTable rows={competition.points} />
          </Card>
        ))}
      </section>

      <section className={styles.rulesTwoColumn}>
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

        <TieBreakPanel tieBreaks={model.tieBreaks} />
      </section>

      <section className={styles.policyGrid}>
        {model.policies.map(policy => <PolicyCard key={policy.title} policy={policy} />)}
      </section>

      <Card as="section">
        <div className="home-section-heading">
          <div><span className="page-eyebrow">Mechanics only</span><h2>Quick answers</h2></div>
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
