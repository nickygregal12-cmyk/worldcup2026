import React from 'react' // eslint-disable-line no-unused-vars -- React is required for JSX under the current lint config
import { Button, Card, Icon, TeamLabel } from '../design-system/index.jsx'
import { GROUP_GOALS_COPY, calculateGroupGoalsTotal } from './groupGoalsModel.js'
import styles from './PredictionReview.module.css'

const GROUP_MATCH_COUNT = 36
const BRACKET_PICK_COUNT = 15

/**
 * The final step of the Original Predictor: recap what was predicted, show the
 * calculated group-goals total, and confirm.
 *
 * Total tournament goals is the only one of the three extra tournament picks
 * shown here, because it is the only one that can be derived from what the user
 * has already entered. Top Scorer and Highest-Scoring Team are deliberately
 * absent: there is no player data source at all, and neither pick has anywhere
 * to persist. Building either would mean inventing a team/player list and a
 * scoring rule.
 */
export default function PredictionReview({ reference, draft, summary, context, reviewMode, locked, busy, onSubmit, onEdit }) {
  const groupsDone = summary.groupComplete >= GROUP_MATCH_COUNT
  const bracketDone = summary.bracketComplete >= BRACKET_PICK_COUNT
  const goals = calculateGroupGoalsTotal(draft, GROUP_MATCH_COUNT)

  const championId = summary.preview.resolution.knockout.championTeamId
  const champion = championId ? reference.teamsById?.[championId] : null
  const staleBracketPicks = summary.preview.diagnostics.length > 0

  const steps = [
    { key: 'groups', label: 'Groups', detail: `${summary.groupComplete}/${GROUP_MATCH_COUNT}`, state: groupsDone ? 'done' : 'current' },
    { key: 'bracket', label: 'Bracket', detail: `${summary.bracketComplete}/${BRACKET_PICK_COUNT}`, state: bracketDone ? 'done' : groupsDone ? 'current' : 'todo' },
    { key: 'review', label: 'Review', detail: summary.canSubmit ? 'Ready' : 'Not yet', state: groupsDone && bracketDone ? 'current' : 'todo' },
  ]

  return (
    <div className={styles.review}>
      <ol className={styles.stepper}>
        {steps.map(step => (
          <li key={step.key} className={styles.step} data-state={step.state}>
            <span className={styles.stepMark} aria-hidden="true">{step.state === 'done' ? <Icon name="check" size={14} /> : null}</span>
            <span className={styles.stepLabel}>{step.label}</span>
            <span className={styles.stepDetail}>{step.detail}</span>
          </li>
        ))}
      </ol>

      <div className={styles.recapGrid}>
        <Card as="a" href="#/groups" className={styles.tappable}>
          <div className={styles.recap}>
            <span className={styles.recapTitle}>Group scores</span>
            <strong className={styles.recapCount}>{summary.groupComplete}<span>/{GROUP_MATCH_COUNT}</span></strong>
            <span className={styles.recapNote}>{groupsDone ? 'All scored' : `${GROUP_MATCH_COUNT - summary.groupComplete} to score`}</span>
            <span className={styles.recapHint}>Open groups<Icon name="chevron" size={14} /></span>
          </div>
        </Card>
        <Card as="a" href="#/bracket" className={styles.tappable}>
          <div className={styles.recap}>
            <span className={styles.recapTitle}>Bracket picks</span>
            <strong className={styles.recapCount}>{summary.bracketComplete}<span>/{BRACKET_PICK_COUNT}</span></strong>
            <span className={styles.recapNote}>{bracketDone ? 'All picked' : `${BRACKET_PICK_COUNT - summary.bracketComplete} to pick`}</span>
            <span className={styles.recapHint}>Open bracket<Icon name="chevron" size={14} /></span>
          </div>
        </Card>
      </div>

      <div className={styles.factGrid}>
        <Card>
          <div className={styles.fact}>
            <span>Predicted champion</span>
            {champion ? <TeamLabel team={champion} compact /> : <strong>Not resolved</strong>}
          </div>
        </Card>
        <Card>
          <div className={styles.fact}>
            <span>Saved to</span>
            <strong>{context === 'account' ? 'Euro account' : 'This device'}</strong>
          </div>
        </Card>
      </div>

      {/*
        Read-only by contract: the total is derived from the 36 group scores and
        is never entered. No points are shown, because which scoring rule governs
        this pick is still unresolved — see groupGoalsModel.js.
      */}
      <Card>
        <div className={styles.goals}>
          <div className={styles.goalsRow}>
            <h3>{GROUP_GOALS_COPY.label}</h3>
            <strong className={styles.goalsValue}>{goals.total}</strong>
          </div>
          <p className={styles.goalsNote}>{GROUP_GOALS_COPY.note}</p>
          {!goals.complete && (
            <p className={styles.goalsPending}>{`${goals.entered}/${goals.expected} matches scored so far`}</p>
          )}
        </div>
      </Card>

      <section className={styles.action}>
        {reviewMode ? (
          <>
            <Button onClick={onEdit} loading={busy} disabled={locked} variant="secondary" icon="unlock">Edit my predictions</Button>
            <p className={styles.blockedReason}>
              {locked
                ? 'The tournament lock is active. Your saved predictions are read-only.'
                : 'Your predictions stay editable until the global tournament lock.'}
            </p>
          </>
        ) : (
          <>
            <h3>Ready to lock in?</h3>
            <Button onClick={onSubmit} loading={busy} disabled={!summary.canSubmit || locked} icon="check">Confirm my predictions</Button>
            <p className={styles.blockedReason}>{confirmBlockedReason({ locked, staleBracketPicks, summary })}</p>
          </>
        )}
      </section>
    </div>
  )
}

/**
 * Say what is actually blocking confirmation. A disabled button with no reason
 * leaves the user hunting for the one match they missed.
 */
function confirmBlockedReason({ locked, staleBracketPicks, summary }) {
  if (locked) return 'The tournament lock is active. Your saved predictions are read-only.'
  if (staleBracketPicks) return 'Some bracket selections became stale. Open the bracket and update those matches.'
  if (!summary.canSubmit) return `${summary.remaining} predictions still need attention before you can lock in.`
  return 'Confirming changes only your own view. You can edit again until the global tournament lock.'
}
