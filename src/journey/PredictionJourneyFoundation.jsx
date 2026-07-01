import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DECISION_METHOD } from '../contracts/resultContract.js'
import {
  buildGuestBundleFilename,
  createGuestPredictionState,
  createGuestPredictionStorage,
  importGuestPredictionBundle,
  serialiseGuestPredictionBundle,
} from '../guest/index.js'
import {
  importGuestDraftToAccount,
  loadMyPredictionBundle,
  saveMyPredictionBundle,
} from '../predictions/predictionSaveService.js'
import { GUEST_STATE_UPDATED_EVENT, PREDICTION_SAVE_SOURCE } from '../predictions/predictionSaveConfig.js'
import {
  EURO28_PREDICTION_JOURNEY_VERSION,
  PREDICTION_AUTOSAVE_DELAY_MS,
  PREDICTION_AUTOSAVE_STATE,
  PREDICTION_JOURNEY_VIEW,
} from './predictionJourneyConfig.js'
import {
  buildGuestReviewStorageKey,
  buildPredictionJourneyRows,
  clearStaleKnockoutSelections,
  createPredictionJourneyDraft,
  summarisePredictionJourney,
  updatePredictionJourneyGroup,
  updatePredictionJourneyKnockout,
} from './predictionJourneyModel.js'

function browserStorage() {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

function parseScore(value) {
  if (value === '') return null
  const numeric = Number(value)
  return Number.isInteger(numeric) && numeric >= 0 && numeric <= 99 ? numeric : null
}

function formatDate(dateValue) {
  if (!dateValue) return 'Date to be confirmed'
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${dateValue}T12:00:00Z`))
}

function messageForError(error) {
  const message = error?.message ?? String(error)
  if (/revision is stale/i.test(message)) return 'These predictions changed in another session. Reload the account draft before editing again.'
  if (/globally locked/i.test(message) || /global lock/i.test(message)) return 'Prediction content is locked for the tournament.'
  if (/joker cap is not configured/i.test(message)) return 'Jokers remain unavailable until the final tournament caps are confirmed.'
  if (/guest import cannot overwrite/i.test(message)) return 'This account already contains predictions, so the browser draft was not imported.'
  return message
}

function readGuestReview(reference) {
  const storage = browserStorage()
  if (!storage) return false
  try {
    return storage.getItem(buildGuestReviewStorageKey(reference)) === 'review'
  } catch {
    return false
  }
}

function writeGuestReview(reference, reviewMode) {
  const storage = browserStorage()
  if (!storage) return
  try {
    const key = buildGuestReviewStorageKey(reference)
    if (reviewMode) storage.setItem(key, 'review')
    else storage.removeItem(key)
  } catch {
    // Review mode is a convenience only; the prediction draft remains safe.
  }
}

function teamLabel(reference, teamId) {
  if (!teamId) return 'To be determined'
  return reference.teamsById?.[teamId]?.label ?? teamId
}

function ScoreInput({ value, label, disabled, onChange }) {
  return (
    <input
      className="journey-score-input"
      type="number"
      min="0"
      max="99"
      inputMode="numeric"
      aria-label={label}
      value={value ?? ''}
      disabled={disabled}
      onChange={event => onChange(parseScore(event.target.value))}
    />
  )
}

function AutosaveBadge({ context, status, revision, savedAt }) {
  let label = 'Ready'
  let tone = 'neutral'

  if (context === 'guest') {
    label = 'Saved in this browser'
    tone = 'safe'
  } else if (status === PREDICTION_AUTOSAVE_STATE.SAVING) {
    label = 'Saving…'
    tone = 'info'
  } else if (status === PREDICTION_AUTOSAVE_STATE.DIRTY) {
    label = 'Changes queued'
    tone = 'warning'
  } else if (status === PREDICTION_AUTOSAVE_STATE.SAVED) {
    label = `Saved · revision ${revision}`
    tone = 'safe'
  } else if (status === PREDICTION_AUTOSAVE_STATE.CONFLICT) {
    label = 'Reload required'
    tone = 'danger'
  } else if (status === PREDICTION_AUTOSAVE_STATE.ERROR) {
    label = 'Save failed'
    tone = 'danger'
  } else if (status === PREDICTION_AUTOSAVE_STATE.LOCKED) {
    label = 'Predictions locked'
    tone = 'danger'
  } else if (revision > 0) {
    label = `Account revision ${revision}`
  }

  return (
    <div className="journey-autosave" aria-live="polite">
      <span className={`foundation-pill foundation-pill--${tone}`}>{label}</span>
      {savedAt && status === PREDICTION_AUTOSAVE_STATE.SAVED && (
        <small>{new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(savedAt)}</small>
      )}
    </div>
  )
}

function GroupEditor({ reference, draft, disabled, onChange }) {
  return (
    <div className="journey-group-grid">
      {reference.groups.map(group => {
        const matches = reference.groupMatches.filter(match => match.groupCode === group.code)
        return (
          <section className="journey-group-card" key={group.code}>
            <div className="journey-group-card__heading">
              <div>
                <span>Group {group.code}</span>
                <strong>{group.teams.map(team => team.label).join(' · ')}</strong>
              </div>
              <b>{matches.filter(match => {
                const row = draft.groupPredictions[String(match.matchNumber)]
                return row.homeScore != null && row.awayScore != null
              }).length}/6</b>
            </div>

            <div className="journey-match-list">
              {matches.map(match => {
                const row = draft.groupPredictions[String(match.matchNumber)]
                return (
                  <div className="journey-match-row" key={match.matchId}>
                    <div className="journey-match-meta">
                      <span>Match {match.matchNumber}</span>
                      <small>{formatDate(match.scheduledDate)}</small>
                    </div>
                    <div className="journey-team journey-team--home">
                      <strong>{teamLabel(reference, match.homeTeamId)}</strong>
                    </div>
                    <ScoreInput
                      value={row.homeScore}
                      label={`Match ${match.matchNumber} home score`}
                      disabled={disabled}
                      onChange={homeScore => onChange(match, { homeScore })}
                    />
                    <span className="journey-score-separator">–</span>
                    <ScoreInput
                      value={row.awayScore}
                      label={`Match ${match.matchNumber} away score`}
                      disabled={disabled}
                      onChange={awayScore => onChange(match, { awayScore })}
                    />
                    <div className="journey-team journey-team--away">
                      <strong>{teamLabel(reference, match.awayTeamId)}</strong>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}

const ROUND_LABELS = Object.freeze({
  round_of_16: 'Round of 16',
  quarter_final: 'Quarter-finals',
  semi_final: 'Semi-finals',
  final: 'Final',
})

function KnockoutEditor({ reference, draft, preview, disabled, onChange }) {
  const rounds = ['round_of_16', 'quarter_final', 'semi_final', 'final']

  return (
    <div className="journey-knockout-rounds">
      {rounds.map(round => {
        const matches = preview.resolution.knockout.matches.filter(match => match.stage === round)
        return (
          <section className="journey-knockout-round" key={round}>
            <div className="journey-round-heading">
              <h3>{ROUND_LABELS[round]}</h3>
              <span>{matches.filter(match => match.decisionResolved).length}/{matches.length} progressing</span>
            </div>

            <div className="journey-knockout-grid">
              {matches.map(match => {
                const row = draft.knockoutPredictions[String(match.matchNumber)]
                const matchDisabled = disabled || !match.participantsResolved
                const scoresComplete = row.homeScore != null && row.awayScore != null
                const isDraw = scoresComplete && row.homeScore === row.awayScore

                return (
                  <article className={`journey-knockout-card${match.participantsResolved ? '' : ' journey-knockout-card--blocked'}`} key={match.matchNumber}>
                    <div className="journey-knockout-card__meta">
                      <strong>Match {match.matchNumber}</strong>
                      <span>{formatDate(reference.knockoutMatches.find(item => item.matchNumber === match.matchNumber)?.scheduledDate)}</span>
                    </div>

                    {!match.participantsResolved ? (
                      <p className="journey-blocked-copy">Complete the earlier predictions that feed this match.</p>
                    ) : (
                      <>
                        <div className="journey-knockout-score">
                          <span>{teamLabel(reference, match.homeTeamId)}</span>
                          <ScoreInput
                            value={row.homeScore}
                            label={`Match ${match.matchNumber} home score after 90 minutes`}
                            disabled={matchDisabled}
                            onChange={homeScore => onChange(match, { homeScore })}
                          />
                          <span className="journey-score-separator">–</span>
                          <ScoreInput
                            value={row.awayScore}
                            label={`Match ${match.matchNumber} away score after 90 minutes`}
                            disabled={matchDisabled}
                            onChange={awayScore => onChange(match, { awayScore })}
                          />
                          <span>{teamLabel(reference, match.awayTeamId)}</span>
                        </div>

                        <div className="journey-knockout-controls">
                          <label>
                            <span>Advancing team</span>
                            <select
                              value={row.advancingTeamId ?? ''}
                              disabled={matchDisabled || !scoresComplete}
                              onChange={event => onChange(match, { advancingTeamId: event.target.value || null })}
                            >
                              <option value="">Choose team</option>
                              <option value={match.homeTeamId}>{teamLabel(reference, match.homeTeamId)}</option>
                              <option value={match.awayTeamId}>{teamLabel(reference, match.awayTeamId)}</option>
                            </select>
                          </label>

                          <label>
                            <span>How they advance</span>
                            <select
                              value={row.decisionMethod ?? ''}
                              disabled={matchDisabled || !scoresComplete || !isDraw}
                              onChange={event => onChange(match, { decisionMethod: event.target.value || null })}
                            >
                              {!scoresComplete && <option value="">Enter the score first</option>}
                              {scoresComplete && !isDraw && <option value={DECISION_METHOD.NORMAL_TIME}>Normal time</option>}
                              {scoresComplete && isDraw && (
                                <>
                                  <option value={DECISION_METHOD.EXTRA_TIME}>Extra time</option>
                                  <option value={DECISION_METHOD.PENALTIES}>Penalties</option>
                                </>
                              )}
                            </select>
                          </label>
                        </div>

                        <small className="journey-90-note">Score prediction always means the score after 90 minutes plus added time.</small>
                      </>
                    )}
                  </article>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function ReviewPanel({ reference, summary, context, reviewMode, locked, busy, onSubmit, onEdit }) {
  const championId = summary.preview.resolution.knockout.championTeamId
  return (
    <div className="journey-review">
      <div className="journey-review-grid">
        <article>
          <span>Group predictions</span>
          <strong>{summary.groupComplete}/36 complete</strong>
        </article>
        <article>
          <span>Knockout predictions</span>
          <strong>{summary.knockoutComplete}/15 complete</strong>
        </article>
        <article>
          <span>Predicted champion</span>
          <strong>{championId ? teamLabel(reference, championId) : 'Not resolved'}</strong>
        </article>
        <article>
          <span>Storage</span>
          <strong>{context === 'account' ? 'Euro account' : 'This browser only'}</strong>
        </article>
      </div>

      {summary.preview.diagnostics.length > 0 && (
        <div className="journey-warning-box">
          <strong>Some knockout selections became stale.</strong>
          <p>Group or earlier knockout changes altered the predicted participants. Return to the knockout tab and update those matches.</p>
        </div>
      )}

      {!summary.canSubmit && (
        <div className="journey-warning-box">
          <strong>{summary.remaining} predictions still need attention.</strong>
          <p>Submit becomes available only when all 51 predictions form one valid canonical tournament path.</p>
        </div>
      )}

      <div className="journey-review-actions">
        {reviewMode ? (
          <button type="button" onClick={onEdit} disabled={locked || busy}>
            {busy ? 'Updating…' : 'Edit predictions'}
          </button>
        ) : (
          <button type="button" onClick={onSubmit} disabled={!summary.canSubmit || locked || busy}>
            {busy ? 'Submitting…' : 'Submit predictions for review'}
          </button>
        )}
        <p>
          Submit is a reversible personal review mode. Saved and unsubmitted predictions count exactly the same at the real tournament lock.
        </p>
      </div>
    </div>
  )
}

export default function PredictionJourneyFoundation({ client, reference, tournament }) {
  const guestStorage = useMemo(() => createGuestPredictionStorage({
    storage: browserStorage(),
    reference,
  }), [reference])
  const [session, setSession] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(Boolean(client))
  const [guestDraft, setGuestDraft] = useState(() => {
    const loaded = guestStorage.load()
    return loaded.status === 'ready' ? loaded.state : createGuestPredictionState(reference)
  })
  const [guestReview, setGuestReview] = useState(() => readGuestReview(reference))
  const [accountBundle, setAccountBundle] = useState(null)
  const [accountDraft, setAccountDraft] = useState(() => createPredictionJourneyDraft(reference))
  const [accountLoading, setAccountLoading] = useState(false)
  const [view, setView] = useState(PREDICTION_JOURNEY_VIEW.GROUPS)
  const [editVersion, setEditVersion] = useState(0)
  const [savedEditVersion, setSavedEditVersion] = useState(0)
  const [autosaveStatus, setAutosaveStatus] = useState(PREDICTION_AUTOSAVE_STATE.IDLE)
  const [savedAt, setSavedAt] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  const savingRef = useRef(false)

  const signedIn = Boolean(session?.user)
  const context = signedIn ? 'account' : 'guest'
  const draft = signedIn ? accountDraft : guestDraft
  const summary = useMemo(() => summarisePredictionJourney(reference, draft), [reference, draft])
  const reviewMode = signedIn ? Boolean(accountBundle?.submittedAt) : guestReview
  const lockConfigured = Boolean(tournament.prediction_lock_at || tournament.prediction_locked_at)
  const locked = Boolean(tournament.prediction_locked_at) ||
    Boolean(tournament.prediction_lock_at && new Date(tournament.prediction_lock_at) <= new Date())
  const readOnly = locked || reviewMode
  const accountRows = accountBundle?.predictions?.length ?? 0

  const loadAccount = useCallback(async nextSession => {
    if (!client || !nextSession?.user) {
      setAccountBundle(null)
      setAccountDraft(createPredictionJourneyDraft(reference))
      setEditVersion(0)
      setSavedEditVersion(0)
      return
    }

    setAccountLoading(true)
    try {
      const bundle = await loadMyPredictionBundle(client, reference.tournamentId, nextSession.user.id)
      setAccountBundle(bundle)
      setAccountDraft(createPredictionJourneyDraft(reference, bundle))
      setEditVersion(0)
      setSavedEditVersion(0)
      setAutosaveStatus(bundle ? PREDICTION_AUTOSAVE_STATE.SAVED : PREDICTION_AUTOSAVE_STATE.IDLE)
    } finally {
      setAccountLoading(false)
    }
  }, [client, reference])

  useEffect(() => {
    if (!client) return undefined
    let active = true

    client.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) setNotice({ tone: 'danger', message: messageForError(error) })
      const nextSession = data?.session ?? null
      setSession(nextSession)
      return loadAccount(nextSession)
    }).catch(error => {
      if (active) setNotice({ tone: 'danger', message: messageForError(error) })
    }).finally(() => {
      if (active) setSessionLoading(false)
    })

    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      loadAccount(nextSession).catch(error => {
        setNotice({ tone: 'danger', message: messageForError(error) })
      })
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [client, loadAccount])

  const saveAccount = useCallback(async ({ submitted, targetVersion, draftSnapshot }) => {
    if (!client || !session?.user || savingRef.current) return null
    if (!lockConfigured || locked) {
      setAutosaveStatus(PREDICTION_AUTOSAVE_STATE.LOCKED)
      return null
    }

    savingRef.current = true
    setAutosaveStatus(PREDICTION_AUTOSAVE_STATE.SAVING)

    try {
      const predictions = buildPredictionJourneyRows(reference, draftSnapshot)
      const result = await saveMyPredictionBundle(client, {
        tournamentId: reference.tournamentId,
        expectedRevision: accountBundle?.revision ?? 0,
        submitted,
        predictions,
        source: PREDICTION_SAVE_SOURCE.ACCOUNT,
      })
      setAccountBundle(previous => ({
        ...(previous ?? {}),
        predictionSetId: result.predictionSetId,
        tournamentId: result.tournamentId,
        revision: result.revision,
        submittedAt: result.submittedAt,
        guestImportedAt: result.guestImportedAt,
        lastSaveSource: result.lastSaveSource,
        predictions,
      }))
      setSavedEditVersion(targetVersion)
      setSavedAt(new Date())
      setAutosaveStatus(PREDICTION_AUTOSAVE_STATE.SAVED)
      return result
    } catch (error) {
      const message = messageForError(error)
      setNotice({ tone: 'danger', message })
      setAutosaveStatus(/changed in another session/i.test(message)
        ? PREDICTION_AUTOSAVE_STATE.CONFLICT
        : PREDICTION_AUTOSAVE_STATE.ERROR)
      return null
    } finally {
      savingRef.current = false
    }
  }, [accountBundle, client, lockConfigured, locked, reference, session])

  useEffect(() => {
    if (!signedIn || accountLoading || reviewMode || locked || !lockConfigured) return undefined
    if (editVersion <= savedEditVersion || savingRef.current) return undefined

    setAutosaveStatus(PREDICTION_AUTOSAVE_STATE.DIRTY)
    const targetVersion = editVersion
    const draftSnapshot = accountDraft
    const timer = globalThis.setTimeout(() => {
      saveAccount({ submitted: false, targetVersion, draftSnapshot })
    }, PREDICTION_AUTOSAVE_DELAY_MS)

    return () => globalThis.clearTimeout(timer)
  }, [
    accountDraft,
    accountLoading,
    editVersion,
    lockConfigured,
    locked,
    reviewMode,
    saveAccount,
    savedEditVersion,
    signedIn,
  ])

  function persistGuest(nextDraft, message = 'Saved in this browser.') {
    const result = guestStorage.save(nextDraft)
    setGuestDraft(nextDraft)
    globalThis.dispatchEvent?.(new Event(GUEST_STATE_UPDATED_EVENT))
    setAutosaveStatus(PREDICTION_AUTOSAVE_STATE.LOCAL)
    setNotice(result.status === 'saved'
      ? null
      : { tone: 'warning', message: result.error ?? message })
  }

  function updateDraft(updater) {
    if (readOnly) return
    if (signedIn) {
      setAccountDraft(current => updater(current))
      setEditVersion(value => value + 1)
      return
    }
    persistGuest(updater(guestDraft))
  }

  function updateGroup(match, patch) {
    updateDraft(current => updatePredictionJourneyGroup(current, {
      matchNumber: match.matchNumber,
      ...patch,
    }))
  }

  function updateKnockout(match, patch) {
    updateDraft(current => updatePredictionJourneyKnockout(current, match, patch))
  }

  async function importGuestDraft() {
    if (!signedIn || !summary) return
    setBusy(true)
    setNotice(null)
    try {
      const guestSummary = summarisePredictionJourney(reference, guestDraft)
      if (!guestSummary.canSubmit) throw new Error('Complete all 51 browser predictions before importing them to the account.')
      const result = await importGuestDraftToAccount(client, {
        reference,
        state: guestDraft,
        expectedRevision: accountBundle?.revision ?? 0,
      })
      await loadAccount(session)
      setNotice({
        tone: 'safe',
        message: `Imported all ${result.savedPredictionCount} browser predictions into the account at revision ${result.revision}.`,
      })
    } catch (error) {
      setNotice({ tone: 'danger', message: messageForError(error) })
    } finally {
      setBusy(false)
    }
  }

  function exportGuest() {
    const json = serialiseGuestPredictionBundle(guestDraft, reference)
    const blob = new Blob([json], { type: 'application/json' })
    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = buildGuestBundleFilename(reference)
    anchor.click()
    URL.revokeObjectURL(objectUrl)
  }

  async function importGuestFile(event) {
    const [file] = event.target.files ?? []
    event.target.value = ''
    if (!file) return
    try {
      const nextDraft = importGuestPredictionBundle(await file.text(), reference, guestDraft)
      persistGuest(nextDraft)
      setNotice({ tone: 'safe', message: 'Browser prediction file imported.' })
    } catch (error) {
      setNotice({ tone: 'danger', message: messageForError(error) })
    }
  }

  function clearStale() {
    updateDraft(current => clearStaleKnockoutSelections(reference, current))
    setNotice({ tone: 'safe', message: 'Stale knockout selections were cleared.' })
  }

  async function submitReview() {
    if (!summary.canSubmit) return
    if (!signedIn) {
      setGuestReview(true)
      writeGuestReview(reference, true)
      setView(PREDICTION_JOURNEY_VIEW.REVIEW)
      return
    }

    setBusy(true)
    const result = await saveAccount({
      submitted: true,
      targetVersion: editVersion,
      draftSnapshot: accountDraft,
    })
    if (result) setNotice({ tone: 'safe', message: 'Predictions are now shown in review mode. They remain editable until the global lock.' })
    setBusy(false)
  }

  async function editPredictions() {
    if (!signedIn) {
      setGuestReview(false)
      writeGuestReview(reference, false)
      setView(PREDICTION_JOURNEY_VIEW.GROUPS)
      return
    }

    setBusy(true)
    const result = await saveAccount({
      submitted: false,
      targetVersion: editVersion,
      draftSnapshot: accountDraft,
    })
    if (result) {
      setNotice({ tone: 'safe', message: 'Edit mode restored.' })
      setView(PREDICTION_JOURNEY_VIEW.GROUPS)
    }
    setBusy(false)
  }

  const guestSummary = useMemo(() => summarisePredictionJourney(reference, guestDraft), [guestDraft, reference])
  const canImportGuest = signedIn && accountRows === 0 && guestSummary.canSubmit && !locked && lockConfigured

  return (
    <section className="foundation-panel prediction-journey" aria-labelledby="prediction-journey-title">
      <div className="foundation-section-heading prediction-journey__heading">
        <div>
          <span className="foundation-kicker">Stage 7 · Prediction journey</span>
          <h2 id="prediction-journey-title">Predict the full Euro 2028 tournament</h2>
          <p className="foundation-panel-copy">
            Group scores drive one canonical knockout bracket. Guest changes stay in this browser; signed-in account changes autosave through the trusted Stage 6 transaction.
          </p>
        </div>
        <AutosaveBadge
          context={context}
          status={locked ? PREDICTION_AUTOSAVE_STATE.LOCKED : autosaveStatus}
          revision={accountBundle?.revision ?? 0}
          savedAt={savedAt}
        />
      </div>

      <div className="journey-progress">
        <div>
          <strong>{summary.totalComplete}/51</strong>
          <span>predictions complete</span>
        </div>
        <div className="journey-progress__bar" aria-hidden="true">
          <span style={{ width: `${Math.round((summary.totalComplete / 51) * 100)}%` }} />
        </div>
        <div>
          <span>{context === 'account' ? 'Account workspace' : 'Guest workspace'}</span>
          <strong>{reviewMode ? 'Review mode' : readOnly ? 'Locked' : 'Editable'}</strong>
        </div>
      </div>

      {signedIn && accountRows === 0 && (
        <div className="journey-import-strip">
          <div>
            <strong>Browser draft: {guestSummary.totalComplete}/51 complete</strong>
            <span>A complete guest bracket can be imported once and will never overwrite account predictions.</span>
          </div>
          <button type="button" onClick={importGuestDraft} disabled={!canImportGuest || busy}>
            {busy ? 'Importing…' : 'Import complete browser draft'}
          </button>
        </div>
      )}

      {!signedIn && (
        <div className="journey-guest-tools">
          <span>Browser-only tools</span>
          <button type="button" className="foundation-secondary-button" onClick={exportGuest}>Export JSON</button>
          <label className="foundation-secondary-button guest-import-button">
            Import JSON
            <input type="file" accept="application/json,.json" onChange={importGuestFile} />
          </label>
        </div>
      )}

      <nav className="journey-tabs" aria-label="Prediction sections">
        {[
          [PREDICTION_JOURNEY_VIEW.GROUPS, 'Groups', `${summary.groupComplete}/36`],
          [PREDICTION_JOURNEY_VIEW.KNOCKOUT, 'Knockout', `${summary.knockoutComplete}/15`],
          [PREDICTION_JOURNEY_VIEW.REVIEW, 'Review', summary.canSubmit ? 'Ready' : `${summary.remaining} left`],
        ].map(([value, label, note]) => (
          <button
            type="button"
            key={value}
            className={view === value ? 'journey-tab journey-tab--active' : 'journey-tab'}
            onClick={() => setView(value)}
          >
            <span>{label}</span>
            <small>{note}</small>
          </button>
        ))}
      </nav>

      {sessionLoading || accountLoading ? (
        <div className="foundation-state" role="status">Loading prediction workspace…</div>
      ) : (
        <>
          {view === PREDICTION_JOURNEY_VIEW.GROUPS && (
            <GroupEditor reference={reference} draft={draft} disabled={readOnly} onChange={updateGroup} />
          )}

          {view === PREDICTION_JOURNEY_VIEW.KNOCKOUT && (
            <>
              {summary.groupComplete < 36 && (
                <div className="journey-warning-box">
                  <strong>Complete all 36 group scores to unlock the predicted knockout bracket.</strong>
                  <p>The same canonical group-table and best-third resolver is used for guest, account and future live contexts.</p>
                </div>
              )}
              {summary.preview.diagnostics.length > 0 && (
                <div className="journey-warning-box journey-warning-box--action">
                  <div>
                    <strong>Some knockout picks no longer match the predicted bracket.</strong>
                    <p>Clear the stale selections before continuing.</p>
                  </div>
                  <button type="button" onClick={clearStale} disabled={readOnly}>Clear stale picks</button>
                </div>
              )}
              <KnockoutEditor
                reference={reference}
                draft={draft}
                preview={summary.preview}
                disabled={readOnly || summary.groupComplete < 36}
                onChange={updateKnockout}
              />
            </>
          )}

          {view === PREDICTION_JOURNEY_VIEW.REVIEW && (
            <ReviewPanel
              reference={reference}
              summary={summary}
              context={context}
              reviewMode={reviewMode}
              locked={locked}
              busy={busy}
              onSubmit={submitReview}
              onEdit={editPredictions}
            />
          )}
        </>
      )}

      {!lockConfigured && (
        <p className="guest-notice guest-notice--warning">
          Account autosave is intentionally blocked until the official first kick-off lock is configured. Guest browser saving still works.
        </p>
      )}
      {notice && <p className={`guest-notice guest-notice--${notice.tone}`} role="status">{notice.message}</p>}

      <div className="journey-footer-meta">
        <span>{EURO28_PREDICTION_JOURNEY_VERSION}</span>
        <span>Jokers hidden until both caps are confirmed</span>
        <span>{summary.savableRows} rows currently valid for atomic saving</span>
      </div>
    </section>
  )
}
