import { PlayerIdentity } from '../design-system/index.jsx'
import { RESULT_COMPETITION } from './resultModel.js'

export function SectionError({ section, fallback }) {
  if (section?.status !== 'error') return null
  return <p className="foundation-warning-text">{section.error ?? fallback}</p>
}

export function Leaderboard({ title, section, note, currentUserId, onCompare, onOpenPlayer }) {
  const rows = section?.data ?? []
  return (
    <article className="foundation-results-card">
      <div className="foundation-results-card__heading">
        <div>
          <span className="foundation-kicker">Separate competition</span>
          <h3>{title}</h3>
        </div>
        <small>{note} · {rows.length} {rows.length === 1 ? 'entry' : 'entries'}</small>
      </div>
      <SectionError section={section} fallback={`${title} could not be loaded.`} />
      {section?.status === 'ready' && rows.length === 0 ? (
        <p className="foundation-empty-copy">No scored entries yet. This table will begin after the competition has scored results.</p>
      ) : rows.length > 0 && (
        <ol className="foundation-leaderboard-list">
          {rows.map(row => (
            <li key={row.userId} className={row.userId === currentUserId ? 'is-current-user' : ''}>
              <b>{row.rank}</b>
              <PlayerIdentity
                player={row}
                isCurrentUser={row.userId === currentUserId}
                onActivate={onOpenPlayer}
                actionLabel={row.userId === currentUserId ? 'Open your player view' : `Open ${row.displayName}'s player view`}
                meta={row.userId === currentUserId ? 'Open your player view' : 'Open player view'}
              />
              {row.userId !== currentUserId && onCompare && (
                <button type="button" className="foundation-secondary-button" onClick={() => onCompare(row)}>Compare</button>
              )}
              <span className="foundation-leaderboard-score"><strong>{row.totalPoints}</strong> pts</span>
            </li>
          ))}
        </ol>
      )}
    </article>
  )
}

export function GroupTable({ groupCode, table, reference }) {
  const label = teamId => reference.teamsById?.[teamId]?.label ?? reference.teamsById?.[teamId]?.slotCode ?? 'TBC'
  return (
    <details className="foundation-live-group" open={groupCode === 'A'}>
      <summary>
        <strong>Group {groupCode}</strong>
        <span>{table.completedMatchCount}/6 played</span>
      </summary>
      <div className="foundation-table-wrap">
        <table>
          <thead>
            <tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr>
          </thead>
          <tbody>
            {table.rows.map(row => (
              <tr key={row.teamId}>
                <td>{row.rank}</td>
                <td>{label(row.teamId)}</td>
                <td>{row.played}</td>
                <td>{row.wins}</td>
                <td>{row.draws}</td>
                <td>{row.losses}</td>
                <td>{row.goalDifference}</td>
                <td><strong>{row.points}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

export function LiveBracket({ rounds }) {
  return (
    <div className="foundation-live-bracket-rounds">
      {rounds.map(round => (
        <section key={round.stage}>
          <h4>{round.label}</h4>
          <div className="foundation-live-bracket">
            {round.matches.map(match => (
              <article key={match.matchNumber} className={!match.participantsResolved ? 'is-unresolved' : ''}>
                <span>Match {match.matchNumber}</span>
                <div>
                  <strong>{match.homeLabel}</strong>
                  <strong>{match.awayLabel}</strong>
                </div>
                <div className="foundation-live-bracket__result">
                  {match.score && <strong>{match.score}</strong>}
                  <small>{match.winnerLabel ? `${match.winnerLabel} through` : match.participantsResolved ? 'Awaiting result' : 'Participants TBC'}</small>
                  {match.detail && <small>{match.detail}</small>}
                  {match.corrected && <small>Corrected result · revision {match.resultRevision}</small>}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function ResultRow({ row }) {
  return (
    <a className={`foundation-result-row is-${row.state}`} href={`#/match-centre?match=${row.matchNumber}`} aria-label={`Open Match ${row.matchNumber} Match Centre`}>
      <div>
        <span>{row.stageLabel} · Match {row.matchNumber}</span>
        <strong>{row.homeLabel} v {row.awayLabel}</strong>
      </div>
      <div className="foundation-result-row__score">
        {row.score ? <strong>{row.score}</strong> : <strong>—</strong>}
        <small>{row.detail ?? (row.state === 'upcoming' ? 'Upcoming' : row.state.replaceAll('_', ' '))}</small>
      </div>
      {row.corrected && <span className="foundation-revision-chip">Revision {row.resultRevision}</span>}
    </a>
  )
}

function ResultFeedSection({ title, rows, open = false, empty }) {
  return (
    <details className="foundation-result-feed-section" open={open}>
      <summary><strong>{title}</strong><span>{rows.length}</span></summary>
      {rows.length === 0 ? <p className="foundation-empty-copy">{empty}</p> : (
        <div className="foundation-result-feed-list">{rows.map(row => <ResultRow key={row.matchId} row={row} />)}</div>
      )}
    </details>
  )
}

export function ResultsFeed({ feed }) {
  const sections = feed?.sections ?? { live: [], review: [], completed: [], upcoming: [] }
  const sectionDefinitions = {
    live: { title: 'Live now', rows: sections.live, empty: 'No matches are live.' },
    review: { title: 'Needs confirmation or review', rows: sections.review, empty: 'No results need review.' },
    completed: { title: 'Completed', rows: sections.completed, empty: 'No confirmed results yet.' },
    upcoming: { title: 'Upcoming', rows: sections.upcoming, empty: 'No upcoming fixtures.' },
  }
  const order = sections.live.length > 0
    ? ['live', 'review', 'upcoming', 'completed']
    : sections.review.length > 0
      ? ['review', 'completed', 'upcoming', 'live']
      : sections.completed.length > 0
        ? ['completed', 'upcoming', 'live', 'review']
        : ['upcoming', 'live', 'review', 'completed']
  const primaryKey = order[0]

  return (
    <article className="foundation-results-card foundation-results-card--full">
      <span className="foundation-kicker">Official results</span>
      <h3>Fixtures and results</h3>
      <p>Live scores, confirmed results and corrections are shown separately from your picks.</p>
      <div className="foundation-result-feed">
        {order.map(key => (
          <ResultFeedSection key={key} {...sectionDefinitions[key]} open={key === primaryKey} />
        ))}
      </div>
    </article>
  )
}

function MatchPointRow({ row, competitionKey }) {
  return (
    <div className="foundation-points-row">
      <div>
        <span>{row.stageLabel} · Match {row.matchNumber ?? '—'}</span>
        <strong>{row.totalPoints} pts</strong>
      </div>
      <small>
        Score {row.exactScorePoints} · Outcome {row.correctOutcomePoints}
        {competitionKey === RESULT_COMPETITION.KO_PREDICTOR ? ` · Team ${row.advancingTeamPoints} · Method ${row.decisionMethodPoints}` : ''}
        {row.jokerMultiplier > 1 ? ` · Joker ×${row.jokerMultiplier}` : ''}
      </small>
      {row.corrected && <small>Recalculated from corrected result revision {row.resultRevision}</small>}
    </div>
  )
}

export function PointsBreakdown({ title, section, competitionKey }) {
  const points = section?.data
  return (
    <article className="foundation-results-card">
      <div className="foundation-results-card__heading">
        <div>
          <span className="foundation-kicker">Your points</span>
          <h3>{title}</h3>
        </div>
        {points && <strong>{points.totalPoints} pts</strong>}
      </div>
      <SectionError section={section} fallback={`${title} points could not be loaded.`} />
      {section?.status === 'ready' && points?.state === 'unscored' && (
        <p className="foundation-empty-copy">No points have been recorded in this competition yet.</p>
      )}
      {section?.status === 'ready' && points?.state === 'scored' && (
        <>
          <div className="foundation-points-summary">
            <span>Match points <strong>{points.matchPoints}</strong></span>
            {competitionKey === RESULT_COMPETITION.ORIGINAL && <span>Bracket points <strong>{points.bracketPoints}</strong></span>}
            <span>Scored matches <strong>{points.scoredMatchCount}</strong></span>
          </div>
          {points.correctedMatchCount > 0 && <p className="foundation-correction-note">{points.correctedMatchCount} match breakdown{points.correctedMatchCount === 1 ? ' has' : 's have'} been recalculated after a result correction.</p>}
          <details className="foundation-points-details">
            <summary>Match-by-match breakdown</summary>
            {points.matchBreakdown.length === 0 ? <p className="foundation-empty-copy">No match points yet.</p> : (
              <div>{points.matchBreakdown.map(row => <MatchPointRow key={row.matchId} row={row} competitionKey={competitionKey} />)}</div>
            )}
          </details>
          {competitionKey === RESULT_COMPETITION.ORIGINAL && (
            <details className="foundation-points-details">
              <summary>Original bracket progression</summary>
              {points.bracketBreakdown.length === 0 ? <p className="foundation-empty-copy">No original bracket points yet.</p> : (
                <div>{points.bracketBreakdown.map((row, index) => (
                  <div className="foundation-points-row" key={`${row.milestone}-${row.tournamentTeamId}-${index}`}>
                    <div><span>{row.milestone.replaceAll('_', ' ')}</span><strong>{row.points} pts</strong></div>
                    <small>{row.teamLabel}</small>
                  </div>
                ))}</div>
              )}
            </details>
          )}
        </>
      )}
    </article>
  )
}
