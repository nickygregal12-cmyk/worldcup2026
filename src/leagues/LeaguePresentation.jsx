import { buildSharedPredictionJourney, formatOrdinal, LEAGUE_COMPETITION } from './leagueModel.js'

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
                {row.isCurrentUser ? (
                  <strong>{row.displayName} <small>(you)</small></strong>
                ) : (
                  <button type="button" className="foundation-member-link" onClick={() => onCompare(row)}>
                    {row.displayName}
                  </button>
                )}
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

function PredictionRows({ journey, heading }) {
  const rows = [...journey.matches, ...journey.bracket]
  const entirelyPrivate = journey.privateSelectionCount === journey.totalSelectionCount
  return (
    <section className="foundation-member-predictions">
      <div>
        <h4>{heading}</h4>
        <small>{journey.visibleSelectionCount} visible · {journey.privateSelectionCount} private · {journey.notSavedSelectionCount} not saved</small>
      </div>
      {entirelyPrivate ? (
        <div className="foundation-privacy-state" role="status">
          <strong>Selections remain private</strong>
          <p>{journey.reason ?? rows[0]?.message ?? 'These selections have not been released by the server yet.'}</p>
          <small>{journey.totalSelectionCount} selections protected by the competition privacy rules.</small>
        </div>
      ) : (
        <div className="foundation-member-prediction-list">
          {rows.map(row => (
            <article key={`${row.kind}-${row.matchNumber}`} className={`foundation-member-prediction is-${row.visibility}`}>
              <div>
                <span>{row.stageLabel} · Match {row.matchNumber}</span>
                <strong>{row.homeLabel} v {row.awayLabel}</strong>
              </div>
              {row.visibility === 'visible' && row.kind === 'match' && (
                <div className="foundation-member-prediction__pick">
                  <strong>{row.score}</strong>
                  {row.advancingTeamLabel && <small>{row.advancingTeamLabel} through</small>}
                  {row.decisionMethodLabel && <small>{row.decisionMethodLabel}</small>}
                  {row.jokerApplied && <small>Joker applied</small>}
                </div>
              )}
              {row.visibility === 'visible' && row.kind === 'bracket' && (
                <div className="foundation-member-prediction__pick">
                  <strong>{row.advancingTeamLabel ?? 'No selection'}</strong>
                  <small>Advancing team</small>
                </div>
              )}
              {row.visibility !== 'visible' && <p>{row.message}</p>}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export function HeadToHead({ state, reference, onClose }) {
  if (!state) return null
  const competitionKey = state.competitionKey
  let currentJourney = null
  let otherJourney = null
  if (state.status === 'ready') {
    currentJourney = buildSharedPredictionJourney({
      bundle: state.data.currentBundle,
      reference,
      competitionKey,
    })
    otherJourney = buildSharedPredictionJourney({
      bundle: state.data.otherBundle,
      reference,
      competitionKey,
    })
  }

  return (
    <article className="foundation-league-comparison">
      <div className="foundation-section-heading">
        <div>
          <span className="foundation-kicker">Member comparison · {competitionName(competitionKey)}</span>
          <h3>You v {state.otherName}</h3>
          <p>Only selections released by the existing server privacy rules are shown.</p>
        </div>
        <button type="button" className="foundation-secondary-button" onClick={onClose}>Close</button>
      </div>

      {state.standings && (
        <div className="foundation-head-to-head-points" aria-label={`${competitionName(competitionKey)} league positions`}>
          <div>
            <span>You</span>
            <strong>{formatOrdinal(state.standings.current?.rank)}</strong>
            <small>{state.standings.current ? `${state.standings.current.totalPoints} pts` : 'Position unavailable'}</small>
          </div>
          <div>
            <span>{state.otherName}</span>
            <strong>{formatOrdinal(state.standings.other?.rank)}</strong>
            <small>{state.standings.other ? `${state.standings.other.totalPoints} pts` : 'Position unavailable'}</small>
          </div>
        </div>
      )}

      {state.status === 'loading' && <p className="foundation-empty-copy">Loading authorised shared predictions…</p>}
      {state.status === 'error' && <p className="foundation-warning-text">{state.error}</p>}
      {state.status === 'ready' && !state.data.comparison.visible && (
        <p className="foundation-empty-copy">{state.data.comparison.reason}</p>
      )}
      {state.status === 'ready' && state.data.comparison.visible && (
        <div className="foundation-result-summary foundation-comparison-summary">
          <div><strong>{state.data.comparison.comparedMatches}</strong><span>matches compared</span></div>
          <div><strong>{state.data.comparison.exactScoreMatches}</strong><span>same score</span></div>
          {competitionKey === LEAGUE_COMPETITION.ORIGINAL ? (
            <div><strong>{state.data.comparison.bracketMatches}</strong><span>same bracket picks</span></div>
          ) : (
            <>
              <div><strong>{state.data.comparison.advancingTeamMatches}</strong><span>same team through</span></div>
              <div><strong>{state.data.comparison.methodMatches}</strong><span>same method</span></div>
            </>
          )}
        </div>
      )}
      {state.status === 'ready' && (
        <div className="foundation-member-prediction-columns">
          <PredictionRows journey={currentJourney} heading="Your available selections" />
          <PredictionRows journey={otherJourney} heading={`${state.otherName}'s available selections`} />
        </div>
      )}
    </article>
  )
}
