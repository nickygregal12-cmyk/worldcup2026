import React from 'react' // eslint-disable-line no-unused-vars -- React is required for JSX under the current lint config
import { Button, Card, PredictionStateBadge, TeamLabel } from '../design-system/index.jsx'
import { buildGroupProgress } from './groupsPresentationModel.js'

export default function PredictionReview({ reference, draft, summary, context, reviewMode, locked, busy, onSubmit, onEdit, onOpenGroups, onOpenBracket }) {
  const championId = summary.preview.resolution.knockout.championTeamId
  const champion = championId ? reference.teamsById?.[championId] : null
  const groups = buildGroupProgress(reference, draft)
  const overallState = locked ? 'locked' : reviewMode ? 'submitted' : summary.canSubmit ? 'complete' : 'empty'

  return (
    <div className="prediction-review">
      <Card className="prediction-review__hero">
        <div>
          <span className="page-eyebrow">Original Predictor review</span>
          <h2>{reviewMode ? 'Predictions submitted for review' : summary.canSubmit ? 'Ready to review' : 'Keep building your tournament'}</h2>
          <p>Submitting changes only your personal view. Saved predictions count whether submitted or not when the global lock arrives.</p>
        </div>
        <PredictionStateBadge state={overallState} />
      </Card>

      <div className="prediction-review__summary">
        <Card><span>Group scores</span><strong>{summary.groupComplete}/36</strong><Button variant="ghost" size="small" onClick={onOpenGroups}>Open groups</Button></Card>
        <Card><span>Bracket picks</span><strong>{summary.bracketComplete}/15</strong><Button variant="ghost" size="small" onClick={onOpenBracket}>Open bracket</Button></Card>
        <Card><span>Predicted champion</span>{champion ? <TeamLabel team={champion} compact /> : <strong>Not resolved</strong>}</Card>
        <Card><span>Saved to</span><strong>{context === 'account' ? 'Euro account' : 'This device'}</strong></Card>
      </div>

      <section className="prediction-review__groups" aria-labelledby="review-groups-title">
        <header><h3 id="review-groups-title">Group checklist</h3><span>{groups.filter(group => group.isComplete).length}/6 groups complete</span></header>
        <div>{groups.map(group => <button type="button" key={group.code} className={group.isComplete ? 'is-complete' : ''} onClick={onOpenGroups}><strong>Group {group.code}</strong><span>{group.complete}/{group.total}</span></button>)}</div>
      </section>

      {summary.preview.diagnostics.length > 0 && (
        <div className="journey-warning-box"><strong>Some bracket selections became stale.</strong><p>Group or earlier bracket changes altered the predicted participants. Open the bracket and update those matches.</p></div>
      )}

      {!summary.canSubmit && (
        <div className="journey-warning-box"><strong>{summary.remaining} predictions still need attention.</strong><p>Review mode becomes available only when all 51 predictions form one valid tournament path.</p></div>
      )}

      <section className="prediction-review__action">
        {reviewMode ? (
          <Button onClick={onEdit} loading={busy} disabled={locked} icon="unlock">Edit predictions</Button>
        ) : (
          <Button onClick={onSubmit} loading={busy} disabled={!summary.canSubmit || locked} icon="check">Submit for review</Button>
        )}
        <p>{locked ? 'The tournament lock is active. Your saved predictions are read-only.' : 'You can reverse review mode and continue editing until the global tournament lock.'}</p>
      </section>
    </div>
  )
}
