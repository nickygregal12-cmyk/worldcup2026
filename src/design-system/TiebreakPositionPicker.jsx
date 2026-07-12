import { useState } from 'react'
import Icon from './Icon.jsx'
import { hasUnresolvedTie, labelFor, moveItem, orderFromTie } from './tiebreakModel.js'
import styles from './TiebreakPositionPicker.module.css'

// Item 64 — the component half.
//
// This renders the three states of an unresolvable-standings tie: the amber
// provisional warning banner, the manual position-picker interaction, and the
// reset notice. `tie` and `resetNotice` are supplied by the MODEL half, which
// landed with the Groups re-cut: tiebreakModel.js reads the resolver's own
// unresolved partitions, holds the saved ordering and applies the reset-on-edit
// rule. This component still owns none of that — it renders what it is given.
//
// `initialOrder` seeds the picker from an ordering the player already saved.
// Callers must remount (key on the tie's signature) when the scores move, so a
// stale order cannot survive a reset.
//
// The design programme specifies the amber provisional role but no position
// picker or tie-break ordering control (flagged as a gap); the picker geometry
// here follows the vertical ▲/▼ stepper idiom and the amber provisional tokens.

export default function TiebreakPositionPicker({ tie, resetNotice = false, initialOrder = null, onResolve }) {
  const [order, setOrder] = useState(() => initialOrder ?? orderFromTie(tie))

  if (!hasUnresolvedTie(tie)) return null

  const name = teamId => labelFor(tie, teamId)
  const move = (index, direction) => setOrder(previous => moveItem(previous, index, direction))

  return (
    <section className={styles.picker} data-tiebreak-picker="true" aria-label={`Resolve tied positions in Group ${tie.groupCode}`}>
      <p className={styles.warning} role="status" data-tiebreak-warning="true">
        <Icon name="alert" size={16} className={styles.warningIcon} />
        <span>Positions in Group {tie.groupCode} can’t be decided automatically{tie.reason ? ` — ${tie.reason}` : ''}. Set them below.</span>
      </p>

      {resetNotice && (
        <p className={styles.reset} role="status" data-tiebreak-reset="true">
          Your score edit reset these positions — please set them again.
        </p>
      )}

      <ol className={styles.list}>
        {order.map((teamId, index) => (
          <li key={teamId} className={styles.item}>
            <span className={styles.rank}>{index + 1}</span>
            <span className={styles.name}>{name(teamId)}</span>
            <span className={styles.controls}>
              <button type="button" className={styles.control} aria-label={`Move ${name(teamId)} up`} disabled={index === 0} onClick={() => move(index, -1)}>▲</button>
              <button type="button" className={styles.control} aria-label={`Move ${name(teamId)} down`} disabled={index === order.length - 1} onClick={() => move(index, 1)}>▼</button>
            </span>
          </li>
        ))}
      </ol>

      <button type="button" className={styles.save} onClick={() => onResolve?.(order)}>Save these positions</button>
    </section>
  )
}
