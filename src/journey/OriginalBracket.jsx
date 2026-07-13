import React from 'react' // eslint-disable-line no-unused-vars -- React is required for JSX under the current lint config
import { useEffect, useState } from 'react'
import { hasActivePredictionGrace, PREDICTION_COMPETITION_KEY } from '../grace/index.js'
import { Icon, PredictionStateBadge, TeamLabel } from '../design-system/index.jsx'
import {
  buildOriginalBracketRoundProgress,
  buildOriginalBracketSurface,
  deriveOriginalBracketMatchState,
  predictedChampion,
} from './originalBracketPresentationModel.js'
import { ORIGINAL_BRACKET_CONTEXT_COPY, ORIGINAL_BRACKET_G_COPY, ORIGINAL_BRACKET_KO_SUBLINE } from './originalBracketCopy.js'
import BracketShareAction from './BracketShareAction.jsx'
import shellStyles from './OriginalBracket.module.css'
import roundStyles from './OriginalBracketRounds.module.css'
import tieStyles from './OriginalBracketTie.module.css'

const REPICK_COPY = 'Re-pick — your tables changed this tie'
const CONTEXT_COPY = ORIGINAL_BRACKET_CONTEXT_COPY
// Winner picks only. Scores, methods and jokers belong to KO Predictor, and §4 keeps the
// two competitions strictly apart — this subline says so to the player, in their words.
const KO_SUBLINE = ORIGINAL_BRACKET_KO_SUBLINE
const BRACKET_G_COPY = ORIGINAL_BRACKET_G_COPY

// The same two formats Groups and Home speak, to the character: "Fri 9 June" and "8:00pm".
// This file used to print the date in UTC and the kick-off as a 24-hour "20:00", so a bracket
// tie and a group tie described the same fixture in two different languages.
function formatDate(dateValue) {
  if (!dateValue) return 'Date to be confirmed'
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'Europe/London' })
    .format(new Date(String(dateValue).includes('T') ? dateValue : `${dateValue}T12:00:00Z`))
}

function formatKickoffTime(kickoffAt) {
  if (!kickoffAt) return 'Kick-off TBC'
  return new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/London' })
    .format(new Date(kickoffAt))
    .replace(' ', '')
}

/*
 * Is the board being read as a chart?
 *
 * Two ways in, and until now only one of them worked. At 900px the chart IS the view. Below
 * it, the wall toggle opts into the same chart — and the card rules that make a tie legible in
 * a 132px lane (strip the date line, shrink the flag, drop the double box) lived ONLY inside
 * `@media (min-width: 900px)`. A phone that opted in got desktop GEOMETRY with card INTERNALS,
 * which is why "Selected to advance" sat on top of the team names.
 *
 * The tie stylesheet did try to share those rules with `:global(.wallMode)` — but `.wallMode`
 * is a CSS Module class in the rounds stylesheet, so it is hashed, and the literal `.wallMode`
 * that selector asks for is a class no element has ever carried. It matched nothing, silently,
 * and the media query covered for it on every screen anyone had checked.
 *
 * So the state is answered once, here, and published as a plain data attribute — unhashed, and
 * therefore reachable from every module that needs it. One rule set, both readings, no drift.
 */
const CHART_VIEWPORT = '(min-width: 900px)' // keep in step with the 900px breakpoint in the three bracket stylesheets

function useChartViewport() {
  const [wide, setWide] = useState(
    () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(CHART_VIEWPORT).matches,
  )
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined
    const query = window.matchMedia(CHART_VIEWPORT)
    const sync = () => setWide(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])
  return wide
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

/*
 * `onChrome` is not decoration. The champion is named by TeamLabel, and TeamLabel paints its
 * name in --dp-text-strong and its "Provisional" line in --dp-text-muted — both chosen for the
 * light page it normally sits on. The summary card is NAVY. In the light theme that put #0B1B34
 * on #163B73: 1.56:1, against a 4.5:1 floor.
 *
 * It is the same defect as the wall box's white-on-white "Pick your final", pointing the other
 * way: an identity styled for one surface, dropped on another. Fixing it on TeamLabel rather
 * than overriding it from this stylesheet is what stops there being a third one.
 */
function ChampionIdentity({ champion, emptyLabel = 'Pick through to the final', compact = false, onChrome = false }) {
  return champion
    ? <TeamLabel team={champion} compact={compact} onChrome={onChrome} />
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
  // At 900px the chart is the view whatever the toggle says; below it, the toggle decides.
  const chartReading = useChartViewport() || wallOpen

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
    <section
      className={shellStyles.bracket}
      data-contract="original-bracket-g"
      data-wall-mode={chartReading ? 'on' : 'off'}
      aria-labelledby="original-bracket-heading"
    >
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
        <ChampionIdentity champion={champion} onChrome />
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
        <div className={roundStyles.rounds} aria-label="Seven-lane bracket">
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

      {/* Last thing on the page, and deliberately so: you pick your way through the chart, and
          the share card is what you do with it once it is finished. Not gated on an account —
          a guest's bracket is just as shareable, and that is the whole growth loop. */}
      <BracketShareAction reference={reference} draft={draft} preview={preview} />
    </section>
  )
}
