import { PredictionStateBadge } from '../design-system/index.jsx'
import GuestAccountPrompt from '../guest/GuestAccountPrompt.jsx'
import { hasActivePredictionGrace } from '../grace/index.js'
import OriginalBracket from './OriginalBracket.jsx'
import { OriginalBracketHealth } from '../bracketHealth/index.js'
import GroupsPredictor from './GroupsPredictor.jsx'
import PredictionReview from './PredictionReview.jsx'
import lifecycleStyles from './PredictionLifecycle.module.css'
import chromeStyles from './PredictionJourneyChrome.module.css'
import { EURO28_PREDICTION_JOURNEY_VERSION, PREDICTION_AUTOSAVE_STATE, PREDICTION_JOURNEY_VIEW } from './predictionJourneyConfig.js'

function AutosaveBadge({ context, status, revision, savedAt }) {
  let label = 'Ready'
  if (context === 'guest') {
    label = 'Saved on this device'
  } else if (context === 'guest-transfer') {
    label = 'Saved on this device'
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
  guestTouched, busy, view, setView, surface, sessionLoading, accountLoading, draft, locked, graceWindows, activeGroupMatchNumber,
  updateGroup, runLuckyDip, clearStale, updateBracket, submitReview, editPredictions, lockConfigured, lifecycle, surfaceLifecycle, notice, liveBracketState,
}) {
  const compactSurface = surface === PREDICTION_JOURNEY_VIEW.GROUPS || surface === PREDICTION_JOURNEY_VIEW.BRACKET
  return (
    <section className="foundation-panel prediction-journey" aria-labelledby="prediction-journey-title">
      {compactSurface && <h2 id="prediction-journey-title" className="sr-only">Original Predictor workspace</h2>}
      {compactSurface ? (
        <details className={chromeStyles.statusDisclosure}>
          <summary>
            <div className={chromeStyles.statusTitle}>
              <span className={chromeStyles.statusKicker}>Original Predictor</span>
              <strong>{surface === PREDICTION_JOURNEY_VIEW.GROUPS ? 'Group scores workspace' : 'Bracket picks workspace'}</strong>
            </div>
            <span className={chromeStyles.statusCount}>{summary.totalComplete}/51 complete</span>
            <AutosaveBadge context={context} status={autosaveStatus} revision={accountBundle?.revision ?? 0} savedAt={savedAt} />
          </summary>
          <div className={chromeStyles.statusPanel}>
            <div className="journey-progress">
              <div><strong>{summary.totalComplete}/51</strong><span>predictions complete</span></div>
              <div className="journey-progress__bar" aria-hidden="true"><span style={{ width: `${Math.round((summary.totalComplete / 51) * 100)}%` }} /></div>
              <div><span>{context === 'account' ? 'Account workspace' : context === 'guest-transfer' ? 'Saved on this device' : 'Guest workspace'}</span><strong>{reviewMode ? 'Review mode' : readOnly ? 'Locked' : 'Editable'}</strong></div>
            </div>
            <div className={lifecycleStyles.lifecycle} aria-label="Original Predictor timing">
              <article className={`${lifecycleStyles.card} ${lifecycleStyles[surfaceLifecycle.lockTone] ?? ''}`}><span>Prediction lock</span><strong>{surfaceLifecycle.lockLabel}</strong><small>{surfaceLifecycle.provisional ? 'Using the current provisional Euro 2028 rules' : `Source: ${surfaceLifecycle.source}`}</small></article>
              <article className={lifecycleStyles.card}><span>Groups</span><strong>{surfaceLifecycle.groupsLabel}</strong><small>Scores and five group-stage jokers only</small></article>
              <article className={lifecycleStyles.card}><span>Original bracket</span><strong>{surfaceLifecycle.bracketLabel}</strong><small>Winner-only picks; no bracket jokers</small></article>
              <article className={lifecycleStyles.card}><span>Competition boundary</span><strong>{surfaceLifecycle.koBoundaryLabel}</strong><small>Original points never mix with KO Predictor points</small></article>
            </div>
          </div>
        </details>
      ) : (
        <>
          <div className="foundation-section-heading prediction-journey__heading">
            <div className={chromeStyles.statusTitle}>
              <span className="foundation-kicker">Original Predictor</span>
              <h2 id="prediction-journey-title">Predict the full Euro 2028 tournament</h2>
              <p className="foundation-panel-copy">Group scores drive the winner-only bracket. This original competition is completely separate from the real-match KO Predictor and its points.</p>
            </div>
            <AutosaveBadge context={context} status={autosaveStatus} revision={accountBundle?.revision ?? 0} savedAt={savedAt} />
          </div>
          <div className="journey-progress">
            <div><strong>{summary.totalComplete}/51</strong><span>predictions complete</span></div>
            <div className="journey-progress__bar" aria-hidden="true"><span style={{ width: `${Math.round((summary.totalComplete / 51) * 100)}%` }} /></div>
            <div><span>{context === 'account' ? 'Account workspace' : context === 'guest-transfer' ? 'Saved on this device' : 'Guest workspace'}</span><strong>{reviewMode ? 'Review mode' : readOnly ? 'Locked' : 'Editable'}</strong></div>
          </div>
          <div className={lifecycleStyles.lifecycle} aria-label="Original Predictor timing">
            <article className={`${lifecycleStyles.card} ${lifecycleStyles[surfaceLifecycle.lockTone] ?? ''}`}><span>Prediction lock</span><strong>{surfaceLifecycle.lockLabel}</strong><small>{surfaceLifecycle.provisional ? 'Using the current provisional Euro 2028 rules' : `Source: ${surfaceLifecycle.source}`}</small></article>
            <article className={lifecycleStyles.card}><span>Groups</span><strong>{surfaceLifecycle.groupsLabel}</strong><small>Scores and five group-stage jokers only</small></article>
            <article className={lifecycleStyles.card}><span>Original bracket</span><strong>{surfaceLifecycle.bracketLabel}</strong><small>Winner-only picks; no bracket jokers</small></article>
            <article className={lifecycleStyles.card}><span>Competition boundary</span><strong>{surfaceLifecycle.koBoundaryLabel}</strong><small>Original points never mix with KO Predictor points</small></article>
          </div>
        </>
      )}

      {!signedIn && <GuestAccountPrompt completed={guestTouched} total={51} label="Original Predictor selections started" />}

      {!compactSurface && (
        <nav className="journey-tabs" aria-label="Prediction sections">
          {[
            [PREDICTION_JOURNEY_VIEW.GROUPS, 'Groups', `${summary.groupComplete}/36`],
            [PREDICTION_JOURNEY_VIEW.BRACKET, 'Bracket', `${summary.bracketComplete}/15`],
            [PREDICTION_JOURNEY_VIEW.REVIEW, 'Review', summary.canSubmit ? 'Ready' : `${summary.remaining} left`],
          ].map(([value, label, note]) => (
            <button type="button" key={value} className={view === value ? 'journey-tab journey-tab--active' : 'journey-tab'} onClick={() => setView(value)}>
              <span>{label}</span><small>{note}</small>
            </button>
          ))}
        </nav>
      )}

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
                  <p>The same official group-table and best-third rules are used for guest, account and future live views.</p>
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
          Account autosave is intentionally blocked until the prediction lock is configured. Guest device saving still works.
        </p>
      )}
      {lifecycle?.provisional && (
        <p className="guest-notice guest-notice--safe">
          Account autosave is enabled from the central provisional Euro 2028 lock configuration. This does not apply the irreversible tournament lock.
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
