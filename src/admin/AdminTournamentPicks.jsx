import React from 'react' // eslint-disable-line no-unused-vars -- React is required for JSX under the current lint config
import styles from './AdminOperationsCompletion.module.css'
import { GROUP_GOALS_TIERS, TOURNAMENT_PICK_POINTS, TOURNAMENT_PICK_KEYS } from '../contracts/tournamentPickContract.js'

// Point values render from the versioned contract, never hardcoded prose (CLAUDE.md §7).
const PICKS = Object.freeze([
  [
    'Total group-stage goals',
    `${GROUP_GOALS_TIERS.EXACT} / ${GROUP_GOALS_TIERS.WITHIN_5} / ${GROUP_GOALS_TIERS.WITHIN_10} points`,
    'Auto-calculated from your 36 group scores: exact / within 5 / within 10.',
  ],
  [
    'Top scorer',
    `${TOURNAMENT_PICK_POINTS[TOURNAMENT_PICK_KEYS.TOP_SCORER]} points`,
    'Official joint winners each receive full points.',
  ],
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
        {PICKS.map(([label, points, detail]) => (
          <div key={label}><strong>{label}</strong><span>{points}</span><small>{detail}</small></div>
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
