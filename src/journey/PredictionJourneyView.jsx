import { Button, PredictionStateBadge } from '../design-system/index.jsx'
import GuestAccountPrompt from '../guest/GuestAccountPrompt.jsx'
import { hasActivePredictionGrace } from '../grace/index.js'
import OriginalBracket from './OriginalBracket.jsx'
import { OriginalBracketHealth } from '../bracketHealth/index.js'
import GroupsPredictor from './GroupsPredictor.jsx'
import PredictionReview from './PredictionReview.jsx'
import lifecycleStyles from './PredictionLifecycle.module.css'
import chromeStyles from './PredictionJourneyChrome.module.css'
import { PREDICTION_AUTOSAVE_STATE, PREDICTION_JOURNEY_VIEW } from './predictionJourneyConfig.js'
import { PREDICTION_ACCOUNT_SAVE_UNAVAILABLE, PREDICTION_AUTOSAVE_NOTICE, PREDICTION_BRACKET_JOKERS_COPY, PREDICTION_GROUP_JOKERS_COPY, PREDICTION_GUEST_DECISION_COPY, PREDICTION_GUEST_IMPORT_INCOMPLETE, PREDICTION_GUEST_LOCAL_ONLY_NOTICE, PREDICTION_LOCK_NOTICE, PREDICTION_SAVE_CHECK_COPY } from './predictionJourneyCopy.js'

// Three honest states, never blurred:
//   guest           -> "Saved on this device" only; will NOT appear if this account signs in elsewhere.
//   signed in, saved-> "Saved to your account"; follows the account anywhere.
//   anything else   -> "Not saved", said plainly.
function AutosaveBadge({ context, status, revision, savedAt }) {
  let label = 'Not saved yet'
  if (context === 'guest') {
    label = 'Saved on this device only — not to an account'
  } else if (status === PREDICTION_AUTOSAVE_STATE.SAVING) {
    label = 'Saving to your account…'
  } else if (status === PREDICTION_AUTOSAVE_STATE.DIRTY) {
    label = 'Not saved yet — saving shortly'
  } else if (status === PREDICTION_AUTOSAVE_STATE.SAVED) {
    label = 'Saved to your account'
  } else if (status === PREDICTION_AUTOSAVE_STATE.CONFLICT) {
    label = 'Not saved — reload required'
  } else if (status === PREDICTION_AUTOSAVE_STATE.ERROR) {
    label = 'Not saved — save failed'
  } else if (status === PREDICTION_AUTOSAVE_STATE.LOCKED) {
    label = 'Predictions locked'
  } else if (revision > 0) {
    label = 'Saved to your account'
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

export default function PredictionJourneyView({
  reference, context, autosaveStatus, accountBundle, savedAt, summary, reviewMode, readOnly, signedIn,
  guestTouched, guestTransferMode, canImportGuest, importGuestDraft, discardGuestDraft,
  busy, view, setView, surface, sessionLoading, accountLoading, draft, locked, graceWindows, activeGroupMatchNumber,
  updateGroup, runLuckyDip, clearStale, updateBracket, submitReview, editPredictions, lockConfigured, lifecycle, surfaceLifecycle, notice, liveBracketState,
}) {
  const compactSurface = surface === PREDICTION_JOURNEY_VIEW.GROUPS || surface === PREDICTION_JOURNEY_VIEW.BRACKET
  // A re-cut surface stands on the DP page ground the shell paints (DP-SHELL).
  // `.foundation-panel` wrapped it in a legacy glass card with a 22px radius — off the
  // 4px scale entirely — which is what put a frame around the whole page and stopped the
  // ground landing beneath it. Groups dropped it at its own re-cut; Bracket carried it
  // until this one, and both surfaces are now re-cut. Review is not, and keeps its panel.
  const recut = compactSurface
  return (
    <section className={recut ? 'prediction-journey' : 'foundation-panel prediction-journey'} aria-labelledby="prediction-journey-title">
      {compactSurface && <h2 id="prediction-journey-title" className="sr-only">Original Predictor workspace</h2>}
      {compactSurface ? (
        <details className={chromeStyles.statusDisclosure}>
          <summary>
            <div className={chromeStyles.statusTitle}>
              <span className={chromeStyles.statusKicker}>Original Predictor</span>
              <strong>{surface === PREDICTION_JOURNEY_VIEW.GROUPS ? 'Group scores workspace' : 'Bracket picks workspace'}</strong>
            </div>
            {/* The whole-journey count — group scores AND bracket picks — belongs on a
                surface where it is the only count. It was dropped from Groups because the
                dock two inches below carries x/36, and stacking a /51 on a /36 asks the
                player to hold two denominators for overlapping things. It was kept on
                Bracket at that stage on the grounds that nothing there competed with it.
                After the Bracket re-cut something does: the round rail carries the bracket's
                own progress. So the same argument now retires it from both, and the figure
                lives where it is actionable — Home, which is Home's job. Review, which is
                not re-cut and has no progress display of its own, still shows it. */}
            {!recut && <span className={chromeStyles.statusCount}>{summary.totalComplete}/51 complete</span>}
            <AutosaveBadge context={context} status={autosaveStatus} revision={accountBundle?.revision ?? 0} savedAt={savedAt} />
          </summary>
          <div className={chromeStyles.statusPanel}>
            <div className="journey-progress">
              <div><strong>{summary.totalComplete}/51</strong><span>predictions complete</span></div>
              <div className="journey-progress__bar" aria-hidden="true"><span style={{ width: `${Math.round((summary.totalComplete / 51) * 100)}%` }} /></div>
              <div><span>{context === 'account' ? 'Account workspace' : 'Guest workspace — Saved on this device only'}</span><strong>{reviewMode ? 'Review mode' : readOnly ? 'Locked' : 'Editable'}</strong></div>
            </div>
            <div className={lifecycleStyles.lifecycle} aria-label="Original Predictor timing">
              <article className={`${lifecycleStyles.card} ${lifecycleStyles[surfaceLifecycle.lockTone] ?? ''}`}><span>Prediction lock</span><strong>{surfaceLifecycle.lockLabel}</strong><small>{surfaceLifecycle.provisional ? 'Current Euro 2028 rules' : `Source: ${surfaceLifecycle.source}`}</small></article>
              <article className={lifecycleStyles.card}><span>Groups</span><strong>{surfaceLifecycle.groupsLabel}</strong><small>Scores and five group-stage jokers only</small></article>
              <article className={lifecycleStyles.card}><span>Original bracket</span><strong>{surfaceLifecycle.bracketLabel}</strong><small>Winner-only picks; no bracket jokers</small></article>
              <article className={lifecycleStyles.card}><span>Separate points</span><strong>{surfaceLifecycle.koBoundaryLabel}</strong><small>Original Predictor and KO Predictor keep separate points</small></article>
            </div>
          </div>
        </details>
      ) : (
        <>
          <div className="foundation-section-heading prediction-journey__heading">
            <div className={chromeStyles.statusTitle}>
              <span className="foundation-kicker">Original Predictor</span>
              <h2 id="prediction-journey-title">Predict the full Euro 2028 tournament</h2>
              <p className="foundation-panel-copy">Group scores drive the winner-only bracket. This competition has its own picks and points, separate from KO Predictor.</p>
            </div>
            <AutosaveBadge context={context} status={autosaveStatus} revision={accountBundle?.revision ?? 0} savedAt={savedAt} />
          </div>
          <div className="journey-progress">
            <div><strong>{summary.totalComplete}/51</strong><span>predictions complete</span></div>
            <div className="journey-progress__bar" aria-hidden="true"><span style={{ width: `${Math.round((summary.totalComplete / 51) * 100)}%` }} /></div>
            <div><span>{context === 'account' ? 'Account workspace' : 'Guest workspace — Saved on this device only'}</span><strong>{reviewMode ? 'Review mode' : readOnly ? 'Locked' : 'Editable'}</strong></div>
          </div>
          <div className={lifecycleStyles.lifecycle} aria-label="Original Predictor timing">
            <article className={`${lifecycleStyles.card} ${lifecycleStyles[surfaceLifecycle.lockTone] ?? ''}`}><span>Prediction lock</span><strong>{surfaceLifecycle.lockLabel}</strong><small>{surfaceLifecycle.provisional ? 'Current Euro 2028 rules' : `Source: ${surfaceLifecycle.source}`}</small></article>
            <article className={lifecycleStyles.card}><span>Groups</span><strong>{surfaceLifecycle.groupsLabel}</strong><small>Scores and five group-stage jokers only</small></article>
            <article className={lifecycleStyles.card}><span>Original bracket</span><strong>{surfaceLifecycle.bracketLabel}</strong><small>Winner-only picks; no bracket jokers</small></article>
            <article className={lifecycleStyles.card}><span>Separate points</span><strong>{surfaceLifecycle.koBoundaryLabel}</strong><small>Original Predictor and KO Predictor keep separate points</small></article>
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
          {PREDICTION_ACCOUNT_SAVE_UNAVAILABLE}
        </p>
      )}
      {guestTransferMode && (
        <div className="guest-notice guest-notice--warning" role="status">
          <strong>You have picks saved on this device.</strong>{' '}
          {PREDICTION_GUEST_DECISION_COPY}
          <span className="journey-guest-decision">
            <Button onClick={importGuestDraft} disabled={!canImportGuest || busy} variant="secondary">
              Keep my device picks
            </Button>
            <Button onClick={discardGuestDraft} disabled={busy} variant="ghost">
              Start fresh on this account
            </Button>
          </span>
          {!canImportGuest && (
            <small>{PREDICTION_GUEST_IMPORT_INCOMPLETE}</small>
          )}
        </div>
      )}
      {lifecycle?.provisional && (
        <p className="guest-notice guest-notice--safe">
          {context === 'account' ? PREDICTION_AUTOSAVE_NOTICE : PREDICTION_GUEST_LOCAL_ONLY_NOTICE} {PREDICTION_LOCK_NOTICE}
        </p>
      )}
      {notice && <p className={`guest-notice guest-notice--${notice.tone}`} role="status">{notice.message}</p>}

      <div className="journey-footer-meta">
        <span>{PREDICTION_GROUP_JOKERS_COPY}</span>
        <span>{PREDICTION_BRACKET_JOKERS_COPY}</span>
        <span>{PREDICTION_SAVE_CHECK_COPY}</span>
      </div>
    </section>
  )
}
