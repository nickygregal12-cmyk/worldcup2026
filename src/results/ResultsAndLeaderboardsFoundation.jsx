import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { loadOverallHeadToHead, loadResultsAndLeaderboards } from './resultService.js'
import { buildCanonicalResultFeed, buildLiveBracketRounds, RESULT_COMPETITION } from './resultModel.js'
import { createLatestRequestGuard } from '../lib/latestRequest.js'
import { GroupTable, Leaderboard, LiveBracket, OverallComparison, PointsBreakdown, ResultsFeed, SectionError } from './ResultsPresentation.jsx'

export default function ResultsAndLeaderboardsFoundation({ client, reference }) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null })
  const [comparison, setComparison] = useState(null)
  const loadRequests = useRef(createLatestRequestGuard())
  const comparisonRequests = useRef(createLatestRequestGuard())

  const load = useCallback(async () => {
    const requestToken = loadRequests.current.begin()
    setState(previous => ({ ...previous, status: 'loading', error: null }))
    try {
      const data = await loadResultsAndLeaderboards(client, reference)
      if (!loadRequests.current.isCurrent(requestToken)) return
      setState({ status: data.status, data, error: null })
    } catch (error) {
      if (!loadRequests.current.isCurrent(requestToken)) return
      const message = error instanceof Error ? error.message : String(error)
      setState(previous => ({
        status: previous.data ? 'partial' : 'error',
        data: previous.data,
        error: message,
      }))
    }
  }, [client, reference])

  useEffect(() => {
    const requestGuard = loadRequests.current
    void load()
    return () => { requestGuard.cancel() }
  }, [load])

  const summary = state.data?.live?.summary ?? null
  const groups = useMemo(() => Object.entries(state.data?.live?.groups ?? {}), [state.data])
  const feed = useMemo(() => buildCanonicalResultFeed({ reference, liveSnapshot: state.data?.live }), [reference, state.data])
  const bracketRounds = useMemo(() => buildLiveBracketRounds({ reference, liveSnapshot: state.data?.live }), [reference, state.data])

  const compareOverall = async (row, competitionKey) => {
    if (!state.data?.currentUserId) return
    const requestToken = comparisonRequests.current.begin()
    setComparison({
      status: 'loading',
      otherName: row.displayName,
      otherUserId: row.userId,
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
      if (!comparisonRequests.current.isCurrent(requestToken)) return
      setComparison(previous => ({ ...previous, status: 'ready', data, error: null }))
    } catch (error) {
      if (!comparisonRequests.current.isCurrent(requestToken)) return
      setComparison(previous => ({
        ...previous,
        status: 'error',
        data: null,
        error: error instanceof Error ? error.message : String(error),
      }))
    }
  }

  const closeComparison = () => {
    comparisonRequests.current.cancel()
    setComparison(null)
  }

  return (
    <section className="foundation-panel foundation-results" aria-labelledby="euro28-results-heading">
      <div className="foundation-section-heading">
        <div>
          <span className="foundation-kicker">Live tournament</span>
          <h2 id="euro28-results-heading">Results, live tables and separate points</h2>
          <p>Canonical live data never blends with predicted brackets. Original and KO Predictor totals never combine.</p>
        </div>
        <button type="button" className="foundation-secondary-button" onClick={() => { void load() }} disabled={state.status === 'loading'}>{state.status === 'loading' ? 'Refreshing…' : 'Refresh'}</button>
      </div>

      {state.status === 'loading' && !state.data && <p className="foundation-empty-copy">Loading canonical results and competition tables…</p>}
      {state.status === 'error' && !state.data && <p className="foundation-warning-text">{state.error}</p>}
      {state.status === 'loading' && state.data && <p className="foundation-empty-copy">Refreshing available live and competition sections…</p>}
      {state.error && state.data && <p className="foundation-warning-text">Refresh failed. The last available data remains visible: {state.error}</p>}
      {state.status === 'partial' && !state.error && <p className="foundation-warning-text">Some sections could not be refreshed. Available live data and competition tables remain visible below.</p>}

      {state.data && (
        <>
          <SectionError section={state.data.sections.live} fallback="Canonical results could not be loaded." />
          {summary && (
            <div className="foundation-result-summary">
              <div><strong>{summary.confirmedMatches}</strong><span>confirmed</span></div>
              <div><strong>{summary.liveMatches}</strong><span>live</span></div>
              <div><strong>{summary.pendingResults}</strong><span>pending scores</span></div>
              <div><strong>{summary.manualReviewResults}</strong><span>manual review</span></div>
            </div>
          )}

          {state.data.live && (
            <>
              <ResultsFeed feed={feed} />
              <div className="foundation-results-grid">
                <article className="foundation-results-card">
                  <span className="foundation-kicker">Live context</span>
                  <h3>Live group tables</h3>
                  <p>Calculated only from canonical live and confirmed group results.</p>
                  <div className="foundation-live-groups">
                    {groups.map(([groupCode, table]) => (
                      <GroupTable key={groupCode} groupCode={groupCode} table={table} reference={reference} />
                    ))}
                  </div>
                </article>

                <article className="foundation-results-card">
                  <span className="foundation-kicker">Live context · not your bracket</span>
                  <h3>Live knockout bracket</h3>
                  <p>All 15 canonical positions are shown. Unresolved participants remain honestly marked TBC.</p>
                  <LiveBracket rounds={bracketRounds} />
                </article>
              </div>
            </>
          )}

          {state.data.signedIn ? (
            <>
              <div className="foundation-results-grid">
                <Leaderboard
                  title="Original Predictor"
                  section={state.data.sections.originalLeaderboard}
                  note="Groups + original bracket"
                  currentUserId={state.data.currentUserId}
                  onCompare={row => compareOverall(row, RESULT_COMPETITION.ORIGINAL)}
                />
                <Leaderboard
                  title="KO Predictor"
                  section={state.data.sections.koLeaderboard}
                  note="Real knockout matches only"
                  currentUserId={state.data.currentUserId}
                  onCompare={row => compareOverall(row, RESULT_COMPETITION.KO_PREDICTOR)}
                />
              </div>
              <div className="foundation-results-grid">
                <PointsBreakdown title="Original Predictor breakdown" section={state.data.sections.originalPoints} competitionKey={RESULT_COMPETITION.ORIGINAL} />
                <PointsBreakdown title="KO Predictor breakdown" section={state.data.sections.koPoints} competitionKey={RESULT_COMPETITION.KO_PREDICTOR} />
              </div>
              <OverallComparison state={comparison} reference={reference} onClose={closeComparison} />
            </>
          ) : state.data.sections.session.status === 'error' ? (
            <p className="foundation-warning-text">Live results are available, but your signed-in competition data could not be checked: {state.data.sections.session.error}</p>
          ) : (
            <p className="foundation-empty-copy">Sign in to view the two scored leaderboards and separate points breakdowns. Guest predictions remain unscored.</p>
          )}
        </>
      )}
    </section>
  )
}
