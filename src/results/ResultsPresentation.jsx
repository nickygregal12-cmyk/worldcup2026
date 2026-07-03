import { buildSharedPredictionJourney, LEAGUE_COMPETITION } from '../leagues/leagueModel.js'
import { RESULT_COMPETITION } from './resultModel.js'

function competitionName(key) {
  return key === RESULT_COMPETITION.ORIGINAL ? 'Original Predictor' : 'KO Predictor'
}

export function SectionError({ section, fallback }) {
  if (section?.status !== 'error') return null
  return <p className="foundation-warning-text">{section.error ?? fallback}</p>
}

export function Leaderboard({ title, section, note, currentUserId, onCompare }) {
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
              {row.userId === currentUserId ? (
                <span><strong>{row.displayName}</strong> (you)</span>
              ) : (
                <button type="button" className="foundation-member-link" onClick={() => onCompare(row)}>
                  {row.displayName}
                </button>
              )}
              <span className="foundation-leaderboard-score"><strong>{row.totalPoints}</strong> pts</span>
            </li>
          ))}
        </ol>
      )}
    </article>
  )
}

export function OverallComparison({ state, reference, onClose }) {
  if (!state) return null
  let otherJourney = null
  if (state.status === 'ready') {
    otherJourney = buildSharedPredictionJourney({
      bundle: state.data.otherBundle,
      reference,
      competitionKey: state.competitionKey === RESULT_COMPETITION.ORIGINAL
        ? LEAGUE_COMPETITION.ORIGINAL
        : LEAGUE_COMPETITION.KO_PREDICTOR,
    })
  }

  return (
    <article className="foundation-results-card foundation-results-card--full foundation-overall-comparison">
      <div className="foundation-section-heading">
        <div>
          <span className="foundation-kicker">Overall head to head</span>
          <h3>You v {state.otherName}</h3>
          <p>{competitionName(state.competitionKey)} only</p>
        </div>
        <button type="button" className="foundation-secondary-button" onClick={onClose}>Close</button>
      </div>
      {state.status === 'loading' && <p className="foundation-empty-copy">Loading authorised shared predictions…</p>}
      {state.status === 'error' && <p className="foundation-warning-text">{state.error}</p>}
      {state.status === 'ready' && !state.data.comparison.visible && (
        <p className="foundation-empty-copy">{state.data.comparison.reason}</p>
      )}
      {state.status === 'ready' && state.data.comparison.visible && (
        <>
          <div className="foundation-result-summary foundation-comparison-summary">
            <div><strong>{state.data.comparison.comparedMatches}</strong><span>matches compared</span></div>
            <div><strong>{state.data.comparison.exactScoreMatches}</strong><span>same score</span></div>
            {state.competitionKey === RESULT_COMPETITION.ORIGINAL ? (
              <div><strong>{state.data.comparison.bracketMatches}</strong><span>same bracket picks</span></div>
            ) : (
              <>
                <div><strong>{state.data.comparison.advancingTeamMatches}</strong><span>same team through</span></div>
                <div><strong>{state.data.comparison.methodMatches}</strong><span>same method</span></div>
              </>
            )}
          </div>
          <div className="foundation-comparison-list">
            {state.data.comparison.rows.map(row => (
              <div key={row.matchNumber}>
                <span>Match {row.matchNumber}</span>
                <strong>{row.leftScore} v {row.rightScore}</strong>
                <small>{row.scoreSame ? 'Same score' : 'Different score'}{row.leftJoker || row.rightJoker ? ' · joker involved' : ''}</small>
              </div>
            ))}
          </div>
        </>
      )}
      {state.status === 'ready' && otherJourney && otherJourney.privateSelectionCount > 0 && (
        <div className="foundation-privacy-state" role="status">
          <strong>Some selections remain private</strong>
          <p>{otherJourney.reason ?? 'Future KO selections are released fixture by fixture after kick-off.'}</p>
          <small>{otherJourney.privateSelectionCount} of {otherJourney.totalSelectionCount} selections remain protected.</small>
        </div>
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
    <article className={`foundation-result-row is-${row.state}`}>
      <div>
        <span>{row.stageLabel} · Match {row.matchNumber}</span>
        <strong>{row.homeLabel} v {row.awayLabel}</strong>
      </div>
      <div className="foundation-result-row__score">
        {row.score ? <strong>{row.score}</strong> : <strong>—</strong>}
        <small>{row.detail ?? (row.state === 'upcoming' ? 'Upcoming' : row.state.replaceAll('_', ' '))}</small>
      </div>
      {row.corrected && <span className="foundation-revision-chip">Revision {row.resultRevision}</span>}
    </article>
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
  return (
    <article className="foundation-results-card foundation-results-card--full">
      <span className="foundation-kicker">Canonical result records</span>
      <h3>Fixtures and results</h3>
      <p>Live scores, confirmed results and corrections are kept separate from every prediction context.</p>
      <div className="foundation-result-feed">
        <ResultFeedSection title="Live now" rows={feed.sections.live} open empty="No matches are live." />
        <ResultFeedSection title="Needs confirmation or review" rows={feed.sections.review} open={feed.sections.review.length > 0} empty="No results need review." />
        <ResultFeedSection title="Completed" rows={feed.sections.completed} empty="No confirmed results yet." />
        <ResultFeedSection title="Upcoming" rows={feed.sections.upcoming} empty="No upcoming fixtures." />
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
