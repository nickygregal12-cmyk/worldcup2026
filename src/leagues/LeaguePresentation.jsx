import { PlayerIdentity } from '../design-system/index.jsx'
import { formatOrdinal, LEAGUE_COMPETITION } from './leagueModel.js'

function competitionName(competitionKey) {
  return competitionKey === LEAGUE_COMPETITION.ORIGINAL ? 'Original Predictor' : 'KO Predictor'
}

export function CompetitionTabs({ value, onChange }) {
  return (
    <div className="foundation-league-tabs" role="tablist" aria-label="League competition">
      {Object.values(LEAGUE_COMPETITION).map(key => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={value === key}
          className={value === key ? 'is-active' : ''}
          onClick={() => onChange(key)}
        >
          {competitionName(key)}
        </button>
      ))}
    </div>
  )
}

export function LeaguePicker({ leagues, selectedId, onSelect }) {
  if (leagues.length === 0) return null
  return (
    <label className="auth-field foundation-league-picker">
      <span>Your leagues</span>
      <select value={selectedId ?? ''} onChange={event => onSelect(event.target.value)}>
        {leagues.map(league => (
          <option key={league.id} value={league.id}>
            {league.name} · {league.memberCount} member{league.memberCount === 1 ? '' : 's'}
          </option>
        ))}
      </select>
    </label>
  )
}


export function MemberPicker({ members, selectedId, onSelect }) {
  const available = members.filter(member => !member.isCurrentUser)
  if (available.length === 0) return null
  return (
    <label className="auth-field foundation-member-picker">
      <span>Compare with member</span>
      <select value={selectedId ?? ''} onChange={event => onSelect(event.target.value)}>
        <option value="">Choose a member</option>
        {available.map(member => (
          <option key={member.userId} value={member.userId}>{member.displayName}</option>
        ))}
      </select>
    </label>
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
      <small>{stateCopy}</small>
    </article>
  )
}

export function StandingsTable({ rows, competitionKey, onCompare }) {
  const original = competitionKey === LEAGUE_COMPETITION.ORIGINAL
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
          {rows.map(row => (
            <tr key={row.userId} className={row.isCurrentUser ? 'is-current-user' : ''}>
              <td data-label="Rank">{row.rank}</td>
              <td data-label="Member">
                <PlayerIdentity
                  player={row}
                  isCurrentUser={row.isCurrentUser}
                  onActivate={row.isCurrentUser ? null : onCompare}
                  meta={row.memberRole === 'owner' ? 'League owner' : 'Open comparison'}
                />
                {row.memberRole === 'owner' && <span className="foundation-owner-chip">Owner</span>}
              </td>
              {original ? (
                <><td data-label="Groups">{row.matchPoints}</td><td data-label="Bracket">{row.bracketPoints}</td></>
              ) : (
                <><td data-label="Scored">{row.scoredMatchCount}</td><td data-label="Match points">{row.matchPoints}</td></>
              )}
              <td data-label="Total"><strong>{row.totalPoints}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
