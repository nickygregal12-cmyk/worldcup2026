import { useCallback, useEffect, useMemo, useState } from 'react'
import { buildSharedPredictionJourney, LEAGUE_COMPETITION } from '../leagues/leagueModel.js'
import { loadOverallHeadToHead, loadResultsAndLeaderboards } from './resultService.js'
import {
  buildCanonicalResultFeed,
  buildLiveBracketRounds,
  RESULT_COMPETITION,
} from './resultModel.js'

function competitionName(key) {
  return key === RESULT_COMPETITION.ORIGINAL ? 'Original Predictor' : 'KO Predictor'
}

function SectionError({ section, fallback }) {
  if (section?.status !== 'error') return null
  return <p className="foundation-warning-text">{section.error ?? fallback}</p>
}

function Leaderboard({ title, section, note, currentUserId, onCompare }) {
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

function OverallComparison({ state, reference, onClose }) {
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
      {state.status === 'ready' && otherJourney && otherJourney.privateMatchCount > 0 && (
        <p className="foundation-empty-copy">{otherJourney.privateMatchCount} future or locked selection{otherJourney.privateMatchCount === 1 ? ' remains' : 's remain'} private.</p>
      )}
    </article>
  )
}

function GroupTable({ groupCode, table, reference }) {
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

function LiveBracket({ rounds }) {
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

function ResultsFeed({ feed }) {
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

function PointsBreakdown({ title, section, competitionKey }) {
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

export default function ResultsAndLeaderboardsFoundation({ client, reference }) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null })
  const [comparison, setComparison] = useState(null)

  const load = useCallback(async () => {
    setState(previous => ({ ...previous, status: 'loading', error: null }))
    try {
      const data = await loadResultsAndLeaderboards(client, reference)
      setState({ status: data.status, data, error: null })
    } catch (error) {
      setState({ status: 'error', data: null, error: error instanceof Error ? error.message : String(error) })
    }
  }, [client, reference])

  useEffect(() => {
    let active = true
    loadResultsAndLeaderboards(client, reference)
      .then(data => { if (active) setState({ status: data.status, data, error: null }) })
      .catch(error => {
        if (!active) return
        setState({ status: 'error', data: null, error: error instanceof Error ? error.message : String(error) })
      })
    return () => { active = false }
  }, [client, reference])

  const summary = state.data?.live?.summary ?? null
  const groups = useMemo(() => Object.entries(state.data?.live?.groups ?? {}), [state.data])
  const feed = useMemo(() => buildCanonicalResultFeed({ reference, liveSnapshot: state.data?.live }), [reference, state.data])
  const bracketRounds = useMemo(() => buildLiveBracketRounds({ reference, liveSnapshot: state.data?.live }), [reference, state.data])

  const compareOverall = async (row, competitionKey) => {
    if (!state.data?.currentUserId) return
    setComparison({ status: 'loading', otherName: row.displayName, competitionKey, data: null, error: null })
    try {
      const data = await loadOverallHeadToHead(client, {
        tournamentId: reference.tournamentId,
        currentUserId: state.data.currentUserId,
        otherUserId: row.userId,
        competitionKey,
      })
      setComparison({ status: 'ready', otherName: row.displayName, competitionKey, data, error: null })
    } catch (error) {
      setComparison({
        status: 'error',
        otherName: row.displayName,
        competitionKey,
        data: null,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return (
    <section className="foundation-panel foundation-results" aria-labelledby="euro28-results-heading">
      <div className="foundation-section-heading">
        <div>
          <span className="foundation-kicker">Live tournament</span>
          <h2 id="euro28-results-heading">Results, live tables and separate points</h2>
          <p>Canonical live data never blends with predicted brackets. Original and KO Predictor totals never combine.</p>
        </div>
        <button type="button" className="foundation-secondary-button" onClick={load}>Refresh</button>
      </div>

      {state.status === 'loading' && !state.data && <p className="foundation-empty-copy">Loading canonical results and competition tables…</p>}
      {state.status === 'error' && !state.data && <p className="foundation-warning-text">{state.error}</p>}
      {state.status === 'partial' && <p className="foundation-warning-text">Some sections could not be refreshed. Available live data and competition tables remain visible below.</p>}

      {state.data && (
        <>
          <SectionError section={state.data.sections.live} fallback="Canonical results could not be loaded." />
          {summary && (
            <div className="foundation-result-summary">
              <div><strong>{summary.confirmedMatches}</strong><span>confirmed</span></div>
              <div><strong>{summary.liveMatches}</strong><span>live</span></div>
              <div><strong>{summary.pendingResults}</strong><span>pending scores</span></div>
              <div><strong>{summary.manualReviewResults}</strong><span>manual review</span></div>
            </div>
          )}

          {state.data.live && (
            <>
              <ResultsFeed feed={feed} />
              <div className="foundation-results-grid">
                <article className="foundation-results-card">
                  <span className="foundation-kicker">Live context</span>
                  <h3>Live group tables</h3>
                  <p>Calculated only from canonical live and confirmed group results.</p>
                  <div className="foundation-live-groups">
                    {groups.map(([groupCode, table]) => (
                      <GroupTable key={groupCode} groupCode={groupCode} table={table} reference={reference} />
                    ))}
                  </div>
                </article>

                <article className="foundation-results-card">
                  <span className="foundation-kicker">Live context · not your bracket</span>
                  <h3>Live knockout bracket</h3>
                  <p>All 15 canonical positions are shown. Unresolved participants remain honestly marked TBC.</p>
                  <LiveBracket rounds={bracketRounds} />
                </article>
              </div>
            </>
          )}

          {state.data.signedIn ? (
            <>
              <div className="foundation-results-grid">
                <Leaderboard
                  title="Original Predictor"
                  section={state.data.sections.originalLeaderboard}
                  note="Groups + original bracket"
                  currentUserId={state.data.currentUserId}
                  onCompare={row => compareOverall(row, RESULT_COMPETITION.ORIGINAL)}
                />
                <Leaderboard
                  title="KO Predictor"
                  section={state.data.sections.koLeaderboard}
                  note="Real knockout matches only"
                  currentUserId={state.data.currentUserId}
                  onCompare={row => compareOverall(row, RESULT_COMPETITION.KO_PREDICTOR)}
                />
              </div>
              <div className="foundation-results-grid">
                <PointsBreakdown title="Original Predictor breakdown" section={state.data.sections.originalPoints} competitionKey={RESULT_COMPETITION.ORIGINAL} />
                <PointsBreakdown title="KO Predictor breakdown" section={state.data.sections.koPoints} competitionKey={RESULT_COMPETITION.KO_PREDICTOR} />
              </div>
              <OverallComparison state={comparison} reference={reference} onClose={() => setComparison(null)} />
            </>
          ) : state.data.sections.session.status === 'error' ? (
            <p className="foundation-warning-text">Live results are available, but your signed-in competition data could not be checked: {state.data.sections.session.error}</p>
          ) : (
            <p className="foundation-empty-copy">Sign in to view the two scored leaderboards and separate points breakdowns. Guest predictions remain unscored.</p>
          )}
        </>
      )}
    </section>
  )
}
