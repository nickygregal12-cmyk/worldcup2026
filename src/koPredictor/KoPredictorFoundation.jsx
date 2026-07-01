import { useEffect, useMemo, useState } from 'react'
import { createKoPredictorDraft, buildKoPredictorRows, summariseKoPredictor, updateKoPredictorDraft } from './koPredictorModel.js'
import { loadMyKoPredictionBundle, saveMyKoPredictionBundle } from './koPredictorService.js'
import { isPredictionMatchStarted } from '../grace/index.js'

function teamLabel(reference, teamId) {
  return reference.teamsById?.[teamId]?.label ?? teamId ?? 'TBC'
}

function score(value) {
  if (value === '') return null
  const number = Number(value)
  return Number.isInteger(number) && number >= 0 && number <= 99 ? number : null
}

export default function KoPredictorFoundation({ client, reference }) {
  const [session, setSession] = useState(null)
  const [bundle, setBundle] = useState(null)
  const [draft, setDraft] = useState(() => createKoPredictorDraft(reference))
  const [notice, setNotice] = useState(null)
  const [saving, setSaving] = useState(false)
  const summary = useMemo(() => summariseKoPredictor(reference, draft), [reference, draft])

  useEffect(() => {
    if (!client) return undefined
    let active = true
    async function load(nextSession) {
      if (!active) return
      setSession(nextSession)
      const nextBundle = nextSession?.user
        ? await loadMyKoPredictionBundle(client, reference.tournamentId, nextSession.user.id)
        : null
      if (!active) return
      setBundle(nextBundle)
      setDraft(createKoPredictorDraft(reference, nextBundle))
    }
    client.auth.getSession().then(({ data }) => load(data?.session ?? null)).catch(error => setNotice(error.message))
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      load(nextSession).catch(error => setNotice(error.message))
    })
    return () => { active = false; data.subscription.unsubscribe() }
  }, [client, reference])

  async function save() {
    if (!session?.user) {
      setNotice('Sign in to save KO Predictor entries. This competition is separate from the original predictor.')
      return
    }
    setSaving(true)
    try {
      const result = await saveMyKoPredictionBundle(client, {
        tournamentId: reference.tournamentId,
        expectedRevision: bundle?.revision ?? 0,
        predictions: buildKoPredictorRows(reference, draft),
      })
      setBundle(previous => ({ ...(previous ?? {}), revision: result.revision }))
      setNotice(`KO Predictor saved separately at revision ${result.revision}.`)
    } catch (error) {
      setNotice(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="foundation-panel ko-predictor-foundation" aria-labelledby="ko-predictor-title">
      <div className="foundation-section-heading">
        <div>
          <span className="foundation-kicker">Separate competition · KO Predictor</span>
          <h2 id="ko-predictor-title">Real knockout matches, separate points and a separate winner</h2>
          <p className="foundation-panel-copy">
            This does not affect the original group-and-bracket predictor. It uses the 15 real knockout fixtures, a 90-minute score, advancing team, decision method and five separate KO Predictor jokers.
          </p>
        </div>
        <span className="foundation-pill foundation-pill--info">{summary.jokerCount}/{summary.jokerCap} KO jokers</span>
      </div>

      {summary.available === 0 ? (
        <div className="journey-warning-box">
          <strong>KO Predictor opens when the real knockout fixtures are resolved.</strong>
          <p>The original pre-tournament bracket remains winner picks only and never receives KO Predictor points or jokers.</p>
        </div>
      ) : (
        <>
          <div className="ko-predictor-grid">
            {reference.knockoutMatches.filter(match => match.participantsResolved).map(match => {
              const row = draft.rows[String(match.matchNumber)]
              const capReached = summary.jokerCount >= summary.jokerCap && !row.jokerApplied
              const started = isPredictionMatchStarted(match)
              return (
                <article className="journey-knockout-card" key={match.matchId}>
                  <div className="journey-knockout-card__meta">
                    <strong>Match {match.matchNumber}</strong>
                    <span>{started ? 'Locked · match started' : 'Open until kick-off'}</span>
                  </div>
                  <div className="journey-knockout-score">
                    <span>{teamLabel(reference, match.homeTeamId)}</span>
                    <input type="number" min="0" max="99" disabled={started} value={row.homeScore ?? ''} onChange={event => setDraft(current => updateKoPredictorDraft(current, match, { homeScore: score(event.target.value) }))} />
                    <span>–</span>
                    <input type="number" min="0" max="99" disabled={started} value={row.awayScore ?? ''} onChange={event => setDraft(current => updateKoPredictorDraft(current, match, { awayScore: score(event.target.value) }))} />
                    <span>{teamLabel(reference, match.awayTeamId)}</span>
                  </div>
                  <select disabled={started} value={row.advancingTeamId ?? ''} onChange={event => setDraft(current => updateKoPredictorDraft(current, match, { advancingTeamId: event.target.value || null }))}>
                    <option value="">Team to advance</option>
                    <option value={match.homeTeamId}>{teamLabel(reference, match.homeTeamId)}</option>
                    <option value={match.awayTeamId}>{teamLabel(reference, match.awayTeamId)}</option>
                  </select>
                  <select disabled={started} value={row.decisionMethod ?? ''} onChange={event => setDraft(current => updateKoPredictorDraft(current, match, { decisionMethod: event.target.value || null }))}>
                    <option value="">Decision method</option>
                    <option value="normal_time">Normal time</option>
                    <option value="extra_time">Extra time</option>
                    <option value="penalties">Penalties</option>
                  </select>
                  <button type="button" disabled={started || capReached} onClick={() => setDraft(current => updateKoPredictorDraft(current, match, { jokerApplied: !row.jokerApplied }))}>
                    {row.jokerApplied ? 'KO joker ✓' : 'Add KO joker'}
                  </button>
                </article>
              )
            })}
          </div>
          <button type="button" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save KO Predictor'}</button>
        </>
      )}
      {notice && <p className="guest-notice guest-notice--warning" role="status">{notice}</p>}
      <div className="journey-footer-meta">
        <span>{summary.complete}/{summary.available} available matches complete</span>
        <span>Separate future leaderboard</span>
        <span>No original-predictor points included</span>
      </div>
    </section>
  )
}
