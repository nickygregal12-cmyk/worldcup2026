import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Card, Dialog, LinkButton } from '../design-system/index.jsx'
import { buildGuestReviewStorageKey } from '../journey/index.js'
import { buildKoPredictorRows, loadMyKoPredictionBundle, saveMyKoPredictionBundle } from '../koPredictor/index.js'
import { importGuestDraftToAccount, loadMyPredictionBundle } from '../predictions/index.js'
import { GUEST_STATE_UPDATED_EVENT } from '../predictions/predictionSaveConfig.js'
import { createGuestPredictionStorage } from './guestPredictionStorage.js'
import { createGuestKoPredictionStorage } from './guestKoPredictionStorage.js'
import { buildGuestAccountTransferPrompt, buildGuestAccountTransferSummary } from './guestAccountTransferModel.js'
import { browserStorage, koStatus, messageForError, originalStatus } from './guestAccountTransferPresentation.js'
import styles from './GuestAccountTransfer.module.css'


export function GuestAccountTransferPanel({ snapshot, prompt, busy, notice, transfer, startFresh, asDialog = false }) {
  return (
    <Card className={`${styles.card} ${asDialog ? styles.dialogCard : ''}`.trim()} aria-labelledby="guest-transfer-heading">
      <div className={styles.heading}>
        <div>
          <span>Saved on this device</span>
          <h3 id="guest-transfer-heading">{prompt.heading}</h3>
          <p>{prompt.helper}</p>
        </div>
        <div className={styles.actions}>
          <Button onClick={transfer} loading={busy} disabled={!snapshot.transferable}>{prompt.primaryAction}</Button>
          <Button type="button" variant="secondary" onClick={startFresh} disabled={busy}>{prompt.secondaryAction}</Button>
        </div>
      </div>

      <div className={styles.rows}>
        {snapshot.hasOriginal && (
          <div>
            <strong>Original Predictor</strong>
            <span>{snapshot.originalCompleteness.complete}/51 complete</span>
            <small>{originalStatus(snapshot)}</small>
            {!snapshot.originalCompleteness.readyForAccountImport && !snapshot.accountOriginal && <LinkButton href="#/groups" variant="secondary" size="small">Continue Original Predictor</LinkButton>}
          </div>
        )}
        {snapshot.hasKo && (
          <div>
            <strong>KO Predictor</strong>
            <span>{snapshot.koSummary.complete}/{snapshot.koSummary.available} available fixtures complete</span>
            <small>{koStatus(snapshot)}</small>
            {snapshot.koSummary.complete === 0 && !snapshot.accountKo && <LinkButton href="#/ko-predictor" variant="secondary" size="small">Continue KO Predictor</LinkButton>}
          </div>
        )}
      </div>

      {notice && <p className={styles[notice.tone]} role={notice.tone === 'danger' ? 'alert' : 'status'}>{notice.message}</p>}
    </Card>
  )
}

export default function GuestAccountTransfer({ client, reference, userId, asDialog = false, open = true, onClose = () => {}, onComplete = () => {} }) {
  const storage = useMemo(() => browserStorage(), [])
  const originalStorage = useMemo(() => createGuestPredictionStorage({ storage, reference }), [reference, storage])
  const koStorage = useMemo(() => createGuestKoPredictionStorage({ storage, reference }), [reference, storage])
  const [snapshot, setSnapshot] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)

  const refresh = useCallback(async () => {
    if (!client || !userId) return
    const originalLoaded = originalStorage.load()
    const koLoaded = koStorage.load()
    const [accountOriginal, accountKo] = await Promise.all([
      loadMyPredictionBundle(client, reference.tournamentId, userId),
      loadMyKoPredictionBundle(client, reference.tournamentId, userId),
    ])

    const originalState = originalLoaded.status === 'ready' ? originalLoaded.state : null
    const koState = koLoaded.status === 'ready' ? koLoaded.state : null
    const summary = buildGuestAccountTransferSummary({
      reference,
      originalState,
      koState,
      accountOriginal,
      accountKo,
    })

    setSnapshot({ originalState, koState, accountOriginal, accountKo, ...summary })
  }, [client, koStorage, originalStorage, reference, userId])

  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      refresh().catch(error => setNotice({ tone: 'danger', message: messageForError(error) }))
    }, 0)
    const onGuestChange = () => refresh().catch(error => setNotice({ tone: 'danger', message: messageForError(error) }))
    globalThis.addEventListener?.(GUEST_STATE_UPDATED_EVENT, onGuestChange)
    return () => {
      globalThis.clearTimeout(timer)
      globalThis.removeEventListener?.(GUEST_STATE_UPDATED_EVENT, onGuestChange)
    }
  }, [refresh])

  if (!snapshot) return null

  const { hasOriginal, hasKo, canImportOriginal, canImportKo } = snapshot
  if (!hasOriginal && !hasKo) return null
  const prompt = buildGuestAccountTransferPrompt(snapshot)

  async function transfer() {
    setBusy(true)
    setNotice(null)
    const completed = []
    const retained = []
    try {
      if (canImportOriginal) {
        await importGuestDraftToAccount(client, {
          reference,
          state: snapshot.originalState,
          expectedRevision: 0,
        })
        originalStorage.clear()
        try { storage?.removeItem(buildGuestReviewStorageKey(reference)) } catch { /* Device storage may be unavailable. */ }
        completed.push('Original Predictor')
      } else if (hasOriginal) {
        retained.push(snapshot.accountOriginal
          ? 'Original Predictor already exists in this account'
          : `Original Predictor needs ${snapshot.originalCompleteness.remaining} more selection${snapshot.originalCompleteness.remaining === 1 ? '' : 's'}`)
      }

      if (canImportKo) {
        await saveMyKoPredictionBundle(client, {
          tournamentId: reference.tournamentId,
          expectedRevision: 0,
          predictions: buildKoPredictorRows(reference, snapshot.koState),
        })
        koStorage.clear()
        completed.push('KO Predictor')
      } else if (hasKo) {
        retained.push(snapshot.accountKo
          ? 'KO Predictor already exists in this account'
          : 'Complete at least one available KO fixture before import')
      }

      globalThis.dispatchEvent?.(new Event(GUEST_STATE_UPDATED_EVENT))
      await refresh()
      setNotice({
        tone: completed.length ? 'safe' : 'warning',
        message: completed.length
          ? `${completed.join(' and ')} kept safely with your account.${retained.length ? ` ${retained.join('. ')} remains on this device.` : ''}`
          : `${retained.join('. ')}. The device copy has not been removed.`,
      })
      if (completed.length) onComplete()
    } catch (error) {
      await refresh().catch(() => {})
      setNotice({
        tone: 'danger',
        message: completed.length
          ? `${completed.join(' and ')} saved successfully. ${messageForError(error)}`
          : messageForError(error),
      })
    } finally {
      setBusy(false)
    }
  }

  function startFresh() {
    originalStorage.clear()
    koStorage.clear()
    try { storage?.removeItem(buildGuestReviewStorageKey(reference)) } catch { /* Device storage may be unavailable. */ }
    setNotice(null)
    setSnapshot(null)
    globalThis.dispatchEvent?.(new Event(GUEST_STATE_UPDATED_EVENT))
    refresh().catch(error => setNotice({ tone: 'danger', message: messageForError(error) }))
    onComplete()
  }

  const panel = (
    <GuestAccountTransferPanel
      snapshot={snapshot}
      prompt={prompt}
      busy={busy}
      notice={notice}
      transfer={transfer}
      startFresh={startFresh}
      asDialog={asDialog}
    />
  )

  if (!asDialog) return panel

  return (
    <Dialog open={open} title={prompt.heading} onClose={onClose} className={styles.dialog}>
      {panel}
    </Dialog>
  )
}
