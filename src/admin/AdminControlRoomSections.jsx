import { useMemo, useState } from 'react'
import {
  applyGlobalPredictionLock,
  grantAdminPredictionGrace,
  revokeAdminPredictionGrace,
  searchAdminPredictionUsers,
  updateTournamentFeature,
} from './adminOperationsService.js'

function formatTimestamp(value) {
  if (!value) return 'Not recorded'
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function humanise(value) {
  return String(value ?? '').replaceAll('_', ' ').replace(/^./, character => character.toUpperCase())
}

function initialExpiry() {
  return new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 16)
}

function HealthSummary({ health }) {
  const items = [
    ['Matches', health.totalMatches],
    ['Unresolved slots', health.unresolvedParticipantSlots],
    ['Missing kick-offs', health.missingKickoffTimes],
    ['Live or paused', health.liveOrPausedMatches],
    ['Confirmed results', health.confirmedResults],
    ['Manual review', health.manualReviewResults],
    ['Failed scoring runs', health.failedScoringRuns],
    ['Active grace', health.activeGraceWindows],
    ['Disabled features', health.disabledFeatures],
  ]

  return (
    <div className="foundation-control-health">
      {items.map(([label, value]) => (
        <div key={label}><strong>{value}</strong><span>{label}</span></div>
      ))}
    </div>
  )
}

function GlobalLockControl({ client, tournamentId, controlRoom, isOwner, runAction }) {
  const [note, setNote] = useState('')
  const lock = controlRoom.lock

  return (
    <article className="foundation-results-card">
      <span className="foundation-kicker">Original Predictor lock</span>
      <h3>{lock.isIrreversible ? 'Irreversible lock applied' : lock.isEffective ? 'Scheduled lock is effective' : 'Predictions remain editable'}</h3>
      <p>Scheduled: {formatTimestamp(lock.scheduledAt)}<br />Persisted: {formatTimestamp(lock.persistedAt)}</p>
      {!lock.isIrreversible && isOwner && (
        <>
          <label className="foundation-admin-note">
            <span>Audit note</span>
            <textarea value={note} maxLength="500" onChange={event => setNote(event.target.value)} placeholder="Explain why the irreversible lock is being applied now." />
          </label>
          <button
            type="button"
            className="foundation-danger-button"
            disabled={note.trim().length < 5}
            onClick={() => runAction(
              () => applyGlobalPredictionLock(client, tournamentId, note),
              'The global Original Predictor lock is now irreversible.',
            )}
          >Apply irreversible lock</button>
        </>
      )}
      {!isOwner && <small>Only a tournament owner can apply this irreversible control.</small>}
    </article>
  )
}

function FeatureControls({ client, tournamentId, features, isOwner, runAction }) {
  const [notes, setNotes] = useState({})

  return (
    <article className="foundation-results-card foundation-results-card--wide">
      <span className="foundation-kicker">Operational kill-switches</span>
      <h3>Feature controls</h3>
      <p>Controls block trusted browser actions at database level. Service-role recovery remains available.</p>
      <div className="foundation-feature-controls">
        {features.map(feature => (
          <div key={feature.featureKey} className={feature.isEnabled ? 'foundation-feature-control' : 'foundation-feature-control foundation-feature-control--disabled'}>
            <div>
              <strong>{feature.label}</strong>
              <span>{feature.isEnabled ? 'Enabled' : 'Disabled'} · revision {feature.revision}</span>
              {feature.reason && <small>{feature.reason}</small>}
            </div>
            {isOwner && (
              <div className="foundation-feature-control__action">
                <input
                  aria-label={`Audit note for ${feature.label}`}
                  value={notes[feature.featureKey] ?? ''}
                  maxLength="500"
                  placeholder="Required audit note"
                  onChange={event => setNotes(previous => ({ ...previous, [feature.featureKey]: event.target.value }))}
                />
                <button
                  type="button"
                  disabled={(notes[feature.featureKey] ?? '').trim().length < 5}
                  onClick={() => runAction(
                    () => updateTournamentFeature(
                      client,
                      tournamentId,
                      feature,
                      !feature.isEnabled,
                      notes[feature.featureKey],
                    ),
                    `${feature.label} ${feature.isEnabled ? 'disabled' : 'enabled'}.`,
                  )}
                >{feature.isEnabled ? 'Disable' : 'Enable'}</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </article>
  )
}

function GraceManagement({ client, tournamentId, matches, graceWindows, isOwner, runAction }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searchMessage, setSearchMessage] = useState('')
  const [draft, setDraft] = useState({
    userId: '',
    displayName: '',
    competitionKey: 'original',
    matchId: matches.find(match => match.matchNumber <= 36)?.matchId ?? '',
    expiresAt: initialExpiry(),
    reason: '',
  })
  const [revokeNotes, setRevokeNotes] = useState({})

  const eligibleMatches = useMemo(
    () => matches.filter(match => {
      const competitionMatch = draft.competitionKey === 'original'
        ? match.matchNumber <= 36
        : match.matchNumber >= 37
      const started = ['live', 'paused', 'completed', 'abandoned'].includes(match.matchStatus)
      return competitionMatch && !started
    }),
    [draft.competitionKey, matches],
  )

  const search = async () => {
    setSearchMessage('Searching…')
    try {
      const next = await searchAdminPredictionUsers(client, tournamentId, query)
      setResults(next)
      setSearchMessage(next.length ? '' : 'No matching predictors found.')
    } catch (error) {
      setSearchMessage(error instanceof Error ? error.message : String(error))
    }
  }

  const chooseCompetition = competitionKey => {
    const nextMatch = matches.find(match => competitionKey === 'original' ? match.matchNumber <= 36 : match.matchNumber >= 37)
    setDraft(previous => ({ ...previous, competitionKey, matchId: nextMatch?.matchId ?? '' }))
  }

  return (
    <article className="foundation-results-card foundation-results-card--wide">
      <span className="foundation-kicker">One user · one unstarted match</span>
      <h3>Prediction grace windows</h3>
      {!isOwner && <p>Grace status is visible here. Only a tournament owner can grant or revoke an exception.</p>}

      {isOwner && (
        <div className="foundation-grace-builder">
          <div className="foundation-grace-search">
            <label><span>Find predictor</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Display name" /></label>
            <button type="button" disabled={query.trim().length < 2} onClick={search}>Search</button>
          </div>
          {searchMessage && <small>{searchMessage}</small>}
          {results.length > 0 && (
            <div className="foundation-grace-users">
              {results.map(user => (
                <button
                  type="button"
                  key={user.userId}
                  className={draft.userId === user.userId ? 'is-selected' : ''}
                  onClick={() => setDraft(previous => ({ ...previous, userId: user.userId, displayName: user.displayName }))}
                >
                  <strong>{user.displayName}</strong>
                  <small>Original {user.hasOriginalPredictions ? 'saved' : 'not saved'} · KO {user.hasKoPredictions ? 'saved' : 'not saved'}</small>
                </button>
              ))}
            </div>
          )}

          <div className="foundation-admin-form-grid">
            <label><span>Selected predictor</span><input value={draft.displayName} readOnly placeholder="Choose a search result" /></label>
            <label><span>Competition</span><select value={draft.competitionKey} onChange={event => chooseCompetition(event.target.value)}><option value="original">Original Predictor</option><option value="ko_predictor">KO Predictor</option></select></label>
            <label><span>Unstarted match</span><select value={draft.matchId} onChange={event => setDraft(previous => ({ ...previous, matchId: event.target.value }))}>{eligibleMatches.map(match => <option key={match.matchId} value={match.matchId}>{match.matchNumber}. {match.homeTeamLabel} v {match.awayTeamLabel}</option>)}</select></label>
            <label><span>Expires</span><input type="datetime-local" value={draft.expiresAt} onChange={event => setDraft(previous => ({ ...previous, expiresAt: event.target.value }))} /></label>
          </div>
          <label className="foundation-admin-note"><span>Reason</span><textarea value={draft.reason} maxLength="500" onChange={event => setDraft(previous => ({ ...previous, reason: event.target.value }))} /></label>
          <button
            type="button"
            disabled={!draft.userId || !draft.matchId || draft.reason.trim().length < 5 || !draft.expiresAt}
            onClick={() => runAction(
              () => grantAdminPredictionGrace(client, tournamentId, { ...draft, expiresAt: new Date(draft.expiresAt).toISOString() }),
              `Grace granted to ${draft.displayName} for one match.`,
            )}
          >Grant grace window</button>
        </div>
      )}

      <div className="foundation-grace-list">
        {graceWindows.length === 0 && <p className="foundation-empty-copy">No grace windows have been recorded.</p>}
        {graceWindows.map(grace => (
          <div key={grace.graceId}>
            <div>
              <strong>{grace.displayName} · Match {grace.matchNumber}</strong>
              <span>{grace.homeTeamLabel} v {grace.awayTeamLabel} · {humanise(grace.competitionKey)}</span>
              <small>{humanise(grace.status)} · expires {formatTimestamp(grace.expiresAt)}</small>
              <p>{grace.reason}</p>
            </div>
            {isOwner && grace.status === 'active' && (
              <div className="foundation-feature-control__action">
                <input value={revokeNotes[grace.graceId] ?? ''} placeholder="Revocation reason" onChange={event => setRevokeNotes(previous => ({ ...previous, [grace.graceId]: event.target.value }))} />
                <button
                  type="button"
                  disabled={(revokeNotes[grace.graceId] ?? '').trim().length < 5}
                  onClick={() => runAction(
                    () => revokeAdminPredictionGrace(client, tournamentId, grace.graceId, revokeNotes[grace.graceId]),
                    `Grace for ${grace.displayName} revoked.`,
                  )}
                >Revoke</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </article>
  )
}

function AllocationReview({ controlRoom }) {
  const lockedJokers = controlRoom.jokerLocks.filter(match => match.isLocked).length
  const resolvedKnockoutSlots = controlRoom.knockoutAllocation.filter(slot => slot.isResolved).length

  return (
    <article className="foundation-results-card foundation-results-card--wide">
      <span className="foundation-kicker">Canonical tournament structure</span>
      <h3>Joker locks and knockout allocation</h3>
      <p>{lockedJokers} of 51 joker-eligible matches are locked. {resolvedKnockoutSlots} of 30 knockout slots are currently resolved.</p>
      <div className="foundation-control-review-grid">
        <details>
          <summary>Review per-match joker locks</summary>
          <div className="foundation-control-table">
            {controlRoom.jokerLocks.map(match => (
              <div key={match.matchId}>
                <strong>Match {match.matchNumber}</strong>
                <span>{humanise(match.competitionKey)} · {humanise(match.matchStatus)}</span>
                <small>{match.isLocked ? 'Locked' : 'Open'} · {match.jokerAllocationCount} joker allocations</small>
              </div>
            ))}
          </div>
        </details>
        <details>
          <summary>Review knockout source slots</summary>
          <div className="foundation-control-table">
            {controlRoom.knockoutAllocation.map(slot => (
              <div key={`${slot.matchId}-${slot.side}`}>
                <strong>Match {slot.matchNumber} · {humanise(slot.side)}</strong>
                <span>{humanise(slot.sourceType)}{slot.ruleCode ? ` · ${slot.ruleCode}` : ''}</span>
                <small>{slot.isResolved ? slot.resolvedTeamLabel : 'Unresolved'}</small>
              </div>
            ))}
          </div>
        </details>
      </div>
    </article>
  )
}

function OperationTimeline({ events }) {
  return (
    <article className="foundation-results-card foundation-results-card--wide">
      <span className="foundation-kicker">Append-only operations</span>
      <h3>Combined audit timeline</h3>
      {events.length === 0 && <p className="foundation-empty-copy">No administrator operations have been recorded.</p>}
      <ol className="foundation-admin-history">
        {events.map(event => (
          <li key={event.eventId}>
            <div><strong>{humanise(event.operationType)}{event.matchNumber ? ` · Match ${event.matchNumber}` : ''}</strong><span>{formatTimestamp(event.createdAt)}</span></div>
            <p>{event.note}</p>
            <small>{event.performedByDisplayName}{event.targetDisplayName ? ` · ${event.targetDisplayName}` : ''}</small>
          </li>
        ))}
      </ol>
    </article>
  )
}

export default function AdminControlRoomSections({ client, tournamentId, data, matches, runAction }) {
  const controlRoom = data.controlRoom
  const isOwner = data.access.adminRole === 'owner'

  return (
    <div className="foundation-control-room">
      <HealthSummary health={controlRoom.health} />
      <div className="foundation-admin-workspace">
        <GlobalLockControl client={client} tournamentId={tournamentId} controlRoom={controlRoom} isOwner={isOwner} runAction={runAction} />
        <FeatureControls client={client} tournamentId={tournamentId} features={controlRoom.features} isOwner={isOwner} runAction={runAction} />
        <GraceManagement client={client} tournamentId={tournamentId} matches={matches} graceWindows={data.graceWindows} isOwner={isOwner} runAction={runAction} />
        <AllocationReview controlRoom={controlRoom} />
        <OperationTimeline events={data.operationEvents} />
      </div>
    </div>
  )
}
