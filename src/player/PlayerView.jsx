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

const COMPETITION_CONTEXT = {
  [LEAGUE_COMPETITION.ORIGINAL]: {
    eyebrow: 'Viewing Original Predictor picks',
    summary: 'Group scores, bracket picks and table evidence appear here as they are shared.',
    pointsLabel: 'Original points',
    releaseLabel: 'Original sharing',
    controlsTitle: 'Choose Original or KO',
  },
  [LEAGUE_COMPETITION.KO_PREDICTOR]: {
    eyebrow: 'Viewing KO Predictor picks',
    summary: 'Real knockout fixture picks stay separate from the Original Predictor.',
    pointsLabel: 'KO points',
    releaseLabel: 'KO sharing',
    controlsTitle: 'Choose KO or Original',
  },
}

function setHashParams({ userId, competitionKey }) {
  const params = new URLSearchParams()
  if (userId) params.set('user', userId)
  params.set('competition', competitionKey)
  globalThis.history?.replaceState?.(null, '', `#/player?${params.toString()}`)
}

function formatRank(rank) {
  return rank ? `#${rank}` : '—'
}

function statValue(value) {
  return Number(value) > 0 ? value : '—'
}

function PlayerHeader({ view }) {
  const context = COMPETITION_CONTEXT[view.competitionKey]

  return (
    <Card className={styles.header} as="section">
      <div className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className="page-eyebrow">{context.eyebrow}</span>
          <PlayerIdentity player={view.player} isCurrentUser={view.player.isCurrentUser} size="large" />
          <p>{context.summary}</p>
        </div>
        <Badge tone={view.release.state === 'released' ? 'safe' : 'info'}>{context.releaseLabel}</Badge>
      </div>
      <div className={styles.headerStats} aria-label="Player summary">
        <div><strong>{formatRank(view.player.rank)}</strong><span>Rank</span></div>
        <div><strong>{view.player.totalPoints}</strong><span>{context.pointsLabel}</span></div>
        <div><strong>{statValue(view.counts.visiblePredictions)}</strong><span>Released picks</span></div>
        <div><strong>{statValue(view.counts.protectedPredictions)}</strong><span>Hidden picks</span></div>
      </div>
    </Card>
  )
}

function PanelIntro({ eyebrow, title, badge = null, children }) {
  return (
    <div className={styles.sectionIntro}>
      <div>
        <span className="page-eyebrow">{eyebrow}</span>
        <h3>{title}</h3>
        {children && <p>{children}</p>}
      </div>
      {badge}
    </div>
  )
}

function EmptyState({ title, children }) {
  return (
    <div className={styles.emptyState}>
      <strong>{title}</strong>
      <p>{children}</p>
    </div>
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
      <PanelIntro
        eyebrow="Predictions"
        title="Match picks"
        badge={<Badge tone="info">{view.counts.visiblePredictions}/{view.predictions.length} shown</Badge>}
      >
        Released picks appear here. Hidden picks stay hidden until sharing opens.
      </PanelIntro>
      {view.predictions.length === 0 ? (
        <EmptyState title="No match picks to show yet">
          This player’s picks will appear here once there is something available to share.
        </EmptyState>
      ) : (
        <div className={styles.rows}>{view.predictions.map(row => <PredictionRow key={row.key} row={row} />)}</div>
      )}
    </Card>
  )
}

function BracketPanel({ view }) {
  if (view.competitionKey !== LEAGUE_COMPETITION.ORIGINAL) {
    return (
      <Card className={styles.panel} as="section">
        <PanelIntro eyebrow="Bracket" title="Original bracket only" />
        <EmptyState title="No bracket in KO Predictor">
          KO Predictor uses real knockout fixtures, so the pre-tournament bracket does not appear here.
        </EmptyState>
      </Card>
    )
  }

  return (
    <Card className={styles.panel} as="section">
      <PanelIntro
        eyebrow="Bracket"
        title="Original bracket"
        badge={<Badge tone="info">{view.bracketSummary.visibleCount}/{view.bracketSummary.totalCount} shown</Badge>}
      >
        Original bracket picks stay separate from KO Predictor match picks.
      </PanelIntro>
      <div className={styles.summaryStrip}>
        <div><span>Champion pick</span><strong>{view.bracketSummary.champion ?? 'Hidden'}</strong></div>
        <div><span>Released picks</span><strong>{view.bracketSummary.visibleCount}</strong></div>
      </div>
      {view.bracket.length === 0 ? (
        <EmptyState title="No bracket picks to show yet">
          Bracket picks will appear here once they are available to share.
        </EmptyState>
      ) : (
        <div className={styles.rows}>{view.bracket.map(row => <PredictionRow key={row.key} row={row} />)}</div>
      )}
    </Card>
  )
}

function TablesPanel({ view }) {
  if (view.competitionKey !== LEAGUE_COMPETITION.ORIGINAL) {
    return (
      <Card className={styles.panel} as="section">
        <PanelIntro eyebrow="Tables" title="Predicted tables" />
        <EmptyState title="Tables belong to Original Predictor">
          KO Predictor stays focused on the real knockout fixture list.
        </EmptyState>
      </Card>
    )
  }

  return (
    <Card className={styles.panel} as="section">
      <PanelIntro
        eyebrow="Tables"
        title="Predicted tables"
        badge={<Badge tone="info">{view.predictedTables.length} groups</Badge>}
      >
        Group table evidence is rebuilt from this player’s released group score picks.
      </PanelIntro>
      {view.predictedTables.length === 0 ? (
        <EmptyState title="No table rows to show yet">
          Predicted tables will appear here once released group picks are available.
        </EmptyState>
      ) : (
        <div className={styles.tableGroups}>
          {view.predictedTables.map(group => (
            <section key={group.groupCode} className={styles.row}>
              <div className={styles.tableGroupHeader}>
                <h4>Group {group.groupCode}</h4>
                <span>{group.rows.length} fixtures</span>
              </div>
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

      <Card className={`${styles.panel} ${styles.controls}`} as="section">
        <div className={styles.controlIntro}>
          <span className="page-eyebrow">Player picks</span>
          <h2>{COMPETITION_CONTEXT[competitionKey].controlsTitle}</h2>
        </div>
        <Tabs label="Player View competition" value={competitionKey} options={COMPETITION_OPTIONS} onChange={value => { setCompetitionKey(value); setActiveTab('predictions') }} />
        <Tabs label="Player View sections" value={activeTab} options={tabOptions} onChange={setActiveTab} />
        <small className={styles.controlNote}>Original and KO Predictor stay separate. This page is read-only.</small>
      </Card>

      {activeTab === 'predictions' && <PredictionsPanel view={view} />}
      {activeTab === 'bracket' && <BracketPanel view={view} />}
      {activeTab === 'tables' && <TablesPanel view={view} />}
    </div>
  )
}
