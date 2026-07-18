import { Badge, Card, Icon, PlayerIdentity, Tabs, TeamLabel } from '../design-system/index.jsx'
import { LEAGUE_COMPETITION } from '../leagues/leagueModel.js'
import { OriginalBracketHealth } from '../bracketHealth/index.js'
import styles from './PlayerView.module.css'

const CONTEXT = {
  [LEAGUE_COMPETITION.ORIGINAL]: {
    eyebrow: 'Original Predictor profile',
    summary: 'Group scores, predicted tables and the locked Original Bracket.',
    pointsLabel: 'Original points',
  },
  [LEAGUE_COMPETITION.KO_PREDICTOR]: {
    eyebrow: 'KO Predictor profile',
    summary: 'Real knockout fixture picks, released one match at a time.',
    pointsLabel: 'KO points',
  },
}

function formatRank(rank) {
  return rank ? `#${rank}` : '—'
}

function statValue(value) {
  return Number(value) > 0 ? value : '—'
}

export function PlayerHeader({ view, competitionOptions, onCompetitionChange }) {
  const context = CONTEXT[view.competitionKey]
  return (
    <section className={styles.header} aria-label={`${view.player.displayName} profile summary`}>
      {competitionOptions.length > 1 && (
        <Tabs className={styles.competitionTabs} label="Player View competition" value={view.competitionKey} options={competitionOptions} onChange={onCompetitionChange} />
      )}
      <div className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className="page-eyebrow">{context.eyebrow}</span>
          <PlayerIdentity player={view.player} isCurrentUser={view.player.isCurrentUser} size="large" meta={view.player.rank > 0 ? `${formatRank(view.player.rank)} · ${context.eyebrow}` : null} />
          <Badge tone={view.release.state === 'released' ? 'safe' : 'info'}>{view.release.state === 'released' ? 'Picks released' : 'Picks protected'}</Badge>
        </div>
        <div className={styles.heroPoints}>
          <strong>{view.player.totalPoints}</strong>
          <span>{context.pointsLabel}</span>
        </div>
      </div>
      <div className={styles.headerStats} aria-label="Player summary">
        <div><strong>{formatRank(view.player.rank)}</strong><span>Rank</span></div>
        <div><strong>{view.player.totalPoints}</strong><span>{context.pointsLabel}</span></div>
        <div><strong>{statValue(view.counts.visiblePredictions)}</strong><span>Released picks</span></div>
        <div><strong>{statValue(view.counts.protectedPredictions)}</strong><span>Hidden picks</span></div>
      </div>
    </section>
  )
}

export function PlayerSectionNav({ activeTab, options, onChange }) {
  return (
    <nav className={styles.sectionNav} aria-label="Player profile sections">
      <Tabs className={styles.sectionTabs} label="Player View sections" value={activeTab} options={options} onChange={onChange} />
    </nav>
  )
}

function PanelIntro({ eyebrow, title, badge = null, children }) {
  return (
    <div className={styles.sectionIntro}>
      <div><span className="page-eyebrow">{eyebrow}</span><h3>{title}</h3>{children && <p>{children}</p>}</div>
      {badge}
    </div>
  )
}

function EmptyState({ title, children }) {
  return <div className={styles.emptyState}><strong>{title}</strong><p>{children}</p></div>
}

function OverviewAction({ icon, title, copy, value, onClick }) {
  return (
    <button type="button" className={styles.overviewAction} onClick={onClick}>
      <span className={styles.overviewIcon}><Icon name={icon} size={19} /></span>
      <span><strong>{title}</strong><small>{copy}</small></span>
      <b>{value}</b>
      <Icon name="chevron" size={16} />
    </button>
  )
}

export function OverviewPanel({ view, canCompare, onOpenTab }) {
  const original = view.competitionKey === LEAGUE_COMPETITION.ORIGINAL
  return (
    <Card className={styles.panel} as="section">
      <PanelIntro eyebrow="At a glance" title="Profile overview">Everything available for this competition, without mixing Original and KO points.</PanelIntro>
      <div className={styles.overviewGrid}>
        <OverviewAction icon="predict" title="Released predictions" copy="Scores available to view" value={`${view.counts.visiblePredictions}/${view.predictions.length}`} onClick={() => onOpenTab('predictions')} />
        {original && <OverviewAction icon="bracket" title="Bracket health" copy="Saved path against real life" value={view.bracketPreview ? 'Open' : 'Waiting'} onClick={() => onOpenTab('bracket')} />}
        {original && <OverviewAction icon="leagues" title="Predicted tables" copy="Group score evidence" value={`${view.predictedTables.length} groups`} onClick={() => onOpenTab('tables')} />}
        {canCompare && <OverviewAction icon="leagues" title="Head-to-head" copy="Points, swings and different calls" value="Compare" onClick={() => onOpenTab('headToHead')} />}
      </div>
    </Card>
  )
}

function PredictionRow({ row }) {
  const visible = row.visibility === 'visible'
  return (
    <article className={`${styles.row} ${visible ? '' : styles.rowProtected}`.trim()}>
      <div className={styles.rowMain}>
        <div className={styles.rowFixture}>
          <span>{row.stageLabel} · Match {row.matchNumber}</span>
          <div className={styles.fixture}>
            <TeamLabel team={row.homeTeam} label={row.homeLabel} unresolved={!row.homeTeam} compact />
            <span>v</span>
            <TeamLabel team={row.awayTeam} label={row.awayLabel} unresolved={!row.awayTeam} compact />
          </div>
        </div>
        <div className={styles.pickResult}>
          <strong>{visible ? row.score ?? row.outcomeLabel : 'Protected'}</strong>
          {row.jokerApplied && <Badge tone="warning">Joker</Badge>}
        </div>
      </div>
      {!visible && <p className={styles.protected}>{row.message}</p>}
      {visible && row.score && row.outcomeLabel !== row.score && <small className={styles.outcome}>{row.outcomeLabel}</small>}
    </article>
  )
}

export function PredictionsPanel({ view }) {
  return (
    <Card className={styles.panel} as="section">
      <PanelIntro eyebrow="Predictions" title="Match picks" badge={<Badge tone="info">{view.counts.visiblePredictions}/{view.predictions.length} shown</Badge>}>
        Released picks appear here. Hidden picks stay protected until sharing opens.
      </PanelIntro>
      {view.predictions.length === 0
        ? <EmptyState title="No match picks to show yet">This player’s picks will appear here once there is something available to share.</EmptyState>
        : <div className={styles.rows}>{view.predictions.map(row => <PredictionRow key={row.key} row={row} />)}</div>}
    </Card>
  )
}

export function BracketPanel({ view, healthState, reference }) {
  return (
    <Card className={styles.panel} as="section">
      <PanelIntro eyebrow="Original Bracket" title="Bracket health" badge={<Badge tone="info">{view.bracketSummary.visibleCount}/{view.bracketSummary.totalCount} shown</Badge>}>
        The saved pre-tournament path stays frozen while live progress shows what remains possible.
      </PanelIntro>
      <div className={styles.summaryStrip}>
        <div><span>Champion pick</span><strong>{view.bracketSummary.champion ?? 'Hidden'}</strong></div>
        <div><span>Released picks</span><strong>{view.bracketSummary.visibleCount}</strong></div>
      </div>
      {view.bracketPreview && <OriginalBracketHealth reference={reference} preview={view.bracketPreview} liveSnapshot={healthState.snapshot} status={healthState.status} error={healthState.error} subjectLabel={view.player.isCurrentUser ? 'Your' : `${view.player.displayName}’s`} />}
      {view.bracket.length === 0
        ? <EmptyState title="No bracket picks to show yet">Bracket picks will appear here once they are available to share.</EmptyState>
        : <div className={styles.rows}>{view.bracket.map(row => <PredictionRow key={row.key} row={row} />)}</div>}
    </Card>
  )
}

export function TablesPanel({ view }) {
  return (
    <Card className={styles.panel} as="section">
      <PanelIntro eyebrow="Predicted tables" title="Group score evidence" badge={<Badge tone="info">{view.predictedTables.length} groups</Badge>}>
        These rows are rebuilt from this player’s released group score picks.
      </PanelIntro>
      {view.predictedTables.length === 0 ? (
        <EmptyState title="No table rows to show yet">Predicted tables will appear once released group picks are available.</EmptyState>
      ) : (
        <div className={styles.tableGroups}>
          {view.predictedTables.map(group => (
            <section key={group.groupCode} className={styles.tableGroup}>
              <div className={styles.tableGroupHeader}><h4>Group {group.groupCode}</h4><span>{group.rows.length} fixtures</span></div>
              {group.rows.map(row => (
                <div key={row.key} className={styles.tableRow}>
                  <strong>Match {row.matchNumber}: {row.fixture}</strong><span>{row.score ?? row.note}</span>{row.jokerApplied && <Badge tone="warning">Joker</Badge>}
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </Card>
  )
}
