import React, { useMemo } from 'react' // eslint-disable-line no-unused-vars
import styles from './AdminControlRoom.module.css'

function formatTimestamp(value) {
  if (!value) return 'Not recorded'
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function humanise(value) {
  return String(value ?? '').replaceAll('_', ' ').replace(/^./, character => character.toUpperCase())
}

function AdminSummary({ matches, role }) {
  const summary = useMemo(() => ({
    live: matches.filter(match => match.matchStatus === 'live').length,
    confirmed: matches.filter(match => match.resultStatus === 'confirmed').length,
    review: matches.filter(match => match.resultStatus === 'manual_review').length,
    unresolved: matches.filter(match => !match.homeTeamId || !match.awayTeamId).length,
  }), [matches])

  const items = [
    [humanise(role), 'verified admin role'],
    [summary.live, 'live matches'],
    [summary.confirmed, 'confirmed results'],
    [summary.review, 'manual review'],
    [summary.unresolved, 'fixtures unresolved'],
  ]

  return (
    <div className={styles.summaryGrid} aria-label="Control-room status summary">
      {items.map(([value, label]) => (
        <div className={styles.summaryCard} key={label}>
          <strong>{value}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  )
}

function ResultHistory({ history }) {
  if (history.length === 0) {
    return <p className="foundation-empty-copy">No result revisions have been recorded for this match.</p>
  }

  return (
    <ol className="foundation-admin-history">
      {history.map(event => (
        <li key={event.eventId}>
          <div>
            <strong>Revision {event.resultRevision} · {humanise(event.eventType)}</strong>
            <span>{formatTimestamp(event.createdAt)}</span>
          </div>
          <p>{event.adminNote ?? 'Recorded outside the browser admin control room.'}</p>
          <small>{event.recordedByDisplayName} · {humanise(event.resultSource)}</small>
        </li>
      ))}
    </ol>
  )
}

function ScoringRuns({ runs }) {
  if (runs.length === 0) return <p className="foundation-empty-copy">No scoring runs have been recorded.</p>
  return (
    <div className="foundation-admin-runs">
      {runs.slice(0, 8).map(run => (
        <div key={run.scoringRunId}>
          <strong>{run.triggerMatchNumber ? `Match ${run.triggerMatchNumber}` : 'Full tournament'} · {humanise(run.status)}</strong>
          <span>{formatTimestamp(run.startedAt)}</span>
          {run.errorMessage && <small>{run.errorMessage}</small>}
        </div>
      ))}
    </div>
  )
}


export { AdminSummary, ResultHistory, ScoringRuns }
