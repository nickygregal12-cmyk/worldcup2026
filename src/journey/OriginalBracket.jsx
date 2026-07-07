import React from 'react' // eslint-disable-line no-unused-vars -- React is required for JSX under the current lint config
import { hasActivePredictionGrace, PREDICTION_COMPETITION_KEY } from '../grace/index.js'
import { Badge, Icon, PredictionStateBadge, ProgressBar, TeamLabel } from '../design-system/index.jsx'
import {
  buildOriginalBracketRoundProgress,
  buildOriginalBracketSurface,
  deriveOriginalBracketMatchState,
  predictedChampion,
} from './originalBracketPresentationModel.js'
import { ORIGINAL_BRACKET_CONTEXT_COPY, ORIGINAL_BRACKET_G_COPY, ORIGINAL_BRACKET_KO_SUBLINE } from './originalBracketCopy.js'
import shellStyles from './OriginalBracket.module.css'
import roundStyles from './OriginalBracketRounds.module.css'
import tieStyles from './OriginalBracketTie.module.css'

const REPICK_COPY = 'Re-pick — your tables changed this tie'
const CONTEXT_COPY = ORIGINAL_BRACKET_CONTEXT_COPY
// KO Predictor
const KO_SUBLINE = ORIGINAL_BRACKET_KO_SUBLINE
const BRACKET_G_COPY = ORIGINAL_BRACKET_G_COPY
const ROUND_ANCHOR_BY_KEY = Object.freeze({
  round_of_16: 'bracket-r16-left',
  quarter_final: 'bracket-qf-left',
  semi_final: 'bracket-sf-left',
  final: 'bracket-final-centre',
})

function formatDate(dateValue) {
  if (!dateValue) return 'Date to be confirmed'
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${dateValue}T12:00:00Z`))
}

function formatKickoffTime(kickoffAt) {
  if (!kickoffAt) return 'Kick-off TBC'
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' })
    .format(new Date(kickoffAt))
}

function venueLabel(tie) {
  const venue = tie.venueName ?? tie.venue ?? null
  const city = tie.venueCity ?? null
  if (venue && city) return `${venue}, ${city}`
  return venue ?? city ?? 'Venue to be confirmed'
}

function formatWallSummary(tie) {
  const datePart = tie.scheduledDate
    ? new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${tie.scheduledDate}T12:00:00Z`))
    : 'Date TBC'
  const timePart = tie.kickoffAt ? formatKickoffTime(tie.kickoffAt) : null
  return [timePart ? `${datePart} · ${timePart}` : datePart, venueLabel(tie)].join(' · ')
}

function teamFor(reference, teamId) {
  return teamId ? reference.teamsById?.[teamId] ?? null : null
}

function wallSideForColumn(columnKey) {
  if (columnKey.endsWith('-left')) return 'left'
  if (columnKey.endsWith('-right')) return 'right'
  return 'centre'
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
    : <strong className={shellStyles.emptyChampion}>{emptyLabel}</strong>
}

function OriginalBracketSlot({ slot, disabled, onSelect }) {
  const className = [
    tieStyles.slot,
    'bracket-team-choice',
    slot.selected ? tieStyles.slotSelected : '',
    slot.selected ? 'is-selected' : '',
    slot.unresolved ? tieStyles.slotUnresolved : '',
  ].filter(Boolean).join(' ')
  const actionLabel = slot.selected ? 'Selected to advance' : 'Pick to advance'

  return (
    <div className={className} data-slot-source={slot.sourceCode} data-slot-side={slot.side}>
      <span className={tieStyles.slotSource}>{slot.sourceCode}</span>
      {slot.unresolved ? (
        <span className={tieStyles.placeholderChip}>{slot.placeholderLabel}</span>
      ) : (
        <button
          type="button"
          className={`${tieStyles.slotAction} bracket-team-choice__action`}
          disabled={disabled}
          aria-pressed={slot.selected}
          onClick={() => onSelect(slot.teamId)}
        >
          <TeamLabel team={slot.team} label={slot.label} compact profileDisabled />
          <span className={tieStyles.slotActionText}>{actionLabel}</span>
          {slot.selected && <Icon name="check" size={15} />}
        </button>
      )}
    </div>
  )
}

function OriginalBracketTie({ tie, reference, disabled, state, onChange }) {
  const badge = stateBadge(state)
  const staleSelectedTeam = tie.stale ? teamFor(reference, tie.selectedTeamId) : null
  return (
    <article
      className={`${tieStyles.tie} ${tieStyles[`tie${state[0].toUpperCase()}${state.slice(1)}`] ?? ''}`}
      data-match-number={tie.matchNumber}
      data-stage={tie.stage}
    >
      <p className={tieStyles.wallSummary}>{formatWallSummary(tie)}</p>
      <div className={tieStyles.tieMeta}>
        <div>
          <strong>Match {tie.matchNumber}</strong>
          <span>{formatDate(tie.scheduledDate)}</span>
        </div>
        <PredictionStateBadge state={badge.state} label={badge.label} />
      </div>
      {tie.stale && (
        <div className={tieStyles.repickFlag} role="status">
          <Icon name="alert" size={14} />
          <span>{REPICK_COPY}</span>
          {staleSelectedTeam && <small>Previous pick: {staleSelectedTeam.label}</small>}
        </div>
      )}
      <div className={tieStyles.matchDetails} aria-label={`Match ${tie.matchNumber} details`}>
        <span>{formatKickoffTime(tie.kickoffAt)}</span>
        <span>{venueLabel(tie)}</span>
      </div>
      <div className={tieStyles.slotStack}>
        <OriginalBracketSlot
          slot={tie.slots[0]}
          disabled={disabled || tie.slots[0].unresolved}
          onSelect={teamId => onChange(tie, tie.slots[0].selected ? null : teamId)}
        />
        <span className={tieStyles.slotVs} aria-hidden="true">vs</span>
        <OriginalBracketSlot
          slot={tie.slots[1]}
          disabled={disabled || tie.slots[1].unresolved}
          onSelect={teamId => onChange(tie, tie.slots[1].selected ? null : teamId)}
        />
      </div>
      {tie.winnerTeamId && !tie.stale && (
        <div className={tieStyles.winnerLine}>
          <Icon name="chevron" size={16} /><span>{teamFor(reference, tie.winnerTeamId)?.label ?? 'Selected team'} progresses</span>
        </div>
      )}
    </article>
  )
}

function WallChampionBox({ champion }) {
  return (
    <aside className={tieStyles.wallChampion} aria-label="Predicted champion">
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
  const renderTie = tie => {
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
  }

  return (
    <section className={shellStyles.bracket} data-contract="original-bracket-g" aria-labelledby="original-bracket-heading">
      <div className="knockout-context knockout-context--predicted">
        <div className="knockout-context__icon"><Icon name="bracket" size={24} /></div>
        <div>
          <span>Your bracket</span>
          <h2 id="original-bracket-heading">Your pre-tournament bracket</h2>
          <p>{CONTEXT_COPY}</p>
        </div>
        <Badge tone="info" icon="bracket">Original Predictor</Badge>
      </div>

      <div className={shellStyles.bracketHeroNote}>
        <Icon name="trophy" size={18} />
        <span>{BRACKET_G_COPY}</span>
      </div>

      <div className={shellStyles.championStrip}>
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
          <span>Bracket picks</span>
          <strong>No bracket jokers</strong>
          <small>Pick the team that goes through. Scores and methods are not needed here.</small>
        </article>
      </div>

      <nav className="bracket-round-progress" aria-label="Bracket round progress">
        {progress.map(round => (
          <a key={round.key} href={`#${ROUND_ANCHOR_BY_KEY[round.key] ?? `bracket-${round.key}`}`} className={round.isComplete ? 'is-complete' : ''}>
            <span>{round.shortLabel}</span><strong>{round.complete}/{round.total}</strong>
          </a>
        ))}
      </nav>

      <div className={shellStyles.wallFrame} data-wall-chart="seven-lanes" data-final-position="centre" data-wall-lanes="7">
        <div className={roundStyles.rounds} aria-label="Seven-lane bracket">
          {surface.wallColumns.map(column => (
            <section
              className={roundStyles.round}
              id={`bracket-${column.key}`}
              key={column.key}
              data-wall-lane={column.key}
              data-wall-column={column.column}
              data-wall-count={column.matchNumbers.length}
              data-wall-side={wallSideForColumn(column.key)}
            >
              <header className={roundStyles.roundHeader}>
                <div><span>{column.shortLabel}</span><h3>{column.label}</h3></div>
                <small>{column.matchNumbers.join(' / ')}</small>
              </header>
              <div className={roundStyles.laneStack}>
                {column.matchNumbers.map(matchNumber => renderTie(surface.tiesByMatchNumber[matchNumber]))}
                {column.key === 'final-centre' && <WallChampionBox champion={champion} />}
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  )
}
