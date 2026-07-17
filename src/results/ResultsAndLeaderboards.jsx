import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react' // eslint-disable-line no-unused-vars -- React is required for JSX under the current lint config
import { LinkButton, SkeletonPage, StatusBar, Tabs } from '../design-system/index.jsx'
import { LEADERBOARD_COMPETITION } from '../app/appRoutes.js'
import { loadOverallHeadToHead, loadResultsAndLeaderboards } from './resultService.js'
import { buildCanonicalResultFeed, buildLeaderboardLifecycle, buildLiveBracketRounds, buildResultsLifecycle, RESULT_COMPETITION } from './resultModel.js'
import { createLatestRequestGuard } from '../lib/latestRequest.js'
import { Leaderboard, SectionError } from './ResultsPresentation.jsx'
import { buildStandingComparison } from '../leagues/leagueModel.js'
import { PlayerHeadToHead, PlayerInsight, PLAYER_COMPARISON_CONTEXT, openPlayerView } from '../player/index.js'
import { RESULTS_PAGE_VIEW } from './resultsAccess.js'
import ResultsExperience from './ResultsExperience.jsx'
import { buildResultsHubModel } from './resultsHubModel.js'
import styles from './ResultsAccess.module.css'

function AccessSwitcher({ view }) {
  return (
    <nav className={styles.switcher} aria-label="Results and leaderboard destinations">
      <LinkButton href="#/results" variant={view === RESULTS_PAGE_VIEW.RESULTS ? 'primary' : 'secondary'} size="small" icon="results">Results</LinkButton>
      <LinkButton href="#/leaderboards" variant={view === RESULTS_PAGE_VIEW.LEADERBOARDS ? 'primary' : 'secondary'} size="small" icon="results">Leaderboards</LinkButton>
    </nav>
  )
}

export default function ResultsAndLeaderboards({ client, reference, lifecycle, koReadiness = null, view = RESULTS_PAGE_VIEW.RESULTS, initialCompetition = LEADERBOARD_COMPETITION.ORIGINAL }) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null })
  const [comparison, setComparison] = useState(null)
  const [competitionKey, setCompetitionKey] = useState(initialCompetition)
  const loadRequests = useRef(createLatestRequestGuard())
  const comparisonRequests = useRef(createLatestRequestGuard())
  const koLeaderboardVisible = Boolean(koReadiness?.open)

  useEffect(() => setCompetitionKey(initialCompetition), [initialCompetition])

  useEffect(() => {
    if (koLeaderboardVisible || competitionKey !== LEADERBOARD_COMPETITION.KO_PREDICTOR) return
    setCompetitionKey(LEADERBOARD_COMPETITION.ORIGINAL)
    if (view === RESULTS_PAGE_VIEW.LEADERBOARDS && typeof window !== 'undefined') {
      window.history.replaceState(null, '', '#/leaderboards?competition=original')
    }
  }, [competitionKey, koLeaderboardVisible, view])

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

  const feed = useMemo(() => buildCanonicalResultFeed({ reference, liveSnapshot: state.data?.live }), [reference, state.data])
  const bracketRounds = useMemo(() => buildLiveBracketRounds({ reference, liveSnapshot: state.data?.live }), [reference, state.data])
  const resultsLifecycle = useMemo(() => buildResultsLifecycle({ lifecycle, liveSnapshot: state.data?.live }), [lifecycle, state.data])
  const resultsHub = useMemo(() => buildResultsHubModel({ lifecycle, lifecycleState: resultsLifecycle, feed }), [lifecycle, resultsLifecycle, feed])

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
  const effectiveCompetitionKey = koLeaderboardVisible ? competitionKey : LEADERBOARD_COMPETITION.ORIGINAL
  const selectedIsOriginal = effectiveCompetitionKey === LEADERBOARD_COMPETITION.ORIGINAL
  const selectedLeaderboard = selectedIsOriginal ? state.data?.sections.originalLeaderboard : state.data?.sections.koLeaderboard
  const selectedPoints = selectedIsOriginal ? state.data?.sections.originalPoints : state.data?.sections.koPoints
  const resultCompetitionKey = selectedIsOriginal ? RESULT_COMPETITION.ORIGINAL : RESULT_COMPETITION.KO_PREDICTOR
  const openLeaderboardPlayerView = row => {
    if (!row?.userId) return
    openPlayerView({ userId: row.userId, competitionKey: resultCompetitionKey })
  }
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
  const title = isLeaderboards ? 'Full competition leaderboards' : 'Results & standings'

  return (
    <section className={`${isLeaderboards ? 'foundation-panel' : styles.resultsPage} foundation-results`} aria-labelledby="euro28-results-heading">
      <AccessSwitcher view={view} />
      <div className={isLeaderboards ? 'foundation-section-heading' : styles.resultsHeader}>
        <div>
          <span className="foundation-kicker">{isLeaderboards ? 'Separate competition standings' : 'Official tournament'}</span>
          <h2 id="euro28-results-heading">{title}</h2>
          <p>{isLeaderboards ? 'View every ranked player and your points breakdown. Original and KO Predictor have separate leaderboards.' : 'Live scores, fixtures and the qualification picture.'}</p>
        </div>
      </div>

      {state.status === 'loading' && !state.data && <SkeletonPage cards={2} label={`Loading ${isLeaderboards ? 'competition tables' : 'official results'}`} />}
      {state.status === 'error' && !state.data && <p className="foundation-warning-text">{state.error}</p>}
      {state.status === 'loading' && state.data && <p className="foundation-empty-copy">Updating available sections…</p>}
      {state.error && state.data && <p className="foundation-warning-text">Refresh failed. The last available data remains visible: {state.error}</p>}
      {state.status === 'partial' && !state.error && <p className="foundation-warning-text">Some sections could not be refreshed. Available data remains visible below.</p>}

      {state.data && !isLeaderboards && (
        <>
          <SectionError section={state.data.sections.live} fallback="Official results could not be loaded." />
          {state.data.live && (
            <ResultsExperience
              model={resultsHub}
              feed={feed}
              liveSnapshot={state.data.live}
              bracketRounds={bracketRounds}
              reference={reference}
            />
          )}
        </>
      )}

      {state.data && isLeaderboards && state.data.signedIn && (
        <>
          <div className={styles.competitionTabs}>
            <Tabs
              label="Leaderboard competition"
              value={effectiveCompetitionKey}
              options={[
                { value: LEADERBOARD_COMPETITION.ORIGINAL, label: 'Original Predictor' },
                ...(koLeaderboardVisible ? [{ value: LEADERBOARD_COMPETITION.KO_PREDICTOR, label: 'KO Predictor' }] : []),
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
              onOpenPlayer={openLeaderboardPlayerView}
            />
            <PlayerInsight
              title="Your points receipt"
              section={selectedPoints}
              leaderboardRows={selectedLeaderboardRows}
              player={{ ...selectedCurrentPlayer, isCurrentUser: true }}
              competitionKey={resultCompetitionKey}
              lifecycle={lifecycle}
            />
          </div>
          <PlayerHeadToHead state={comparison} reference={reference} liveSnapshot={state.data.live} lifecycle={lifecycle} onClose={closeComparison} context={PLAYER_COMPARISON_CONTEXT.OVERALL} />
        </>
      )}

      {state.data && isLeaderboards && !state.data.signedIn && (
        <article className={`foundation-results-card ${styles.signInCard}`}>
          <span className="foundation-kicker">Preview access</span>
          <h3>Public leaderboards are part of tournament launch</h3>
          <p>This preview currently asks you to sign in. Guest predictions stay in this browser and remain unchanged.</p>
          <LinkButton href="#/account" icon="account">Sign in or create an account</LinkButton>
        </article>
      )}
    </section>
  )
}
