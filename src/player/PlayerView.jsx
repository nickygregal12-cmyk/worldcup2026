import * as React from 'react'

const { useCallback, useEffect, useMemo, useRef, useState } = React
import { Button, LinkButton, SkeletonPage, StatusBar } from '../design-system/index.jsx'
import { buildStandingComparison, LEAGUE_COMPETITION } from '../leagues/leagueModel.js'
import { loadCanonicalTournamentSnapshot, loadOverallHeadToHead } from '../results/resultService.js'
import { createLatestRequestGuard } from '../lib/latestRequest.js'
import { loadPlayerView } from './playerViewService.js'
import PlayerHeadToHead from './PlayerHeadToHead.jsx'
import PlayerInsight from './PlayerInsight.jsx'
import { PLAYER_COMPARISON_CONTEXT } from './playerComparisonModel.js'
import {
  BracketPanel,
  OverviewPanel,
  PlayerHeader,
  PlayerSectionNav,
  PredictionsPanel,
  TablesPanel,
} from './PlayerViewPresentation.jsx'
import styles from './PlayerView.module.css'

const COMPETITION_OPTIONS = [
  { value: LEAGUE_COMPETITION.ORIGINAL, label: 'Original Predictor' },
  { value: LEAGUE_COMPETITION.KO_PREDICTOR, label: 'KO Predictor' },
]

const ORIGINAL_TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'points', label: 'Points' },
  { value: 'predictions', label: 'Predictions' },
  { value: 'bracket', label: 'Bracket health' },
  { value: 'tables', label: 'Tables' },
]

const KO_TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'points', label: 'Points' },
  { value: 'predictions', label: 'Predictions' },
]

const HEAD_TO_HEAD_TAB = { value: 'headToHead', label: 'Head-to-head' }

function viewedInsightSection(comparison, currentUserId) {
  if (!comparison) {
    return currentUserId
      ? { status: 'loading', data: null, error: null }
      : { status: 'error', data: null, error: 'Sign in to open this points breakdown.' }
  }
  if (comparison.status === 'loading') return { status: 'loading', data: null, error: null }
  if (comparison.status === 'error') return { status: 'error', data: null, error: comparison.error }
  return comparison.data?.insights?.other ?? { status: 'error', data: null, error: 'Points breakdown is unavailable.' }
}

function setHashParams({ userId, competitionKey, tab }) {
  const params = new URLSearchParams()
  if (userId) params.set('user', userId)
  params.set('competition', competitionKey)
  if (tab && tab !== 'overview') params.set('tab', tab)
  globalThis.history?.replaceState?.(null, '', `#/player?${params.toString()}`)
}

export default function PlayerView({
  client,
  reference,
  lifecycle,
  koReadiness = null,
  memberUserId = null,
  initialCompetition = LEAGUE_COMPETITION.ORIGINAL,
  initialTab = 'overview',
  initialData = null,
}) {
  const [competitionKey, setCompetitionKey] = useState(initialCompetition)
  const [activeTab, setActiveTab] = useState(initialTab)
  const [state, setState] = useState(() => initialData
    ? { status: 'ready', data: initialData, error: null }
    : { status: 'loading', data: null, error: null })
  const [comparison, setComparison] = useState(null)
  const [snapshotState, setSnapshotState] = useState({ status: 'unavailable', snapshot: null, error: null })
  const comparisonRequests = useRef(createLatestRequestGuard())

  const load = useCallback(async () => {
    setState(previous => ({ ...previous, status: 'loading', error: null }))
    try {
      const data = await loadPlayerView(client, { reference, memberUserId, competitionKey, lifecycle })
      setState({ status: 'ready', data, error: null })
    } catch (error) {
      setState({ status: 'error', data: null, error: error instanceof Error ? error.message : String(error) })
    }
  }, [client, competitionKey, lifecycle, memberUserId, reference])

  useEffect(() => { void Promise.resolve().then(load) }, [load])

  const view = state.data?.view ?? null
  const currentUserId = state.data?.currentUserId ?? null
  const viewedUserId = state.data?.memberUserId ?? null
  const isSelf = state.data?.isSelf ?? Boolean(currentUserId && viewedUserId && currentUserId === viewedUserId)
  const canCompare = Boolean(currentUserId && viewedUserId && currentUserId !== viewedUserId)

  useEffect(() => {
    if (!client || (!view?.bracketPreview && !canCompare)) return undefined
    let active = true
    setSnapshotState({ status: 'loading', snapshot: null, error: null })
    loadCanonicalTournamentSnapshot(client, reference)
      .then(snapshot => { if (active) setSnapshotState({ status: 'ready', snapshot, error: null }) })
      .catch(error => { if (active) setSnapshotState({ status: 'error', snapshot: null, error: error instanceof Error ? error.message : String(error) }) })
    return () => { active = false }
  }, [canCompare, client, reference, view?.bracketPreview])

  const standingsRows = useMemo(
    () => (state.data?.standingsRows ?? []).map(row => ({ ...row, isCurrentUser: row.userId === currentUserId })),
    [state.data, currentUserId],
  )

  const loadComparison = useCallback(async () => {
    if (!client || !currentUserId || !viewedUserId || !reference?.tournamentId) {
      comparisonRequests.current.cancel()
      setComparison(null)
      return
    }
    const requestToken = comparisonRequests.current.begin()
    setComparison({
      status: 'loading',
      otherName: view?.player?.displayName ?? 'Player',
      otherUserId: viewedUserId,
      competitionKey,
      standings: buildStandingComparison(standingsRows, viewedUserId),
      standingsRows,
      data: null,
      error: null,
    })
    try {
      const data = await loadOverallHeadToHead(client, {
        tournamentId: reference.tournamentId,
        currentUserId,
        otherUserId: viewedUserId,
        competitionKey,
        reference,
      })
      if (!comparisonRequests.current.isCurrent(requestToken)) return
      setComparison(previous => ({ ...previous, status: 'ready', data, error: null }))
    } catch (error) {
      if (!comparisonRequests.current.isCurrent(requestToken)) return
      setComparison(previous => ({ ...previous, status: 'error', data: null, error: error instanceof Error ? error.message : String(error) }))
    }
  }, [client, competitionKey, currentUserId, reference, standingsRows, view, viewedUserId])

  useEffect(() => {
    const requestGuard = comparisonRequests.current
    void loadComparison()
    return () => { requestGuard.cancel() }
  }, [loadComparison])

  const tabOptions = useMemo(() => {
    const options = competitionKey === LEAGUE_COMPETITION.ORIGINAL ? [...ORIGINAL_TABS] : [...KO_TABS]
    if (canCompare) options.push(HEAD_TO_HEAD_TAB)
    return options
  }, [competitionKey, canCompare])

  const competitionOptions = useMemo(
    () => koReadiness?.open || competitionKey === LEAGUE_COMPETITION.KO_PREDICTOR ? COMPETITION_OPTIONS : COMPETITION_OPTIONS.slice(0, 1),
    [competitionKey, koReadiness?.open],
  )

  useEffect(() => {
    if (state.status === 'ready' && !tabOptions.some(tab => tab.value === activeTab)) setActiveTab('overview')
  }, [activeTab, state.status, tabOptions])

  useEffect(() => {
    if (state.status !== 'ready' || !viewedUserId) return
    setHashParams({ userId: viewedUserId, competitionKey, tab: activeTab })
  }, [activeTab, competitionKey, state.status, viewedUserId])

  if (state.status === 'loading' && !view) return <SkeletonPage cards={2} label="Loading player view" />
  if (state.status === 'error') return <StatusBar tone="danger" title="Player view could not load" action={<Button variant="secondary" size="small" icon="refresh" onClick={load}>Try again</Button>}>{state.error}</StatusBar>
  if (!state.data?.signedIn) return <StatusBar tone="info" title="Sign in to open player views" action={<LinkButton href="#/account" size="small">Account</LinkButton>}>Scored rows can still expose their points receipt where authorised; full profiles follow separate privacy rules.</StatusBar>

  return (
    <div className={styles.root}>
      <PlayerHeader
        view={view}
        competitionOptions={competitionOptions}
        onCompetitionChange={value => { setCompetitionKey(value); setActiveTab('overview') }}
      />
      <StatusBar tone={view.release.state === 'released' ? 'safe' : 'info'} title={view.release.title}>{view.release.copy}</StatusBar>
      <PlayerSectionNav activeTab={activeTab} options={tabOptions} onChange={setActiveTab} />

      {activeTab === 'overview' && <OverviewPanel view={view} canCompare={canCompare} onOpenTab={setActiveTab} />}
      {activeTab === 'predictions' && <PredictionsPanel view={view} />}
      {activeTab === 'bracket' && <BracketPanel view={view} healthState={snapshotState} reference={reference} />}
      {activeTab === 'tables' && <TablesPanel view={view} />}
      {activeTab === 'points' && (
        <PlayerInsight
          title={isSelf ? 'Your points receipt' : `${view.player.displayName}'s points receipt`}
          section={viewedInsightSection(comparison, currentUserId)}
          leaderboardRows={standingsRows}
          player={{ ...view.player, isCurrentUser: isSelf }}
          competitionKey={competitionKey}
          lifecycle={lifecycle}
        />
      )}
      {activeTab === 'headToHead' && (
        <PlayerHeadToHead
          state={comparison}
          reference={reference}
          liveSnapshot={snapshotState.snapshot}
          lifecycle={lifecycle}
          onClose={() => setActiveTab('overview')}
          context={PLAYER_COMPARISON_CONTEXT.OVERALL}
        />
      )}
    </div>
  )
}
