import { useCallback, useEffect, useMemo, useState } from 'react'
import GuestAccountPrompt from '../guest/GuestAccountPrompt.jsx'
import {
  countTouchedGuestKoRows,
  createGuestKoPredictionState,
  createGuestKoPredictionStorage,
  summariseGuestKoPredictionState,
  updateGuestKoPredictionState,
} from '../guest/index.js'
import { GUEST_STATE_UPDATED_EVENT } from '../predictions/predictionSaveConfig.js'
import KoPredictorMatchCentre from './KoPredictorMatchCentre.jsx'
import { useTournamentLifecycle } from '../config/index.js'
import { buildKoPredictorLifecycleStatus } from './koPredictorPresentationModel.js'
import { buildKoPredictorRows, createKoPredictorDraft, summariseKoPredictor, updateKoPredictorDraft } from './koPredictorModel.js'
import { loadMyKoPredictionBundle, loadMyKoPredictorStanding, saveMyKoPredictionBundle } from './koPredictorService.js'

function browserStorage() {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export default function KoPredictor({ client, reference, tournament = {}, fixtureBundle, fixtureStanding }) {
  const fixtureMode = fixtureBundle !== undefined
  const guestStorage = useMemo(() => createGuestKoPredictionStorage({ storage: browserStorage(), reference }), [reference])
  const [session, setSession] = useState(() => fixtureMode ? { user: { id: 'visual-user' } } : null)
  const [bundle, setBundle] = useState(() => fixtureBundle ?? null)
  const [standing, setStanding] = useState(() => fixtureStanding ?? { points: 0, rank: null })
  const [guestDraft, setGuestDraft] = useState(() => {
    const loaded = guestStorage.load()
    return loaded.status === 'ready' ? loaded.state : createGuestKoPredictionState(reference)
  })
  const [accountDraft, setAccountDraft] = useState(() => createKoPredictorDraft(reference, fixtureBundle ?? null))
  const [notice, setNotice] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveState, setSaveState] = useState(() => fixtureMode ? 'dirty' : 'idle')

  const signedIn = Boolean(session?.user)
  const guestSummary = useMemo(() => summariseGuestKoPredictionState(reference, guestDraft), [guestDraft, reference])
  const guestTouched = useMemo(() => countTouchedGuestKoRows(guestDraft), [guestDraft])
  const accountRows = bundle?.predictions?.length ?? 0
  const guestTransferMode = !fixtureMode && signedIn && accountRows === 0 && guestTouched > 0
  const storageContext = fixtureMode || (signedIn && !guestTransferMode) ? 'account' : guestTransferMode ? 'guest-transfer' : 'guest'
  const draft = storageContext === 'account' ? accountDraft : guestDraft
  const summary = useMemo(() => summariseKoPredictor(reference, draft), [reference, draft])
  const lifecycle = useTournamentLifecycle(tournament)
  const lifecycleStatus = useMemo(() => buildKoPredictorLifecycleStatus(reference, lifecycle, summary), [reference, lifecycle, summary])

  const load = useCallback(async nextSession => {
    if (!nextSession?.user) {
      const loaded = guestStorage.load()
      const touched = loaded.status === 'ready' ? countTouchedGuestKoRows(loaded.state) : 0
      setBundle(null)
      setStanding({ points: 0, rank: null })
      setAccountDraft(createKoPredictorDraft(reference))
      setSaveState(touched > 0 ? 'local' : 'idle')
      return
    }
    const [nextBundle, nextStanding] = await Promise.all([
      loadMyKoPredictionBundle(client, reference.tournamentId, nextSession.user.id),
      loadMyKoPredictorStanding(client, reference.tournamentId, nextSession.user.id),
    ])
    setBundle(nextBundle)
    setStanding(nextStanding)
    setAccountDraft(createKoPredictorDraft(reference, nextBundle))
    const loaded = guestStorage.load()
    const touched = loaded.status === 'ready' ? countTouchedGuestKoRows(loaded.state) : 0
    setSaveState(nextBundle ? 'saved' : touched > 0 ? 'local' : 'idle')
  }, [client, guestStorage, reference])

  useEffect(() => {
    if (fixtureMode || !client) return undefined
    let active = true
    client.auth.getSession().then(({ data, error }) => {
      if (error) throw error
      const nextSession = data?.session ?? null
      if (!active) return
      setSession(nextSession)
      return load(nextSession)
    }).catch(error => { if (active) setNotice(error.message) })
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      load(nextSession).catch(error => setNotice(error.message))
    })
    return () => { active = false; data.subscription.unsubscribe() }
  }, [client, fixtureMode, load])

  function change(match, patch) {
    try {
      if (storageContext === 'account') {
        setAccountDraft(current => updateKoPredictorDraft(current, match, patch))
        setSaveState('dirty')
      } else {
        const next = updateGuestKoPredictionState(guestDraft, reference, match, patch)
        const result = guestStorage.save(next)
        setGuestDraft(next)
        setSaveState(result.status === 'saved' ? 'local' : 'error')
        setNotice(result.status === 'saved' ? null : result.error)
        globalThis.dispatchEvent?.(new Event(GUEST_STATE_UPDATED_EVENT))
      }
      if (storageContext === 'account') setNotice(null)
    } catch (error) {
      setNotice(error.message)
      setSaveState('error')
    }
  }

  async function save() {
    if (fixtureMode) {
      setSaveState('saved')
      setNotice('Visual fixture saved separately.')
      return
    }
    if (!signedIn) {
      setNotice('KO predictions are already saved on this device. Create an account when you want them to score.')
      return
    }

    setSaving(true)
    setSaveState('saving')
    try {
      const sourceDraft = guestTransferMode ? guestDraft : accountDraft
      const result = await saveMyKoPredictionBundle(client, {
        tournamentId: reference.tournamentId,
        expectedRevision: guestTransferMode ? 0 : bundle?.revision ?? 0,
        predictions: buildKoPredictorRows(reference, sourceDraft),
      })
      if (guestTransferMode) {
        guestStorage.clear()
        setGuestDraft(createGuestKoPredictionState(reference))
        globalThis.dispatchEvent?.(new Event(GUEST_STATE_UPDATED_EVENT))
      }
      await load(session)
      setSaveState('saved')
      setNotice(guestTransferMode
        ? `Saved browser KO predictions into the account at revision ${result.revision}.`
        : `KO Predictor saved separately at revision ${result.revision}.`)
    } catch (error) {
      setNotice(error.message)
      setSaveState('error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <KoPredictorMatchCentre
        reference={reference}
        draft={draft}
        summary={summary}
        lifecycleStatus={lifecycleStatus}
        standing={standing}
        saveState={saveState}
        storageContext={storageContext}
        notice={notice}
        saving={saving}
        onChange={change}
        onSave={save}
      />
      {storageContext === 'guest' && <GuestAccountPrompt completed={guestTouched} total={guestSummary.available} label="available KO fixtures started" />}
    </>
  )
}
