import React from 'react' // eslint-disable-line no-unused-vars
import { hasActivePredictionGrace, PREDICTION_COMPETITION_KEY } from '../grace/index.js'
import { Badge, Icon, PredictionStateBadge, ProgressBar, TeamLabel } from '../design-system/index.jsx'
import {
  buildOriginalBracketRoundProgress,
  deriveOriginalBracketMatchState,
  describeBracketSlot,
  ORIGINAL_BRACKET_ROUNDS,
  predictedChampion,
} from './originalBracketPresentationModel.js'

function formatDate(dateValue) {
  if (!dateValue) return 'Date to be confirmed'
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${dateValue}T12:00:00Z`))
}

function teamFor(reference, teamId) {
  return teamId ? reference.teamsById?.[teamId] ?? null : null
}

function stateBadge(state) {
  if (state === 'blocked') return { state: 'empty', label: 'Waiting for earlier pick' }
  if (state === 'locked') return { state: 'locked', label: 'Bracket locked' }
  if (state === 'grace') return { state: 'grace', label: 'Grace window active' }
  if (state === 'complete') return { state: 'complete', label: 'Winner selected' }
  return { state: 'empty', label: 'Choose a winner' }
}

export default function OriginalBracket({ reference, draft, preview, contentLocked, reviewMode, graceWindows, onChange }) {
  const progress = buildOriginalBracketRoundProgress(preview)
  const champion = predictedChampion(preview, reference)
  const completed = progress.reduce((total, round) => total + round.complete, 0)

  return (
    <section className="original-bracket" aria-labelledby="original-bracket-heading">
      <div className="knockout-context knockout-context--predicted">
        <div className="knockout-context__icon"><Icon name="bracket" size={24} /></div>
        <div>
          <span>Predicted context</span>
          <h2 id="original-bracket-heading">Your permanent pre-tournament bracket</h2>
          <p>This is part of the Original Predictor. Pick only who advances—there are no scores, methods or jokers here.</p>
        </div>
        <Badge tone="info" icon="bracket">Original Predictor</Badge>
      </div>

      <div className="knockout-summary-grid">
        <article className="knockout-summary-card">
          <span>Bracket progress</span>
          <strong>{completed}/15</strong>
          <ProgressBar value={completed} max={15} label="Original bracket progress" />
        </article>
        <article className="knockout-summary-card knockout-summary-card--champion">
          <span>Predicted champion</span>
          {champion ? <TeamLabel team={champion} /> : <strong>Not selected yet</strong>}
          <small>The final winner becomes your predicted champion.</small>
        </article>
        <article className="knockout-summary-card">
          <span>Scoring boundary</span>
          <strong>0 bracket jokers</strong>
          <small>Progression points only. KO Predictor points never enter this total.</small>
        </article>
      </div>

      <nav className="bracket-round-progress" aria-label="Bracket round progress">
        {progress.map(round => (
          <a key={round.key} href={`#bracket-${round.key}`} className={round.isComplete ? 'is-complete' : ''}>
            <span>{round.shortLabel}</span><strong>{round.complete}/{round.total}</strong>
          </a>
        ))}
      </nav>

      <div className="original-bracket__rounds">
        {ORIGINAL_BRACKET_ROUNDS.map(round => {
          const matches = preview.resolution.knockout.matches.filter(match => match.stage === round.key)
          return (
            <section className="original-bracket__round" id={`bracket-${round.key}`} key={round.key}>
              <header>
                <div><span>{round.shortLabel}</span><h3>{round.label}</h3></div>
                <small>{matches.filter(match => match.decisionResolved).length}/{matches.length} selected</small>
              </header>
              <div className="original-bracket__matches">
                {matches.map(match => {
                  const row = draft.bracketPredictions[String(match.matchNumber)]
                  const referenceMatch = reference.knockoutMatches.find(item => item.matchNumber === match.matchNumber)
                  const hasGrace = hasActivePredictionGrace(graceWindows, {
                    competitionKey: PREDICTION_COMPETITION_KEY.ORIGINAL,
                    matchId: referenceMatch?.matchId,
                  })
                  const disabled = reviewMode || (contentLocked && !hasGrace) || !match.participantsResolved
                  const state = deriveOriginalBracketMatchState({ participantsResolved: match.participantsResolved, selectedTeamId: row.advancingTeamId, disabled, hasGrace })
                  const badge = stateBadge(state)
                  return (
                    <article className={`original-bracket-match original-bracket-match--${state}`} key={match.matchNumber}>
                      <div className="original-bracket-match__meta">
                        <div><strong>Match {match.matchNumber}</strong><span>{formatDate(referenceMatch?.scheduledDate)}</span></div>
                        <PredictionStateBadge state={badge.state} label={badge.label} />
                      </div>
                      <div className="original-bracket-match__teams">
                        {[['home', match.homeTeamId, match.home], ['away', match.awayTeamId, match.away]].map(([side, teamId, slot]) => {
                          const selected = row.advancingTeamId === teamId && Boolean(teamId)
                          const team = teamFor(reference, teamId)
                          return (
                            <button
                              type="button"
                              key={side}
                              className={selected ? 'bracket-team-choice is-selected' : 'bracket-team-choice'}
                              disabled={disabled || !teamId}
                              aria-pressed={selected}
                              onClick={() => onChange(match, selected ? null : teamId)}
                            >
                              <TeamLabel team={team} label={team?.label ?? describeBracketSlot(slot)} unresolved={!teamId} compact />
                              <span className="bracket-team-choice__action">{selected ? 'Selected to advance' : teamId ? 'Pick to advance' : 'Not resolved'}</span>
                            </button>
                          )
                        })}
                      </div>
                      {match.winnerTeamId && (
                        <div className="original-bracket-match__winner">
                          <Icon name="chevron" size={16} /><span>{teamFor(reference, match.winnerTeamId)?.label ?? 'Selected team'} progresses</span>
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </section>
  )
}
