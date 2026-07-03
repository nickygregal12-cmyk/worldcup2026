import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ADMIN_DECISION_METHOD,
  ADMIN_MATCH_STATUS,
  ADMIN_RESULT_STATUS,
  adminResultDraftHasChanges,
  createAdminResultDraft,
  validateAdminResultDraft,
} from './adminOperationsModel.js'
import { humaniseAdminValue, formatAdminTimestamp } from './adminPresentation.js'
import { ResultHistory } from './AdminControlRoomStatus.jsx'
import {
  loadAdminMatchHistory,
  recalculateAdminMatchPoints,
  saveAdminMatchResult,
  updateAdminMatchStatus,
} from './adminOperationsService.js'

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

export default function AdminMatchOperations({
  client,
  tournamentId,
  matches,
  features,
  actionStatus,
  runAction,
}) {
  const [selectedMatchId, setSelectedMatchId] = useState(matches[0]?.matchId ?? '')
  const selectedResultSnapshotRef = useRef(matches[0] ? JSON.stringify(createAdminResultDraft(matches[0])) : null)
  const [draft, setDraft] = useState(() => matches[0] ? createAdminResultDraft(matches[0]) : null)
  const [history, setHistory] = useState([])
  const [historyState, setHistoryState] = useState('idle')
  const [statusDraft, setStatusDraft] = useState(matches[0]?.matchStatus ?? 'scheduled')
  const [statusNote, setStatusNote] = useState('')
  const [recalculationNote, setRecalculationNote] = useState('')
  const [resultDirty, setResultDirty] = useState(false)

  const selectedMatch = useMemo(
    () => matches.find(match => match.matchId === selectedMatchId) ?? null,
    [matches, selectedMatchId],
  )

  const loadHistory = useCallback(async match => {
    if (!match) {
      setHistory([])
      return
    }
    setHistoryState('loading')
    try {
      const rows = await loadAdminMatchHistory(client, tournamentId, match.matchId)
      setHistory(rows)
      setHistoryState('ready')
    } catch {
      setHistory([])
      setHistoryState('error')
    }
  }, [client, tournamentId])

  useEffect(() => {
    void Promise.resolve().then(() => loadHistory(selectedMatch))
  }, [loadHistory, selectedMatch])

  useEffect(() => {
    if (!selectedMatch) return
    const nextSnapshot = JSON.stringify(createAdminResultDraft(selectedMatch))
    if (selectedResultSnapshotRef.current === nextSnapshot) return
    selectedResultSnapshotRef.current = nextSnapshot
    setDraft(createAdminResultDraft(selectedMatch))
    setResultDirty(false)
    setStatusDraft(selectedMatch.matchStatus)
    setStatusNote('')
    setRecalculationNote('')
  }, [selectedMatch])

  const chooseMatch = matchId => {
    const match = matches.find(candidate => candidate.matchId === matchId) ?? null
    selectedResultSnapshotRef.current = match ? JSON.stringify(createAdminResultDraft(match)) : null
    setSelectedMatchId(matchId)
    setDraft(match ? createAdminResultDraft(match) : null)
    setResultDirty(false)
    setStatusDraft(match?.matchStatus ?? 'scheduled')
    setStatusNote('')
    setRecalculationNote('')
    void loadHistory(match)
  }

  const updateDraft = (key, value) => {
    setResultDirty(true)
    setDraft(previous => ({ ...previous, [key]: value }))
  }
  const validation = selectedMatch && draft ? validateAdminResultDraft(selectedMatch, draft) : null
  const resultHasChanges = selectedMatch && draft ? adminResultDraftHasChanges(selectedMatch, draft) : false
  const showExtraTime = selectedMatch?.matchNumber > 36 && ['extra_time', 'penalties'].includes(draft?.decisionMethod)
  const showPenalties = selectedMatch?.matchNumber > 36 && draft?.decisionMethod === 'penalties'
  const clearsScores = ['manual_review', 'void'].includes(draft?.resultStatus)
  const resultEntryEnabled = features.find(feature => feature.featureKey === 'result_entry')?.isEnabled ?? true
  const scoringEnabled = features.find(feature => feature.featureKey === 'scoring_recalculation')?.isEnabled ?? true
  const working = actionStatus === 'working'

  return (
    <div className="foundation-admin-layout">
      <aside className="foundation-admin-match-list">
        <label>
          <span>Choose match</span>
          <select value={selectedMatchId} onChange={event => chooseMatch(event.target.value)}>
            {matches.map(match => (
              <option key={match.matchId} value={match.matchId}>
                {match.matchNumber}. {match.homeTeamLabel} v {match.awayTeamLabel} · {humaniseAdminValue(match.resultStatus)}
              </option>
            ))}
          </select>
        </label>
        {selectedMatch && (
          <div className="foundation-admin-match-summary">
            <span>{selectedMatch.stageName}{selectedMatch.groupCode ? ` · Group ${selectedMatch.groupCode}` : ''}</span>
            <strong>{selectedMatch.homeTeamLabel} v {selectedMatch.awayTeamLabel}</strong>
            <small>Result revision {selectedMatch.resultRevision} · Updated {formatAdminTimestamp(selectedMatch.updatedAt)}</small>
          </div>
        )}
      </aside>

      {selectedMatch && draft && (
        <div className="foundation-admin-workspace">
          <article className="foundation-results-card foundation-results-card--wide">
            <div className="foundation-results-card__heading">
              <div><span className="foundation-kicker">Canonical result</span><h3>Record or correct result</h3></div>
              <small>Expected revision {selectedMatch.resultRevision}</small>
            </div>
            <div className="foundation-admin-form-grid">
              <label><span>Match status</span><select value={draft.matchStatus} onChange={event => updateDraft('matchStatus', event.target.value)}>{ADMIN_MATCH_STATUS.map(value => <option key={value} value={value}>{humaniseAdminValue(value)}</option>)}</select></label>
              <label><span>Result status</span><select value={draft.resultStatus} onChange={event => updateDraft('resultStatus', event.target.value)}>{ADMIN_RESULT_STATUS.map(value => <option key={value} value={value}>{humaniseAdminValue(value)}</option>)}</select></label>
              <label><span>Decision method</span><select disabled={clearsScores || selectedMatch.matchNumber <= 36} value={draft.decisionMethod} onChange={event => updateDraft('decisionMethod', event.target.value)}>{ADMIN_DECISION_METHOD.map(value => <option key={value} value={value}>{humaniseAdminValue(value)}</option>)}</select></label>
            </div>
            <div className="foundation-admin-score-grid">
              <ScoreInput label={`${selectedMatch.homeTeamLabel} after 90 min`} value={draft.homeScore90} disabled={clearsScores} onChange={value => updateDraft('homeScore90', value)} />
              <ScoreInput label={`${selectedMatch.awayTeamLabel} after 90 min`} value={draft.awayScore90} disabled={clearsScores} onChange={value => updateDraft('awayScore90', value)} />
              {showExtraTime && <ScoreInput label={`${selectedMatch.homeTeamLabel} after extra time`} value={draft.homeScoreAet} disabled={clearsScores} onChange={value => updateDraft('homeScoreAet', value)} />}
              {showExtraTime && <ScoreInput label={`${selectedMatch.awayTeamLabel} after extra time`} value={draft.awayScoreAet} disabled={clearsScores} onChange={value => updateDraft('awayScoreAet', value)} />}
              {showPenalties && <ScoreInput label={`${selectedMatch.homeTeamLabel} penalties`} value={draft.homePenalties} disabled={clearsScores} onChange={value => updateDraft('homePenalties', value)} />}
              {showPenalties && <ScoreInput label={`${selectedMatch.awayTeamLabel} penalties`} value={draft.awayPenalties} disabled={clearsScores} onChange={value => updateDraft('awayPenalties', value)} />}
            </div>
            <label className="foundation-admin-note"><span>Audit note</span><textarea value={draft.note} maxLength="500" onChange={event => updateDraft('note', event.target.value)} placeholder="State the official source or reason for this change." /></label>
            {resultDirty && validation && !validation.valid && <ul className="foundation-admin-validation">{validation.errors.map(error => <li key={error}>{error}</li>)}</ul>}
            {!resultDirty && selectedMatch.resultRevision > 0 && <p className="foundation-empty-copy">Change at least one canonical result field before saving a correction.</p>}
            {resultDirty && validation?.valid && !resultHasChanges && <p className="foundation-empty-copy">No canonical result changes detected.</p>}
            <button type="button" className="ui-button ui-button--primary" disabled={!validation?.valid || !resultHasChanges || !resultEntryEnabled || working} onClick={() => runAction(
              () => saveAdminMatchResult(client, tournamentId, selectedMatch, draft),
              `Match ${selectedMatch.matchNumber} result saved and points recalculated.`,
            )}>{selectedMatch.resultRevision > 0 ? 'Save corrected result' : 'Record result'}</button>
          </article>

          <article className="foundation-results-card">
            <span className="foundation-kicker">Status only</span><h3>Update match state</h3>
            <p>Use this for live, paused or postponed status changes without rewriting the result revision.</p>
            <label><span>New status</span><select value={statusDraft} onChange={event => setStatusDraft(event.target.value)}>{ADMIN_MATCH_STATUS.map(value => <option key={value} value={value}>{humaniseAdminValue(value)}</option>)}</select></label>
            <label className="foundation-admin-note"><span>Audit note</span><textarea value={statusNote} maxLength="500" onChange={event => setStatusNote(event.target.value)} /></label>
            <button type="button" className="ui-button ui-button--secondary" disabled={statusNote.trim().length < 5 || working} onClick={() => runAction(
              () => updateAdminMatchStatus(client, tournamentId, selectedMatch, statusDraft, statusNote),
              `Match ${selectedMatch.matchNumber} status updated.`,
            )}>Update status</button>
          </article>

          <article className="foundation-results-card">
            <span className="foundation-kicker">Single-match recovery</span><h3>Recalculate this match</h3>
            <p>This replaces this match’s existing point rows. It never adds a duplicate score.</p>
            <label className="foundation-admin-note"><span>Audit note</span><textarea value={recalculationNote} maxLength="500" onChange={event => setRecalculationNote(event.target.value)} /></label>
            <button type="button" className="ui-button ui-button--secondary" disabled={!scoringEnabled || selectedMatch.resultStatus !== 'confirmed' || recalculationNote.trim().length < 5 || working} onClick={() => runAction(
              () => recalculateAdminMatchPoints(client, tournamentId, selectedMatch, recalculationNote),
              `Match ${selectedMatch.matchNumber} points recalculated.`,
            )}>Recalculate points</button>
          </article>

          <article className="foundation-results-card foundation-results-card--wide">
            <span className="foundation-kicker">Append-only result audit</span><h3>Result revision history</h3>
            {historyState === 'loading' && <p className="foundation-empty-copy">Loading result history…</p>}
            {historyState === 'error' && <p className="foundation-empty-copy">Result history could not refresh. No result data was changed.</p>}
            {historyState !== 'loading' && <ResultHistory history={history} />}
          </article>
        </div>
      )}
    </div>
  )
}
