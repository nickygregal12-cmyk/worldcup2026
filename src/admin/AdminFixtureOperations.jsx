import React, { useEffect, useMemo, useRef, useState } from 'react' // eslint-disable-line no-unused-vars
import styles from './AdminOperationsCompletion.module.css'
import {
  ADMIN_SCHEDULE_STATUS,
  adminFixtureDraftHasChanges,
  createAdminFixtureDraft,
  fixtureEditBlockReason,
  validateAdminFixtureDraft,
} from './adminFixtureModel.js'
import {
  formatAdminDate,
  formatFixtureKickoff,
  humaniseAdminValue,
} from './adminPresentation.js'
import { updateAdminMatchFixture } from './adminOperationsService.js'

function FixtureFacts({ match }) {
  return (
    <dl className={styles.fixtureFacts}>
      <div><dt>Date</dt><dd>{formatAdminDate(match.scheduledDate)}</dd></div>
      <div><dt>Kick-off</dt><dd>{formatFixtureKickoff(match)}</dd></div>
      <div><dt>Venue</dt><dd>{match.venueName ? `${match.venueName}, ${match.venueCity}` : 'Not assigned'}</dd></div>
      <div><dt>Schedule</dt><dd>{humaniseAdminValue(match.scheduleStatus)}</dd></div>
      <div><dt>Participants</dt><dd>{humaniseAdminValue(match.participantsStatus)}</dd></div>
      <div><dt>Fixture revision</dt><dd>{match.fixtureRevision}</dd></div>
    </dl>
  )
}

export default function AdminFixtureOperations({
  client,
  tournamentId,
  matches,
  venues,
  adminRole,
  actionStatus,
  runAction,
}) {
  const [selectedMatchId, setSelectedMatchId] = useState(matches[0]?.matchId ?? '')
  const selectedMatch = useMemo(
    () => matches.find(match => match.matchId === selectedMatchId) ?? matches[0] ?? null,
    [matches, selectedMatchId],
  )
  const [draft, setDraft] = useState(() => createAdminFixtureDraft(selectedMatch, venues))
  const [fixtureDirty, setFixtureDirty] = useState(false)
  const selectedFixtureRevisionRef = useRef(selectedMatch?.fixtureRevision ?? null)

  useEffect(() => {
    if (!selectedMatch || selectedFixtureRevisionRef.current === selectedMatch.fixtureRevision) return
    selectedFixtureRevisionRef.current = selectedMatch.fixtureRevision
    setDraft(createAdminFixtureDraft(selectedMatch, venues))
    setFixtureDirty(false)
  }, [selectedMatch, venues])

  const updateDraft = (key, value) => {
    setFixtureDirty(true)
    setDraft(previous => ({ ...previous, [key]: value }))
  }
  const validation = selectedMatch ? validateAdminFixtureDraft(selectedMatch, draft, venues) : null
  const fixtureHasChanges = selectedMatch ? adminFixtureDraftHasChanges(selectedMatch, draft, venues) : false
  const blockReason = fixtureEditBlockReason(selectedMatch)
  const isOwner = adminRole === 'owner'
  const selectedVenue = venues.find(venue => venue.venueId === draft.venueId) ?? null
  const working = actionStatus === 'working'

  if (!selectedMatch) {
    return <p className="foundation-empty-copy">No tournament fixtures are available.</p>
  }

  return (
    <div className={styles.fixtureWorkspace}>
      <aside className={styles.fixtureSelector}>
        <label>
          <span>Choose fixture</span>
          <select value={selectedMatch.matchId} onChange={event => {
            const next = matches.find(match => match.matchId === event.target.value) ?? null
            selectedFixtureRevisionRef.current = next?.fixtureRevision ?? null
            setSelectedMatchId(event.target.value)
            setDraft(createAdminFixtureDraft(next, venues))
            setFixtureDirty(false)
          }}>
            {matches.map(match => (
              <option key={match.matchId} value={match.matchId}>
                {match.matchNumber}. {match.homeTeamLabel} v {match.awayTeamLabel} · {humaniseAdminValue(match.scheduleStatus)}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.fixtureIdentity}>
          <span>{selectedMatch.stageName}{selectedMatch.groupCode ? ` · Group ${selectedMatch.groupCode}` : ''}</span>
          <strong>{selectedMatch.homeTeamLabel} v {selectedMatch.awayTeamLabel}</strong>
          <small>{selectedMatch.fixtureCode ?? `Match ${selectedMatch.matchNumber}`}</small>
        </div>
        <FixtureFacts match={selectedMatch} />
      </aside>

      <article className="foundation-results-card foundation-results-card--wide">
        <div className="foundation-results-card__heading">
          <div><span className="foundation-kicker">Revision-safe fixture schedule</span><h3>Date, kick-off and venue</h3></div>
          <small>Expected fixture revision {selectedMatch.fixtureRevision}</small>
        </div>

        {!isOwner && (
          <p className={styles.permissionNote}>Fixture scheduling is visible to results administrators, but only the tournament owner can change it.</p>
        )}
        {isOwner && blockReason && <p className={styles.blockedNote}>{blockReason}</p>}

        {isOwner && (
          <>
            <div className={styles.fixtureFormGrid}>
              <label><span>Schedule status</span><select value={draft.scheduleStatus} onChange={event => updateDraft('scheduleStatus', event.target.value)}>{ADMIN_SCHEDULE_STATUS.map(value => <option key={value} value={value}>{humaniseAdminValue(value)}</option>)}</select></label>
              <label><span>Scheduled date</span><input type="date" value={draft.scheduledDate} onChange={event => updateDraft('scheduledDate', event.target.value)} /></label>
              <label><span>Tournament venue</span><select value={draft.venueId} onChange={event => updateDraft('venueId', event.target.value)}><option value="">Not assigned</option>{venues.map(venue => <option key={venue.venueId} value={venue.venueId}>{venue.venueName} · {venue.venueCity}</option>)}</select></label>
              <label><span>Venue-local kick-off</span><input type="datetime-local" value={draft.kickoffLocal} onChange={event => updateDraft('kickoffLocal', event.target.value)} /></label>
            </div>
            <p className={styles.fieldHelp}>Kick-off is interpreted in {selectedVenue?.venueTimezone ?? 'the selected venue timezone'}. Fixture scheduling does not edit participants, match number, group or knockout source rules.</p>
            <label className="foundation-admin-note"><span>Audit note</span><textarea value={draft.note} maxLength="500" onChange={event => updateDraft('note', event.target.value)} placeholder="State the official scheduling source or reason for the change." /></label>
            {fixtureDirty && validation && !validation.valid && <ul className="foundation-admin-validation">{validation.errors.map(error => <li key={error}>{error}</li>)}</ul>}
            {!fixtureDirty && <p className="foundation-empty-copy">Change at least one fixture field before saving a schedule update.</p>}
            {fixtureDirty && validation?.valid && !fixtureHasChanges && <p className="foundation-empty-copy">No fixture schedule changes detected.</p>}
            <button type="button" className="ui-button ui-button--primary" disabled={!validation?.valid || !fixtureHasChanges || working} onClick={() => runAction(
              () => updateAdminMatchFixture(client, tournamentId, selectedMatch, draft, venues),
              `Match ${selectedMatch.matchNumber} fixture schedule updated.`,
            )}>Save fixture schedule</button>
          </>
        )}
      </article>
    </div>
  )
}
