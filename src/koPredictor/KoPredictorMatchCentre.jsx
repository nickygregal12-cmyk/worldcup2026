import React from 'react' // eslint-disable-line no-unused-vars -- React is required for JSX under the current lint config
import lifecycleStyles from './KoPredictorLifecycle.module.css'
import { Badge, Button, Icon, PredictionStateBadge, ProgressBar, ScoreInput, TeamLabel } from '../design-system/index.jsx'
import { buildKoRoundProgress, deriveKoMatchPresentation, koMethodOptions, KO_PREDICTOR_ROUNDS } from './koPredictorPresentationModel.js'

function team(reference, id) {
  return id ? reference.teamsById?.[id] ?? null : null
}

function matchLabel(match) {
  const round = KO_PREDICTOR_ROUNDS.find(item => match.matchNumber >= item.first && match.matchNumber <= item.last)
  return `${round?.shortLabel ?? 'KO'} · Match ${match.matchNumber}`
}

export default function KoPredictorMatchCentre({
  reference,
  draft,
  summary,
  lifecycleStatus = null,
  standing = { points: 0, rank: null },
  saveState = 'idle',
  storageContext = 'guest',
  notice = null,
  saving = false,
  onChange,
  onSave,
}) {
  const resolvedMatches = reference.knockoutMatches.filter(match => match.participantsResolved)
  const roundProgress = buildKoRoundProgress(reference, draft)

  return (
    <section className="ko-match-centre" aria-labelledby="ko-match-centre-heading">
      <div className="knockout-context knockout-context--real">
        <div className="knockout-context__icon"><Icon name="trophy" size={24} /></div>
        <div>
          <span>Real knockout fixtures</span>
          <h2 id="ko-match-centre-heading">KO Predictor match centre</h2>
          <p>Predict real knockout matches here: the 90-minute score, who goes through and how the tie is decided.</p>
        </div>
        <Badge tone="warning" icon="trophy">KO Predictor</Badge>
      </div>


      {lifecycleStatus && (
        <div className={`${lifecycleStyles.lifecycle} ${lifecycleStyles[lifecycleStatus.tone] ?? ''}`} aria-label="KO Predictor timing">
          <div>
            <span>KO timing</span>
            <strong>{lifecycleStatus.title}</strong>
            <small>{lifecycleStatus.detail}</small>
          </div>
          <div>
            <span>{lifecycleStatus.progressLabel}</span>
            <small>{lifecycleStatus.boundaryLabel}</small>
          </div>
        </div>
      )}

      <div className="knockout-summary-grid">
        <article className="knockout-summary-card">
          <span>Available predictions</span>
          <strong>{summary.complete}/{summary.available}</strong>
          <ProgressBar value={summary.complete} max={summary.available} label="KO Predictor progress" />
        </article>
        <article className="knockout-summary-card">
          <span>Your KO points</span>
          <strong>{standing.points}</strong>
          <small>{standing.rank ? `Rank ${standing.rank}` : 'Rank appears after scoring'}</small>
        </article>
        <article className="knockout-summary-card knockout-summary-card--joker">
          <span>KO jokers</span>
          <strong>{summary.jokerCount}/{summary.jokerCap}</strong>
          <small>These never affect Original Predictor points.</small>
        </article>
      </div>

      {resolvedMatches.length === 0 ? (
        <div className="ko-empty-state">
          <Icon name="clock" size={26} />
          <div><strong>Real knockout fixtures are not ready yet</strong><p>Only confirmed fixtures with both teams are shown. TBC matches stay hidden.</p></div>
        </div>
      ) : (
        <div className="ko-rounds">
          {roundProgress.filter(round => round.available > 0).map(round => (
            <section className="ko-round" key={round.key}>
              <header><div><span>{round.shortLabel}</span><h3>{round.label}</h3></div><small>{round.complete}/{round.available} complete</small></header>
              <div className="ko-match-grid">
                {resolvedMatches.filter(match => match.matchNumber >= round.first && match.matchNumber <= round.last).map(match => {
                  const row = draft.rows[String(match.matchNumber)]
                  const presentation = deriveKoMatchPresentation(match, row)
                  const methods = koMethodOptions(row)
                  const capReached = summary.jokerCount >= summary.jokerCap && !row.jokerApplied
                  const home = team(reference, match.homeTeamId)
                  const away = team(reference, match.awayTeamId)
                  return (
                    <article className={`ko-match-card${row.jokerApplied ? ' ko-match-card--joker' : ''}`} key={match.matchId}>
                      <div className="ko-match-card__meta">
                        <div><strong>{matchLabel(match)}</strong><span>{presentation.locked ? presentation.label : 'Open until kick-off'}</span></div>
                        <PredictionStateBadge state={presentation.state} label={presentation.label} />
                      </div>

                      <div className="ko-score-heading"><strong>90-minute score</strong><small>Penalty shoot-out score is never predicted.</small></div>
                      <div className="ko-score-row">
                        <TeamLabel team={home} compact />
                        <ScoreInput value={row.homeScore} label={`${home?.label ?? 'Home'} 90-minute score`} readOnly={presentation.locked} onChange={value => onChange(match, { homeScore: value })} />
                        <span className="ko-score-row__dash">–</span>
                        <ScoreInput value={row.awayScore} label={`${away?.label ?? 'Away'} 90-minute score`} readOnly={presentation.locked} onChange={value => onChange(match, { awayScore: value })} />
                        <TeamLabel team={away} compact />
                      </div>

                      <fieldset className="ko-choice-group" aria-disabled={presentation.locked}>
                        <legend>Team to advance</legend>
                        <div>
                          {[home, away].map(item => {
                            const selected = row.advancingTeamId === item?.teamId
                            return (
                              <div key={item?.teamId} className={selected ? 'ko-team-choice is-selected' : 'ko-team-choice'}>
                                <TeamLabel team={item} compact />
                                <button
                                  type="button"
                                  className="ko-team-choice__action"
                                  disabled={presentation.locked}
                                  aria-pressed={selected}
                                  onClick={() => onChange(match, { advancingTeamId: item?.teamId })}
                                >
                                  {selected ? 'Selected to advance' : 'Pick to advance'}
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </fieldset>

                      <fieldset className="ko-choice-group" disabled={presentation.locked || methods.length === 0}>
                        <legend>How the tie is decided</legend>
                        <div className="ko-method-options">
                          {methods.length === 0 ? <span>Enter the 90-minute score first</span> : methods.map(method => (
                            <button type="button" key={method.value} className={row.decisionMethod === method.value ? 'is-selected' : ''} aria-pressed={row.decisionMethod === method.value} onClick={() => onChange(match, { decisionMethod: method.value })}>{method.label}</button>
                          ))}
                        </div>
                      </fieldset>

                      <button type="button" className={row.jokerApplied ? 'ko-joker-button is-selected' : 'ko-joker-button'} disabled={presentation.locked || capReached} aria-pressed={row.jokerApplied} onClick={() => onChange(match, { jokerApplied: !row.jokerApplied })}>
                        <span className="groups-joker-mark">J</span><span>{row.jokerApplied ? 'KO joker applied' : capReached ? 'Five KO jokers already used' : 'Apply KO joker'}</span>
                      </button>
                    </article>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {notice && <p className="guest-notice guest-notice--warning" role="status">{notice}</p>}
      <div className="ko-save-bar">
        <PredictionStateBadge state={saveState === 'idle' ? 'empty' : saveState} label={saveState === 'dirty' ? 'Changes waiting' : saveState === 'local' ? 'Saved on this device' : null} />
        <div>
          <strong>{storageContext === 'account' ? 'KO Predictor saves separately' : storageContext === 'guest-transfer' ? 'Browser KO draft ready for your account' : 'KO predictions save on this device'}</strong>
          <span>Original Predictor points and picks are never included.</span>
        </div>
        {storageContext !== 'guest' && (
          <Button onClick={onSave} loading={saving} disabled={resolvedMatches.length === 0 || summary.complete === 0}>
            {saving ? 'Saving…' : storageContext === 'guest-transfer' ? 'Add KO draft to account' : 'Save KO Predictor'}
          </Button>
        )}
      </div>
    </section>
  )
}
