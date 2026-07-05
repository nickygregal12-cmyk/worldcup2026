import * as React from 'react'

const { useCallback, useEffect, useMemo, useState } = React
import { Badge, Button, Card, LinkButton, PlayerIdentity, StatusBar, Tabs, TeamLabel } from '../design-system/index.jsx'
import { LEAGUE_COMPETITION } from '../leagues/leagueModel.js'
import { loadPlayerView } from './playerViewService.js'
import styles from './PlayerView.module.css'

const COMPETITION_OPTIONS = [
  { value: LEAGUE_COMPETITION.ORIGINAL, label: 'Original Predictor' },
  { value: LEAGUE_COMPETITION.KO_PREDICTOR, label: 'KO Predictor' },
]

const TAB_OPTIONS = [
  { value: 'predictions', label: 'Predictions' },
  { value: 'bracket', label: 'Bracket' },
  { value: 'tables', label: 'Tables' },
]

function setHashParams({ userId, competitionKey }) {
  const params = new URLSearchParams()
  if (userId) params.set('user', userId)
  params.set('competition', competitionKey)
  globalThis.history?.replaceState?.(null, '', `#/player?${params.toString()}`)
}

function formatRank(rank) {
  return rank ? `#${rank}` : '—'
}

function PlayerHeader({ view }) {
  return (
    <Card className={styles.header} as="section">
      <PlayerIdentity player={view.player} isCurrentUser={view.player.isCurrentUser} size="large" />
      <div className={styles.headerStats} aria-label="Player summary">
        <div><strong>{formatRank(view.player.rank)}</strong><span>Rank</span></div>
        <div><strong>{view.player.totalPoints}</strong><span>Total points</span></div>
        <div><strong>{view.counts.visiblePredictions}</strong><span>Released picks</span></div>
        <div><strong>{view.counts.jokerPredictions}</strong><span>Jokers shown</span></div>
      </div>
    </Card>
  )
}

function PredictionRow({ row }) {
  return (
    <article className={styles.row}>
      <div className={styles.rowMain}>
        <div>
          <span>{row.stageLabel} · Match {row.matchNumber}</span>
          <div className={styles.fixture}>
            <TeamLabel team={row.homeTeam} label={row.homeLabel} unresolved={!row.homeTeam} compact />
            <span>v</span>
            <TeamLabel team={row.awayTeam} label={row.awayLabel} unresolved={!row.awayTeam} compact />
          </div>
        </div>
        <div className={styles.chips}>
          {row.visibility === 'visible' ? <Badge tone="safe">{row.outcomeLabel}</Badge> : <Badge tone="neutral">Protected</Badge>}
          {row.jokerApplied && <Badge tone="warning">Joker</Badge>}
        </div>
      </div>
      {row.visibility !== 'visible' && <p className={styles.protected}>{row.message}</p>}
    </article>
  )
}

function PredictionsPanel({ view }) {
  return (
    <Card className={styles.panel} as="section">
      <div className={styles.panelHeading}>
        <div><span className="page-eyebrow">Predictions</span><h3>Saved match picks</h3></div>
        <Badge tone="info">{view.predictions.length}</Badge>
      </div>
      <p>Rows show this player’s released picks only. Protected picks stay hidden until the existing privacy rules allow them.</p>
      {view.predictions.length === 0 ? <p className={styles.empty}>No prediction rows are available.</p> : (
        <div className={styles.rows}>{view.predictions.map(row => <PredictionRow key={row.key} row={row} />)}</div>
      )}
    </Card>
  )
}

function BracketPanel({ view }) {
  if (view.competitionKey !== LEAGUE_COMPETITION.ORIGINAL) {
    return (
      <Card className={styles.panel} as="section">
        <div className={styles.panelHeading}><div><span className="page-eyebrow">Bracket</span><h3>Original bracket only</h3></div></div>
        <p className={styles.empty}>KO Predictor uses real knockout fixtures, so the pre-tournament bracket does not appear in this competition.</p>
      </Card>
    )
  }

  return (
    <Card className={styles.panel} as="section">
      <div className={styles.panelHeading}>
        <div><span className="page-eyebrow">Bracket</span><h3>Original bracket summary</h3></div>
        <Badge tone="info">{view.bracketSummary.visibleCount}/{view.bracketSummary.totalCount} shown</Badge>
      </div>
      <div className={styles.summaryGrid}>
        <div><strong>{view.bracketSummary.champion ?? 'Hidden'}</strong><span>Champion pick</span></div>
        <div><strong>{view.bracketSummary.visibleCount}</strong><span>Released bracket picks</span></div>
      </div>
      {view.bracket.length === 0 ? <p className={styles.empty}>No bracket rows are available.</p> : (
        <div className={styles.rows}>{view.bracket.map(row => <PredictionRow key={row.key} row={row} />)}</div>
      )}
    </Card>
  )
}

function TablesPanel({ view }) {
  if (view.competitionKey !== LEAGUE_COMPETITION.ORIGINAL) {
    return (
      <Card className={styles.panel} as="section">
        <div className={styles.panelHeading}><div><span className="page-eyebrow">Tables</span><h3>Predicted tables</h3></div></div>
        <p className={styles.empty}>Predicted group tables belong to the Original Predictor. KO Predictor remains separate.</p>
      </Card>
    )
  }

  return (
    <Card className={styles.panel} as="section">
      <div className={styles.panelHeading}>
        <div><span className="page-eyebrow">Tables</span><h3>Predicted group table evidence</h3></div>
        <Badge tone="info">{view.predictedTables.length} groups</Badge>
      </div>
      <p>Compact table evidence is rebuilt from this player’s released group score predictions.</p>
      {view.predictedTables.length === 0 ? <p className={styles.empty}>Predicted table rows are not available yet.</p> : (
        <div className={styles.tableGroups}>
          {view.predictedTables.map(group => (
            <section key={group.groupCode} className={styles.row}>
              <h4>Group {group.groupCode}</h4>
              {group.rows.map(row => (
                <div key={row.key} className={styles.tableRow}>
                  <strong>Match {row.matchNumber}: {row.fixture}</strong>
                  <span>{row.score ?? row.note}</span>
                  {row.jokerApplied && <Badge tone="warning">Joker</Badge>}
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </Card>
  )
}

export default function PlayerView({ client, reference, lifecycle, memberUserId = null, initialCompetition = LEAGUE_COMPETITION.ORIGINAL, initialTab = 'predictions', initialData = null }) {
  const [competitionKey, setCompetitionKey] = useState(initialCompetition)
  const [activeTab, setActiveTab] = useState(initialTab)
  const [state, setState] = useState(() => initialData
    ? { status: 'ready', data: initialData, error: null }
    : { status: 'loading', data: null, error: null })

  const load = useCallback(async () => {
    setState(previous => ({ ...previous, status: 'loading', error: null }))
    try {
      const data = await loadPlayerView(client, { reference, memberUserId, competitionKey, lifecycle })
      setState({ status: 'ready', data, error: null })
      setHashParams({ userId: data.memberUserId, competitionKey: data.competitionKey })
    } catch (error) {
      setState({ status: 'error', data: null, error: error instanceof Error ? error.message : String(error) })
    }
  }, [client, competitionKey, lifecycle, memberUserId, reference])

  useEffect(() => { void Promise.resolve().then(load) }, [load])

  const view = state.data?.view ?? null
  const tabOptions = useMemo(() => (
    competitionKey === LEAGUE_COMPETITION.ORIGINAL
      ? TAB_OPTIONS
      : TAB_OPTIONS.filter(tab => tab.value === 'predictions')
  ), [competitionKey])

  useEffect(() => {
    if (!tabOptions.some(tab => tab.value === activeTab)) setActiveTab('predictions')
  }, [activeTab, tabOptions])

  if (state.status === 'loading' && !view) return <div className={styles.root} role="status">Loading player view…</div>
  if (state.status === 'error') return <StatusBar tone="danger" title="Player view could not load" action={<Button variant="secondary" size="small" icon="refresh" onClick={load}>Try again</Button>}>{state.error}</StatusBar>
  if (!state.data?.signedIn) return <StatusBar tone="info" title="Sign in to open player views" action={<LinkButton href="#/account" size="small">Account</LinkButton>}>Player prediction detail follows the same privacy rules as leagues and leaderboards.</StatusBar>

  return (
    <div className={styles.root}>
      <PlayerHeader view={view} />
      <StatusBar tone={view.release.state === 'released' ? 'safe' : 'info'} title={view.release.title}>{view.release.copy}</StatusBar>

      <Card className={styles.panel} as="section">
        <Tabs label="Player View competition" value={competitionKey} options={COMPETITION_OPTIONS} onChange={value => { setCompetitionKey(value); setActiveTab('predictions') }} />
        <Tabs label="Player View sections" value={activeTab} options={tabOptions} onChange={setActiveTab} />
        <small>Keep each competition in its own lane. This view is read-only.</small>
      </Card>

      {activeTab === 'predictions' && <PredictionsPanel view={view} />}
      {activeTab === 'bracket' && <BracketPanel view={view} />}
      {activeTab === 'tables' && <TablesPanel view={view} />}
    </div>
  )
}
