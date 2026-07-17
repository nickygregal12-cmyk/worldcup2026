import React, { useMemo } from 'react' // eslint-disable-line no-unused-vars -- React is required for JSX under the current lint config
import { PlayerIdentity, TeamLabel } from '../design-system/index.jsx'
import { buildPlayerInsight, buildPlayerInsightLifecycle } from './playerInsightModel.js'
import styles from './PlayerInsight.module.css'

function competitionName(competitionKey) {
  return competitionKey === 'original' ? 'Original Predictor' : 'KO Predictor'
}

function formatRank(rank) {
  return rank ? `#${rank}` : '—'
}

function StoryGrid({ insight }) {
  const nextText = insight.rank.nextHigherPoints == null
    ? insight.rank.isLeader ? 'Leading' : '—'
    : `${insight.rank.pointsToNextScore} pts`
  const behindText = insight.rank.isLeader ? 'Leading' : `${insight.rank.pointsBehindLeader} pts`

  return (
    <div className={styles.storyGrid} aria-label="Rank and points story">
      <div><strong>{insight.rank.totalPoints}</strong><span>Total points</span></div>
      <div><strong>{formatRank(insight.rank.rank)}</strong><span>{insight.rank.tiedPlayerCount > 1 ? `Tied with ${insight.rank.tiedPlayerCount - 1}` : 'Current rank'}</span></div>
      <div><strong>{behindText}</strong><span>Behind leader</span></div>
      <div><strong>{nextText}</strong><span>{insight.rank.nextHigherPoints == null ? 'Next score' : 'To draw level'}</span></div>
    </div>
  )
}

function Source({ label, points, total }) {
  const percent = total > 0 ? Math.round((points / total) * 100) : 0
  return <div><strong>{points}</strong><span>{label}</span><i aria-hidden="true"><b style={{ width: `${percent}%` }} /></i></div>
}

function SourceGrid({ insight }) {
  const original = insight.competitionKey === 'original'
  const total = Math.max(1, insight.rank.totalPoints)
  return (
    <div className={styles.sourceGrid} aria-label="Point sources">
      <Source label="Exact scores" points={insight.sources.exactScore} total={total} />
      <Source label={original ? 'Correct outcomes' : 'Result components'} points={insight.sources.correctOutcome} total={total} />
      {original ? (
        <Source label="Original bracket" points={insight.sources.bracket} total={total} />
      ) : (
        <>
          <Source label="Advancing teams" points={insight.sources.advancingTeam} total={total} />
          <Source label="Decision components" points={insight.sources.decisionMethod} total={total} />
        </>
      )}
      <Source label="Joker bonus" points={insight.sources.jokerBonus} total={total} />
      {insight.sources.unallocatedPoints > 0 && <Source label="Other awarded points" points={insight.sources.unallocatedPoints} total={total} />}
    </div>
  )
}

function Statistics({ insight }) {
  const bestCall = insight.bestCalls[0]
  return (
    <div className={styles.statistics} aria-label="Performance statistics">
      <div><strong>{insight.statistics.exactScores}</strong><span>Exact scores</span></div>
      <div><strong>{insight.statistics.correctResults}</strong><span>Correct results</span></div>
      <div><strong>{insight.statistics.successfulJokers}</strong><span>Successful jokers</span></div>
      <div><strong>{insight.statistics.longestScoringStreak}</strong><span>Match scoring streak</span></div>
      <div><strong>{insight.bestPeriod?.points ?? 0}</strong><span>{insight.bestPeriod ? `Best: ${insight.bestPeriod.label}` : 'Best matchday'}</span></div>
      <div><strong>{bestCall?.totalPoints ?? 0}</strong><span>{bestCall ? `Best call: Match ${bestCall.matchNumber}` : 'Best call'}</span></div>
    </div>
  )
}

function pointLine(row, competitionKey) {
  const parts = [`Exact ${row.exactScorePoints}`, `${competitionKey === 'ko_predictor' ? 'Result' : 'Outcome'} ${row.correctOutcomePoints}`]
  if (competitionKey === 'ko_predictor') {
    parts.push(`Team ${row.advancingTeamPoints}`, `Method ${row.decisionMethodPoints}`)
  }
  if (row.jokerBonus > 0) parts.push(`Joker bonus ${row.jokerBonus}`)
  return parts.join(' · ')
}

function MatchEvidence({ row, competitionKey }) {
  return (
    <a className={styles.evidenceRow} href={`#/match-centre?match=${row.matchNumber}&competition=${competitionKey}`}>
      <div>
        <span>{row.stageLabel} · Match {row.matchNumber}</span>
        <small>{pointLine(row, competitionKey)}</small>
        {row.corrected && <small className={styles.corrected}>Corrected result revision {row.resultRevision}</small>}
      </div>
      <strong>{row.totalPoints} pts</strong>
    </a>
  )
}

function PeriodEvidence({ insight }) {
  return (
    <section className={styles.receipt}>
      <header><div><span>Full audit</span><h4>Points by matchday</h4></div><b>{insight.periods.length}</b></header>
      {insight.periods.length === 0 ? (
        <p className={styles.empty}>No match point rows have been recorded.</p>
      ) : (
        <div className={styles.periods}>
          {insight.periods.map(period => (
            <section key={period.key} className={styles.period}>
              <header><strong>{period.label}</strong><span>{period.points} pts</span></header>
              <div>{period.rows.map(row => <MatchEvidence key={row.matchId} row={row} competitionKey={insight.competitionKey} />)}</div>
            </section>
          ))}
        </div>
      )}
    </section>
  )
}

function BracketEvidence({ insight }) {
  if (insight.competitionKey !== 'original') return null
  return (
    <section className={styles.receipt}>
      <header><div><span>Original Predictor</span><h4>Bracket progression</h4></div><b>{insight.bracketRows.length}</b></header>
      {insight.bracketRows.length === 0 ? (
        <p className={styles.empty}>No Original bracket points have been recorded.</p>
      ) : (
        <div className={styles.bracketRows}>
          {insight.bracketRows.map((row, index) => (
            <div className={styles.bracketRow} key={`${row.milestone}-${row.tournamentTeamId}-${index}`}>
              <div><span>{row.milestone.replaceAll('_', ' ')}</span><TeamLabel team={row.team} label={row.teamLabel} compact /></div>
              <strong>{row.points} pts</strong>
            </div>
          ))}
        </div>
      )}
      <a className={styles.contextLink} href="#/bracket">Open full bracket context</a>
    </section>
  )
}

function BestCalls({ insight }) {
  if (insight.bestCalls.length === 0) return null
  return (
    <section className={styles.bestCalls} aria-labelledby="best-calls-heading">
      <div><span>Best calls</span><h4 id="best-calls-heading">Highest-scoring match{insight.bestCalls.length === 1 ? '' : 'es'}</h4></div>
      <div>{insight.bestCalls.slice(0, 3).map(row => <MatchEvidence key={row.matchId} row={row} competitionKey={insight.competitionKey} />)}</div>
    </section>
  )
}

export default function PlayerInsight({
  section,
  leaderboardRows = [],
  player,
  competitionKey,
  title = 'Points story',
  showIdentity = true,
  compact = false,
  lifecycle = null,
}) {
  const points = section?.data ?? null
  const insight = useMemo(() => buildPlayerInsight({
    points,
    leaderboardRows,
    memberUserId: player?.userId ?? points?.memberUserId ?? null,
    competitionKey,
  }), [competitionKey, leaderboardRows, player?.userId, points])
  const lifecycleNote = useMemo(() => buildPlayerInsightLifecycle({
    competitionKey,
    lifecycle,
    insightState: insight.state,
  }), [competitionKey, insight.state, lifecycle])

  return (
    <article className={`${styles.card} ${compact ? styles.compact : ''}`.trim()}>
      <header className={styles.header}>
        <div>
          <span className={styles.kicker}>{competitionName(competitionKey)}</span>
          <h3>{title}</h3>
        </div>
        {showIdentity && <PlayerIdentity player={player ?? { displayName: points?.displayName ?? 'Player' }} isCurrentUser={Boolean(player?.isCurrentUser)} />}
      </header>

      {section?.status !== 'loading' && <p className={styles.lifecycleNote}><strong>{lifecycleNote.label}</strong><span>{lifecycleNote.copy}</span></p>}

      {section?.status === 'loading' && <p className={styles.state}>Loading point evidence…</p>}
      {section?.status === 'error' && <p className={`${styles.state} ${styles.error}`.trim()} role="alert">{section.error}</p>}
      {section?.status === 'ready' && insight.state === 'protected' && (
        <>
          <StoryGrid insight={insight} />
          <p className={styles.state}>{insight.reason}</p>
        </>
      )}
      {section?.status === 'ready' && insight.state === 'unscored' && (
        <>
          <StoryGrid insight={insight} />
          <p className={styles.state}>No points have been recorded for this competition yet.</p>
        </>
      )}
      {section?.status === 'ready' && insight.state === 'scored' && (
        <>
          <StoryGrid insight={insight} />
          <div className={styles.sectionHeading}>
            <div><span>How the total was earned</span><strong>Every awarded source</strong></div>
            <small>{insight.statistics.scoredMatches} scored match{insight.statistics.scoredMatches === 1 ? '' : 'es'}</small>
          </div>
          <SourceGrid insight={insight} />
          {insight.statistics.correctedMatches > 0 && (
            <p className={styles.correction}>{insight.statistics.correctedMatches} match breakdown{insight.statistics.correctedMatches === 1 ? ' has' : 's have'} been recalculated after a corrected result.</p>
          )}
          <BestCalls insight={insight} />
          <div className={styles.evidence}>
            <PeriodEvidence insight={insight} />
            <BracketEvidence insight={insight} />
          </div>
          <Statistics insight={insight} />
        </>
      )}
    </article>
  )
}
