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

export function StandingsTable({ rows, selectedUserId, onCompare }) {
  const raceRows = buildLeagueRaceRows(rows)
  const hasScoring = raceRows.some(row => row.scoredMatchCount > 0 || row.totalPoints > 0)
  return (
    <div className="foundation-table-wrap">
      <table className="foundation-league-table">
        <thead>
          <tr>
            <th>#</th><th>Member</th><th>Pts</th>
          </tr>
        </thead>
        <tbody>
          {raceRows.map(row => {
            const selected = row.userId === selectedUserId
            const rowClassName = [
              row.isCurrentUser ? styles.currentUserRow : '',
              selected ? styles.selectedRow : '',
            ].filter(Boolean).join(' ')
            const memberMeta = row.isCurrentUser
              ? 'You'
              : selected
                ? 'Details open'
                : row.memberRole === 'owner'
                  ? 'League owner · view details'
                  : 'View details'
            return (
              <tr key={row.userId} className={rowClassName}>
                <td data-label="Rank">
                  <span className={styles.rankMarker}>{hasScoring ? row.rank : '—'}</span>
                </td>
                <td data-label="Member">
                  <PlayerIdentity
                    player={row}
                    isCurrentUser={row.isCurrentUser}
                    onActivate={row.isCurrentUser ? null : onCompare}
                    meta={memberMeta}
                  />
                </td>
                <td data-label="Pts"><strong>{row.totalPoints}</strong></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function LeagueDetailDestination({ comparison, children }) {
  if (!comparison) return null
  return (
    <section className={styles.detailDestination} aria-label="League member detail">
      <div className={styles.detailDestinationHeading}>
        <span className="foundation-kicker">Member details</span>
        <strong>{comparison.otherName ?? 'Selected member'}</strong>
        <small>Breakdowns open here so the league table stays as rank, member and points.</small>
      </div>
      {children}
    </section>
  )
}
