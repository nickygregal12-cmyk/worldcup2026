import React, { useMemo, useState } from 'react' // eslint-disable-line no-unused-vars
import styles from './AdminOperationsCompletion.module.css'
import {
  ADMIN_AUDIT_CATEGORY,
  ADMIN_AUDIT_CATEGORY_LABELS,
  filterAdminOperationEvents,
} from './adminAuditModel.js'
import { formatAdminTimestamp, humaniseAdminValue } from './adminPresentation.js'

function Snapshot({ label, value }) {
  if (!value || typeof value !== 'object') return null
  const fields = [
    ['Revision', value.fixture_revision],
    ['Date', value.scheduled_date],
    ['Kick-off', value.kickoff_at ? formatAdminTimestamp(value.kickoff_at, { timeZone: value.venue_timezone }) : 'Not confirmed'],
    ['Venue', value.venue_name ? `${value.venue_name}${value.venue_city ? `, ${value.venue_city}` : ''}` : 'Not assigned'],
    ['Schedule', value.schedule_status ? humaniseAdminValue(value.schedule_status) : null],
  ].filter(([, fieldValue]) => fieldValue !== null && fieldValue !== undefined)
  return (
    <div className={styles.auditSnapshot}>
      <strong>{label}</strong>
      <dl>{fields.map(([field, fieldValue]) => <div key={field}><dt>{field}</dt><dd>{fieldValue}</dd></div>)}</dl>
    </div>
  )
}

function AuditDetail({ event }) {
  const payload = event.payload ?? {}
  const hasFixtureSnapshots = payload.before || payload.after
  return (
    <div className={styles.auditDetail}>
      {payload.scoring_run_id && <p><strong>Scoring run:</strong> <code>{payload.scoring_run_id}</code></p>}
      {hasFixtureSnapshots && (
        <div className={styles.auditSnapshots}>
          <Snapshot label="Before" value={payload.before} />
          <Snapshot label="After" value={payload.after} />
        </div>
      )}
      <details>
        <summary>View recorded payload</summary>
        <pre>{JSON.stringify(payload, null, 2)}</pre>
      </details>
    </div>
  )
}

export default function AdminAuditTimeline({ events }) {
  const [category, setCategory] = useState(ADMIN_AUDIT_CATEGORY.ALL)
  const filtered = useMemo(() => filterAdminOperationEvents(events, category), [category, events])

  return (
    <article className="foundation-results-card foundation-results-card--wide">
      <div className="foundation-results-card__heading">
        <div><span className="foundation-kicker">Append-only operations</span><h3>Combined audit timeline</h3></div>
        <small>{filtered.length} of {events.length} events shown</small>
      </div>
      <div className={styles.auditFilters} role="group" aria-label="Filter administrator operations">
        {Object.entries(ADMIN_AUDIT_CATEGORY_LABELS).map(([value, label]) => (
          <button type="button" key={value} aria-pressed={category === value} onClick={() => setCategory(value)}>{label}</button>
        ))}
      </div>
      {filtered.length === 0 && <p className="foundation-empty-copy">No administrator operations match this filter.</p>}
      <ol className={`foundation-admin-history ${styles.auditList}`}>
        {filtered.map(event => (
          <li key={event.eventId}>
            <div>
              <strong>{humaniseAdminValue(event.operationType)}{event.matchNumber ? ` · Match ${event.matchNumber}` : ''}</strong>
              <span>{formatAdminTimestamp(event.createdAt)}</span>
            </div>
            <p>{event.note}</p>
            <small>
              Actor: {event.performedByDisplayName}
              {event.targetDisplayName ? ` · Target: ${event.targetDisplayName}` : ''}
              {event.matchId ? ` · Match ID: ${event.matchId}` : ''}
            </small>
            <AuditDetail event={event} />
          </li>
        ))}
      </ol>
    </article>
  )
}
