import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react' // eslint-disable-line no-unused-vars -- React is required for JSX under the current lint config
import { LinkButton, StatusBar, Tabs } from '../design-system/index.jsx'
import { LEADERBOARD_COMPETITION } from '../app/appRoutes.js'
import { loadOverallHeadToHead, loadResultsAndLeaderboards } from './resultService.js'
import { buildCanonicalResultFeed, buildLeaderboardLifecycle, buildLiveBracketRounds, buildResultsLifecycle, RESULT_COMPETITION } from './resultModel.js'
import { createLatestRequestGuard } from '../lib/latestRequest.js'
import { GroupTable, Leaderboard, LiveBracket, ResultsFeed, SectionError } from './ResultsPresentation.jsx'
import { buildStandingComparison } from '../leagues/leagueModel.js'
import { PlayerHeadToHead, PlayerInsight, PLAYER_COMPARISON_CONTEXT } from '../player/index.js'
import { RESULTS_PAGE_VIEW } from './resultsAccess.js'
import styles from './ResultsAccess.module.css'

function AccessSwitcher({ view }) {
  return (
    <nav className={styles.switcher} aria-label="Results and leaderboard destinations">
      <LinkButton href="#/results" variant={view === RESULTS_PAGE_VIEW.RESULTS ? 'primary' : 'secondary'} size="small" icon="results">Results</LinkButton>
      <LinkButton href="#/leaderboards" variant={view === RESULTS_PAGE_VIEW.LEADERBOARDS ? 'primary' : 'secondary'} size="small" icon="results">Leaderboards</LinkButton>
    </nav>
  )
}

export default function ResultsAndLeaderboards({ client, reference, lifecycle, view = RESULTS_PAGE_VIEW.RESULTS, initialCompetition = LEADERBOARD_COMPETITION.ORIGINAL }) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null })
  const [comparison, setComparison] = useState(null)
  const [competitionKey, setCompetitionKey] = useState(initialCompetition)
  const loadRequests = useRef(createLatestRequestGuard())
  const comparisonRequests = useRef(createLatestRequestGuard())

  useEffect(() => setCompetitionKey(initialCompetition), [initialCompetition])

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
  const resultsLifecycle = useMemo(() => buildResultsLifecycle({ lifecycle, liveSnapshot: state.data?.live }), [lifecycle, state.data])

  const compareOverall = async (row, requestedCompetitionKey) => {
    if (!state.data?.currentUserId) return
    const requestToken = comparisonRequests.current.begin()
    const leaderboardRows = requestedCompetitionKey === RESULT_COMPETITION.ORIGINAL
      ? state.data.sections.originalLeaderboard.data
      : state.data.sections.koLeaderboard.data
    const rowsWithCurrentUser = leaderboardRows.map(candidate => ({
      ...candidate,
      isCurrentUser: candidate.userId === state.data.currentUserId,
    }))
    setComparison({
      status: 'loading',
      otherName: row.displayName,
      otherUserId: row.userId,
      competitionKey: requestedCompetitionKey,
      standings: buildStandingComparison(rowsWithCurrentUser, row.userId),
      standingsRows: rowsWithCurrentUser,
      data: null,
      error: null,
    })
    try {
      const data = await loadOverallHeadToHead(client, {
        tournamentId: reference.tournamentId,
        currentUserId: state.data.currentUserId,
        otherUserId: row.userId,
        competitionKey: requestedCompetitionKey,
        reference,
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

  const selectCompetition = nextCompetition => {
    setCompetitionKey(nextCompetition)
    if (view !== RESULTS_PAGE_VIEW.LEADERBOARDS || typeof window === 'undefined') return
    const nextHash = `#/leaderboards?competition=${nextCompetition}`
    if (window.location.hash !== nextHash) window.history.replaceState(null, '', nextHash)
  }

  const isLeaderboards = view === RESULTS_PAGE_VIEW.LEADERBOARDS
  const selectedIsOriginal = competitionKey === LEADERBOARD_COMPETITION.ORIGINAL
  const selectedLeaderboard = selectedIsOriginal ? state.data?.sections.originalLeaderboard : state.data?.sections.koLeaderboard
  const selectedPoints = selectedIsOriginal ? state.data?.sections.originalPoints : state.data?.sections.koPoints
  const resultCompetitionKey = selectedIsOriginal ? RESULT_COMPETITION.ORIGINAL : RESULT_COMPETITION.KO_PREDICTOR
  const selectedLeaderboardRows = useMemo(() => selectedLeaderboard?.data ?? [], [selectedLeaderboard])
  const selectedLeaderboardLifecycle = useMemo(() => buildLeaderboardLifecycle({
    competitionKey: resultCompetitionKey,
    lifecycle,
    leaderboardRows: selectedLeaderboardRows,
    points: selectedPoints?.data,
  }), [lifecycle, resultCompetitionKey, selectedLeaderboardRows, selectedPoints])
  const selectedCurrentPlayer = selectedLeaderboardRows.find(row => row.userId === state.data?.currentUserId) ?? {
    userId: state.data?.currentUserId ?? null,
    displayName: selectedPoints?.data?.displayName ?? 'You',
    rank: null,
    totalPoints: selectedPoints?.data?.totalPoints ?? 0,
  }
  const title = isLeaderboards ? 'Full competition leaderboards' : 'Results, live tables and live bracket'

  return (
    <section className="foundation-panel foundation-results" aria-labelledby="euro28-results-heading">
      <AccessSwitcher view={view} />
      <div className="foundation-section-heading">
        <div>
          <span className="foundation-kicker">{isLeaderboards ? 'Separate competition standings' : 'Live tournament'}</span>
          <h2 id="euro28-results-heading">{title}</h2>
          <p>{isLeaderboards ? 'View every ranked player and your points breakdown. Original and KO Predictor totals never combine.' : 'Canonical live data never blends with predicted brackets.'}</p>
        </div>
      </div>

      {state.status === 'loading' && !state.data && <p className="foundation-empty-copy">Loading {isLeaderboards ? 'competition tables' : 'canonical results'}…</p>}
      {state.status === 'error' && !state.data && <p className="foundation-warning-text">{state.error}</p>}
      {state.status === 'loading' && state.data && <p className="foundation-empty-copy">Updating available sections…</p>}
      {state.error && state.data && <p className="foundation-warning-text">Refresh failed. The last available data remains visible: {state.error}</p>}
      {state.status === 'partial' && !state.error && <p className="foundation-warning-text">Some sections could not be refreshed. Available data remains visible below.</p>}

      {state.data && !isLeaderboards && (
        <>
          <StatusBar tone={resultsLifecycle.tone} title={resultsLifecycle.title}>{resultsLifecycle.body}</StatusBar>
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
                    {groups.map(([groupCode, table]) => <GroupTable key={groupCode} groupCode={groupCode} table={table} reference={reference} />)}
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
        </>
      )}

      {state.data && isLeaderboards && state.data.signedIn && (
        <>
          <div className={styles.competitionTabs}>
            <Tabs
              label="Leaderboard competition"
              value={competitionKey}
              options={[
                { value: LEADERBOARD_COMPETITION.ORIGINAL, label: 'Original Predictor' },
                { value: LEADERBOARD_COMPETITION.KO_PREDICTOR, label: 'KO Predictor' },
              ]}
              onChange={selectCompetition}
            />
          </div>
          <StatusBar tone={selectedLeaderboardLifecycle.tone} title={selectedLeaderboardLifecycle.title}>{selectedLeaderboardLifecycle.body}</StatusBar>
          <div className={styles.singleColumn}>
            <Leaderboard
              title={selectedIsOriginal ? 'Original Predictor' : 'KO Predictor'}
              section={selectedLeaderboard}
              note={selectedIsOriginal ? 'Groups + original bracket' : 'Real knockout matches only'}
              currentUserId={state.data.currentUserId}
              onCompare={row => compareOverall(row, resultCompetitionKey)}
            />
            <PlayerInsight
              title="Your points story"
              section={selectedPoints}
              leaderboardRows={selectedLeaderboardRows}
              player={{ ...selectedCurrentPlayer, isCurrentUser: true }}
              competitionKey={resultCompetitionKey}
              lifecycle={lifecycle}
            />
          </div>
          <PlayerHeadToHead state={comparison} reference={reference} lifecycle={lifecycle} onClose={closeComparison} context={PLAYER_COMPARISON_CONTEXT.OVERALL} />
        </>
      )}

      {state.data && isLeaderboards && !state.data.signedIn && (
        <article className={`foundation-results-card ${styles.signInCard}`}>
          <span className="foundation-kicker">Account required</span>
          <h3>Sign in to view the scored leaderboards</h3>
          <p>Guest predictions stay in this browser and remain unscored until they are safely added to an account.</p>
          <LinkButton href="#/account" icon="account">Sign in or create an account</LinkButton>
        </article>
      )}
    </section>
  )
}
