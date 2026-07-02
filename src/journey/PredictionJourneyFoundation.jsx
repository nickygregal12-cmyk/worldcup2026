import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  hasActivePredictionGrace,
  isPredictionMatchStarted,
  loadMyPredictionGraceWindows,
  PREDICTION_COMPETITION_KEY,
} from '../grace/index.js'
import { PredictionStateBadge, TeamLabel } from '../design-system/index.jsx'
import GroupsPredictor from './GroupsPredictor.jsx'
import PredictionReview from './PredictionReview.jsx'
import {
  EURO28_PREDICTION_JOURNEY_VERSION,
  PREDICTION_AUTOSAVE_DELAY_MS,
  PREDICTION_AUTOSAVE_STATE,
  PREDICTION_JOURNEY_VIEW,
} from './predictionJourneyConfig.js'
import {
  buildGuestReviewStorageKey,
  buildPredictionJourneyRows,
  clearStaleBracketSelections,
  createPredictionJourneyDraft,
  summarisePredictionJourney,
  updatePredictionJourneyGroup,
  updatePredictionJourneyBracket,
} from './predictionJourneyModel.js'

function browserStorage() {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
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
  if (/joker cap/i.test(message)) return 'The configured joker limit has been reached.'
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

function AutosaveBadge({ context, status, revision, savedAt }) {
  let label = 'Ready'
  if (context === 'guest') {
    label = 'Saved in this browser'
  } else if (status === PREDICTION_AUTOSAVE_STATE.SAVING) {
    label = 'Saving…'
  } else if (status === PREDICTION_AUTOSAVE_STATE.DIRTY) {
    label = 'Changes queued'
  } else if (status === PREDICTION_AUTOSAVE_STATE.SAVED) {
    label = `Saved · revision ${revision}`
  } else if (status === PREDICTION_AUTOSAVE_STATE.CONFLICT) {
    label = 'Reload required'
  } else if (status === PREDICTION_AUTOSAVE_STATE.ERROR) {
    label = 'Save failed'
  } else if (status === PREDICTION_AUTOSAVE_STATE.LOCKED) {
    label = 'Predictions locked'
  } else if (revision > 0) {
    label = `Account revision ${revision}`
  }

  const state = context === 'guest' ? 'local' : status === PREDICTION_AUTOSAVE_STATE.IDLE ? 'empty' : status
  return (
    <div className="journey-autosave" aria-live="polite">
      <PredictionStateBadge state={state} label={label} />
      {savedAt && status === PREDICTION_AUTOSAVE_STATE.SAVED && (
        <small>{new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(savedAt)}</small>
      )}
    </div>
  )
}

const ROUND_LABELS = Object.freeze({
  round_of_16: 'Round of 16',
  quarter_final: 'Quarter-finals',
  semi_final: 'Semi-finals',
  final: 'Final',
})

function BracketEditor({ reference, draft, preview, contentLocked, reviewMode, graceWindows, onChange }) {
  const rounds = ['round_of_16', 'quarter_final', 'semi_final', 'final']

  return (
    <div className="journey-bracket-rounds">
      <div className="journey-joker-summary journey-joker-summary--neutral">
        <div>
          <strong>Pre-tournament bracket — winner picks only</strong>
          <span>No scores, decision methods or jokers are attached to this bracket. The separate KO Predictor opens for real knockout fixtures.</span>
        </div>
        <span className="foundation-pill">0 bracket jokers</span>
      </div>
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
                const row = draft.bracketPredictions[String(match.matchNumber)]
                const referenceMatch = reference.knockoutMatches.find(item => item.matchNumber === match.matchNumber)
                const hasGrace = hasActivePredictionGrace(graceWindows, {
                  competitionKey: PREDICTION_COMPETITION_KEY.ORIGINAL,
                  matchId: referenceMatch?.matchId,
                })
                const matchDisabled = reviewMode || (contentLocked && !hasGrace) || !match.participantsResolved
                return (
                  <article className={`journey-knockout-card${match.participantsResolved ? '' : ' journey-knockout-card--blocked'}`} key={match.matchNumber}>
                    <div className="journey-knockout-card__meta">
                      <strong>Match {match.matchNumber}</strong>
                      <span>{formatDate(referenceMatch?.scheduledDate)}</span>
                    </div>

                    {!match.participantsResolved ? (
                      <p className="journey-blocked-copy">Complete the earlier predictions that feed this match.</p>
                    ) : (
                      <div className="journey-bracket-pick-row">
                        {[match.homeTeamId, match.awayTeamId].map(teamId => (
                          <button
                            type="button"
                            key={teamId}
                            className={row.advancingTeamId === teamId ? 'journey-bracket-team journey-bracket-team--selected' : 'journey-bracket-team'}
                            disabled={matchDisabled}
                            aria-pressed={row.advancingTeamId === teamId}
                            onClick={() => onChange(match, row.advancingTeamId === teamId ? null : teamId)}
                          >
                            <TeamLabel team={reference.teamsById?.[teamId]} compact />
                            <small>{row.advancingTeamId === teamId ? 'Selected to advance' : 'Pick to advance'}</small>
                          </button>
                        ))}
                      </div>
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

export default function PredictionJourneyFoundation({ client, reference, tournament, initialView = PREDICTION_JOURNEY_VIEW.GROUPS, fixtureDraft = null }) {
  const guestStorage = useMemo(() => createGuestPredictionStorage({
    storage: browserStorage(),
    reference,
  }), [reference])
  const [session, setSession] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(Boolean(client))
  const [guestDraft, setGuestDraft] = useState(() => {
    if (fixtureDraft) return fixtureDraft
    const loaded = guestStorage.load()
    return loaded.status === 'ready' ? loaded.state : createGuestPredictionState(reference)
  })
  const [guestReview, setGuestReview] = useState(() => readGuestReview(reference))
  const [accountBundle, setAccountBundle] = useState(null)
  const [graceWindows, setGraceWindows] = useState([])
  const [accountDraft, setAccountDraft] = useState(() => createPredictionJourneyDraft(reference))
  const [accountLoading, setAccountLoading] = useState(false)
  const [view, setView] = useState(() => Object.values(PREDICTION_JOURNEY_VIEW).includes(initialView) ? initialView : PREDICTION_JOURNEY_VIEW.GROUPS)
  const [editVersion, setEditVersion] = useState(0)
  const [savedEditVersion, setSavedEditVersion] = useState(0)
  const [autosaveStatus, setAutosaveStatus] = useState(PREDICTION_AUTOSAVE_STATE.IDLE)
  const [savedAt, setSavedAt] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  const [activeGroupMatchNumber, setActiveGroupMatchNumber] = useState(null)
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
      setGraceWindows([])
      setAccountDraft(createPredictionJourneyDraft(reference))
      setEditVersion(0)
      setSavedEditVersion(0)
      return
    }

    setAccountLoading(true)
    try {
      const [bundle, grace] = await Promise.all([
        loadMyPredictionBundle(client, reference.tournamentId, nextSession.user.id),
        loadMyPredictionGraceWindows(client, reference.tournamentId, nextSession.user.id),
      ])
      setAccountBundle(bundle)
      setGraceWindows(grace)
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
    if (!lockConfigured) {
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
  }, [accountBundle, client, lockConfigured, reference, session])

  useEffect(() => {
    if (!signedIn || accountLoading || reviewMode || !lockConfigured) return undefined
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

  function applyDraftUpdate(updater) {
    if (signedIn) {
      setAccountDraft(current => updater(current))
      setEditVersion(value => value + 1)
      return
    }
    persistGuest(updater(guestDraft))
  }

  function updateGroup(match, patch) {
    if (reviewMode) return
    setActiveGroupMatchNumber(match.matchNumber)
    const hasGrace = hasActivePredictionGrace(graceWindows, {
      competitionKey: PREDICTION_COMPETITION_KEY.ORIGINAL,
      matchId: match.matchId,
    })
    const scoreChange = Object.hasOwn(patch, 'homeScore') || Object.hasOwn(patch, 'awayScore')
    if (scoreChange && locked && !hasGrace) return
    if (Object.hasOwn(patch, 'jokerApplied') && isPredictionMatchStarted(match)) return
    applyDraftUpdate(current => updatePredictionJourneyGroup(current, {
      matchNumber: match.matchNumber,
      ...patch,
    }))
  }

  function updateBracket(match, advancingTeamId) {
    if (reviewMode) return
    const referenceMatch = reference.knockoutMatches.find(item => item.matchNumber === match.matchNumber)
    const hasGrace = hasActivePredictionGrace(graceWindows, {
      competitionKey: PREDICTION_COMPETITION_KEY.ORIGINAL,
      matchId: referenceMatch?.matchId,
    })
    if (locked && !hasGrace) return
    applyDraftUpdate(current => updatePredictionJourneyBracket(current, match, advancingTeamId))
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
    if (readOnly) return
    applyDraftUpdate(current => clearStaleBracketSelections(reference, current))
    setNotice({ tone: 'safe', message: 'Stale bracket selections were cleared.' })
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
          <span className="foundation-kicker">Original Predictor</span>
          <h2 id="prediction-journey-title">Predict the full Euro 2028 tournament</h2>
          <p className="foundation-panel-copy">
            Group scores drive one canonical winner-only bracket. This original competition is completely separate from the real-match KO Predictor and its points.
          </p>
        </div>
        <AutosaveBadge
          context={context}
          status={autosaveStatus}
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
          [PREDICTION_JOURNEY_VIEW.BRACKET, 'Bracket', `${summary.bracketComplete}/15`],
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
            <GroupsPredictor
              reference={reference}
              draft={draft}
              summary={summary}
              scoreLocked={locked}
              reviewMode={reviewMode}
              graceWindows={graceWindows}
              autosaveStatus={autosaveStatus}
              context={context}
              activeMatchNumber={activeGroupMatchNumber}
              onChange={updateGroup}
              onOpenReview={() => setView(PREDICTION_JOURNEY_VIEW.REVIEW)}
            />
          )}

          {view === PREDICTION_JOURNEY_VIEW.BRACKET && (
            <>
              {summary.groupComplete < 36 && (
                <div className="journey-warning-box">
                  <strong>Complete all 36 group scores to unlock the predicted bracket.</strong>
                  <p>The same canonical group-table and best-third resolver is used for guest, account and future live contexts.</p>
                </div>
              )}
              {summary.preview.diagnostics.length > 0 && (
                <div className="journey-warning-box journey-warning-box--action">
                  <div>
                    <strong>Some bracket picks no longer match the predicted bracket.</strong>
                    <p>Clear the stale selections before continuing.</p>
                  </div>
                  <button type="button" onClick={clearStale} disabled={readOnly}>Clear stale picks</button>
                </div>
              )}
              <BracketEditor
                reference={reference}
                draft={draft}
                preview={summary.preview}
                contentLocked={locked || summary.groupComplete < 36}
                reviewMode={reviewMode}
                graceWindows={graceWindows}
                onChange={updateBracket}
              />
            </>
          )}

          {view === PREDICTION_JOURNEY_VIEW.REVIEW && (
            <PredictionReview
              reference={reference}
              draft={draft}
              summary={summary}
              context={context}
              reviewMode={reviewMode}
              locked={locked}
              busy={busy}
              onSubmit={submitReview}
              onEdit={editPredictions}
              onOpenGroups={() => setView(PREDICTION_JOURNEY_VIEW.GROUPS)}
              onOpenBracket={() => setView(PREDICTION_JOURNEY_VIEW.BRACKET)}
            />
          )}
        </>
      )}

      {signedIn && graceWindows.some(window => hasActivePredictionGrace(graceWindows, {
        competitionKey: window.competition_key,
        matchId: window.match_id,
      })) && (
        <p className="guest-notice guest-notice--safe">
          A temporary match-specific grace window is active. It applies only to the named competition and unstarted match, and expires automatically.
        </p>
      )}

      {!lockConfigured && (
        <p className="guest-notice guest-notice--warning">
          Account autosave is intentionally blocked until the official first kick-off lock is configured. Guest browser saving still works.
        </p>
      )}
      {notice && <p className={`guest-notice guest-notice--${notice.tone}`} role="status">{notice.message}</p>}

      <div className="journey-footer-meta">
        <span>{EURO28_PREDICTION_JOURNEY_VERSION}</span>
        <span>5 group jokers · no bracket jokers</span>
        <span>{summary.savableRows} rows currently valid for atomic saving</span>
      </div>
    </section>
  )
}
