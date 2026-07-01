import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ADMIN_DECISION_METHOD,
  ADMIN_MATCH_STATUS,
  ADMIN_RESULT_STATUS,
  createAdminResultDraft,
  validateAdminResultDraft,
} from './adminOperationsModel.js'
import {
  loadAdminMatchHistory,
  loadAdminOperations,
  recalculateAdminMatchPoints,
  saveAdminMatchResult,
  updateAdminMatchStatus,
} from './adminOperationsService.js'

function formatTimestamp(value) {
  if (!value) return 'Not recorded'
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function humanise(value) {
  return String(value ?? '').replaceAll('_', ' ').replace(/^./, character => character.toUpperCase())
}

function ScoreInput({ label, value, onChange, disabled = false }) {
  return (
    <label className="foundation-admin-score-field">
      <span>{label}</span>
      <input
        type="number"
        min="0"
        step="1"
        inputMode="numeric"
        value={value}
        disabled={disabled}
        onChange={event => onChange(event.target.value)}
      />
    </label>
  )
}

function AdminSummary({ matches, role }) {
  const summary = useMemo(() => ({
    live: matches.filter(match => match.matchStatus === 'live').length,
    confirmed: matches.filter(match => match.resultStatus === 'confirmed').length,
    review: matches.filter(match => match.resultStatus === 'manual_review').length,
    unresolved: matches.filter(match => !match.homeTeamId || !match.awayTeamId).length,
  }), [matches])

  return (
    <div className="foundation-result-summary">
      <div><strong>{humanise(role)}</strong><span>admin role</span></div>
      <div><strong>{summary.live}</strong><span>live matches</span></div>
      <div><strong>{summary.confirmed}</strong><span>confirmed results</span></div>
      <div><strong>{summary.review}</strong><span>manual review</span></div>
      <div><strong>{summary.unresolved}</strong><span>fixtures unresolved</span></div>
    </div>
  )
}

function ResultHistory({ history }) {
  if (history.length === 0) {
    return <p className="foundation-empty-copy">No result revisions have been recorded for this match.</p>
  }

  return (
    <ol className="foundation-admin-history">
      {history.map(event => (
        <li key={event.eventId}>
          <div>
            <strong>Revision {event.resultRevision} · {humanise(event.eventType)}</strong>
            <span>{formatTimestamp(event.createdAt)}</span>
          </div>
          <p>{event.adminNote ?? 'Recorded outside the browser admin control room.'}</p>
          <small>{event.recordedByDisplayName} · {humanise(event.resultSource)}</small>
        </li>
      ))}
    </ol>
  )
}

function ScoringRuns({ runs }) {
  if (runs.length === 0) return <p className="foundation-empty-copy">No scoring runs have been recorded.</p>
  return (
    <div className="foundation-admin-runs">
      {runs.slice(0, 8).map(run => (
        <div key={run.scoringRunId}>
          <strong>{run.triggerMatchNumber ? `Match ${run.triggerMatchNumber}` : 'Full tournament'} · {humanise(run.status)}</strong>
          <span>{formatTimestamp(run.startedAt)}</span>
          {run.errorMessage && <small>{run.errorMessage}</small>}
        </div>
      ))}
    </div>
  )
}

export default function AdminOperationsFoundation({ client, reference }) {
  const [state, setState] = useState({ status: 'loading', signedIn: false, data: null, error: null })
  const [selectedMatchId, setSelectedMatchId] = useState('')
  const selectedMatchIdRef = useRef('')
  const [draft, setDraft] = useState(null)
  const [history, setHistory] = useState([])
  const [statusDraft, setStatusDraft] = useState('scheduled')
  const [statusNote, setStatusNote] = useState('')
  const [recalculationNote, setRecalculationNote] = useState('')
  const [action, setAction] = useState({ status: 'idle', message: '' })

  const load = useCallback(async () => {
    try {
      const sessionResponse = await client.auth.getSession()
      if (sessionResponse.error) throw sessionResponse.error
      if (!sessionResponse.data?.session?.user) {
        setState({ status: 'ready', signedIn: false, data: null, error: null })
        return
      }

      const data = await loadAdminOperations(client, reference.tournamentId)
      setState({ status: 'ready', signedIn: true, data, error: null })

      const nextMatchId = data.matches.some(match => match.matchId === selectedMatchIdRef.current)
        ? selectedMatchIdRef.current
        : data.matches[0]?.matchId ?? ''
      selectedMatchIdRef.current = nextMatchId
      setSelectedMatchId(nextMatchId)

      const nextMatch = data.matches.find(match => match.matchId === nextMatchId) ?? null
      setDraft(nextMatch ? createAdminResultDraft(nextMatch) : null)
      setStatusDraft(nextMatch?.matchStatus ?? 'scheduled')
      setStatusNote('')
      setRecalculationNote('')
      if (nextMatch) {
        const nextHistory = await loadAdminMatchHistory(client, reference.tournamentId, nextMatch.matchId)
        setHistory(nextHistory)
      } else {
        setHistory([])
      }
    } catch (error) {
      setState({ status: 'error', signedIn: false, data: null, error: error instanceof Error ? error.message : String(error) })
    }
  }, [client, reference.tournamentId])

  useEffect(() => {
    void Promise.resolve().then(load)
    const subscription = client.auth.onAuthStateChange(() => load())
    return () => subscription.data.subscription.unsubscribe()
  }, [client, load])

  const matches = useMemo(() => state.data?.matches ?? [], [state.data])
  const selectedMatch = useMemo(
    () => matches.find(match => match.matchId === selectedMatchId) ?? null,
    [matches, selectedMatchId],
  )

  const chooseMatch = useCallback(async matchId => {
    selectedMatchIdRef.current = matchId
    setSelectedMatchId(matchId)
    const match = matches.find(candidate => candidate.matchId === matchId) ?? null
    setDraft(match ? createAdminResultDraft(match) : null)
    setStatusDraft(match?.matchStatus ?? 'scheduled')
    setStatusNote('')
    setRecalculationNote('')
    if (!match) {
      setHistory([])
      return
    }
    try {
      const nextHistory = await loadAdminMatchHistory(client, reference.tournamentId, match.matchId)
      setHistory(nextHistory)
    } catch (error) {
      setAction({ status: 'error', message: error instanceof Error ? error.message : String(error) })
    }
  }, [client, matches, reference.tournamentId])


  const updateDraft = (key, value) => setDraft(previous => ({ ...previous, [key]: value }))
  const validation = selectedMatch && draft ? validateAdminResultDraft(selectedMatch, draft) : null
  const showExtraTime = selectedMatch?.matchNumber > 36 && ['extra_time', 'penalties'].includes(draft?.decisionMethod)
  const showPenalties = selectedMatch?.matchNumber > 36 && draft?.decisionMethod === 'penalties'
  const clearsScores = ['manual_review', 'void'].includes(draft?.resultStatus)

  const runAction = async (work, successMessage) => {
    setAction({ status: 'working', message: 'Applying the audited operation…' })
    try {
      await work()
      setAction({ status: 'success', message: successMessage })
      await load()
    } catch (error) {
      const stale = error?.code === '40001'
      setAction({
        status: 'error',
        message: stale
          ? 'The result changed after this screen loaded. Refresh and review the latest revision before trying again.'
          : error instanceof Error ? error.message : String(error),
      })
    }
  }

  if (state.status === 'loading') {
    return (
      <section className="foundation-panel foundation-admin" aria-labelledby="stage10-admin-heading">
        <span className="foundation-kicker">Stage 10 · Tournament operations</span>
        <h2 id="stage10-admin-heading">Checking administrator access…</h2>
      </section>
    )
  }

  if (state.status === 'error') {
    return (
      <section className="foundation-panel foundation-panel--error foundation-admin" aria-labelledby="stage10-admin-heading">
        <span className="foundation-kicker">Stage 10 · Tournament operations</span>
        <h2 id="stage10-admin-heading">Admin operations could not load</h2>
        <p>{state.error}</p>
        <button type="button" onClick={load}>Try again</button>
      </section>
    )
  }

  if (!state.signedIn) {
    return (
      <section className="foundation-panel foundation-admin" aria-labelledby="stage10-admin-heading">
        <span className="foundation-kicker">Stage 10 · Tournament operations</span>
        <h2 id="stage10-admin-heading">Secure admin controls</h2>
        <p>Sign in with an account that has been granted Euro staging administrator access.</p>
      </section>
    )
  }

  if (!state.data?.access.isAdmin) {
    return (
      <section className="foundation-panel foundation-admin" aria-labelledby="stage10-admin-heading">
        <span className="foundation-kicker">Stage 10 · Tournament operations</span>
        <h2 id="stage10-admin-heading">No administrator access</h2>
        <p>Your account is signed in but has not been granted tournament administration rights. Access cannot be self-assigned from the browser.</p>
      </section>
    )
  }

  return (
    <section className="foundation-panel foundation-admin" aria-labelledby="stage10-admin-heading">
      <div className="foundation-section-heading">
        <div>
          <span className="foundation-kicker">Stage 10 · Tournament operations</span>
          <h2 id="stage10-admin-heading">Manual results and operational safeguards</h2>
          <p>Every action checks the loaded result revision, requires an audit note and writes through trusted RPCs.</p>
        </div>
        <button type="button" className="foundation-secondary-button" onClick={load}>Refresh control room</button>
      </div>

      <AdminSummary matches={matches} role={state.data.access.adminRole} />

      {action.message && (
        <p className={action.status === 'error' ? 'foundation-warning-text' : 'foundation-admin-action-message'} role="status">
          {action.message}
        </p>
      )}

      <div className="foundation-admin-layout">
        <aside className="foundation-admin-match-list">
          <label>
            <span>Choose match</span>
            <select value={selectedMatchId} onChange={event => chooseMatch(event.target.value)}>
              {matches.map(match => (
                <option key={match.matchId} value={match.matchId}>
                  {match.matchNumber}. {match.homeTeamLabel} v {match.awayTeamLabel} · {humanise(match.resultStatus)}
                </option>
              ))}
            </select>
          </label>

          {selectedMatch && (
            <div className="foundation-admin-match-summary">
              <span>{selectedMatch.stageName}{selectedMatch.groupCode ? ` · Group ${selectedMatch.groupCode}` : ''}</span>
              <strong>{selectedMatch.homeTeamLabel} v {selectedMatch.awayTeamLabel}</strong>
              <small>Result revision {selectedMatch.resultRevision} · Updated {formatTimestamp(selectedMatch.updatedAt)}</small>
            </div>
          )}
        </aside>

        {selectedMatch && draft && (
          <div className="foundation-admin-workspace">
            <article className="foundation-results-card foundation-results-card--wide">
              <div className="foundation-results-card__heading">
                <div>
                  <span className="foundation-kicker">Canonical result</span>
                  <h3>Record or correct result</h3>
                </div>
                <small>Expected revision {selectedMatch.resultRevision}</small>
              </div>

              <div className="foundation-admin-form-grid">
                <label><span>Match status</span><select value={draft.matchStatus} onChange={event => updateDraft('matchStatus', event.target.value)}>{ADMIN_MATCH_STATUS.map(value => <option key={value} value={value}>{humanise(value)}</option>)}</select></label>
                <label><span>Result status</span><select value={draft.resultStatus} onChange={event => updateDraft('resultStatus', event.target.value)}>{ADMIN_RESULT_STATUS.map(value => <option key={value} value={value}>{humanise(value)}</option>)}</select></label>
                <label><span>Decision method</span><select disabled={clearsScores || selectedMatch.matchNumber <= 36} value={draft.decisionMethod} onChange={event => updateDraft('decisionMethod', event.target.value)}>{ADMIN_DECISION_METHOD.map(value => <option key={value} value={value}>{humanise(value)}</option>)}</select></label>
              </div>

              <div className="foundation-admin-score-grid">
                <ScoreInput label={`${selectedMatch.homeTeamLabel} after 90 min`} value={draft.homeScore90} disabled={clearsScores} onChange={value => updateDraft('homeScore90', value)} />
                <ScoreInput label={`${selectedMatch.awayTeamLabel} after 90 min`} value={draft.awayScore90} disabled={clearsScores} onChange={value => updateDraft('awayScore90', value)} />
                {showExtraTime && <ScoreInput label={`${selectedMatch.homeTeamLabel} after extra time`} value={draft.homeScoreAet} disabled={clearsScores} onChange={value => updateDraft('homeScoreAet', value)} />}
                {showExtraTime && <ScoreInput label={`${selectedMatch.awayTeamLabel} after extra time`} value={draft.awayScoreAet} disabled={clearsScores} onChange={value => updateDraft('awayScoreAet', value)} />}
                {showPenalties && <ScoreInput label={`${selectedMatch.homeTeamLabel} penalties`} value={draft.homePenalties} disabled={clearsScores} onChange={value => updateDraft('homePenalties', value)} />}
                {showPenalties && <ScoreInput label={`${selectedMatch.awayTeamLabel} penalties`} value={draft.awayPenalties} disabled={clearsScores} onChange={value => updateDraft('awayPenalties', value)} />}
              </div>

              <label className="foundation-admin-note">
                <span>Audit note</span>
                <textarea value={draft.note} maxLength="500" onChange={event => updateDraft('note', event.target.value)} placeholder="State the official source or reason for this change." />
              </label>

              {validation && !validation.valid && (
                <ul className="foundation-admin-validation">
                  {validation.errors.map(error => <li key={error}>{error}</li>)}
                </ul>
              )}

              <button
                type="button"
                disabled={!validation?.valid || action.status === 'working'}
                onClick={() => runAction(
                  () => saveAdminMatchResult(client, reference.tournamentId, selectedMatch, draft),
                  `Match ${selectedMatch.matchNumber} result saved and points recalculated.`,
                )}
              >
                {selectedMatch.resultRevision > 0 ? 'Save corrected result' : 'Record result'}
              </button>
            </article>

            <article className="foundation-results-card">
              <span className="foundation-kicker">Status only</span>
              <h3>Update match state</h3>
              <p>Use this for live, paused or postponed status changes without rewriting the result revision.</p>
              <label><span>New status</span><select value={statusDraft} onChange={event => setStatusDraft(event.target.value)}>{ADMIN_MATCH_STATUS.map(value => <option key={value} value={value}>{humanise(value)}</option>)}</select></label>
              <label className="foundation-admin-note"><span>Audit note</span><textarea value={statusNote} maxLength="500" onChange={event => setStatusNote(event.target.value)} /></label>
              <button type="button" disabled={statusNote.trim().length < 5 || action.status === 'working'} onClick={() => runAction(
                () => updateAdminMatchStatus(client, reference.tournamentId, selectedMatch, statusDraft, statusNote),
                `Match ${selectedMatch.matchNumber} status updated.`,
              )}>Update status</button>
            </article>

            <article className="foundation-results-card">
              <span className="foundation-kicker">Recovery control</span>
              <h3>Recalculate this match</h3>
              <p>This replaces this match’s existing point rows. It never adds a duplicate score.</p>
              <label className="foundation-admin-note"><span>Audit note</span><textarea value={recalculationNote} maxLength="500" onChange={event => setRecalculationNote(event.target.value)} /></label>
              <button type="button" disabled={selectedMatch.resultStatus !== 'confirmed' || recalculationNote.trim().length < 5 || action.status === 'working'} onClick={() => runAction(
                () => recalculateAdminMatchPoints(client, reference.tournamentId, selectedMatch, recalculationNote),
                `Match ${selectedMatch.matchNumber} points recalculated.`,
              )}>Recalculate points</button>
            </article>

            <article className="foundation-results-card foundation-results-card--wide">
              <span className="foundation-kicker">Append-only audit</span>
              <h3>Result revision history</h3>
              <ResultHistory history={history} />
            </article>
          </div>
        )}
      </div>

      <article className="foundation-results-card foundation-results-card--wide">
        <span className="foundation-kicker">Latest scoring activity</span>
        <h3>Scoring runs</h3>
        <ScoringRuns runs={state.data.scoringRuns} />
      </article>
    </section>
  )
}
