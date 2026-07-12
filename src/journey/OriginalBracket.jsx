import React from 'react' // eslint-disable-line no-unused-vars -- React is required for JSX under the current lint config
import { useState } from 'react'
import { hasActivePredictionGrace, PREDICTION_COMPETITION_KEY } from '../grace/index.js'
import { Icon, PredictionStateBadge, TeamLabel } from '../design-system/index.jsx'
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
// Winner picks only. Scores, methods and jokers belong to KO Predictor, and §4 keeps the
// two competitions strictly apart — this subline says so to the player, in their words.
const KO_SUBLINE = ORIGINAL_BRACKET_KO_SUBLINE
const BRACKET_G_COPY = ORIGINAL_BRACKET_G_COPY

function formatDate(dateValue) {
  if (!dateValue) return 'Date to be confirmed'
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC' })
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
      {slot.unresolved ? (
        <>
          <span className={tieStyles.slotSource}>{slot.sourceCode}</span>
          <span className={tieStyles.placeholderChip}>{slot.placeholderLabel}</span>
        </>
      ) : (
        <button
          type="button"
          className={`${tieStyles.slotAction} bracket-team-choice__action`}
          disabled={disabled}
          aria-pressed={slot.selected}
          onClick={() => onSelect(slot.teamId)}
        >
          <TeamLabel team={slot.team} label={slot.label} compact profileDisabled className={tieStyles.slotTeam} />
          {/* The instruction is for a player reading a card, not for someone scanning the
              wall chart — where seven lanes of it would crowd out the names it sits beside.
              The chart hides it and lets the tick carry the state. */}
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
      <div className={tieStyles.tieMeta}>
        {/* Date, kick-off and venue on one line — the card language Groups and KO speak. */}
        <p className={tieStyles.matchDetails}>
          <span>{formatDate(tie.scheduledDate)}</span>
          <span>{formatKickoffTime(tie.kickoffAt)}</span>
          <span>{venueLabel(tie)}</span>
        </p>
        <PredictionStateBadge state={badge.state} label={badge.label} className={tieStyles.tieBadge} />
      </div>

      {tie.stale && (
        <div className={tieStyles.repickFlag} role="status">
          <Icon name="alert" size={14} />
          <span>{REPICK_COPY}</span>
          {staleSelectedTeam && <small>Previous pick: {staleSelectedTeam.label}</small>}
        </div>
      )}

      <div className={tieStyles.slotStack}>
        <OriginalBracketSlot
          slot={tie.slots[0]}
          disabled={disabled || tie.slots[0].unresolved}
          onSelect={teamId => onChange(tie, tie.slots[0].selected ? null : teamId)}
        />
        <span className={tieStyles.slotVs} aria-hidden="true">v</span>
        <OriginalBracketSlot
          slot={tie.slots[1]}
          disabled={disabled || tie.slots[1].unresolved}
          onSelect={teamId => onChange(tie, tie.slots[1].selected ? null : teamId)}
        />
      </div>
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
  // Below 900px the page is a list of ONE round at a time — the rail chooses it. It used to
  // be all seven wall lanes stacked end to end, which on a phone is a 15,000px scroll
  // through R16, QF, SF, Final, SF, QF, R16, in that order. The wall chart is still one tap
  // away, and the trip is reversible: the button turns into "Back to list".
  const [openRound, setOpenRound] = useState('round_of_16')
  const [wallOpen, setWallOpen] = useState(false)

  const progress = buildOriginalBracketRoundProgress(preview)
  const champion = predictedChampion(preview, reference)
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
      <header className={shellStyles.head}>
        <div className={shellStyles.headTop}>
          <span className={shellStyles.eyebrow}>Your bracket</span>
          {/* Named, because the other competition has a bracket too and they never mix (§4). */}
          <span className={shellStyles.tag}>Original Predictor</span>
        </div>
        <h2 id="original-bracket-heading">Your pre-tournament bracket</h2>
        <p>{CONTEXT_COPY}</p>
      </header>

      {/* One champion, said once. It used to be told three times — a strip, a summary card
          and the chart box — each in a different voice. */}
      <aside className={shellStyles.championCard}>
        <span className={shellStyles.eyebrow}>Your predicted champion</span>
        <ChampionIdentity champion={champion} />
        <small>{KO_SUBLINE}</small>
      </aside>

      <div className={shellStyles.topStrip}>
        <nav className={shellStyles.roundRail} aria-label="Choose a round">
          {progress.map(round => (
            <button
              type="button"
              key={round.key}
              className={[
                round.key === openRound ? shellStyles.roundOn : '',
                round.isComplete ? shellStyles.roundDone : '',
              ].filter(Boolean).join(' ')}
              aria-pressed={round.key === openRound}
              onClick={() => setOpenRound(round.key)}
            >
              <span>{round.shortLabel}</span><strong>{round.complete}/{round.total}</strong>
            </button>
          ))}
        </nav>
        <button type="button" className={shellStyles.wallToggle} aria-pressed={wallOpen} onClick={() => setWallOpen(open => !open)}>
          <Icon name="bracket" size={16} />
          <span>{wallOpen ? 'Back to list' : 'View as wall chart'}</span>
        </button>
      </div>

      <div className={shellStyles.bracketHeroNote}>
        <Icon name="trophy" size={18} />
        <span>{BRACKET_G_COPY}</span>
      </div>

      <p className={shellStyles.pickNote}>
        <strong>No bracket jokers</strong>
        Pick the team that goes through. Scores and methods are not needed here.
      </p>

      <div className={shellStyles.wallFrame} data-wall-chart="seven-lanes" data-final-position="centre" data-wall-lanes="7">
        <div
          className={`${roundStyles.rounds}${wallOpen ? ` ${roundStyles.wallMode}` : ''}`}
          aria-label="Seven-lane bracket"
        >
          {surface.wallColumns.map(column => {
            // A lane belongs to whichever round its ties are in, so the rail can open the
            // round and both of its lanes come with it — left lane first, then right, which
            // is already match order (37–40 then 41–44).
            const laneStage = surface.tiesByMatchNumber[column.matchNumbers[0]]?.stage
            const open = laneStage === openRound
            return (
              <section
                className={`${roundStyles.round}${open ? ` ${roundStyles.roundOpen}` : ''}`}
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
            )
          })}
        </div>
      </div>
    </section>
  )
}
