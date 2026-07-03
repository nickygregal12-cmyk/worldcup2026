import React from 'react' // eslint-disable-line no-unused-vars -- React is required for JSX under the current lint config
import styles from './AdminOperationsCompletion.module.css'

const PICKS = Object.freeze([
  ['Total tournament goals', 'Nearest prediction receives 20 points; tied nearest predictions receive full points.'],
  ['Top scorer', 'Official joint winners receive full points.'],
  ['Highest-scoring team', 'Official joint winners receive full points.'],
])

export default function AdminTournamentPicks({ readiness }) {
  return (
    <article className={`foundation-results-card foundation-results-card--wide ${styles.tournamentPicks}`}>
      <div className="foundation-results-card__heading">
        <div><span className="foundation-kicker">Original Predictor only</span><h3>Tournament Picks readiness</h3></div>
        <span className={styles.readinessBadge} data-state={readiness.contractReady ? 'ready' : 'blocked'}>
          {readiness.contractReady ? 'Contract ready' : 'Contract unavailable'}
        </span>
      </div>
      <p>This is the single Admin home for the approved Tournament Picks contract. It has no outcome-entry controls until Stage 17A supplies persistence, official player references and scoring.</p>
      <div className={styles.pickGrid}>
        {PICKS.map(([label, detail]) => (
          <div key={label}><strong>{label}</strong><span>20 points</span><small>{detail}</small></div>
        ))}
      </div>
      <dl className={styles.pickBoundaries}>
        <div><dt>Lock</dt><dd>One global Original Predictor lock</dd></div>
        <div><dt>Jokers</dt><dd>None</dd></div>
        <div><dt>KO Predictor</dt><dd>No points or combined total</dd></div>
        <div><dt>Activation</dt><dd>{readiness.outcomeActivationReady ? 'Available' : 'Waiting for Stage 17A'}</dd></div>
      </dl>
    </article>
  )
}
