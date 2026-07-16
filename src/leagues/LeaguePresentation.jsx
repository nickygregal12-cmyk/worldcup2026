import { useEffect, useRef, useState } from 'react'
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
  // The label says what the control DOES, not the page title again. SelectField has no optgroup
  // support, so the competition moves into each option label.
  const optionLabel = league =>
    `${competitionName(league.competition)} · ${league.name} · ${league.memberCount} member${league.memberCount === 1 ? '' : 's'}`
  return (
    <SelectField
      label="Switch league"
      className={heroStyles.leaguePicker}
      value={selectedId ?? ''}
      onChange={onSelect}
      options={leagues.map(league => ({ value: league.id, label: optionLabel(league) }))}
    />
  )
}

export function LeagueHero({ league, leagues, onSelectLeague }) {
  const original = league.competition === LEAGUE_COMPETITION.ORIGINAL
  const members = `${league.memberCount} member${league.memberCount === 1 ? '' : 's'}`
  // Compact identity: the competition and member count share one eyebrow line (the "Leagues" prefix
  // is dropped — the page title already says it), the league names itself once, and a single-line
  // hint carries the row affordance. For a member of more than one league the picker restates all of
  // this, so it is the only thing that repeats — by design, because it must.
  return (
    <section className={heroStyles.identity} aria-label={`${league.name} overview`}>
      <span className={heroStyles.eyebrow}><span className={heroStyles.memberDot} aria-hidden="true" />{competitionName(league.competition)} · {members}</span>
      <h2 className={heroStyles.name}>{league.name}</h2>
      <p className={heroStyles.hint}>Tap any row to compare picks and points.</p>
      <LeaguePicker leagues={leagues} selectedId={league.id} onSelect={onSelectLeague} />
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
        // One line of work per row (rank · identity · points · chevron) at the 48px floor. Meta is
        // trimmed to the essential inline marker: "You" or "League owner". Gap-to-leader is not shown
        // per row (owner ruling 2026-07-15: it tightens or trims) — it would stack the row at scale.
        return (
          <button
            key={row.userId}
            type="button"
            className={rowClassName}
            aria-label={row.isCurrentUser ? 'Open your Player View' : `Open ${row.displayName}'s Player View`}
            onClick={() => onOpenPlayer(row)}
          >
            <span className={raceStyles.rankMarker}>{hasScoring ? row.rank : '—'}</span>
            <span className={raceStyles.rowIdentity}>
              <PlayerIdentity player={row} isCurrentUser={row.isCurrentUser} inline meta={row.memberRole === 'owner' ? 'League owner' : null} />
            </span>
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
      <summary>Create or join a league</summary>
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
          {/* The "Members: N · open a member row" line was deleted: it duplicated the identity
              strip's member-count pill and its "open any member row" hint. */}
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

export function LeagueActionsCard({ joinCode, onCopyInvite, onShareLeague, hasSettings, onOpenSettings, confirmMs = 1800 }) {
  // Confirmation lives ON the button: the handler returns a short label on success, the button shows
  // it with a tick for a moment, and stays inert during the interval so double-taps don't stack. This
  // is always in view at the point of tap — the old up-the-page notice for copy/share is gone.
  const [confirmed, setConfirmed] = useState(null) // { key, label } | null
  const timer = useRef(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const runAction = async (key, handler) => {
    const label = await handler()
    if (!label) return // failure, or a native share sheet handled it — no on-button confirmation
    setConfirmed({ key, label })
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setConfirmed(null), confirmMs)
  }

  const isDone = key => confirmed?.key === key

  return (
    <aside className={layoutStyles.actionsCard} aria-label="League actions">
      <span className={layoutStyles.kicker}>Actions</span>
      <div className={layoutStyles.actionPills}>
        <button type="button" className={layoutStyles.actionPill} onClick={() => runAction('invite', onCopyInvite)} disabled={!joinCode || isDone('invite')} aria-live="polite">
          {isDone('invite')
            ? <span className={layoutStyles.actionDone}>{confirmed.label} <Icon name="check" size={15} /></span>
            : <>Copy invite <span>Code {joinCode ?? '—'}</span></>}
        </button>
        <button type="button" className={layoutStyles.actionPill} onClick={() => runAction('share', onShareLeague)} disabled={!joinCode || isDone('share')} aria-live="polite">
          {isDone('share')
            ? <span className={layoutStyles.actionDone}>{confirmed.label} <Icon name="check" size={15} /></span>
            : <>Share league <span>Invite link</span></>}
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
