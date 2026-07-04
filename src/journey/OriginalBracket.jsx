import React from 'react' // eslint-disable-line no-unused-vars -- React is required for JSX under the current lint config
import { hasActivePredictionGrace, PREDICTION_COMPETITION_KEY } from '../grace/index.js'
import { Badge, Icon, PredictionStateBadge, ProgressBar, TeamLabel } from '../design-system/index.jsx'
import {
  buildOriginalBracketRoundProgress,
  buildOriginalBracketSurface,
  deriveOriginalBracketMatchState,
  predictedChampion,
} from './originalBracketPresentationModel.js'
import styles from './OriginalBracket.module.css'

const REPICK_COPY = 'Re-pick — your tables changed this tie'
const CONTEXT_COPY = 'Your predicted bracket — built from your predicted tables, never blended with live results'
const KO_SUBLINE = 'Winner picks only — scores and jokers live in the KO Predictor'

function formatDate(dateValue) {
  if (!dateValue) return 'Date to be confirmed'
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${dateValue}T12:00:00Z`))
}

function teamFor(reference, teamId) {
  return teamId ? reference.teamsById?.[teamId] ?? null : null
}

function stateBadge(state) {
  if (state === 'repick') return { state: 'dirty', label: REPICK_COPY }
  if (state === 'blocked') return { state: 'empty', label: 'Waiting for earlier pick' }
  if (state === 'locked') return { state: 'locked', label: 'Bracket locked' }
  if (state === 'grace') return { state: 'grace', label: 'Grace window active' }
  if (state === 'complete') return { state: 'complete', label: 'Winner selected' }
  return { state: 'empty', label: 'Choose a winner' }
}

function ChampionIdentity({ champion, emptyLabel = 'Pick through to the final', compact = false }) {
  return champion
    ? <TeamLabel team={champion} compact={compact} />
    : <strong className={styles.emptyChampion}>{emptyLabel}</strong>
}

function OriginalBracketSlot({ slot, disabled, onSelect }) {
  const className = [
    styles.slot,
    'bracket-team-choice',
    slot.selected ? styles.slotSelected : '',
    slot.selected ? 'is-selected' : '',
    slot.unresolved ? styles.slotUnresolved : '',
  ].filter(Boolean).join(' ')
  const actionLabel = slot.selected ? 'Selected to advance' : 'Pick to advance'

  return (
    <div className={className} data-slot-source={slot.sourceCode} data-slot-side={slot.side}>
      <span className={styles.slotSource}>{slot.sourceCode}</span>
      {slot.unresolved ? (
        <span className={styles.placeholderChip}>{slot.placeholderLabel}</span>
      ) : (
        <>
          <TeamLabel team={slot.team} label={slot.label} compact />
          <button
            type="button"
            className={`${styles.slotAction} bracket-team-choice__action`}
            disabled={disabled}
            aria-pressed={slot.selected}
            onClick={() => onSelect(slot.teamId)}
          >
            <span>{actionLabel}</span>
            {slot.selected && <Icon name="check" size={15} />}
          </button>
        </>
      )}
    </div>
  )
}

function OriginalBracketTie({ tie, reference, disabled, state, onChange }) {
  const badge = stateBadge(state)
  const staleSelectedTeam = tie.stale ? teamFor(reference, tie.selectedTeamId) : null
  return (
    <article
      className={`${styles.tie} ${styles[`tie${state[0].toUpperCase()}${state.slice(1)}`] ?? ''}`}
      data-match-number={tie.matchNumber}
      data-stage={tie.stage}
      style={{ '--wall-column': tie.wallColumn, '--wall-row': tie.wallRow }}
    >
      <div className={styles.tieMeta}>
        <div><strong>Match {tie.matchNumber}</strong><span>{formatDate(tie.scheduledDate)}</span></div>
        <PredictionStateBadge state={badge.state} label={badge.label} />
      </div>
      {tie.stale && (
        <div className={styles.repickFlag} role="status">
          <Icon name="alert" size={14} />
          <span>{REPICK_COPY}</span>
          {staleSelectedTeam && <small>Previous pick: {staleSelectedTeam.label}</small>}
        </div>
      )}
      <div className={styles.slotStack}>
        {tie.slots.map(slot => (
          <OriginalBracketSlot
            key={slot.side}
            slot={slot}
            disabled={disabled || slot.unresolved}
            onSelect={teamId => onChange(tie, slot.selected ? null : teamId)}
          />
        ))}
      </div>
      {tie.winnerTeamId && !tie.stale && (
        <div className={styles.winnerLine}>
          <Icon name="chevron" size={16} /><span>{teamFor(reference, tie.winnerTeamId)?.label ?? 'Selected team'} progresses</span>
        </div>
      )}
    </article>
  )
}

function WallChampionBox({ champion }) {
  return (
    <aside className={styles.wallChampion} aria-label="Predicted champion">
      <span>Champion</span>
      <ChampionIdentity champion={champion} emptyLabel="Pick your final" compact />
    </aside>
  )
}

export default function OriginalBracket({ reference, draft, preview, contentLocked, reviewMode, graceWindows, onChange }) {
  const progress = buildOriginalBracketRoundProgress(preview)
  const champion = predictedChampion(preview, reference)
  const completed = progress.reduce((total, round) => total + round.complete, 0)
  const surface = buildOriginalBracketSurface({ reference, draft, preview })

  return (
    <section className={styles.bracket} aria-labelledby="original-bracket-heading">
      <div className="knockout-context knockout-context--predicted">
        <div className="knockout-context__icon"><Icon name="bracket" size={24} /></div>
        <div>
          <span>Predicted context</span>
          <h2 id="original-bracket-heading">Your permanent pre-tournament bracket</h2>
          <p>{CONTEXT_COPY}</p>
        </div>
        <Badge tone="info" icon="bracket">Original Predictor</Badge>
      </div>

      <div className={styles.championStrip}>
        <div>
          <span>Your champion</span>
          <ChampionIdentity champion={champion} />
        </div>
        <small>{KO_SUBLINE}</small>
      </div>

      <div className="knockout-summary-grid">
        <article className="knockout-summary-card">
          <span>Bracket progress</span>
          <strong>{completed}/15</strong>
          <ProgressBar value={completed} max={15} label="Original bracket progress" />
        </article>
        <article className="knockout-summary-card knockout-summary-card--champion">
          <span>Predicted champion</span>
          <ChampionIdentity champion={champion} emptyLabel="Not selected yet" compact />
          <small>The final winner becomes your predicted champion.</small>
        </article>
        <article className="knockout-summary-card">
          <span>Scoring boundary</span>
          <strong>0 bracket jokers</strong>
          <small>Pick only who advances. No scores or methods are stored here.</small>
        </article>
      </div>

      <nav className="bracket-round-progress" aria-label="Bracket round progress">
        {progress.map(round => (
          <a key={round.key} href={`#bracket-${round.key}`} className={round.isComplete ? 'is-complete' : ''}>
            <span>{round.shortLabel}</span><strong>{round.complete}/{round.total}</strong>
          </a>
        ))}
      </nav>

      <div className={styles.wallLabels} aria-hidden="true">
        {surface.wallColumns.map(column => <span key={column.key} style={{ '--wall-column': column.column }}>{column.shortLabel}</span>)}
      </div>

      <div className={styles.rounds} aria-label="Wall chart bracket">
        {surface.rounds.map(round => (
          <section className={styles.round} id={`bracket-${round.key}`} key={round.key}>
            <header className={styles.roundHeader}>
              <div><span>{round.shortLabel}</span><h3>{round.label}</h3></div>
              <small>{round.complete}/{round.total} picked</small>
            </header>
            {round.ties.map(tie => {
              const referenceMatch = reference.knockoutMatches.find(item => item.matchNumber === tie.matchNumber)
              const hasGrace = hasActivePredictionGrace(graceWindows, {
                competitionKey: PREDICTION_COMPETITION_KEY.ORIGINAL,
                matchId: referenceMatch?.matchId,
              })
              const disabled = reviewMode || (contentLocked && !hasGrace) || !tie.participantsResolved
              const state = deriveOriginalBracketMatchState({
                participantsResolved: tie.participantsResolved,
                selectedTeamId: tie.stale ? null : tie.selectedTeamId,
                disabled,
                hasGrace,
                stale: tie.stale,
              })
              return (
                <OriginalBracketTie
                  key={tie.matchNumber}
                  tie={tie}
                  reference={reference}
                  disabled={disabled}
                  state={state}
                  onChange={onChange}
                />
              )
            })}
          </section>
        ))}
        <WallChampionBox champion={champion} />
      </div>
    </section>
  )
}
