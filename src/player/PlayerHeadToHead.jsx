import React, { useMemo } from 'react' // eslint-disable-line no-unused-vars -- React is required for JSX under the current lint config
import { Badge, Button, PlayerIdentity, TeamLabel } from '../design-system/index.jsx'
import { formatOrdinal, LEAGUE_COMPETITION } from '../leagues/leagueModel.js'
import { decisionMethodLabel } from '../results/resultModel.js'
import { buildAlignedPlayerComparison, buildHeadToHeadStory, PLAYER_COMPARISON_CONTEXT } from './playerComparisonModel.js'
import { buildPlayerInsightLifecycle } from './playerInsightModel.js'
import styles from './PlayerHeadToHead.module.css'

function competitionName(competitionKey) {
  return competitionKey === LEAGUE_COMPETITION.ORIGINAL ? 'Original Predictor' : 'KO Predictor'
}

function TeamMatchup({ homeTeam, awayTeam, fallback }) {
  if (!homeTeam && !awayTeam) return <small>{fallback}</small>
  return (
    <span className={styles.teamMatchup}>
      <TeamLabel team={homeTeam} label={homeTeam?.label ?? 'TBC'} unresolved={!homeTeam} compact className={styles.matchupTeam} />
      <span>v</span>
      <TeamLabel team={awayTeam} label={awayTeam?.label ?? 'TBC'} unresolved={!awayTeam} compact className={styles.matchupTeam} />
    </span>
  )
}

function Selection({ label, selection, kind, points }) {
  const stateClass = selection.visibility === 'private' ? styles.selectionPrivate : selection.visibility === 'not_saved' ? styles.selectionMissing : ''
  return (
    <div className={`${styles.selection} ${stateClass}`.trim()}>
      <span className={styles.selectionLabel}>{label}</span>
      {selection.visibility !== 'visible' ? (
        <><strong>{selection.visibility === 'private' ? 'Private' : 'Not saved'}</strong><small>{selection.message}</small></>
      ) : kind === 'bracket' ? (
        <><TeamLabel team={selection.advancingTeam} label={selection.advancingTeamLabel} compact /><small>Advancing team</small></>
      ) : (
        <>
          <strong className={styles.selectionScore}>{selection.score}</strong>
          {selection.advancingTeamLabel && <span className={styles.advancing}><TeamLabel team={selection.advancingTeam} label={selection.advancingTeamLabel} compact className={styles.matchupTeam} /> through</span>}
          {selection.decisionMethodLabel && <small>{selection.decisionMethodLabel}</small>}
          {selection.jokerApplied && <small className={styles.joker}>Joker applied</small>}
        </>
      )}
      {points != null && <b className={styles.selectionPoints}>{points > 0 ? '+' : ''}{points} pts</b>}
    </div>
  )
}

function resultForMatch(liveSnapshot, matchNumber) {
  const result = liveSnapshot?.results?.find(row => row.matchNumber === matchNumber)
  if (!result?.scoreVisible) return null
  const score = `${result.normalTimeHomeGoals}–${result.normalTimeAwayGoals}`
  const method = decisionMethodLabel(result.decisionMethod)
  return method ? `${score} · ${method}` : score
}

function Scoreboard({ currentPlayer, otherPlayer, story }) {
  return (
    <section className={styles.scoreboard} aria-label={`${currentPlayer.displayName} ${story.currentPoints}, ${otherPlayer.displayName} ${story.otherPoints}`}>
      <div className={styles.scorePlayer}>
        <PlayerIdentity player={currentPlayer} isCurrentUser size="large" />
        <span>{formatOrdinal(currentPlayer.rank)} overall</span>
        <strong>{story.currentPoints}</strong>
      </div>
      <div className={styles.verdict}><span>Head-to-head</span><strong>{story.headline}</strong><small>Competition points</small></div>
      <div className={`${styles.scorePlayer} ${styles.scorePlayerAway}`}>
        <PlayerIdentity player={otherPlayer} size="large" />
        <span>{formatOrdinal(otherPlayer.rank)} overall</span>
        <strong>{story.otherPoints}</strong>
      </div>
    </section>
  )
}

function SourceComparison({ story }) {
  if (story.sources.length === 0) return null
  return (
    <section className={styles.storySection} aria-labelledby="h2h-sources-heading">
      <div className={styles.storyHeading}><div><span>Where the gap comes from</span><h4 id="h2h-sources-heading">Points by source</h4></div></div>
      <div className={styles.sources}>
        {story.sources.map(row => {
          const max = Math.max(1, row.current, row.other)
          return (
            <div className={styles.sourceRow} key={row.key}>
              <strong>{row.label}</strong>
              <div><span style={{ width: `${Math.round((row.current / max) * 100)}%` }} /><b>{row.current}</b></div>
              <div><span style={{ width: `${Math.round((row.other / max) * 100)}%` }} /><b>{row.other}</b></div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function DecisiveMatches({ story, competitionKey }) {
  if (story.decisiveMatches.length === 0) return null
  return (
    <section className={styles.storySection} aria-labelledby="h2h-swings-heading">
      <div className={styles.storyHeading}><div><span>Biggest swings</span><h4 id="h2h-swings-heading">Decisive matches</h4></div></div>
      <div className={styles.swings}>
        {story.decisiveMatches.map(row => (
          <a key={row.matchNumber} href={`#/match-centre?match=${row.matchNumber}&competition=${competitionKey}`}>
            <span><strong>{row.stageLabel} · Match {row.matchNumber}</strong><small>{row.currentPoints}–{row.otherPoints} points from this match</small></span>
            <b>{row.swing > 0 ? '+' : ''}{row.swing}</b>
          </a>
        ))}
      </div>
    </section>
  )
}

function ComparisonRow({ row, otherName, liveSnapshot, currentPoints, otherPoints }) {
  const result = resultForMatch(liveSnapshot, row.matchNumber)
  return (
    <article className={`${styles.row} ${row.comparison.comparable && !row.comparison.same ? styles.rowDifferent : ''}`.trim()}>
      <div className={styles.rowContext}>
        <span>{row.stageLabel} · Match {row.matchNumber}</span>
        <TeamMatchup homeTeam={row.homeTeam} awayTeam={row.awayTeam} fallback={row.fixtureLabel} />
        <span className={`${styles.matchState} ${row.comparison.comparable ? row.comparison.same ? styles.same : styles.different : ''}`.trim()}>
          {row.comparison.comparable ? row.comparison.same ? 'Same selection' : 'Different selection' : 'Comparison protected'}
        </span>
        <small>{result ? `Result: ${result}` : 'Official result not available yet'}</small>
      </div>
      <Selection label="You" selection={row.current} kind={row.kind} points={currentPoints} />
      <Selection label={otherName} selection={row.other} kind={row.kind} points={otherPoints} />
    </article>
  )
}

export default function PlayerHeadToHead({ state, reference, liveSnapshot = null, lifecycle = null, onClose, context = PLAYER_COMPARISON_CONTEXT.LEAGUE }) {
  const comparison = useMemo(() => state?.status === 'ready' ? buildAlignedPlayerComparison({
    currentBundle: state.data.currentBundle,
    otherBundle: state.data.otherBundle,
    reference,
    competitionKey: state.competitionKey,
  }) : null, [reference, state])

  const currentPlayer = state?.standings?.current
    ? { ...state.standings.current, userId: state.standings.current.userId ?? 'current-player', displayName: state.standings.current.displayName || 'You' }
    : { userId: state?.data?.insights?.current?.data?.memberUserId ?? null, displayName: 'You', rank: null, totalPoints: 0 }
  const otherPlayer = state?.standings?.other
    ? { ...state.standings.other, userId: state.standings.other.userId ?? 'other-player', displayName: state.otherName }
    : { userId: state?.otherUserId ?? state?.data?.insights?.other?.data?.memberUserId ?? null, displayName: state?.otherName ?? 'Player', rank: null, totalPoints: 0 }
  const storyRows = state?.standingsRows?.length ? state.standingsRows : [currentPlayer, otherPlayer]
  const story = state?.status === 'ready' ? buildHeadToHeadStory({
    currentSection: state.data?.insights?.current,
    otherSection: state.data?.insights?.other,
    currentPlayer,
    otherPlayer,
    competitionKey: state.competitionKey,
    standingsRows: storyRows,
  }) : null

  const currentPointsByMatch = new Map((story?.currentInsight.matchRows ?? []).map(row => [row.matchNumber, row.totalPoints]))
  const otherPointsByMatch = new Map((story?.otherInsight.matchRows ?? []).map(row => [row.matchNumber, row.totalPoints]))

  if (!state) return null
  const contextName = context === PLAYER_COMPARISON_CONTEXT.OVERALL ? 'Overall head to head' : 'League head to head'
  const lifecycleNote = buildPlayerInsightLifecycle({
    competitionKey: state.competitionKey,
    lifecycle,
    insightState: story?.currentInsight.state,
  })

  return (
    <article className={styles.panel} aria-label={`${contextName}: You versus ${state.otherName}`}>
      <header className={styles.header}>
        <div><span className={styles.kicker}>{contextName} · {competitionName(state.competitionKey)}</span><h3>You v {state.otherName}</h3><p>Points, decisive calls and released predictions from this competition only.</p></div>
        <Button type="button" variant="secondary" size="small" onClick={onClose}>Back to profile</Button>
      </header>

      {state.status === 'loading' && <p className={styles.state}>Loading head-to-head evidence…</p>}
      {state.status === 'error' && <p className={`${styles.state} ${styles.stateError}`.trim()} role="alert">{state.error}</p>}
      {state.status === 'ready' && <p className={`${styles.state} ${styles.lifecycleNote}`.trim()}><strong>{lifecycleNote.label}</strong><span>{lifecycleNote.copy}</span></p>}
      {story && <Scoreboard currentPlayer={currentPlayer} otherPlayer={otherPlayer} story={story} />}
      {story && <SourceComparison story={story} />}
      {story && <DecisiveMatches story={story} competitionKey={state.competitionKey} />}
      {comparison && <p className={styles.state}>{comparison.release.copy}</p>}
      {comparison && (
        <div className={styles.summary} aria-label="Prediction comparison summary">
          <div><strong>{comparison.summary.comparedSelections}</strong><span>Compared</span></div>
          <div><strong>{comparison.rows.filter(row => row.comparison.comparable && !row.comparison.same).length}</strong><span>Different</span></div>
          <div><strong>{comparison.summary.exactScoreMatches}</strong><span>Same score</span></div>
          <div><strong>{comparison.summary.bracketMatches}</strong><span>Same bracket pick</span></div>
        </div>
      )}

      {comparison?.sections.length > 0 && (
        <div className={styles.sections}>
          {comparison.sections.map(section => {
            const differentRows = section.rows.filter(row => row.comparison.comparable && !row.comparison.same)
            const remainingRows = section.rows.filter(row => !differentRows.includes(row))
            return (
              <details key={section.label} className={styles.section} open={differentRows.length > 0}>
                <summary><strong>{section.label}</strong><span>{differentRows.length} different</span></summary>
                <div className={styles.rows}>
                  {differentRows.map(row => <ComparisonRow key={row.key} row={row} otherName={state.otherName} liveSnapshot={liveSnapshot} currentPoints={currentPointsByMatch.get(row.matchNumber)} otherPoints={otherPointsByMatch.get(row.matchNumber)} />)}
                  {remainingRows.length > 0 && (
                    <details className={styles.matchingRows}>
                      <summary><strong>Matching or protected picks</strong><span>{remainingRows.length}</span></summary>
                      <div>{remainingRows.map(row => <ComparisonRow key={row.key} row={row} otherName={state.otherName} liveSnapshot={liveSnapshot} currentPoints={currentPointsByMatch.get(row.matchNumber)} otherPoints={otherPointsByMatch.get(row.matchNumber)} />)}</div>
                    </details>
                  )}
                </div>
              </details>
            )
          })}
        </div>
      )}
      {comparison && comparison.rows.length === 0 && <p className={styles.state}>No comparison positions are available.</p>}
      {comparison && comparison.summary.privateSelections > 0 && <Badge tone="info">Unreleased picks remain protected</Badge>}
    </article>
  )
}
