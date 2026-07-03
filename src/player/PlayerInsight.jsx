import React, { useMemo } from 'react' // eslint-disable-line no-unused-vars
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

function Source({ label, points }) {
  return <div><strong>{points}</strong><span>{label}</span></div>
}

function SourceGrid({ insight }) {
  const original = insight.competitionKey === 'original'
  return (
    <div className={styles.sourceGrid} aria-label="Canonical point sources">
      <Source label="Exact scores" points={insight.sources.exactScore} />
      <Source label="Correct outcomes" points={insight.sources.correctOutcome} />
      {original ? (
        <Source label="Original bracket" points={insight.sources.bracket} />
      ) : (
        <>
          <Source label="Advancing teams" points={insight.sources.advancingTeam} />
          <Source label="Decision methods" points={insight.sources.decisionMethod} />
        </>
      )}
      <Source label="Joker bonus" points={insight.sources.jokerBonus} />
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
  const parts = [`Score ${row.exactScorePoints}`, `Outcome ${row.correctOutcomePoints}`]
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
    <details className={styles.details}>
      <summary><strong>Points by matchday</strong><span>{insight.periods.length}</span></summary>
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
    </details>
  )
}

function BracketEvidence({ insight }) {
  if (insight.competitionKey !== 'original') return null
  return (
    <details className={styles.details}>
      <summary><strong>Original bracket progression</strong><span>{insight.bracketRows.length}</span></summary>
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
    </details>
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

      {section?.status === 'loading' && <p className={styles.state}>Loading canonical point evidence…</p>}
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
          <p className={styles.state}>No canonical points have been recorded for this competition yet.</p>
        </>
      )}
      {section?.status === 'ready' && insight.state === 'scored' && (
        <>
          <StoryGrid insight={insight} />
          <div className={styles.sectionHeading}>
            <div><span>How the total was earned</span><strong>Canonical scoring rows only</strong></div>
            <small>{insight.statistics.scoredMatches} processed match{insight.statistics.scoredMatches === 1 ? '' : 'es'}</small>
          </div>
          <SourceGrid insight={insight} />
          <Statistics insight={insight} />
          {insight.statistics.correctedMatches > 0 && (
            <p className={styles.correction}>{insight.statistics.correctedMatches} match breakdown{insight.statistics.correctedMatches === 1 ? ' has' : 's have'} been recalculated after a corrected result.</p>
          )}
          <div className={styles.evidence}>
            <PeriodEvidence insight={insight} />
            <BracketEvidence insight={insight} />
          </div>
        </>
      )}
    </article>
  )
}
