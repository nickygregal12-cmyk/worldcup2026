import React from 'react' // eslint-disable-line no-unused-vars -- React is required for JSX under the current lint config
import layoutStyles from './LeagueLayout.module.css'
import heroStyles from './LeagueHero.module.css'
import raceStyles from './leagueRace.module.css'
import { Badge, Button, Icon, PlayerIdentity, SelectField, StatusBar, TextField } from '../design-system/index.jsx'
import { buildLeagueCompetitionLifecycleCopy, buildLeagueRaceRows, canCreateKoLeague, formatOrdinal, LEAGUE_COMPETITION, RANK_MOVEMENT_PENDING_REASON } from './leagueModel.js'

function competitionName(competitionKey) {
  return competitionKey === LEAGUE_COMPETITION.ORIGINAL ? 'Original Predictor' : 'KO Predictor'
}

export function LeagueLifecycleBanner({ lifecycleState, competitionKey }) {
  if (!lifecycleState) return null
  const copy = competitionKey === LEAGUE_COMPETITION.ORIGINAL ? lifecycleState.originalCopy : lifecycleState.koCopy
  return (
    <aside className={layoutStyles.summaryCard} aria-label="League timing">
      <span className={layoutStyles.kicker}>League timing</span>
      <strong>{lifecycleState.headline}</strong>
      <small>{copy}</small>
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
        <Button type="button" variant="danger" size="small" loading={actionStatus === 'loading'} onClick={() => { void onConfirm() }}>
          {deleting ? 'Confirm delete' : 'Confirm leave'}
        </Button>
        <Button type="button" variant="secondary" size="small" disabled={actionStatus === 'loading'} onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}

export function LeagueCompetitionHeading({ competitionKey }) {
  const original = competitionKey === LEAGUE_COMPETITION.ORIGINAL
  return (
    <div className={raceStyles.compactCompetitionHeading}>
      <div>
        <span className={layoutStyles.kicker}>{competitionName(competitionKey)}</span>
        <h3>Standings</h3>
      </div>
      <Badge tone={original ? 'info' : 'warning'}>{original ? 'League table' : 'Separate table'}</Badge>
    </div>
  )
}

export function CompetitionChoice({ value, onChange, koReadiness }) {
  const koCreatable = canCreateKoLeague(koReadiness)
  return (
    <div className={layoutStyles.competitionChoice}>
      <div className={layoutStyles.competitionOptions} role="radiogroup" aria-label="League competition">
        {Object.values(LEAGUE_COMPETITION).map(key => {
          const disabled = key === LEAGUE_COMPETITION.KO_PREDICTOR && !koCreatable
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={value === key}
              className={layoutStyles.competitionOption}
              disabled={disabled}
              onClick={() => { if (!disabled) onChange(key) }}
            >
              {competitionName(key)}
            </button>
          )
        })}
      </div>
      {!koCreatable && <small>KO Predictor leagues open once a real knockout fixture is known.</small>}
    </div>
  )
}

export function LeaguePicker({ leagues, selectedId, onSelect }) {
  if (leagues.length <= 1) return null
  // SelectField has no optgroup support, so the competition moves into each option label.
  const optionLabel = league =>
    `${competitionName(league.competition)} · ${league.name} · ${league.memberCount} member${league.memberCount === 1 ? '' : 's'}`
  return (
    <SelectField
      label="Your leagues"
      className={heroStyles.leaguePicker}
      value={selectedId ?? ''}
      onChange={onSelect}
      options={leagues.map(league => ({ value: league.id, label: optionLabel(league) }))}
    />
  )
}

export function LeagueHero({ league, leagues, onSelectLeague }) {
  const original = league.competition === LEAGUE_COMPETITION.ORIGINAL
  return (
    <section className={heroStyles.identity} aria-label={`${league.name} overview`}>
      <div className={heroStyles.identityMain}>
        <span className={heroStyles.eyebrow}>Leagues · {competitionName(league.competition)}</span>
        <h2>{league.name}</h2>
        <p className={heroStyles.hint}>
          <Icon name="info" size={14} />
          <span>Open any member row to compare standings and released predictions.</span>
        </p>
      </div>
      <div className={heroStyles.identityMeta}>
        <span className={heroStyles.memberPill}><span className={heroStyles.memberDot} aria-hidden="true" />{league.memberCount} member{league.memberCount === 1 ? '' : 's'}</span>
        <LeaguePicker leagues={leagues} selectedId={league.id} onSelect={onSelectLeague} />
      </div>
      {!original && <span className="sr-only">This is a KO Predictor league, separate from Original Predictor leagues.</span>}
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
      <small>{stateCopy}</small>
    </article>
  )
}

export function LeaderList({ rows, onOpenPlayer }) {
  const raceRows = buildLeagueRaceRows(rows)
  const hasScoring = raceRows.some(row => row.scoredMatchCount > 0 || row.totalPoints > 0)
  return (
    <div className={raceStyles.leaderList}>
      {/* Rank movement is a designed not-yet state: no earlier table exists to compare against,
          so it is stated once here rather than as an empty per-row chip (owner ruling 2026-07-15). */}
      {hasScoring && (
        <p className={raceStyles.movementNote}>
          <Icon name="info" size={13} />
          <span>{RANK_MOVEMENT_PENDING_REASON}</span>
        </p>
      )}
      {raceRows.map(row => {
        const rowClassName = [
          raceStyles.leaderRow,
          row.isCurrentUser ? raceStyles.currentUserRow : '',
        ].filter(Boolean).join(' ')
        // Gap-to-leader is static text under the identity, not a live movement chip.
        const showGap = hasScoring && row.gapToLeader > 0
        const identity = (
          <span className={raceStyles.rowIdentity}>
            <PlayerIdentity player={row} isCurrentUser={row.isCurrentUser} meta={row.memberRole === 'owner' ? 'League owner' : (showGap ? row.gapToLeaderLabel : null)} />
          </span>
        )

        return (
          <button
            key={row.userId}
            type="button"
            className={rowClassName}
            aria-label={row.isCurrentUser ? 'Open your Player View' : `Open ${row.displayName}'s Player View`}
            onClick={() => onOpenPlayer(row)}
          >
            <span className={raceStyles.rankGroup}>
              <span className={raceStyles.rankMarker}>{hasScoring ? row.rank : '—'}</span>
            </span>
            {identity}
            <span className={raceStyles.points}>{row.totalPoints}</span>
            <span className={raceStyles.rowGo} aria-hidden="true"><Icon name="chevron" size={13} /></span>
          </button>
        )
      })}
    </div>
  )
}

export function LeagueManagePanel({ open, createName, onCreateNameChange, createCompetition, onCreateCompetitionChange, onSubmitCreate, joinCode, onJoinCodeChange, onSubmitJoin, busy, koReadiness }) {
  return (
    <details className={layoutStyles.managePanel} open={open}>
      <summary>Manage leagues</summary>
      <div className={layoutStyles.manageActions}>
        <form onSubmit={onSubmitCreate}>
          <span className={layoutStyles.kicker}>Create</span>
          <h3>Start a private league</h3>
          <TextField label="League name" value={createName} onChange={event => onCreateNameChange(event.target.value)} maxLength={40} required />
          <CompetitionChoice value={createCompetition} onChange={onCreateCompetitionChange} koReadiness={koReadiness} />
          <Button type="submit" loading={busy}>Create league</Button>
        </form>
        <form onSubmit={onSubmitJoin}>
          <span className={layoutStyles.kicker}>Join</span>
          <h3>Enter a league code</h3>
          <TextField label="10-character code" value={joinCode} onChange={event => onJoinCodeChange(event.target.value.toUpperCase())} maxLength={12} required />
          <Button type="submit" loading={busy}>Join league</Button>
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
  onOpenPlayer,
  leagueLifecycle, lifecycle, activeSummary, koReadiness, koLeagueReady,
  selectedLeague, pendingLeagueAction, actionStatus, onRequestAction, onConfirmAction,
}) {
  const loadingFirstLoad = (overview.status === 'loading' || overviewLoading) && !overview.data
  const stillRefreshing = overview.status === 'loading' || overviewLoading
  const showEmpty = !stillRefreshing && activeSection?.status === 'ready' && standings.length === 0
  const koWaiting = competitionKey === LEAGUE_COMPETITION.KO_PREDICTOR && !koLeagueReady

  return (
    <article className={raceStyles.standingsCard}>
      <LeagueCompetitionHeading competitionKey={competitionKey} />

      {loadingFirstLoad && <p className={layoutStyles.emptyCopy}>Loading league standings…</p>}
      {activeOverview && overview.status === 'partial' && !koWaiting && (
        <StatusBar tone="warning" title="This competition table could not be loaded" />
      )}
      {activeSection?.status === 'error' && !koWaiting && <StatusBar tone="danger" title={activeSection.error} />}
      {stillRefreshing && <p className={layoutStyles.emptyCopy}>Refreshing standings…</p>}
      {showEmpty && <p className={layoutStyles.emptyCopy}>No league members were returned.</p>}
      {standings.length > 0 && <LeaderList rows={standings} onOpenPlayer={onOpenPlayer} />}

      {activeOverview && (
        <LeagueSecondaryDetails title="League details">
          <LeagueLifecycleBanner lifecycleState={leagueLifecycle} competitionKey={competitionKey} />
          <CompetitionLifecycleNote competitionKey={competitionKey} lifecycle={lifecycle} summary={activeSummary} koReadiness={koReadiness} />
          {koWaiting ? (
            <LeagueKoReadinessCard koReadiness={koReadiness} />
          ) : (
            <LeagueSummaryCard title={competitionKey === LEAGUE_COMPETITION.ORIGINAL ? 'Original Predictor' : 'KO Predictor'} summary={activeSummary} section={activeSection} />
          )}
          <p className={layoutStyles.memberRow}>Members: <strong>{selectedLeague.memberCount}</strong>. Open a member row for the detailed comparison.</p>
          <div className={raceStyles.dangerZone}>
            <span className={layoutStyles.kicker}>Danger zone</span>
            {selectedLeague.memberRole === 'owner' ? (
              <Button type="button" variant="danger" size="small" disabled={actionStatus === 'loading'} onClick={() => onRequestAction('delete')}>Delete league</Button>
            ) : (
              <Button type="button" variant="secondary" size="small" disabled={actionStatus === 'loading'} onClick={() => onRequestAction('leave')}>Leave league</Button>
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
