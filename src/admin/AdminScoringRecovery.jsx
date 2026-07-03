import React, { useState } from 'react' // eslint-disable-line no-unused-vars
import styles from './AdminOperationsCompletion.module.css'
import { validateAdminNote } from './adminOperationsModel.js'
import { reconcileAdminTournamentPoints } from './adminOperationsService.js'
import { ScoringRuns } from './AdminControlRoomStatus.jsx'

export default function AdminScoringRecovery({
  client,
  tournamentId,
  adminRole,
  features,
  runs,
  actionStatus,
  runAction,
}) {
  const [note, setNote] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const isOwner = adminRole === 'owner'
  const scoringEnabled = features.find(feature => feature.featureKey === 'scoring_recalculation')?.isEnabled ?? true
  const noteValidation = validateAdminNote(note)
  const working = actionStatus === 'working'

  return (
    <div className={styles.recoveryGrid}>
      <article className="foundation-results-card foundation-results-card--wide">
        <span className="foundation-kicker">Whole-tournament recovery</span>
        <h3>Reconcile all tournament points</h3>
        <p>Runs the canonical replacement scorer across every confirmed result. Existing point rows are replaced, not added, and Original Predictor and KO Predictor totals remain separate.</p>
        {!isOwner && <p className={styles.permissionNote}>Only the tournament owner can run a complete points reconciliation.</p>}
        {isOwner && (
          <>
            {!scoringEnabled && <p className={styles.blockedNote}>Scoring recalculation is disabled by the current feature control.</p>}
            <label className="foundation-admin-note"><span>Audit note</span><textarea value={note} maxLength="500" onChange={event => setNote(event.target.value)} placeholder="Explain why a complete replacement reconciliation is required." /></label>
            <label className={styles.confirmationCheck}>
              <input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />
              <span>I understand this creates a new scoring run and replaces canonical point rows.</span>
            </label>
            <button type="button" className="ui-button ui-button--danger" disabled={!scoringEnabled || !confirmed || !noteValidation.valid || working} onClick={() => runAction(
              () => reconcileAdminTournamentPoints(client, tournamentId, noteValidation.note),
              'Complete tournament points reconciliation finished.',
            )}>Reconcile all points</button>
          </>
        )}
      </article>

      <article className="foundation-results-card foundation-results-card--wide">
        <span className="foundation-kicker">Canonical scoring history</span>
        <h3>Latest replacement runs</h3>
        <ScoringRuns runs={runs} />
      </article>
    </div>
  )
}
