import { Badge, Card, LinkButton } from '../design-system/index.jsx'
import { buildHowToPlayPageModel, buildTournamentPageModel } from './tournamentPageModel.js'
import styles from './TournamentOverview.module.css'
import TournamentExperience from './TournamentExperience.jsx'

export default function TournamentOverview({ foundation, client, lifecycle }) {
  const rulesAction = <LinkButton href="#/how-to-play" variant="secondary" icon="info">How to play</LinkButton>
  return (
    <TournamentExperience foundation={foundation} client={client} lifecycle={lifecycle} buildModel={buildTournamentPageModel} rulesAction={rulesAction} />
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
  const model = buildHowToPlayPageModel(foundation)
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
