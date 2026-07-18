import { useEffect, useRef, useState } from 'react'
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
export function LeagueHero({ league, summary, lifecycleState, onShare }) {
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
        {onShare && (
          <button type="button" className={heroStyles.shareButton} aria-label="Share league" onClick={() => { void onShare() }}>
            <Icon name="share" size={16} />
          </button>
        )}
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

export function LeagueManagePanel({ open, createName, onCreateNameChange, competitionKey, onSubmitCreate, joinCode, onJoinCodeChange, onSubmitJoin, busy }) {
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

export function LeagueStandingsPanel({
  competitionKey, overview, overviewLoading, activeOverview, standings,
  onOpenPlayer, actionsCard = null,
  leagueLifecycle, lifecycle, activeSummary, koReadiness,
  selectedLeague, pendingLeagueAction, actionStatus, onRequestAction, onConfirmAction,
}) {
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

      {activeOverview && (
        <LeagueSecondaryDetails title="League details">
          {actionsCard}
          <LeagueLifecycleBanner lifecycleState={leagueLifecycle} competitionKey={competitionKey} />
          <CompetitionLifecycleNote competitionKey={competitionKey} lifecycle={lifecycle} summary={activeSummary} koReadiness={koReadiness} />
          <LeagueSummaryCard title={competitionKey === LEAGUE_COMPETITION.ORIGINAL ? 'Original Predictor' : 'KO Predictor'} summary={activeSummary} section={activeSection} />
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

export function LeagueActionsCard({
  joinCode,
  onCopyInvite,
  onShareLeague,
  summary = null,
  lifecycleState = null,
  fixture = null,
  confirmMs = 1800,
}) {
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
  const raceActive = summary?.state === 'active'
  const preTournament = !lifecycleState?.tournamentStarted
  const headline = preTournament
    ? 'Fill the league before kick-off'
    : fixture?.state === 'live'
      ? 'Your league is live'
      : raceActive
        ? 'Your league race'
        : 'The table is ready'
  const copy = preTournament
    ? 'Share the invite now. Everyone’s Original picks stay hidden until the tournament lock.'
    : fixture?.state === 'live'
      ? 'Open Match Centre to see who is on target and how this fixture could move the table.'
      : raceActive
        ? 'Rank, points and the gap to the leader update from the official scoring record.'
        : 'Points and ranks will move when confirmed results are scored.'

  return (
    <aside className={layoutStyles.actionsCard} aria-label="League actions">
      <header className={layoutStyles.spotlightHeading}>
        <span className={layoutStyles.spotlightIcon}><Icon name={fixture?.state === 'live' ? 'live' : preTournament ? 'share' : 'results'} size={21} /></span>
        <div><span>{preTournament ? 'Before the tournament' : raceActive ? 'Current position' : 'League status'}</span><h3>{headline}</h3></div>
      </header>
      <p className={layoutStyles.spotlightCopy}>{copy}</p>
      {summary && (
        <div className={layoutStyles.raceStats} aria-label="Your league position">
          <div><strong>{summary.state === 'active' ? formatOrdinal(summary.currentRank) : '—'}</strong><span>Your rank</span></div>
          <div><strong>{summary.currentPoints}</strong><span>Points</span></div>
          <div><strong>{summary.gapToLeader == null ? '—' : summary.gapToLeader === 0 ? 'Top' : summary.gapToLeader}</strong><span>{summary.gapToLeader > 0 ? 'To leader' : 'Gap'}</span></div>
        </div>
      )}
      <div className={layoutStyles.actionPills}>
        <button type="button" className={`${layoutStyles.actionPill} ${preTournament ? layoutStyles.actionPrimary : ''}`.trim()} onClick={() => runAction('share', onShareLeague)} disabled={!joinCode || isDone('share')} aria-live="polite">
          {isDone('share')
            ? <span className={layoutStyles.actionDone}>{confirmed.label} <Icon name="check" size={15} /></span>
            : <><span><Icon name="share" size={16} /> Share league</span><small>Invite link</small></>}
        </button>
        <button type="button" className={layoutStyles.actionPill} onClick={() => runAction('invite', onCopyInvite)} disabled={!joinCode || isDone('invite')} aria-live="polite">
          {isDone('invite')
            ? <span className={layoutStyles.actionDone}>{confirmed.label} <Icon name="check" size={15} /></span>
            : <><span><Icon name="copy" size={16} /> Copy invite</span><small>Code {joinCode ?? '—'}</small></>}
        </button>
      </div>
    </aside>
  )
}
