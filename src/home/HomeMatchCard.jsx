import { Icon, TeamBadge } from '../design-system/index.jsx'
import { formatKickoffTime, matchOutcome, OUTCOME_NOTE } from './homeFormat.js'
import styles from './HomeMatchCard.module.css'

const OUTCOME_CHIP = Object.freeze({
  exact: { className: 'chipWon', label: 'Exact score' },
  result: { className: 'chipWon', label: 'Right result' },
  miss: { className: 'chipQuiet', label: 'Missed' },
})

function TeamSide({ team, align }) {
  const name = <span className={team.unresolved ? `${styles.name} ${styles.nameTbd}` : styles.name}>{team.label}</span>
  const badge = <TeamBadge team={team} />

  return (
    <span className={align === 'right' ? `${styles.side} ${styles.sideRight}` : styles.side}>
      {align === 'right' ? <>{name}{badge}</> : <>{badge}{name}</>}
    </span>
  )
}

/**
 * The status chip. A fixture with no confirmed kick-off gets the amber
 * provisional chip — that is a feature, and it appears only when the database
 * genuinely lacks the time.
 */
function StatusChip({ card, outcome }) {
  if (card.state === 'live') {
    return (
      <span className={`${styles.chip} ${styles.chipLive}`}>
        <span className={styles.pulse} aria-hidden="true" />LIVE
      </span>
    )
  }

  // The tab already reads "Full time" for a finished match. With no prediction to
  // report on — every knockout tie, and any group match left unpredicted — there
  // is nothing left for the chip to add, so it says nothing rather than saying it
  // twice.
  if (card.state === 'completed') {
    if (!outcome) return null
    const chip = OUTCOME_CHIP[outcome]
    return <span className={`${styles.chip} ${styles[chip.className]}`}>{chip.label}</span>
  }

  if (!card.kickoffAt) return <span className={`${styles.chip} ${styles.chipProvisional}`}>PROVISIONAL</span>
  return <span className={`${styles.chip} ${styles.chipQuiet}`}>{formatKickoffTime(card.kickoffAt)}</span>
}

/**
 * Home's fixture card — the ticket stub. It is a link into Match Centre, so
 * nothing inside it may be interactive: the team badge is an image and the team
 * name is text, never the profile button TeamLabel would render.
 *
 * `showPrediction` is false for a signed-out visitor, who has no picks to show.
 */
export default function HomeMatchCard({ card, showPrediction = true }) {
  const outcome = card.state === 'completed' ? matchOutcome(card) : null

  // The tab identifies the match; the footer carries the venue or your pick. The
  // venue lives in exactly one of them, never in both.
  const meta = [card.stageLabel, card.state === 'completed' ? 'Full time' : `Match ${card.matchNumber}`]
    .filter(Boolean)
    .join(' · ')

  const ariaState = card.state === 'live' ? ', live' : card.state === 'completed' ? ', full time' : ''

  let note
  if (!showPrediction) note = card.kickoffAt ? card.venueName ?? '' : 'Kick-off time not confirmed'
  else if (card.predictedScore) {
    note = <>You predicted <b className={styles.num}>{card.predictedScore}</b>{outcome ? ` · ${OUTCOME_NOTE[outcome]}` : ''}</>
  } else note = card.kickoffAt ? 'No prediction saved' : 'Kick-off time not confirmed'

  return (
    <a
      className={styles.ticket}
      href={card.href}
      aria-label={`Open Match Centre for ${card.home.label} v ${card.away.label}${ariaState}`}
    >
      <span className={styles.tab}>
        <span className={styles.meta}>{meta}</span>
        <StatusChip card={card} outcome={outcome} />
      </span>

      <span className={styles.notch} aria-hidden="true" />

      <span className={styles.fixture}>
        <TeamSide team={card.home} align="left" />
        <span className={styles.centre}>
          {card.scoreLabel
            ? <span className={`${styles.score} ${styles.num}`}>{card.scoreLabel}</span>
            : <span className={styles.versus}>v</span>}
        </span>
        <TeamSide team={card.away} align="right" />
      </span>

      <span className={styles.foot}>
        <span className={styles.pick}>{note}</span>
        <span className={styles.matchCentreHint}>Match Centre <Icon name="chevron" size={15} /></span>
      </span>
    </a>
  )
}
