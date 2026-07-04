import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { countTouchedOriginalRows, createGuestPredictionState, createGuestPredictionStorage } from '../guest/index.js'
import { importGuestDraftToAccount, loadMyPredictionBundle, saveMyPredictionBundle } from '../predictions/predictionSaveService.js'
import { GUEST_STATE_UPDATED_EVENT, PREDICTION_SAVE_SOURCE } from '../predictions/predictionSaveConfig.js'
import { hasActivePredictionGrace, isPredictionMatchStarted, loadMyPredictionGraceWindows, PREDICTION_COMPETITION_KEY } from '../grace/index.js'
import { PREDICTION_AUTOSAVE_DELAY_MS, PREDICTION_AUTOSAVE_STATE, PREDICTION_JOURNEY_VIEW } from './predictionJourneyConfig.js'
import { buildOriginalPredictionLifecycle, buildPredictionJourneyRows, clearStaleBracketSelections, createPredictionJourneyDraft, summarisePredictionJourney, updatePredictionJourneyGroup, updatePredictionJourneyBracket } from './predictionJourneyModel.js'
import { applyEuroLuckyDip } from './euroLuckyDip.js'
import PredictionJourneyView from './PredictionJourneyView.jsx'
import { loadCanonicalTournamentSnapshot } from '../results/resultService.js'
import { browserStorage, messageForError, readGuestReview, writeGuestReview } from './predictionJourneyRuntime.js'
import { resolveTournamentLifecycle } from '../config/index.js'

export default function PredictionJourney({ client, reference, tournament, initialView = PREDICTION_JOURNEY_VIEW.GROUPS, fixtureDraft = null }) {
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
  const [liveBracketState, setLiveBracketState] = useState(() => ({ status: client ? 'loading' : 'unavailable', snapshot: null, error: null }))
  const savingRef = useRef(false)

  const signedIn = Boolean(session?.user)
  const accountRows = accountBundle?.predictions?.length ?? 0
  const guestSummary = useMemo(() => summarisePredictionJourney(reference, guestDraft), [guestDraft, reference])
  const guestTouched = useMemo(() => countTouchedOriginalRows(guestDraft), [guestDraft])
  const guestTransferMode = signedIn && accountRows === 0 && guestTouched > 0
  const context = signedIn && !guestTransferMode ? 'account' : guestTransferMode ? 'guest-transfer' : 'guest'
  const draft = signedIn && !guestTransferMode ? accountDraft : guestDraft
  const summary = useMemo(() => summarisePredictionJourney(reference, draft), [reference, draft])
  const reviewMode = signedIn && !guestTransferMode ? Boolean(accountBundle?.submittedAt) : guestReview
  const lifecycle = useMemo(() => resolveTournamentLifecycle(tournament), [tournament])
  const lockConfigured = lifecycle.lockConfigured
  const locked = lifecycle.locked
  const readOnly = locked || reviewMode
  const surfaceLifecycle = useMemo(() => buildOriginalPredictionLifecycle(reference, lifecycle, summary), [reference, lifecycle, summary])

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


  useEffect(() => {
    if (!client) return undefined
    let active = true
    loadCanonicalTournamentSnapshot(client, reference)
      .then(snapshot => {
        if (active) setLiveBracketState({ status: 'ready', snapshot, error: null })
      })
      .catch(error => {
        if (active) setLiveBracketState({ status: 'error', snapshot: null, error: messageForError(error) })
      })
    return () => { active = false }
  }, [client, reference])

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
    if (!signedIn || guestTransferMode || accountLoading || reviewMode || !lockConfigured) return undefined
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
    guestTransferMode,
  ])

  function persistGuest(nextDraft, message = 'Saved on this device.') {
    const result = guestStorage.save(nextDraft)
    setGuestDraft(nextDraft)
    globalThis.dispatchEvent?.(new Event(GUEST_STATE_UPDATED_EVENT))
    setAutosaveStatus(PREDICTION_AUTOSAVE_STATE.LOCAL)
    setNotice(result.status === 'saved'
      ? null
      : { tone: 'warning', message: result.error ?? message })
  }

  function applyDraftUpdate(updater) {
    if (signedIn && !guestTransferMode) {
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
      if (!guestSummary.canSubmit) throw new Error('Complete all 51 device predictions before importing them to the account.')
      const result = await importGuestDraftToAccount(client, {
        reference,
        state: guestDraft,
        expectedRevision: accountBundle?.revision ?? 0,
      })
      await loadAccount(session)
      guestStorage.clear()
      setGuestReview(false)
      writeGuestReview(reference, false)
      setGuestDraft(createGuestPredictionState(reference))
      globalThis.dispatchEvent?.(new Event(GUEST_STATE_UPDATED_EVENT))
      setNotice({
        tone: 'safe',
        message: `Imported all ${result.savedPredictionCount} device predictions into the account at revision ${result.revision}.`,
      })
    } catch (error) {
      setNotice({ tone: 'danger', message: messageForError(error) })
    } finally {
      setBusy(false)
    }
  }


  function runLuckyDip(mode) {
    if (readOnly || locked) return
    try {
      const result = applyEuroLuckyDip(reference, draft, { mode })
      if (signedIn && !guestTransferMode) {
        setAccountDraft(result.draft)
        setEditVersion(value => value + 1)
      } else {
        persistGuest(result.draft)
      }
      setNotice({
        tone: 'safe',
        message: result.changed === 0
          ? 'Every group score is already filled.'
          : `Lucky Dip filled ${result.changed} group score${result.changed === 1 ? '' : 's'}. Jokers were not changed.`,
      })
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
    if (!signedIn || guestTransferMode) {
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
    if (!signedIn || guestTransferMode) {
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

  const canImportGuest = guestTransferMode && guestSummary.canSubmit && !locked && lockConfigured

  return (
    <PredictionJourneyView
      {...{
        reference, context, autosaveStatus, accountBundle, savedAt, summary, reviewMode, readOnly, signedIn,
        accountRows, guestSummary, guestTouched, guestTransferMode, canImportGuest, busy, importGuestDraft,
        view, setView, sessionLoading, accountLoading, draft, locked, graceWindows, activeGroupMatchNumber,
        updateGroup, runLuckyDip, clearStale, updateBracket, submitReview, editPredictions, lockConfigured, lifecycle, surfaceLifecycle, notice, liveBracketState,
      }}
    />
  )
}
