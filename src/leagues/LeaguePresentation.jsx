import layoutStyles from './LeagueLayout.module.css'
import heroStyles from './LeagueHero.module.css'
import raceStyles from './leagueRace.module.css'
import { Badge, Button, Icon, LinkButton, PlayerIdentity, SkeletonBlock, StatusBar, TextField } from '../design-system/index.jsx'
import { buildLeagueCompetitionLifecycleCopy, buildLeagueRaceRows, formatOrdinal, LEAGUE_COMPETITION, RANK_MOVEMENT_PENDING_REASON } from './leagueModel.js'

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

export function LeagueCompetitionHeading({ competitionKey, summary, refreshing = false }) {
  const original = competitionKey === LEAGUE_COMPETITION.ORIGINAL
  const scoring = summary?.state === 'active'
  return (
    <div className={raceStyles.compactCompetitionHeading}>
      <div>
        <span className={layoutStyles.kicker}>{competitionName(competitionKey)}</span>
        <h3>{competitionName(competitionKey)} table</h3>
        <p>{refreshing ? 'Loading the latest official standings.' : scoring ? 'Scores update from confirmed tournament results.' : 'The table will move when official scoring begins.'}</p>
      </div>
      <Badge tone={refreshing ? 'info' : scoring ? 'safe' : original ? 'info' : 'neutral'}>
        {refreshing ? 'Updating' : scoring ? 'Up to date' : original ? 'Ready' : 'Separate table'}
      </Badge>
    </div>
  )
}

// The league switcher is a chip rail (consolidated prototype-pack ruling 2026-07-18),
// not a dropdown: every league is one tap, and the selected chip is stated.
export function LeaguePicker({ leagues, selectedId, onSelect }) {
  if (leagues.length === 0) return null
  return (
    <div className={heroStyles.leaguePicker} role="group" aria-label="Switch league">
      {leagues.map(league => {
        const selected = league.id === selectedId
        return (
          <button
            key={league.id}
            type="button"
            className={selected ? `${heroStyles.leagueChip} ${heroStyles.leagueChipSelected}` : heroStyles.leagueChip}
            aria-pressed={selected}
            onClick={() => onSelect(league.id)}
          >
            {league.name}
          </button>
        )
      })}
    </div>
  )
}

// The league identity card is the prototype's pitch-striped surface card (full-redesign
// ruling 2026-07-18): name, members-and-code meta and share. Nothing else.
export function LeagueHero({ league, summary, lifecycleState, onShare, onCopyCode = null }) {
  const original = league.competition === LEAGUE_COMPETITION.ORIGINAL
  const members = `${league.memberCount} member${league.memberCount === 1 ? '' : 's'}`
  const raceActive = summary?.state === 'active'
  const tournamentStarted = Boolean(lifecycleState?.tournamentStarted)
  return (
    <section className={heroStyles.identity} aria-label={`${league.name} overview`}>
      <div className={heroStyles.identityMain}>
        <div className={heroStyles.identityCopy}>
          <h2 className={heroStyles.name}>{league.name}</h2>
          <p className={heroStyles.meta}>{members} · code {league.joinCode ?? '—'}</p>
        </div>
        <div className={heroStyles.cardActions}>
          {onCopyCode && (
            <button type="button" className={heroStyles.shareButton} aria-label="Copy invite code" onClick={() => { void onCopyCode() }}>
              <Icon name="copy" size={16} />
            </button>
          )}
          {onShare && (
            <button type="button" className={heroStyles.shareButton} aria-label="Share league" onClick={() => { void onShare() }}>
              <Icon name="share" size={16} />
            </button>
          )}
        </div>
      </div>
      {!tournamentStarted && (
        <p className={heroStyles.hint}>
          <Icon name="lock" size={13} />
          <span>Share the league before kick-off. Every saved pick stays protected until lock.</span>
        </p>
      )}
      {tournamentStarted && (
        <p className={heroStyles.hint}>{raceActive ? 'Follow the live points race — official scoring record.' : 'Official results will move this table as soon as scoring records are available.'}</p>
      )}
      {/* Single-competition boundary, stated for assistive tech: a league IS one competition. */}
      <span className="sr-only">{competitionName(league.competition)} league{original ? '' : ' — separate from Original Predictor leagues'}.</span>
    </section>
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
      <div className={raceStyles.tableHeader} aria-hidden="true">
        <span>Rank</span><span>Player</span><span>Points</span><span />
      </div>
      {raceRows.map((row, index) => {
        const rowClassName = row.isCurrentUser ? `${raceStyles.leaderRow} ${raceStyles.currentUserRow}` : raceStyles.leaderRow
        // The table stays compact: rank, player and points are the default evidence; detail
        // lives behind the full-row destination.
        return (
          <div key={row.userId} className={raceStyles.rowGroup}>
            {/* The podium cutline: the dashed boundary under the top three once scoring separates the table. */}
            {hasScoring && index === 3 && (
              <div className={raceStyles.podiumCutline} aria-hidden="true"><span /><em>Podium</em><span /></div>
            )}
            <button
              type="button"
              className={rowClassName}
              aria-label={row.isCurrentUser ? 'Open your Player View' : `Open ${row.displayName}'s Player View`}
              onClick={() => onOpenPlayer(row)}
            >
              <span className={raceStyles.rankMarker}>{hasScoring ? row.rank : '—'}</span>
              <span className={raceStyles.rowIdentity}>
                <PlayerIdentity player={row} isCurrentUser={row.isCurrentUser} meta={row.memberRole === 'owner' ? 'League owner' : null} />
              </span>
              <span className={raceStyles.points}>{row.totalPoints}</span>
              <span className={raceStyles.rowGo} aria-hidden="true"><Icon name="chevron" size={13} /></span>
            </button>
          </div>
        )
      })}
      <p className={raceStyles.tableFootnote}>Points are the official confirmed scoring record. Open any member for their full breakdown.</p>
      {/* Rank movement is a designed not-yet state: no earlier table exists to compare against,
          so it is stated once after the table rather than faked per row. */}
      {hasScoring && (
        <p className={raceStyles.movementNote}>
          <Icon name="info" size={13} />
          <span>{RANK_MOVEMENT_PENDING_REASON}</span>
        </p>
      )}
    </div>
  )
}

export function LeagueManagePanel({ open, createName, onCreateNameChange, competitionKey, onSubmitCreate, joinCode, onJoinCodeChange, onSubmitJoin, busy, selectedLeague = null, pendingLeagueAction = null, actionStatus = 'idle', onRequestAction = null, onConfirmAction = null }) {
  return (
    <details className={layoutStyles.managePanel} open={open}>
      <summary>Create or join a league</summary>
      <div className={layoutStyles.manageActions}>
        <form onSubmit={onSubmitCreate}>
          <span className={layoutStyles.kicker}>Create</span>
          <h3>Start a {competitionName(competitionKey)} league</h3>
          <small className={layoutStyles.manageHint}>It will have its own members, invite and standings.</small>
          <TextField label="League name" value={createName} onChange={event => onCreateNameChange(event.target.value)} maxLength={40} required />
          <Button type="submit" loading={busy}>Create league</Button>
        </form>
        <form onSubmit={onSubmitJoin}>
          <span className={layoutStyles.kicker}>Join</span>
          <h3>Enter a league code</h3>
          <small className={layoutStyles.manageHint}>The invite opens its Original or KO league collection automatically.</small>
          <TextField label="10-character code" value={joinCode} onChange={event => onJoinCodeChange(event.target.value.toUpperCase())} maxLength={12} required />
          <Button type="submit" loading={busy}>Join league</Button>
        </form>
      </div>
      {selectedLeague && onRequestAction && (
        <div className={raceStyles.dangerZone}>
          <span className={layoutStyles.kicker}>Danger zone</span>
          {selectedLeague.memberRole === 'owner' ? (
            <Button type="button" variant="danger" size="small" disabled={actionStatus === 'loading'} onClick={() => onRequestAction('delete')}>Delete league</Button>
          ) : (
            <Button type="button" variant="secondary" size="small" disabled={actionStatus === 'loading'} onClick={() => onRequestAction('leave')}>Leave league</Button>
          )}
          <LeagueActionConfirmation action={pendingLeagueAction} leagueName={selectedLeague.name} actionStatus={actionStatus} onConfirm={onConfirmAction} onCancel={() => onRequestAction(null)} />
        </div>
      )}
    </details>
  )
}

export function LeagueNotice({ notice }) {
  if (!notice) return null
  const tone = notice.tone === 'danger' ? 'danger' : notice.tone === 'safe' ? 'success' : 'info'
  return <StatusBar tone={tone} title={notice.message} />
}

export function LeagueSignedOut() {
  return (
    <section className={layoutStyles.signedOutCard} aria-labelledby="league-sign-in-heading">
      <span className={layoutStyles.signedOutIcon}><Icon name="leagues" size={28} /></span>
      <div>
        <span className={layoutStyles.kicker}>Your private tables</span>
        <h2 id="league-sign-in-heading">Bring your predictor league together</h2>
        <p>Sign in to create a league, join with an invite code and follow every points race from one place.</p>
      </div>
      <LinkButton href="#/account" icon="account">Sign in to continue</LinkButton>
    </section>
  )
}

export function LeagueStandingsPanel({ overview, overviewLoading, activeOverview, standings, onOpenPlayer }) {
  const loadingFirstLoad = (overview.status === 'loading' || overviewLoading) && !overview.data
  const stillRefreshing = overview.status === 'loading' || overviewLoading
  const showEmpty = !stillRefreshing && overview.status === 'ready' && standings.length === 0
  const activeSection = activeOverview
    ? { status: 'ready', data: standings, error: null }
    : overview.status === 'error'
      ? { status: 'error', data: [], error: 'League standings could not be loaded.' }
      : null

  // Full-redesign ruling 2026-07-18: the table card opens straight onto the rows, like the
  // prototype — the old competition heading card is gone from the flow. Invite/share detail,
  // lifecycle notes and the danger zone live behind League details below the rows.
  return (
    <article className={raceStyles.standingsCard}>

      {loadingFirstLoad && (
        <div className={raceStyles.loadingRows} role="status" aria-label="Loading league standings">
          <SkeletonBlock height="line" />
          <SkeletonBlock height="line" />
          <SkeletonBlock height="line" />
        </div>
      )}
      {activeSection?.status === 'error' && <StatusBar tone="danger" title={activeSection.error} />}
      {stillRefreshing && <p className={layoutStyles.emptyCopy}>Refreshing standings…</p>}
      {showEmpty && <p className={layoutStyles.emptyCopy}>No league members were returned.</p>}
      {standings.length > 0 && <LeaderList rows={standings} onOpenPlayer={onOpenPlayer} />}

    </article>
  )
}

/* Standings | Live activity — the prototype's mutually exclusive views. */
export function LeagueViewToggle({ view, onChange }) {
  const options = [['standings', 'Standings'], ['activity', 'Live activity']]
  return (
    <div className={raceStyles.viewToggle} role="group" aria-label="League view">
      {options.map(([value, label]) => (
        <button key={value} type="button" aria-pressed={view === value} className={view === value ? raceStyles.viewOn : ''} onClick={() => onChange(value)}>
          {label}
        </button>
      ))}
    </div>
  )
}

/* Real match events from the canonical official-result feed; member-level entries
   join when per-member scoring aggregates exist server-side. */
export function LeagueActivityPanel({ entries, tournamentStarted }) {
  return (
    <article className={raceStyles.standingsCard}>
      {entries.length === 0 && (
        <p className={layoutStyles.emptyCopy}>{tournamentStarted
          ? 'No match events yet. Activity appears as official scores arrive.'
          : 'Activity starts at kick-off. Match events and scoring moments will land here.'}</p>
      )}
      {entries.length > 0 && (
        <ul className={raceStyles.activityList}>
          {entries.map(entry => (
            <li key={entry.key}>
              <a href={`#/match-centre?match=${entry.matchNumber}&competition=original`}>
                {entry.live && <Badge tone="danger">Live</Badge>}
                <strong>{entry.label}</strong>
                <small>{entry.detail}</small>
              </a>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

