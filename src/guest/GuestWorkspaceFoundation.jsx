import { useMemo, useState } from 'react'
import { GUEST_STATE_UPDATED_EVENT } from '../predictions/predictionSaveConfig.js'
import {
  buildGuestBundleFilename,
  createGuestPredictionState,
  createGuestPredictionStorage,
  importGuestPredictionBundle,
  resolveGuestTournamentPreview,
  serialiseGuestPredictionBundle,
} from './index.js'

function browserStorage() {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

function initialiseWorkspace(reference, storage) {
  const loaded = storage.load()
  if (loaded.status === 'ready') {
    return { state: loaded.state, storageStatus: 'restored', storageError: null }
  }
  const state = createGuestPredictionState(reference)
  const saved = storage.save(state)
  return {
    state,
    storageStatus: saved.status === 'saved' ? 'created' : loaded.status,
    storageError: saved.error ?? loaded.error ?? null,
  }
}

function ProgressRow({ label, complete, total, note }) {
  const percentage = total > 0 ? Math.round((complete / total) * 100) : 0
  return (
    <div className="guest-progress-row">
      <div>
        <strong>{label}</strong>
        <span>{note}</span>
      </div>
      <div className="guest-progress-row__value">
        <b>{complete}/{total}</b>
        <span>{percentage}%</span>
      </div>
    </div>
  )
}

export default function GuestWorkspaceFoundation({ reference }) {
  const storage = useMemo(() => createGuestPredictionStorage({
    storage: browserStorage(),
    reference,
  }), [reference])
  const [workspace, setWorkspace] = useState(() => initialiseWorkspace(reference, storage))
  const [notice, setNotice] = useState(null)
  const preview = useMemo(
    () => resolveGuestTournamentPreview(reference, workspace.state),
    [reference, workspace.state],
  )

  function persist(nextState, successMessage) {
    const saved = storage.save(nextState)
    setWorkspace({
      state: nextState,
      storageStatus: saved.status,
      storageError: saved.error ?? null,
    })
    globalThis.dispatchEvent?.(new Event(GUEST_STATE_UPDATED_EVENT))
    setNotice(saved.status === 'saved'
      ? { tone: 'safe', message: successMessage }
      : { tone: 'warning', message: saved.error ?? 'Progress remains available only in this tab.' })
  }

  function exportProgress() {
    const json = serialiseGuestPredictionBundle(workspace.state, reference)
    const blob = new Blob([json], { type: 'application/json' })
    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = buildGuestBundleFilename(reference)
    anchor.click()
    URL.revokeObjectURL(objectUrl)
    setNotice({ tone: 'safe', message: 'Guest progress exported as a portable JSON bundle.' })
  }

  async function importProgress(event) {
    const [file] = event.target.files ?? []
    event.target.value = ''
    if (!file) return

    try {
      const json = await file.text()
      const nextState = importGuestPredictionBundle(json, reference, workspace.state)
      persist(nextState, 'Guest progress imported and saved in this browser.')
    } catch (error) {
      setNotice({
        tone: 'danger',
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  function resetProgress() {
    storage.clear()
    const nextState = createGuestPredictionState(reference)
    persist(nextState, 'The browser-only guest draft has been cleared.')
  }

  const storageLabel = storage.available
    ? workspace.storageStatus === 'restored' ? 'Restored from this browser' : 'Saved in this browser'
    : 'Memory only'

  return (
    <section className="foundation-panel guest-foundation" aria-labelledby="guest-foundation-title">
      <div className="foundation-section-heading guest-foundation__heading">
        <div>
          <span className="foundation-kicker">Stage 4 · Guest/explore foundation</span>
          <h2 id="guest-foundation-title">Browser-only prediction workspace</h2>
          <p className="foundation-panel-copy">
            The 51-match draft structure is ready and uses the canonical guest resolver. Nothing is sent automatically; a complete draft can be imported only through the explicit Stage 6 action below.
          </p>
        </div>
        <span className="foundation-pill foundation-pill--safe">{storageLabel}</span>
      </div>

      <div className="guest-foundation__grid">
        <div className="guest-progress-card">
          <ProgressRow
            label="Group predictions"
            complete={preview.completeness.groups.complete}
            total={preview.completeness.groups.total}
            note="Complete score drafts"
          />
          <ProgressRow
            label="Knockout predictions"
            complete={preview.completeness.knockout.complete}
            total={preview.completeness.knockout.total}
            note="90-minute score, advancing team and method"
          />
          <ProgressRow
            label="Full tournament"
            complete={preview.completeness.overall.complete}
            total={preview.completeness.overall.total}
            note="Future account-import readiness"
          />
        </div>

        <div className="guest-data-card">
          <strong>Portable guest data</strong>
          <p>
            Exported bundles contain tournament predictions only. They contain no name, email,
            account identifier or scoring record.
          </p>
          <div className="guest-action-row">
            <button type="button" className="foundation-secondary-button" onClick={exportProgress}>
              Export progress
            </button>
            <label className="foundation-secondary-button guest-import-button">
              Import progress
              <input type="file" accept="application/json,.json" onChange={importProgress} />
            </label>
            <button type="button" className="guest-clear-button" onClick={resetProgress}>
              Clear browser draft
            </button>
          </div>
        </div>
      </div>

      <div className="guest-foundation__meta">
        <span>Revision {workspace.state.revision}</span>
        <span>{reference.referenceVersion}</span>
        <span>{preview.resolution.resolverVersion}</span>
      </div>

      {workspace.storageError && (
        <p className="guest-notice guest-notice--warning" role="status">{workspace.storageError}</p>
      )}
      {notice && (
        <p className={`guest-notice guest-notice--${notice.tone}`} role="status">{notice.message}</p>
      )}
    </section>
  )
}
