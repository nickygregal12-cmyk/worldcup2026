import layoutStyles from './LeagueLayout.module.css'
import heroStyles from './LeagueHero.module.css'
import raceStyles from './leagueRace.module.css'
import { Badge, Icon, PlayerIdentity, StatusBar, TextField } from '../design-system/index.jsx'
import { buildLeagueCompetitionLifecycleCopy, buildLeagueRaceRows, formatOrdinal, LEAGUE_COMPETITION } from './leagueModel.js'

function competitionName(competitionKey) {
  return competitionKey === LEAGUE_COMPETITION.ORIGINAL ? 'Original Predictor' : 'KO Predictor'
}

function movementDirection(label) {
  if (!label) return null
  const trimmed = String(label).trim()
  if (trimmed.startsWith('+')) return 'up'
  if (trimmed.startsWith('-') || trimmed.startsWith('−')) return 'down'
  return 'same'
}

export function LeagueLifecycleBanner({ lifecycleState }) {
  if (!lifecycleState) return null
  return (
    <aside className={layoutStyles.summaryCard} aria-label="League timing">
      <span className={layoutStyles.kicker}>League timing</span>
      <strong>{lifecycleState.headline}</strong>
      <small>{lifecycleState.originalCopy}</small>
      <small>{lifecycleState.koCopy}</small>
    </aside>
  )
}

export function CompetitionLifecycleNote({ competitionKey, lifecycle, summary, koReadiness }) {
  const copy = buildLeagueCompetitionLifecycleCopy({ competitionKey, lifecycle, summary, koReadiness })
  return (
    <aside className={layoutStyles.summaryCard} aria-label={`${competitionName(competitionKey)} lifecycle`}>
      <span className={layoutStyles.kicker}>{copy.label}</span>
      <small>{copy.copy}</small>
    </aside>
  )
}

export function LeagueActionConfirmation({ action, leagueName, actionStatus, onConfirm, onCancel }) {
  if (!action) return null
  const deleting = action === 'delete'
  return (
    <div className={layoutStyles.destructiveConfirmation} role="alert">
      <div>
        <strong>{deleting ? `Delete ${leagueName}?` : `Leave ${leagueName}?`}</strong>
        <p>{deleting ? 'This removes the private league for every member. Prediction and scoring records remain separate.' : 'You will lose access to this league and its member comparisons.'}</p>
      </div>
      <div className={layoutStyles.inlineActions}>
        <button type="button" className="ui-button ui-button--danger ui-button--small" onClick={() => { void onConfirm() }} disabled={actionStatus === 'loading'}>{actionStatus === 'loading' ? 'Working…' : deleting ? 'Confirm delete' : 'Confirm leave'}</button>
        <button type="button" className="ui-button ui-button--secondary ui-button--small" onClick={onCancel} disabled={actionStatus === 'loading'}>Cancel</button>
      </div>
    </div>
  )
}

export function LeagueCompetitionHeading({ competitionKey }) {
  const original = competitionKey === LEAGUE_COMPETITION.ORIGINAL
  return (
    <div className={raceStyles.compactCompetitionHeading}>
      <div>
        <span className={layoutStyles.kicker}>Standings</span>
        <h3>{competitionName(competitionKey)}</h3>
      </div>
      <small>{original ? 'Groups + original bracket' : 'Real knockout fixtures'}</small>
    </div>
  )
}

export function CompetitionTabs({ value, onChange, koReadiness }) {
  return (
    <div className={heroStyles.segmented} role="tablist" aria-label="League competition">
      {Object.values(LEAGUE_COMPETITION).map(key => {
        const disabled = key === LEAGUE_COMPETITION.KO_PREDICTOR && !koReadiness?.open
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={value === key}
            disabled={disabled}
            onClick={() => { if (!disabled) onChange(key) }}
          >
            {competitionName(key)}
          </button>
        )
      })}
    </div>
  )
}

export function LeaguePicker({ leagues, selectedId, onSelect }) {
  if (leagues.length <= 1) return null
  return (
    <label className={heroStyles.leaguePicker}>
      <span className="sr-only">Your leagues</span>
      <select value={selectedId ?? ''} onChange={event => onSelect(event.target.value)}>
        {leagues.map(league => (
          <option key={league.id} value={league.id}>{league.name} · {league.memberCount} member{league.memberCount === 1 ? '' : 's'}</option>
        ))}
      </select>
    </label>
  )
}

export function LeagueHero({ league, leagues, onSelectLeague, competitionKey, onCompetitionChange, koReadiness, currentRank }) {
  return (
    <section className={heroStyles.hero} aria-label={`${league.name} overview`}>
      {currentRank && <span className={heroStyles.watermark} aria-hidden="true">#{currentRank}</span>}
      <div className={heroStyles.heroBody}>
        <span className={heroStyles.eyebrow}>Leagues · Race table</span>
        <h2>{league.name}</h2>
        <p className={heroStyles.heroHint}>
          <Icon name="info" size={14} />
          <span>Open any member row to compare standings and released predictions.</span>
        </p>
      </div>
      <div className={heroStyles.heroRow}>
        <CompetitionTabs value={competitionKey} onChange={onCompetitionChange} koReadiness={koReadiness} />
        <div className={heroStyles.heroControls}>
          <span className={heroStyles.glassPill}><span className={heroStyles.glassDot} />{league.memberCount} member{league.memberCount === 1 ? '' : 's'}</span>
          <LeaguePicker leagues={leagues} selectedId={league.id} onSelect={onSelectLeague} />
        </div>
      </div>
    </section>
  )
}

export function MiniMatchStrip({ fixture, href }) {
  if (!fixture || fixture.state !== 'live' || !fixture.participantsResolved) return null
  return (
    <a className={heroStyles.matchStrip} href={href} aria-label="Open Match Centre">
      <Badge tone="danger">Live</Badge>
      <span className={heroStyles.matchStripTeams}>
        {fixture.home.label} {fixture.score ?? 'v'} {fixture.away.label}
      </span>
      <span className={heroStyles.matchStripGo} aria-hidden="true"><Icon name="chevron" size={14} /></span>
    </a>
  )
}

export function LeagueSecondaryDetails({ title = 'League details', children }) {
  return (
    <details className={raceStyles.secondaryDetails}>
      <summary>{title}</summary>
      <div className={raceStyles.secondaryDetailsBody}>
        {children}
      </div>
    </details>
  )
}

export function LeagueKoReadinessCard({ koReadiness }) {
  return (
    <article className={layoutStyles.summaryCard}>
      <span className={layoutStyles.kicker}>KO Predictor</span>
      <strong>Waiting for real fixtures</strong>
      <small>{koReadiness?.label ?? 'KO Predictor opens when real fixtures are known'}</small>
    </article>
  )
}

export function LeagueSummaryCard({ title, summary, section }) {
  if (!summary || section?.status === 'error') {
    return (
      <article className={`${layoutStyles.summaryCard} ${layoutStyles.isError}`}>
        <span className={layoutStyles.kicker}>{title}</span>
        <strong>Unavailable</strong>
        <small>{section?.error ?? 'This competition summary could not be loaded.'}</small>
      </article>
    )
  }

  const stateCopy = summary.state === 'pre_competition'
    ? 'Standings begin after scoring starts.'
    : summary.state === 'empty'
      ? 'No members were returned.'
      : summary.leaderName
        ? `${summary.leaderName} leads on ${summary.leaderPoints} pts.`
        : 'Standings are ready.'

  return (
    <article className={layoutStyles.summaryCard}>
      <span className={layoutStyles.kicker}>{title}</span>
      <strong>{formatOrdinal(summary.currentRank)}</strong>
      <small>{summary.gapToLeaderLabel ?? stateCopy}</small>
    </article>
  )
}

function MovementChip({ label }) {
  if (!label) return null
  const direction = movementDirection(label)
  const toneClass = direction === 'up' ? raceStyles.movementUp : direction === 'down' ? raceStyles.movementDown : ''
  const iconRotation = direction === 'up' ? raceStyles.movementUpIcon : direction === 'down' ? raceStyles.movementDownIcon : ''
  return (
    <span className={`${raceStyles.movementChip} ${toneClass}`.trim()}>
      <span className={`${raceStyles.movementIcon} ${iconRotation}`.trim()}><Icon name="chevron" size={11} /></span>
      {label}
    </span>
  )
}

export function LeaderList({ rows, selectedUserId, onOpenDetail }) {
  const raceRows = buildLeagueRaceRows(rows)
  const hasScoring = raceRows.some(row => row.scoredMatchCount > 0 || row.totalPoints > 0)
  return (
    <div className={raceStyles.leaderList}>
      {raceRows.map(row => {
        const selected = row.userId === selectedUserId
        const rowClassName = [
          raceStyles.leaderRow,
          row.isCurrentUser ? raceStyles.currentUserRow : '',
          selected ? raceStyles.selectedRow : '',
        ].filter(Boolean).join(' ')
        const identity = (
          <span className={raceStyles.rowIdentity}>
            <PlayerIdentity player={row} isCurrentUser={row.isCurrentUser} meta={row.memberRole === 'owner' ? 'League owner' : null} />
          </span>
        )

        if (row.isCurrentUser) {
          return (
            <div key={row.userId} className={rowClassName}>
              <span className={raceStyles.rankMarker}>{hasScoring ? row.rank : '—'}</span>
              {identity}
              <span className={raceStyles.points}>{row.totalPoints}</span>
              <MovementChip label={row.rankMovementLabel} />
            </div>
          )
        }

        return (
          <button
            key={row.userId}
            type="button"
            className={rowClassName}
            aria-label={`Open ${row.displayName}'s league detail`}
            onClick={() => onOpenDetail(row)}
          >
            <span className={raceStyles.rankMarker}>{hasScoring ? row.rank : '—'}</span>
            {identity}
            <span className={raceStyles.points}>{row.totalPoints}</span>
            <span className={raceStyles.rowGo} aria-hidden="true"><Icon name="chevron" size={13} /></span>
          </button>
        )
      })}
    </div>
  )
}

export function LeagueDetailDestination({ comparison, onOpenProfile, children }) {
  if (!comparison) return null
  return (
    <section className={raceStyles.detailDestination} aria-label="League member detail">
      <div className={raceStyles.detailDestinationHeading}>
        <div>
          <span className={layoutStyles.kicker}>Member details</span>
          <strong>{comparison.otherName ?? 'Selected member'}</strong>
          <small>Breakdowns open here so the league table stays as rank, member and points.</small>
        </div>
        {onOpenProfile && (
          <button type="button" className="ui-button ui-button--secondary ui-button--small" onClick={onOpenProfile}>
            View full profile
          </button>
        )}
      </div>
      {children}
    </section>
  )
}

export function LeagueManagePanel({ open, createName, onCreateNameChange, onSubmitCreate, joinCode, onJoinCodeChange, onSubmitJoin, busy }) {
  return (
    <details className={layoutStyles.managePanel} open={open}>
      <summary>Manage leagues</summary>
      <div className={layoutStyles.manageActions}>
        <form onSubmit={onSubmitCreate}>
          <span className={layoutStyles.kicker}>Create</span>
          <h3>Start a private league</h3>
          <TextField label="League name" value={createName} onChange={event => onCreateNameChange(event.target.value)} maxLength={40} required />
          <button type="submit" className="ui-button ui-button--primary" disabled={busy}>Create league</button>
        </form>
        <form onSubmit={onSubmitJoin}>
          <span className={layoutStyles.kicker}>Join</span>
          <h3>Enter a league code</h3>
          <TextField label="10-character code" value={joinCode} onChange={event => onJoinCodeChange(event.target.value.toUpperCase())} maxLength={12} required />
          <button type="submit" className="ui-button ui-button--primary" disabled={busy}>Join league</button>
        </form>
      </div>
    </details>
  )
}

export function LeagueNotice({ notice }) {
  if (!notice) return null
  const tone = notice.tone === 'danger' ? 'danger' : notice.tone === 'safe' ? 'success' : 'info'
  return <StatusBar tone={tone} title={notice.message} />
}

export function LeagueStandingsPanel({
  competitionKey, overview, overviewLoading, activeOverview, activeSection, standings,
  comparisonMemberId, onOpenDetail,
  leagueLifecycle, lifecycle, activeSummary, koReadiness, koLeagueReady,
  selectedLeague, pendingLeagueAction, actionStatus, onRequestAction, onConfirmAction,
}) {
  const loadingFirstLoad = (overview.status === 'loading' || overviewLoading) && !overview.data
  const stillRefreshing = overview.status === 'loading' || overviewLoading
  const showEmpty = !stillRefreshing && activeSection?.status === 'ready' && standings.length === 0

  return (
    <article className={raceStyles.standingsCard}>
      <LeagueCompetitionHeading competitionKey={competitionKey} />

      {loadingFirstLoad && <p className={layoutStyles.emptyCopy}>Loading both competition tables…</p>}
      {activeOverview && overview.status === 'partial' && (
        <StatusBar tone="warning" title="One competition table could not be loaded">The available table remains usable.</StatusBar>
      )}
      {activeSection?.status === 'error' && <StatusBar tone="danger" title={activeSection.error} />}
      {stillRefreshing && <p className={layoutStyles.emptyCopy}>Refreshing standings…</p>}
      {showEmpty && <p className={layoutStyles.emptyCopy}>No league members were returned.</p>}
      {standings.length > 0 && <LeaderList rows={standings} selectedUserId={comparisonMemberId} onOpenDetail={onOpenDetail} />}

      {activeOverview && (
        <LeagueSecondaryDetails title="League details">
          <LeagueLifecycleBanner lifecycleState={leagueLifecycle} />
          <CompetitionLifecycleNote competitionKey={competitionKey} lifecycle={lifecycle} summary={activeSummary} koReadiness={koReadiness} />
          <div className={layoutStyles.summaryGrid}>
            <LeagueSummaryCard title="Original Predictor" summary={activeOverview.summaries.original} section={activeOverview.sections.original} />
            {koLeagueReady ? (
              <LeagueSummaryCard title="KO Predictor" summary={activeOverview.summaries.koPredictor} section={activeOverview.sections.koPredictor} />
            ) : (
              <LeagueKoReadinessCard koReadiness={koReadiness} />
            )}
          </div>
          <p className={layoutStyles.memberRow}>Shared member list: <strong>{activeOverview.members.length}</strong>. Open a member row for the detailed comparison.</p>
          <div className={raceStyles.dangerZone}>
            <span className={layoutStyles.kicker}>Danger zone</span>
            {selectedLeague.memberRole === 'owner' ? (
              <button type="button" className="ui-button ui-button--danger ui-button--small" onClick={() => onRequestAction('delete')} disabled={actionStatus === 'loading'}>Delete league</button>
            ) : (
              <button type="button" className="ui-button ui-button--secondary ui-button--small" onClick={() => onRequestAction('leave')} disabled={actionStatus === 'loading'}>Leave league</button>
            )}
            <LeagueActionConfirmation action={pendingLeagueAction} leagueName={selectedLeague.name} actionStatus={actionStatus} onConfirm={onConfirmAction} onCancel={() => onRequestAction(null)} />
          </div>
        </LeagueSecondaryDetails>
      )}
    </article>
  )
}

export function LeagueActionsCard({ joinCode, onCopyInvite, onShareLeague, hasSettings, onOpenSettings }) {
  return (
    <aside className={layoutStyles.actionsCard} aria-label="League actions">
      <span className={layoutStyles.kicker}>Actions</span>
      <div className={layoutStyles.actionPills}>
        <button type="button" className={layoutStyles.actionPill} onClick={onCopyInvite} disabled={!joinCode}>
          Copy invite <span>Code {joinCode ?? '—'}</span>
        </button>
        <button type="button" className={layoutStyles.actionPill} onClick={onShareLeague} disabled={!joinCode}>
          Share league <span>Code</span>
        </button>
        {hasSettings ? (
          <button type="button" className={layoutStyles.actionPill} onClick={onOpenSettings}>
            Settings <span>Manage</span>
          </button>
        ) : (
          <button type="button" className={layoutStyles.actionPill} disabled>
            Settings <span>Coming soon</span>
          </button>
        )}
      </div>
    </aside>
  )
}
