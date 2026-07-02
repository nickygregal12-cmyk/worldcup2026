import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadOverallHeadToHead, loadResultsAndLeaderboards } from './resultService.js'
import { RESULT_COMPETITION } from './resultModel.js'

function teamLabel(reference, teamId) {
  if (!teamId) return 'TBC'
  return reference.teamsById?.[teamId]?.label ?? reference.teamsById?.[teamId]?.slotCode ?? 'TBC'
}

function Leaderboard({ title, rows, note, currentUserId, onCompare }) {
  return (
    <article className="foundation-results-card">
      <div className="foundation-results-card__heading">
        <div>
          <span className="foundation-kicker">Separate competition</span>
          <h3>{title}</h3>
        </div>
        <small>{note}</small>
      </div>
      {rows.length === 0 ? (
        <p className="foundation-empty-copy">No scored entries yet.</p>
      ) : (
        <ol className="foundation-leaderboard-list">
          {rows.slice(0, 8).map(row => (
            <li key={row.userId}>
              <b>{row.rank}</b>
              {row.userId === currentUserId ? (
                <span><strong>{row.displayName}</strong> (you)</span>
              ) : (
                <button type="button" className="foundation-member-link" onClick={() => onCompare(row)}>
                  {row.displayName}
                </button>
              )}
              <strong>{row.totalPoints} pts</strong>
            </li>
          ))}
        </ol>
      )}
    </article>
  )
}


function OverallComparison({ state, onClose }) {
  if (!state) return null
  return (
    <article className="foundation-results-card foundation-results-card--wide foundation-overall-comparison">
      <div className="foundation-section-heading">
        <div>
          <span className="foundation-kicker">Overall head to head</span>
          <h3>You v {state.otherName}</h3>
          <p>{state.competitionKey === RESULT_COMPETITION.ORIGINAL ? 'Original Predictor' : 'KO Predictor'}</p>
        </div>
        <button type="button" className="foundation-secondary-button" onClick={onClose}>Close</button>
      </div>
      {state.status === 'loading' && <p className="foundation-empty-copy">Loading shared predictions…</p>}
      {state.status === 'error' && <p className="foundation-warning-text">{state.error}</p>}
      {state.status === 'ready' && !state.data.comparison.visible && (
        <p className="foundation-empty-copy">{state.data.comparison.reason}</p>
      )}
      {state.status === 'ready' && state.data.comparison.visible && (
        <div className="foundation-result-summary foundation-comparison-summary">
          <div><strong>{state.data.comparison.comparedMatches}</strong><span>matches compared</span></div>
          <div><strong>{state.data.comparison.exactScoreMatches}</strong><span>same exact score</span></div>
          {state.competitionKey === RESULT_COMPETITION.ORIGINAL ? (
            <div><strong>{state.data.comparison.bracketMatches}</strong><span>same bracket picks</span></div>
          ) : (
            <>
              <div><strong>{state.data.comparison.advancingTeamMatches}</strong><span>same team through</span></div>
              <div><strong>{state.data.comparison.methodMatches}</strong><span>same method</span></div>
            </>
          )}
        </div>
      )}
    </article>
  )
}

function GroupTable({ groupCode, table, reference }) {
  return (
    <details className="foundation-live-group" open={groupCode === 'A'}>
      <summary>
        <strong>Group {groupCode}</strong>
        <span>{table.completedMatchCount}/6 results</span>
      </summary>
      <div className="foundation-table-wrap">
        <table>
          <thead>
            <tr><th>#</th><th>Team</th><th>P</th><th>GD</th><th>Pts</th></tr>
          </thead>
          <tbody>
            {table.rows.map(row => (
              <tr key={row.teamId}>
                <td>{row.rank}</td>
                <td>{teamLabel(reference, row.teamId)}</td>
                <td>{row.played}</td>
                <td>{row.goalDifference}</td>
                <td><strong>{row.points}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

function LiveBracket({ bracket, reference }) {
  const visible = bracket.matches.filter(match => match.participantsResolved || match.decisionResolved)
  if (visible.length === 0) return <p className="foundation-empty-copy">The live bracket will resolve from confirmed results.</p>

  return (
    <div className="foundation-live-bracket">
      {visible.map(match => (
        <div key={match.matchNumber}>
          <span>Match {match.matchNumber}</span>
          <strong>{teamLabel(reference, match.homeTeamId)} v {teamLabel(reference, match.awayTeamId)}</strong>
          <small>{match.winnerTeamId ? `${teamLabel(reference, match.winnerTeamId)} through` : 'Awaiting result'}</small>
        </div>
      ))}
    </div>
  )
}

export default function ResultsAndLeaderboardsFoundation({ client, reference }) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null })
  const [comparison, setComparison] = useState(null)

  const load = useCallback(async () => {
    setState(previous => ({ ...previous, status: 'loading', error: null }))
    try {
      const data = await loadResultsAndLeaderboards(client, reference)
      setState({ status: 'ready', data, error: null })
    } catch (error) {
      setState({ status: 'error', data: null, error: error instanceof Error ? error.message : String(error) })
    }
  }, [client, reference])

  useEffect(() => {
    let active = true

    loadResultsAndLeaderboards(client, reference)
      .then(data => {
        if (active) setState({ status: 'ready', data, error: null })
      })
      .catch(error => {
        if (!active) return
        setState({
          status: 'error',
          data: null,
          error: error instanceof Error ? error.message : String(error),
        })
      })

    return () => { active = false }
  }, [client, reference])

  const summary = state.data?.live.summary
  const groups = useMemo(() => Object.entries(state.data?.live.groups ?? {}), [state.data])

  const compareOverall = async (row, competitionKey) => {
    if (!state.data?.currentUserId) return
    setComparison({
      status: 'loading',
      otherName: row.displayName,
      competitionKey,
      data: null,
      error: null,
    })
    try {
      const data = await loadOverallHeadToHead(client, {
        tournamentId: reference.tournamentId,
        currentUserId: state.data.currentUserId,
        otherUserId: row.userId,
        competitionKey,
      })
      setComparison({ status: 'ready', otherName: row.displayName, competitionKey, data, error: null })
    } catch (error) {
      setComparison({
        status: 'error',
        otherName: row.displayName,
        competitionKey,
        data: null,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return (
    <section className="foundation-panel foundation-results" aria-labelledby="stage9-results-heading">
      <div className="foundation-section-heading">
        <div>
          <span className="foundation-kicker">Stage 9 · Results and scoring</span>
          <h2 id="stage9-results-heading">Live tournament and separate leaderboards</h2>
          <p>Confirmed corrections replace prior points. Original and KO Predictor totals never combine.</p>
        </div>
        <button type="button" className="foundation-secondary-button" onClick={load}>Refresh</button>
      </div>

      {state.status === 'loading' && <p className="foundation-empty-copy">Loading canonical results…</p>}
      {state.status === 'error' && <p className="foundation-warning-text">{state.error}</p>}

      {state.status === 'ready' && state.data && (
        <>
          <div className="foundation-result-summary">
            <div><strong>{summary.confirmedMatches}</strong><span>confirmed</span></div>
            <div><strong>{summary.liveMatches}</strong><span>live</span></div>
            <div><strong>{summary.pendingResults}</strong><span>pending scores</span></div>
            <div><strong>{summary.manualReviewResults}</strong><span>manual review</span></div>
          </div>

          <div className="foundation-results-grid">
            <article className="foundation-results-card foundation-results-card--wide">
              <span className="foundation-kicker">Canonical live context</span>
              <h3>Live group tables</h3>
              <div className="foundation-live-groups">
                {groups.map(([groupCode, table]) => (
                  <GroupTable key={groupCode} groupCode={groupCode} table={table} reference={reference} />
                ))}
              </div>
            </article>

            <article className="foundation-results-card">
              <span className="foundation-kicker">Never blended with predictions</span>
              <h3>Live knockout bracket</h3>
              <LiveBracket bracket={state.data.live.knockout} reference={reference} />
            </article>
          </div>

          {state.data.signedIn ? (
            <>
              <div className="foundation-results-grid">
              <Leaderboard
                title="Original predictor"
                rows={state.data.leaderboards.original}
                note="Groups + original bracket"
                currentUserId={state.data.currentUserId}
                onCompare={row => compareOverall(row, RESULT_COMPETITION.ORIGINAL)}
              />
              <Leaderboard
                title="KO Predictor"
                rows={state.data.leaderboards.koPredictor}
                note="Real knockout matches only"
                currentUserId={state.data.currentUserId}
                onCompare={row => compareOverall(row, RESULT_COMPETITION.KO_PREDICTOR)}
              />
              </div>
              <OverallComparison state={comparison} onClose={() => setComparison(null)} />
            </>
          ) : (
            <p className="foundation-empty-copy">Sign in to view the two scored leaderboards. Guest predictions remain unscored.</p>
          )}
        </>
      )}
    </section>
  )
}
