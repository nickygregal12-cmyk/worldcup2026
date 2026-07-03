import { PredictionStateBadge } from '../design-system/index.jsx'
import GuestAccountPrompt from '../guest/GuestAccountPrompt.jsx'
import { hasActivePredictionGrace } from '../grace/index.js'
import OriginalBracket from './OriginalBracket.jsx'
import { OriginalBracketHealth } from '../bracketHealth/index.js'
import GroupsPredictor from './GroupsPredictor.jsx'
import PredictionReview from './PredictionReview.jsx'
import { EURO28_PREDICTION_JOURNEY_VERSION, PREDICTION_AUTOSAVE_STATE, PREDICTION_JOURNEY_VIEW } from './predictionJourneyConfig.js'

function AutosaveBadge({ context, status, revision, savedAt }) {
  let label = 'Ready'
  if (context === 'guest') {
    label = 'Saved in this browser'
  } else if (context === 'guest-transfer') {
    label = 'Browser draft · ready to transfer'
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

  const state = context === 'guest' || context === 'guest-transfer' ? 'local' : status === PREDICTION_AUTOSAVE_STATE.IDLE ? 'empty' : status
  return (
    <div className="journey-autosave" aria-live="polite">
      <PredictionStateBadge state={state} label={label} />
      {savedAt && status === PREDICTION_AUTOSAVE_STATE.SAVED && (
        <small>{new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(savedAt)}</small>
      )}
    </div>
  )
}

export default function PredictionJourneyView({
  reference, context, autosaveStatus, accountBundle, savedAt, summary, reviewMode, readOnly, signedIn,
  accountRows, guestSummary, guestTouched, guestTransferMode, canImportGuest, busy, importGuestDraft,
  view, setView, sessionLoading, accountLoading, draft, locked, graceWindows, activeGroupMatchNumber,
  updateGroup, runLuckyDip, clearStale, updateBracket, submitReview, editPredictions, lockConfigured, notice, liveBracketState,
}) {
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
          <span>{context === 'account' ? 'Account workspace' : context === 'guest-transfer' ? 'Saved browser draft' : 'Guest workspace'}</span>
          <strong>{reviewMode ? 'Review mode' : readOnly ? 'Locked' : 'Editable'}</strong>
        </div>
      </div>

      {guestTransferMode && accountRows === 0 && (
        <div className="journey-import-strip">
          <div>
            <strong>Browser draft: {guestSummary.totalComplete}/51 complete</strong>
            <span>Keep editing this saved browser draft. Once all 51 selections are complete, one tap moves it into your account.</span>
          </div>
          <button type="button" onClick={importGuestDraft} disabled={!canImportGuest || busy}>
            {busy ? 'Adding…' : 'Add completed draft to account'}
          </button>
        </div>
      )}


      {!signedIn && <GuestAccountPrompt completed={guestTouched} total={51} label="Original Predictor selections started" />}

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
              onLuckyDip={runLuckyDip}
              luckyDipDisabled={readOnly || locked}
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
              <OriginalBracket
                reference={reference}
                draft={draft}
                preview={summary.preview}
                contentLocked={locked || summary.groupComplete < 36}
                reviewMode={reviewMode}
                graceWindows={graceWindows}
                onChange={updateBracket}
              />
              {(locked || reviewMode) && summary.bracketComplete > 0 && (
                <OriginalBracketHealth
                  reference={reference}
                  preview={summary.preview}
                  liveSnapshot={liveBracketState?.snapshot ?? null}
                  status={liveBracketState?.status ?? 'unavailable'}
                  error={liveBracketState?.error ?? null}
                />
              )}
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
