import React from 'react' // eslint-disable-line no-unused-vars
import { useMemo } from 'react'
import { EURO_SCORING_CONFIG } from '../config/scoringConfig.js'
import { ScoreInput, TeamLabel, PredictionStateBadge, Button, ProgressBar } from '../design-system/index.jsx'
import { hasActivePredictionGrace, isPredictionMatchStarted, PREDICTION_COMPETITION_KEY } from '../grace/index.js'
import { buildGroupProgress, deriveGroupMatchState, jokerControlLabel } from './groupsPresentationModel.js'

function formatMatchDate(dateValue) {
  if (!dateValue) return 'Date to be confirmed'
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${dateValue}T12:00:00Z`))
}

function scrollToGroup(code) {
  document.getElementById(`group-${code}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function GroupsPredictor({
  reference,
  draft,
  summary,
  scoreLocked,
  reviewMode,
  graceWindows,
  autosaveStatus,
  context,
  activeMatchNumber,
  onChange,
  onOpenReview,
}) {
  const groupProgress = useMemo(() => buildGroupProgress(reference, draft), [reference, draft])

  return (
    <div className="groups-predictor">
      <section className="groups-overview" aria-label="Group prediction progress">
        <div className="groups-overview__copy">
          <span className="page-eyebrow">Group stage</span>
          <h2>Predict all 36 scores</h2>
          <p>Every score saves automatically. Add up to {summary.groupJokerCap} jokers before each selected match starts.</p>
        </div>
        <div className="groups-overview__progress">
          <ProgressBar value={summary.groupComplete} max={36} label="Group predictions completed" />
          <div className="groups-joker-meter" aria-label={`${summary.groupJokers} of ${summary.groupJokerCap} group jokers selected`}>
            <span className="groups-joker-mark" aria-hidden="true">J</span>
            <strong>{summary.groupJokers}/{summary.groupJokerCap}</strong>
            <span>jokers</span>
            <small>{EURO_SCORING_CONFIG.joker.MULTIPLIER}× points</small>
          </div>
        </div>
      </section>

      <nav className="groups-jump" aria-label="Jump to a group">
        {groupProgress.map(group => (
          <button type="button" key={group.code} className={group.isComplete ? 'is-complete' : ''} onClick={() => scrollToGroup(group.code)}>
            <span>Group {group.code}</span>
            <small>{group.complete}/{group.total}</small>
          </button>
        ))}
      </nav>

      <div className="groups-list">
        {reference.groups.map(group => {
          const matches = reference.groupMatches.filter(match => match.groupCode === group.code)
          const progress = groupProgress.find(item => item.code === group.code)
          return (
            <section className="group-section" id={`group-${group.code}`} key={group.code} aria-labelledby={`group-${group.code}-title`}>
              <header className="group-section__header">
                <div>
                  <span className="page-eyebrow">Original Predictor</span>
                  <h3 id={`group-${group.code}-title`}>Group {group.code}</h3>
                </div>
                <PredictionStateBadge state={progress.isComplete ? 'complete' : 'empty'} label={`${progress.complete}/${progress.total} complete`} />
              </header>

              <div className="group-match-list">
                {matches.map(match => {
                  const row = draft.groupPredictions[String(match.matchNumber)]
                  const complete = row.homeScore != null && row.awayScore != null
                  const capReached = summary.groupJokers >= summary.groupJokerCap && !row.jokerApplied
                  const started = isPredictionMatchStarted(match)
                  const hasGrace = hasActivePredictionGrace(graceWindows, {
                    competitionKey: PREDICTION_COMPETITION_KEY.ORIGINAL,
                    matchId: match.matchId,
                  })
                  const scoreReadOnly = reviewMode || (scoreLocked && !hasGrace)
                  const jokerDisabled = reviewMode || started || capReached
                  const state = deriveGroupMatchState({
                    reviewMode,
                    locked: scoreLocked && !hasGrace,
                    hasGrace,
                    active: activeMatchNumber === match.matchNumber,
                    autosaveStatus,
                    context,
                    complete,
                  })
                  const homeTeam = reference.teamsById?.[match.homeTeamId]
                  const awayTeam = reference.teamsById?.[match.awayTeamId]
                  const jokerLabel = jokerControlLabel({ applied: row.jokerApplied, disabled: jokerDisabled, capReached, started, reviewMode })

                  return (
                    <article className={`group-match-card${row.jokerApplied ? ' group-match-card--joker' : ''}`} key={match.matchId} data-match-number={match.matchNumber}>
                      <header className="group-match-card__header">
                        <div><strong>Match {match.matchNumber}</strong><span>{formatMatchDate(match.scheduledDate)}</span></div>
                        <PredictionStateBadge state={state} />
                      </header>

                      <div className="group-match-card__prediction">
                        <div className="group-match-team group-match-team--home"><TeamLabel team={homeTeam} compact /></div>
                        <ScoreInput
                          value={row.homeScore}
                          label={`${homeTeam?.label ?? 'Home team'} score in match ${match.matchNumber}`}
                          readOnly={scoreReadOnly}
                          grace={hasGrace}
                          state={state}
                          onChange={homeScore => onChange(match, { homeScore })}
                        />
                        <span className="group-match-card__separator" aria-hidden="true">–</span>
                        <ScoreInput
                          value={row.awayScore}
                          label={`${awayTeam?.label ?? 'Away team'} score in match ${match.matchNumber}`}
                          readOnly={scoreReadOnly}
                          grace={hasGrace}
                          state={state}
                          onChange={awayScore => onChange(match, { awayScore })}
                        />
                        <div className="group-match-team group-match-team--away"><TeamLabel team={awayTeam} compact /></div>
                      </div>

                      <footer className="group-match-card__footer">
                        <span>{complete ? `${row.homeScore}–${row.awayScore} predicted` : 'Enter both scores'}</span>
                        <button
                          type="button"
                          className={row.jokerApplied ? 'joker-control is-active' : 'joker-control'}
                          disabled={jokerDisabled}
                          aria-pressed={row.jokerApplied}
                          aria-label={`${jokerLabel} for match ${match.matchNumber}`}
                          onClick={() => onChange(match, { jokerApplied: !row.jokerApplied })}
                        >
                          <span className="groups-joker-mark" aria-hidden="true">J</span>
                          <span>{jokerLabel}</span>
                        </button>
                      </footer>
                    </article>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      <section className="groups-next-step">
        <div>
          <span className="page-eyebrow">Next step</span>
          <h3>{summary.groupComplete === 36 ? 'Your group predictions are complete' : `${36 - summary.groupComplete} group scores left`}</h3>
          <p>{summary.groupComplete === 36 ? 'Your predicted tables now feed the permanent pre-tournament bracket.' : 'You can leave and return at any time. Completed scores remain saved.'}</p>
        </div>
        <Button variant="secondary" icon="check" onClick={onOpenReview}>Review progress</Button>
      </section>
    </div>
  )
}
