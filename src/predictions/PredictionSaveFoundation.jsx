import { useCallback, useEffect, useMemo, useState } from 'react'
import { createGuestPredictionStorage } from '../guest/guestPredictionStorage.js'
import { resolveGuestTournamentPreview } from '../guest/guestTournamentPreview.js'
import { GUEST_STATE_UPDATED_EVENT } from './predictionSaveConfig.js'
import { importGuestDraftToAccount, loadMyPredictionBundle } from './predictionSaveService.js'

function browserStorage() {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

function messageForError(error) {
  const message = error?.message ?? String(error)
  if (/revision is stale/i.test(message)) return 'Your account predictions changed elsewhere. Refresh before saving again.'
  if (/global lock/i.test(message)) return 'Prediction content is locked for the tournament.'
  if (/joker cap is not configured/i.test(message)) return 'Jokers cannot be imported until their tournament caps are confirmed.'
  if (/cannot overwrite existing account predictions/i.test(message)) return 'This account already has saved predictions, so the guest draft was not imported.'
  return message
}

function lockLabel(tournament) {
  if (tournament.prediction_locked_at) return 'Globally locked'
  if (!tournament.prediction_lock_at) return 'Lock time not configured'
  return new Date(tournament.prediction_lock_at) <= new Date() ? 'Globally locked' : 'Pre-lock'
}

export default function PredictionSaveFoundation({ client, reference, tournament }) {
  const storage = useMemo(() => createGuestPredictionStorage({
    storage: browserStorage(),
    reference,
  }), [reference])
  const [session, setSession] = useState(null)
  const [guestState, setGuestState] = useState(() => storage.load().state ?? null)
  const [accountBundle, setAccountBundle] = useState(null)
  const [loading, setLoading] = useState(Boolean(client))
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)

  const refreshGuest = useCallback(() => {
    const loaded = storage.load()
    setGuestState(loaded.status === 'ready' ? loaded.state : null)
  }, [storage])

  const refreshAccount = useCallback(async currentSession => {
    if (!client || !currentSession?.user) {
      setAccountBundle(null)
      return
    }
    setAccountBundle(await loadMyPredictionBundle(
      client,
      reference.tournamentId,
      currentSession.user.id,
    ))
  }, [client, reference.tournamentId])

  useEffect(() => {
    if (!client) return undefined
    let active = true
    client.auth.getSession().then(({ data, error }) => {
      if (!active) return undefined
      if (error) setNotice({ tone: 'danger', message: messageForError(error) })
      const nextSession = data?.session ?? null
      setSession(nextSession)
      return refreshAccount(nextSession)
    }).catch(error => {
      if (active) setNotice({ tone: 'danger', message: messageForError(error) })
    }).finally(() => {
      if (active) setLoading(false)
    })

    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      refreshAccount(nextSession).catch(error => {
        setNotice({ tone: 'danger', message: messageForError(error) })
      })
    })
    const handleGuestUpdate = () => refreshGuest()
    globalThis.addEventListener?.(GUEST_STATE_UPDATED_EVENT, handleGuestUpdate)

    return () => {
      active = false
      data.subscription.unsubscribe()
      globalThis.removeEventListener?.(GUEST_STATE_UPDATED_EVENT, handleGuestUpdate)
    }
  }, [client, refreshAccount, refreshGuest])

  const preview = useMemo(() => {
    if (!guestState) return null
    try {
      return resolveGuestTournamentPreview(reference, guestState)
    } catch {
      return null
    }
  }, [guestState, reference])

  const signedIn = Boolean(session?.user)
  const readyForImport = Boolean(preview?.completeness.overall.readyForAccountImport)
  const hasAccountRows = Boolean(accountBundle?.predictions?.length)
  const lockConfigured = Boolean(tournament.prediction_lock_at)
  const locked = Boolean(tournament.prediction_locked_at) ||
    Boolean(tournament.prediction_lock_at && new Date(tournament.prediction_lock_at) <= new Date())
  const importAllowed = signedIn && readyForImport && lockConfigured && !locked && !hasAccountRows

  async function importGuestDraft() {
    setBusy(true)
    setNotice(null)
    try {
      const result = await importGuestDraftToAccount(client, {
        reference,
        state: guestState,
        expectedRevision: accountBundle?.revision ?? 0,
      })
      await refreshAccount(session)
      setNotice({
        tone: 'safe',
        message: `All ${result.savedPredictionCount} guest predictions were imported atomically at account revision ${result.revision}. The browser draft was retained.`,
      })
    } catch (error) {
      setNotice({ tone: 'danger', message: messageForError(error) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="foundation-panel prediction-save-foundation" aria-labelledby="prediction-save-title">
      <div className="foundation-section-heading prediction-save-foundation__heading">
        <div>
          <span className="foundation-kicker">Stage 6 · Atomic prediction saving</span>
          <h2 id="prediction-save-title">Trusted account prediction storage</h2>
          <p className="foundation-panel-copy">
            Account saves now use one server-validated full-bundle transaction with revision, lock,
            bracket, grace and joker checks. Direct browser table writes remain blocked.
          </p>
        </div>
        <span className={`foundation-pill foundation-pill--${locked ? 'danger' : lockConfigured ? 'safe' : 'warning'}`}>
          {lockLabel(tournament)}
        </span>
      </div>

      <div className="prediction-save-foundation__grid">
        <div className="prediction-save-card">
          <span>Account state</span>
          <strong>{loading ? 'Checking…' : signedIn ? 'Signed in' : 'Sign in required'}</strong>
          <span>Saved bundle</span>
          <strong>{accountBundle ? `${accountBundle.predictions.length} rows · revision ${accountBundle.revision}` : 'None'}</strong>
          <span>Review mode</span>
          <strong>{accountBundle?.submittedAt ? 'Submitted for review' : 'Editable draft'}</strong>
        </div>

        <div className="prediction-save-card">
          <span>Browser guest draft</span>
          <strong>{preview ? `${preview.completeness.overall.complete}/51 complete` : 'Unavailable'}</strong>
          <span>Import readiness</span>
          <strong>{readyForImport ? 'Complete and valid' : 'Needs all 51 predictions'}</strong>
          <button type="button" onClick={importGuestDraft} disabled={!importAllowed || busy}>
            {busy ? 'Importing…' : 'Import guest draft to account'}
          </button>
        </div>
      </div>

      {!signedIn && <p className="prediction-save-note">Sign in above before importing a complete guest draft.</p>}
      {signedIn && hasAccountRows && <p className="prediction-save-note">Guest import cannot replace existing account predictions. The Stage 7 editor will use the same atomic save route.</p>}
      {!lockConfigured && <p className="prediction-save-note">Account saving fails closed until the official first kick-off is configured.</p>}
      {notice && <p className={`guest-notice guest-notice--${notice.tone}`} role="status">{notice.message}</p>}
    </section>
  )
}
