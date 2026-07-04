import styles from './leagueRace.module.css'
import { PlayerIdentity, SelectField } from '../design-system/index.jsx'
import { buildLeagueCompetitionLifecycleCopy, buildLeagueRaceRows, formatOrdinal, LEAGUE_COMPETITION } from './leagueModel.js'

function competitionName(competitionKey) {
  return competitionKey === LEAGUE_COMPETITION.ORIGINAL ? 'Original Predictor' : 'KO Predictor'
}

export function LeagueLifecycleBanner({ lifecycleState }) {
  if (!lifecycleState) return null
  return (
    <aside className="foundation-lifecycle-card" aria-label="League lifecycle">
      <span className="foundation-kicker">League lifecycle</span>
      <strong>{lifecycleState.headline}</strong>
      <p>{lifecycleState.originalCopy}</p>
      <p>{lifecycleState.koCopy}</p>
    </aside>
  )
}

export function CompetitionLifecycleNote({ competitionKey, lifecycle, summary, koReadiness }) {
  const copy = buildLeagueCompetitionLifecycleCopy({ competitionKey, lifecycle, summary, koReadiness })
  return (
    <aside className="foundation-lifecycle-note" aria-label={`${competitionName(competitionKey)} lifecycle`}>
      <span>{copy.label}</span>
      <small>{copy.copy}</small>
    </aside>
  )
}

export function LeagueActionConfirmation({ action, leagueName, actionStatus, onConfirm, onCancel }) {
  if (!action) return null
  const deleting = action === 'delete'
  return (
    <div className="foundation-destructive-confirmation" role="alert">
      <div>
        <strong>{deleting ? `Delete ${leagueName}?` : `Leave ${leagueName}?`}</strong>
        <p>{deleting ? 'This removes the private league for every member. Prediction and scoring records remain separate.' : 'You will lose access to this league and its member comparisons.'}</p>
      </div>
      <div className="foundation-inline-actions">
        <button type="button" className="foundation-danger-button" onClick={() => { void onConfirm() }} disabled={actionStatus === 'loading'}>{actionStatus === 'loading' ? 'Working…' : deleting ? 'Confirm delete' : 'Confirm leave'}</button>
        <button type="button" className="foundation-secondary-button" onClick={onCancel} disabled={actionStatus === 'loading'}>Cancel</button>
      </div>
    </div>
  )
}

export function LeagueCompetitionHeading({ competitionKey }) {
  const original = competitionKey === LEAGUE_COMPETITION.ORIGINAL
  return (
    <div className="foundation-competition-heading">
      <div><span className="foundation-kicker">Separate standings</span><h3>{competitionName(competitionKey)}</h3></div>
      <small>{original ? 'Group matches and original bracket only' : 'Real knockout fixtures only'}</small>
    </div>
  )
}

export function CompetitionTabs({ value, onChange, koReadiness }) {
  return (
    <div className="foundation-league-tabs" role="tablist" aria-label="League competition">
      {Object.values(LEAGUE_COMPETITION).map(key => {
        const disabled = key === LEAGUE_COMPETITION.KO_PREDICTOR && !koReadiness?.open
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={value === key}
            className={value === key ? 'is-active' : ''}
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
  if (leagues.length === 0) return null
  return (
    <SelectField
      label="Your leagues"
      className="foundation-league-picker"
      value={selectedId ?? ''}
      onChange={onSelect}
      options={leagues.map(league => ({
        value: league.id,
        label: `${league.name} · ${league.memberCount} member${league.memberCount === 1 ? '' : 's'}`,
      }))}
    />
  )
}

export function MemberPicker({ members, selectedId, onSelect }) {
  const available = members.filter(member => !member.isCurrentUser)
  if (available.length === 0) return null
  return (
    <SelectField
      label="Compare with member"
      className="foundation-member-picker"
      value={selectedId ?? ''}
      onChange={onSelect}
      placeholder="Choose a member"
      options={available.map(member => ({ value: member.userId, label: member.displayName }))}
    />
  )
}

export function LeagueKoReadinessCard({ koReadiness }) {
  return (
    <article className="foundation-league-summary-card">
      <span className="foundation-kicker">KO Predictor</span>
      <strong>Waiting for real fixtures</strong>
      <span>—</span>
      <small>{koReadiness?.label ?? 'KO Predictor opens when real fixtures are known'}</small>
    </article>
  )
}

export function LeagueSummaryCard({ title, summary, section }) {
  if (!summary || section?.status === 'error') {
    return (
      <article className="foundation-league-summary-card is-error">
        <span className="foundation-kicker">{title}</span>
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
    <article className="foundation-league-summary-card">
      <span className="foundation-kicker">{title}</span>
      <strong>{formatOrdinal(summary.currentRank)}</strong>
      <span>{summary.currentPoints} pts</span>
      <small>{summary.gapToLeaderLabel ?? stateCopy}</small>
    </article>
  )
}

export function StandingsTable({ rows, competitionKey, onCompare }) {
  const original = competitionKey === LEAGUE_COMPETITION.ORIGINAL
  const raceRows = buildLeagueRaceRows(rows)
  return (
    <div className="foundation-table-wrap">
      <table className="foundation-league-table">
        <thead>
          <tr>
            <th>#</th><th>Member</th>
            {original ? <><th>Groups</th><th>Bracket</th></> : <><th>Scored</th><th>Match points</th></>}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {raceRows.map(row => (
            <tr key={row.userId} className={[row.isCurrentUser ? styles.currentUserRow : '', row.podium === 'top-1' ? styles.topOneRow : '', row.podium === 'top-2' ? styles.topTwoRow : '', row.podium === 'top-3' ? styles.topThreeRow : ''].filter(Boolean).join(' ')}>
              <td data-label="Rank">
                <span className={styles.rankMarker}>{row.rank}</span>
              </td>
              <td data-label="Member">
                <div className={styles.raceCell}>
                  <PlayerIdentity
                    player={row}
                    isCurrentUser={row.isCurrentUser}
                    onActivate={row.isCurrentUser ? null : onCompare}
                    meta={row.memberRole === 'owner' ? 'League owner' : 'Open comparison'}
                  />
                  <span className={styles.raceChips}>
                    {row.isCurrentUser && <span className={styles.youChip}>YOU</span>}
                    {row.podiumLabel && <span className={styles.topThreeChip}>{row.podiumLabel}</span>}
                    {row.memberRole === 'owner' && <span className="foundation-owner-chip">Owner</span>}
                  </span>
                </div>
              </td>
              {original ? (
                <><td data-label="Groups">{row.matchPoints}</td><td data-label="Bracket">{row.bracketPoints}</td></>
              ) : (
                <><td data-label="Scored">{row.scoredMatchCount}</td><td data-label="Match points">{row.matchPoints}</td></>
              )}
              <td data-label="Total"><strong>{row.totalPoints}</strong><small className={styles.gapLabel}>{row.gapToLeaderLabel}</small></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
