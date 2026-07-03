import React, { useMemo } from 'react' // eslint-disable-line no-unused-vars
import { PlayerIdentity } from '../design-system/index.jsx'
import { formatOrdinal, LEAGUE_COMPETITION } from '../leagues/leagueModel.js'
import { buildAlignedPlayerComparison, PLAYER_COMPARISON_CONTEXT } from './playerComparisonModel.js'
import styles from './PlayerHeadToHead.module.css'

function competitionName(competitionKey) {
  return competitionKey === LEAGUE_COMPETITION.ORIGINAL ? 'Original Predictor' : 'KO Predictor'
}

function Selection({ label, selection, kind }) {
  const stateClass = selection.visibility === 'private'
    ? styles.selectionPrivate
    : selection.visibility === 'not_saved'
      ? styles.selectionMissing
      : ''

  return (
    <div className={`${styles.selection} ${stateClass}`.trim()}>
      <span className={styles.selectionLabel}>{label}</span>
      {selection.visibility !== 'visible' ? (
        <>
          <strong>{selection.visibility === 'private' ? 'Private' : 'Not saved'}</strong>
          <small>{selection.message}</small>
        </>
      ) : kind === 'bracket' ? (
        <>
          <small>{selection.matchup}</small>
          <strong>{selection.advancingTeamLabel}</strong>
          <small>Advancing team</small>
        </>
      ) : (
        <>
          <small>{selection.matchup}</small>
          <strong>{selection.score}</strong>
          {selection.advancingTeamLabel && <small>{selection.advancingTeamLabel} through</small>}
          {selection.decisionMethodLabel && <small>{selection.decisionMethodLabel}</small>}
          {selection.jokerApplied && <small className={styles.joker}>Joker applied</small>}
        </>
      )}
    </div>
  )
}

function PlayerCard({ player, isCurrentUser }) {
  return (
    <div className={styles.playerCard}>
      <PlayerIdentity player={player} isCurrentUser={isCurrentUser} size="large" meta={isCurrentUser ? null : 'Compared player'} />
      <div className={styles.playerStats}>
        <span>Rank <strong>{formatOrdinal(player?.rank)}</strong></span>
        <span>Total <strong>{player ? `${player.totalPoints} pts` : '—'}</strong></span>
      </div>
    </div>
  )
}

function Summary({ comparison }) {
  const summary = comparison.summary
  const original = comparison.competitionKey === LEAGUE_COMPETITION.ORIGINAL
  return (
    <div className={styles.summary} aria-label={`${competitionName(comparison.competitionKey)} comparison summary`}>
      <div><strong>{summary.comparedSelections}</strong><span>selections compared</span></div>
      <div><strong>{summary.exactScoreMatches}</strong><span>same score</span></div>
      {original ? (
        <>
          <div><strong>{summary.bracketMatches}</strong><span>same bracket pick</span></div>
          <div><strong>{summary.fullyMatchedSelections}</strong><span>fully matched</span></div>
        </>
      ) : (
        <>
          <div><strong>{summary.advancingTeamMatches}</strong><span>same team through</span></div>
          <div><strong>{summary.methodMatches}</strong><span>same method</span></div>
        </>
      )}
    </div>
  )
}

export default function PlayerHeadToHead({ state, reference, onClose, context = PLAYER_COMPARISON_CONTEXT.LEAGUE }) {
  const comparison = useMemo(() => {
    if (state?.status !== 'ready') return null
    return buildAlignedPlayerComparison({
      currentBundle: state.data.currentBundle,
      otherBundle: state.data.otherBundle,
      reference,
      competitionKey: state.competitionKey,
    })
  }, [reference, state])

  if (!state) return null
  const contextName = context === PLAYER_COMPARISON_CONTEXT.OVERALL ? 'Overall head to head' : 'League head to head'
  const currentPlayer = state.standings?.current
    ? { ...state.standings.current, displayName: state.standings.current.displayName || 'You' }
    : { displayName: 'You', rank: null, totalPoints: 0 }
  const otherPlayer = state.standings?.other
    ? { ...state.standings.other, displayName: state.otherName }
    : { displayName: state.otherName, rank: null, totalPoints: 0 }

  return (
    <article className={styles.panel} aria-label={`${contextName}: You versus ${state.otherName}`}>
      <header className={styles.header}>
        <div>
          <span className={styles.kicker}>{contextName} · {competitionName(state.competitionKey)}</span>
          <h3>You v {state.otherName}</h3>
          <p>Original and KO Predictor comparisons stay separate. Only selections released by the existing server privacy rules are shown.</p>
        </div>
        <button type="button" className={styles.close} onClick={onClose}>Close comparison</button>
      </header>

      <div className={styles.players}>
        <PlayerCard player={currentPlayer} isCurrentUser />
        <PlayerCard player={otherPlayer} isCurrentUser={false} />
      </div>

      {state.status === 'loading' && <p className={styles.state}>Loading authorised shared predictions…</p>}
      {state.status === 'error' && <p className={`${styles.state} ${styles.stateError}`.trim()} role="alert">{state.error}</p>}
      {comparison && <Summary comparison={comparison} />}

      {comparison && comparison.rows.length === 0 && <p className={styles.state}>No comparison positions are available.</p>}
      {comparison && comparison.sections.length > 0 && (
        <div className={styles.sections}>
          {comparison.sections.map((section, sectionIndex) => (
            <details key={section.label} className={styles.section} open={sectionIndex === 0}>
              <summary><strong>{section.label}</strong><span>{section.rows.length}</span></summary>
              <div className={styles.rows}>
                {section.rows.map(row => (
                  <article key={row.key} className={styles.row}>
                    <div className={styles.rowContext}>
                      <span>{row.stageLabel} · Match {row.matchNumber}</span>
                      <strong>{row.fixtureLabel}</strong>
                      <span className={`${styles.matchState} ${row.comparison.comparable ? row.comparison.same ? styles.same : styles.different : ''}`.trim()}>
                        {row.comparison.comparable ? row.comparison.same ? 'Same selection' : 'Different selection' : 'Comparison protected'}
                      </span>
                    </div>
                    <Selection label="You" selection={row.current} kind={row.kind} />
                    <Selection label={state.otherName} selection={row.other} kind={row.kind} />
                  </article>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}
    </article>
  )
}
