import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createGuestPredictionState, createGuestPredictionStorage, importGuestPredictionBundle, serialiseGuestPredictionBundle, buildGuestBundleFilename } from '../guest/index.js'
import { importGuestDraftToAccount, loadMyPredictionBundle, saveMyPredictionBundle } from '../predictions/predictionSaveService.js'
import { GUEST_STATE_UPDATED_EVENT, PREDICTION_SAVE_SOURCE } from '../predictions/predictionSaveConfig.js'
import { hasActivePredictionGrace, isPredictionMatchStarted, loadMyPredictionGraceWindows, PREDICTION_COMPETITION_KEY } from '../grace/index.js'
import { PREDICTION_AUTOSAVE_DELAY_MS, PREDICTION_AUTOSAVE_STATE, PREDICTION_JOURNEY_VIEW } from './predictionJourneyConfig.js'
import { buildPredictionJourneyRows, clearStaleBracketSelections, createPredictionJourneyDraft, summarisePredictionJourney, updatePredictionJourneyGroup, updatePredictionJourneyBracket } from './predictionJourneyModel.js'
import PredictionJourneyView from './PredictionJourneyView.jsx'
import { browserStorage, messageForError, readGuestReview, writeGuestReview } from './predictionJourneyRuntime.js'

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
    <PredictionJourneyView
      {...{
        reference, context, autosaveStatus, accountBundle, savedAt, summary, reviewMode, readOnly, signedIn,
        accountRows, guestSummary, canImportGuest, busy, importGuestDraft, exportGuest, importGuestFile,
        view, setView, sessionLoading, accountLoading, draft, locked, graceWindows, activeGroupMatchNumber,
        updateGroup, clearStale, updateBracket, submitReview, editPredictions, lockConfigured, notice,
      }}
    />
  )
}
